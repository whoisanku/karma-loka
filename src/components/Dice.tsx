import React, { useState, useRef, useEffect, useCallback } from "react";
import "./Dice.css"; // Import the CSS

interface DiceProps {
  onRollComplete: (value: number) => void;
  isParentRolling: boolean;
  setParentIsRolling: (rolling: boolean) => void;
  initialValue?: number;
  soundSrc?: string; // Optional prop for the sound file source
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
}) => {
  const dieRef = useRef<HTMLUListElement>(null);
  const [currentDisplayValue, setCurrentDisplayValue] =
    useState<number>(initialValue);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  console.log("[Dice.tsx] Render/Re-render. isParentRolling:", isParentRolling);

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
    console.log(
      "[Dice.tsx] performRoll called. Current isParentRolling prop:",
      isParentRolling
    );
    if (!dieRef.current || isParentRolling) {
      console.log(
        "[Dice.tsx] performRoll: bailing, dieRef.current:",
        !!dieRef.current,
        "isParentRolling:",
        isParentRolling
      );
      return;
    }

    console.log("[Dice.tsx] performRoll: proceeding to roll.");
    setParentIsRolling(true);
    playSound(); // Play the sound effect

    const dieElement = dieRef.current;
    const isCurrentlyOdd = dieElement.classList.contains("odd-roll");
    dieElement.classList.remove(isCurrentlyOdd ? "odd-roll" : "even-roll");
    dieElement.classList.add(isCurrentlyOdd ? "even-roll" : "odd-roll");

    const roll = getRandomNumber(1, 6);
    dieElement.dataset.roll = roll.toString();
  }, [isParentRolling, setParentIsRolling, playSound]);

  useEffect(() => {
    setCurrentDisplayValue(initialValue);
    if (dieRef.current) {
      dieRef.current.dataset.roll = initialValue.toString();
      dieRef.current.classList.remove("odd-roll", "even-roll");
    }
  }, [initialValue]);

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
      className="dice"
      onClick={performRoll}
      style={{
        cursor: isParentRolling ? "not-allowed" : "pointer",
      }}
      role="button"
      tabIndex={0}
      aria-label={
        isParentRolling
          ? "Dice rolling"
          : `Dice showing ${currentDisplayValue}, click to roll`
      }
    >
      <ul
        className="die-list"
        ref={dieRef}
        data-roll={currentDisplayValue.toString()}
      >
        {faces.map((face) => (
          <li
            className="die-item"
            data-side={face.side.toString()}
            key={face.side}
          >
            {Array.from({ length: face.dots }).map((_, i) => (
              <span className="dot" key={i}></span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dice;
