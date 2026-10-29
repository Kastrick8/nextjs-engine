"use client";

import React, { forwardRef, memo, type ReactNode } from "react";
import NextLink from "next/link";
import {
	resolveEngineTransition,
	useEngineTransitions,
	type EngineTransitionInput,
} from "../core/enginetransitions";

export type EngineTransitionLinkProps = Omit<
	React.ComponentProps<typeof NextLink>,
	"href" | "onClick" | "children" | "ref"
> & {
	href: string;
	transition: EngineTransitionInput;
	children?: ReactNode;
	onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

function shouldKeepNativeClick(
	event: React.MouseEvent<HTMLAnchorElement>,
	target?: string | null,
	download?: boolean | string,
): boolean {
	return event.button !== 0
		|| event.metaKey
		|| event.ctrlKey
		|| event.shiftKey
		|| event.altKey
		|| (target != null && target !== "_self")
		|| (download !== undefined && download !== false);
}

function isHashOnlyNavigation(href: string): boolean {
	try {
		const nextUrl = new URL(href, window.location.href);
		const currentUrl = new URL(window.location.href);
		return nextUrl.origin === currentUrl.origin
			&& nextUrl.pathname === currentUrl.pathname
			&& nextUrl.search === currentUrl.search
			&& nextUrl.hash !== currentUrl.hash;
	} catch {
		return false;
	}
}

/** Transition effects own same-origin HTTP(S) routes; other protocols stay native. */
function isInternalNavigation(href: string): boolean {
	try {
		const nextUrl = new URL(href, window.location.href);
		return (nextUrl.protocol === "http:" || nextUrl.protocol === "https:")
			&& nextUrl.origin === window.location.origin;
	} catch {
		return false;
	}
}

export const EngineTransitionLink = memo(
	forwardRef<HTMLAnchorElement, EngineTransitionLinkProps>((props, ref) => {
		const {
			href,
			transition,
			target,
			download,
			replace = false,
			children,
			onClick,
			...nextLinkProps
		} = props;
		const transitions = useEngineTransitions();

		const handleClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
			onClick?.(event);
			if (event.defaultPrevented || shouldKeepNativeClick(event, target, download)) return;
			if (!isInternalNavigation(href) || isHashOnlyNavigation(href)) return;

			const resolved = resolveEngineTransition(transition, {
				pointer: { x: event.clientX, y: event.clientY },
			});
			if (resolved.type === "instant") return;

			event.preventDefault();
			const navigate = replace ? transitions.replace : transitions.push;
			void navigate(href, transition, {
				pointer: { x: event.clientX, y: event.clientY },
			});
		};

		return (
			<NextLink
				{...nextLinkProps}
				ref={ref}
				href={href}
				target={target}
				download={download}
				replace={replace}
				onClick={handleClick}
			>
				{children}
			</NextLink>
		);
	}),
);

EngineTransitionLink.displayName = "EngineTransitionLink";
