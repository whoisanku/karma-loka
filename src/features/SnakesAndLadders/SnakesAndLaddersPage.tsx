import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import Dice from "../../components/Dice/Dice";
import snakeGameContractInfo from "../../constants/snakeGameContractInfo.json";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";

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

const SNAKES_AND_LADDERS = {
  // Snakes
  99: 41,
  95: 75,
  92: 88,
  89: 68,
  74: 53,
  62: 24,
  64: 20,
  49: 11,
  46: 25,
  16: 6,

  // Ladders
  2: 38,
  7: 14,
  8: 31,
  15: 26,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  78: 98,
  87: 94,
};

const LadderVisual: React.FC<{ start: number; end: number }> = ({
  start,
  end,
}) => {
  const getPosition = (cell: number) => {
    const visualRow = Math.floor((cell - 1) / 10);
    let col = (cell - 1) % 10;
    if (visualRow % 2 !== 0) {
      col = 9 - col;
    }
    const row = 9 - visualRow;
    return { x: col + 0.5, y: row + 0.5 };
  };

  const p1 = getPosition(start);
  const p2 = getPosition(end);

  const ladderWidth = 0.4;
  const rungSpacing = 0.4;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  const angle = Math.atan2(dy, dx);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  const rail1 = {
    x1: p1.x + (nx * ladderWidth) / 2,
    y1: p1.y + (ny * ladderWidth) / 2,
    x2: p2.x + (nx * ladderWidth) / 2,
    y2: p2.y + (ny * ladderWidth) / 2,
  };

  const rail2 = {
    x1: p1.x - (nx * ladderWidth) / 2,
    y1: p1.y - (ny * ladderWidth) / 2,
    x2: p2.x - (nx * ladderWidth) / 2,
    y2: p2.y - (ny * ladderWidth) / 2,
  };

  const numRungs = Math.floor(len / rungSpacing);
  const rungs = Array.from({ length: numRungs }, (_, i) => {
    const progress = (i + 1) / (numRungs + 1);
    const rungX = p1.x + dx * progress;
    const rungY = p1.y + dy * progress;
    return {
      x1: rungX + (nx * ladderWidth) / 2,
      y1: rungY + (ny * ladderWidth) / 2,
      x2: rungX - (nx * ladderWidth) / 2,
      y2: rungY - (ny * ladderWidth) / 2,
    };
  });

  return (
    <g>
      <line {...rail1} stroke="#8B4513" strokeWidth="0.05" />
      <line {...rail2} stroke="#8B4513" strokeWidth="0.05" />
      {rungs.map((rung, i) => (
        <line key={i} {...rung} stroke="#8B4513" strokeWidth="0.05" />
      ))}
    </g>
  );
};

const SnakeVisual: React.FC<{ start: number; end: number }> = ({
  start,
  end,
}) => {
  const getPosition = (cell: number) => {
    const visualRow = Math.floor((cell - 1) / 10);
    let col = (cell - 1) % 10;
    if (visualRow % 2 !== 0) {
      col = 9 - col;
    }
    const row = 9 - visualRow;
    return { x: col + 0.5, y: row + 0.5 };
  };

  const p1 = getPosition(start);
  const p2 = getPosition(end);

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  const bodyWidth = 0.2;
  const numSegments = Math.max(10, Math.floor(len * 5));
  const pathPoints: { x: number; y: number; width: number }[] = [];

  const angle = Math.atan2(dy, dx);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  const curveAmplitude = len * 0.2;
  const control1X = p1.x + dx / 3 + nx * curveAmplitude;
  const control1Y = p1.y + dy / 3 + ny * curveAmplitude;
  const control2X = p1.x + (2 * dx) / 3 - nx * curveAmplitude;
  const control2Y = p1.y + (2 * dy) / 3 - ny * curveAmplitude;

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const mt = 1 - t;
    const x =
      mt * mt * mt * p1.x +
      3 * mt * mt * t * control1X +
      3 * mt * t * t * control2X +
      t * t * t * p2.x;
    const y =
      mt * mt * mt * p1.y +
      3 * mt * mt * t * control1Y +
      3 * mt * t * t * control2Y +
      t * t * t * p2.y;
    const width = bodyWidth * (1 - t * 0.7);
    pathPoints.push({ x, y, width });
  }

  const headAngle = Math.atan2(control1Y - p1.y, control1X - p1.x);
  const headNx = -Math.sin(headAngle);
  const headNy = Math.cos(headAngle);

  return (
    <g>
      {pathPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.width / 2}
          fill={i % 2 === 0 ? "#8B0000" : "#B22222"}
        />
      ))}
      {/* Snake Eyes */}
      <circle
        cx={p1.x - headNx * 0.05}
        cy={p1.y - headNy * 0.05}
        r={0.04}
        fill="white"
      />
      <circle
        cx={p1.x + headNx * 0.05}
        cy={p1.y + headNy * 0.05}
        r={0.04}
        fill="white"
      />
      <circle
        cx={p1.x - headNx * 0.05}
        cy={p1.y - headNy * 0.05}
        r={0.02}
        fill="black"
      />
      <circle
        cx={p1.x + headNx * 0.05}
        cy={p1.y + headNy * 0.05}
        r={0.02}
        fill="black"
      />
      {/* Forked Tongue */}
      <polyline
        points={`${p1.x + headNy * 0.15},${p1.y - headNx * 0.15} ${p1.x + headNy * 0.25},${p1.y - headNx * 0.25} ${p1.x + headNy * 0.2},${p1.y - headNx * 0.2} ${p1.x + headNy * 0.3},${p1.y - headNx * 0.3}`}
        stroke="red"
        strokeWidth="0.02"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};

const generateSnakedCells = (): number[] => {
  const rows = 10;
  const cols = 10;
  const cells: number[] = new Array(rows * cols).fill(0);

  for (let visualRow = 0; visualRow < rows; visualRow++) {
    for (let col = 0; col < cols; col++) {
      const cellValue = visualRow * cols + col + 1;
      let displayCol = col;
      if (visualRow % 2 !== 0) {
        displayCol = cols - 1 - col;
      }
      const actualGridRow = rows - 1 - visualRow;
      const indexInGrid = actualGridRow * cols + displayCol;
      cells[indexInGrid] = cellValue;
    }
  }
  return cells;
};

const PlayerCorner: React.FC<{
  player: Player;
  isCurrent: boolean;
  isSelf: boolean;
  diceValue: number;
  handleDiceRollComplete: (value: number) => void;
  isRolling: boolean;
  setIsRolling: (isRolling: boolean) => void;
  winner: Player | null;
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}> = ({
  player,
  isCurrent,
  isSelf,
  diceValue,
  handleDiceRollComplete,
  isRolling,
  setIsRolling,
  winner,
  corner,
}) => {
  const avatar = (
    <img
      src={player.avatarUrl}
      alt={player.name}
      className={`w-12 h-12 rounded-full border-4 ${isCurrent ? "border-yellow-400" : "border-[#8b4513]"} object-cover bg-gray-700 shadow-lg`}
    />
  );

  const diceBox = (
    <div className="w-12 h-12 border-2 border-[#8b4513] rounded-lg flex items-center justify-center bg-[#2c1810]">
      {isCurrent && isSelf && !winner ? (
        <Dice
          onRollComplete={handleDiceRollComplete}
          isParentRolling={isRolling}
          setParentIsRolling={setIsRolling}
          initialValue={diceValue}
        />
      ) : (
        player.lastRoll && (
          <span className="text-white text-3xl font-['MorrisRoman']">
            {player.lastRoll}
          </span>
        )
      )}
    </div>
  );

  const arrangement = ["top-right", "bottom-right"].includes(corner)
    ? [diceBox, avatar]
    : [avatar, diceBox];

  const horizontalAlign = corner.includes("left") ? "items-start" : "items-end";

  return (
    <div className={`flex flex-col ${horizontalAlign} space-y-1 mx-2`}>
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
      position: info ? Number(info[0]) : 1,
    };
  });

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
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

    setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
    setIsRolling(false);
  };

  const getPlayersInCell = (displayedCellNumber: number) => {
    return players.filter((p) => p.position === displayedCellNumber);
  };

  const resetGame = () => {
    navigate("/explore");
  };

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
              isCurrent={currentPlayerIndex === idx + 2}
              isSelf={player.id.toLowerCase() === (address ?? "").toLowerCase()}
              {...{
                diceValue,
                handleDiceRollComplete,
                isRolling,
                setIsRolling,
                winner,
              }}
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
        <div className="flex justify-between mt-2 sm:mt-4">
          {players.slice(0, 2).map((player, idx) => (
            <PlayerCorner
              key={player.id}
              player={player}
              isCurrent={currentPlayerIndex === idx}
              isSelf={player.id.toLowerCase() === (address ?? "").toLowerCase()}
              {...{
                diceValue,
                handleDiceRollComplete,
                isRolling,
                setIsRolling,
                winner,
              }}
              corner={idx === 0 ? "bottom-left" : "bottom-right"}
            />
          ))}
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
