import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./Dice.module.css"; // Import CSS Modules object

interface DiceProps {
  onRollComplete: (value: number) => void;
  isParentRolling: boolean;
  setParentIsRolling: (rolling: boolean) => void;
  initialValue?: number;
  soundSrc?: string; // Optional prop for the sound file source
  disabled?: boolean; // Optional prop to disable rolling
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
}) => {
  const dieRef = useRef<HTMLUListElement>(null);
  const [currentDisplayValue, setCurrentDisplayValue] =
    useState<number>(initialValue);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    // console.log(
    //   "[Dice.tsx] performRoll called. Current isParentRolling prop:",
    //   isParentRolling
    // );
    if (!dieRef.current || isParentRolling || disabled) {
      // console.log(
      //   "[Dice.tsx] performRoll: bailing, dieRef.current:",
      //   !!dieRef.current,
      //   "isParentRolling:",
      //   isParentRolling
      // );
      return;
    }

    // console.log("[Dice.tsx] performRoll: proceeding to roll.");
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

    // Call onRollComplete after animation duration
    // This timeout should roughly match the CSS animation duration
    // The animations are 1.5s and 1.25s. We take the max.
    setTimeout(() => {
      setCurrentDisplayValue(roll);
      onRollCompleteRef.current(roll);
      setParentIsRolling(false); // Set rolling to false after completion
    }, 1500);
  }, [isParentRolling, setParentIsRolling, playSound, styles, disabled]); // Added styles to dependency array

  useEffect(() => {
    setCurrentDisplayValue(initialValue);
    if (dieRef.current) {
      dieRef.current.dataset.roll = initialValue.toString();
      // Ensure CSS module classes are removed if they were somehow added initially
      dieRef.current.classList.remove(styles["odd-roll"], styles["even-roll"]);
    }
  }, [initialValue, styles]); // Added styles to dependency array

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
        cursor: disabled || isParentRolling ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled || isParentRolling ? "none" : "auto",
      }}
      role="button"
      aria-disabled={disabled}
      tabIndex={0}
      aria-label={
        disabled
          ? "Dice disabled"
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
