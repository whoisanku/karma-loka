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
  const [display, setDisplay] = useState(initialValue);
  const tick = useRef<NodeJS.Timeout>();
  const continuousRollTick = useRef<NodeJS.Timeout>();
  const [pauseAfterStop, setPauseAfterStop] = useState(false);

  // Effect for handling spinning state
  useEffect(() => {
    if (spinning) {
      // start an interval that re-applies the CSS roll class every 400 ms
      tick.current = setInterval(() => {
        const roll = getRandomNumber(1, 6);
        dieRef.current!.dataset.roll = roll.toString();
      }, 400);
    } else {
      clearInterval(tick.current);
      // Stop any continuous rolling and apply final face
      if (dieRef.current && stopAt != null) {
        // Remove previous roll classes and add even-roll for final transform
        dieRef.current.classList.remove(styles['odd-roll'], styles['even-roll']);
        dieRef.current.classList.add(styles['even-roll']);
        dieRef.current.dataset.roll = stopAt.toString();
        setDisplay(stopAt);
        // Pause interactions for 3 seconds
        setPauseAfterStop(true);
        setTimeout(() => setPauseAfterStop(false), 3000);
      }
    }
    return () => clearInterval(tick.current);
  }, [spinning, stopAt]);

  // Effect to handle continuous rolling while waiting for transaction result
  useEffect(() => {
    if (waitingForResult && dieRef.current) {
      // Don't clear existing spinning animation
      if (!continuousRollTick.current) {
        const dieElement = dieRef.current;

        // Make sure the dice is in rolling animation state
        const isCurrentlyOdd = dieElement.classList.contains(
          styles["odd-roll"]
        );
        dieElement.classList.remove(
          isCurrentlyOdd ? styles["odd-roll"] : styles["even-roll"]
        );
        dieElement.classList.add(
          isCurrentlyOdd ? styles["even-roll"] : styles["odd-roll"]
        );

        // Start continuous rolling animation
        continuousRollTick.current = setInterval(() => {
          const roll = getRandomNumber(1, 6);
          dieElement.dataset.roll = roll.toString();
        }, 400);
      }
    } else {
      // Clear continuous rolling when not waiting
      if (continuousRollTick.current) {
        clearInterval(continuousRollTick.current);
        continuousRollTick.current = undefined;
      }
    }

    return () => {
      if (continuousRollTick.current) {
        clearInterval(continuousRollTick.current);
        continuousRollTick.current = undefined;
      }
    };
  }, [waitingForResult, styles]);

  // console.log("[Dice.tsx] Render/Re-render. isParentRolling:", isParentRolling);

  const onRollCompleteRef = useRef(onRollComplete);
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  const playSound = useCallback(() => {
    if (soundSrc) {
      if (!audioRef.current) {
        audioRef.current = new Audio(soundSrc);
      }
      // Ensure sound plays from the beginning if it was already played
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((error) => console.error("Error playing sound:", error));
    }
  }, [soundSrc]);

  const performRoll = useCallback(() => {
    if (!dieRef.current || isParentRolling || disabled || waitingForResult) {
      return;
    }

    setParentIsRolling(true);
    playSound(); // Play the sound effect

    const dieElement = dieRef.current;
    // Use CSS module class names
    const isCurrentlyOdd = dieElement.classList.contains(styles["odd-roll"]);
    dieElement.classList.remove(
      isCurrentlyOdd ? styles["odd-roll"] : styles["even-roll"]
    );
    dieElement.classList.add(
      isCurrentlyOdd ? styles["even-roll"] : styles["odd-roll"]
    );

    const roll = getRandomNumber(1, 6);
    dieElement.dataset.roll = roll.toString();

    // Call onRollComplete with the visual roll value
    onRollCompleteRef.current(roll);
  }, [
    isParentRolling,
    setParentIsRolling,
    playSound,
    styles,
    disabled,
    waitingForResult,
  ]);

  useEffect(() => {
    setCurrentDisplayValue(initialValue);
    if (dieRef.current) {
      dieRef.current.dataset.roll = initialValue.toString();
      // Ensure CSS module classes are removed if they were somehow added initially
      dieRef.current.classList.remove(styles["odd-roll"], styles["even-roll"]);
    }
  }, [initialValue, styles]);

  const faces = [
    { side: 1, dots: 1 },
    { side: 2, dots: 2 },
    { side: 3, dots: 3 },
    { side: 4, dots: 4 },
    { side: 5, dots: 5 },
    { side: 6, dots: 6 },
  ];

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
        {faces.map((face) => (
          <li
            className={styles["die-item"]} // Use CSS module class name
            data-side={face.side.toString()}
            key={face.side}
          >
            {Array.from({ length: face.dots }).map((_, i) => (
              <span className={styles.dot} key={i}></span> // Use CSS module class name
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dice;
