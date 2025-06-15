import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useConnect,
  useReadContract,
} from "wagmi";
import { parseUnits, parseAbi, formatUnits } from "viem";
import { baseSepolia } from "wagmi/chains";
import { useCallback, useEffect, useState } from "react";
import snakeGameContractInfo from "../constants/snakeGameContractInfo.json";

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const ERC20_ABI = parseAbi([
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export type TransactionStep =
  | "idle"
  | "approving"
  | "waiting_approval"
  | "participating"
  | "waiting_participation"
  | "completed"
  | "error";

interface UseParticipateReturn {
  currentStep: TransactionStep;
  errorMessage: string;
  approvalTxHash: `0x${string}` | null;
  participateTxHash: `0x${string}` | null;
  needsApproval: boolean;
  usdcBalance: bigint | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  handleApproveUSDC: () => Promise<void>;
  handleParticipate: () => Promise<void>;
  connectWallet: () => Promise<void>;
  resetTransactionState: () => void;
}

export function useParticipate(
  roomId: string | number,
  stakeAmount: string
): UseParticipateReturn {
  const [currentStep, setCurrentStep] = useState<TransactionStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(
    null
  );
  const [participateTxHash, setParticipateTxHash] = useState<
    `0x${string}` | null
  >(null);
  const [pendingParticipate, setPendingParticipate] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();

  const stakeAmountWei =
    stakeAmount && Number(stakeAmount) > 0 ? parseUnits(stakeAmount, 6) : 0n;

  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected, refetchInterval: 5000 },
  });

  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
    {
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: address
        ? [address, snakeGameContractInfo.address as `0x${string}`]
        : undefined,
      query: { enabled: !!address && isConnected, refetchInterval: 3000 },
    }
  );

  const {
    data: approvalHash,
    error: approvalError,
    writeContract: writeApproval,
    reset: resetApproval,
  } = useWriteContract();
  const {
    data: participateHash,
    error: participateError,
    writeContract: writeParticipate,
    reset: resetParticipate,
  } = useWriteContract();

  const { isSuccess: isApprovalSuccess, error: approvalReceiptError } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
      confirmations: 1,
      query: { enabled: !!approvalHash },
    });

  const { isSuccess: isParticipateSuccess, error: participateReceiptError } =
    useWaitForTransactionReceipt({
      hash: participateHash,
      confirmations: 1,
      query: { enabled: !!participateHash },
    });

  const needsApproval =
    currentAllowance !== undefined && stakeAmountWei > 0n
      ? currentAllowance < stakeAmountWei
      : true;

  const resetTransactionState = useCallback(() => {
    setCurrentStep("idle");
    setErrorMessage("");
    setApprovalTxHash(null);
    setParticipateTxHash(null);
    setPendingParticipate(false);
    resetApproval();
    resetParticipate();
  }, [resetApproval, resetParticipate]);

  const handleParticipate = useCallback(async () => {
    if (!isConnected || !address) {
      console.error("Cannot participate: wallet not connected");
      setErrorMessage(
        "Wallet not connected. Please connect your wallet first."
      );
      return;
    }
    if (!writeParticipate) {
      console.error("Cannot participate: participation not available");
      setErrorMessage(
        "Participation not available. Please refresh and try again."
      );
      return;
    }
    if (stakeAmountWei <= 0n) {
      console.error("Invalid stake amount");
      setErrorMessage("Invalid stake amount. Please enter a valid amount.");
      return;
    }
    try {
      console.log("Sending participate tx for room:", roomId);
      setCurrentStep("participating");
      setErrorMessage("");
      await writeParticipate({
        chainId: baseSepolia.id,
        address: snakeGameContractInfo.address as `0x${string}`,
        abi: snakeGameContractInfo.abi,
        functionName: "participate",
        args: [BigInt(roomId)],
      });
      setCurrentStep("waiting_participation");
    } catch (error) {
      console.error("Participate error:", error);
      setCurrentStep("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Participation failed"
      );
    }
  }, [isConnected, address, writeParticipate, stakeAmountWei, roomId]);

  useEffect(() => {
    if (isApprovalSuccess && approvalHash && pendingParticipate) {
      console.log("Approval confirmed:", approvalHash);
      setApprovalTxHash(approvalHash);
      setCurrentStep("participating");
      setPendingParticipate(false);
      setTimeout(() => {
        refetchAllowance();
        handleParticipate();
      }, 2000);
    }
  }, [
    isApprovalSuccess,
    approvalHash,
    pendingParticipate,
    handleParticipate,
    refetchAllowance,
  ]);

  useEffect(() => {
    if (isParticipateSuccess && participateHash) {
      console.log("Participation confirmed:", participateHash);
      setParticipateTxHash(participateHash);
      setCurrentStep("completed");
    }
  }, [isParticipateSuccess, participateHash]);

  useEffect(() => {
    const error =
      approvalError ||
      participateError ||
      approvalReceiptError ||
      participateReceiptError;
    if (error) {
      console.error("Transaction error:", error);
      setCurrentStep("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Transaction failed"
      );
    }
  }, [
    approvalError,
    participateError,
    approvalReceiptError,
    participateReceiptError,
  ]);

  useEffect(() => {
    if (approvalHash && !approvalTxHash) {
      setApprovalTxHash(approvalHash);
    }
  }, [approvalHash, approvalTxHash]);

  useEffect(() => {
    if (participateHash && !participateTxHash) {
      setParticipateTxHash(participateHash);
    }
  }, [participateHash, participateTxHash]);

  const handleApproveUSDC = useCallback(async () => {
    if (!isConnected || !address) {
      console.error("Cannot approve: wallet not connected");
      setErrorMessage(
        "Wallet not connected. Please connect your wallet first."
      );
      return;
    }
    if (!writeApproval) {
      console.error("Cannot approve: approval not available");
      setErrorMessage("Approval not available. Please refresh and try again.");
      return;
    }
    if (stakeAmountWei <= 0n) {
      console.error("Invalid stake amount");
      setErrorMessage("Invalid stake amount. Please enter a valid amount.");
      return;
    }
    try {
      console.log(
        "Requesting approval for stake:",
        formatUnits(stakeAmountWei, 6)
      );
      setCurrentStep("approving");
      setErrorMessage("");
      setPendingParticipate(true);
      await writeApproval({
        chainId: baseSepolia.id,
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [snakeGameContractInfo.address as `0x${string}`, stakeAmountWei],
      });
      setCurrentStep("waiting_approval");
    } catch (error) {
      console.error("Approval error:", error);
      setCurrentStep("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Approval failed"
      );
    }
  }, [isConnected, address, writeApproval, stakeAmountWei]);

  const connectWallet = useCallback(async () => {
    try {
      console.log("Connecting wallet...");
      const fc = connectors.find((c) =>
        c.name.toLowerCase().includes("farcaster")
      );
      if (fc) {
        await connect({ connector: fc });
      } else if (connectors.length > 0) {
        await connect({ connector: connectors[0] });
      } else {
        setErrorMessage("No wallet connectors available");
      }
    } catch (error) {
      console.error("Connect error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to connect wallet"
      );
    }
  }, [connect, connectors]);

  return {
    currentStep,
    errorMessage,
    approvalTxHash,
    participateTxHash,
    needsApproval,
    usdcBalance,
    isConnected,
    isConnecting,
    handleApproveUSDC,
    handleParticipate,
    connectWallet,
    resetTransactionState,
  };
}
