import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";
import ProfileModal from "../Modal/ProfileModal";
import SettingsModal from "../Modal/SettingsModal";
import type { SDKUser } from "../../types";
import { IoDiceOutline } from "react-icons/io5";

interface WoodenFrameLayoutProps {
  children: ReactNode;
  fcUser: SDKUser | null;
  title?: string;
  handleButtonClick: () => void;
  isMuted: boolean;
  toggleSound: () => void;
  isButtonSoundEnabled: boolean;
  toggleButtonSound: () => void;
}

export default function WoodenFrameLayout({
  children,
  fcUser,
  title,
  handleButtonClick,
  isMuted,
  toggleSound,
  isButtonSoundEnabled,
  toggleButtonSound,
}: WoodenFrameLayoutProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isLeaderboardPage = location.pathname === "/leaderboard";

  // Fetch connected wallet Farcaster profile
  const { address } = useAccount();
  const { profiles: fcProfiles } = useFarcasterProfiles(
    address ? [address] : []
  );
  const walletProfile = address ? fcProfiles[address] : null;

  return (
    <div className="w-full h-[100dvh] bg-[#2c1810] font-['KGRedHands'] flex flex-col">
      {/* This div applies the wooden frame and padding */}
      <div
        className="flex-grow bg-no-repeat bg-cover bg-center m-0 sm:m-4 overflow-hidden"
        style={{
          backgroundImage: "url('/wooden_frame.png')",
          backgroundSize: "100% 100%",
          padding: "2rem", // Adjusted padding
        }}
      >
        <div className="h-full flex flex-col">
          {/* Header Section */}
          <div className="flex-shrink-0 z-20">
            <div className="flex mb-1 justify-between items-center max-w-7xl mx-auto">
              {/* Left cluster: Settings + Leaderboard */}
              <div className="flex items-center gap-3">
                {/* Settings Button */}
                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    handleButtonClick();
                  }}
                  className="w-10 h-10 rounded-full border-2 border-[#ffd700] 
                           overflow-hidden bg-[rgba(44,24,16,0.8)] p-1.5
                           hover:border-[#ff8c00] transition-colors duration-200 flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-full h-full text-[#ffd700]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                </button>

                {/* Leaderboard Button */}
                <button
                  onClick={() => {
                    navigate("/leaderboard");
                    handleButtonClick();
                  }}
                  className="w-10 h-10 rounded-full border-2 border-[#ffd700] 
                           overflow-hidden bg-[rgba(44,24,16,0.8)] p-1.5
                           hover:border-[#ff8c00] transition-colors duration-200 flex items-center justify-center"
                >
                  <span className="text-[#ffd700] text-xl">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0"
                      />
                    </svg>
                  </span>
                </button>
              </div>

              {/* Title from prop */}
              {title && (
                <h1 className="text-[#ffd700] text-2xl sm:text-3xl">{title}</h1>
              )}

              {/* Right cluster: Profile (+ Explore when on leaderboard) */}
              <div className="flex items-center gap-3">
                {/* Explore Button (shown only on leaderboard page) */}
                {isLeaderboardPage && (
                  <button
                    onClick={() => {
                      navigate("/explore");
                      handleButtonClick();
                    }}
                    className="w-10 h-10 rounded-full border-2 border-[#ffd700] 
                           overflow-hidden bg-[rgba(44,24,16,0.8)] p-1.5
                           hover:border-[#ff8c00] transition-colors duration-200 flex items-center justify-center"
                  >
                    <span className="text-[#ffd700] text-xl">
                      <IoDiceOutline />
                    </span>
                  </button>
                )}
                {/* Profile Button */}
                <button
                  onClick={() => {
                    setIsProfileOpen(true);
                    handleButtonClick();
                  }}
                  className="w-10 h-10 rounded-full border-2 border-[#ffd700] 
                           overflow-hidden bg-[rgba(44,24,16,0.8)] p-0.5 
                           hover:border-[#ff8c00] transition-colors duration-200"
                >
                  <img
                    src={
                      fcUser?.pfpUrl ||
                      walletProfile?.pfp?.url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${address ?? "Felix"}`
                    }
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#ffd700]/50 hover:scrollbar-thumb-[#ffd700]">
            {children}
          </div>
        </div>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          handleButtonClick();
        }}
        isMuted={isMuted}
        onToggleSound={toggleSound}
        isButtonSoundEnabled={isButtonSoundEnabled}
        onToggleButtonSound={toggleButtonSound}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          handleButtonClick();
        }}
        fcUser={fcUser}
      />
    </div>
  );
}
