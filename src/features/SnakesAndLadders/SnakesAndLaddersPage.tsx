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

  const [displayPositions, setDisplayPositions] =
    useState<Record<string, number>>({});
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});
  const prevPositionsRef = useRef<Record<string, number>>({});

  const playersPositionsKey = players
    .map((p) => `${p.id}-${p.position}`)
    .join("|");

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

  // Initialize display and previous positions when players data loads
  useEffect(() => {
    setDisplayPositions((prev) => {
      const updated = { ...prev };
      players.forEach((p) => {
        if (updated[p.id] === undefined) {
          updated[p.id] = p.position;
        }
        if (prevPositionsRef.current[p.id] === undefined) {
          prevPositionsRef.current[p.id] = p.position;
        }
      });
      return updated;
    });
  }, [players]);

  // Animate piece movement only after new dice rolls
  useEffect(() => {
    players.forEach((player) => {
      const prev = prevPositionsRef.current[player.id];
      if (prev === undefined) {
        prevPositionsRef.current[player.id] = player.position;
        setDisplayPositions((d) => ({ ...d, [player.id]: player.position }));
        return;
      }

      if (player.position === prev) return;

      if (timeoutsRef.current[player.id]) {
        timeoutsRef.current[player.id].forEach(clearTimeout);
      }

      const roll = player.lastRoll ?? Math.abs(player.position - prev);

      // compute intermediate position after dice roll with bounce logic
      let potential = prev + roll;
      if (potential > 100) {
        potential = 100 - (potential - 100);
      }

      const path: number[] = [];
      const step1 = potential > prev ? 1 : -1;
      for (let p = prev + step1; step1 > 0 ? p <= potential : p >= potential; p += step1) {
        path.push(p);
      }

      let afterSnake = SNAKES_AND_LADDERS[potential] ?? potential;
      if (afterSnake !== potential) {
        const step2 = afterSnake > potential ? 1 : -1;
        for (
          let p = potential + step2;
          step2 > 0 ? p <= afterSnake : p >= afterSnake;
          p += step2
        ) {
          path.push(p);
        }
      }

      if (afterSnake !== player.position) {
        const step3 = player.position > afterSnake ? 1 : -1;
        for (
          let p = afterSnake + step3;
          step3 > 0 ? p <= player.position : p >= player.position;
          p += step3
        ) {
          path.push(p);
        }
      }

      timeoutsRef.current[player.id] = [];
      path.forEach((pos, idx) => {
        const timeout = setTimeout(() => {
          setDisplayPositions((d) => ({ ...d, [player.id]: pos }));
        }, (idx + 1) * 300);
        timeoutsRef.current[player.id].push(timeout);
      });

      prevPositionsRef.current[player.id] = player.position;
    });

    return () => {
      Object.values(timeoutsRef.current).forEach((tos) => tos.forEach(clearTimeout));
      timeoutsRef.current = {};
    };
  }, [playersPositionsKey]);

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

  const handleDiceRollComplete = async () => {
    // We'll keep the visual dice roll, but also start the contract interaction
    if (!isConnected || !address) {
      setIsRolling(false);
      return;
    }

    try {
      // capture previous on-chain roll before sending tx
      const currentPlayerIndex = players.findIndex(
        (p) => p.id.toLowerCase() === address.toLowerCase()
      );
      const currentInfo = playerInfoQueries[currentPlayerIndex]?.data as
        | UserInfo
        | undefined;
      setPrevServerRoll(currentInfo ? Number(currentInfo[4]) : 0);

      // Set waiting for transaction to true to keep the dice rolling
      setWaitingForTransaction(true);
      setLastTxTimestamp(Date.now());

      // UI freeze from tx submission until 3s after dice settles
      setFreezeQuery(true);

      const functionToCall =
        currentPlayer?.hasRolledSix && isMyTurn ? "extraRoll" : "rollDice";

      // send tx and get hash
      const txHash = await writeContractAsync({
        address: snakeGameContractInfo.address as `0x${string}`,
        abi: snakeGameContractInfo.abi,
        functionName: functionToCall,
        args: [BigInt(numericRoomId)],
        gas: 200000n,
      });

      // wait for receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      console.log("logs", receipt.logs);

      // decode DiceRolled event to get value
      let finalRollValue: number = 0; // start with 0, will be updated
      for (const log of receipt.logs) {
        try {
          if (
            log.address.toLowerCase() !==
            (snakeGameContractInfo.address as `0x${string}`).toLowerCase()
          )
            continue;
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
      console.log("finalRollValue", finalRollValue);

      // immediately show face with ensured value
      setDiceValue(finalRollValue);
      // stop spinning shortly after committing value so Dice receives both props in order
      setTimeout(() => {
        setIsRolling(false);
        setWaitingForTransaction(false);
      }, 50);

      // keep board frozen for extra 3s after dice settles
      setTimeout(() => setFreezeQuery(false), 3000);
    } catch (error) {
      console.error("Roll dice error", error);
      setIsRolling(false);
      setWaitingForTransaction(false);
    }
  };

  const getPlayersInCell = (displayedCellNumber: number) => {
    return players.filter(
      (p) => (displayPositions[p.id] ?? p.position) === displayedCellNumber,
    );
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
            className={`w-auto h-full aspect-square bg-[#1a0f09] border-2 border-[#8b4513] relative transform transition-transform duration-300 ${boardScaleClass}`}
          >
            <div className="grid grid-cols-10 gap-[1px] w-full h-full">
              {snakedCells.map((displayedNumber, index) => {
                const playersInCell = getPlayersInCell(displayedNumber);

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
                          title={`${player.name} (Pos: ${
                            displayPositions[player.id] ?? player.position
                          })`}
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
