const fs = require('fs');
const path = require('path');

// Define paths
const projectRoot = path.resolve(__dirname, '../../'); // Resolves to /home/yogesh/Documents/nester/karma-loka
const serverRoot = path.join(projectRoot, 'server');

const artifactsDir = path.join(serverRoot, 'ignition', 'deployments', 'chain-84532', 'artifacts');
const deploymentsDir = path.join(serverRoot, 'ignition', 'deployments', 'chain-84532');

const abiFilePath = path.join(artifactsDir, 'SnakeAndLadderModule#SnakeGame.json');
const addressFilePath = path.join(deploymentsDir, 'deployed_addresses.json');

const outputDir = path.join(projectRoot, 'src', 'constants');
const outputFilePath = path.join(outputDir, 'snakeGameContractInfo.json');

const contractIdentifier = 'SnakeAndLadderModule#SnakeGame';

try {
    // Read address file
    if (!fs.existsSync(addressFilePath)) {
        console.error(`Error: Address file not found at ${addressFilePath}`);
        process.exit(1);
    }
    const addressFileContent = fs.readFileSync(addressFilePath, 'utf8');
    const addresses = JSON.parse(addressFileContent);
    const contractAddress = addresses[contractIdentifier];

    if (!contractAddress) {
        console.error(`Error: Address for ${contractIdentifier} not found in ${addressFilePath}`);
        process.exit(1);
    }

    // Read ABI file
    if (!fs.existsSync(abiFilePath)) {
        console.error(`Error: ABI file not found at ${abiFilePath}`);
        process.exit(1);
    }
    const abiFileContent = fs.readFileSync(abiFilePath, 'utf8');
    const artifact = JSON.parse(abiFileContent);
    const contractAbi = artifact.abi;

    if (!contractAbi) {
        console.error(`Error: ABI not found in ${abiFilePath}`);
        process.exit(1);
    }

    // Prepare output data
    const outputData = {
        address: contractAddress,
        abi: contractAbi,
    };

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Created directory: ${outputDir}`);
    }

    // Write output file
    fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log(`Successfully wrote contract info to ${outputFilePath}`);

} catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
}
