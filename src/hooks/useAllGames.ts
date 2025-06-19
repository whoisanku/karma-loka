import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import snakeGameContractInfo from "../constants/snakeGameContractInfo.json";
import { resolveUri } from "../utils/storage";

interface Game {
  id: string;
  creator: string;
  prize: number;
  players: string[];
  requiredParticipants: number;
  maxParticipants: number;
  started: boolean;
  gameStartTime: number;
  winner: string;
  metadataUri: string;
  name: string;
}

type RoomInfoResponse = readonly [
  string,
  bigint,
  bigint,
  bigint,
  boolean,
  bigint,
  string,
  string
];

const addressToUsername = (address: string): string => {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return "Unknown";
  }
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
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      if (!publicClient) return;
      setLoading(true);
      try {
        const lastId = (await publicClient.readContract({
          address: snakeGameContractInfo.address as `0x${string}`,
          abi: snakeGameContractInfo.abi,
          functionName: "getLastRoomId",
        })) as bigint;

        const total = Number(lastId);
        const fetched: Game[] = [];
        for (let i = total; i >= 1; i--) {
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

          const [creator, req, max, stake, started, startTime, winner, metadataUri] = info;
          if (creator === "0x0000000000000000000000000000000000000000") {
            continue;
          }

          let name = "";
          try {
            let url = metadataUri;
            if (url.startsWith("lens://")) {
              url = await resolveUri(url);
            }
            const resp = await fetch(url);
            if (resp.ok) {
              const data = await resp.json();
              name = data?.name ?? "";
            }
          } catch (err) {
            console.error("Failed to fetch metadata for", metadataUri, err);
          }

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
            metadataUri,
            name,
          });
        }
        if (!cancelled) {
          setGames(fetched);
          setError(null);
        }
      } catch (e) {
        console.error("Failed to load all games", e);
        if (!cancelled) setError("Failed to load games");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  return { games, loading, error };
}

