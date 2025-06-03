import { useState, useEffect } from "react";
import WoodenFrameLayout from "./layouts/WoodenFrameLayout";
import Home from "./pages/Home";
import { sdk } from "@farcaster/frame-sdk";
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

  useEffect(() => {
    const initialize = async () => {
      try {
        await sdk.actions.ready();
        const frameContext = await sdk.context;
        if (frameContext && frameContext.user) {
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
      <Home fcUser={fcUser} isLoading={isLoading} />
    </WoodenFrameLayout>
  );
}
