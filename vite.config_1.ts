import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Ensure apiKey is a string to prevent JSON.stringify(undefined) which can break variable replacement
  const apiKey = env.API_KEY || '';

  return {
    plugins: [react()],
    // Define global constants to replace process.env.API_KEY in the client code
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1600,
    }
  };
});