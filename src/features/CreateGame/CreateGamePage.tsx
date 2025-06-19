import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PiUsersFill, PiUsersThreeFill, PiUsersFourFill } from "react-icons/pi";
import type { SDKUser } from "../../types";
import { formatUnits, parseUnits } from "viem";
import { useCreateGame } from "../../hooks/useCreateGame";
import { useStorage } from "../../hooks/useStorage";
import { useAccount } from "wagmi";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";
import GameCreatedModal from "./GameCreatedModal";

interface CreateGamePageProps {
  fcUser: SDKUser | null;
  handleButtonClick: () => void;
}

export default function CreateGamePage({
  fcUser,
  handleButtonClick,
}: CreateGamePageProps) {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { profiles: fcProfiles } = useFarcasterProfiles(
    address ? [address] : []
  );
  const walletProfile = address ? fcProfiles[address] : null;
  const truncateAddress = (addr: string | undefined) => {
    if (!addr) return "Anon";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const defaultRoomName = fcUser
    ? `${fcUser.username}'s room`
    : walletProfile?.username
      ? `${walletProfile.username}'s room`
      : address
        ? `${truncateAddress(address)}'s room`
        : "Adventurer's room";

  const [gameName, setGameName] = useState("");
  const [prizeAmount, setPrizeAmount] = useState<string>("");
  const [selectedPlayers, setSelectedPlayers] = useState<number>(4);
  const [showSuccess, setShowSuccess] = useState(false);

  const { uploadGameMetadata } = useStorage();

  const {
    currentStep,
    errorMessage,
    approvalTxHash,
    createRoomTxHash,
    createdRoomId,
    needsApproval,
    usdcBalance,
    isConnected,
    isConnecting,
    handleApproveUSDC,
    handleCreateRoom,
    connectWallet,
    resetTransactionState,
    createdGameId,
  } = useCreateGame(prizeAmount, selectedPlayers);

  // Show success modal when quest creation completes
  useEffect(() => {
    if (currentStep === "completed") {
      setShowSuccess(true);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    // First, ensure wallet is connected
    if (!isConnected) {
      console.log("Wallet not connected, attempting to connect...");
      await connectWallet();
      return;
    }

    // Validation checks
    if (!prizeAmount || Number(prizeAmount) <= 0) {
      return;
    }

    if (usdcBalance !== undefined && parseUnits(prizeAmount, 6) > usdcBalance) {
      return;
    }

    // Wait a moment to ensure connection is fully established
    if (isConnecting) {
      console.log("Still connecting, please wait...");
      return;
    }

    try {
      // Upload game metadata first
      const finalGameName = gameName || defaultRoomName;
      const metadataResponse = await uploadGameMetadata(finalGameName);
      console.log("Game metadata URI:", metadataResponse.uri);

      handleButtonClick();
      resetTransactionState();

      // Add a small delay to ensure all state is updated
      setTimeout(async () => {
        if (needsApproval) {
          await handleApproveUSDC(metadataResponse.uri);
        } else {
          await handleCreateRoom(metadataResponse.uri);
        }
      }, 100);
    } catch (error) {
      console.error("Error during game creation:", error);
    }
  }, [
    isConnected,
    prizeAmount,
    usdcBalance,
    needsApproval,
    isConnecting,
    gameName,
    defaultRoomName,
    connectWallet,
    handleButtonClick,
    resetTransactionState,
    handleApproveUSDC,
    handleCreateRoom,
    uploadGameMetadata,
  ]);

  const handleCancel = () => {
    handleButtonClick();
    resetTransactionState();
    navigate("/explore");
  };

  const handleShareOnFarcaster = () => {
    const baseUrl = 'https://shall-advances-very-prague.trycloudflare.com';
    const frameUrl = `${baseUrl}/game/${createdRoomId}?v=${Date.now()}`;
    // const frameUrl = `${baseUrl}/game/2?v=${Date.now()}`;
    const text = `Join my quest "${gameName || defaultRoomName}" on Karma Loka!`;
    
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(frameUrl)}`;

    console.log("Farcaster URL:", farcasterUrl);
    window.open(farcasterUrl, "_blank");
    setShowSuccess(false);
  };

  const isLoading =
    currentStep !== "idle" &&
    currentStep !== "completed" &&
    currentStep !== "error";
  const isDisabled =
    !isConnected ||
    isLoading ||
    !prizeAmount ||
    Number(prizeAmount) <= 0 ||
    isConnecting;

  const getButtonText = () => {
    if (isConnecting) return "Connecting Wallet...";

    switch (currentStep) {
      case "approving":
        return "Approving USDC...";
      case "waiting_approval":
        return "Confirming Approval...";
      case "creating_room":
        return "Creating Quest...";
      case "waiting_creation":
        return "Confirming Creation...";
      case "completed":
        return "Quest Created!";
      case "error":
        return "Try Again";
      default:
        if (!isConnected) return "Connect Wallet";
        if (needsApproval && parseUnits(prizeAmount || "0", 6) > 0n)
          return "Approve USDC & Create Quest";
        return "Create Quest";
    }
  };

  const getStatusMessage = () => {
    if (currentStep === "error" && errorMessage) {
      return <p className="text-red-500">❌ Error: {errorMessage}</p>;
    }

    if (isConnecting) {
      return <p className="text-yellow-400">🔄 Connecting wallet...</p>;
    }

    if (!isConnected) {
      return (
        <p className="text-red-400">
          ⚠️ Wallet not connected. Please connect your wallet.
        </p>
      );
    }

    if (usdcBalance !== undefined) {
      const balanceFormatted = formatUnits(usdcBalance, 6);
      if (parseUnits(prizeAmount || "0", 6) > usdcBalance) {
        return (
          <p className="text-red-400">
            ❌ Insufficient USDC balance. You have {balanceFormatted} USDC
          </p>
        );
      }
      return (
        <p className="text-green-400">💰 USDC Balance: {balanceFormatted}</p>
      );
    }

    switch (currentStep) {
      case "approving":
        return (
          <p className="text-yellow-400">
            🔄 Please confirm approval in your wallet...
          </p>
        );
      case "waiting_approval":
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
      case "creating_room":
        return (
          <p className="text-yellow-400">
            🔄 Please confirm room creation in your wallet...
          </p>
        );
      case "waiting_creation":
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
      case "completed":
        return (
          <p className="text-green-500">
            ✅ Quest created successfully!
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
        if (needsApproval && parseUnits(prizeAmount || "0", 6) > 0n) {
          return (
            <p className="text-yellow-400">
              ⚠️ USDC approval required for prize pool.
            </p>
          );
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

        {/* Status Messages */}
        <div className="min-h-[48px] text-sm space-y-1">
          {getStatusMessage()}
          {/* Show approval amount info */}
          {currentStep === "approving" &&
            parseUnits(prizeAmount || "0", 6) > 0n && (
              <p className="text-blue-400">
                📝 Approving exactly {prizeAmount} USDC (no excess)
              </p>
            )}
          {needsApproval &&
            parseUnits(prizeAmount || "0", 6) > 0n &&
            currentStep === "idle" && (
              <p className="text-blue-400">
                ℹ️ Will approve exactly {prizeAmount} USDC
              </p>
            )}
        </div>

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
      <GameCreatedModal
        isOpen={showSuccess}
        // isOpen={true}
        onClose={() => {
          setShowSuccess(false);
        }}
        onShare={() => {
          handleShareOnFarcaster();
        }}
        onExplore={() => {
          setShowSuccess(false);
          navigate("/explore");
        }}
      />
    </div>
  );
}