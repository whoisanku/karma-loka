import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import snakeGameContractInfo from "../constants/snakeGameContractInfo.json";

interface Game {
  id: string;
  creator: string;
  prize: number; // USDC (converted from wei)
  players: string[];
  requiredParticipants: number;
  maxParticipants: number;
  started: boolean;
  gameStartTime: number;
  winner: string;
  metadataUri: string;
}

type RoomInfoResponse = readonly [
  string,
  bigint,
  bigint,
  bigint,
  boolean,
  bigint,
  string,
  string,
];

const addressToUsername = (address: string): string => {
  if (!address || address === "0x0000000000000000000000000000000000000000") return "Unknown";
  return address;
};

const weiToUsdc = (weiAmount: bigint): number => {
  try {
    return Number(weiAmount) / 1_000_000;
  } catch {
    return 0;
  }
};

export default function useAllGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      if (!publicClient) return;
      setLoading(true);
      try {
        const lastRoomId = (await publicClient.readContract({
          address: snakeGameContractInfo.address as `0x${string}`,
          abi: snakeGameContractInfo.abi,
          functionName: "getLastRoomId",
        })) as bigint;

        const fetched: Game[] = [];
        for (let i = Number(lastRoomId); i >= 1; i--) {
          const info = (await publicClient.readContract({
            address: snakeGameContractInfo.address as `0x${string}`,
            abi: snakeGameContractInfo.abi,
            functionName: "getRoomInfo",
            args: [BigInt(i)],
          })) as RoomInfoResponse;
          const players = (await publicClient.readContract({
            address: snakeGameContractInfo.address as `0x${string}`,
            abi: snakeGameContractInfo.abi,
            functionName: "getRoomPlayers",
            args: [BigInt(i)],
          })) as string[];

          const [creator, req, max, stake, started, startTime, winner, metadata] = info;
          if (creator !== "0x0000000000000000000000000000000000000000") {
            fetched.push({
              id: `Game #${i}`,
              creator: addressToUsername(creator),
              prize: weiToUsdc(stake * req),
              players: players.map(addressToUsername),
              requiredParticipants: Number(req),
              maxParticipants: Number(max),
              started,
              gameStartTime: Number(startTime),
              winner,
              metadataUri: metadata,
            });
          }
        }
        if (!cancelled) setGames(fetched);
      } catch (err) {
        console.error("Failed to fetch all games", err);
        if (!cancelled) setGames([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  return { games, loading };
}
