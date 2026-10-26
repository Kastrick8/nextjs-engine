"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Engine — EngineManim3D
// ─────────────────────────────────────────────────────────────────────────────

import {
	memo,
	useEffect,
	useRef,
	type CSSProperties,
} from "react";
import type { Manim3DConfig } from "./manimTypes";
import { routeAnimation, sampleBoneTrack } from "./manimAnimationRouter";
import { EngineScheduler } from "../../core/enginescheduler/EngineScheduler";

type ThreeModule = typeof import("three");
type ThreeObject = InstanceType<ThreeModule["Object3D"]>;

type BoneBaseState = {
	position: [number, number, number];
	rotation: [number, number, number];
	scale: [number, number, number];
};

export interface EngineManim3DProps {
	cprop: { manim3d: Manim3DConfig };
	width?: number;
	height?: number;
	className?: string;
	style?: CSSProperties;
}

function toRad(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

function resolveThreeColor(color: string, THREE: ThreeModule): InstanceType<ThreeModule["Color"]> {
	return new THREE.Color(color.startsWith("var(") ? "#ffffff" : color);
}

function baseState(object: ThreeObject): BoneBaseState {
	return {
		position: [object.position.x, object.position.y, object.position.z],
		rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
		scale: [object.scale.x, object.scale.y, object.scale.z],
	};
}

function disposeObjectTree(root: ThreeObject): void {
	const disposedTextures = new Set<unknown>();
	const disposedMaterials = new Set<unknown>();
	const disposedGeometries = new Set<unknown>();

	root.traverse((child: any) => {
		const geometry = child.geometry;
		if (geometry?.dispose && !disposedGeometries.has(geometry)) {
			disposedGeometries.add(geometry);
			geometry.dispose();
		}

		const materials = Array.isArray(child.material) ? child.material : [child.material];
		for (const material of materials) {
			if (!material || disposedMaterials.has(material)) continue;
			disposedMaterials.add(material);
			for (const value of Object.values(material)) {
				if ((value as any)?.isTexture && !disposedTextures.has(value)) {
					disposedTextures.add(value);
					(value as any).dispose?.();
				}
			}
			material.dispose?.();
		}
	});
}

function setWireframe(root: ThreeObject, enabled: boolean): void {
	if (!enabled) return;
	root.traverse((child: any) => {
		if (!child.isMesh) return;
		const materials = Array.isArray(child.material) ? child.material : [child.material];
		for (const material of materials) {
			if (material && "wireframe" in material) material.wireframe = true;
		}
	});
}

export const EngineManim3D = memo(function EngineManim3D({
	cprop,
	width,
	height,
	className,
	style,
}: EngineManim3DProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const cfg = cprop.manim3d;
	// Schema config is plain serializable data; keying by value prevents an
	// inline-but-identical cprop object from restarting model loading/rendering.
	const cfgKey = JSON.stringify(cfg);

	useEffect(() => {
		const mountedCanvas = canvasRef.current;
		if (!mountedCanvas) return;

		let disposed = false;
		let cleanupInitializedRuntime: (() => void) | undefined;

		async function init(canvas: HTMLCanvasElement): Promise<(() => void) | undefined> {
			const THREE = await import("three");
			if (disposed) return undefined;

			const format = cfg.format ?? (cfg.src.toLowerCase().endsWith(".obj") ? "obj" : "gltf");
			const measuredWidth = width ?? canvas.clientWidth;
			const measuredHeight = height ?? canvas.clientHeight;
			const initialWidth = Math.max(1, measuredWidth || 800);
			const initialHeight = Math.max(1, measuredHeight || 600);

			const renderer = new THREE.WebGLRenderer({
				canvas,
				antialias: true,
				alpha: true,
				powerPreference: "high-performance",
			});
			let currentPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
			let currentWidth = initialWidth;
			let currentHeight = initialHeight;
			renderer.setPixelRatio(currentPixelRatio);
			renderer.shadowMap.enabled = cfg.settings?.shadows ?? false;
			renderer.shadowMap.type = THREE.PCFSoftShadowMap;
			renderer.setSize(initialWidth, initialHeight, false);

			const scene = new THREE.Scene();
			if (cfg.settings?.background && cfg.settings.background !== "transparent") {
				scene.background = resolveThreeColor(cfg.settings.background, THREE);
			}

			const cameraConfig = cfg.camera ?? {};
			const camera = new THREE.PerspectiveCamera(
				cameraConfig.fov ?? 60,
				initialWidth / initialHeight,
				cameraConfig.near ?? 0.1,
				cameraConfig.far ?? 1000,
			);
			const cameraPosition = cameraConfig.position ?? [0, 2, 5];
			camera.position.set(...cameraPosition);

			const lights = cfg.lights ?? [
				{ type: "ambient", intensity: 0.4, color: "#ffffff" },
				{ type: "directional", intensity: 0.8, direction: [1, -1, 0.5] },
			];
			for (const lightConfig of lights) {
				const color = resolveThreeColor(lightConfig.color ?? "#ffffff", THREE);
				switch (lightConfig.type) {
					case "ambient":
						scene.add(new THREE.AmbientLight(color, lightConfig.intensity ?? 0.4));
						break;
					case "directional": {
						const light = new THREE.DirectionalLight(color, lightConfig.intensity ?? 0.8);
						if (lightConfig.direction) {
							const direction = lightConfig.direction;
							light.position.set(-direction[0], -direction[1], -direction[2]).normalize();
						}
						light.castShadow = lightConfig.castShadow ?? false;
						scene.add(light);
						break;
					}
					case "point": {
						const light = new THREE.PointLight(color, lightConfig.intensity ?? 1);
						if (lightConfig.position) light.position.set(...lightConfig.position);
						scene.add(light);
						break;
					}
					case "spot": {
						const light = new THREE.SpotLight(color, lightConfig.intensity ?? 1);
						if (lightConfig.position) light.position.set(...lightConfig.position);
						scene.add(light);
						break;
					}
				}
			}

			let modelRoot: ThreeObject | null = null;
			let fileAnimations: InstanceType<ThreeModule["AnimationClip"]>[] = [];

			if (format === "obj") {
				const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
				const loader = new OBJLoader();
				if (cfg.materialSrc) {
					const { MTLLoader } = await import("three/examples/jsm/loaders/MTLLoader.js");
					const materials = await new MTLLoader().loadAsync(cfg.materialSrc);
					materials.preload();
					loader.setMaterials(materials);
				}
				if (disposed) {
					renderer.dispose();
					return undefined;
				}
				modelRoot = await loader.loadAsync(cfg.src);
			} else {
				const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
				if (disposed) {
					renderer.dispose();
					return undefined;
				}
				const gltf = await new GLTFLoader().loadAsync(cfg.src);
				modelRoot = gltf.scene;
				fileAnimations = gltf.animations;
			}

			if (!modelRoot) {
				renderer.dispose();
				return undefined;
			}
			if (disposed) {
				disposeObjectTree(modelRoot);
				renderer.dispose();
				return undefined;
			}

			let mixer: InstanceType<ThreeModule["AnimationMixer"]> | null = null;
			let activeAction: InstanceType<ThreeModule["AnimationAction"]> | null = null;
			const boneMap = new Map<string, any>();
			const boneBaseState = new Map<string, BoneBaseState>();
			boneMap.set("$root", modelRoot);
			boneBaseState.set("$root", baseState(modelRoot));
			modelRoot.traverse((object: any) => {
				if (!object.isBone || !object.name) return;
				boneMap.set(object.name, object);
				boneBaseState.set(object.name, baseState(object));
			});

			let boneTracks: ReturnType<typeof routeAnimation>["boneTracks"] = [];
			if (cfg.animation) {
				const route = routeAnimation(cfg.animation, 240);
				boneTracks = route.boneTracks;
				if (route.clipName && fileAnimations.length > 0) {
					const clip = fileAnimations.find((candidate) => candidate.name === route.clipName) ?? fileAnimations[0];
					if (clip) {
						mixer = new THREE.AnimationMixer(modelRoot);
						activeAction = mixer.clipAction(clip);
						activeAction.timeScale = route.clipSpeed;
						activeAction.play();
					}
				}
			}

			let lookTarget: any = null;
			const lookContent = cfg.camera?.look?.content;
			if (typeof lookContent === "string") lookTarget = boneMap.get(lookContent) ?? null;

			setWireframe(modelRoot, cfg.settings?.wireframe ?? false);
			scene.add(modelRoot);

			let raf = 0;
			let contextLost = false;
			let visibilityCheckRaf = 0;
			let resizeObserver: ResizeObserver | undefined;
			let intersectionObserver: IntersectionObserver | undefined;
			let fallbackViewportCheck: (() => void) | null = null;
			let nearViewport = false;
			let documentVisible = !document.hidden;
			let running = false;
			let releaseFrameMonitor: (() => void) | null = null;
			const clock = new THREE.Clock(false);
			const configuredFps = cfg.settings?.fps;
			const targetFps = typeof configuredFps === "number" && Number.isFinite(configuredFps)
				? Math.min(240, Math.max(1, configuredFps))
				: 60;
			const fpsInterval = 1 / targetFps;
			let fpsAccumulator = 0;
			let sourceAnimationTime = 0;
			const sourceDuration = 240 / targetFps;
			const continuous = Boolean(mixer || boneTracks.length > 0);

			const applyBoneTracks = (normalTime: number): void => {
				for (const track of boneTracks) {
					const target = boneMap.get(track.bone);
					if (!target) continue;
					const sampled = sampleBoneTrack(track, normalTime);
					const base = boneBaseState.get(track.bone);

					if (sampled.move) {
						if (track.mode === "additive") {
							const originX = mixer ? target.position.x : (base?.position[0] ?? 0);
							const originY = mixer ? target.position.y : (base?.position[1] ?? 0);
							const originZ = mixer ? target.position.z : (base?.position[2] ?? 0);
							target.position.set(
								originX + sampled.move[0],
								originY + sampled.move[1],
								originZ + sampled.move[2],
							);
						} else {
							target.position.set(sampled.move[0], sampled.move[1], sampled.move[2]);
						}
					}

					if (sampled.rotate) {
						const rotationX = toRad(sampled.rotate[0]);
						const rotationY = toRad(sampled.rotate[1]);
						const rotationZ = toRad(sampled.rotate[2]);
						if (track.mode === "additive") {
							const originX = mixer ? target.rotation.x : (base?.rotation[0] ?? 0);
							const originY = mixer ? target.rotation.y : (base?.rotation[1] ?? 0);
							const originZ = mixer ? target.rotation.z : (base?.rotation[2] ?? 0);
							target.rotation.set(
								originX + rotationX,
								originY + rotationY,
								originZ + rotationZ,
							);
						} else {
							target.rotation.set(rotationX, rotationY, rotationZ);
						}
					}

					if (sampled.scale) {
						if (track.mode === "additive") {
							const originX = mixer ? target.scale.x : (base?.scale[0] ?? 1);
							const originY = mixer ? target.scale.y : (base?.scale[1] ?? 1);
							const originZ = mixer ? target.scale.z : (base?.scale[2] ?? 1);
							target.scale.set(
								originX * sampled.scale[0],
								originY * sampled.scale[1],
								originZ * sampled.scale[2],
							);
						} else {
							target.scale.set(sampled.scale[0], sampled.scale[1], sampled.scale[2]);
						}
					}
				}
			};

			const lookWorldPosition = lookTarget ? new THREE.Vector3() : null;
			const updateCameraConstraint = (): void => {
				if (lookTarget && lookWorldPosition) {
					lookTarget.getWorldPosition(lookWorldPosition);
					camera.lookAt(lookWorldPosition);
				} else if (Array.isArray(cfg.camera?.look?.content)) {
					camera.lookAt(...(cfg.camera!.look!.content as [number, number, number]));
				}
			};

			const renderOnce = (): void => {
				if (disposed || contextLost || !nearViewport || !documentVisible) return;
				updateCameraConstraint();
				renderer.render(scene, camera);
			};

			const resizeRenderer = (): void => {
				if (disposed) return;
				const nextWidth = Math.max(1, (width ?? canvas.clientWidth) || initialWidth);
				const nextHeight = Math.max(1, (height ?? canvas.clientHeight) || initialHeight);
				const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
				const sizeChanged = nextWidth !== currentWidth || nextHeight !== currentHeight;
				const pixelRatioChanged = nextPixelRatio !== currentPixelRatio;
				if (!sizeChanged && !pixelRatioChanged) return;

				currentWidth = nextWidth;
				currentHeight = nextHeight;
				if (pixelRatioChanged) {
					currentPixelRatio = nextPixelRatio;
					renderer.setPixelRatio(currentPixelRatio);
				}
				if (sizeChanged) {
					camera.aspect = nextWidth / nextHeight;
					camera.updateProjectionMatrix();
				}
				renderer.setSize(nextWidth, nextHeight, false);
				if (!continuous) renderOnce();
			};

			const checkViewportFallback = (): void => {
				if (visibilityCheckRaf !== 0 || disposed) return;
				visibilityCheckRaf = window.requestAnimationFrame(() => {
					visibilityCheckRaf = 0;
					if (disposed) return;
					const rect = canvas.getBoundingClientRect();
					const nextNear = rect.bottom > -200
						&& rect.top < window.innerHeight + 200
						&& rect.right > -200
						&& rect.left < window.innerWidth + 200;
					if (nextNear === nearViewport) return;
					nearViewport = nextNear;
					if (nearViewport) startLoop();
					else stopLoop();
				});
			};

			const tick = (): void => {
				if (disposed || !running) return;
				if (contextLost || !nearViewport || !documentVisible) {
					running = false;
					raf = 0;
					clock.stop();
					releaseFrameMonitor?.();
					releaseFrameMonitor = null;
					return;
				}

				const delta = Math.min(clock.getDelta(), 0.1);
				fpsAccumulator += delta;
				if (fpsAccumulator >= fpsInterval) {
					const step = fpsAccumulator;
					fpsAccumulator %= fpsInterval;
					if (mixer) mixer.update(step);
					sourceAnimationTime += step;
					if (boneTracks.length > 0) {
						const clipDuration = activeAction?.getClip()?.duration;
						const duration = Math.max(0.001, clipDuration ?? sourceDuration);
						const normalTime = (mixer ? mixer.time : sourceAnimationTime) % duration / duration;
						applyBoneTracks(normalTime);
					}
					updateCameraConstraint();
					renderer.render(scene, camera);
				}
				raf = requestAnimationFrame(tick);
			};

			const startLoop = (): void => {
				if (!continuous) {
					renderOnce();
					return;
				}
				if (running || disposed || contextLost || !nearViewport || !documentVisible) return;
				running = true;
				releaseFrameMonitor ??= EngineScheduler.acquireFrameMonitor();
				fpsAccumulator = 0;
				clock.start();
				raf = requestAnimationFrame(tick);
			};

			const stopLoop = (): void => {
				if (running || raf !== 0) {
					running = false;
					if (raf !== 0) cancelAnimationFrame(raf);
					raf = 0;
					clock.stop();
				}
				releaseFrameMonitor?.();
				releaseFrameMonitor = null;
			};

			const handleContextLost = (event: Event): void => {
				event.preventDefault();
				contextLost = true;
				stopLoop();
			};
			const handleContextRestored = (): void => {
				contextLost = false;
				resizeRenderer();
				if (!continuous) renderOnce();
				startLoop();
			};
			canvas.addEventListener("webglcontextlost", handleContextLost);
			canvas.addEventListener("webglcontextrestored", handleContextRestored);

			window.addEventListener("resize", resizeRenderer, { passive: true });
			if (typeof ResizeObserver !== "undefined") {
				resizeObserver = new ResizeObserver(resizeRenderer);
				resizeObserver.observe(canvas.parentElement ?? canvas);
			}

			if (typeof IntersectionObserver !== "undefined") {
				intersectionObserver = new IntersectionObserver(([entry]) => {
					nearViewport = Boolean(entry?.isIntersecting);
					if (nearViewport) startLoop();
					else stopLoop();
				}, { rootMargin: "200px 0px", threshold: 0.01 });
				intersectionObserver.observe(canvas);
			} else {
				fallbackViewportCheck = checkViewportFallback;
				window.addEventListener("scroll", checkViewportFallback, { passive: true });
				window.addEventListener("resize", checkViewportFallback, { passive: true });
				checkViewportFallback();
			}

			const onVisibilityChange = (): void => {
				documentVisible = !document.hidden;
				if (documentVisible) startLoop();
				else stopLoop();
			};
			document.addEventListener("visibilitychange", onVisibilityChange);
			startLoop();

			return () => {
				stopLoop();
				resizeObserver?.disconnect();
				intersectionObserver?.disconnect();
				window.removeEventListener("resize", resizeRenderer);
				canvas.removeEventListener("webglcontextlost", handleContextLost);
				canvas.removeEventListener("webglcontextrestored", handleContextRestored);
				if (fallbackViewportCheck) {
					window.removeEventListener("scroll", fallbackViewportCheck);
					window.removeEventListener("resize", fallbackViewportCheck);
				}
				if (visibilityCheckRaf !== 0) window.cancelAnimationFrame(visibilityCheckRaf);
				document.removeEventListener("visibilitychange", onVisibilityChange);
				mixer?.stopAllAction();
				if (mixer && modelRoot) mixer.uncacheRoot(modelRoot);
				disposeObjectTree(modelRoot);
				renderer.dispose();
			};
		}

		void init(mountedCanvas)
			.then((cleanup) => {
				if (disposed) cleanup?.();
				else cleanupInitializedRuntime = cleanup;
			})
			.catch((error) => {
				if (!disposed) console.error("[EngineManim3D] Failed to initialize model renderer.", error);
			});

		return () => {
			disposed = true;
			cleanupInitializedRuntime?.();
		};
	}, [cfgKey, width, height]);

	const canvasStyle: CSSProperties = {
		display: "block",
		width: width ? `${width}px` : "100%",
		height: height ? `${height}px` : "100%",
		minHeight: height ? undefined : "150px",
		...style,
	};

	return (
		<canvas
			ref={canvasRef}
			className={className}
			style={canvasStyle}
			width={width}
			height={height}
		/>
	);
});
