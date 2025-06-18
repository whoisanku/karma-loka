import { SiFarcaster } from "react-icons/si";

interface GameCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: () => void;
  onExplore: () => void;
}

export default function GameCreatedModal({
  isOpen,
  onClose,
  onShare,
  onExplore,
}: GameCreatedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/80 to-[#2c1810]/90"
        onClick={onClose}
      />
      <div className="relative w-[90%] max-w-[320px] bg-[#2c1810] border-4 border-[#8b4513] rounded-xl p-6 space-y-4 text-center">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-[#2c1810] border-2 border-[#ffd700] flex items-center justify-center text-[#ffd700] hover:text-[#ff8c00] hover:border-[#ff8c00] transition-colors shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-[#ffd700] text-xl">Quest Created!</h2>
        <p className="text-white text-sm">Your quest has been created successfully.</p>
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={onShare}
            className="w-full px-4 py-2.5 text-sm font-normal text-white rounded-md bg-gradient-to-r from-[#8338ec] to-[#3a86ff] border-2 border-[#8b4513] hover:from-[#3a86ff] hover:to-[#8338ec] transition-colors flex items-center justify-center gap-2"
          >
            <SiFarcaster className="w-5 h-5" /> Share on Farcaster
          </button>
          <button
            onClick={onExplore}
            className="w-full px-4 py-2.5 text-sm font-normal text-[#2c1810] uppercase rounded-md bg-gradient-to-r from-[#ffd700] to-[#ff8c00] border-2 border-[#8b4513] shadow-md hover:from-[#ffed4a] hover:to-[#ffa500] transition-colors"
          >
            Go to Explore
          </button>
        </div>
      </div>
    </div>
  );
}
