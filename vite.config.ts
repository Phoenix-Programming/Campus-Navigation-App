import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
	base: "/Campus-Navigation-App/",
	plugins: [
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler"]]
			}
		})
	],
	resolve: {
		alias: {
			"@": path.resolve(process.cwd(), "./"),
			"@public": path.resolve(process.cwd(), "./public"),
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
			"@utils": path.resolve(process.cwd(), "./src/utils")
		}
	}
});
