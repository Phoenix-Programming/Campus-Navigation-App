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
			'@public': path.resolve(process.cwd(), "./frontend/public"),
			"@indoors": path.resolve(process.cwd(), "./frontend/public/data/indoors"),
			"@outdoors": path.resolve(process.cwd(), "./frontend/public/data/outdoors"),
			"@metadata": path.resolve(process.cwd(), "./frontend/public/data/metadata"),
			"@frontend": path.resolve(process.cwd(), "./frontend"),
			"@assets": path.resolve(process.cwd(), "./frontend/assets"),
			"@components": path.resolve(process.cwd(), "./frontend/components"),
			"@features": path.resolve(process.cwd(), "./frontend/features"),
			"@hooks": path.resolve(process.cwd(), "./frontend/hooks"),
			"@pages": path.resolve(process.cwd(), "./frontend/pages"),
			"@services": path.resolve(process.cwd(), "./frontend/services"),
			"@styles": path.resolve(process.cwd(), "./frontend/styles"),
			"@types": path.resolve(process.cwd(), "./frontend/types"),
			"@utils": path.resolve(process.cwd(), "./frontend/utils"),
		}
	}
});
