import { createPage, createTheme } from "../../src/engine";

const builtInTheme = createTheme({
	id: "engine-builtin-theme-browser",
	scope: "local",
	hero: {
		defaults: { color: "#f8fafc", backgroundColor: "#111827" },
		styles: { inner: { gap: "12px" }, overlay: { backgroundColor: "rgba(0,0,0,.2)" } },
		variants: { accent: { styles: { root: { backgroundColor: "#581c87" } } } },
	},
	nav: {
		styles: {
			root: { backgroundColor: "#fef3c7" },
			item: { color: "#78350f" },
			activeItem: { color: "#be123c" },
		},
	},
	link: { styles: { root: { color: "#0e7490", textDecoration: "none" } } },
	"custom-select": {
		styles: {
			root: { maxWidth: "320px" },
			trigger: { backgroundColor: "#ecfccb" },
			dropdown: { borderColor: "#65a30d" },
			option: { color: "#166534" },
		},
	},
	image: { styles: { root: { borderRadius: "12px", backgroundColor: "#f1f5f9" }, image: { objectFit: "contain" }, placeholder: { backgroundColor: "#e5e7eb" }, caption: { color: "#334155" } } },
	video: { styles: { root: { borderRadius: "12px", backgroundColor: "#0b1120" }, video: { objectFit: "contain" } } },
});

export default createPage({
	schema: {
		meta: { title: "EngineTheme built-in component fixture" },
		theme: builtInTheme,
		root: {
			type: "section",
			props: { id: "builtin-theme-fixture", p: "1rem", gap: "1rem" },
			children: [
				{
					type: "hero",
					theme: "engine-builtin-theme-browser.hero.accent",
					props: { id: "themed-hero", backgroundColor: "#7c3aed" },
					children: [{ type: "text", props: { content: "Themed hero" } }],
				},
				{
					type: "nav",
					props: { id: "themed-nav", items: [{ label: "Overview", href: "/engine-compat-test" }] },
				},
				{ type: "link", props: { href: "/engine-compat-test", content: "Themed link" } },
				{
					type: "custom-select",
					props: {
						id: "themed-select",
						name: "plan",
						label: "Choose plan",
						options: [{ value: "starter", label: "Starter" }],
						style: { borderRadius: "4px" },
					},
				},
				{ type: "image", props: { src: "/next.svg", alt: "Themed fixture image", caption: "Themed image caption", style: { borderRadius: "4px" } } },
				{ type: "video", props: { src: "/fixture.mp4", className: "themed-video", style: { borderRadius: "4px" } } },
			],
		},
	},
});
