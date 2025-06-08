import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PiUsersFill, PiUsersThreeFill, PiUsersFourFill } from "react-icons/pi";
import type { SDKUser } from "../../types";
import { 
  useAccount, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { parseUnits } from 'viem';
import snakeGameContractInfo from '../../constants/snakeGameContractInfo.json';

interface CreateGamePageProps {
  fcUser: SDKUser | null;
  handleButtonClick: () => void;
}

export default function CreateGamePage({
  fcUser,
  handleButtonClick,
}: CreateGamePageProps) {
  const navigate = useNavigate();
  const [gameName, setGameName] = useState("");
  const [prizeAmount, setPrizeAmount] = useState<number | string>("");
  const [selectedPlayers, setSelectedPlayers] = useState<number>(4);

  const { isConnected } = useAccount(); // Removed unused userAddress

  const {
    data: transactionHash, // This will store the transaction hash
    error: writeError,
    isPending: isSendingTransaction, // True when waiting for wallet confirmation
    writeContractAsync
  } = useWriteContract();

  const {
    isLoading: isConfirmingTransaction, // True when waiting for the transaction to be mined
    isSuccess: isTransactionConfirmed,
    error: receiptError,
    data: receiptData // Transaction receipt
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  const defaultRoomName = fcUser
    ? `${fcUser.username}\'s room`
    : "Adventurer\'s room";

  useEffect(() => {
    // Set initial game name if fcUser is available, but allow user to change it
    // This doesn't set it as a locked default, but as an initial suggestion.
    // If the user clears the input, the placeholder will show the default name.
  }, [fcUser]);

  const handleCreateGame = async () => {
    if (!isConnected) {
      console.error('Wallet not connected');
      // You might want to trigger a connection flow here or show a message
      alert('Please connect your wallet.');
      return;
    }

    if (!writeContractAsync) {
      console.error('writeContractAsync is not available. Wallet might not be ready or wagmi setup issue.');
      alert('Cannot create room: Wallet interaction function is not ready.');
      return;
    }

    // IMPORTANT: ERC20 Approval Flow Reminder
    // Ensure the user has approved the SnakeLadderGame contract to spend the stakeToken.
    // This should be handled before this point, possibly with another button/step.

    try {
      handleButtonClick(); // For UI feedback like sound
      // Arguments are passed directly to writeContractAsync
      await writeContractAsync({
        address: snakeGameContractInfo.address as `0x${string}`,
        abi: snakeGameContractInfo.abi,
        functionName: 'createRoom',
        args: [
          BigInt(selectedPlayers),
          prizeAmount && Number(prizeAmount) > 0
            ? parseUnits(prizeAmount.toString(), 6) // Assuming 6 decimals for USDC
            : BigInt(0) // Should be caught by button disabled state
        ],
      });
      // transactionHash will be set by the hook if successful
      // console.log('Transaction submitted, hash will be available in transactionHash state');
      // Navigation will happen after confirmation (see useEffect below) or can be triggered here if preferred
    } catch (err) {
      console.error('Error sending create room transaction:', err);
      // Error will also be reflected in `sendError` from useContractWrite
    }
  };

  useEffect(() => {
    if (isTransactionConfirmed) {
      console.log('Transaction confirmed! Receipt:', receiptData, 'Navigating...');
      navigate("/explore");
    }
  }, [isTransactionConfirmed, navigate, receiptData]);

  const handleCancel = () => {
    handleButtonClick();
    navigate("/explore");
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
      <div className="p-6 space-y-5 ">
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
            onChange={(e) =>
              setPrizeAmount(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            placeholder="e.g., 50"
            min="0"
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
                className={` w-full items-center justify-center p-2.5 rounded-md text-md transition-colors duration-200
                            ${
                              selectedPlayers === option.value
                                ? "bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#2c1810] border-2 border-transparent"
                                : "bg-[#1a0f09] hover:bg-[#3a251a] text-white border-2 border-[#8b4513]"
                            }`}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          {/* Wagmi specific status messages */}
          {!isConnected && <p className="text-orange-400">Please connect your wallet to create a quest.</p>}
          {isSendingTransaction && <p className="text-yellow-400">Sending transaction... (Check Wallet)</p>}
          {isConfirmingTransaction && transactionHash && <p className="text-yellow-400">Confirming transaction: {transactionHash.substring(0,10)}...</p>}
          {isTransactionConfirmed && transactionHash && <p className="text-green-500">Quest created successfully! Tx: {transactionHash.substring(0,10)}...</p>}
          
          {(writeError || receiptError) && (
            <p className="text-red-500">
              Error: {writeError?.message || receiptError?.message}
            </p>
          )}

          <button
            type="button"
            onClick={handleCreateGame}
            disabled={!isConnected || !writeContractAsync || isSendingTransaction || isConfirmingTransaction || !prizeAmount || Number(prizeAmount) <= 0}
            className="w-full px-6 py-2.5 text-sm font-normal text-[#2c1810] uppercase rounded-md 
                       bg-gradient-to-r from-[#ffd700] to-[#ff8c00] 
                       border-2 border-[#8b4513] shadow-md
                       hover:from-[#ffed4a] hover:to-[#ffa500] transition-colors duration-300
                       disabled:opacity-50"
          >
            Create Quest
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="w-full px-6 py-2.5 text-sm font-normal text-white uppercase rounded-md 
                       bg-[#2c1810] border-2 border-[#8b4513]
                       hover:bg-[#3a251a] hover:border-[#ffd700] transition-colors duration-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
