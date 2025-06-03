import { ReactNode, useState, useRef, useEffect } from "react";
import ProfileModal from "../components/ProfileModal";
import AudioControl from "../components/AudioControl";
import { SDKUser } from "../App";

interface WoodenFrameLayoutProps {
  children: ReactNode;
  fcUser: SDKUser | null;
}

export default function WoodenFrameLayout({
  children,
  fcUser,
}: WoodenFrameLayoutProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
  const buttonClickRef = useRef<HTMLAudioElement | null>(null);

  // Play welcome sound on mount and handle looping
  useEffect(() => {
    if (!isMuted && welcomeAudioRef.current) {
      welcomeAudioRef.current.loop = true;
      welcomeAudioRef.current.play().catch(console.error);
    }
    return () => {
      if (welcomeAudioRef.current) {
        welcomeAudioRef.current.pause();
        welcomeAudioRef.current.currentTime = 0;
      }
    };
  }, [isMuted]);

  const toggleSound = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      welcomeAudioRef.current?.pause();
      welcomeAudioRef.current!.currentTime = 0;
    } else {
      welcomeAudioRef.current?.play().catch(console.error);
    }
  };

  const handleButtonClick = () => {
    if (!isMuted && buttonClickRef.current) {
      buttonClickRef.current.currentTime = 0;
      buttonClickRef.current.play().catch(console.error);
    }
  };

  return (
    <div className="w-full h-[100dvh] bg-[#2c1810] overflow-hidden font-['MorrisRoman']">
      <audio ref={welcomeAudioRef} src="/welcome_instrumental.mp3" />
      <audio ref={buttonClickRef} src="/button_click_instrumental.mp3" />

      <div
        className="absolute inset-0 bg-no-repeat bg-cover bg-center sm:p-8"
        style={{
          backgroundImage: "url('/wooden_frame.png')",
          backgroundSize: "100% 100%",
        }}
      >
        {/* Sound Control */}
        <AudioControl
          isMuted={isMuted}
          onToggle={toggleSound}
          className="absolute top-6 sm:top-8 left-6 sm:left-8"
        />

        {/* Profile Button */}
        <button
          onClick={() => {
            setIsProfileOpen(true);
            handleButtonClick();
          }}
          className="absolute top-6 sm:top-8 right-6 sm:right-8 w-10 h-10 rounded-full border-2 border-[#ffd700] 
                   overflow-hidden z-10 bg-[rgba(44,24,16,0.8)] p-0.5 
                   hover:border-[#ff8c00] transition-colors duration-200"
        >
          <img
            src={
              fcUser?.pfpUrl ||
              "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
            }
            alt="Profile"
            className="w-full h-full object-cover rounded-full"
          />
        </button>

        {/* Profile Modal */}
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            handleButtonClick();
          }}
          fcUser={fcUser}
        />

        {/* Main Content */}
        <div className="relative w-full h-full max-h-[600px] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
