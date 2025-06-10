import { useNavigate } from "react-router-dom";
import { useState } from "react";
import useExplore from "./useExplore";

interface Game {
  id: string;
  creator: string;
  prize: number; // USDC (converted from wei)
  players: string[];
  requiredParticipants: number;
  maxParticipants: number;
  started: boolean;
  gameStartTime: number;
  winner: string;
  metadataUri: string;
}

interface ExplorePageProps {
  onJoinQuest: () => void;
  handleButtonClick: () => void;
}

export default function ExplorePage({ handleButtonClick }: ExplorePageProps) {
  const navigate = useNavigate();
  const [isConfirmJoinModalOpen, setIsConfirmJoinModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const { games, error, isLoading, lastRoomId, currentPage, roomsPerPage, setCurrentPage } = useExplore();

  const handleShowFormClick = () => {
    handleButtonClick();
    navigate("/create");
  };

  const handleJoinQuestClick = (game: Game) => {
    handleButtonClick();
    setSelectedGame(game);
    setIsConfirmJoinModalOpen(true);
  };

  const handleProceedToGame = () => {
    handleButtonClick();
    navigate("/game/snakes-and-ladders");
    setIsConfirmJoinModalOpen(false);
  };

  // Show error state if there's a critical error
  if (error && games.length === 0 && !isLoading) {
    return (
      <div className="mx-auto mt-2 max-w-xl text-center space-y-6 pb-20">
        <div className="text-red-400 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="font-semibold mb-2">Error Loading Games</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto mt-2 max-w-xl text-center space-y-6 pb-20">
        <div className="text-white">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-2 max-w-xl text-center space-y-6 pb-20">
      {/* Show error message if there are some games but also errors */}
      {error && games.length > 0 && (
        <div className="text-yellow-400 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {games.length === 0 && !isLoading ? (
        <p className="text-white">No games found. Create the first quest!</p>
      ) : null}
      
      {games.length > 0 && (
        <div className="space-y-4">
          {games.map((game, index) => (
            <div
              key={`${game.id}-${index}`}
              className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg p-4 text-white text-left shadow-md"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#ffd700] font-normal">{game.id}</span>
                <span className="text-sm">Prize: {game.prize.toFixed(2)} USDC</span>
              </div>
              <p className="text-sm mb-1">Creator: {game.creator}</p>
              <p className="text-xs text-gray-400 mb-1">
                Players: {game.players.length}/{game.requiredParticipants} required
              </p>
              {game.started && (
                <p className="text-xs text-green-400 mb-1">Game Started</p>
              )}
              
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
                  onClick={() => handleJoinQuestClick(game)}
                  disabled={game.started || game.players.length >= game.maxParticipants}
                  className={`px-4 py-1 text-sm font-normal uppercase rounded-md border-2 transition-colors duration-300 ${
                    game.started || game.players.length >= game.maxParticipants
                      ? "text-gray-500 bg-gray-700 border-gray-600 cursor-not-allowed"
                      : "text-[#2c1810] bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-[#8b4513] hover:from-[#ffed4a] hover:to-[#ffa500]"
                  }`}
                >
                  {game.started ? "Started" : game.players.length >= game.maxParticipants ? "Full" : "Join"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!!lastRoomId && Number(lastRoomId) > roomsPerPage && (
        <div className="flex justify-center items-center space-x-4 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
              currentPage === 1
                ? "text-gray-500 bg-gray-700 border-gray-600 cursor-not-allowed"
                : "text-[#ffd700] bg-[#2c1810] border-[#8b4513] hover:bg-[#8b4513]"
            }`}
          >
            Previous
          </button>
          
          <span className="text-white text-sm">
            Page {currentPage} of {Math.ceil(Number(lastRoomId) / roomsPerPage)}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage >= Math.ceil(Number(lastRoomId) / roomsPerPage)}
            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
              currentPage >= Math.ceil(Number(lastRoomId) / roomsPerPage)
                ? "text-gray-500 bg-gray-700 border-gray-600 cursor-not-allowed"
                : "text-[#ffd700] bg-[#2c1810] border-[#8b4513] hover:bg-[#8b4513]"
            }`}
          >
            Next
          </button>
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
      {isConfirmJoinModalOpen && selectedGame && (
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

            <div className="text-white text-sm mb-6 space-y-2">
              <p>Are you sure you want to join <strong>{selectedGame.id}</strong>?</p>
              <p>Stake Amount: <strong>{(selectedGame.prize / selectedGame.requiredParticipants).toFixed(2)} USDC</strong></p>
              <p>Total Prize Pool: <strong>{selectedGame.prize.toFixed(2)} USDC</strong></p>
            </div>

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