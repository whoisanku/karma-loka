import { useNavigate } from "react-router-dom";
import { useState } from "react";
import useLeaderboard from "../../hooks/useLeaderboard";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";

interface LeaderboardPageProps {
  handleButtonClick: () => void;
}

const truncateAddress = (address: string) => {
  if (address.length > 10 && address.startsWith("0x")) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
  return address;
};

export default function LeaderboardPage({
  handleButtonClick,
}: LeaderboardPageProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { entries } = useLeaderboard(10);
  const { profiles } = useFarcasterProfiles(entries.map((e) => e.address));

  const rows = entries.map((e, idx) => ({
    rank: idx + 1,
    address: e.address,
    wins: e.wins,
    name:
      profiles[e.address]?.username ??
      profiles[e.address]?.displayName ??
      truncateAddress(e.address),
    avatar:
      profiles[e.address]?.pfp?.url ??
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${e.address}`,
  }));

  const filteredData = rows.filter((row) =>
    row.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-lg w-full text-center space-y-4 mt-4 pb-15">
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search users..."
          className="w-full bg-[#1a0f09] border-2 border-[#8b4513] focus:border-[#ffd700] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-[#ffd700] transition-colors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>
      {filteredData.map((row) => (
        <div
          key={row.rank}
          className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg px-2 py-2 text-white text-left shadow-md flex items-center justify-between hover:bg-[#8b4513]/20 transition-colors cursor-pointer"
          onClick={handleButtonClick}
        >
          <div className="flex items-center gap-3">
            <span className="font-bold text-2xl text-[#ffd700] w-8 text-center">
              {row.rank}
            </span>
            <img
              src={row.avatar}
              alt={row.name}
              className="w-10 h-10 rounded-full border-2 border-[#8b4513]"
            />
            <span className="font-semibold">{row.name}</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-2xl text-[#ffd700]">
              {row.wins}
            </span>
            <p className="text-xs text-gray-400 -mt-1">Wins</p>
          </div>
        </div>
      ))}

      {/* Floating Explore (back) Button */}
      <button
        type="button"
        onClick={() => {
          handleButtonClick();
          navigate("/explore");
        }}
        className="fixed bottom-9 left-8 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#2c1810] w-16 h-16 rounded-full shadow-lg flex items-center justify-center border-2 border-[#8b4513] hover:from-[#ffed4a] hover:to-[#ffa500] active:translate-y-0.5 z-30 transition-all duration-300 transform hover:scale-110"
        title="Explore"
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
          className="lucide lucide-grip-icon lucide-grip"
        >
          <circle cx="12" cy="5" r="1" />
          <circle cx="19" cy="5" r="1" />
          <circle cx="5" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
          <circle cx="19" cy="19" r="1" />
          <circle cx="5" cy="19" r="1" />
        </svg>
      </button>
    </div>
  );
}
