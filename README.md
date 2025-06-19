# Farcaster Frame Mini App

This is a [Vite](https://vitejs.dev) project bootstrapped with [`@farcaster/create-mini-app`](https://github.com/farcasterxyz/frames/tree/main/packages/create-mini-app).

## Getting Started

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

## Local Testing with Cloudflare Tunnel

To test your Frames locally with Farcaster, you'll need to expose your local development server to the internet. Cloudflare Tunnel is recommended for this purpose.

1. Install Cloudflare CLI (cloudflared):

```bash
# For macOS using Homebrew
brew install cloudflare/cloudflare/cloudflared

# For other platforms, visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation
```

2. Start a Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:5173

cloudflared tunnel --url http://localhost:3000
```

3. Copy the generated `.trycloudflare.com` URL - this will be your Frame's public URL.

## Farcaster Frame Configuration

### 1. Frame Metadata

Add the `fc:frame` meta tag in `index.html`:

```html
<head>
  <!-- other tags -->
  <meta
    name="fc:frame"
    content='{
    "version": "vNext",
    "imageUrl": "YOUR_IMAGE_URL",
    "buttons": [
      {
        "label": "Click me!",
        "action": "post"
      }
    ],
    "postUrl": "YOUR_CLOUDFLARE_TUNNEL_URL/api/frame"
  }'
  />
</head>
```

### 2. Testing with Warpcast

1. Go to [Warpcast Developer Hub](https://warpcast.com/~/developers)
2. Use the Frame Validator to test your Frame:
   - Enter your Cloudflare Tunnel URL
   - Click "Validate Frame"
   - Test different user interactions

### 3. Frame Configuration File

The `/.well-known/farcaster.json` is served from the [public directory](https://vitejs.dev/guide/assets). Update it by editing `./public/.well-known/farcaster.json`:

```json
{
  "frames": {
    "version": "vNext",
    "image": "YOUR_IMAGE_URL",
    "buttons": [
      {
        "label": "Click me!",
        "action": "post"
      }
    ],
    "postUrl": "YOUR_CLOUDFLARE_TUNNEL_URL/api/frame"
  }
}
```

## Development Tips

1. **Frame Requirements:**

   - Images must be less than 10MB
   - Recommended image dimensions: 1200x630px
   - Support PNG, JPEG, GIF formats
   - Frame response time should be under 5 seconds

2. **Testing Tools:**

   - Use [Frame Validator](https://warpcast.com/~/developers) for quick testing
   - Test different screen sizes and devices
   - Verify button actions work as expected

3. **Debugging:**
   - Check Network tab in browser DevTools
   - Verify Cloudflare Tunnel is running
   - Ensure all API endpoints return proper Frame metadata

## Wagmi Configuration

This project uses Wagmi for Ethereum interactions. The configuration in `src/wagmi.ts` includes:

- Base and Mainnet chain support
- Farcaster Frame connector
- HTTP transport configuration

## Deployment

1. Build your project:

```bash
npm run build
# or
yarn build
```

2. Deploy to your preferred hosting platform (Vercel, Netlify, etc.)
3. Update Frame URLs to use your production domain
4. Test the deployed Frame using Warpcast Developer Hub

## Additional Resources

- [Farcaster Frames Documentation](https://docs.farcaster.xyz/reference/frames/spec)
- [Warpcast Developer Hub](https://warpcast.com/~/developers)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps)
- [Vite Documentation](https://vitejs.dev)
