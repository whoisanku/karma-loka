import { useState, useEffect, useMemo } from "react";
import { useReadContract } from "wagmi";
import snakeGameContractInfo from "../../constants/snakeGameContractInfo.json";

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
  string,   // creator
  bigint,   // requiredParticipants
  bigint,   // maxParticipants
  bigint,   // stakeAmount
  boolean,  // started
  bigint,   // gameStartTime
  string,   // winner
  string    // metadataUri
];

const addressToUsername = (address: string): string => {
  if (!address || address === "0x0000000000000000000000000000000000000000") return "Unknown";
  return `@${address.slice(2, 8).toLowerCase()}`;
};

const weiToUsdc = (weiAmount: bigint): number => {
  try {
    return Number(weiAmount) / 1_000_000; // USDC has 6 decimals
  } catch {
    return 0;
  }
};

export default function useExplore(roomsPerPage = 5) {
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: lastRoomId } = useReadContract({
    address: snakeGameContractInfo.address as `0x${string}`,
    abi: snakeGameContractInfo.abi,
    functionName: "getLastRoomId",
  });

  const roomIds = useMemo((): number[] => {
    if (!lastRoomId) return [];
    const totalRooms = Number(lastRoomId);
    if (totalRooms === 0) return [];

    const startIndex = Math.max(
      1,
      totalRooms - (currentPage - 1) * roomsPerPage - roomsPerPage + 1
    );
    const endIndex = Math.min(
      totalRooms,
      totalRooms - (currentPage - 1) * roomsPerPage
    );

    const ids: number[] = [];
    for (let i = endIndex; i >= startIndex; i--) {
      ids.push(i);
    }
    return ids;
  }, [lastRoomId, currentPage, roomsPerPage]);

  const roomInfoQueries = Array.from({ length: roomsPerPage }, (_, index) =>
    useReadContract({
      address: snakeGameContractInfo.address as `0x${string}`,
      abi: snakeGameContractInfo.abi,
      functionName: "getRoomInfo",
      args: [BigInt(roomIds[index] ?? 0)],
    })
  );

  const roomPlayersQueries = Array.from({ length: roomsPerPage }, (_, index) =>
    useReadContract({
      address: snakeGameContractInfo.address as `0x${string}`,
      abi: snakeGameContractInfo.abi,
      functionName: "getRoomPlayers",
      args: [BigInt(roomIds[index] ?? 0)],
    })
  );

  useEffect(() => {
    if (roomIds.length === 0) {
      setGames([]);
      return;
    }

    const fetched: Game[] = [];
    let hasErrors = false;

    roomIds.forEach((roomId, idx) => {
      const infoQ = roomInfoQueries[idx];
      const playersQ = roomPlayersQueries[idx];
      if (infoQ.error || playersQ.error) {
        console.error(
          `Error loading room ${roomId}:`,
          infoQ.error || playersQ.error
        );
        hasErrors = true;
        return;
      }
      if (infoQ.data && playersQ.data) {
        try {
          const data = infoQ.data as RoomInfoResponse;
          const [creator, req, max, stake, started, startTime, winner, metadata] =
            data;
          if (
            creator !== "0x0000000000000000000000000000000000000000"
          ) {
            fetched.push({
              id: `Game #${roomId}`,
              creator: addressToUsername(creator),
              prize: weiToUsdc(stake * req),
              players: (playersQ.data as string[]).map(addressToUsername),
              requiredParticipants: Number(req),
              maxParticipants: Number(max),
              started,
              gameStartTime: Number(startTime),
              winner,
              metadataUri: metadata,
            });
          }
        } catch (e) {
          console.error(`Parse error for room ${roomId}:`, e);
          hasErrors = true;
        }
      }
    });

    setGames(fetched);
    setError(hasErrors && fetched.length === 0 ?
      "Failed to load games. Please try refreshing the page." : null);
  }, [
    roomIds,
    ...roomInfoQueries.map(q => q.data),
    ...roomInfoQueries.map(q => q.error),
    ...roomPlayersQueries.map(q => q.data),
    ...roomPlayersQueries.map(q => q.error)
  ]);

  const isLoading =
    roomInfoQueries.some(q => q.isLoading) ||
    roomPlayersQueries.some(q => q.isLoading);

  return {
    games,
    error,
    isLoading,
    lastRoomId,
    currentPage,
    roomsPerPage,
    setCurrentPage,
  };
}
