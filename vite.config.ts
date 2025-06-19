import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { framePlugin } from './backend/frame-plugin';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), framePlugin()],
    server: {
      allowedHosts: true
    }
});
