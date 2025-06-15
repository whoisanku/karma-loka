import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./Dice.module.css"; // Import CSS Modules object

interface DiceProps {
  onRollComplete: (value: number) => void;
  isParentRolling: boolean;
  setParentIsRolling: (rolling: boolean) => void;
  initialValue?: number;
  soundSrc?: string; // Optional prop for the sound file source
  disabled?: boolean; // Optional prop to disable rolling
  spinning?: boolean;
  stopAt?: number | null;
  waitingForResult?: boolean; // New prop to indicate waiting for transaction result
}

const ROLL_INTERVAL = 400; // Consistent interval for all rolling animations

const getRandomNumber = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const Dice: React.FC<DiceProps> = ({
  onRollComplete,
  isParentRolling,
  setParentIsRolling,
  initialValue = 1,
  soundSrc = "/dice_roll.mp3", // Default sound file path
  disabled = false, // Disable rolling when true
  spinning,
  stopAt,
  waitingForResult = false, // Default to false
}) => {
  const dieRef = useRef<HTMLUListElement>(null);
  const [currentDisplayValue, setCurrentDisplayValue] =
    useState<number>(initialValue);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rollInterval = useRef<NodeJS.Timeout>();
  const [pauseAfterStop, setPauseAfterStop] = useState(false);

  // Single effect to handle all rolling animations
  useEffect(() => {
    if (!dieRef.current) return;

    const shouldRoll = spinning || waitingForResult;

    if (shouldRoll) {
      // Clear any existing interval
      if (rollInterval.current) {
        clearInterval(rollInterval.current);
      }

      // Start rolling animation
      const roll = () => {
        if (!dieRef.current) return;

        const newValue = getRandomNumber(1, 6);
        dieRef.current.dataset.roll = newValue.toString();
        setCurrentDisplayValue(newValue);

        // Toggle roll direction for visual variety
        const isCurrentlyOdd = dieRef.current.classList.contains(styles["odd-roll"]);
        dieRef.current.classList.remove(styles["odd-roll"], styles["even-roll"]);
        dieRef.current.classList.add(isCurrentlyOdd ? styles["even-roll"] : styles["odd-roll"]);
      };

      // Initial roll
      roll();
      
      // Set up consistent interval
      rollInterval.current = setInterval(roll, ROLL_INTERVAL);
    } else {
      // Stop rolling animation
      if (rollInterval.current) {
        clearInterval(rollInterval.current);
      }

      // Set final value if provided
      if (typeof stopAt === 'number') {
        dieRef.current.classList.remove(styles["odd-roll"], styles["even-roll"]);
        dieRef.current.classList.add(styles["even-roll"]);
        dieRef.current.dataset.roll = stopAt.toString();
        setCurrentDisplayValue(stopAt);
        setPauseAfterStop(true);
        setTimeout(() => setPauseAfterStop(false), 3000);
      }
    }

    return () => {
      if (rollInterval.current) {
        clearInterval(rollInterval.current);
      }
    };
  }, [spinning, waitingForResult, stopAt, styles]);

  // console.log("[Dice.tsx] Render/Re-render. isParentRolling:", isParentRolling);

  const playSound = useCallback(() => {
    if (!soundSrc || !audioRef.current) {
      audioRef.current = new Audio(soundSrc);
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => console.error("Error playing sound:", error));
    }
  }, [soundSrc]);

  const performRoll = useCallback(() => {
    if (!dieRef.current || isParentRolling || disabled || waitingForResult || pauseAfterStop) {
      return;
    }

    setParentIsRolling(true);
    playSound();

    const roll = getRandomNumber(1, 6);
    if (dieRef.current) {
      const isCurrentlyOdd = dieRef.current.classList.contains(styles["odd-roll"]);
      dieRef.current.classList.remove(styles["odd-roll"], styles["even-roll"]);
      dieRef.current.classList.add(isCurrentlyOdd ? styles["even-roll"] : styles["odd-roll"]);
      dieRef.current.dataset.roll = roll.toString();
    }

    onRollComplete(roll);
  }, [isParentRolling, setParentIsRolling, playSound, disabled, waitingForResult, pauseAfterStop, onRollComplete, styles]);

  // Initialize dice
  useEffect(() => {
    if (dieRef.current) {
      dieRef.current.dataset.roll = initialValue.toString();
      dieRef.current.classList.remove(styles["odd-roll"], styles["even-roll"]);
      setCurrentDisplayValue(initialValue);
    }
  }, [initialValue]);

  return (
    <div
      className={styles.dice} // Use CSS module class name
      onClick={performRoll}
      style={{
        cursor:
          disabled || isParentRolling || waitingForResult || pauseAfterStop
            ? "not-allowed"
            : "pointer",
        opacity: disabled ? 0.5 : 1,
        pointerEvents:
          disabled || isParentRolling || waitingForResult || pauseAfterStop ? "none" : "auto",
      }}
      role="button"
      aria-disabled={disabled || waitingForResult || pauseAfterStop}
      tabIndex={0}
      aria-label={
        disabled
          ? "Dice disabled"
          : waitingForResult
            ? "Waiting for roll result"
            : isParentRolling
              ? "Dice rolling"
              : `Dice showing ${currentDisplayValue}, click to roll`
      }
    >
      <ul
        className={styles["die-list"]} // Use CSS module class name (bracket notation for hyphenated)
        ref={dieRef}
        data-roll={currentDisplayValue.toString()}
      >
        {[1, 2, 3, 4, 5, 6].map((side) => (
          <li
            key={side}
            className={styles["die-item"]} // Use CSS module class name
            data-side={side.toString()}
          >
            {Array.from({ length: side }).map((_, i) => (
              <span key={i} className={styles.dot}></span> // Use CSS module class name
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dice;
