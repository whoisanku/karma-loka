import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PiUsersFill, PiUsersThreeFill, PiUsersFourFill } from "react-icons/pi";
import type { SDKUser } from "../../types";

interface CreateGamePageProps {
  fcUser: SDKUser | null;
  handleButtonClick: () => void;
}

export default function CreateGamePage({
  fcUser,
  handleButtonClick,
}: CreateGamePageProps) {
  const navigate = useNavigate();
  const [gameName, setGameName] = useState("");
  const [prizeAmount, setPrizeAmount] = useState<number | string>("");
  const [selectedPlayers, setSelectedPlayers] = useState<number>(4);

  const defaultRoomName = fcUser
    ? `${fcUser.username}\'s room`
    : "Adventurer\'s room";

  useEffect(() => {
    // Set initial game name if fcUser is available, but allow user to change it
    // This doesn't set it as a locked default, but as an initial suggestion.
    // If the user clears the input, the placeholder will show the default name.
  }, [fcUser]);

  const handleCreateGame = () => {
    // Logic to create the game will go here
    console.log({
      name: gameName || defaultRoomName,
      prize: Number(prizeAmount),
      players: selectedPlayers,
    });
    handleButtonClick();
    // Navigate to the game room or back to explore page after creation
    navigate("/explore"); // Or to a new game lobby page
  };

  const handleCancel = () => {
    handleButtonClick();
    navigate("/explore");
  };

  const playerOptions = [
    {
      value: 2,

      icon: <PiUsersFill className="w-5 h-5 inline mr-2" />,
    },
    {
      value: 3,

      icon: <PiUsersThreeFill className="w-5 h-5 inline mr-2" />,
    },
    {
      value: 4,
      icon: <PiUsersFourFill className="w-5 h-5 inline mr-2" />,
    },
  ];

  return (
    <div className="mx-auto mt-2 max-w-xl text-center space-y-6 pb-20">
      <div className="p-6 space-y-5 ">
        {/* Game Name */}
        <div>
          <label
            htmlFor="gameName"
            className="block text-base font-medium text-[#ffd700] mb-1 text-left"
          >
            Quest Name
          </label>
          <input
            type="text"
            id="gameName"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder={defaultRoomName}
            className="w-full p-2.5 bg-[#2c1810] border border-[#8b4513] rounded-md text-white focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] outline-none"
          />
        </div>

        {/* Prize Pool */}
        <div>
          <label
            htmlFor="prizeAmount"
            className="block text-base font-medium text-[#ffd700] mb-1 text-left"
          >
            Prize Pool (USDC)
          </label>
          <input
            type="number"
            id="prizeAmount"
            value={prizeAmount}
            onChange={(e) =>
              setPrizeAmount(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            placeholder="e.g., 50"
            min="0"
            className="w-full p-2.5 bg-[#2c1810] border border-[#8b4513] rounded-md text-white focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Number of Players */}
        <div>
          <label className="block text-base font-medium text-[#ffd700] mb-2 text-left">
            Max Adventurers
          </label>
          <div className="flex bg-[#2c1810] rounded-md gap-x-2">
            {playerOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedPlayers(option.value);
                  handleButtonClick();
                }}
                className={` w-full items-center justify-center p-2.5 rounded-md text-md transition-colors duration-200
                            ${
                              selectedPlayers === option.value
                                ? "bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#2c1810] border-2 border-transparent"
                                : "bg-[#1a0f09] hover:bg-[#3a251a] text-white border-2 border-[#8b4513]"
                            }`}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={handleCreateGame}
            className="w-full px-6 py-2.5 text-sm font-normal text-[#2c1810] uppercase rounded-md 
                       bg-gradient-to-r from-[#ffd700] to-[#ff8c00] 
                       border-2 border-[#8b4513] shadow-md
                       hover:from-[#ffed4a] hover:to-[#ffa500] transition-colors duration-300
                       disabled:opacity-50"
            disabled={!prizeAmount || Number(prizeAmount) <= 0}
          >
            Create Quest
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="w-full px-6 py-2.5 text-sm font-normal text-white uppercase rounded-md 
                       bg-[#2c1810] border-2 border-[#8b4513]
                       hover:bg-[#3a251a] hover:border-[#ffd700] transition-colors duration-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
