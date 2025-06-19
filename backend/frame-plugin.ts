import { Plugin, ViteDevServer } from "vite";
import { IncomingMessage, ServerResponse } from "http";
import { ethers } from "ethers";
import path from "path";
import fs from "fs";
import nodeHtmlToImage from "node-html-to-image";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get base URL from environment variables
const BASE_URL = process.env.DEPLOYED_ADDRESS_BASE_URL;

// --- Contract Setup ---
const contractInfo = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../src/constants/snakeGameContractInfo.json"),
    "utf-8"
  )
);
const contractABI = contractInfo.abi;
const contractAddress = contractInfo.address;
const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const gameContract = new ethers.Contract(
  contractAddress,
  contractABI,
  provider
);

// --- Helper Functions ---
const truncateAddress = (addr: string): string => {
  if (!addr || addr === ethers.ZeroAddress) return "Waiting...";
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

const isFarcaster = (req: IncomingMessage): boolean => {
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  // Check for both Farcaster and common preview bots
  return (
    userAgent.includes("farcaster") ||
    userAgent.includes("bot") ||
    userAgent.includes("preview") ||
    userAgent.includes("probe") ||
    userAgent.includes("telegram") ||
    userAgent.includes("whatsapp") ||
    userAgent.includes("twitter")
  );
};

// Add URL normalization helper
const normalizeUrl = (base: string, path: string): string => {
  // Remove trailing slash from base and leading slash from path
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  // Ensure there's exactly one slash between base and path
  return `${cleanBase}/${cleanPath}`;
};

const FARCASTER_API_URL =
  "https://build.wield.xyz/farcaster/v2/user-by-connected-address";
const FARCASTER_API_KEY = "L60RP-AMTZV-O48J1-1N4H8-UVRDQ";

async function fetchFarcasterProfile(address: string) {
  try {
    const res = await fetch(`${FARCASTER_API_URL}?address=${address}`, {
      headers: { "API-KEY": FARCASTER_API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.result?.user;
    if (!user) return null;
    return { username: user.username as string, pfp: user.pfp?.url as string };
  } catch (err) {
    console.error("[Frame Plugin] Failed to fetch Farcaster profile", err);
    return null;
  }
}

// --- Image Generation ---
async function generateGameImage(gameId: string): Promise<Buffer> {
  try {
    const fontPath = path.resolve(__dirname, "../public/KGRedHands.ttf");

    if (!fs.existsSync(fontPath)) {
      throw new Error(`Font file not found at: ${fontPath}`);
    }

    const fontBase64 = fs.readFileSync(fontPath).toString("base64");

    const room = await gameContract.getRoom(gameId);
    const playersInRoom = room.players as string[];
    const maxPlayers = Number(room.maxPlayers);
    const prizePool = ethers.formatUnits(room.prizePool, 6);

    const playerInfos = await Promise.all(
      playersInRoom.map(async (addr) => {
        const profile = await fetchFarcasterProfile(addr);
        return {
          displayName: profile?.username ?? truncateAddress(addr),
          avatar:
            profile?.pfp ??
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${addr}`,
        };
      })
    );

    for (let i = playersInRoom.length; i < maxPlayers; i++) {
      playerInfos.push({
        displayName: "Waiting...",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=slot${i}`,
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
                        padding: 12px;
                        margin-bottom: 10px;
                        border: 2px solid #ffd700;
                        width: 100%;
                    ">
                        <img
                            src="${p.avatar}"
                            width="32"
                            height="32"
                            style="
                                border-radius: 50%;
                                margin-right: 12px;
                                border: 2px solid #ffd700;
                                background: #2c1810;
                            "
                        />
                        <span style="
                            font-size: 20px;
                            color: #ffd700;
                            text-shadow: 2px 2px 4px #000;
                            font-family: 'KGRedHands', monospace;
                        ">${p.displayName}</span>
                    </div>`
      )
      .join("");

    const html = `
            <html>
                <head>
                    <style>
                        @font-face {
                            font-family: 'KGRedHands';
                            src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            width: 600px;
                            height: 315px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            background: linear-gradient(135deg, #111, #222);
                        }
                        .container {
                            width: 90%;
                            max-width: 500px;
                            background: rgba(17, 17, 17, 0.85);
                            border-radius: 15px;
                            padding: 20px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
                        }
                        .title {
                            text-align: center;
                            font-family: 'KGRedHands', sans-serif;
                            font-size: 32px;
                            color: #ffd700;
                            text-shadow: 2px 2px 4px #000;
                            margin-bottom: 20px;
                            padding-bottom: 15px;
                            border-bottom: 2px solid #ffd700;
                        }
                        .players-container {
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                            padding: 10px;
                            background: rgba(0, 0, 0, 0.3);
                            border-radius: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="title">Quest #${gameId} • ${prizePool} USDC</div>
                        <div class="players-container">
                            ${playerHtml}
                        </div>
                    </div>
                </body>
            </html>
        `;

    return (await nodeHtmlToImage({
      html,
      puppeteerArgs: {
        args: ["--no-sandbox"],
        defaultViewport: {
          width: 600,
          height: 315,
        },
      },
      encoding: "binary",
    })) as Buffer;
  } catch (error) {
    console.error("[Frame Plugin] Error in generateGameImage:", error);
    throw error;
  }
}

// --- Middleware Logic ---
async function frameMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: any) => void
) {
  try {
    // We only care about the path for routing, so we strip any query parameters.
    const pathname = (req.url || "").split("?")[0].replace(/\/+/g, "/");

    const gameIdRegex = /^\/game\/(\d+)\/?$/;
    const match = pathname.match(gameIdRegex);

    // Handle initial frame request for a specific game
    if (match) {
      const gameId = match[1];
      const imageUrl = `${BASE_URL}/game/${gameId}/image`;

      // Correct, spec-compliant metadata for a rich, vertical frame.
      const frameHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Karma Loka - Quest ${gameId}</title>

    <!-- Open Graph Tags for rich previews -->
    <meta property="og:title" content="Karma Loka - Quest ${gameId}" />
    <meta property="og:description" content="Join this epic quest in Karma Loka!" />
    <meta property="og:image" content="${imageUrl}" />

    <!-- Dynamic Farcaster Frame -->
    <meta name="fc:frame" content='${JSON.stringify({
      version: "next",
      image: {
        url: imageUrl,
        aspectRatio: "1:1",
      },
      buttons: [
        {
          label: "🎲 Join Quest",
          action: "post",
          target: `${BASE_URL}/game/${gameId}/join`,
        },
      ],
      postUrl: `${BASE_URL}/game/${gameId}/action`,
      input: {
        text: "Enter your move (1-6)",
      },
    })}' />

    <!-- Cache control for dynamic image -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
</head>
<body>
    <img src="${imageUrl}" alt="Quest ${gameId}" style="width: 100%; height: auto;" />
</body>
</html>`;

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cache-Control", "no-store");
      res.statusCode = 200;
      return res.end(frameHtml);
    }

    // Handle image generation request
    const imageRegex = /^\/game\/(\d+)\/image\/?$/;
    const imageMatch = pathname.match(imageRegex);
    if (imageMatch) {
      const gameId = imageMatch[1];
      try {
        const image = await generateGameImage(gameId);
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        res.statusCode = 200;
        return res.end(image);
      } catch (error) {
        console.error("[Frame Plugin] Failed to generate image:", error);
        res.statusCode = 500;
        return res.end("Error generating game image");
      }
    }

    next();
  } catch (error) {
    console.error("[Frame Plugin] Unexpected error in middleware:", error);
    next(error);
  }
}

// --- Vite Plugin Definition ---
export function framePlugin(): Plugin {
  return {
    name: "frame-plugin",
    configureServer(server: ViteDevServer) {
      console.log("[Frame Plugin] Configuring server middleware...");
      server.middlewares.use((req, res, next) => {
        frameMiddleware(req as IncomingMessage, res, next).catch(next);
      });
      console.log("[Frame Plugin] Server middleware configured successfully");
    },
  };
}
