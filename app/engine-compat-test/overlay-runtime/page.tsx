"use client";

import { useState } from "react";
import { EngineDialog, EngineDrawer, EnginePopover } from "../../../src/engine";
import { EngineCollectedStyles, EngineProvider } from "../../../src/engine/providers/EngineProvider";

export default function EngineOverlayRuntimeTestPage() {
	const [showParentTrigger, setShowParentTrigger] = useState(true);
	const [controlledOpen, setControlledOpen] = useState(false);
	const [controlledChanges, setControlledChanges] = useState(0);
	const [backgroundCount, setBackgroundCount] = useState(0);

	return (
		<EngineProvider>
			<main data-testid="overlay-background" style={{ minHeight: "140vh", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
				<h1>EngineOverlay runtime regression fixture</h1>
				<p>Background content is expected to become inert while a modal dialog or drawer is open.</p>
				<button data-testid="focus-fallback" type="button">Focus fallback</button>
				<button data-testid="background-action" type="button" onClick={() => setBackgroundCount((value) => value + 1)}>
					Background action
				</button>
				<p data-testid="background-count">{backgroundCount}</p>
				<button data-testid="remove-parent-trigger" type="button" onClick={() => setShowParentTrigger(false)}>
					Remove parent trigger
				</button>

				<EngineDialog
					trigger={showParentTrigger ? <button data-testid="parent-dialog-trigger">Open parent dialog</button> : null}
					triggerAsChild
					title="Parent dialog"
					description="Parent modal for nested interaction tests."
					closeOnEscape
					trapFocus
					restoreFocus
					initialFocus="#dialog-initial-focus"
				>
					<button id="dialog-initial-focus" data-testid="dialog-initial-focus" type="button">Initial dialog action</button>
					<EnginePopover
						trigger={<button data-testid="nested-popover-trigger">Open nested popover</button>}
						triggerAsChild
						title="Nested popover"
						closeOnOutsideClick
						closeOnEscape
						autoFocus={false}
						zIndex={1200}
					>
						<button data-testid="popover-action" type="button">Popover action</button>
					</EnginePopover>
					<EngineDialog
						trigger={<button data-testid="nested-dialog-trigger">Open nested dialog</button>}
						triggerAsChild
						title="Nested dialog"
						closeOnEscape
						trapFocus
						restoreFocus
						initialFocus="#nested-dialog-action"
					>
						<button id="nested-dialog-action" data-testid="nested-dialog-action" type="button">Nested dialog action</button>
					</EngineDialog>
				</EngineDialog>

				<EnginePopover
					trigger={<button data-testid="standalone-popover-trigger">Open standalone popover</button>}
					triggerAsChild
					title="Standalone popover"
					closeOnOutsideClick
					closeOnEscape
				>
					<button data-testid="standalone-popover-action" type="button">Standalone popover action</button>
				</EnginePopover>

				<EngineDrawer triggerLabel="Open settings drawer" title="Settings drawer" side="right" closeOnEscape trapFocus restoreFocus>
					<button data-testid="drawer-action" type="button">Drawer action</button>
				</EngineDrawer>

				<button data-testid="open-controlled-dialog" type="button" onClick={() => setControlledOpen(true)}>
					Open controlled dialog
				</button>
				<p data-testid="controlled-changes">{controlledChanges}</p>
				<EngineDialog
					open={controlledOpen}
					onOpenChange={(nextOpen) => {
						setControlledOpen(nextOpen);
						setControlledChanges((count) => count + 1);
					}}
					title="Controlled dialog"
					closeOnEscape
					trapFocus={false}
					restoreFocus
				>
					<button data-testid="controlled-dialog-action" type="button">Controlled action</button>
				</EngineDialog>
			</main>
			<EngineCollectedStyles id="__engine_overlay_test_styles__" />
		</EngineProvider>
	);
}
