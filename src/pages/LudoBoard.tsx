import React from "react";
import { useNavigate } from "react-router-dom";

interface Player {
  id: string;
  avatarUrl: string;
  position: number; // Cell number from 1 to 100, matches displayed number
}

const PLAYER_SEEDS = ["player1", "player2", "player3", "playerA"]; // From Explore.tsx

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
      position: randomPosition, // This position will match the displayed number
    };
  });
};

// Generates cell numbers: 1 at bottom-left, 100 at top-left, snaking
const generateSnakedCells = (): number[] => {
  const rows = 10;
  const cols = 10;
  const cells: number[] = new Array(rows * cols).fill(0);

  for (let visualRow = 0; visualRow < rows; visualRow++) {
    // visualRow 0 is bottom
    for (let col = 0; col < cols; col++) {
      const cellValue = visualRow * cols + col + 1;
      let displayCol = col;
      if (visualRow % 2 !== 0) {
        // Odd visual rows (0-indexed from bottom) go right-to-left
        displayCol = cols - 1 - col;
      }
      // Calculate actual grid index (0-99, top-to-bottom, left-to-right)
      const actualGridRow = rows - 1 - visualRow;
      const indexInGrid = actualGridRow * cols + displayCol;
      cells[indexInGrid] = cellValue;
    }
  }
  return cells;
};

const LudoBoard: React.FC = () => {
  const navigate = useNavigate();
  const players = generatePlayers();
  const snakedCells = generateSnakedCells();

  const getPlayerInCell = (displayedCellNumber: number) => {
    return players.find((p) => p.position === displayedCellNumber);
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#1a0f09] border-b-2 border-[#8b4513]">
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

      {/* Board container */}
      <div className="absolute inset-0 top-[3.25rem] flex items-center justify-center p-2">
        <div className="relative w-full aspect-square">
          <div className="absolute inset-0 bg-[#1a0f09] border border-[#8b4513]">
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
                    <span className="absolute top-1 left-1 p-0.5 text-gray-400/70 text-[12px]">
                      {displayedNumber}
                    </span>
                    {playerInCell && (
                      <div className="absolute inset-0 flex items-end justify-end p-1">
                        <img
                          src={playerInCell.avatarUrl}
                          alt={playerInCell.id}
                          title={`${playerInCell.id} (Pos: ${playerInCell.position})`}
                          className="w-2/4 h-2/4 rounded-full border border-[#8b4513] object-cover bg-gray-700 transform transition-transform duration-300"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LudoBoard;
