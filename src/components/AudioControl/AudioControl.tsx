import clsx from "clsx";
import { twMerge } from "tailwind-merge";

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
        // Muted speaker icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-[var(--color-gold)]"
        >
          <title>Muted</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
          />
        </svg>
      ) : (
        // Unmuted speaker icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-[var(--color-gold)]"
        >
          <title>Unmuted</title>

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
          />
        </svg>
      )}
    </button>
  );
}
