import type { SDKUser } from "../../types";
import { useAccount } from "wagmi";
import { useState } from "react";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";
import useUserStats from "../../hooks/useUserStats";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fcUser: SDKUser | null;
}

export default function ProfileModal({
  isOpen,
  onClose,
  fcUser,
}: ProfileModalProps) {
  const { address } = useAccount();
  // Fetch Farcaster profile for connected address
  const { profiles: fcProfiles } = useFarcasterProfiles(
    address ? [address] : []
  );
  const walletProfile = address ? fcProfiles[address] : null;
  const { gamesPlayed, wins, loading } = useUserStats(address ?? "");
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const truncateAddress = (addr: string | undefined) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Themed backdrop */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/80 to-[#2c1810]/90"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-[90%] max-w-[320px] bg-[#2c1810] border-4 border-[#8b4513] rounded-xl p-6">
        {/* Profile Picture */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
          <div className="w-16 h-16 rounded-full border-4 border-[#ffd700] overflow-hidden bg-[rgba(44,24,16,0.8)]">
            <img
              src={
                fcUser?.pfpUrl ||
                walletProfile?.pfp?.url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${address ?? "Felix"}`
              }
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
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

        {/* Profile Content */}
        <div className="mt-10 text-center">
          {address && (
            <div className="flex items-center justify-center space-x-2 text-white text-xs mb-4">
              <span>{truncateAddress(address)}</span>
              <button
                onClick={handleCopyAddress}
                className="text-[#ffd700] hover:text-white focus:outline-none"
              >
                {isCopied ? (
                  <span className="text-green-400">Copied!</span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25V3.493c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
          <h2 className="text-[#ffd700] text-xl mb-4 font-['KGRedHands']">
            Adventurer Profile
          </h2>

          <div className="space-y-3 text-white text-sm">
            <div className="bg-[#1a0f09] rounded-lg p-2.5 shadow-inner">
              <p className="text-[#ffd700] text-xs mb-1">Username</p>
              <p>
                {fcUser
                  ? "@" + fcUser.username
                  : walletProfile?.username
                    ? "@" + walletProfile.username
                    : "Not Connected"}
              </p>
            </div>

            <div className="bg-[#1a0f09] rounded-lg p-2.5 shadow-inner">
              <p className="text-[#ffd700] text-xs mb-1">Farcaster ID</p>
              <p>{fcUser?.fid || walletProfile?.fid || "Not Connected"}</p>
            </div>

            <div className="bg-[#1a0f09] rounded-lg p-2.5 shadow-inner">
              <p className="text-[#ffd700] text-xs mb-1">Games Played</p>
              <p>
                {address
                  ? loading
                    ? "Loading..."
                    : gamesPlayed
                  : "Not Connected"}
              </p>
            </div>

            <div className="bg-[#1a0f09] rounded-lg p-2.5 shadow-inner">
              <p className="text-[#ffd700] text-xs mb-1">Total Wins</p>
              <p>
                {address
                  ? loading
                    ? "Loading..."
                    : wins
                  : "Not Connected"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 text-sm font-normal text-[#2c1810] uppercase rounded-lg
                     bg-gradient-to-r from-[#ffd700] to-[#ff8c00] 
                     border-2 border-[#8b4513] shadow-lg
                     transform transition-all duration-300 hover:-translate-y-1
                     hover:shadow-xl hover:bg-gradient-to-r hover:from-[#ff8c00] hover:to-[#ffd700]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
