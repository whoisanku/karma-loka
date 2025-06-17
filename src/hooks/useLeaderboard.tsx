import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import snakeGameContractInfo from "../constants/snakeGameContractInfo.json";

export interface LeaderboardEntry {
  address: string;
  wins: number;
}

export default function useLeaderboard(topN = 10) {
  const { data, isLoading, error } = useReadContract({
    address: snakeGameContractInfo.address as `0x${string}`,
    abi: snakeGameContractInfo.abi,
    functionName: "getTopPlayers",
    args: [BigInt(topN)],
  });

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!data) {
      setEntries([]);
      return;
    }
    const [players, wins] = data as [string[], bigint[]];
    const mapped = players.map((addr, i) => ({
      address: addr,
      wins: Number(wins[i]),
    }));
    setEntries(mapped);
  }, [data]);

  return { entries, isLoading, error };
}
