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
        className="fixed inset-0 bg-black/30"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="relative bg-[#2c1810] border-2 border-[#ffd700] rounded-lg p-6 max-w-sm w-full">
        <div className="text-2xl text-[#ffd700] mb-4">Settings</div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[#ffd700]">Background Music</span>
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

          <div className="flex items-center justify-between">
            <span className="text-[#ffd700]">Button Sound Effects</span>
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

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 px-4 bg-[#ffd700] text-[#2c1810] rounded hover:bg-[#ff8c00] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
