"use client";

import { EngineDialog, EngineDrawer } from "../../src/engine/components/EngineOverlay";
import { EngineCollectedStyles, EngineProvider } from "../../src/engine/providers/EngineProvider";

export default function EngineOverlayStylePrecedencePage() {
	const overlayStyle = {
		backgroundColor: "#123456",
		opacity: 0.2,
		transition: "none",
	};

	return (
		<EngineProvider>
			<main style={{ minHeight: "100vh", padding: "2rem", display: "grid", gap: "1.5rem", alignContent: "start" }}>
				<h1>EngineOverlay style precedence regression</h1>
				<EngineDialog
					id="engine-overlay-precedence-dialog"
					triggerLabel="Open precedence dialog"
					title="Precedence dialog"
					duration={180}
					overlayStyle={overlayStyle}
				>
					<p>Dialog backdrop style regression fixture.</p>
				</EngineDialog>
				<EngineDrawer
					id="engine-overlay-precedence-drawer"
					triggerLabel="Open precedence drawer"
					title="Precedence drawer"
					duration={180}
					overlayStyle={overlayStyle}
				>
					<p>Drawer backdrop style regression fixture.</p>
				</EngineDrawer>
			</main>
			<EngineCollectedStyles id="__engine_overlay_precedence_styles__" />
		</EngineProvider>
	);
}
