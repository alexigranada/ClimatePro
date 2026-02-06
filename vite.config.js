import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ClimatePro/', // Esto es importante
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
