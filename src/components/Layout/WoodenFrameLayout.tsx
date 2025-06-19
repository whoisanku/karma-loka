import { ReactNode, useState } from "react";
import { useAccount } from "wagmi";
import { useFarcasterProfiles } from "../../hooks/useFarcasterProfiles";
import ProfileModal from "../Modal/ProfileModal";
import SettingsModal from "../Modal/SettingsModal";
import type { SDKUser } from "../../types";
import { Menu } from "lucide-react";

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
                  <Menu
                    className="w-full h-full text-[#ffd700]"
                    strokeWidth={1.5}
                  />
                </button>
              </div>

              {/* Title from prop */}
              {title && (
                <h1 className="text-[#ffd700] text-2xl sm:text-3xl">{title}</h1>
              )}

              {/* Right cluster: Profile (+ Explore when on leaderboard) */}
              <div className="flex items-center gap-3">
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
