import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./tests/setupTests.ts",
		coverage: {
			enabled: true,
			reporter: ["text", "json-summary", "html"],
			thresholds: {
				statements: 70,
				branches: 70,
				functions: 70,
				lines: 70
			}
		}
	},
	resolve: {
		alias: {
			'@': path.resolve(process.cwd(), "./"),
			'@public': path.resolve(process.cwd(), "./public"),
			"@indoors": path.resolve(process.cwd(), "./public/data/indoors"),
			"@outdoors": path.resolve(process.cwd(), "./public/data/outdoors"),
			"@metadata": path.resolve(process.cwd(), "./public/data/metadata"),
			"@src": path.resolve(process.cwd(), "./src"),
			"@assets": path.resolve(process.cwd(), "./src/assets"),
			"@components": path.resolve(process.cwd(), "./src/components"),
			"@features": path.resolve(process.cwd(), "./src/features"),
			"@hooks": path.resolve(process.cwd(), "./src/hooks"),
			"@pages": path.resolve(process.cwd(), "./src/pages"),
			"@services": path.resolve(process.cwd(), "./src/services"),
			"@styles": path.resolve(process.cwd(), "./src/styles"),
			"@types": path.resolve(process.cwd(), "./src/types"),
			"@utils": path.resolve(process.cwd(), "./src/utils"),
		}
	}
});
