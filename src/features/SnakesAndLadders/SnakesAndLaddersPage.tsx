import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useReadContract,
  useWriteContract,
  useAccount,
  usePublicClient,
} from "wagmi";
import { decodeEventLog } from "viem";
import Dice from "../../components/Dice/Dice";
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

// Add this type for tracking animated positions
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
  setIsRolling: (isRolling: boolean) => void;
  winner: Player | null;
  waitingForTransaction: boolean;
}> = ({
  player,
  isCurrent,
  isSelf,
  corner,
  diceValue,
  handleDiceRollComplete,
  isRolling,
  setIsRolling,
  waitingForTransaction,
}) => {
  const avatar = (
    <img
      src={player.avatarUrl}
      alt={player.name}
      className={`w-12 h-12 rounded-full border-4 ${isCurrent ? "border-yellow-400" : "border-[#8b4513]"} object-cover bg-gray-700 shadow-lg`}
    />
  );

  useEffect(() => {
    console.log(`Last roll for ${player.name}:`, player.lastPosition);
    console.log(`Current position for ${player.name}:`, player.position);
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
          waitingForResult={waitingForTransaction}
          spinning={isRolling || waitingForTransaction}
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

// Add a Timer component
const RoundTimer: React.FC<{ minutes: number; seconds: number }> = ({
  minutes,
  seconds,
}) => {
  return (
    <div className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg px-2 text-white text-center">
      <div className="text-xl font-bold">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
};

const SLOT_DURATION_MINUTES = 1;
const SLOT_DURATION_SECONDS = SLOT_DURATION_MINUTES * 60;

// Add path calculation utilities
const calculateMovementPath = (startPos: number, diceRoll: number): number[] => {
  const path: number[] = [];
  let currentPos = startPos;
  
  // Calculate each step position following the grid pattern
  for (let i = 1; i <= diceRoll; i++) {
    const nextPos = startPos + i;
    
    // Handle bounce back at 100
    if (nextPos > 100) {
      path.push(100 - (nextPos - 100));
    } else {
      path.push(nextPos);
    }
    
    // Stop if we hit 100
    if (nextPos === 100) break;
  }
  
  // Add snake/ladder destination if applicable
  const finalPos = path[path.length - 1];
  if (SNAKES_AND_LADDERS[finalPos]) {
    path.push(SNAKES_AND_LADDERS[finalPos]);
  }
  
  return path;
};

const SnakesAndLaddersPage: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
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

  // Gate player info polling with freezeQuery so that positions stay static during the 3-second freeze
  const [freezeQuery, setFreezeQuery] = useState<boolean>(false);

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
          Boolean(contractPlayers && (contractPlayers as string[])[i]) &&
          !freezeQuery,
        // Stop polling while freezed
        refetchInterval: freezeQuery ? false : 5000,
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
        ? profiles[addr]?.username ?? truncateAddress(addr)
        : "Waiting",
      avatarUrl: addr
        ? profiles[addr]?.pfp?.url ??
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${addr}`
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=slot${i}`,
      position: info ? info[1] : 1,
      lastPosition: info ? info[0] : undefined,
      lastRoll: info ? info[4] : undefined,
      hasRolledSix: info ? info[2] : undefined,
    };
  });

  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [waitingForTransaction, setWaitingForTransaction] =
    useState<boolean>(false);
  const [lastTxTimestamp, setLastTxTimestamp] = useState<number>(0);
  // freezeQuery declaration moved above to avoid hoisting error
  const [prevServerRoll, setPrevServerRoll] = useState<number>(0);

  const winnerAddress =
    roomInfo &&
    (roomInfo as RoomInfoType)[6] !==
      "0x0000000000000000000000000000000000000000"
      ? ((roomInfo as RoomInfoType)[6] as string)
      : null;

  const winner = players.find((p) => p.id === winnerAddress) || null;

  const snakedCells = generateSnakedCells();

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Add state for animated positions
  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, AnimatedPosition>
  >({});

  useEffect(() => {
    if (freezeQuery) return;

    setAnimatedPositions((prevPositions) => {
      const newPositions = JSON.parse(JSON.stringify(prevPositions));
      let changed = false;

      players.forEach((player) => {
        if (player.id.startsWith("slot-")) return;
        const animationState = newPositions[player.id];
        const contractPosition = player.position;

        if (!animationState) {
          // Player is new, initialize their animation state.
          newPositions[player.id] = {
            visualPosition: contractPosition,
            isAnimating: false,
            path: [],
            currentStep: 0,
          };
          changed = true;
        } else {
          // Player exists, decide whether to sync.
          if (animationState.isAnimating) {
            // Is animating, do nothing. The animation logic is in control.
            return;
          }

          if (animationState.justAnimated) {
            // Just finished an animation. The visual position is the source of truth for now.
            // Check if the contract data has caught up.
            if (animationState.visualPosition === contractPosition) {
              // It has! We can turn off the flag and let normal syncing resume.
              animationState.justAnimated = false;
              changed = true;
            }
            // If it hasn't caught up, do nothing. Wait for the next `players` update.
            return;
          }

          // Not animating and didn't just animate. Sync if positions diverge.
          if (animationState.visualPosition !== contractPosition) {
            animationState.visualPosition = contractPosition;
            changed = true;
          }
        }
      });

      if (changed) {
        return newPositions;
      }
      return prevPositions;
    });
  }, [players, freezeQuery]);

  // Previous polling effect kept as fallback but disabled when we already resolved via receipt
  useEffect(() => {
    if (!waitingForTransaction) return;

    // Find the current player's index in the players array
    const currentPlayerIndex = players.findIndex(
      (p) => p.id.toLowerCase() === address?.toLowerCase()
    );

    if (currentPlayerIndex === -1) return;

    // Get the player's info from the query result
    const playerInfo = playerInfoQueries[currentPlayerIndex].data as
      | UserInfo
      | undefined;

    if (playerInfo) {
      const serverRoll = Number(playerInfo[4]);
      // only trigger when on-chain roll has advanced
      if (serverRoll > prevServerRoll) {
        console.log(`Roll detected from server: ${serverRoll}`);
        // Wait 3 s to keep the dice spinning, then stop at the final face
        setTimeout(() => {
          setDiceValue(serverRoll);
          setIsRolling(false);
          setWaitingForTransaction(false);

          // freeze UI for 3 seconds after the dice settles
          setFreezeQuery(true);
          setTimeout(() => setFreezeQuery(false), 3000);
        }, 3000);
      }
    }
  }, [
    playerInfoQueries,
    address,
    waitingForTransaction,
    players,
    lastTxTimestamp,
    prevServerRoll,
  ]);

  const { data: currentPlayerAddressRaw } = useReadContract({
    address: snakeGameContractInfo.address as `0x${string}`,
    abi: snakeGameContractInfo.abi,
    functionName: "getCurrentPlayer",
    args: [BigInt(numericRoomId)],
    query: {
      enabled: numericRoomId > 0 && !freezeQuery,
      refetchInterval: 5000,
    },
  });
  const currentPlayerAddress =
    (currentPlayerAddressRaw as `0x${string}` | undefined) ?? "";

  const currentPlayer =
    players.find((p) => p.id === currentPlayerAddress) || null;
  const isMyTurn =
    !!address &&
    !!currentPlayerAddress &&
    currentPlayerAddress.toLowerCase() === address.toLowerCase();

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

  // Update animatePlayerAlongPath for smoother control
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

  // Update handleDiceRollComplete to use new animation system
  const handleDiceRollComplete = async () => {
    if (!isConnected || !address) {
      setIsRolling(false);
      return;
    }

    try {
      const currentPlayerIndex = players.findIndex(
        (p) => p.id.toLowerCase() === address.toLowerCase()
      );
      const currentInfo = playerInfoQueries[currentPlayerIndex]?.data as UserInfo | undefined;
      setPrevServerRoll(currentInfo ? Number(currentInfo[4]) : 0);

      setWaitingForTransaction(true);
      setLastTxTimestamp(Date.now());
      setFreezeQuery(true);

      const functionToCall = currentPlayer?.hasRolledSix && isMyTurn ? "extraRoll" : "rollDice";

      const txHash = await writeContractAsync({
        address: snakeGameContractInfo.address as `0x${string}`,
        abi: snakeGameContractInfo.abi,
        functionName: functionToCall,
        args: [BigInt(numericRoomId)],
        gas: 200000n,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      let finalRollValue: number = 0;
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() !== snakeGameContractInfo.address.toLowerCase()) continue;
          const ev = decodeEventLog({
            abi: snakeGameContractInfo.abi,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "DiceRolled") {
            const rollField = (ev.args as any).roll ?? (ev.args as any).value;
            finalRollValue = Number(rollField);
            break;
          }
        } catch {}
      }

      // Show dice face immediately
      setDiceValue(finalRollValue);
      
      // Stop dice spinning
      setTimeout(() => {
        setIsRolling(false);
        setWaitingForTransaction(false);
      }, 50);

      // Get current position and calculate path
      const startPosition = currentInfo ? currentInfo[1] : 1;
      const path = calculateMovementPath(startPosition, finalRollValue);

      // Path needs a starting point for the animation to look right
      const displayPath = [startPosition, ...path];

      // Wait 2 seconds after dice face shows before starting movement
      setTimeout(() => {
        // Start animation with new system
        if (address) {
          animatePlayerAlongPath(address, displayPath);
        }
      }, 2000);

      // Keep frozen until animation completes (now including the 2s delay)
      const animationDuration = 2000 + displayPath.length * 400 + 500; // 2s delay + animation time + buffer
      setTimeout(() => setFreezeQuery(false), animationDuration);
    } catch (error) {
      console.error("Roll dice error", error);
      setIsRolling(false);
      setWaitingForTransaction(false);
      setFreezeQuery(false);
    }
  };

  const resetGame = () => {
    navigate("/explore");
  };

  const gameStartTimeRaw = roomInfo
    ? ((roomInfo as RoomInfoType)[5] as bigint)
    : BigInt(0);
  const gameStartTime = Number(gameStartTimeRaw);

  // Add state for timer countdown
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Add effect to update the countdown timer every second
  useEffect(() => {
    if (!gameStartTime) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - gameStartTime;
      const elapsedMinutes = Math.floor(elapsed / 60);
      const currentSlot = Math.floor(elapsedMinutes / SLOT_DURATION_MINUTES);
      const nextSlotTime =
        gameStartTime + (currentSlot + 1) * SLOT_DURATION_SECONDS;
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

  // Calculate the current slot (round)
  const currentSlot =
    gameStartTime > 0
      ? Math.floor(
          (Math.floor(Date.now() / 1000) - gameStartTime) /
            SLOT_DURATION_SECONDS
        )
      : 0;

  // Use a different approach to access player info
  const enhancedPlayers = players.map((player, index) => {
    // Simply use the player's index to access the corresponding query info
    const info = playerInfoQueries[index]?.data as UserInfo | undefined;

    const lastRollSlot = info ? Number(info[3]) : undefined;
    const hasRolledInCurrentRound = lastRollSlot === currentSlot;

    return {
      ...player,
      hasRolledInCurrentRound,
    };
  });

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
                isRolling={isRolling}
                setIsRolling={setIsRolling}
                winner={winner}
                corner="top-left"
                waitingForTransaction={waitingForTransaction}
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
                isRolling={isRolling}
                setIsRolling={setIsRolling}
                winner={winner}
                corner="top-right"
                waitingForTransaction={waitingForTransaction}
              />
            );
          })()}

          {/* Timer display */}
          {gameStartTime > 0 && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
              <RoundTimer
                minutes={remainingMinutes}
                seconds={remainingSeconds}
              />
            </div>
          )}
        </div>

        <div className="flex-grow flex items-center justify-center">
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

                let transform = "translate(-90%, -100%)";
                let zIndex = 10;

                if (playersInSameCell.length > 1 && boardRect) {
                  const offsetIndex = playersInSameCell.findIndex(
                    (p) => p.id === player.id
                  );

                  if (offsetIndex !== -1) {
                    const cellWidth = boardRect.width / 10;
                    const numPlayersInCell = playersInSameCell.length;

                    // Arrange tokens in a circle to avoid overlap
                    const radius = cellWidth * 0.23; // Keep tokens within the cell
                    const angle =
                      (2 * Math.PI * offsetIndex) / numPlayersInCell 

                    const xOffset = radius * Math.cos(angle);
                    const yOffset = 0;

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
                    className="w-[5%] h-[5%] rounded-full border border-[#8b4513] object-cover bg-gray-700 shadow-lg"
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

        <div
          className={`relative ${bottomMarginClass} flex justify-between items-center`}
        >
          {(() => {
            const player = requiredSlots > 2 ? enhancedPlayers[0] : null;
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
                isRolling={isRolling}
                setIsRolling={setIsRolling}
                winner={winner}
                corner="bottom-left"
                waitingForTransaction={waitingForTransaction}
              />
            );
          })()}
          {(() => {
            const player =
              requiredSlots === 2 ? enhancedPlayers[1] : enhancedPlayers[1];
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
                isRolling={isRolling}
                setIsRolling={setIsRolling}
                winner={winner}
                corner="bottom-right"
                waitingForTransaction={waitingForTransaction}
              />
            );
          })()}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-full px-20 text-center">
            {!winner && (
              <>
                {currentPlayer ? (
                  isMyTurn ? (
                    currentPlayer.hasRolledSix ? (
                      <span className="text-green-400 text-base font-bold animate-pulse">
                        You get to roll again!
                      </span>
                    ) : (
                      <span className="text-green-400 text-base font-bold animate-pulse">
                        Your turn to roll!
                      </span>
                    )
                  ) : (
                    <span className="text-white text-sm">
                      {truncateAddress(currentPlayer.name)}'s turn..
                    </span>
                  )
                ) : (
                  <span className="text-white text-md">
                    Next roll in {remainingMinutes}m
                  </span>
                )}
              </>
            )}
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
