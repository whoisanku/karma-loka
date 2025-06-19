import { useReadContract } from "wagmi";
import snakeGameContractInfo from "../constants/snakeGameContractInfo.json";

export default function useUserRooms(address: string) {
  const { data, isLoading } = useReadContract({
    address: snakeGameContractInfo.address as `0x${string}`,
    abi: snakeGameContractInfo.abi,
    functionName: "getUserRooms",
    args: [address as `0x${string}`],
    enabled: !!address,
  });

  const roomIds = data ? (data as bigint[]).map((id) => Number(id)) : [];

  return { roomIds, isLoading };
}
