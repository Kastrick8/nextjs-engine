"use client";

import type { CSSProperties, ReactNode } from "react";
import { createComponent, createPage, createTheme, registerComponent } from "../../src/engine";
import { EngineLink } from "../../src/engine/components/EngineLink";
import type { EngineCustomThemeStyles } from "../../src/engine/core/EngineCustomComponent";

interface ThemeLinkProps {
	href: string;
	target?: "_self" | "_blank";
	children?: ReactNode;
	leading?: ReactNode;
	style?: CSSProperties;
	className?: string;
	engineThemeStyles?: EngineCustomThemeStyles;
	"data-testid"?: string;
}

function isSafeLinkHref(input: string): boolean {
	const value = input.trim();
	if (!value || value.length > 2048 || /[\\u0000-\\u001f\\u007f]/.test(value)) return false;
	if (/^(javascript|data|vbscript):/i.test(value)) return false;
	if (/^\\s*\/\\//.test(value)) return false;
	if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
		return /^(https?:|mailto:|tel:)/i.test(value);
	}
	return true;
}

function ThemeLinkImplementation({
	href,
	target = "_self",
	children,
	leading,
	style,
	className,
	engineThemeStyles,
	"data-testid": testId,
}: ThemeLinkProps) {
	const leadingSlot = leading == null ? null : (
		<span aria-hidden="true" style={{ display: "inline-block", marginInlineEnd: ".4rem", ...engineThemeStyles?.leading }}>
			{leading}
		</span>
	);
	if (!isSafeLinkHref(href)) {
		return (
			<span data-testid={testId} data-engine-link-blocked="true" aria-disabled="true" style={style} className={className}>
				{leadingSlot}{children}
			</span>
		);
	}
	return (
		<span data-testid={testId}>
			<EngineLink href={href.trim()} target={target} style={style} className={className}>
				{leadingSlot}{children}
			</EngineLink>
		</span>
	);
}

const linkTheme = createTheme({
	id: "engine-custom-link-demo",
	scope: "global",
	components: {
		link: {
			defaults: { color: "#155e75", textDecoration: "underline", textUnderlineOffset: "0.2em" },
			styles: {
				root: { fontWeight: 600 },
				leading: { color: "#0e7490" },
			},
			variants: {
				quiet: {
					defaults: { color: "#475569", textDecoration: "none" },
					styles: { leading: { color: "#64748b" } },
				},
			},
		},
	},
});

const ThemeLink = createComponent<ThemeLinkProps>({
	mode: "custom",
	id: "engine-site-link",
	theme: "engine-custom-link-demo.link",
	component: ThemeLinkImplementation,
	props: {
		href: { type: "string", required: true, maxLength: 2048 },
		target: { type: "string", enum: ["_self", "_blank"] },
	},
	slots: ["children", "leading"],
	strictProps: true,
});
registerComponent("engine-site-link", ThemeLink);

export default createPage({
	schema: {
		meta: { title: "EngineTheme custom link fixture" },
		theme: linkTheme,
		root: {
			type: "section",
			props: { p: "2rem", contentMaxWidth: "760px", gap: "1rem" },
			children: [
				{ type: "heading", props: { level: 1, content: "Custom component theme bindings" } },
				{ type: "text", props: { content: "A registered local React component receives validated EngineTheme styles and named slots." } },
				{
					type: "engine-site-link",
					theme: "engine-custom-link-demo.link",
					props: { href: "/engine-compat-test", target: "_self", children: "Read the internal guide", leading: "↗", "data-testid": "custom-safe-link" },
				},
				{
					type: "engine-site-link",
					theme: "engine-custom-link-demo.link.quiet",
					props: { href: "https://example.com/docs", target: "_blank", children: "Open the external docs", leading: "↗", "data-testid": "custom-external-link" },
				},
				{
					type: "engine-site-link",
					theme: "engine-custom-link-demo.link",
					props: { href: "javascript:alert(1)", target: "_self", children: "Unsafe link blocked", "data-testid": "custom-unsafe-link" },
				},
			],
		},
	},
});
