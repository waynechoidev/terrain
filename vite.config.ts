import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

const config = defineConfig({
  base: "/terrain/",
  server: {
    port: 8888,
  },
  plugins: [glsl()],
  resolve: {
    alias: [{ find: "@", replacement: "/src" }],
  },
});

export default config;
