// ─────────────────────────────────────────────────────────────────────────────
// Engine — createPage
// ─────────────────────────────────────────────────────────────────────────────

import React, { type ReactNode } from "react";
import type {
	PageSchema,
	EngineConfig,
	SchemaNode,
	PageMeta,
	MarkdownProps,
	EngineTheme as EngineThemeConfig,
	EngineThemeJsonObject,
} from "./schema/types";
import {
	getEngineThemeComponentDefinitions,
	resolveRegisteredEngineTheme,
} from "./theme/createTheme";
import { EngineCollectedStyles, EngineProvider } from "./providers/EngineProvider";
import { EngineScrollProvider } from "./core/enginescroll";
import { SchemaRenderer } from "./core/SchemaRenderer";
import {
	compileAdaptiveSchema,
	type EngineAdaptiveDeviceConfig,
} from "./compiler/EngineAdaptiveCompiler";
import { compilePage } from "./compiler/EngineCompiler";
import { EngineServerRenderer } from "./compiler/EngineServerRenderer";
import type { EngineCompiledPage } from "./compiler/types";
import { EngineBrowserUpdateDialog } from "./components/EngineCompatibilityDialog";
import { engineFallbackPlanNeedsCompatibilityCheck } from "./core/EngineBrowserCompatibility";
import dynamic from "next/dynamic";

const EngineDebugRuntimeMonitor = process.env.NODE_ENV === "development"
	? dynamic(() => import("./debug/EngineDebugRuntimeMonitor").then((module) => module.EngineDebugRuntimeMonitor))
	: () => null;

export interface EngineCompilerOptions {
	strict?: boolean;
	pageId?: string;
	/** Set false to temporarily force the v2 client renderer while migrating. */
	serverFirst?: boolean;
}

interface CreateOptionsBase {
	config?: EngineConfig;
	handlers?: Record<string, (...args: unknown[]) => void>;
	slots?: Record<string, ReactNode>;
	/** Generation 3 phone adaptation. Existing patch arrays remain supported. */
	mobile?: EngineAdaptiveDeviceConfig;
	/** Generation 3 tablet adaptation. Falls back to `mobile` when omitted. */
	tablet?: EngineAdaptiveDeviceConfig;
	compiler?: EngineCompilerOptions;
}

export interface CreateSchemaPageOptions extends CreateOptionsBase {
	schema: PageSchema;
}

export type CreateDirectPageOptions = CreateOptionsBase & PageSchema & {
	schema?: never;
};

export interface CreateMarkdownPageOptions extends CreateOptionsBase {
	schema?: never;
	root?: never;
	title?: string;
	description?: string;
	meta?: PageMeta;
	theme?: EngineThemeConfig;
	filePath: string;
	content?: string;
	markdown?: Omit<MarkdownProps, "content" | "filePath">;
	section?: Record<string, unknown>;
}

export type CreatePageOptions = CreateSchemaPageOptions | CreateDirectPageOptions | CreateMarkdownPageOptions;
export type CreateComponentOptions = CreateSchemaPageOptions | CreateDirectPageOptions;

export interface EngineComponentProps {
	slots?: Record<string, ReactNode>;
	children?: ReactNode;
}

export type EnginePageComponent = (() => ReactNode | Promise<ReactNode>) & {
	/** Base, request-independent Generation 3 compiler plan for dev tooling. */
	enginePlan: EngineCompiledPage;
};

interface NormalizedCreateOptions extends CreateOptionsBase {
	schema: PageSchema;
}

function isSchemaOption(options: CreatePageOptions): options is CreateSchemaPageOptions {
	return "schema" in options && options.schema !== undefined;
}

function isDirectSchemaOption(options: CreatePageOptions): options is CreateDirectPageOptions {
	return "root" in options && options.root !== undefined;
}

function normalizeMarkdownPath(filePath: string): string {
	const cwd = process.cwd().replace(/\\/g, "/").replace(/\/$/, "");
	const normalizedPath = filePath.replace(/\\/g, "/");
	const cwdAliasPrefix = `${cwd}/@/`;
	if (normalizedPath.startsWith("@/")) return `${cwd}/${normalizedPath.slice(2)}`;
	if (normalizedPath.startsWith(cwdAliasPrefix)) return `${cwd}/${normalizedPath.slice(cwdAliasPrefix.length)}`;
	return filePath;
}

function createMarkdownSchema(options: CreateMarkdownPageOptions): PageSchema {
	const { title, description, meta, theme, filePath, content, markdown, section } = options;
	return {
		meta: {
			...(title ? { title } : {}),
			...(description ? { description } : {}),
			...(meta ?? {}),
		},
		theme,
		root: {
			type: "section",
			props: {
				contentMaxWidth: "900px",
				py: { xs: "4rem", md: "6rem" },
				px: { xs: "1.5rem", md: "2rem" },
				...(section ?? {}),
			},
			children: [{
				type: "markdown",
				props: {
					...(markdown ?? {}),
					...(content ? { content } : {}),
					filePath,
				},
			}],
		},
	};
}

const MARKDOWN_THEME_PROP_KEYS = new Set([
	"textColor", "headingColor", "linkColor", "mutedColor", "fontFamily",
	"bodySize", "bodyLineHeight", "headingSizes", "headingIdPrefix",
	"textAnimation", "blockAnimation", "animationDuration", "animationStagger",
	"codeBackground", "codeColor", "inlineCodeBackground", "inlineCodeColor",
	"codeBorderColor", "codeFontFamily", "showCodeLanguage", "ansiPalette",
	"ansiForeground", "ansiBackground", "markdownStyles",
	"emd_show-url-icon", "emd_url-icon-size",
]);
const THEME_REFERENCE_KEYS = new Set(["id", "scope", "sourceUrl"]);

function isThemeRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeThemeRecords(
	base: Record<string, unknown> | undefined,
	overlay: Record<string, unknown> | undefined,
): Record<string, unknown> {
	return { ...(base ?? {}), ...(overlay ?? {}) };
}

function mergeMarkdownStyleSlots(
	base: Record<string, unknown> | undefined,
	overlay: unknown,
): Record<string, unknown> | undefined {
	if (!base && !isThemeRecord(overlay)) return undefined;
	const result: Record<string, unknown> = { ...(base ?? {}) };
	if (isThemeRecord(overlay)) {
		for (const [slot, style] of Object.entries(overlay)) {
			result[slot] = isThemeRecord(result[slot]) && isThemeRecord(style)
				? { ...(result[slot] as Record<string, unknown>), ...style }
				: style;
		}
	}
	return result;
}

function pickMarkdownThemeProps(value: unknown): Record<string, unknown> {
	if (!isThemeRecord(value)) return {};
	const result: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		if (MARKDOWN_THEME_PROP_KEYS.has(key) && key !== "markdownStyles") result[key] = item;
	}
	return result;
}

function resolveMarkdownThemeDefinition(value: EngineThemeJsonObject): {
	props: Record<string, unknown>;
	styles?: Record<string, unknown>;
} {
	const definition = value as Record<string, unknown>;
	const defaults = isThemeRecord(definition.defaults) ? definition.defaults : undefined;
	const explicitProps = isThemeRecord(definition.props) ? definition.props : undefined;
	const props = {
		...pickMarkdownThemeProps(definition),
		...pickMarkdownThemeProps(defaults),
		...pickMarkdownThemeProps(explicitProps),
	};
	const styleParts = [
		definition.styles,
		definition.markdownStyles,
		defaults?.markdownStyles,
		explicitProps?.markdownStyles,
	];
	let styles: Record<string, unknown> | undefined;
	for (const part of styleParts) {
		styles = mergeMarkdownStyleSlots(styles, part);
	}
	if (styles) delete props.markdownStyles;
	return { props, styles };
}

function applyMarkdownThemeToNode(node: SchemaNode, markdownTheme: EngineThemeJsonObject): SchemaNode {
	let children = node.children;
	if (Array.isArray(node.children)) {
		const mapped = node.children.map((child) => typeof child === "string"
			? child
			: applyMarkdownThemeToNode(child, markdownTheme));
		if (mapped.some((child, index) => child !== node.children?.[index])) children = mapped;
	}

	if (node.type !== "markdown") {
		return children === node.children ? node : { ...node, children };
	}

	const resolved = resolveMarkdownThemeDefinition(markdownTheme);
	const originalProps = node.props ?? {};
	const themeProps = resolved.props;
	const localStyles = originalProps.markdownStyles;
	const mergedStyles = mergeMarkdownStyleSlots(resolved.styles, localStyles);
	const nextProps: Record<string, unknown> = {
		...themeProps,
		...originalProps,
	};
	if (mergedStyles) nextProps.markdownStyles = mergedStyles;

	return {
		...node,
		...(children !== node.children ? { children } : {}),
		props: nextProps as SchemaNode["props"],
	};
}

function resolveSchemaTheme(schema: PageSchema): PageSchema {
	const theme = schema.theme;
	if (!theme || typeof theme.id !== "string" || !theme.id) return schema;

	const themeRecord = theme as Record<string, unknown>;
	const keys = Object.keys(themeRecord);
	const isQualifiedReference = theme.id.includes(".");
	const isBareReference = keys.every((key) => THEME_REFERENCE_KEYS.has(key));
	const isReference = isQualifiedReference || isBareReference;

	let resolvedCssTheme: EngineThemeConfig = theme;
	let markdownThemes = getEngineThemeComponentDefinitions(theme);

	if (isReference) {
		if (themeRecord.sourceUrl || themeRecord.scope === "remote") {
			throw new Error(
				"Remote EngineTheme fetching is not enabled in this build. The .etr artifact format is data-only; "
				+ "provide a globally registered theme or wait for the remote resolver phase.",
			);
		}
		const resolved = resolveRegisteredEngineTheme(theme.id);
		resolvedCssTheme = {
			...resolved.group,
			...(isThemeRecord(themeRecord.vars)
				? { vars: { ...(resolved.group.vars ?? {}), ...(themeRecord.vars as Record<string, string>) } }
				: {}),
			...(Array.isArray(themeRecord.fonts)
				? { fonts: [...(resolved.group.fonts ?? []), ...(themeRecord.fonts as string[])] }
				: {}),
			...(typeof themeRecord.globalStyles === "string"
				? { globalStyles: themeRecord.globalStyles }
				: {}),
		};
		markdownThemes = resolved.components;
	} else if (theme.scope === "global") {
		// Calling createTheme() registered the group in this module instance.
		// Resolve by root ID so unknown/redefined IDs fail consistently.
		const resolved = resolveRegisteredEngineTheme(theme.id);
		markdownThemes = resolved.components;
	}

	const markdownTheme = markdownThemes.markdown;
	if (!markdownTheme) {
		return resolvedCssTheme === theme ? schema : { ...schema, theme: resolvedCssTheme };
	}

	return {
		...schema,
		theme: resolvedCssTheme,
		root: applyMarkdownThemeToNode(schema.root, markdownTheme),
	};
}

function normalizeCreateOptions(options: CreatePageOptions): NormalizedCreateOptions {
	const { config, handlers, slots, mobile, tablet, compiler } = options;
	if (isSchemaOption(options)) return { schema: options.schema, config, handlers, slots, mobile, tablet, compiler };
	if (isDirectSchemaOption(options)) {
		return {
			schema: { meta: options.meta, theme: options.theme, root: options.root },
			config, handlers, slots, mobile, tablet, compiler,
		};
	}
	return {
		schema: createMarkdownSchema(options),
		config, handlers, slots, mobile, tablet, compiler,
	};
}

function nodeHasMarkdownFile(node: SchemaNode): boolean {
	if (node.type === "markdown" && typeof node.props?.filePath === "string") return true;
	return Array.isArray(node.children) ? node.children.some(nodeHasMarkdownFile) : false;
}

async function resolveMarkdownNode(node: SchemaNode): Promise<SchemaNode> {
	const children = Array.isArray(node.children)
		? await Promise.all(node.children.map(resolveMarkdownNode))
		: node.children;
	if (node.type !== "markdown" || typeof node.props?.filePath !== "string") return { ...node, children };
	let content = typeof node.props.content === "string" ? node.props.content : "";
	try {
		const { readFile } = await import("fs/promises");
		content = await readFile(normalizeMarkdownPath(node.props.filePath), "utf8");
	} catch {
		if (!content) content = "# Content coming soon\n\nThis page is ready for Markdown content.";
	}
	return { ...node, props: { ...node.props, content }, children };
}

async function resolveMarkdownFiles(schema: PageSchema): Promise<PageSchema> {
	if (!nodeHasMarkdownFile(schema.root)) return schema;
	return { ...schema, root: await resolveMarkdownNode(schema.root) };
}

function stableThemeHash(value: string): string {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(36);
}

function EngineTheme({ schema }: { schema: PageSchema }) {
	if (!schema.theme) return null;
	const { vars, fonts, globalStyles } = schema.theme;
	let css = "";
	if (vars) {
		const declarations = Object.entries(vars)
			.map(([key, value]) => `  ${key.startsWith("--") ? key : `--${key}`}: ${value};`)
			.join("\n");
		css += `:root {\n${declarations}\n}\n`;
	}
	if (globalStyles) css += globalStyles;
	const themeHref = css ? `engine-theme-${stableThemeHash(css)}` : "";

	return (
		<>
			{fonts?.map((url) => (
				<link key={url} rel="stylesheet" href={url} precedence="engine-font" />
			))}
			{css && (
				<style href={themeHref} precedence="engine-theme">{css}</style>
			)}
		</>
	);
}

export function createPage(options: CreatePageOptions): EnginePageComponent {
	const normalized = normalizeCreateOptions(options);
	const schema = resolveSchemaTheme(normalized.schema);
	const { config, handlers, slots, mobile, tablet, compiler } = normalized;
	const shouldResolveMarkdown = nodeHasMarkdownFile(schema.root);
	const usesAdaptiveLayout = mobile !== undefined || tablet !== undefined;
	const hasNamedHandlers = handlers !== undefined && Object.keys(handlers).length > 0;
	const useServerFirstRenderer = compiler?.serverFirst !== false && !hasNamedHandlers;
	const basePlan = compilePage(schema, {
		pageId: compiler?.pageId,
		strict: compiler?.strict,
	});

	function renderCompatibility(plan: EngineCompiledPage) {
		return engineFallbackPlanNeedsCompatibilityCheck(plan.fallbackPlan)
			? <EngineBrowserUpdateDialog plan={plan.fallbackPlan} />
			: null;
	}

	function renderLegacyPage(resolvedSchema: PageSchema, resolvedPlan: EngineCompiledPage) {
		return (
			<EngineScrollProvider>
				<EngineProvider config={config} handlers={handlers} slots={slots}>
					<EngineTheme schema={resolvedSchema} />
					<SchemaRenderer schema={resolvedSchema} />
					{process.env.NODE_ENV === "development" && <EngineDebugRuntimeMonitor />}
					<EngineCollectedStyles id="__engine_styles__" />
					{renderCompatibility(resolvedPlan)}
				</EngineProvider>
			</EngineScrollProvider>
		);
	}

	function renderPage(resolvedSchema: PageSchema) {
		const resolvedPlan = resolvedSchema === schema
			? basePlan
			: compilePage(resolvedSchema, {
				pageId: compiler?.pageId,
				strict: compiler?.strict,
			});
		if (!useServerFirstRenderer) return renderLegacyPage(resolvedSchema, resolvedPlan);
		return (
			<>
				<EngineTheme schema={resolvedSchema} />
				<EngineServerRenderer schema={resolvedSchema} plan={resolvedPlan} config={config} slots={slots} />
				{process.env.NODE_ENV === "development" && <EngineDebugRuntimeMonitor />}
				{renderCompatibility(resolvedPlan)}
			</>
		);
	}

	if (shouldResolveMarkdown || usesAdaptiveLayout) {
		async function EnginePage() {
			let resolvedSchema: PageSchema = shouldResolveMarkdown ? await resolveMarkdownFiles(schema) : schema;
			if (usesAdaptiveLayout) {
				const { getServerDevice } = await import("./core/EngineDeviceServer");
				const device = await getServerDevice();
				if (device.isMobile) {
					resolvedSchema = compileAdaptiveSchema(resolvedSchema, "phone", mobile).schema;
				} else if (device.isTablet) {
					resolvedSchema = compileAdaptiveSchema(resolvedSchema, "tablet", tablet ?? mobile).schema;
				}
			}
			return renderPage(resolvedSchema);
		}
		EnginePage.displayName = `EnginePage(${schema.meta?.title ?? "unnamed"})`;
		return Object.assign(EnginePage, { enginePlan: basePlan });
	}

	function EnginePage() {
		return renderPage(schema);
	}
	EnginePage.displayName = `EnginePage(${schema.meta?.title ?? "unnamed"})`;
	return Object.assign(EnginePage, { enginePlan: basePlan });
}

export function createComponent(options: CreateComponentOptions): React.FC<EngineComponentProps> {
	const normalized = normalizeCreateOptions(options);
	const schema = resolveSchemaTheme(normalized.schema);
	const { config, handlers, slots, compiler } = normalized;
	const hasNamedHandlers = handlers !== undefined && Object.keys(handlers).length > 0;
	const useServerFirstRenderer = compiler?.serverFirst !== false && !hasNamedHandlers;
	const basePlan = compilePage(schema, {
		pageId: compiler?.pageId,
		strict: compiler?.strict,
	});

	function EngineComponent({ children, slots: runtimeSlots }: EngineComponentProps) {
		const mergedSlots = {
			...(slots ?? {}),
			...(runtimeSlots ?? {}),
			...(children !== undefined ? { children } : {}),
		};
		if (useServerFirstRenderer) {
			return (
				<>
					<EngineTheme schema={schema} />
					<EngineServerRenderer schema={schema} plan={basePlan} config={config} slots={mergedSlots} />
				</>
			);
		}
		return (
			<EngineProvider config={config} handlers={handlers} slots={mergedSlots}>
				<EngineTheme schema={schema} />
				<SchemaRenderer schema={schema} />
				<EngineCollectedStyles />
			</EngineProvider>
		);
	}
	EngineComponent.displayName = `EngineComponent(${schema.meta?.title ?? "unnamed"})`;
	return Object.assign(EngineComponent, { enginePlan: basePlan });
}

export function defineSchema(schema: PageSchema): PageSchema {
	return schema;
}
