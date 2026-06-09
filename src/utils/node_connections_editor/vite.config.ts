import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      ...require('@rolldown/plugin-babel').default({ presets: [reactCompilerPreset()] }),
      apply: 'build'
    } as any
  ],
})
