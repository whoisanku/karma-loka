import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import WoodenFrameLayout from "./layouts/WoodenFrameLayout";
import Explore from "./pages/Explore";
import Home from "./pages/Home";
import "./App.css";

export interface SDKUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export default function App() {
  const [fcUser, setFcUser] = useState<SDKUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState<"home" | "explore">("home");

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

  return (
    <WoodenFrameLayout fcUser={fcUser}>
      {page === "home" ? (
        <Home fcUser={fcUser} isLoading={isLoading} onBegin={() => setPage("explore")} />
      ) : (
        <Explore onBack={() => setPage("home")} />
      )}
    </WoodenFrameLayout>
  );
}
