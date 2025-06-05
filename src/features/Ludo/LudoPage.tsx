import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Dice from "../../components/Dice/Dice";

interface Player {
  id: string;
  avatarUrl: string;
  position: number;
}

const PLAYER_SEEDS = ["player1", "player2", "player3", "playerA"];

const generatePlayers = (): Player[] => {
  const usedPositions = new Set<number>();
  return PLAYER_SEEDS.map((seed) => {
    let randomPosition;
    do {
      randomPosition = Math.floor(Math.random() * 100) + 1;
    } while (usedPositions.has(randomPosition));
    usedPositions.add(randomPosition);

    return {
      id: seed,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`,
      position: randomPosition,
    };
  });
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

const LudoPage: React.FC = () => {
  const navigate = useNavigate();
  const players = generatePlayers();
  const snakedCells = generateSnakedCells();

  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  const getPlayerInCell = (displayedCellNumber: number) => {
    return players.find((p) => p.position === displayedCellNumber);
  };

  const handleDiceRollComplete = (rolledValue: number) => {
    setDiceValue(rolledValue);
    setIsRolling(false);
    // console.log("Dice rolled:", rolledValue); // Retain this for now if useful for dev
    // TODO: Update player position based on rolledValue
  };

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col bg-[#0d0805]">
      <div className="flex items-center justify-between px-6 py-3 bg-[#1a0f09] border-b-2 border-[#8b4513] shadow-md z-10 flex-shrink-0">
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
        <div className="w-16"></div>
      </div>

      <div className="flex-grow relative flex items-center justify-center p-4">
        <div className="relative w-full aspect-square max-w-xl">
          <div className="absolute inset-0 bg-[#1a0f09] border-2 border-[#8b4513]">
            <div className="grid grid-cols-10 gap-[1px] w-full h-full">
              {snakedCells.map((displayedNumber, index) => {
                const playerInCell = getPlayerInCell(displayedNumber);
                return (
                  <div
                    key={`cell-${index}`}
                    className="aspect-square relative flex items-center justify-center"
                    style={{
                      backgroundColor: index % 2 === 0 ? "#2c1810" : "#3b2010",
                    }}
                  >
                    <span className="absolute top-1 left-1 p-0.5 text-gray-400/70 text-[10px] md:text-[12px]">
                      {displayedNumber}
                    </span>
                    {playerInCell && (
                      <div className="absolute inset-0 flex items-end justify-end p-0.5 md:p-1">
                        <img
                          src={playerInCell.avatarUrl}
                          alt={playerInCell.id}
                          title={`${playerInCell.id} (Pos: ${playerInCell.position})`}
                          className="w-2/3 h-2/3 md:w-3/4 md:h-3/4 rounded-full border border-[#8b4513] object-cover bg-gray-700"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-20">
          <Dice
            onRollComplete={handleDiceRollComplete}
            isParentRolling={isRolling}
            setParentIsRolling={setIsRolling}
            initialValue={diceValue}
          />
        </div>
      </div>
    </div>
  );
};

export default LudoPage;
