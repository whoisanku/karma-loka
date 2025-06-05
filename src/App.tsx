import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState, useRef, ReactNode } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import WoodenFrameLayout from "./components/Layout/WoodenFrameLayout";
import ExplorePage from "./features/Explore/ExplorePage";
import HomePage from "./features/Home/HomePage";
import LudoPage from "./features/Ludo/LudoPage";
import "./styles/global.css";
import type { SDKUser } from "./types";

// Constants for localStorage keys
const LOCAL_STORAGE_MUTED_KEY = "karmaLoka_isMuted";
const LOCAL_STORAGE_BUTTON_SOUND_KEY = "karmaLoka_isButtonSoundEnabled";

function AppContent() {
  const [fcUser, setFcUser] = useState<SDKUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isGameRoute = location.pathname.startsWith("/game");
  const navigate = useNavigate();

  const [isMuted, setIsMuted] = useState(() => {
    const storedValue = localStorage.getItem(LOCAL_STORAGE_MUTED_KEY);
    if (storedValue !== null) {
      try {
        return Boolean(JSON.parse(storedValue));
      } catch (e) {
        console.error(
          `Error parsing '${LOCAL_STORAGE_MUTED_KEY}' from localStorage:`,
          e
        );
      }
    }
    return false;
  });
  const [isButtonSoundEnabled, setIsButtonSoundEnabled] = useState(() => {
    const storedValue = localStorage.getItem(LOCAL_STORAGE_BUTTON_SOUND_KEY);
    if (storedValue !== null) {
      try {
        return Boolean(JSON.parse(storedValue));
      } catch (e) {
        console.error(
          `Error parsing '${LOCAL_STORAGE_BUTTON_SOUND_KEY}' from localStorage:`,
          e
        );
      }
    }
    return true;
  });
  const [musicPlayRequiresInteraction, setMusicPlayRequiresInteraction] =
    useState(false);

  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
  const buttonClickRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_MUTED_KEY, JSON.stringify(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_BUTTON_SOUND_KEY,
      JSON.stringify(isButtonSoundEnabled)
    );
  }, [isButtonSoundEnabled]);

  useEffect(() => {
    const audioEl = welcomeAudioRef.current;
    if (audioEl) {
      if (!isMuted) {
        // console.log("Attempting to play welcome audio. isMuted=", isMuted, "Paused=", audioEl.paused);
        audioEl.loop = true;
        // audioEl.load(); // load() might not be necessary here and can cause issues on some browsers
        audioEl.currentTime = 0;
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // console.log("Welcome audio playback started.");
              setMusicPlayRequiresInteraction(false);
            })
            .catch((error) => {
              console.error(
                "Welcome audio play() promise rejected:",
                error.name,
                error.message
              );
              if (error.name === "NotAllowedError") {
                // console.log("Setting musicPlayRequiresInteraction to true due to NotAllowedError.");
                setMusicPlayRequiresInteraction(true);
              }
            });
        }
      } else {
        // console.log("Muting welcome audio. isMuted=", isMuted);
        audioEl.pause();
        setMusicPlayRequiresInteraction(false);
      }
    }
    // } else {
    // console.log("Welcome audio ref not available yet.");
    // }
  }, [isMuted]);

  useEffect(() => {
    const audioEl = welcomeAudioRef.current;
    if (musicPlayRequiresInteraction && !isMuted && audioEl) {
      const handleInteraction = () => {
        // console.log("User interaction detected, attempting to play music.");
        audioEl
          .play()
          .then(() => {
            // console.log("Music started after user interaction.");
            setMusicPlayRequiresInteraction(false);
          })
          .catch((error) => {
            console.error("Error playing music after interaction:", error);
          });
        document.removeEventListener("click", handleInteraction, true);
        document.removeEventListener("keydown", handleInteraction, true);
      };

      // console.log("Adding interaction listeners for music playback.");
      document.addEventListener("click", handleInteraction, {
        capture: true,
        once: true,
      });
      document.addEventListener("keydown", handleInteraction, {
        capture: true,
        once: true,
      });

      return () => {
        // console.log("Cleaning up interaction listeners for music playback.");
        document.removeEventListener("click", handleInteraction, true);
        document.removeEventListener("keydown", handleInteraction, true);
      };
    }
  }, [musicPlayRequiresInteraction, isMuted]);

  const toggleSound = () => {
    setIsMuted((prevMuted) => {
      const newMutedState = !prevMuted;
      if (newMutedState) {
        setMusicPlayRequiresInteraction(false);
      }
      return newMutedState;
    });
  };

  const toggleButtonSound = () => {
    setIsButtonSoundEnabled((prev: boolean) => !prev);
  };

  const handleButtonClick = () => {
    if (isButtonSoundEnabled && buttonClickRef.current) {
      buttonClickRef.current.currentTime = 0;
      const playPromise = buttonClickRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Button click audio play failed:", error);
        });
      }
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await sdk.actions.ready();
        const frameContext = await sdk.context;
        if (frameContext?.user) {
          setFcUser(frameContext.user as SDKUser);
        }
      } catch (error) {
        console.error("Failed to initialize Farcaster SDK:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const routeContent = (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            fcUser={fcUser}
            isLoading={isLoading}
            onBegin={() => {
              handleButtonClick();
              navigate("/explore");
            }}
            handleButtonClick={handleButtonClick}
          />
        }
      />
      <Route
        path="/explore"
        element={
          <ExplorePage
            onJoinQuest={() => {
              handleButtonClick();
              navigate("/game1"); // Example game route
            }}
            handleButtonClick={handleButtonClick}
          />
        }
      />
      <Route path="/game1" element={<LudoPage />} />
      <Route path="/game2" element={<LudoPage />} />{" "}
      {/* Example, could be another game type */}
    </Routes>
  );

  let mainContent: ReactNode;
  if (isGameRoute) {
    mainContent = (
      <div className="w-full h-screen bg-[#2c1810]">{routeContent}</div>
    );
  } else {
    mainContent = (
      <WoodenFrameLayout
        fcUser={fcUser}
        handleButtonClick={handleButtonClick}
        isMuted={isMuted}
        toggleSound={toggleSound}
        isButtonSoundEnabled={isButtonSoundEnabled}
        toggleButtonSound={toggleButtonSound}
        title={
          location.pathname === "/explore"
            ? "Choose Your Quest"
            : "Mystic Paths"
        }
      >
        {routeContent}
      </WoodenFrameLayout>
    );
  }

  return (
    <>
      {mainContent}
      <audio
        ref={welcomeAudioRef}
        src="/welcome_instrumental.mp3"
        preload="auto"
      />
      <audio
        ref={buttonClickRef}
        src="/button_click_instrumental.mp3"
        preload="auto"
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
