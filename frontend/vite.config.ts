import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from '@rolldown/plugin-babel'
import path from "path";

export default defineConfig({
	plugins: [
		react(),
		babel({
			presets: [reactCompilerPreset()],
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(process.cwd(), "./"),
			"@public": path.resolve(process.cwd(), "./public"),
			"@assets": path.resolve(process.cwd(), "./src/assets"),
			"@features": path.resolve(process.cwd(), "./src/features"),
			"@shared": path.resolve(process.cwd(), "./src/shared")
		}
	}
});
