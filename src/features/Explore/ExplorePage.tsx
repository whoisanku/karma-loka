import { useState } from "react";

interface Game {
  id: string;
  creator: string;
  prize: number; // USDC
  players: string[];
}

interface ExplorePageProps {
  onJoinQuest: () => void;
  handleButtonClick: () => void;
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

export default function ExplorePage({
  onJoinQuest,
  handleButtonClick,
}: ExplorePageProps) {
  const [showForm, setShowForm] = useState(false);

  const handleCreateGameClick = () => {
    handleButtonClick();
    setShowForm(false);
  };

  const handleShowFormClick = () => {
    handleButtonClick();
    setShowForm(true);
  };

  const handleJoinQuestClick = () => {
    handleButtonClick();
    onJoinQuest();
  };

  return (
    <div className="mx-auto max-w-xl text-center space-y-6 pb-20">
      {sampleGames.length === 0 && !showForm ? (
        <p className="text-white">No games found. Create the first quest!</p>
      ) : null}
      {!showForm && sampleGames.length > 0 && (
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
              <div className="flex justify-between items-center mt-3 mb-1">
                <div className="flex items-center">
                  {game.players.length > 0 ? (
                    <div className="flex -space-x-2">
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
                  onClick={handleJoinQuestClick}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
          <div className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg p-6 text-white space-y-4 shadow-xl max-w-md w-full">
            <h2 className="text-2xl text-[#ffd700] mb-4">Create New Game</h2>
            <p>Game creation feature is coming soon!</p>
            <button
              type="button"
              onClick={handleCreateGameClick}
              className="w-full mt-4 px-6 py-2 text-sm font-normal text-[#2c1810] uppercase rounded-md bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-2 border-[#8b4513] hover:from-[#ffed4a] hover:to-[#ffa500] transition-colors duration-300"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleShowFormClick}
          className="fixed bottom-8 right-8 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#2c1810] w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-3xl border-2 border-[#8b4513] hover:from-[#ffed4a] hover:to-[#ffa500] active:translate-y-0.5 z-30 transition-all duration-300 transform hover:scale-110"
          title="Create Game"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
