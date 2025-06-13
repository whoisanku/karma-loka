import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import Dice from "../../components/Dice/Dice";
import snakeGameContractInfo from "../../constants/snakeGameContractInfo.json";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";
import { generateSnakedCells, SNAKES_AND_LADDERS } from "./boardUtils";
import LadderVisual from "./LadderVisual";
import SnakeVisual from "./SnakeVisual";

type RoomInfoType = readonly [
  unknown,
  bigint,
  unknown,
  unknown,
  unknown,
  unknown,
  `0x${string}`,
  string
];

interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  position: number;
  lastRoll?: number;
  lastPosition?: number;
}

type RoomInfo = [
  creator: `0x${string}`,
  requiredParticipants: bigint,
  maxParticipants: bigint,
  stakeAmount: bigint,
  started: boolean,
  gameStartTime: bigint,
  winner: `0x${string}`,
  metadataUri: string
];

const PlayerCorner: React.FC<{
  player: Player;
  isCurrent: boolean;
  isSelf: boolean;
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  diceValue: number;
  handleDiceRollComplete: (rolledValue: number) => void;
  isRolling: boolean;
  setIsRolling: (isRolling: boolean) => void;
  winner: Player | null;
}> = ({
  player,
  isCurrent,
  isSelf,
  corner,
  diceValue,
  handleDiceRollComplete,
  isRolling,
  setIsRolling,
  winner,
}) => {
  const avatar = (
    <img
      src={player.avatarUrl}
      alt={player.name}
      className={`w-12 h-12 rounded-full border-4 ${isCurrent ? "border-yellow-400" : "border-[#8b4513]"} object-cover bg-gray-700 shadow-lg`}
    />
  );

  useEffect(() => {
    console.log(`Last roll for ${player.name}:`, player.lastRoll);
  }, [player.lastRoll]);

  const diceBox = (
    <div className="w-12 h-12 border-2 border-[#8b4513] rounded-lg flex items-center justify-center bg-[#2c1810]">
      {isCurrent && (
        <Dice
          onRollComplete={handleDiceRollComplete}
          isParentRolling={isRolling}
          setParentIsRolling={setIsRolling}
          initialValue={diceValue}
          disabled={!isSelf}
        />
      )}
    </div>
  );

  const arrangement = ["top-right", "bottom-right"].includes(corner)
    ? [diceBox, avatar]
    : [avatar, diceBox];

  const horizontalAlign = corner.includes("left") ? "items-start" : "items-end";

  return (
    <div className={`flex flex-col ${horizontalAlign} space-y-1 mx-2 relative`}>
      {player.lastPosition !== undefined && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
          <div className="relative bg-gray-800 text-white text-sm w-40 px-4 py-2 rounded text-center">
            I rolled {player.position - player.lastPosition} and reached to {player.position}
            <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-800" />
          </div>
        </div>
      )}
      <div className="flex items-center space-x-3">{arrangement}</div>
      <span
        className={`font-['MorrisRoman'] mx-2 text-sm ${isCurrent ? "text-yellow-400" : "text-white"}`}
      >
        {player.name}
      </span>
    </div>
  );
};

const SnakesAndLaddersPage: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const numericRoomId = Number(roomId ?? 0);

  const { data: contractPlayers } = useReadContract({
    address: snakeGameContractInfo.address as `0x${string}`,
    abi: snakeGameContractInfo.abi,
    functionName: "getRoomPlayers",
    args: [BigInt(numericRoomId)],
    query: { enabled: numericRoomId > 0, refetchInterval: 5000 },
  });

  const roomInfoQuery = useReadContract({
    address: snakeGameContractInfo.address as `0x${string}`,
    abi: snakeGameContractInfo.abi,
    functionName: "getRoomInfo",
    args: [BigInt(numericRoomId)],
    query: { enabled: numericRoomId > 0, refetchInterval: 5000 },
  });
  const roomInfo = roomInfoQuery.data as RoomInfo | undefined;
  const requiredSlots =
    roomInfo && typeof (roomInfo as RoomInfoType)[1] !== "undefined"
      ? Number((roomInfo as RoomInfoType)[1])
      : 4;

  const playerInfoQueries = Array.from({ length: 4 }, (_, i) =>
    useReadContract({
      address: snakeGameContractInfo.address as `0x${string}`,
      abi: snakeGameContractInfo.abi,
      functionName: "getUserInfo",
      args:
        contractPlayers && (contractPlayers as string[])[i]
          ? [
              BigInt(numericRoomId),
              (contractPlayers as string[])[i] as `0x${string}`,
            ]
          : undefined,
      query: {
        enabled: Boolean(contractPlayers && (contractPlayers as string[])[i]),
        refetchInterval: 5000,
      },
    })
  );

  const { profiles } = useFarcasterProfiles(
    (contractPlayers as string[]) || []
  );

  const players: Player[] = Array.from({ length: requiredSlots }, (_, i) => {
    const addr = (contractPlayers as string[] | undefined)?.[i];
    const info = playerInfoQueries[i].data as
      | readonly [number, bigint, number]
      | undefined;
    return {
      id: addr ?? `slot-${i}`,
      name: addr ? (profiles[addr]?.username ?? addr) : "Waiting",
      avatarUrl: addr
        ? (profiles[addr]?.pfp?.url ??
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${addr}`)
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=slot${i}`,
      position: info ? Number(info[1]) : 1,
      lastPosition: info ? Number(info[0]) : undefined,
      lastRoll: info ? Number(info[2]) : undefined,
    };
  });

  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  const winnerAddress =
    roomInfo &&
    (roomInfo as RoomInfoType)[6] !==
      "0x0000000000000000000000000000000000000000"
      ? ((roomInfo as RoomInfoType)[6] as string)
      : null;

  const winner = players.find((p) => p.id === winnerAddress) || null;

  const snakedCells = generateSnakedCells();

  const { writeContract } = useWriteContract();

  const { data: currentPlayerAddressRaw } = useReadContract({
    address: snakeGameContractInfo.address as `0x${string}`,
    abi: snakeGameContractInfo.abi,
    functionName: "getCurrentPlayer",
    args: [BigInt(numericRoomId)],
    query: { enabled: numericRoomId > 0, refetchInterval: 5000 },
  });
  // cast to string for lowercase comparison
  const currentPlayerAddress = (currentPlayerAddressRaw as `0x${string}` | undefined) ?? "";

  const currentPlayer = players.find((p) => p.id === currentPlayerAddress) || null;

  const handleDiceRollComplete = async (rolledValue: number) => {
    setDiceValue(rolledValue);

    if (!isConnected || !address) {
      setIsRolling(false);
      return;
    }

    try {
      writeContract({
        address: snakeGameContractInfo.address as `0x${string}`,
        abi: snakeGameContractInfo.abi,
        functionName: "rollDice",
        args: [BigInt(numericRoomId)],
      });
    } catch (error) {
      console.error("Roll dice error", error);
    }

    setIsRolling(false);
  };

  const getPlayersInCell = (displayedCellNumber: number) => {
    return players.filter((p) => p.position === displayedCellNumber);
  };

  const resetGame = () => {
    navigate("/explore");
  };

  // compute wait time until next 10-minute interval
  const gameStartTimeRaw = roomInfo ? ((roomInfo as RoomInfoType)[5] as bigint) : BigInt(0);
  const gameStartTime = Number(gameStartTimeRaw);
  const elapsedSecs = Math.floor(Date.now() / 1000) - gameStartTime;
  const elapsedMins = Math.floor(elapsedSecs / 60);
  const remainderMins = elapsedMins % 10;
  const waitTime = (10 - remainderMins) % 10;

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col bg-[#0d0805]">
      <div className="flex items-center justify-between px-6 py-3 bg-[#1a0f09] border-b-2 border-[#8b4513] shadow-md z-20 flex-shrink-0">
        <button
          onClick={() => navigate("/explore")}
          className="text-[#ffd700] hover:text-[#ffed4a] transition-colors duration-300 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-[#ffd700]">Game Board</h1>
        <div className="w-16 h-6" />
      </div>

      <div className="flex-grow flex flex-col justify-between p-2 sm:p-4 relative">
        {/* Top Players */}
        <div className="flex justify-between items-start mb-2 sm:mb-4">
          {players.slice(2).map((player, idx) => (
            <PlayerCorner
              key={player.id}
              player={player}
              isCurrent={player.id.toLowerCase() === currentPlayerAddress.toLowerCase()}
              isSelf={player.id.toLowerCase() === (address ?? "").toLowerCase()}
              diceValue={diceValue}
              handleDiceRollComplete={handleDiceRollComplete}
              isRolling={isRolling}
              setIsRolling={setIsRolling}
              winner={winner}
              corner={idx === 0 ? "top-left" : "top-right"}
            />
          ))}
        </div>

        {/* Game Board */}
        <div className="flex-grow flex items-center justify-center">
          <div className="w-auto h-full aspect-square bg-[#1a0f09] border-2 border-[#8b4513] relative">
            <div className="grid grid-cols-10 gap-[1px] w-full h-full">
              {snakedCells.map((displayedNumber, index) => {
                const playersInCell = getPlayersInCell(displayedNumber);
                // const isSnakeStart =
                //   Object.keys(SNAKES_AND_LADDERS)
                //     .map(Number)
                //     .includes(displayedNumber) &&
                //   SNAKES_AND_LADDERS[
                //     displayedNumber as keyof typeof SNAKES_AND_LADDERS
                //   ] < displayedNumber;
                // const isLadderStart =
                //   Object.keys(SNAKES_AND_LADDERS)
                //     .map(Number)
                //     .includes(displayedNumber) &&
                //   SNAKES_AND_LADDERS[
                //     displayedNumber as keyof typeof SNAKES_AND_LADDERS
                //   ] > displayedNumber;

                let cellBgColor = index % 2 === 0 ? "#2c1810" : "#3b2010";

                return (
                  <div
                    key={`cell-${index}`}
                    className="aspect-square relative flex items-center justify-center"
                    style={{ backgroundColor: cellBgColor }}
                  >
                    <span className="absolute top-0 left-1 p-0.5 text-gray-300 text-[7px] sm:text-[9px] z-10">
                      {displayedNumber}
                    </span>
                    <div className="absolute inset-0 flex flex-wrap items-center justify-center p-0.5 z-10">
                      {playersInCell.map((player) => (
                        <img
                          key={player.id}
                          src={player.avatarUrl}
                          alt={player.name}
                          title={`${player.name} (Pos: ${player.position})`}
                          className="w-1/2 h-1/2 rounded-full border border-[#8b4513] object-cover bg-gray-700"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <svg
              className="absolute top-0 left-0 w-full h-full z-0"
              style={{ pointerEvents: "none" }}
              viewBox="0 0 10 10"
            >
              {Object.entries(SNAKES_AND_LADDERS).map(([start, end]) => {
                if (end > Number(start)) {
                  return (
                    <LadderVisual
                      key={`ladder-${start}-${end}`}
                      start={Number(start)}
                      end={end}
                    />
                  );
                }
                return (
                  <SnakeVisual
                    key={`snake-${start}-${end}`}
                    start={Number(start)}
                    end={end}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Bottom Players */}
        <div className="relative mt-2 sm:mt-4 flex justify-between items-center">
          {players[0] && (
            <PlayerCorner
              player={players[0]}
              isCurrent={players[0].id.toLowerCase() === currentPlayerAddress.toLowerCase()}
              isSelf={players[0].id.toLowerCase() === (address ?? "").toLowerCase()}
              diceValue={diceValue}
              handleDiceRollComplete={handleDiceRollComplete}
              isRolling={isRolling}
              setIsRolling={setIsRolling}
              winner={winner}
              corner="bottom-left"
            />
          )}
          {players[1] && (
            <PlayerCorner
              player={players[1]}
              isCurrent={players[1].id.toLowerCase() === currentPlayerAddress.toLowerCase()}
              isSelf={players[1].id.toLowerCase() === (address ?? "").toLowerCase()}
              diceValue={diceValue}
              handleDiceRollComplete={handleDiceRollComplete}
              isRolling={isRolling}
              setIsRolling={setIsRolling}
              winner={winner}
              corner="bottom-right"
            />
          )}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <span className="text-white text-md">Next roll in {waitTime} m</span>
          </div>
        </div>

        {winner && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-30">
            <h2 className="text-5xl text-yellow-400 font-bold mb-4">Winner!</h2>
            <p className="text-3xl text-white mb-8">
              {winner.name} has won the game!
            </p>
            <button
              onClick={resetGame}
              className="px-6 py-3 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#2c1810] rounded-lg text-xl font-bold border-2 border-[#8b4513]"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnakesAndLaddersPage;
