import { useState } from "react";

interface Game {
  id: string;
  creator: string;
  prize: number; // USDC
  players: string[];
}

const sampleGames: Game[] = [
  {
    id: "Quest #1",
    creator: "@royal-sage",
    prize: 25,
    players: ["player1", "player2", "player3"],
  },
  {
    id: "Quest #2",
    creator: "@wandering-mystic",
    prize: 40,
    players: ["playerA"],
  },
];

interface ExploreProps {
  onBack: () => void;
}

export default function Explore({ onBack }: ExploreProps) {
  const [showForm, setShowForm] = useState(false);

  const handleCreate = () => {
    // placeholder for create logic
    setShowForm(false);
  };

  return (
    <div className="p-4 mx-auto max-w-xl text-center space-y-6">
      <h2 className="text-[#ffd700] text-3xl sm:text-4xl font-normal drop-shadow-lg">Ongoing Quests</h2>

      {sampleGames.length === 0 ? (
        <p className="text-white">No games found. Create the first quest!</p>
      ) : (
        <div className="space-y-4">
          {sampleGames.map((game) => (
            <div
              key={game.id}
              className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg p-4 text-white text-left shadow-md"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#ffd700] font-normal">{game.id}</span>
                <span className="text-sm">Prize: {game.prize} USDC</span>
              </div>
              <p className="text-sm mb-1">Creator: {game.creator}</p>
              <p className="text-sm mb-1">Players: {game.players.join(", ") || "None"}</p>
              <button
                type="button"
                className="mt-2 px-4 py-1 text-sm font-normal text-[#2c1810] uppercase rounded-md bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-2 border-[#8b4513]"
              >
                Join Quest
              </button>
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

      <button
        type="button"
        onClick={onBack}
        className="block mx-auto mt-4 px-6 py-2 text-sm font-normal text-[#2c1810] uppercase rounded-md bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-2 border-[#8b4513]"
      >
        Back
      </button>
    </div>
  );
}
