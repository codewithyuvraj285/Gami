import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './' + HashRouter => works on GitHub Pages under any repo name.
export default defineConfig({ base: './', plugins: [react()] })
