import { useState } from "react";

interface Game {
  id: string;
  creator: string;
  prize: number; // USDC
  players: string[];
}

// Define props for Explore component
interface ExploreProps {
  onJoinQuest: () => void;
}

const sampleGames: Game[] = [
  {
    id: "Game #1",
    creator: "@royal-sage",
    prize: 25,
    players: ["player1", "player2", "player3"],
  },
  {
    id: "Game #2",
    creator: "@wandering-mystic",
    prize: 40,
    players: ["playerA"],
  },
  {
    id: "Game #1",
    creator: "@royal-sage",
    prize: 25,
    players: ["player1", "player2", "player3"],
  },
  {
    id: "Game #2",
    creator: "@wandering-mystic",
    prize: 40,
    players: ["playerA"],
  },
];

// Add onJoinQuest to component props
export default function Explore({ onJoinQuest }: ExploreProps) {
  const [showForm, setShowForm] = useState(false);

  const handleCreate = () => {
    // placeholder for create logic
    setShowForm(false);
  };

  return (
    <div className="mx-auto max-w-xl text-center space-y-6">
      {sampleGames.length === 0 ? (
        <p className="text-white">No games found. Create the first quest!</p>
      ) : (
        <div className="space-y-4">
          {sampleGames.map((game, index) => (
            <div
              key={`${game.id}-${index}`}
              className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg p-4 text-white text-left shadow-md"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#ffd700] font-normal">{game.id}</span>
                <span className="text-sm">Prize: {game.prize} USDC</span>
              </div>
              <p className="text-sm mb-1">Creator: {game.creator}</p>
              {/* Player Avatars & Join Button */}
              <div className="flex justify-between items-center mt-3 mb-1">
                <div className="flex items-center">
                  {game.players.length > 0 ? (
                    <div className="flex -space-x-2">
                      {" "}
                      {/* -space-x-2 for overlap */}
                      {game.players.slice(0, 3).map((player, pIndex) => (
                        <img
                          key={pIndex}
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player}`}
                          alt={player}
                          title={player}
                          className="w-8 h-8 rounded-full border-2 border-[#8b4513] object-cover bg-gray-700 hover:z-10 transform hover:scale-110 transition-transform"
                        />
                      ))}
                      {game.players.length > 3 && (
                        <div
                          title={`More: ${game.players.slice(3).join(", ")}`}
                          className="w-8 h-8 rounded-full border-2 border-[#8b4513] bg-[#2c1810] flex items-center justify-center text-xs text-[#ffd700] font-semibold hover:z-10 transform hover:scale-110 transition-transform"
                        >
                          +{game.players.length - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      No players yet
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onJoinQuest}
                  className="px-4 py-1 text-sm font-normal text-[#2c1810] uppercase rounded-md bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-2 border-[#8b4513] hover:from-[#ffed4a] hover:to-[#ffa500] transition-colors duration-300"
                >
                  Join Quest
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg p-4 text-white space-y-3 shadow-md">
          <p>Game creation coming soon...</p>
          <button
            type="button"
            onClick={handleCreate}
            className="px-6 py-1 text-sm font-normal text-[#2c1810] uppercase rounded-md bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-2 border-[#8b4513]"
          >
            Close
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-8 py-2 text-lg font-normal text-[#2c1810] uppercase rounded-xl bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-2 border-[#8b4513] shadow-lg"
        >
          Create Game
        </button>
      )}
    </div>
  );
}
