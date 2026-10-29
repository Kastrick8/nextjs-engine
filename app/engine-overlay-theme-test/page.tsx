import { createPage, createTheme } from "../../src/engine";

const overlayRuntimeTheme = createTheme({
	id: "engine-overlay-runtime-browser",
	scope: "local",
	overlay: {
		defaults: { duration: 180 },
		styles: {
			backdrop: {
				backgroundColor: "#123456",
				opacity: 0.2,
				transition: "none",
			},
		},
	},
	dialog: { styles: { panel: { borderRadius: "12px" } } },
	drawer: { defaults: { side: "right" } },
});

export default createPage({
	schema: {
		meta: { title: "EngineOverlay theme runtime precedence test" },
		theme: overlayRuntimeTheme,
		root: {
			type: "section",
			props: { id: "overlay-theme-fixture", p: "1rem", gap: "1rem" },
			children: [
				{
					type: "dialog",
					theme: "engine-overlay-runtime-browser.dialog",
					props: {
						id: "themed-runtime-dialog",
						triggerLabel: "Open themed runtime dialog",
						title: "Themed runtime dialog",
						closeOnEscape: true,
					},
				},
				{
					type: "drawer",
					theme: "engine-overlay-runtime-browser.drawer",
					props: {
						id: "themed-runtime-drawer",
						triggerLabel: "Open themed runtime drawer",
						title: "Themed runtime drawer",
						closeOnEscape: true,
					},
				},
			],
		},
	},
});
