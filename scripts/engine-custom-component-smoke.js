"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const previousTsExtension = Module._extensions[".ts"];
const previousTsxExtension = Module._extensions[".tsx"];
const transpileEngineModule = (loadedModule, filePath) => {
	const sourceText = fs.readFileSync(filePath, "utf8");
	const output = ts.transpileModule(sourceText, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020,
			jsx: ts.JsxEmit.ReactJSX,
		},
		fileName: filePath,
		reportDiagnostics: true,
	});
	const errors = (output.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
	assert.deepEqual(errors, [], filePath + " must transpile without syntax diagnostics");
	loadedModule._compile(output.outputText, filePath);
};
Module._extensions[".ts"] = transpileEngineModule;
Module._extensions[".tsx"] = transpileEngineModule;

let registered = false;
try {
	const React = require("react");
	const { createTheme } = require(path.resolve(__dirname, "../src/engine/components/engineTheme/createTheme.ts"));
	const { resolveEngineThemeSchema } = require(path.resolve(__dirname, "../src/engine/components/engineTheme/resolveTheme.ts"));
	const {
		createTrustedEngineComponent,
	} = require(path.resolve(__dirname, "../src/engine/core/EngineCustomComponent.tsx"));
	const { getComponent, registerComponent, unregisterComponent } = require(path.resolve(__dirname, "../src/engine/core/registry.ts"));

	const customLinkImplementation = (props) => React.createElement("a", {
		href: props.href,
		target: props.target,
		style: props.style,
	}, props.children);
	const CustomLink = createTrustedEngineComponent({
		mode: "custom",
		id: "smoke-custom-link",
		theme: "custom-link-theme.link",
		component: customLinkImplementation,
		props: {
			href: { type: "string", required: true, maxLength: 2048 },
			target: { type: "string", enum: ["_self", "_blank"] },
		},
		slots: ["children", "leading"],
		strictProps: true,
	});

	assert.equal(CustomLink.engineCustomComponentId, "smoke-custom-link");
	assert.equal(CustomLink.engineCustomThemeId, "custom-link-theme.link", "factory declares its default theme namespace");
	assert.throws(() => createTrustedEngineComponent({
		mode: "custom", id: "invalid-default-theme", theme: "custom-link-theme.link.quiet", component: customLinkImplementation,
	}), /base EngineTheme namespace ID/);
	assert.deepEqual([...CustomLink.engineCustomSlots], ["children", "leading"]);
	assert.throws(() => CustomLink({ target: "_blank", children: "Missing href" }), /requires prop 'href'/);
	assert.throws(() => CustomLink({ href: 42 }), /must be string/);
	assert.throws(() => CustomLink({ href: "/guide", target: "_parent" }), /enum values/);
	assert.throws(() => CustomLink({ href: "/guide", onClick: () => undefined }), /Undeclared custom component prop 'onClick'/);
	assert.throws(() => CustomLink({ href: "/guide", leading: { invalid: true } }), /must be a valid ReactNode/);
	assert.throws(() => CustomLink({
		href: "/guide",
		engineThemeStyles: { leading: { background: "url(https://bad.invalid/x)" } },
	}), /Unsafe or invalid CSS value/);

	const validCustomElement = CustomLink({
		href: "/guide",
		target: "_blank",
		children: "Read the guide",
		leading: React.createElement("span", null, "Go"),
	});
	assert.ok(React.isValidElement(validCustomElement));
	assert.equal(validCustomElement.type, customLinkImplementation);

	const originalBox = getComponent("box");
	assert.throws(() => registerComponent("box", CustomLink), /Cannot replace built-in Engine component type/);
	assert.equal(getComponent("box"), originalBox, "failed registration cannot replace a built-in component");
	assert.throws(() => unregisterComponent("box"), /Cannot unregister built-in Engine component type/);
	registerComponent("smoke-custom-link", CustomLink);
	registered = true;
	assert.equal(getComponent("smoke-custom-link"), CustomLink);
	assert.throws(() => registerComponent("different-id", CustomLink), /does not match registry type/);

	const customTheme = createTheme({
		id: "custom-link-theme",
		scope: "local",
		components: {
				link: {
				defaults: { color: "#123456", textDecoration: "underline" },
				styles: {
					root: { fontSize: "1rem" },
					leading: { marginRight: "0.5rem" },
				},
				variants: {
					quiet: {
						textDecoration: "none",
						styles: { root: { fontWeight: 600 }, leading: { gap: "4px" } },
					},
				},
			},
		},
	});
	const themedCustomSchema = resolveEngineThemeSchema({
		theme: customTheme,
		root: {
			type: "smoke-custom-link",
			theme: "custom-link-theme.link.quiet",
			props: { href: "/guide", style: { fontWeight: 700 } },
		},
	});
	assert.equal(themedCustomSchema.root.theme, undefined, "custom node theme ID is consumed");
	assert.equal(themedCustomSchema.root.props.style.color, "#123456");
	assert.equal(themedCustomSchema.root.props.style.textDecoration, "none", "variant wins over base CSS values");
	assert.equal(themedCustomSchema.root.props.style.fontSize, "1rem");
	assert.equal(themedCustomSchema.root.props.style.fontWeight, 700, "node style wins over theme style");
	assert.equal(themedCustomSchema.root.props.engineThemeStyles.leading.marginRight, "0.5rem");
	assert.equal(themedCustomSchema.root.props.engineThemeStyles.leading.gap, "4px", "declared slot styles merge through variants");
	assert.equal(themedCustomSchema.root.props.engineThemeStyles.root.fontWeight, 600);

	const baseNamespaceSchema = resolveEngineThemeSchema({
		theme: customTheme,
		root: { type: "smoke-custom-link", props: { href: "/guide" } },
	});
	assert.equal(baseNamespaceSchema.root.props.style.color, "#123456", "base namespace applies without an explicit variant ID");

	assert.throws(() => resolveEngineThemeSchema({
		theme: customTheme,
		root: { type: "smoke-custom-link", theme: "custom-link-theme.other.quiet" },
	}), /same ID/);
	assert.throws(() => resolveEngineThemeSchema({
		theme: createTheme({
			id: "unsafe-custom-theme",
			scope: "local",
			components: { link: { styles: { root: { background: "url(https://bad.invalid/x)" } } } },
		}),
		root: { type: "smoke-custom-link" },
	}), /Unsafe or invalid CSS value/);
	assert.throws(() => resolveEngineThemeSchema({
		theme: customTheme,
		root: { type: "box", theme: "custom-link-theme.link.quiet" },
	}), /registered custom node types/);

	console.log("Engine custom component and theme smoke tests passed");
} finally {
	if (registered) {
		try { require(path.resolve(__dirname, "../src/engine/core/registry.ts")).unregisterComponent("smoke-custom-link"); }
		catch { /* preserve the original smoke assertion failure */ }
	}
	Module._extensions[".ts"] = previousTsExtension;
	Module._extensions[".tsx"] = previousTsxExtension;
}
