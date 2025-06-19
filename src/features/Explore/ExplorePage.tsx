import { useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import useExplore from "../../hooks/useExplore";
import { useParticipate } from "../../hooks/useParticipate";
import { useGameMetadata } from "../../hooks/useGameMetadata";
import snakeGameContractInfo from "../../constants/snakeGameContractInfo.json";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";

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
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState("all");
  const [isConfirmJoinModalOpen, setIsConfirmJoinModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const {
    games,
    error,
    isLoading,
    lastRoomId,
    currentPage,
    roomsPerPage,
    setCurrentPage,
  } = useExplore();
  const { metadata } = useGameMetadata(selectedGame?.metadataUri ?? "");

  const allAddressesToFetch = useMemo(() => {
    const players = games.flatMap((game) => game.players);
    const creators = games.map((game) => game.creator);
    return Array.from(new Set([...players, ...creators]));
  }, [games]);

  const { profiles: farcasterProfiles } =
    useFarcasterProfiles(allAddressesToFetch);

  // Setup participation hook
  const selectedIdNumber = selectedGame
    ? Number(selectedGame.id.split("#")[1])
    : 0;
  const stakeAmount = selectedGame
    ? (selectedGame.prize / selectedGame.requiredParticipants).toString()
    : "0";
  const {
    currentStep: participateStep,
    needsApproval: participateNeedsApproval,
    isConnected: participateConnected,
    handleApproveUSDC,
    handleParticipate,
    connectWallet: participateConnectWallet,
    resetTransactionState: resetParticipateState,
  } = useParticipate(selectedIdNumber, stakeAmount);

  // Join button state
  const isJoinLoading = [
    "approving",
    "waiting_approval",
    "participating",
    "waiting_participation",
  ].includes(participateStep);
  const joinButtonText = (() => {
    switch (participateStep) {
      case "approving":
        return "Approving USDC...";
      case "waiting_approval":
        return "Confirming Approval...";
      case "participating":
        return "Joining Quest...";
      case "waiting_participation":
        return "Confirming Join...";
      case "completed":
        return "Joined!";
      case "error":
        return "Try Again";
      default:
        return "Proceed to Game";
    }
  })();

  const handleShowFormClick = () => {
    handleButtonClick();
    navigate("/create");
  };

  const handleJoinQuestClick = (game: Game) => {
    handleButtonClick();
    setSelectedGame(game);
    setIsConfirmJoinModalOpen(true);
  };

  // Trigger participation flow
  const handleProceedToGame = useCallback(async () => {
    handleButtonClick();
    if (!participateConnected) {
      await participateConnectWallet();
      return;
    }
    resetParticipateState();
    if (participateNeedsApproval) {
      await handleApproveUSDC();
    } else {
      await handleParticipate();
    }
  }, [
    handleButtonClick,
    participateConnected,
    participateConnectWallet,
    resetParticipateState,
    participateNeedsApproval,
    handleApproveUSDC,
    handleParticipate,
  ]);

  // Navigate after successful participation
  useEffect(() => {
    if (participateStep === "completed" && selectedGame) {
      setIsConfirmJoinModalOpen(false);
      const id = selectedGame.id.split("#")[1];
      navigate(`/game/${id}`);
    }
  }, [participateStep, navigate, selectedGame]);

  // Filter games based on activeTab and user participation
  const filteredGames = useMemo(() => {
    if (activeTab === "joined") {
      return games.filter((game) =>
        address ? game.players.includes(address) : false
      );
    }
    return games;
  }, [activeTab, games, address]);

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
    <div className="mx-auto max-w-xl text-center space-y-6 pb-20">
      <div className="flex pt-2 pb-2 justify-center mb-4 sticky top-0 z-30 bg-[#2c1810]">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-l ${activeTab === "all" ? "bg-[#ffd700] text-[#2c1810]" : "bg-gray-700 text-white"}`}
        >
          All Rounds
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("joined")}
          className={`px-4 py-2 rounded-r ${activeTab === "joined" ? "bg-[#ffd700] text-[#2c1810]" : "bg-gray-700 text-white"}`}
        >
          Joined Rounds
        </button>
      </div>
      {/* Show error message if there are some games but also errors */}
      {error && games.length > 0 && (
        <div className="text-yellow-400 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
      {filteredGames.length === 0 && !isLoading ? (
        <p className="text-white">
          {activeTab === "joined"
            ? "No joined quests found."
            : "No games found. Create the first quest!"}
        </p>
      ) : null}
      {filteredGames.length > 0 && (
        <div className="space-y-4">
          {filteredGames.map((game, index) => (
            <GameCard
              key={`${game.id}-${index}`}
              game={game}
              onJoinClick={handleJoinQuestClick}
              farcasterProfiles={farcasterProfiles}
              handleButtonClick={handleButtonClick}
            />
          ))}
        </div>
      )}
      {/* Pagination Controls */}
      {!!lastRoomId && Number(lastRoomId) > roomsPerPage && (
        <div className="flex justify-center items-center space-x-4 mt-6">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-l ${currentPage === 1 ? "text-gray-500 bg-gray-700 border-gray-600 cursor-not-allowed" : "text-[#ffd700] bg-[#2c1810] border-[#8b4513] hover:bg-[#8b4513]"}`}
          >
            Previous
          </button>

          <span className="text-white text-sm">
            Page {currentPage} of {Math.ceil(Number(lastRoomId) / roomsPerPage)}
          </span>

          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={
              currentPage >= Math.ceil(Number(lastRoomId) / roomsPerPage)
            }
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
      <div className="relative h-full">
        <button
          type="button"
          onClick={() => {
            handleButtonClick();
            navigate("/leaderboard");
          }}
          className="fixed bottom-8 left-8 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#2c1810] w-16 h-16 rounded-full shadow-lg flex items-center justify-center border-2 border-[#8b4513] hover:from-[#ffed4a] hover:to-[#ffa500] active:translate-y-0.5 transition-all duration-300 transform hover:scale-110"
          title="Leaderboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="lucide lucide-trophy-icon lucide-trophy"
          >
            <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" />
            <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" />
            <path d="M18 9h1.5a1 1 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
            <path d="M6 9H4.5a1 1 0 0 1 0-5H6" />
          </svg>
        </button>
        <div className="absolute inset-0 pointer-events-none pb-[3.25rem]">
          <button
            type="button"
            onClick={handleShowFormClick}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#2c1810] w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-3xl border-2 border-[#8b4513] hover:from-[#ffed4a] hover:to-[#ffa500] active:translate-y-0.5  transition-all duration-300 transform hover:scale-110"
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
        </div>
      </div>
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

            <h2 className="text-[#ffd700] text-xl mb-6 font-['KGRedHands']">
              Confirm Join
            </h2>

            <div className="text-white text-sm mb-6 space-y-2">
              <p>
                Are you sure you want to join{" "}
                {metadata?.name && (
                  <span className="text-[#ffd700] font-normal">
                    {metadata.name}
                  </span>
                )}
                ?
              </p>
              <p className="flex justify-center items-center mt-4">
                Stake Amount:{" "}
                <strong className="flex items-center ml-1">
                  {(
                    selectedGame.prize / selectedGame.requiredParticipants
                  ).toFixed(2)}
                  <img
                    src="/usdc coin.svg"
                    alt="USDC"
                    className="w-5 h-5 ml-1"
                  />
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleProceedToGame}
              disabled={isJoinLoading || !participateConnected}
              className={`w-full px-6 py-2.5 text-sm font-normal text-[#2c1810] uppercase rounded-lg
                         bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-2 border-[#8b4513] shadow-lg transform transition-all duration-300
                         ${
                           isJoinLoading || !participateConnected
                             ? "opacity-50 cursor-not-allowed"
                             : "hover:-translate-y-1 hover:shadow-xl hover:bg-gradient-to-r hover:from-[#ff8c00] hover:to-[#ffd700]"
                         }
                         `}
            >
              {joinButtonText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add GameCard component to keep the main component clean
const GameCard = ({
  game,
  onJoinClick,
  farcasterProfiles,
  handleButtonClick,
}: {
  game: Game;
  onJoinClick: (game: Game) => void;
  farcasterProfiles: Record<string, any>;
  handleButtonClick: () => void;
}) => {
  const { metadata } = useGameMetadata(game.metadataUri);
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();

  const creatorDisplayName = useMemo(() => {
    const name = farcasterProfiles[game.creator]?.username ?? game.creator;
    if (name.startsWith("0x") && name.length > 12) {
      return `${name.substring(0, 6)}...${name.substring(name.length - 4)}`;
    }
    if (name.length > 15) {
      return name.substring(0, 15) + "...";
    }
    return name;
  }, [game.creator, farcasterProfiles]);

  // Component to render game button with hasJoined check
  const GameButton = () => {
    if (
      game.winner &&
      game.winner !== "0x0000000000000000000000000000000000000000"
    ) {
      const winnerName =
        farcasterProfiles[game.winner]?.username ?? game.winner;
      return (
        <div className="text-right">
          <p className="text-lg font-bold text-[#ffd700]">Winner!</p>
          <p className="text-sm">{winnerName}</p>
        </div>
      );
    }

    const { data: joined } = useReadContract({
      address: snakeGameContractInfo.address as `0x${string}`,
      abi: snakeGameContractInfo.abi,
      functionName: "hasJoined",
      args: [BigInt(game.id.split("#")[1]), address!],
      query: {
        enabled: isConnected && Boolean(address),
        refetchInterval: 5000,
      },
    });

    const hasJoined = Boolean(joined);
    const isFull = game.players.length >= game.maxParticipants;

    const handleRollClick = () => {
      const id = game.id.split("#")[1];
      navigate(`/game/${id}`);
    };

    // If game has started
    if (game.started) {
      if (hasJoined) {
        // User has joined and game started - show Roll button
        return (
          <button
            type="button"
            onClick={handleRollClick}
            className="px-4 py-1 text-sm font-normal uppercase rounded-md border-2 transition-colors duration-300 
                     text-[#2c1810] bg-gradient-to-r from-[#00ff00] to-[#32cd32] border-[#228b22] 
                     hover:from-[#32cd32] hover:to-[#00ff00]"
          >
            Roll
          </button>
        );
      } else {
        // User hasn't joined and game started - allow viewing the game
        return (
          <button
            type="button"
            onClick={handleRollClick}
            className="px-4 py-1 text-sm font-normal uppercase rounded-md border-2 transition-colors duration-300
                     text-[#2c1810] bg-gradient-to-r from-[#9ca3af] to-[#d1d5db] border-[#6b7280]
                     hover:from-[#d1d5db] hover:to-[#9ca3af]"
          >
            View
          </button>
        );
      }
    }

    // Game hasn't started yet
    if (hasJoined) {
      // User has joined but game hasn't started - show Joined button (disabled)
      return (
        <button
          type="button"
          disabled
          className="px-4 py-1 text-sm font-normal uppercase rounded-md border-2 transition-colors duration-300 
                   text-[#ffd700] bg-[#2c1810] border-[#8b4513] cursor-not-allowed opacity-75"
        >
          Joined
        </button>
      );
    }

    // User hasn't joined and game hasn't started
    if (isFull) {
      // Game is full
      return (
        <button
          type="button"
          disabled
          className="px-4 py-1 text-sm font-normal uppercase rounded-md border-2 transition-colors duration-300 
                   text-gray-500 bg-gray-700 border-gray-600 cursor-not-allowed"
        >
          Full
        </button>
      );
    }

    // User can join
    return (
      <button
        type="button"
        onClick={() => onJoinClick(game)}
        className="px-4 py-1 text-sm font-normal uppercase rounded-md border-2 transition-colors duration-300 
                 text-[#2c1810] bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-[#8b4513] 
                 hover:from-[#ffed4a] hover:to-[#ffa500]"
      >
        Join
      </button>
    );
  };

  return (
    <div className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg p-4 text-white text-left shadow-md">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {metadata?.name && (
            <span className="text-[#ffd700] font-normal">{metadata.name}</span>
          )}
        </div>
        <span className="text-sm flex items-center">
          {game.prize.toFixed(2)}
          <img src="/usdc coin.svg" alt="USDC" className="w-5 h-5 ml-1" />
        </span>
      </div>
      <p className="text-sm mb-1">
        Creator:{" "}
        <button
          type="button"
          onClick={() => {
            handleButtonClick();
            navigate(`/profile/${game.creator}`);
          }}
          className="underline hover:text-[#ffd700]"
        >
          {creatorDisplayName}
        </button>
      </p>
      <p className="text-xs text-gray-400 mb-1">
        Players: {game.players.length}/{game.requiredParticipants} required
      </p>
      {game.winner &&
      game.winner !== "0x0000000000000000000000000000000000000000" ? (
        <p className="text-xs text-yellow-400 mb-1">Game Over</p>
      ) : game.started ? (
        <p className="text-xs text-green-400 mb-1">Game Started</p>
      ) : null}

      <div className="flex justify-between items-center mt-3 mb-1">
        <div className="flex items-center">
          {game.players.length > 0 ? (
            <div className="flex -space-x-2">
              {game.players.slice(0, 4).map((player, pIndex) => {
                const profile = farcasterProfiles[player];
                const pfpUrl =
                  profile?.pfp?.url ??
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${player}`;
                const username = profile?.username ?? player;

                return (
                  <button
                    key={pIndex}
                    type="button"
                    onClick={() => {
                      handleButtonClick();
                      navigate(`/profile/${player}`);
                    }}
                  >
                    <img
                      src={pfpUrl}
                      alt={username}
                      title={username}
                      className="w-8 h-8 rounded-full border-2 border-[#8b4513] object-cover bg-gray-700 hover:z-10 transform hover:scale-110 transition-transform"
                    />
                  </button>
                );
              })}
              {game.players.length > 4 && (
                <div
                  title={`More: ${game.players
                    .slice(4)
                    .map((p) => farcasterProfiles[p]?.username ?? p)
                    .join(", ")}`}
                  className="w-8 h-8 rounded-full border-2 border-[#8b4513] bg-[#2c1810] flex items-center justify-center text-xs text-[#ffd700] font-semibold hover:z-10 transform hover:scale-110 transition-transform"
                >
                  +{game.players.length - 4}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">No players yet</span>
          )}
        </div>
        <GameButton />
      </div>
    </div>
  );
};
