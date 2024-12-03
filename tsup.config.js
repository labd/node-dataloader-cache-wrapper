export default {
	entry: ["src/index.ts"],
	clean: true,
	splitting: false,
	dts: true,
	sourcemap: true,
	format: ["cjs", "esm", "iife"],
	outDir: "dist",
};
