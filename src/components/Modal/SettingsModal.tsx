interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  isButtonSoundEnabled: boolean;
  onToggleButtonSound: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  isMuted,
  onToggleSound,
  isButtonSoundEnabled,
  onToggleButtonSound,
}: SettingsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/80 to-[#2c1810]/90"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="relative w-[90%] max-w-[320px] bg-[#2c1810] border-4 border-[#8b4513] rounded-xl p-6">
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

        <h2 className="text-[#ffd700] text-xl mb-6 text-center font-['MorrisRoman']">
          Settings
        </h2>

        <div className="space-y-5">
          <div className="flex items-center justify-between bg-[#1a0f09] p-3 rounded-lg shadow-inner">
            <span className="text-white text-sm">Background Music</span>
            <button
              onClick={onToggleSound}
              className={`w-12 h-6 rounded-full relative ${
                isMuted ? "bg-gray-600" : "bg-[#ffd700]"
              } transition-colors`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  isMuted ? "left-1" : "left-7"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between bg-[#1a0f09] p-3 rounded-lg shadow-inner">
            <span className="text-white text-sm">Button Sound Effects</span>
            <button
              onClick={onToggleButtonSound}
              className={`w-12 h-6 rounded-full relative ${
                !isButtonSoundEnabled ? "bg-gray-600" : "bg-[#ffd700]"
              } transition-colors`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  !isButtonSoundEnabled ? "left-1" : "left-7"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
