import { defineConfig } from 'vite';

// 游戏设计分辨率: 横屏 1280x720 (16:9)
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
});
