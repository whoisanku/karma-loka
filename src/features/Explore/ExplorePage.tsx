import { useNavigate } from "react-router-dom";
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

export default function ExplorePage({ handleButtonClick }: ExplorePageProps) {
  const navigate = useNavigate();
  const [isConfirmJoinModalOpen, setIsConfirmJoinModalOpen] = useState(false);

  const handleShowFormClick = () => {
    handleButtonClick();
    navigate("/create");
  };

  const handleJoinQuestClick = () => {
    handleButtonClick();
    setIsConfirmJoinModalOpen(true);
  };

  const handleProceedToGame = () => {
    handleButtonClick();
    navigate("/game/snakes-and-ladders");
    setIsConfirmJoinModalOpen(false);
  };

  return (
    <div className="mx-auto mt-2 max-w-xl text-center space-y-6 pb-20">
      {sampleGames.length === 0 ? (
        <p className="text-white">No games found. Create the first quest!</p>
      ) : null}
      {sampleGames.length > 0 && (
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
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Confirmation Join Modal */}
      {isConfirmJoinModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/80 to-[#2c1810]/90"
            onClick={() => setIsConfirmJoinModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-[90%] max-w-[320px] bg-[#2c1810] border-4 border-[#8b4513] rounded-xl p-6 text-center">
            {/* Close Button for Modal */}
            <button
              onClick={() => setIsConfirmJoinModalOpen(false)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-[#2c1810] border-2 border-[#ffd700] 
                       flex items-center justify-center text-[#ffd700] hover:text-[#ff8c00] 
                       hover:border-[#ff8c00] transition-colors shadow-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h2 className="text-[#ffd700] text-xl mb-6 font-['MorrisRoman']">
              Confirm Join
            </h2>

            <p className="text-white text-sm mb-6">
              Are you sure you want to proceed to this quest?
            </p>

            <button
              type="button"
              onClick={handleProceedToGame}
              className="w-full px-6 py-2.5 text-sm font-normal text-[#2c1810] uppercase rounded-lg
                         bg-gradient-to-r from-[#ffd700] to-[#ff8c00] 
                         border-2 border-[#8b4513] shadow-lg
                         transform transition-all duration-300 hover:-translate-y-1
                         hover:shadow-xl hover:bg-gradient-to-r hover:from-[#ff8c00] hover:to-[#ffd700]"
            >
              Proceed to Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
