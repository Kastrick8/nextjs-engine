import { createPage, createTheme } from "../../src/engine";

const builtInTheme = createTheme({
	id: "engine-builtin-theme-browser",
	scope: "local",
	hero: {
		defaults: { color: "#f8fafc", backgroundColor: "#111827" },
		styles: { inner: { gap: "12px" }, overlay: { backgroundColor: "rgba(0,0,0,.2)" } },
		variants: { accent: { styles: { root: { backgroundColor: "#581c87" } } } },
	},
	section: {
		variants: {
			contentArea: { styles: { inner: { gap: "14px", backgroundColor: "#fef9c3" } } },
		},
	},
	card: {
		styles: {
			cover: { borderRadius: "8px" },
			coverImage: { objectFit: "contain" },
			content: { backgroundColor: "#f0fdf4", padding: "20px" },
		},
	},
	heading: { styles: { subheading: { color: "#7c3aed", fontSize: "14px", marginTop: "10px" } } },
	nav: {
		styles: {
			root: { backgroundColor: "#fef3c7" },
			item: { color: "#78350f" },
			activeItem: { color: "#be123c" },
		},
	},
	link: { styles: { root: { color: "#0e7490", textDecoration: "none" } } },
	text: { styles: { part: { color: "#0f766e", fontWeight: 600 }, partLink: { color: "#7c3aed", textDecoration: "none" } } },
	spacer: { styles: { root: { backgroundColor: "#e0f2fe" } } },
	divider: { styles: { root: { backgroundColor: "#fef3c7" } } },
	scroll: { styles: { root: { backgroundColor: "#fce7f3" } } },
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
	form: { styles: { root: { backgroundColor: "#fef9c3", borderRadius: "6px", padding: "12px" } } },
	input: { styles: { root: { backgroundColor: "#dbeafe", borderColor: "#2563eb", borderRadius: "4px", color: "#1e3a8a", padding: "6px" } } },
	textarea: { styles: { root: { backgroundColor: "#fce7f3", borderColor: "#db2777", color: "#831843", padding: "8px" } } },
	checkbox: { styles: { root: { width: "20px", height: "20px" } } },
	label: { styles: { root: { color: "#047857", fontWeight: 600 } } },
	slot: { styles: { root: { backgroundColor: "#dbeafe", padding: "4px" } } },
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
				{ type: "EngineLink", props: { id: "themed-alias-link", href: "/engine-compat-test", content: "Themed alias link" } },
				{
					type: "text",
					props: {
						id: "themed-text-parts",
						parts: [
							{ text: "Themed part" },
							{ text: "Themed link part", href: "/engine-compat-test" },
							{ text: "Local override link", href: "/engine-compat-test", style: { color: "#dc2626" } },
						],
					},
				},
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
				{
					type: "section",
					theme: "engine-builtin-theme-browser.section.contentArea",
					props: { id: "themed-section" },
					children: [{ type: "text", props: { content: "Section inner slot" } }],
				},
				{
					type: "card",
					props: { id: "themed-card", cover: "/next.svg", coverAlt: "Card cover", innerPadding: "6px" },
					children: [{ type: "text", props: { content: "Card content slot" } }],
				},
				{ type: "heading", props: { id: "themed-heading", content: "Themed heading", subheading: "A themed subheading" } },
				{ type: "slot", props: { id: "themed-slot", name: "missing-themed-slot", fallback: { type: "text", props: { content: "Themed slot fallback" } } } },
				{ type: "spacer", props: { id: "themed-spacer", axis: "x", size: "12px" } },
				{ type: "divider", props: { id: "themed-divider", style: "dashed", thickness: "2px", color: "#f97316", my: "4px" } },
				{
					type: "scroll",
					props: { id: "themed-scroll", pageTransition: false },
					children: [{ type: "text", props: { content: "Themed scroll content" } }],
				},
				{
					type: "form",
					props: { id: "themed-form", noValidate: true },
					children: [
						{ type: "label", props: { id: "themed-form-label", htmlFor: "themed-form-input" }, children: "Themed form label" },
						{ type: "input", props: { id: "themed-form-input", name: "theme-input", type: "text", placeholder: "Themed input" } },
						{ type: "input", props: { id: "themed-local-input", name: "local-input", type: "text", style: { color: "#dc2626" } } },
						{ type: "textarea", props: { id: "themed-textarea", name: "theme-notes", defaultValue: "Themed textarea" } },
						{ type: "checkbox", props: { id: "themed-checkbox", name: "theme-accept", ariaLabel: "Accept theme terms" } },
					],
				},
			],
		},
	},
});
