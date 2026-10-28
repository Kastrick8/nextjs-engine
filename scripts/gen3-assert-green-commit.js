"use strict";

const REQUIRED_WORKFLOWS = [
	"Engine runtime CI",
	"Engine cross-browser compatibility",
];

function evaluateGreenRuns(payload, context) {
	const errors = [];
	const evidence = [];
	if (!payload || !Array.isArray(payload.workflow_runs)) {
		return { ok: false, errors: ["GitHub Actions returned an invalid workflow-runs response."], evidence };
	}
	const { repo, branch, sha } = context || {};
	for (const workflowName of REQUIRED_WORKFLOWS) {
		const matches = payload.workflow_runs
			.filter((run) => run &&
				run.name === workflowName &&
				run.head_sha === sha &&
				run.head_branch === branch &&
				run.event === "push" &&
				run.head_repository &&
				String(run.head_repository.full_name || "").toLowerCase() === String(repo || "").toLowerCase())
			.sort((a, b) => {
				const aTime = Date.parse(a.run_started_at || a.created_at || a.updated_at || 0) || 0;
				const bTime = Date.parse(b.run_started_at || b.created_at || b.updated_at || 0) || 0;
				return bTime - aTime;
			});
		const run = matches[0];
		if (!run) {
			errors.push("No push-triggered \"" + workflowName + "\" run was found for " + branch + "@" + sha + ".");
			continue;
		}
		if (run.status !== "completed") {
			errors.push("\"" + workflowName + "\" is not complete for " + branch + "@" + sha + " (status: " + run.status + ").");
			continue;
		}
		if (run.conclusion !== "success") {
			errors.push("\"" + workflowName + "\" did not pass for " + branch + "@" + sha + " (conclusion: " + run.conclusion + ").");
			continue;
		}
		evidence.push({ name: workflowName, runId: run.id, conclusion: run.conclusion });
	}
	return { ok: errors.length === 0, errors, evidence };
}

async function main() {
	const repo = process.env.GITHUB_REPOSITORY || "";
	const branch = process.env.SOURCE_BRANCH || "";
	const sha = process.env.SOURCE_SHA || "";
	const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
	const apiUrl = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\\/$/, "");
	if (!/^[A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("GITHUB_REPOSITORY is missing or invalid.");
	if (!/^main-[23]$/.test(branch)) throw new Error("SOURCE_BRANCH must be main-2 or main-3.");
	if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("SOURCE_SHA must be a lowercase 40-character commit SHA.");
	if (!token) throw new Error("GH_TOKEN is required to verify release CI.");
	const url = apiUrl + "/repos/" + repo.split("/").map(encodeURIComponent).join("/") +
		"/actions/runs?head_sha=" + encodeURIComponent(sha) + "&per_page=100";
	const response = await fetch(url, {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: "Bearer " + token,
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "nextjs-engine-release-gate",
		},
		signal: AbortSignal.timeout(15000),
	});
	if (!response.ok) throw new Error("GitHub Actions lookup returned HTTP " + response.status + ".");
	const evaluation = evaluateGreenRuns(await response.json(), { repo, branch, sha });
	if (!evaluation.ok) throw new Error("Prerelease blocked by CI gate:\\n- " + evaluation.errors.join("\\n- "));
	for (const item of evaluation.evidence) {
		process.stdout.write("[NE RELEASE] PASS " + item.name + " (run " + item.runId + ") for " + branch + "@" + sha + "\\n");
	}
}

if (require.main === module) {
	main().catch((error) => {
		process.stderr.write("[NE RELEASE] " + ((error && error.message) || String(error)) + "\\n");
		process.exitCode = 1;
	});
}

module.exports = { evaluateGreenRuns };
