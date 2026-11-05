import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths so the build works on GitHub Pages under /<repo>/ or at a domain root.
  base: "./",
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
