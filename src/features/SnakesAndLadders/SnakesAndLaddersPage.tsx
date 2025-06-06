import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Dice from "../../components/Dice/Dice";

interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  position: number;
  lastRoll?: number;
}

const SNAKES_AND_LADDERS = {
  // Snakes
  99: 21,
  95: 75,
  92: 88,
  89: 68,
  74: 53,
  62: 19,
  64: 60,
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

const initialPlayers: Player[] = [
  {
    id: "player1",
    name: "Player 1",
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Leo`,
    position: 1,
  },
  {
    id: "player2",
    name: "Player 2",
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi`,
    position: 1,
  },
  {
    id: "player3",
    name: "Player 3",
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Annie`,
    position: 1,
  },
  {
    id: "player4",
    name: "Player 4",
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka`,
    position: 1,
  },
];

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
  diceValue: number;
  handleDiceRollComplete: (value: number) => void;
  isRolling: boolean;
  setIsRolling: (isRolling: boolean) => void;
  winner: Player | null;
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}> = ({
  player,
  isCurrent,
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
      {isCurrent && !winner ? (
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
    <div className={`flex flex-col ${horizontalAlign} space-y-1 mx-3`}>
      <div className="flex items-center space-x-3">{arrangement}</div>
      <span
        className={`font-['MorrisRoman'] text-sm ${isCurrent ? "text-yellow-400" : "text-white"}`}
      >
        {player.name}
      </span>
    </div>
  );
};

const SnakesAndLaddersPage: React.FC = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);

  const snakedCells = generateSnakedCells();

  const handleDiceRollComplete = (rolledValue: number) => {
    setDiceValue(rolledValue);

    if (winner) {
      setIsRolling(false);
      return;
    }

    setPlayers((prevPlayers) => {
      const newPlayers = [...prevPlayers];
      const currentPlayer = newPlayers[currentPlayerIndex];
      const newPosition = currentPlayer.position + rolledValue;

      currentPlayer.lastRoll = rolledValue;

      if (newPosition <= 100) {
        const finalPosition =
          SNAKES_AND_LADDERS[newPosition as keyof typeof SNAKES_AND_LADDERS] ||
          newPosition;
        currentPlayer.position = finalPosition;

        if (finalPosition === 100) {
          setWinner(currentPlayer);
        }
      }

      return newPlayers;
    });

    setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % players.length);
    setIsRolling(false);
  };

  const getPlayersInCell = (displayedCellNumber: number) => {
    return players.filter((p) => p.position === displayedCellNumber);
  };

  const resetGame = () => {
    setPlayers(initialPlayers);
    setCurrentPlayerIndex(0);
    setDiceValue(1);
    setWinner(null);
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
          <PlayerCorner
            player={players[3]}
            isCurrent={currentPlayerIndex === 3}
            {...{
              diceValue,
              handleDiceRollComplete,
              isRolling,
              setIsRolling,
              winner,
            }}
            corner="top-left"
          />
          <PlayerCorner
            player={players[2]}
            isCurrent={currentPlayerIndex === 2}
            {...{
              diceValue,
              handleDiceRollComplete,
              isRolling,
              setIsRolling,
              winner,
            }}
            corner="top-right"
          />
        </div>

        {/* Game Board */}
        <div className="flex-grow flex items-center justify-center">
          <div className="w-auto h-full aspect-square bg-[#1a0f09] border-2 border-[#8b4513] relative">
            <div className="grid grid-cols-10 gap-[1px] w-full h-full">
              {snakedCells.map((displayedNumber, index) => {
                const playersInCell = getPlayersInCell(displayedNumber);
                const isSnakeStart =
                  Object.keys(SNAKES_AND_LADDERS)
                    .map(Number)
                    .includes(displayedNumber) &&
                  SNAKES_AND_LADDERS[
                    displayedNumber as keyof typeof SNAKES_AND_LADDERS
                  ] < displayedNumber;
                const isLadderStart =
                  Object.keys(SNAKES_AND_LADDERS)
                    .map(Number)
                    .includes(displayedNumber) &&
                  SNAKES_AND_LADDERS[
                    displayedNumber as keyof typeof SNAKES_AND_LADDERS
                  ] > displayedNumber;

                let cellBgColor = index % 2 === 0 ? "#2c1810" : "#3b2010";
                if (isSnakeStart) cellBgColor = "#8B0000"; // Dark Red
                if (isLadderStart) cellBgColor = "#006400"; // Dark Green

                return (
                  <div
                    key={`cell-${index}`}
                    className="aspect-square relative flex items-center justify-center"
                    style={{ backgroundColor: cellBgColor }}
                  >
                    <span className="absolute top-0 left-1 p-0.5 text-gray-300 text-[7px] sm:text-[9px]">
                      {displayedNumber}
                    </span>
                    <div className="absolute inset-0 flex flex-wrap items-center justify-center p-0.5">
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
          </div>
        </div>

        {/* Bottom Players */}
        <div className="flex justify-between items-end mt-2 sm:mt-4">
          <PlayerCorner
            player={players[0]}
            isCurrent={currentPlayerIndex === 0}
            {...{
              diceValue,
              handleDiceRollComplete,
              isRolling,
              setIsRolling,
              winner,
            }}
            corner="bottom-left"
          />
          <PlayerCorner
            player={players[1]}
            isCurrent={currentPlayerIndex === 1}
            {...{
              diceValue,
              handleDiceRollComplete,
              isRolling,
              setIsRolling,
              winner,
            }}
            corner="bottom-right"
          />
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
