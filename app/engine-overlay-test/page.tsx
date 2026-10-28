"use client";

import { useState } from "react";
import { EngineDialog, EngineDrawer, EnginePopover } from "../../src/engine/components/EngineOverlay";

/** Browser fixture for modal inertness, nested overlay, scroll-lock and trigger regressions. */
export default function EngineOverlayTestPage() {
	const [showNativeTrigger, setShowNativeTrigger] = useState(true);
	const [controlledOpen, setControlledOpen] = useState(false);
	const [controlledChanges, setControlledChanges] = useState(0);
	const [backgroundCount, setBackgroundCount] = useState(0);

	return (
		<main data-testid="overlay-test-page" style={{ minHeight: "120vh", padding: "2rem" }}>
			<h1>EngineOverlay regression harness</h1>
			<p>This route exercises real overlay lifecycle behavior in Playwright.</p>
			<button type="button" data-testid="focus-fallback">Focus fallback</button>
			<button type="button" data-testid="background-action" onClick={() => setBackgroundCount((count) => count + 1)}>
				Background action
			</button>
			<p data-testid="background-count">{backgroundCount}</p>

			<EngineDialog
				triggerLabel="Open modal"
				title="Overlay regression modal"
				description="The page behind this modal must be inert."
				closeOnEscape
				trapFocus
				restoreFocus
				initialFocus="#overlay-modal-initial-focus"
			>
				<p>Modal content stays interactive.</p>
				<button id="overlay-modal-initial-focus" type="button" data-testid="modal-content-action">Modal action</button>
				<EnginePopover
					triggerLabel="Open nested popover"
					title="Nested popover"
					closeOnEscape
					closeOnOutsideClick
				>
					<button type="button" data-testid="popover-content-action">Popover action</button>
				</EnginePopover>
				<EngineDialog
					triggerLabel="Open nested dialog"
					title="Nested dialog"
					closeOnEscape
					trapFocus
					restoreFocus
					initialFocus="#overlay-nested-dialog-action"
				>
					<button id="overlay-nested-dialog-action" type="button" data-testid="nested-dialog-action">Nested dialog action</button>
				</EngineDialog>
			</EngineDialog>

			<EngineDialog
				trigger={showNativeTrigger ? <button type="button" data-testid="native-trigger">Open native trigger dialog</button> : null}
				triggerAsChild
				title="Native trigger dialog"
				closeOnEscape
				duration={120}
			>
				<p>The provided native trigger stays a single button.</p>
				<button type="button" data-testid="remove-trigger-from-dialog" onClick={() => setShowNativeTrigger(false)}>
					Remove trigger
				</button>
			</EngineDialog>

			<EnginePopover triggerLabel="Open standalone popover" title="Standalone popover" closeOnOutsideClick closeOnEscape>
				<button type="button" data-testid="standalone-popover-action">Standalone popover action</button>
			</EnginePopover>

			<EngineDrawer triggerLabel="Open settings drawer" title="Settings drawer" side="right" closeOnEscape trapFocus restoreFocus initialFocus="#drawer-action-initial-focus">
				<button id="drawer-action-initial-focus" type="button" data-testid="drawer-action">Drawer action</button>
			</EngineDrawer>

			<button type="button" data-testid="open-controlled-dialog" onClick={() => setControlledOpen(true)}>
				Open controlled dialog
			</button>
			<p data-testid="controlled-changes">{controlledChanges}</p>
			<EngineDialog
				open={controlledOpen}
				onOpenChange={(nextOpen) => {
					setControlledOpen(nextOpen);
					if (!nextOpen) setControlledChanges((count) => count + 1);
				}}
				title="Controlled dialog"
				closeOnEscape
				trapFocus={false}
				restoreFocus
			>
				<button type="button" data-testid="controlled-dialog-action">Controlled action</button>
			</EngineDialog>
		</main>
	);
}
