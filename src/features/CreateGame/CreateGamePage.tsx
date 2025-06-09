import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PiUsersFill, PiUsersThreeFill, PiUsersFourFill } from "react-icons/pi";
import type { SDKUser } from "../../types";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useConnect,
  useReadContract,
  useConfig,
} from 'wagmi';
import { parseUnits, parseAbi, formatUnits } from 'viem';
import snakeGameContractInfo from '../../constants/snakeGameContractInfo.json';
import { baseSepolia } from 'wagmi/chains';

// USDC token setup for Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const ERC20_ABI = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

interface CreateGamePageProps {
  fcUser: SDKUser | null;
  handleButtonClick: () => void;
}

type TransactionStep = 'idle' | 'approving' | 'waiting_approval' | 'creating_room' | 'waiting_creation' | 'completed' | 'error';

export default function CreateGamePage({
  fcUser,
  handleButtonClick,
}: CreateGamePageProps) {
  const navigate = useNavigate();
  const config = useConfig();
  const [gameName, setGameName] = useState("");
  const [prizeAmount, setPrizeAmount] = useState<string>("");
  const [selectedPlayers, setSelectedPlayers] = useState<number>(4);
  const [currentStep, setCurrentStep] = useState<TransactionStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(null);
  const [createRoomTxHash, setCreateRoomTxHash] = useState<`0x${string}` | null>(null);

  // Wallet connection
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();

  console.log("address", address)
  console.log("is connected", isConnected)
  
  // Calculate prize amount in wei (6 decimals for USDC)
  const prizeAmountWei = prizeAmount && Number(prizeAmount) > 0 
    ? parseUnits(prizeAmount, 6) 
    : 0n;

  // Check USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  });

  // Check current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, snakeGameContractInfo.address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 3000, // Refetch every 3 seconds
    }
  });

  // Write contracts
  const {
    data: approvalHash,
    error: approvalError,
    isPending: isApprovalPending,
    writeContract: writeApproval,
    reset: resetApproval,
  } = useWriteContract();

  const {
    data: createHash,
    error: createError,
    isPending: isCreatePending,
    writeContract: writeCreate,
    reset: resetCreate,
  } = useWriteContract();

  // Wait for approval transaction
  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApprovalSuccess,
    error: approvalReceiptError,
  } = useWaitForTransactionReceipt({ 
    hash: approvalHash,
    confirmations: 1,
    query: {
      enabled: !!approvalHash,
    }
  });

  // Wait for create room transaction
  const {
    isLoading: isCreateConfirming,
    isSuccess: isCreateSuccess,
    error: createReceiptError,
  } = useWaitForTransactionReceipt({ 
    hash: createHash,
    confirmations: 1,
    query: {
      enabled: !!createHash,
    }
  });

  const defaultRoomName = fcUser
    ? `${fcUser.username}'s room`
    : "Adventurer's room";

  // Check if approval is needed
  const needsApproval = currentAllowance !== undefined && prizeAmountWei > 0n 
    ? currentAllowance < prizeAmountWei 
    : true;

  // Reset transaction states
  const resetTransactionState = useCallback(() => {
    setCurrentStep('idle');
    setErrorMessage("");
    setApprovalTxHash(null);
    setCreateRoomTxHash(null);
    resetApproval();
    resetCreate();
  }, [resetApproval, resetCreate]);

  // Handle approval success
  useEffect(() => {
    if (isApprovalSuccess && approvalHash) {
      console.log('Approval confirmed:', approvalHash);
      setApprovalTxHash(approvalHash);
      setCurrentStep('creating_room');
      
      // Refetch allowance and proceed to create room
      setTimeout(() => {
        refetchAllowance();
        handleCreateRoom();
      }, 2000); // Increased delay to ensure state is updated
    }
  }, [isApprovalSuccess, approvalHash]);

  // Handle create room success
  useEffect(() => {
    if (isCreateSuccess && createHash) {
      console.log('Room creation confirmed:', createHash);
      setCreateRoomTxHash(createHash);
      setCurrentStep('completed');
      
      // Navigate after showing success message
      setTimeout(() => {
        navigate("/explore");
      }, 3000);
    }
  }, [isCreateSuccess, createHash, navigate]);

  // Handle errors
  useEffect(() => {
    const error = approvalError || createError || approvalReceiptError || createReceiptError;
    if (error) {
      console.error('Transaction error:', error);
      setCurrentStep('error');
      setErrorMessage(error.message || 'Transaction failed');
    }
  }, [approvalError, createError, approvalReceiptError, createReceiptError]);

  // Update transaction hashes when they're available
  useEffect(() => {
    if (approvalHash && !approvalTxHash) {
      setApprovalTxHash(approvalHash);
    }
  }, [approvalHash, approvalTxHash]);

  useEffect(() => {
    if (createHash && !createRoomTxHash) {
      setCreateRoomTxHash(createHash);
    }
  }, [createHash, createRoomTxHash]);

  const handleApproveUSDC = useCallback(async () => {
    // Enhanced validation
    if (!isConnected || !address) {
      console.error('Cannot approve: wallet not connected or address not available');
      setErrorMessage("Wallet not connected. Please connect your wallet first.");
      return;
    }

    if (!writeApproval) {
      console.error('Cannot approve: writeApproval function not available');
      setErrorMessage("Contract interaction not available. Please refresh and try again.");
      return;
    }

    if (prizeAmountWei <= 0n) {
      console.error('Cannot approve: invalid prize amount');
      setErrorMessage("Invalid prize amount. Please enter a valid amount.");
      return;
    }
    
    try {
      console.log('Starting approval for exact amount:', formatUnits(prizeAmountWei, 6), 'USDC');
      console.log('Address:', address);
      console.log('Connected:', isConnected);
      
      setCurrentStep('approving');
      setErrorMessage("");
      
      // Call writeContract without the account parameter (wagmi handles this automatically)
      const result = await writeApproval({
        chainId: baseSepolia.id,
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [snakeGameContractInfo.address as `0x${string}`, prizeAmountWei],
      });
      
      console.log('Approval transaction initiated:', result);
      setCurrentStep('waiting_approval');
      
    } catch (error) {
      console.error('Approval error:', error);
      setCurrentStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Approval failed');
    }
  }, [isConnected, address, writeApproval, prizeAmountWei]);

  const handleCreateRoom = useCallback(async () => {
    // Enhanced validation
    if (!isConnected || !address) {
      console.error('Cannot create room: wallet not connected or address not available');
      setErrorMessage("Wallet not connected. Please connect your wallet first.");
      return;
    }

    if (!writeCreate) {
      console.error('Cannot create room: writeCreate function not available');
      setErrorMessage("Contract interaction not available. Please refresh and try again.");
      return;
    }
    
    try {
      console.log('Creating room with players:', selectedPlayers, 'stake:', formatUnits(prizeAmountWei, 6), 'USDC');
      console.log('Address:', address);
      console.log('Connected:', isConnected);
      
      setCurrentStep('creating_room');
      setErrorMessage("");
      
      // Call writeContract without the account parameter
      const result = await writeCreate({
        chainId: baseSepolia.id,
        address: snakeGameContractInfo.address as `0x${string}`,
        abi: snakeGameContractInfo.abi,
        functionName: 'createRoom',
        args: [BigInt(selectedPlayers), prizeAmountWei],
      });
      
      console.log('Create room transaction initiated:', result);
      setCurrentStep('waiting_creation');
      
    } catch (error) {
      console.error('Create room error:', error);
      setCurrentStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Room creation failed');
    }
  }, [isConnected, address, writeCreate, selectedPlayers, prizeAmountWei]);

  const connectWallet = useCallback(async () => {
    try {
      console.log('Attempting to connect wallet...');
      const farcasterConnector = connectors.find(c => 
        c.name.toLowerCase().includes('farcaster')
      );
      
      if (farcasterConnector) {
        await connect({ connector: farcasterConnector });
      } else {
        // Fallback to any available connector
        if (connectors.length > 0) {
          await connect({ connector: connectors[0] });
        } else {
          setErrorMessage("No wallet connectors available");
        }
      }
    } catch (error) {
      console.error('Connection error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  }, [connectors, connect]);

  const handleSubmit = useCallback(async () => {
    // First, ensure wallet is connected
    if (!isConnected || !address) {
      console.log('Wallet not connected, attempting to connect...');
      await connectWallet();
      return;
    }

    // Validation checks
    if (!prizeAmount || Number(prizeAmount) <= 0) {
      setErrorMessage("Please enter a valid prize amount");
      return;
    }

    if (usdcBalance !== undefined && prizeAmountWei > usdcBalance) {
      setErrorMessage(`Insufficient USDC balance. You have ${formatUnits(usdcBalance, 6)} USDC`);
      return;
    }

    // Wait a moment to ensure connection is fully established
    if (isConnecting) {
      console.log('Still connecting, please wait...');
      return;
    }

    console.log('Starting transaction flow...');
    console.log('Needs approval:', needsApproval);
    console.log('Current allowance:', currentAllowance?.toString());
    console.log('Required amount:', prizeAmountWei.toString());
    console.log('Connected address:', address);

    handleButtonClick();
    resetTransactionState();

    // Add a small delay to ensure all state is updated
    setTimeout(async () => {
      if (needsApproval) {
        await handleApproveUSDC();
      } else {
        await handleCreateRoom();
      }
    }, 100);
  }, [
    isConnected, 
    address, 
    prizeAmount, 
    usdcBalance, 
    prizeAmountWei, 
    needsApproval,
    currentAllowance,
    isConnecting,
    connectWallet,
    handleButtonClick, 
    resetTransactionState, 
    handleApproveUSDC, 
    handleCreateRoom
  ]);

  const handleCancel = () => {
    handleButtonClick();
    resetTransactionState();
    navigate("/explore");
  };

  const isLoading = currentStep !== 'idle' && currentStep !== 'completed' && currentStep !== 'error';
  const isDisabled = !isConnected || isLoading || !prizeAmount || Number(prizeAmount) <= 0 || isConnecting;

  const getButtonText = () => {
    if (isConnecting) return 'Connecting Wallet...';
    
    switch (currentStep) {
      case 'approving':
        return 'Approving USDC...';
      case 'waiting_approval':
        return 'Confirming Approval...';
      case 'creating_room':
        return 'Creating Quest...';
      case 'waiting_creation':
        return 'Confirming Creation...';
      case 'completed':
        return 'Quest Created!';
      case 'error':
        return 'Try Again';
      default:
        if (!isConnected) return 'Connect Wallet';
        if (needsApproval && prizeAmountWei > 0n) return 'Approve USDC & Create Quest';
        return 'Create Quest';
    }
  };

  const getStatusMessage = () => {
    if (currentStep === 'error' && errorMessage) {
      return <p className="text-red-500">❌ Error: {errorMessage}</p>;
    }
    
    if (isConnecting) {
      return <p className="text-yellow-400">🔄 Connecting wallet...</p>;
    }
    
    if (!isConnected) {
      return <p className="text-red-400">⚠️ Wallet not connected. Please connect your wallet.</p>;
    }

    if (usdcBalance !== undefined) {
      const balanceFormatted = formatUnits(usdcBalance, 6);
      if (prizeAmountWei > usdcBalance) {
        return <p className="text-red-400">❌ Insufficient USDC balance. You have {balanceFormatted} USDC</p>;
      }
      return <p className="text-green-400">💰 USDC Balance: {balanceFormatted}</p>;
    }

    switch (currentStep) {
      case 'approving':
        return <p className="text-yellow-400">🔄 Please confirm approval in your wallet...</p>;
      case 'waiting_approval':
        return (
          <p className="text-yellow-400">
            ⏳ Confirming approval... 
            {approvalTxHash && (
              <a 
                href={`https://sepolia.basescan.org/tx/${approvalTxHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline ml-1"
              >
                View on Explorer
              </a>
            )}
          </p>
        );
      case 'creating_room':
        return <p className="text-yellow-400">🔄 Please confirm room creation in your wallet...</p>;
      case 'waiting_creation':
        return (
          <p className="text-yellow-400">
            ⏳ Confirming creation... 
            {createRoomTxHash && (
              <a 
                href={`https://sepolia.basescan.org/tx/${createRoomTxHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline ml-1"
              >
                View on Explorer
              </a>
            )}
          </p>
        );
      case 'completed':
        return (
          <p className="text-green-500">
            ✅ Quest created successfully! Redirecting... 
            {createRoomTxHash && (
              <a 
                href={`https://sepolia.basescan.org/tx/${createRoomTxHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline ml-1"
              >
                View Transaction
              </a>
            )}
          </p>
        );
      default:
        if (needsApproval && prizeAmountWei > 0n) {
          return <p className="text-yellow-400">⚠️ USDC approval required for prize pool.</p>;
        }
        return null;
    }
  };

  const playerOptions = [
    {
      value: 2,
      icon: <PiUsersFill className="w-5 h-5 inline mr-2" />,
    },
    {
      value: 3,
      icon: <PiUsersThreeFill className="w-5 h-5 inline mr-2" />,
    },
    {
      value: 4,
      icon: <PiUsersFourFill className="w-5 h-5 inline mr-2" />,
    },
  ];

  return (
    <div className="mx-auto mt-2 max-w-xl text-center space-y-6 pb-20">
      <div className="p-6 space-y-5">
        {/* Game Name */}
        <div>
          <label
            htmlFor="gameName"
            className="block text-base font-medium text-[#ffd700] mb-1 text-left"
          >
            Quest Name
          </label>
          <input
            type="text"
            id="gameName"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder={defaultRoomName}
            className="w-full p-2.5 bg-[#2c1810] border border-[#8b4513] rounded-md text-white focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] outline-none"
          />
        </div>

        {/* Prize Pool */}
        <div>
          <label
            htmlFor="prizeAmount"
            className="block text-base font-medium text-[#ffd700] mb-1 text-left"
          >
            Prize Pool (USDC)
          </label>
          <input
            type="number"
            id="prizeAmount"
            value={prizeAmount}
            onChange={(e) => setPrizeAmount(e.target.value)}
            placeholder="e.g., 10"
            min="0"
            step="0.000001"
            className="w-full p-2.5 bg-[#2c1810] border border-[#8b4513] rounded-md text-white focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Number of Players */}
        <div>
          <label className="block text-base font-medium text-[#ffd700] mb-2 text-left">
            Max Adventurers
          </label>
          <div className="flex bg-[#2c1810] rounded-md gap-x-2">
            {playerOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedPlayers(option.value);
                  handleButtonClick();
                }}
                className={`w-full items-center justify-center p-2.5 rounded-md text-md transition-colors duration-200
                  ${selectedPlayers === option.value
                    ? "bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#2c1810] border-2 border-transparent"
                    : "bg-[#1a0f09] hover:bg-[#3a251a] text-white border-2 border-[#8b4513]"
                  }`}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Status Messages */}
        <div className="min-h-[48px] text-sm space-y-1">
          {getStatusMessage()}
          {/* Show approval amount info */}
          {currentStep === 'approving' && prizeAmountWei > 0n && (
            <p className="text-blue-400">
              📝 Approving exactly {formatUnits(prizeAmountWei, 6)} USDC (no excess)
            </p>
          )}
          {needsApproval && prizeAmountWei > 0n && currentStep === 'idle' && (
            <p className="text-blue-400">
              ℹ️ Will approve exactly {formatUnits(prizeAmountWei, 6)} USDC
            </p>
          )}
        </div>

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 space-y-1">
            <p>Current Step: {currentStep}</p>
            <p>Is Connected: {isConnected.toString()}</p>
            <p>Is Connecting: {isConnecting.toString()}</p>
            <p>Address: {address || 'Not available'}</p>
            <p>Needs Approval: {needsApproval.toString()}</p>
            <p>Current Allowance: {currentAllowance?.toString() || 'Loading...'}</p>
            <p>Required Amount: {prizeAmountWei.toString()}</p>
            {approvalTxHash && <p>Approval Hash: {approvalTxHash}</p>}
            {createRoomTxHash && <p>Create Hash: {createRoomTxHash}</p>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isDisabled}
            className="w-full px-6 py-2.5 text-sm font-normal text-[#2c1810] uppercase rounded-md 
                       bg-gradient-to-r from-[#ffd700] to-[#ff8c00] 
                       border-2 border-[#8b4513] shadow-md
                       hover:from-[#ffed4a] hover:to-[#ffa500] transition-colors duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getButtonText()}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full px-6 py-2.5 text-sm font-normal text-white uppercase rounded-md 
                       bg-[#2c1810] border-2 border-[#8b4513]
                       hover:bg-[#3a251a] hover:border-[#ffd700] transition-colors duration-300
                       disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}