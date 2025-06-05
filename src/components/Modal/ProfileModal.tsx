import type { SDKUser } from "../../types";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-[400px] flex items-center justify-center">
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
                "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
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
          <h2 className="text-[#ffd700] text-xl mb-4 font-['MorrisRoman']">
            Adventurer Profile
          </h2>

          <div className="space-y-3 text-white text-sm">
            <div className="bg-[#1a0f09] rounded-lg p-2.5 shadow-inner">
              <p className="text-[#ffd700] text-xs mb-1">Username</p>
              <p>{fcUser ? "@" + fcUser.username : "Not Connected"}</p>
            </div>

            <div className="bg-[#1a0f09] rounded-lg p-2.5 shadow-inner">
              <p className="text-[#ffd700] text-xs mb-1">Farcaster ID</p>
              <p>{fcUser?.fid || "Not Connected"}</p>
            </div>

            <div className="bg-[#1a0f09] rounded-lg p-2.5 shadow-inner">
              <p className="text-[#ffd700] text-xs mb-1">Games Played</p>
              <p>0</p>
            </div>

            <div className="bg-[#1a0f09] rounded-lg p-2.5 shadow-inner">
              <p className="text-[#ffd700] text-xs mb-1">Total Wins</p>
              <p>0</p>
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
