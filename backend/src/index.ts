import express from 'express';
import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs';
import nodeHtmlToImage from 'node-html-to-image';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.DEPLOYED_ADDRESS_BASE_URL;

// Enable CORS for development
app.use(cors({
    origin: '*' // Allow all origins
}));

// --- Contract Setup ---
const contractInfo = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../src/constants/snakeGameContractInfo.json'),
    'utf-8'
  )
);
const contractABI = contractInfo.abi;
const contractAddress = contractInfo.address;
const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const gameContract = new ethers.Contract(contractAddress, contractABI, provider);

// --- Helper Functions ---
const truncateAddress = (addr: string): string => {
  if (!addr || addr === ethers.ZeroAddress) return 'Waiting...';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

// --- Image Generation ---
async function generateGameImage(gameId: string): Promise<Buffer> {
    console.log('Starting image generation...');
    try {
        const fontPath = path.resolve(__dirname, '../../public/KGRedHands.ttf');
        const imagePath = path.resolve(__dirname, '../../public/wooden_frame.png');

        console.log('Font path:', fontPath);
        console.log('Image path:', imagePath);

        if (!fs.existsSync(fontPath)) {
            throw new Error(`Font file not found at: ${fontPath}`);
        }
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Background image not found at: ${imagePath}`);
        }

        const fontBase64 = fs.readFileSync(fontPath).toString('base64');
        const imageBase64 = fs.readFileSync(imagePath).toString('base64');
        const imageUrl = `data:image/png;base64,${imageBase64}`;

        console.log('Fetching contract data...');
        const roomInfo = await gameContract.getRoomInfo(gameId);
        const playersInRoom = await gameContract.getRoomPlayers(gameId);

        const maxPlayers = Number(roomInfo.maxParticipants);
        const prizePool = ethers.formatUnits(roomInfo.stakeAmount * BigInt(playersInRoom.length), 6);

        console.log('Room data:', { playersInRoom, maxPlayers, prizePool });

        const playerNames: string[] = playersInRoom.map(truncateAddress);
        for (let i = playersInRoom.length; i < maxPlayers; i++) {
            playerNames.push('Waiting...');
        }

        const playerHtml = playerNames
            .map(
                (name: string, index: number) =>
                    `<div style="
                        display: flex;
                        align-items: center;
                        background: rgba(44, 24, 16, 0.8);
                        border-radius: 8px;
                        padding: 8px 12px;
                        border: 2px solid #ffd700;
                        gap: 10px;
                    ">
                        <img
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=${playersInRoom[index] || `slot${index}`}"
                            width="48"
                            height="48"
                            style="
                                border-radius: 50%;
                                border: 2px solid #ffd700;
                                background: #2c1810;
                            "
                        />
                        <span style="
                            font-size: 28px;
                            color: #ffd700;
                            text-shadow: 2px 2px 4px #000;
                            font-family: 'KGRedHands', monospace;
                        ">${name}</span>
                    </div>`
            )
            .join('');
        
        const html = `
            <html>
                <head>
                    <style>
                        @font-face {
                            font-family: 'KGRedHands';
                            src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
                        }
                    </style>
                </head>
                <body style="
                    width: 1200px;
                    height: 630px;
                    margin: 0;
                    font-family: 'KGRedHands', sans-serif; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    background: #2c1810 url('${imageUrl}') center/cover no-repeat;
                    padding: 24px;
                    box-sizing: border-box;
                ">
                    <div style="
                        width: 92%;
                        max-width: 1100px;
                        background: rgba(0,0,0,0.55);
                        border-radius: 15px;
                        padding: 24px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.6);
                    ">
                        <div style="
                            text-align: center;
                            font-size: 60px;
                            color: #ffd700;
                            text-shadow: 2px 2px 4px #000;
                            margin-bottom: 20px;
                        ">
                            Quest #${gameId}
                        </div>
                        <div style="
                            text-align: center;
                            font-size: 36px;
                            color: #ff8c00;
                            margin-bottom: 25px;
                        ">
                            Prize Pool: ${prizePool} USDC
                        </div>
                        <div style="
                            display: flex;
                            flex-wrap: wrap;
                            gap: 14px;
                            justify-content: center;
                        ">
                            ${playerHtml}
                        </div>
                    </div>
                </body>
            </html>
        `;

        console.log('Generating image...');
        const imageBuffer = await nodeHtmlToImage({
            html,
            puppeteerArgs: { 
                args: ['--no-sandbox'],
                defaultViewport: {
                    width: 1200,
                    height: 630
                }
            },
            encoding: 'binary'
        }) as Buffer;
        
        console.log('Image generated successfully');
        return imageBuffer;
    } catch (error: any) {
        console.error('Error generating image:', error);
        throw error;
    }
}

// --- Routes ---
app.get('/game/:gameId', async (req, res) => {
    const { gameId } = req.params;
    console.log('--------------------');
    console.log('Frame request received:');
    console.log('Game ID:', gameId);
    console.log('Headers:', req.headers);
    console.log('User Agent:', req.get('user-agent'));
    console.log('--------------------');
    
    // Check if it's a Farcaster request
    const userAgent = req.get('user-agent') || '';
    const isFarcaster = userAgent.toLowerCase().includes('farcaster');
    console.log('Is Farcaster request:', isFarcaster);
    
    const imageUrl = `${BASE_URL}/game/${gameId}/image`;
    
    try {
        // Generate frame HTML with the new format
        const frameHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Karma Loka - Quest ${gameId}</title>
                
                <!-- Open Graph Tags -->
                <meta property="og:title" content="Karma Loka - Quest ${gameId}" />
                <meta property="og:description" content="Join this epic quest in Karma Loka!" />
                <meta property="og:image" content="${imageUrl}" />
                
                <!-- Farcaster Frame -->
                <meta name="fc:frame" content='{"version":"next","image":{"url":"${imageUrl}","aspectRatio":"1.91:1"},"buttons":[{"label":"🎲 Join My Quest","action":"post","target":"${BASE_URL}/game/${gameId}/join"}],"postUrl":"${BASE_URL}/game/${gameId}/action","input":{"text":"Enter your move (1-6)"}}' />
                
                <!-- Cache Control -->
                <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
            </head>
            <body>
                <img src="${imageUrl}" alt="Quest ${gameId}" style="width: 100%; height: auto;" />
            </body>
            </html>
        `;

        console.log('Sending frame HTML response');
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(frameHtml);
    } catch (error) {
        console.error('Error serving frame:', error);
        res.status(500).send('Error serving frame');
    }
});

app.get('/game/:gameId/image', async (req, res) => {
    const { gameId } = req.params;
    console.log('--------------------');
    console.log('Image request received:');
    console.log('Game ID:', gameId);
    console.log('Headers:', req.headers);
    console.log('--------------------');
    
    try {
        console.log('Generating image...');
        const image = await generateGameImage(gameId);
        console.log('Image generated successfully');
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        return res.send(image);
    } catch (error: any) {
        console.error('Failed to generate image:', error);
        res.status(500).json({ error: 'Failed to generate image', details: (error as Error).message });
    }
});

// Test frame endpoint
app.post('/test-frame', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="https://gsm-guaranteed-longest-particularly.trycloudflare.com/test-image.png" />
                <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
                <meta property="fc:frame:button:1" content="Join Quest" />
                <meta property="fc:frame:post_url" content="https://gsm-guaranteed-longest-particularly.trycloudflare.com/test-frame" />
            </head>
            <body>
                <h1>Frame Test Page</h1>
                <img src="/test-image.png" style="width: 100%; max-width: 600px;" />
            </body>
        </html>
    `);
});

// Test image endpoint
app.get('/test-image.png', async (req, res) => {
  console.log('Generating frame image...');
  try {
    const image = await nodeHtmlToImage({
      html: `
        <html>
          <head>
            <style>
              body {
                width: 1200px;
                height: 628px;
                margin: 0;
                padding: 0;
                background: #2c1810;
              }
              .frame {
                width: 100%;
                height: 100%;
                position: relative;
                background: linear-gradient(rgba(44, 24, 16, 0.95), rgba(44, 24, 16, 0.95)),
                            url('data:image/svg+xml,<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" fill="none"/><circle cx="10" cy="10" r="1" fill="%238b4513"/></svg>');
              }
              .content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                width: 90%;
              }
              .border {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border: 12px solid #8b4513;
                pointer-events: none;
              }
              h1 {
                font-family: Arial, sans-serif;
                font-size: 72px;
                margin: 0 0 20px 0;
                background: linear-gradient(to right, #ffd700, #ff8c00);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
              }
              p {
                font-family: Arial, sans-serif;
                font-size: 36px;
                color: #ff8c00;
                margin: 0;
                line-height: 1.4;
              }
            </style>
          </head>
          <body>
            <div class="frame">
              <div class="border"></div>
              <div class="content">
                <h1>Karma Loka</h1>
                <p>Join the Quest in this Web3 Snakes & Ladders Adventure!</p>
              </div>
            </div>
          </body>
        </html>
      `,
      puppeteerArgs: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: {
          width: 1200,
          height: 628
        }
      },
      type: 'png',
      encoding: 'binary'
    });
    
    // Set proper headers for image serving
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(image);
  } catch (error: any) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image', details: (error as Error).message });
  }
});

// Handle join quest action
app.post('/game/:gameId/join', async (req, res) => {
    const { gameId } = req.params;
    console.log('Join request received for game:', gameId);
    
    try {
        const imageUrl = `${BASE_URL}/game/${gameId}/image`;
        
        // Return a new frame response
        const frameHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Karma Loka - Quest ${gameId}</title>
                
                <!-- Farcaster Frame -->
                <meta name="fc:frame" content='{"version":"next","image":{"url":"${imageUrl}","aspectRatio":"1.91:1"},"buttons":[{"label":"🎲 Roll","action":"post","target":"${BASE_URL}/game/${gameId}/action"}]}' />
            </head>
            <body>
                <img src="${imageUrl}" alt="Quest ${gameId}" style="width: 100%; height: auto;" />
            </body>
            </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(frameHtml);
    } catch (error) {
        console.error('Error handling join:', error);
        res.status(500).send('Error handling join request');
    }
});

// Handle game actions (like rolling dice)
app.post('/game/:gameId/action', async (req, res) => {
    const { gameId } = req.params;
    console.log('Action request received for game:', gameId);
    
    try {
        const imageUrl = `${BASE_URL}/game/${gameId}/image`;
        
        // Return updated frame response
        const frameHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Karma Loka - Quest ${gameId}</title>
                
                <!-- Farcaster Frame -->
                <meta name="fc:frame" content='{"version":"next","image":{"url":"${imageUrl}","aspectRatio":"1.91:1"},"buttons":[{"label":"🎲 Roll Again","action":"post","target":"${BASE_URL}/game/${gameId}/action"}]}' />
            </head>
            <body>
                <img src="${imageUrl}" alt="Quest ${gameId}" style="width: 100%; height: auto;" />
            </body>
            </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(frameHtml);
    } catch (error) {
        console.error('Error handling action:', error);
        res.status(500).send('Error handling game action');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
    console.log(`🌍 Using base URL: ${BASE_URL}`);
}); 