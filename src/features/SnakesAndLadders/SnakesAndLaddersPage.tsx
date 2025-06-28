import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReadContract, useAccount } from "wagmi";
import Dice from "../../components/Dice/Dice";
import { useRollDice } from "../../hooks/useRollDice";
import snakeGameContractInfo from "../../constants/snakeGameContractInfo.json";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";
import { generateSnakedCells, SNAKES_AND_LADDERS } from "./boardUtils";
import LadderVisual from "./LadderVisual";
import SnakeVisual from "./SnakeVisual";

const truncateAddress = (address: string) => {
  if (address.length > 10 && address.startsWith("0x")) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
  return address;
};

type RoomInfoType = readonly [
  unknown,
  bigint,
  unknown,
  unknown,
  unknown,
  unknown,
  `0x${string}`,
  string,
];

interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  position: number;
  lastRoll?: number;
  lastPosition?: number;
  hasRolledSix?: boolean;
  animatedPosition?: number;
}

type RoomInfo = [
  creator: `0x${string}`,
  requiredParticipants: bigint,
  maxParticipants: bigint,
  stakeAmount: bigint,
  started: boolean,
  gameStartTime: bigint,
  winner: `0x${string}`,
  metadataUri: string,
];

type UserInfo = readonly [
  number, // lastPosition
  number, // currentPosition
  boolean, // hasRolledSix
  bigint, // lastRollSlot
  number, // lastRollValue
  number, // prasadMeter
];

interface AnimatedPosition {
  currentStep: number;
  path: number[];
  isAnimating: boolean;
  visualPosition: number;
  justAnimated?: boolean;
}

const PlayerCorner: React.FC<{
  player: Player & { hasRolledInCurrentRound?: boolean };
  isCurrent: boolean;
  isSelf: boolean;
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  diceValue: number;
  handleDiceRollComplete: (rolledValue: number) => void;
  isRolling: boolean;
  waitingForTransaction: boolean;
}> = ({
  player,
  isCurrent,
  isSelf,
  corner,
  diceValue,
  handleDiceRollComplete,
  isRolling,
  waitingForTransaction,
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
      {isCurrent && (
        <Dice
          onRollComplete={handleDiceRollComplete}
          isParentRolling={isRolling}
          setParentIsRolling={() => {}}
          initialValue={diceValue}
          disabled={!isSelf || isRolling}
          waitingForResult={waitingForTransaction}
          spinning={isRolling}
          stopAt={diceValue}
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
      <div className="flex items-center space-x-3">{arrangement}</div>
      <span
        className={`font-['KGRedHands'] text-sm w-full truncate text-center ${
          isCurrent ? "text-yellow-400" : "text-white"
        }`}
      >
        {player.name}
      </span>
    </div>
  );
};

const calculateMovementPath = (
  startPos: number,
  endPos: number,
  diceRoll: number
): number[] => {
  const path: number[] = [];
  // Simple path for now, just the steps.
  for (let i = 1; i <= diceRoll; i++) {
    const nextPos = startPos + i;
    if (nextPos > 100) {
      path.push(100 - (nextPos - 100));
    } else {
      path.push(nextPos);
    }
    if (nextPos === 100) break;
  }

  const finalPos = path[path.length - 1];
  if (SNAKES_AND_LADDERS[finalPos] && SNAKES_AND_LADDERS[finalPos] === endPos) {
    path.push(endPos);
  } else if (finalPos !== endPos) {
    // This case happens if the contract logic differs slightly, just jump to the end
    if (path[path.length - 1] !== endPos) {
      path.push(endPos);
    }
  }

  return path;
};

const SnakesAndLaddersPage: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { address } = useAccount();
  const numericRoomId = Number(roomId ?? 0);

  const boardRef = useRef<HTMLDivElement>(null);
  const [boardRect, setBoardRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateBoardRect = () => {
      if (boardRef.current) {
        setBoardRect(boardRef.current.getBoundingClientRect());
      }
    };

    updateBoardRect();
    window.addEventListener("resize", updateBoardRect);
    return () => {
      window.removeEventListener("resize", updateBoardRect);
    };
  }, []);

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

  const boardScaleClass = requiredSlots === 2 ? "scale-[1.035]" : "";
  const bottomMarginClass =
    requiredSlots === 2 ? "mt-3 sm:mt-8" : "mt-2 sm:mt-4";

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
        enabled:
          Boolean(contractPlayers && (contractPlayers as string[])[i]),
        refetchInterval: 5000,
      },
    })
  );

  const { profiles } = useFarcasterProfiles(
    (contractPlayers as string[]) || []
  );

  const players: Player[] = Array.from({ length: requiredSlots }, (_, i) => {
    const addr = (contractPlayers as string[] | undefined)?.[i];
    const info = playerInfoQueries[i].data as UserInfo | undefined;
    return {
      id: addr ?? `slot-${i}`,
      name: addr
        ? (profiles[addr]?.username ?? truncateAddress(addr))
        : "Waiting",
      avatarUrl: addr
        ? (profiles[addr]?.pfp?.url ??
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${addr}`)
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=slot${i}`,
      position: info ? info[1] : 1,
      lastPosition: info ? info[0] : undefined,
      lastRoll: info ? info[4] : undefined,
      hasRolledSix: info ? info[2] : undefined,
    };
  });

  const {
    currentStep: rollDiceStep,
    errorMessage: rollDiceError,
    handleRollDice,
    resetState: resetRollDiceState,
  } = useRollDice();

  const [diceValue, setDiceValue] = useState<number>(1);

  const winnerAddress =
    roomInfo &&
    (roomInfo as RoomInfoType)[6] !==
      "0x0000000000000000000000000000000000000000"
      ? ((roomInfo as RoomInfoType)[6] as string)
      : null;

  const winner = players.find((p) => p.id === winnerAddress) || null;

  const snakedCells = generateSnakedCells();

  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, AnimatedPosition>
  >({});

  const animatePlayerAlongPath = (playerId: string, path: number[]) => {
    setAnimatedPositions((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        path,
        isAnimating: true,
        currentStep: 0,
        visualPosition: path[0],
        justAnimated: false,
      },
    }));

    path.forEach((_, index) => {
      if (index === 0) return;
      setTimeout(() => {
        setAnimatedPositions((prev) => {
          const anim = prev[playerId];
          if (!anim || !anim.isAnimating) return prev;

          const isLastStep = index === path.length - 1;

          return {
            ...prev,
            [playerId]: {
              ...anim,
              visualPosition: path[index],
              currentStep: index,
              isAnimating: !isLastStep,
              justAnimated: isLastStep,
            },
          };
        });
      }, index * 400); // 400ms per step
    });
  };

  useEffect(() => {
    players.forEach((player) => {
      if (
        player.id.startsWith("slot-") ||
        player.lastPosition === undefined ||
        player.position === player.lastPosition
      ) {
        return;
      }

      const animationState = animatedPositions[player.id];
      if (!animationState || !animationState.isAnimating) {
        const path = calculateMovementPath(
          player.lastPosition,
          player.position,
          player.lastRoll ?? 0
        );
        if (path.length > 0) {
          animatePlayerAlongPath(player.id, [player.lastPosition, ...path]);
        }
      }
    });
  }, [players]);

  const handleDiceRollComplete = async (rolledValue: number) => {
    if (winner || rollDiceStep !== "idle") return;

    setDiceValue(rolledValue); // Set visual dice value immediately
    await handleRollDice(numericRoomId);
  };

  useEffect(() => {
    if (rollDiceStep === "completed") {
      // Refetch player data to get the new position after a successful roll
      playerInfoQueries.forEach((q) => q.refetch());
      // Reset the hook's state for the next roll
      resetRollDiceState();
    }
  }, [rollDiceStep, playerInfoQueries, resetRollDiceState]);

  const gameStartTimeRaw = roomInfo
    ? ((roomInfo as RoomInfoType)[5] as bigint)
    : BigInt(0);
  const gameStartTime = Number(gameStartTimeRaw);

  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!gameStartTime) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - gameStartTime;
      const elapsedMinutes = Math.floor(elapsed / 60);
      const currentSlot = Math.floor(elapsedMinutes / 60);
      const nextSlotTime =
        gameStartTime + (currentSlot + 1) * 60 * 60;
      const remaining = nextSlotTime - now;

      const mins = Math.max(0, Math.floor(remaining / 60));
      const secs = Math.max(0, remaining % 60);

      setRemainingMinutes(mins);
      setRemainingSeconds(secs);
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [gameStartTime]);

  const currentSlot =
    gameStartTime > 0
      ? Math.floor(
          (Math.floor(Date.now() / 1000) - gameStartTime) /
            60
        )
      : 0;

  const enhancedPlayers = players.map((player, index) => {
    const info = playerInfoQueries[index]?.data as UserInfo | undefined;

    const lastRollSlot = info ? Number(info[3]) : undefined;
    const hasRolledInCurrentRound = lastRollSlot === currentSlot;

    return {
      ...player,
      hasRolledInCurrentRound,
    };
  });

  const getPositionForCell = (cellNumber: number) => {
    if (!boardRect) return null;

    const visualIndex = snakedCells.indexOf(cellNumber);
    if (visualIndex === -1) return null;

    const row = Math.floor(visualIndex / 10);
    const col = visualIndex % 10;
    const cellWidth = boardRect.width / 10;
    const cellHeight = boardRect.height / 10;
    const left = col * cellWidth + cellWidth / 2;
    const top = row * cellHeight + cellHeight / 2;

    return { top, left };
  };

  const currentPlayerAddress =
    (roomInfoQuery.data as [unknown, unknown, unknown, unknown, unknown, unknown, `0x${string}`])?.[6] ?? "";

  const isMyTurn =
    !!address &&
    !!currentPlayerAddress &&
    currentPlayerAddress.toLowerCase() === address.toLowerCase();

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col bg-[#1a0f09]">
      <div className="flex items-center justify-between px-6 py-3 bg-[#1a0f09] z-20 flex-shrink-0">
        <button
          onClick={() => navigate("/explore")}
          className="text-[#ffd700] hover:text-[#ffed4a] transition-colors duration-300 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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
        </button>
        <div className="w-16 h-6" />
      </div>

      <div className="flex-grow flex flex-col justify-between p-2 sm:p-4 relative">
        <div className="relative flex justify-between items-center mb-2 sm:mb-4">
          {/* Top-left player */}
          {(() => {
            const player =
              requiredSlots === 2 ? enhancedPlayers[0] : enhancedPlayers[2];
            if (!player) return <div className="w-32 h-[80px]" />;
            return (
              <PlayerCorner
                key={player.id}
                player={player}
                isCurrent={
                  player.id.toLowerCase() === currentPlayerAddress.toLowerCase()
                }
                isSelf={
                  player.id.toLowerCase() === (address ?? "").toLowerCase()
                }
                diceValue={diceValue}
                handleDiceRollComplete={handleDiceRollComplete}
                isRolling={rollDiceStep === "signing" || rollDiceStep === "relaying"}
                corner="top-left"
                waitingForTransaction={rollDiceStep === "relaying"}
              />
            );
          })()}

          {/* Top-right player */}
          {(() => {
            const player = requiredSlots > 2 ? enhancedPlayers[3] : null;
            if (!player) return <div className="w-32 h-[80px]" />;
            return (
              <PlayerCorner
                key={player.id}
                player={player}
                isCurrent={
                  player.id.toLowerCase() === currentPlayerAddress.toLowerCase()
                }
                isSelf={
                  player.id.toLowerCase() === (address ?? "").toLowerCase()
                }
                diceValue={diceValue}
                handleDiceRollComplete={handleDiceRollComplete}
                isRolling={rollDiceStep === "signing" || rollDiceStep === "relaying"}
                corner="top-right"
                waitingForTransaction={rollDiceStep === "relaying"}
              />
            );
          })()}

          {/* Timer display */}
          {gameStartTime > 0 && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg px-2 text-white text-center">
                <div className="text-xl font-bold">
                  {remainingMinutes}:{remainingSeconds.toString().padStart(2, "0")}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-grow flex items-center justify-center relative">
          {rollDiceError && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white p-2 rounded-lg shadow-lg z-50">
              <p>Error: {rollDiceError}</p>
              <button onClick={resetRollDiceState} className="text-xs underline">
                Dismiss
              </button>
            </div>
          )}
          <div
            ref={boardRef}
            className={`w-auto h-full aspect-square bg-[#1a0f09] border-2 border-[#8b4513] relative transform transition-transform duration-300 ${boardScaleClass}`}
          >
            <div className="grid grid-cols-10 gap-[1px] w-full h-full">
              {snakedCells.map((displayedNumber, index) => {
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
                  </div>
                );
              })}
            </div>

            {/* Player Tokens Layer */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              {enhancedPlayers.map((player) => {
                if (player.id.startsWith("slot-")) return null;

                const animState = animatedPositions[player.id];
                const visualPosition = animState
                  ? animState.visualPosition
                  : player.position;

                const cellPos = getPositionForCell(visualPosition);
                if (!cellPos) return null;

                const playersInSameCell = enhancedPlayers.filter((p) => {
                  if (p.id.startsWith("slot-")) return false;
                  const pAnimState = animatedPositions[p.id];
                  const pVisualPosition = pAnimState
                    ? pAnimState.visualPosition
                    : p.position;
                  return pVisualPosition === visualPosition;
                });

                let transform = "translate(-50%, -50%)";
                let zIndex = 10;

                if (playersInSameCell.length > 1 && boardRect) {
                  const offsetIndex = playersInSameCell.findIndex(
                    (p) => p.id === player.id
                  );

                  if (offsetIndex !== -1) {
                    const cellWidth = boardRect.width / 10;
                    const numPlayersInCell = playersInSameCell.length;

                    const radius = cellWidth * 0.23; 
                    const angle =
                      (2 * Math.PI * offsetIndex) / numPlayersInCell;

                    const xOffset = radius * Math.cos(angle);
                    const yOffset = radius * Math.sin(angle);

                    transform = `translate(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px))`;
                    zIndex = 10 + offsetIndex;
                  }
                }

                return (
                  <img
                    key={player.id}
                    src={player.avatarUrl}
                    alt={player.name}
                    title={`${player.name} (Pos: ${player.position})`}
                    className="w-[5%] h-[5%] rounded-full border-2 border-[#8b4513] object-cover bg-gray-700 shadow-lg"
                    style={{
                      position: "absolute",
                      top: `${cellPos.top}px`,
                      left: `${cellPos.left}px`,
                      transform: transform,
                      transition:
                        "top 0.35s ease-in-out, left 0.35s ease-in-out, transform 0.35s ease-in-out",
                      zIndex: zIndex,
                    }}
                  />
                );
              })}
            </div>

            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
              viewBox="0 0 10 10"
              preserveAspectRatio="none"
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

        <div
          className={`relative flex justify-between items-center ${bottomMarginClass}`}
        >
          {/* Bottom-left player */}
          {(() => {
            const player = enhancedPlayers[0];
            if (!player) return <div className="w-32 h-[80px]" />;
            return (
              <PlayerCorner
                key={player.id}
                player={player}
                isCurrent={
                  player.id.toLowerCase() === currentPlayerAddress.toLowerCase()
                }
                isSelf={
                  player.id.toLowerCase() === (address ?? "").toLowerCase()
                }
                diceValue={diceValue}
                handleDiceRollComplete={handleDiceRollComplete}
                isRolling={rollDiceStep === "signing" || rollDiceStep === "relaying"}
                corner="bottom-left"
                waitingForTransaction={rollDiceStep === "relaying"}
              />
            );
          })()}

          {/* Bottom-right player */}
          {(() => {
            const player = enhancedPlayers[1];
            if (!player) return <div className="w-32 h-[80px]" />;
            return (
              <PlayerCorner
                key={player.id}
                player={player}
                isCurrent={
                  player.id.toLowerCase() === currentPlayerAddress.toLowerCase()
                }
                isSelf={
                  player.id.toLowerCase() === (address ?? "").toLowerCase()
                }
                diceValue={diceValue}
                handleDiceRollComplete={handleDiceRollComplete}
                isRolling={rollDiceStep === "signing" || rollDiceStep === "relaying"}
                corner="bottom-right"
                waitingForTransaction={rollDiceStep === "relaying"}
              />
            );
          })()}
        </div>
      </div>

      {winner && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-30">
          <h2 className="text-4xl font-bold text-yellow-400 mb-4">
            Winner!
          </h2>
          <img
            src={winner.avatarUrl}
            alt={winner.name}
            className="w-32 h-32 rounded-full border-4 border-yellow-400 mb-4"
          />
          <p className="text-2xl text-white">{winner.name}</p>
          <button
            onClick={() => navigate("/explore")}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg mt-6"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default SnakesAndLaddersPage;