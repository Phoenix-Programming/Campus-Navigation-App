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
			"@public": path.resolve(process.cwd(), "./frontend/public"),
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
			"@utils": path.resolve(process.cwd(), "./frontend/utils")
		}
	}
});
