import Link from "next/link";

export default function EngineTransitionReplaceSeedPage() {
	return (
		<main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
			<h1 data-testid="replace-seed-title">Transition history seed</h1>
			<p>This route proves replace navigation does not push another history entry.</p>
			<Link href="/engine-compat-test">Open compatibility harness</Link>
		</main>
	);
}
