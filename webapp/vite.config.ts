import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" lets the built site be served from any sub-path (GitHub Pages, a folder, etc.)
export default defineConfig({ base: "./", plugins: [react()] });
