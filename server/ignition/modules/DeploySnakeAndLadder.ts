import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "dotenv/config"; // To load .env variables

const SnakeAndLadderModule = buildModule("SnakeAndLadderModule", (m) => {
  // Get the stake token address from environment variables
  // Fallback to an empty string if not set, but deployment will likely fail without it.
  const stakeTokenAddress = m.getParameter(
    "stakeToken",
    process.env.STAKE_TOKEN_ADDRESS || ""
  );

  // Ensure stakeTokenAddress is provided
  if (!stakeTokenAddress) {
    throw new Error(
      "STAKE_TOKEN_ADDRESS is not set in the .env file or provided as a parameter."
    );
  }

  // Deploy the SnakeGame contract (from SnakeLadderGame.sol)
  // It expects the stake token address as its constructor argument
  const snakeGame = m.contract("SnakeGame", [stakeTokenAddress]);

  return { snakeGame };
});

export default SnakeAndLadderModule;
