	useEffect(() => {
		if (!options.open) return;
		previousFocus.current = document.activeElement instanceof HTMLElement
			? document.activeElement
			: null;

		// A controlled overlay may open while its portal target/presence transition
		// is still mounting. Register only once the panel ref exists so the shared
		// document manager can inert background branches using the real portal root.
		let unregister: (() => void) | null = null;
		const registerWhenMounted = () => {
			if (unregister) return;
			const current = currentOptions.current;
			const panel = current.panelRef.current;
			if (!panel) return;
			unregister = registerOverlay(current.overlayId, panel.ownerDocument, {
				root: panel.parentElement ?? panel,
				modal: current.modal,
			});
		};
		registerWhenMounted();

		const frame = requestAnimationFrame(() => {
			registerWhenMounted();
			const current = currentOptions.current;
			if (!current.autoFocus) return;
			const panel = current.panelRef.current;
			if (!panel) return;
			const requested = resolveInitialFocus(panel, current.initialFocus);
			(requested ?? getFocusableElements(panel)[0] ?? panel).focus({ preventScroll: true });
		});
		const onKeyDown = (event: KeyboardEvent) => {
			const current = currentOptions.current;
			if (!isTopOverlay(current.overlayId, document)) return;
			if (event.key === "Escape" && current.closeOnEscape) {
				event.preventDefault();
				current.close();
				return;
			}
			if (event.key !== "Tab" || !current.trapFocus) return;
			const panel = current.panelRef.current;
			if (!panel) return;
			const focusable = getFocusableElements(panel);
			if (focusable.length === 0) {
				event.preventDefault();
				panel.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (!(document.activeElement instanceof Node) || !panel.contains(document.activeElement)) {
				event.preventDefault();
				(event.shiftKey ? last : first).focus();
			} else if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("keydown", onKeyDown);
			unregister?.();
			const current = currentOptions.current;
			if (!current.restoreFocus) return;
			const target = current.triggerRef.current ?? previousFocus.current;
			if (target?.isConnected) target.focus({ preventScroll: true });
		};
	}, [options.modal, options.open, options.overlayId]);