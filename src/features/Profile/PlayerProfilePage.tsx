import { useParams, useNavigate } from "react-router-dom";
import usePlayerStats from "../../hooks/usePlayerStats";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";

interface PlayerProfilePageProps {
  handleButtonClick: () => void;
}

export default function PlayerProfilePage({
  handleButtonClick,
}: PlayerProfilePageProps) {
  const { address = "" } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { profiles } = useFarcasterProfiles([address]);
  const profile = profiles[address];
  const { gamesPlayed, wins, loading } = usePlayerStats(address);

  const avatarUrl =
    profile?.pfp?.url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`;
  const displayName =
    profile?.username || profile?.displayName || address;

  return (
    <div className="mx-auto mt-4 max-w-sm text-center space-y-6 pb-20">
      <div className="flex flex-col items-center space-y-3">
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-24 h-24 rounded-full border-2 border-[#8b4513] object-cover"
        />
        <h2 className="text-2xl text-[#ffd700] font-semibold">{displayName}</h2>
        {profile?.bio?.text && (
          <p className="text-sm text-gray-300">{profile.bio.text}</p>
        )}
      </div>
      <div className="bg-[#1a0f09] border-2 border-[#8b4513] rounded-lg p-4 text-white space-y-1">
        {loading ? (
          <p>Loading stats...</p>
        ) : (
          <>
            <p>
              Games Played:{" "}
              <span className="text-[#ffd700] font-semibold">{gamesPlayed}</span>
            </p>
            <p>
              Wins:{" "}
              <span className="text-[#ffd700] font-semibold">{wins}</span>
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          handleButtonClick();
          navigate(-1);
        }}
        className="px-6 py-2 text-sm font-normal text-[#2c1810] uppercase rounded-md bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-2 border-[#8b4513] shadow-lg hover:from-[#ffed4a] hover:to-[#ffa500]"
      >
        Back
      </button>
    </div>
  );
}
