"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const safety = require("../bin/ne-cli/update-safety");
const project = require("../bin/ne-cli/project");

async function run() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ne-update-safety-"));
	try {
		fs.mkdirSync(path.join(root, "node_modules", "@kastrick", "nextjs-engine"), { recursive: true });
		fs.writeFileSync(path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json"),
			JSON.stringify({ name: "@kastrick/nextjs-engine", version: "3.0.0-alpha.3" }));
		fs.mkdirSync(path.join(root, "app"), { recursive: true });
		fs.writeFileSync(path.join(root, "app", "page.tsx"),
			'const invalid = { type: "component", child: { type: "raw" } };\nfunction render() { return RawComponentRenderer(); }\n');
		fs.writeFileSync(path.join(root, "app", "string-example.ts"),
			'const docs = \'example: { type: "raw" } and RawComponentRenderer\';\\n');

		assert.equal(safety.generationFromBranch("main-2"), 2);
		assert.equal(safety.generationFromBranch("main-3"), 3);
		assert.equal(safety.generationFromVersion("2.7.0"), 2);
		assert.equal(safety.generationForRelease({ version: "2.7.0", sourceBranch: "main-3" }), 3,
			"verified release branch metadata takes precedence over a SemVer-major fallback");
		fs.mkdirSync(path.join(root, ".nextjs-engine", "config"), { recursive: true });
		fs.writeFileSync(path.join(root, ".nextjs-engine", "config", "ne.config.json"),
			JSON.stringify({ installedVersion: "3.0.0-alpha.3", engineGeneration: 3, sourceBranch: "main-3" }));
		assert.equal(safety.readInstalled(root).version, "3.0.0-alpha.3");
		fs.writeFileSync(path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json"),
			JSON.stringify({ name: "@kastrick/nextjs-engine", version: "2.7.0" }));
		assert.equal(safety.generationFromManifest(safety.readInstalled(root)), 2,
			"stale NE state must not override the version currently installed in node_modules");
		fs.writeFileSync(path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json"),
			JSON.stringify({ name: "@kastrick/nextjs-engine", version: "3.0.0-alpha.3" }));

		const downgrade = safety.inspectUpdateSafety(root, {
			version: "3.0.0-alpha.2", sourceBranch: "main-3", source: "github"
		});
		assert.equal(downgrade.isDowngrade, true);
		assert.equal(downgrade.currentGeneration, 3);
		assert.equal(downgrade.targetGeneration, 3);
		assert.deepEqual(downgrade.blockers.map((finding) => finding.code).sort(), ["E3M001", "E3M002"]);
		const rawSchemaFinding = downgrade.blockers.find((finding) => finding.code === "E3M002");
		assert.match(rawSchemaFinding.message, /type: "raw"/);
		assert.match(rawSchemaFinding.recommendation, /registered component schema|React component/);
		assert.ok(downgrade.blockers.every((finding) => finding.file === "app/page.tsx"),
			"code examples inside string literals must not be reported as migration blockers");
		assert.match(safety.formatUpdateSafety(downgrade), /Replace the raw schema node/);
		const postInstallVerified = project.verifyInstalledVersion(root, {
			version: "3.0.0-alpha.3"
		}, null, 3);
		assert.equal(postInstallVerified.version, "3.0.0-alpha.3");
		assert.throws(() => project.verifyInstalledVersion(root, {
			version: "3.0.0-alpha.3"
		}, null, 2), /generation/i,
		"post-install verification rejects the wrong Engine generation");
		assert.match(safety.formatUpdateSafety(downgrade), /DOWNGRADE/);
		await assert.rejects(() => safety.confirmUpdateSafety(downgrade, { yes: true }), /blocked/i,
			"fatal Generation 3 findings block even an explicitly acknowledged install");

		fs.rmSync(path.join(root, "app"), { recursive: true, force: true });
		const cleanDowngrade = safety.inspectUpdateSafety(root, {
			version: "3.0.0-alpha.2", sourceBranch: "main-3", source: "github"
		});
		await assert.rejects(() => safety.confirmUpdateSafety(cleanDowngrade, { yes: true }), /allow-downgrade/,
			"non-interactive downgrade needs an explicit downgrade acknowledgement");
		await safety.confirmUpdateSafety(cleanDowngrade, { yes: true, allowDowngrade: true });

		fs.writeFileSync(path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json"),
			JSON.stringify({ name: "@kastrick/nextjs-engine", version: "2.7.0" }));
		const generationSwitch = safety.inspectUpdateSafety(root, {
			version: "3.0.0-alpha.2", sourceBranch: "main-3", source: "github"
		});
		assert.equal(generationSwitch.generationChange, true);
		assert.equal(generationSwitch.currentGeneration, 2);
		assert.equal(generationSwitch.targetGeneration, 3);
		await assert.rejects(() => safety.confirmUpdateSafety(generationSwitch, {
			yes: true, allowDowngrade: true
		}), /allow-generation-change/);

		fs.writeFileSync(path.join(root, "node_modules", "@kastrick", "nextjs-engine", "package.json"),
			JSON.stringify({ name: "@kastrick/nextjs-engine", version: "3.0.0-alpha.2" }));
		fs.mkdirSync(path.join(root, "components"), { recursive: true });
		fs.writeFileSync(path.join(root, "components", "theme.tsx"), "export const theme = createTheme({ id: 'legacy' });\n");
		const gen2 = safety.inspectUpdateSafety(root, {
			version: "2.7.0", sourceBranch: "main-2", source: "npm"
		});
		assert.equal(gen2.targetGeneration, 2);
		assert.ok(gen2.warnings.some((finding) => finding.code === "W2M001"),
			"Generation 2 preflight warns about Generation 3-oriented APIs");
		await assert.rejects(() => safety.confirmUpdateSafety(gen2, { yes: true }), /acknowledge-compatibility/);
		await safety.confirmUpdateSafety(gen2, {
			yes: true, allowGenerationChange: true, allowDowngrade: true, acknowledgeCompatibility: true
		});

		const unknownGeneration = safety.inspectUpdateSafety(root, {
			version: "4.0.0", sourceBranch: "main-4", source: "github"
		});
		assert.ok(unknownGeneration.blockers.some((finding) => finding.code === "ENE001"));
		await assert.rejects(() => safety.confirmUpdateSafety(unknownGeneration, {
			yes: true, allowGenerationChange: true, allowDowngrade: true, acknowledgeCompatibility: true
		}), /supported Engine generation/i);
		process.stdout.write("[NE CLI] Update safety smoke passed.\n");
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}

if (require.main === module) {
	run().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

module.exports = { run };
