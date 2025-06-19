import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import SpeakerIcon from "../icons/SpeakerIcon";
import SpeakerMutedIcon from "../icons/SpeakerMutedIcon";

interface AudioControlProps {
  isMuted: boolean;
  onToggle: () => void;
  className?: string;
}

export default function AudioControl({ isMuted, onToggle, className = "" }: AudioControlProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={twMerge(
        clsx(
          "w-10 h-10 rounded-full border-2 border-[var(--color-gold)]",
          "bg-[var(--color-overlay-brown)] z-10 flex items-center justify-center",
          "hover:scale-105 transition-transform duration-200",
          "hover:border-[var(--color-dark-orange)]",
          className,
        ),
      )}
    >
      {isMuted ? (
        <SpeakerMutedIcon className="text-[var(--color-gold)]" />
      ) : (
        <SpeakerIcon className="text-[var(--color-gold)]" />
      )}
    </button>
  );
}
