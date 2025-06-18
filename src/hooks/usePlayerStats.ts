import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import snakeGameContractInfo from "../constants/snakeGameContractInfo.json";

interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  loading: boolean;
}

export default function usePlayerStats(address: string): PlayerStats {
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [wins, setWins] = useState(0);
  const [loading, setLoading] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const lastRoomId = (await publicClient.readContract({
          address: snakeGameContractInfo.address as `0x${string}`,
          abi: snakeGameContractInfo.abi,
          functionName: "getLastRoomId",
        })) as bigint;

        let played = 0;
        let won = 0;
        for (let i = 1; i <= Number(lastRoomId); i++) {
          const players = (await publicClient.readContract({
            address: snakeGameContractInfo.address as `0x${string}`,
            abi: snakeGameContractInfo.abi,
            functionName: "getRoomPlayers",
            args: [BigInt(i)],
          })) as string[];

          if (players.some((p) => p.toLowerCase() === address.toLowerCase())) {
            played++;
            const info = (await publicClient.readContract({
              address: snakeGameContractInfo.address as `0x${string}`,
              abi: snakeGameContractInfo.abi,
              functionName: "getRoomInfo",
              args: [BigInt(i)],
            })) as any[];
            const winner = info[6] as string;
            if (winner.toLowerCase() === address.toLowerCase()) {
              won++;
            }
          }
        }

        if (!cancelled) {
          setGamesPlayed(played);
          setWins(won);
        }
      } catch (err) {
        console.error("Failed to fetch player stats", err);
        if (!cancelled) {
          setGamesPlayed(0);
          setWins(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  return { gamesPlayed, wins, loading };
}
