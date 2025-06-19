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
const FRONTEND_URL = process.env.FRONTEND_URL;

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

const FARCASTER_API_URL =
  'https://build.wield.xyz/farcaster/v2/user-by-connected-address';
const FARCASTER_API_KEY = 'L60RP-AMTZV-O48J1-1N4H8-UVRDQ';

async function fetchFarcasterProfile(address: string) {
  try {
    const res = await fetch(`${FARCASTER_API_URL}?address=${address}`, {
      headers: { 'API-KEY': FARCASTER_API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.result?.user;
    if (!user) return null;
    return { username: user.username as string, pfp: user.pfp?.url as string };
  } catch (err) {
    console.error('[Backend] Failed to fetch Farcaster profile', err);
    return null;
  }
}

// --- Image Generation ---
async function generateGameImage(gameId: string): Promise<Buffer> {
    console.log('Starting image generation...');
    try {
        const fontPath = path.resolve(__dirname, '../../public/KGRedHands.ttf');

        console.log('Font path:', fontPath);

        if (!fs.existsSync(fontPath)) {
            throw new Error(`Font file not found at: ${fontPath}`);
        }

        const fontBase64 = fs.readFileSync(fontPath).toString('base64');

        console.log('Fetching contract data...');
        const roomInfo = await gameContract.getRoomInfo(gameId);
        const playersInRoom = await gameContract.getRoomPlayers(gameId);

        const maxPlayers = Number(roomInfo.maxParticipants);
        const prizePool = ethers.formatUnits(roomInfo.stakeAmount * BigInt(playersInRoom.length), 6);

        console.log('Room data:', { playersInRoom, maxPlayers, prizePool });

        const playerInfos = await Promise.all(
            playersInRoom.map(async (addr) => {
                const profile = await fetchFarcasterProfile(addr);
                return {
                    displayName: profile?.username ?? truncateAddress(addr),
                    avatar: profile?.pfp ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${addr}`
                };
            })
        );

        for (let i = playersInRoom.length; i < maxPlayers; i++) {
            playerInfos.push({
                displayName: 'Waiting...',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=slot${i}`
            });
        }

        const playerHtml = playerInfos
            .map(
                (p) =>
                    `<div style="
                        display: flex;
                        align-items: center;
                        background: rgba(44, 24, 16, 0.9);
                        border-radius: 10px;
                        padding: 8px 12px;
                        margin-bottom: 8px;
                        border: 1px solid #ffd700;
                    ">
                        <img
                            src="${p.avatar}"
                            width="40"
                            height="40"
                            style="
                                border-radius: 50%;
                                margin-right: 12px;
                                border: 2px solid #ffd700;
                                background: #2c1810;
                            "
                        />
                        <span style="
                            font-size: 24px;
                            font-weight: bold;
                            color: #ffd700;
                            text-shadow: 2px 2px 4px #000;
                        ">${p.displayName}</span>
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
                    width: 600px; 
                    height: 315px; 
                    margin: 0;
                    font-family: 'KGRedHands', sans-serif; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    background: linear-gradient(135deg, #111, #222);
                    padding: 20px;
                    box-sizing: border-box;
                ">
                    <div style="
                        width: 100%;
                        max-width: 500px;
                        background: rgba(44, 24, 16, 0.85); 
                        border-radius: 15px;
                        padding: 15px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                    ">
                        <div style="
                            text-align: center;
                            font-size: 28px;
                            color: #ffd700;
                            text-shadow: 2px 2px 4px #000;
                            margin-bottom: 15px;
                            border-bottom: 2px solid #ffd700;
                            padding-bottom: 10px;
                        ">
                            Quest #${gameId} • ${prizePool} USDC
                        </div>
                        <div style="
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
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
                    width: 600,
                    height: 315
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
                <meta name="fc:frame" content='${JSON.stringify({
                    version: "next",
                    image: { url: imageUrl, aspectRatio: "1.91:1" },
                    button: {
                        title: "🎲 Join My Quest",
                        action: {
                            type: "launch_frame",
                            name: "Karma Loka",
                            url: `${FRONTEND_URL}/explore?join=${gameId}`,
                            splashImageUrl: imageUrl,
                            splashBackgroundColor: "#954520"
                        }
                    }
                })}' />
                
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
                <meta name="fc:frame" content='${JSON.stringify({
                    version: "next",
                    image: { url: imageUrl, aspectRatio: "1.91:1" },
                    button: {
                        title: "🎲 Roll",
                        action: {
                            type: "launch_frame",
                            name: "Karma Loka",
                            url: `${FRONTEND_URL}/game/${gameId}`,
                            splashImageUrl: imageUrl,
                            splashBackgroundColor: "#954520"
                        }
                    }
                })}' />
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
                <meta name="fc:frame" content='${JSON.stringify({
                    version: "next",
                    image: { url: imageUrl, aspectRatio: "1.91:1" },
                    button: {
                        title: "🎲 Roll Again",
                        action: {
                            type: "launch_frame",
                            name: "Karma Loka",
                            url: `${FRONTEND_URL}/game/${gameId}`,
                            splashImageUrl: imageUrl,
                            splashBackgroundColor: "#954520"
                        }
                    }
                })}' />
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