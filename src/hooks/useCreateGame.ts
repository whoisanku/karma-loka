import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useConnect,
  useReadContract,
} from "wagmi";
import { parseUnits, parseAbi, formatUnits, decodeEventLog } from "viem";
import { baseSepolia } from "wagmi/chains";
import { useCallback, useEffect, useState } from "react";
import snakeGameContractInfo from "../constants/snakeGameContractInfo.json";

// USDC token setup for Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const ERC20_ABI = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export type TransactionStep =
  | "idle"
  | "approving"
  | "waiting_approval"
  | "creating_room"
  | "waiting_creation"
  | "completed"
  | "error";

interface UseCreateGameReturn {
  currentStep: TransactionStep;
  errorMessage: string;
  approvalTxHash: `0x${string}` | null;
  createRoomTxHash: `0x${string}` | null;
  createdRoomId: number | null;
  needsApproval: boolean;
  usdcBalance: bigint | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  handleApproveUSDC: (metadataUri: string) => Promise<void>;
  handleCreateRoom: (metadataUri: string) => Promise<void>;
  connectWallet: () => Promise<void>;
  resetTransactionState: () => void;
  createdGameId: number | null;
}

export function useCreateGame(
  prizeAmount: string,
  selectedPlayers: number
): UseCreateGameReturn {
  const [currentStep, setCurrentStep] = useState<TransactionStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(
    null
  );
  const [createRoomTxHash, setCreateRoomTxHash] = useState<
    `0x${string}` | null
  >(null);
  const [createdRoomId, setCreatedRoomId] = useState<number | null>(null);
  const [pendingMetadataUri, setPendingMetadataUri] = useState<string | null>(
    null
  );

  // Wallet connection
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();

  // Calculate prize amount in wei (6 decimals for USDC)
  const prizeAmountWei =
    prizeAmount && Number(prizeAmount) > 0 ? parseUnits(prizeAmount, 6) : 0n;

  // Check USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 5000,
    },
  });

  // Check current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
    {
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: address
        ? [address, snakeGameContractInfo.address as `0x${string}`]
        : undefined,
      query: {
        enabled: !!address && isConnected,
        refetchInterval: 3000,
      },
    }
  );

  // Write contracts
  const {
    data: approvalHash,
    error: approvalError,
    writeContract: writeApproval,
    reset: resetApproval,
  } = useWriteContract();

  const {
    data: createHash,
    error: createError,
    writeContract: writeCreate,
    reset: resetCreate,
  } = useWriteContract();

  // Wait for approval transaction
  const { isSuccess: isApprovalSuccess, error: approvalReceiptError } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
      confirmations: 1,
      query: {
        enabled: !!approvalHash,
      },
    });

  // Wait for create room transaction
  const {
    isSuccess: isCreateSuccess,
    data: createReceipt,
    error: createReceiptError,
  } = useWaitForTransactionReceipt({
      hash: createHash,
      confirmations: 1,
      query: {
        enabled: !!createHash,
      },
    });

  // Check if approval is needed
  const needsApproval =
    currentAllowance !== undefined && prizeAmountWei > 0n
      ? currentAllowance < prizeAmountWei
      : true;

  // Reset transaction states
  const resetTransactionState = useCallback(() => {
    setCurrentStep("idle");
    setErrorMessage("");
    setApprovalTxHash(null);
    setCreateRoomTxHash(null);
    resetApproval();
    resetCreate();
  }, [resetApproval, resetCreate]);

  // Handle approval success
  useEffect(() => {
    if (isApprovalSuccess && approvalHash) {
      console.log("Approval confirmed:", approvalHash);
      setApprovalTxHash(approvalHash);
      setCurrentStep("creating_room");

      // Refetch allowance and proceed to create room
      setTimeout(() => {
        refetchAllowance();
        if (pendingMetadataUri) {
          handleCreateRoom(pendingMetadataUri);
        }
      }, 2000);
    }
  }, [isApprovalSuccess, approvalHash]);

  // Handle create room success
  useEffect(() => {
    if (isCreateSuccess && createHash && createReceipt) {
      console.log("Room creation confirmed:", createHash);
      setCreateRoomTxHash(createHash);

      for (const log of createReceipt.logs) {
        try {
          if (
            log.address.toLowerCase() !==
            snakeGameContractInfo.address.toLowerCase()
          )
            continue;
          const ev = decodeEventLog({
            abi: snakeGameContractInfo.abi,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "RoomCreated") {
            const roomField = (ev.args as any).roomId ?? (ev.args as any).value;
            setCreatedRoomId(Number(roomField));
            break;
          }
        } catch {
          // ignore malformed logs
        }
      }

      setCurrentStep("completed");
    }
  }, [isCreateSuccess, createHash, createReceipt]);

  // Handle errors
  useEffect(() => {
    const error =
      approvalError ||
      createError ||
      approvalReceiptError ||
      createReceiptError;
    if (error) {
      console.error("Transaction error:", error);
      setCurrentStep("error");
      setErrorMessage(error.message || "Transaction failed");
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

  const handleApproveUSDC = useCallback(
    async (metadataUri: string) => {
      if (!isConnected || !address) {
        console.error(
          "Cannot approve: wallet not connected or address not available"
        );
        setErrorMessage(
          "Wallet not connected. Please connect your wallet first."
        );
        return;
      }

      if (!writeApproval) {
        console.error("Cannot approve: writeApproval function not available");
        setErrorMessage(
          "Contract interaction not available. Please refresh and try again."
        );
        return;
      }

      if (prizeAmountWei <= 0n) {
        console.error("Cannot approve: invalid prize amount");
        setErrorMessage("Invalid prize amount. Please enter a valid amount.");
        return;
      }

      try {
        console.log(
          "Starting approval for exact amount:",
          formatUnits(prizeAmountWei, 6),
          "USDC"
        );
        setCurrentStep("approving");
        setErrorMessage("");
        setPendingMetadataUri(metadataUri);

        await writeApproval({
          chainId: baseSepolia.id,
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [
            snakeGameContractInfo.address as `0x${string}`,
            prizeAmountWei,
          ],
        });

        setCurrentStep("waiting_approval");
      } catch (error) {
        console.error("Approval error:", error);
        setCurrentStep("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Approval failed"
        );
      }
    },
    [isConnected, address, writeApproval, prizeAmountWei]
  );

  const handleCreateRoom = useCallback(
    async (metadataUri: string) => {
      if (!isConnected || !address) {
        console.error(
          "Cannot create room: wallet not connected or address not available"
        );
        setErrorMessage(
          "Wallet not connected. Please connect your wallet first."
        );
        return;
      }

      if (!writeCreate) {
        console.error("Cannot create room: writeCreate function not available");
        setErrorMessage(
          "Contract interaction not available. Please refresh and try again."
        );
        return;
      }

      try {
        console.log(
          "Creating room with players:",
          selectedPlayers,
          "stake:",
          formatUnits(prizeAmountWei, 6),
          "USDC",
          "metadata:",
          metadataUri
        );
        setCurrentStep("creating_room");
        setErrorMessage("");

        await writeCreate({
          chainId: baseSepolia.id,
          address: snakeGameContractInfo.address as `0x${string}`,
          abi: snakeGameContractInfo.abi,
          functionName: "createRoom",
          args: [BigInt(selectedPlayers), prizeAmountWei, metadataUri],
        });

        setCurrentStep("waiting_creation");
      } catch (error) {
        console.error("Create room error:", error);
        setCurrentStep("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Room creation failed"
        );
      }
    },
    [isConnected, address, writeCreate, selectedPlayers, prizeAmountWei]
  );

  const connectWallet = useCallback(async () => {
    try {
      console.log("Attempting to connect wallet...");
      const farcasterConnector = connectors.find((c) =>
        c.name.toLowerCase().includes("farcaster")
      );

      if (farcasterConnector) {
        await connect({ connector: farcasterConnector });
      } else {
        if (connectors.length > 0) {
          await connect({ connector: connectors[0] });
        } else {
          setErrorMessage("No wallet connectors available");
        }
      }
    } catch (error) {
      console.error("Connection error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to connect wallet"
      );
    }
  }, [connectors, connect]);

  return {
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
    createdGameId: createdRoomId,
  };
}