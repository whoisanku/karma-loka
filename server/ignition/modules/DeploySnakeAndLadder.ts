import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import "dotenv/config"; // To load .env variables

const SnakeAndLadderModule = buildModule("SnakeAndLadderModule", (m) => {
  // Get parameters from environment variables
  const stakeTokenAddress = m.getParameter(
    "stakeToken",
    process.env.STAKE_TOKEN_ADDRESS || ""
  );
  const forwarderAddress = m.getParameter(
    "forwarder",
    process.env.FORWARDER_ADDRESS || ""
  );

  // Ensure required addresses are provided
  if (!stakeTokenAddress) {
    throw new Error(
      "STAKE_TOKEN_ADDRESS is not set in the .env file or provided as a parameter."
    );
  }
  if (!forwarderAddress) {
    throw new Error(
      "FORWARDER_ADDRESS is not set in the .env file or provided as a parameter."
    );
  }

  // Deploy the SnakeGame contract
  const snakeGame = m.contract("SnakeGame", [stakeTokenAddress, forwarderAddress]);

  return { snakeGame };
});

export default SnakeAndLadderModule;
