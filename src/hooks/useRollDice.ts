import { useState } from 'react';
import { useAccount, useSignTypedData, useReadContract } from 'wagmi';
import { encodeFunctionData, parseAbi } from 'viem';
import snakeGameContractInfo from '../constants/snakeGameContractInfo.json';

// The ABI for the MinimalForwarder's execute function
const FORWARDER_ABI = parseAbi([
  'function getNonce(address from) view returns (uint256)',
]);

// The address of your deployed MyForwarder contract
const FORWARDER_ADDRESS = import.meta.env.VITE_FORWARDER_ADDRESS as `0x${string}`;

// The URL of your backend relayer
const RELAYER_URL = `${import.meta.env.VITE_BACKEND_URL}/relay`;

export type GaslessTxnStep =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'relaying'
  | 'completed'
  | 'error';

interface UseRollDiceReturn {
  currentStep: GaslessTxnStep;
  errorMessage: string | null;
  relayedTxHash: `0x${string}` | null;
  handleRollDice: (roomId: number) => Promise<void>;
  resetState: () => void;
}

export function useRollDice(): UseRollDiceReturn {
  const { address, chainId } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [currentStep, setCurrentStep] = useState<GaslessTxnStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [relayedTxHash, setRelayedTxHash] = useState<`0x${string}` | null>(null);

  // Get the current nonce for the user from the forwarder contract
  const { data: nonce, refetch: refetchNonce } = useReadContract({
    address: FORWARDER_ADDRESS,
    abi: FORWARDER_ABI,
    functionName: 'getNonce',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const resetState = () => {
    setCurrentStep('idle');
    setErrorMessage(null);
    setRelayedTxHash(null);
  };

  const handleRollDice = async (roomId: number) => {
    if (!address || nonce === undefined || !chainId || !RELAYER_URL) {
      setErrorMessage('Wallet not connected or required information is missing.');
      setCurrentStep('error');
      return;
    }

    setCurrentStep('preparing');

    try {
      // 1. Prepare the transaction data for the `rollDice` function call
      const callData = encodeFunctionData({
        abi: snakeGameContractInfo.abi,
        functionName: 'rollDice',
        args: [roomId],
      });

      // 2. Define the EIP-712 domain and types for the forward request
      const domain = {
        name: 'SnakeLadderGame',
        version: '1',
        chainId,
        verifyingContract: FORWARDER_ADDRESS,
      };

      const types = {
        ForwardRequest: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'gas', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      } as const;

      // 3. Create the forward request message
      const message = {
        from: address,
        to: snakeGameContractInfo.address as `0x${string}`,
        value: 0n,
        gas: 1000000n, // A generous gas limit
        nonce: BigInt(nonce),
        data: callData,
      };

      setCurrentStep('signing');

      // 4. Ask the user to sign the typed data
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: 'ForwardRequest',
        message,
      });

      setCurrentStep('relaying');

      // 5. Send the request and signature to the relayer
      const response = await fetch(RELAYER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: message, signature }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Relayer request failed.');
      }

      setRelayedTxHash(result.hash);
      setCurrentStep('completed');
      refetchNonce(); // Refetch nonce for the next transaction

    } catch (err: any) {
      console.error('Error rolling dice:', err);
      setErrorMessage(err.message || 'An unknown error occurred.');
      setCurrentStep('error');
    }
  };

  return { currentStep, errorMessage, relayedTxHash, handleRollDice, resetState };
}
