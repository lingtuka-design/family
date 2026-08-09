import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In both dev and production, the app connects directly to the live Cloudflare Worker API.
export default defineConfig({
  plugins: [react()],
});
