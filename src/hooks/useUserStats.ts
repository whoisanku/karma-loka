import { useReadContract } from "wagmi";
import snakeGameContractInfo from "../constants/snakeGameContractInfo.json";

export default function useUserStats(address: string) {
  const { data, isLoading } = useReadContract({
    address: snakeGameContractInfo.address as `0x${string}`,
    abi: snakeGameContractInfo.abi,
    functionName: "getUserStats",
    args: [address as `0x${string}`],
    enabled: !!address,
  });

  let gamesPlayed = 0;
  let wins = 0;
  let rank = 0;

  if (data) {
    const [totalGames, totalWins, playerRank] = data as [bigint, bigint, bigint];
    gamesPlayed = Number(totalGames);
    wins = Number(totalWins);
    rank = Number(playerRank);
  }

  return { gamesPlayed, wins, rank, loading: isLoading };
}
