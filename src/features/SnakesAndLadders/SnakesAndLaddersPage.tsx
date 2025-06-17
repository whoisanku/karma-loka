import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReadContract, useWriteContract, useAccount, usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
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
  string,
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
  metadataUri: string,
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
  winner: _winner,
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

  // Add a status indicator to show if player has rolled this round
  const statusIndicator = (
    <div className="absolute -top-6 right-0">
      {player.hasRolledInCurrentRound ? (
        <div
          className="h-4 w-4 rounded-full bg-green-500"
          title="Rolled this round"
        />
      ) : (
        <div
          className="h-4 w-4 rounded-full bg-orange-500"
          title="Needs to roll"
        />
      )}
    </div>
  );

  return (
    <div className={`flex flex-col ${horizontalAlign} space-y-1 mx-2 relative`}>
      {statusIndicator}
      {player.lastRoll !== undefined &&
        player.lastRoll > 0 &&
        player.lastRoll <= 6 && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
            <div className="relative bg-gray-800 text-white text-sm w-40 px-4 py-2 rounded text-center">
              I rolled {player.lastRoll} and reached to {player.position}
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

// Add a Timer component
const RoundTimer: React.FC<{ minutes: number; seconds: number }> = ({
  minutes,
  seconds,
}) => {
  return (
    <div className="z-10 absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg px-4 py-2 text-white text-center">
      <div className="text-sm font-semibold mb-1">Next Round In</div>
      <div className="text-xl font-bold">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
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
    const info = playerInfoQueries[i].data as
      | readonly [
          number,      // lastPosition
          bigint,      // currentPosition
          bigint,      // lastRollSlot
          number,      // lastRollValue
          number       // prasadMeter
        ]
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
      lastRoll: info ? Number(info[3]) : undefined,
    };
  });

  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [waitingForTransaction, setWaitingForTransaction] =
    useState<boolean>(false);
  const [lastTxTimestamp, setLastTxTimestamp] = useState<number>(0);
  // freezeQuery declaration moved above to avoid hoisting error
  const [prevServerRoll, setPrevServerRoll] = useState<number>(0);

  const localStorageKey = `sl_display_positions_${numericRoomId}`;
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(localStorageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const animationRefs = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(localStorageKey, JSON.stringify(displayPositions));
    }
  }, [displayPositions, localStorageKey]);

  useEffect(() => {
    players.forEach((player) => {
      const currentDisplay = displayPositions[player.id] ?? player.position;
      if (currentDisplay === player.position) {
        if (displayPositions[player.id] === undefined) {
          setDisplayPositions((prev) => ({ ...prev, [player.id]: player.position }));
        }
        return;
      }

      if (animationRefs.current[player.id]) return;

      let next = currentDisplay;
      const step = currentDisplay < player.position ? 1 : -1;

      animationRefs.current[player.id] = setInterval(() => {
        next += step;
        setDisplayPositions((prev) => {
          const updated = { ...prev, [player.id]: next };
          return updated;
        });

        if (next === player.position) {
          clearInterval(animationRefs.current[player.id]);
          delete animationRefs.current[player.id];
        }
      }, 300);
    });
  }, [players, displayPositions]);

  useEffect(() => {
    return () => {
      Object.values(animationRefs.current).forEach(clearInterval);
    };
  }, []);

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
      | readonly [
          number,      // lastPosition
          bigint,      // currentPosition
          bigint,      // lastRollSlot
          number,      // lastRollValue
          number       // prasadMeter
        ]
      | undefined;

    if (playerInfo) {
      const serverRoll = Number(playerInfo[3]);
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
    query: { enabled: numericRoomId > 0 && !freezeQuery, refetchInterval: 5000 },
  });
  const currentPlayerAddress =
    (currentPlayerAddressRaw as `0x${string}` | undefined) ?? "";

  const currentPlayer =
    players.find((p) => p.id === currentPlayerAddress) || null;
  const isMyTurn =
    !!address &&
    !!currentPlayerAddress &&
    currentPlayerAddress.toLowerCase() === address.toLowerCase();

  const handleDiceRollComplete = async (visualRoll: number) => {
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
        | readonly [
            number,      // lastPosition
            bigint,      // currentPosition
            bigint,      // lastRollSlot
            number,      // lastRollValue
            number       // prasadMeter
          ]
        | undefined;
      setPrevServerRoll(currentInfo ? Number(currentInfo[3]) : 0);

      // Set waiting for transaction to true to keep the dice rolling
      setWaitingForTransaction(true);
      setLastTxTimestamp(Date.now());

      // UI freeze from tx submission until 3s after dice settles
      setFreezeQuery(true);

      // send tx and get hash
      const txHash = await writeContractAsync({
        address: snakeGameContractInfo.address as `0x${string}`,
        abi: snakeGameContractInfo.abi,
        functionName: "rollDice",
        args: [BigInt(numericRoomId)],
        gas: 200000n,
      });

      // wait for receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("logs", receipt.logs);

      // decode DiceRolled event to get value
      let finalRollValue: number = visualRoll; // start with the visual roll as fallback
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() !== (snakeGameContractInfo.address as `0x${string}`).toLowerCase()) continue;
          const ev = decodeEventLog({ abi: snakeGameContractInfo.abi, data: log.data, topics: log.topics });
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
  const elapsedSecs = Math.floor(Date.now() / 1000) - gameStartTime;
  const elapsedMins = Math.floor(elapsedSecs / 60);
  const remainderMins = elapsedMins % 5;
  const waitTime = (5 - remainderMins) % 5;

  // Add state for seconds countdown
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Add effect to update the countdown timer every second
  useEffect(() => {
    if (!gameStartTime) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - gameStartTime;
      const elapsedMinutes = Math.floor(elapsed / 60);
      const currentSlot = Math.floor(elapsedMinutes / 5);
      const nextSlotTime = gameStartTime + (currentSlot + 1) * 5 * 60;
      const remaining = nextSlotTime - now;

      const secs = remaining % 60;

      setRemainingSeconds(secs);
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [gameStartTime]);

  // Calculate the current slot (round)
  const currentSlot =
    gameStartTime > 0
      ? Math.floor((Math.floor(Date.now() / 1000) - gameStartTime) / 300) // 5 minutes = 300 seconds
      : 0;

  // Use a different approach to access player info
  const enhancedPlayers = players.map((player, index) => {
    // Simply use the player's index to access the corresponding query info
    const info = playerInfoQueries[index]?.data as
      | readonly [
          number,      // lastPosition
          bigint,      // currentPosition
          bigint,      // lastRollSlot
          number,      // lastRollValue
          number       // prasadMeter
        ]
      | undefined;

    const lastRollSlot = info ? Number(info[2]) : undefined;
    const hasRolledInCurrentRound = lastRollSlot === currentSlot;

    return {
      ...player,
      hasRolledInCurrentRound,
    };
  });

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
        {/* Timer display */}
        {gameStartTime > 0 && (
          <RoundTimer minutes={waitTime} seconds={remainingSeconds} />
        )}

        <div className="flex justify-between items-start mb-2 sm:mb-4">
          {enhancedPlayers.slice(2).map((player, idx) => (
            <PlayerCorner
              key={player.id}
              player={player}
              isCurrent={
                player.id.toLowerCase() === currentPlayerAddress.toLowerCase()
              }
              isSelf={player.id.toLowerCase() === (address ?? "").toLowerCase()}
              diceValue={diceValue}
              handleDiceRollComplete={handleDiceRollComplete}
              isRolling={isRolling}
              setIsRolling={setIsRolling}
              winner={winner}
              corner={idx === 0 ? "top-left" : "top-right"}
              waitingForTransaction={waitingForTransaction}
            />
          ))}
        </div>

        <div className="flex-grow flex items-center justify-center">
          <div className="w-auto h-full aspect-square bg-[#1a0f09] border-2 border-[#8b4513] relative">
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

        <div className="relative mt-2 sm:mt-4 flex justify-between items-center">
          {enhancedPlayers[0] && (
            <PlayerCorner
              player={enhancedPlayers[0]}
              isCurrent={
                enhancedPlayers[0].id.toLowerCase() ===
                currentPlayerAddress.toLowerCase()
              }
              isSelf={
                enhancedPlayers[0].id.toLowerCase() ===
                (address ?? "").toLowerCase()
              }
              diceValue={diceValue}
              handleDiceRollComplete={handleDiceRollComplete}
              isRolling={isRolling}
              setIsRolling={setIsRolling}
              winner={winner}
              corner="bottom-left"
              waitingForTransaction={waitingForTransaction}
            />
          )}
          {enhancedPlayers[1] && (
            <PlayerCorner
              player={enhancedPlayers[1]}
              isCurrent={
                enhancedPlayers[1].id.toLowerCase() ===
                currentPlayerAddress.toLowerCase()
              }
              isSelf={
                enhancedPlayers[1].id.toLowerCase() ===
                (address ?? "").toLowerCase()
              }
              diceValue={diceValue}
              handleDiceRollComplete={handleDiceRollComplete}
              isRolling={isRolling}
              setIsRolling={setIsRolling}
              winner={winner}
              corner="bottom-right"
              waitingForTransaction={waitingForTransaction}
            />
          )}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            {!winner && (
              <>
                {currentPlayer ? (
                  isMyTurn ? (
                    <span className="text-green-400 text-lg font-bold animate-pulse">
                      Your turn to roll!
                    </span>
                  ) : (
                    <span className="text-white text-md">
                      Waiting for {currentPlayer.name} to roll...
                    </span>
                  )
                ) : (
                  <span className="text-white text-md">
                    Next roll in {waitTime} m
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
