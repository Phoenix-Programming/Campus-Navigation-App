import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
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
			"@assets": path.resolve(process.cwd(), "./src/assets"),
			"@features": path.resolve(process.cwd(), "./src/features"),
			"@shared": path.resolve(process.cwd(), "./src/shared")
		}
	}
});
