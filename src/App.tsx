import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import WoodenFrameLayout from "./layouts/WoodenFrameLayout";
import Explore from "./pages/Explore";
import Home from "./pages/Home";
import LudoBoard from "./pages/LudoBoard";
import "./App.css";

export interface SDKUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

function AppContent() {
  const [fcUser, setFcUser] = useState<SDKUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isGameRoute = location.pathname.startsWith("/game");
  const navigate = useNavigate();

  useEffect(() => {
    const initialize = async () => {
      try {
        await sdk.actions.ready();
        const frameContext = await sdk.context;
        if (frameContext?.user) {
          setFcUser(frameContext.user as SDKUser);
        }
      } catch (error) {
        console.error("Failed to initialize:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const content = (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            fcUser={fcUser}
            isLoading={isLoading}
            onBegin={() => navigate("/explore")}
          />
        }
      />
      <Route
        path="/explore"
        element={<Explore onJoinQuest={() => navigate("/game1")} />}
      />
      <Route path="/game1" element={<LudoBoard />} />
      <Route path="/game2" element={<LudoBoard />} />
    </Routes>
  );

  // Render without wooden frame for game routes
  if (isGameRoute) {
    return <div className="w-full h-screen bg-[#2c1810]">{content}</div>;
  }

  // Render with wooden frame for other routes
  return (
    <WoodenFrameLayout fcUser={fcUser}>
      <div className="mt-2 p-2">{content}</div>
    </WoodenFrameLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
