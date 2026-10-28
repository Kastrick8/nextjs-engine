"use client";

import { EngineDialog, EnginePopover } from "../../src/engine/components/EngineOverlay";

/** Browser fixture for modal inertness, nested overlay and trigger-composition regressions. */
export default function EngineOverlayTestPage() {
	return (
		<main data-testid="overlay-test-page" style={{ padding: "2rem" }}>
			<h1>EngineOverlay regression harness</h1>
			<p>This route exists to exercise real overlay lifecycle behavior in Playwright.</p>
			<button type="button" data-testid="background-action">Background action</button>

			<EngineDialog
				triggerLabel="Open modal"
				title="Overlay regression modal"
				description="The page behind this modal must be inert."
			>
				<p>Modal content stays interactive.</p>
				<button type="button" data-testid="modal-content-action">Modal action</button>
				<EnginePopover triggerLabel="Open nested popover" title="Nested popover">
					<button type="button" data-testid="popover-content-action">Popover action</button>
				</EnginePopover>
			</EngineDialog>

			<EngineDialog
				trigger={<button type="button" data-testid="native-trigger">Open native trigger dialog</button>}
				triggerAsChild
				title="Native trigger dialog"
			>
				<p>The provided native trigger stays a single button.</p>
			</EngineDialog>
		</main>
	);
}

