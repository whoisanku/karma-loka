import { useConnect } from "wagmi";
import type { SDKUser } from "../../types";

interface HomeProps {
  fcUser: SDKUser | null;
  isLoading: boolean;
  onBegin: () => void;
  handleButtonClick: () => void;
}

export default function HomePage({
  fcUser,
  isLoading,
  onBegin,
  handleButtonClick,
}: HomeProps) {
  const {connect, connectors} = useConnect()
  const handleStartGame = () => {
    handleButtonClick();
    onBegin();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto px-4 sm:px-8 text-center">
      <h1 className="text-[#ffd700] text-4xl sm:text-6xl mb-8 sm:mb-12 font-normal drop-shadow-lg tracking-wider">
        Mystic Paths
      </h1>

      <div className="text-white text-xl sm:text-3xl mb-12 sm:mb-16 space-y-4 drop-shadow-lg font-normal">
        {isLoading ? (
          "Loading..."
        ) : (
          <>
            <p>
              Welcome{" "}
              {fcUser
                ? fcUser.displayName || `@${fcUser.username}`
                : "Adventurer"}
              !
            </p>
            <p>Ready to embark on a magical journey?</p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleStartGame}
        className="px-8 sm:px-12 py-4 sm:py-5 text-xl sm:text-2xl font-normal text-[#2c1810] uppercase rounded-xl
                 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] 
                 border-2 border-[#8b4513] shadow-lg
                 transform transition-all duration-300 hover:-translate-y-1
                 hover:shadow-xl hover:bg-gradient-to-r hover:from-[#ff8c00] hover:to-[#ffd700]
                 active:translate-y-0 active:shadow-md"
      >
        Begin Adventure
      </button>
      <button
        type="button"
        onClick={() => connect({connector: connectors[1]})}
        className="px-8 sm:px-12 py-4 sm:py-5 text-xl sm:text-2xl font-normal text-[#2c1810] uppercase rounded-xl
                 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] 
                 border-2 border-[#8b4513] shadow-lg
                 transform transition-all duration-300 hover:-translate-y-1
                 hover:shadow-xl hover:bg-gradient-to-r hover:from-[#ff8c00] hover:to-[#ffd700]
                 active:translate-y-0 active:shadow-md"
      >
        Connect Wallet
      </button>

      
    </div>
  );
}
