import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the MinimalForwarder contract from OpenZeppelin.
 * This is a prerequisite for enabling gasless transactions via EIP-2771.
 * The address of this deployed contract should be passed to the SnakeLadderGame contract constructor.
 */
const DeployMinimalForwarderModule = buildModule(
  "DeployMinimalForwarderModule",
  (m) => {
    console.log("Deploying MyForwarder contract...");

    // The "MinimalForwarder" contract is imported directly from the OpenZeppelin library
    // which is included as a dependency in your Hardhat project.
    const forwarder = m.contract("MyForwarder");

    console.log("MyForwarder deployment transaction sent.");

    return { forwarder };
  }
);

export default DeployMinimalForwarderModule;
