import type {
  EngineThemeDefinition,
  EngineThemeScope,
} from "../schema/types";

const MAX_THEME_DEPTH = 32;
const MAX_THEME_NODES = 10_000;
const MAX_THEME_LENGTH = 512 * 1024;
const GROUP_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export interface ParsedEngineThemeId {
  groupId: string;
  componentId?: string;
  subthemes: string[];
}

/**
 * Parse a group or qualified component-theme ID.
 *
 * Grammar: <group>[.<component>[.<subtheme>...]]
 * A component can have at most three subtheme segments.
 */
export function parseEngineThemeId(id: string): ParsedEngineThemeId {
  if (typeof id !== "string" || id.length === 0 || id.length > 240) {
    throw new TypeError("EngineTheme ID must be a non-empty string of at most 240 characters.");
  }

  const segments = id.split(".");
  if (segments.some((segment) => !SEGMENT_PATTERN.test(segment))) {
    throw new TypeError("Invalid EngineTheme ID: use dot-separated alphanumeric, underscore, or hyphen segments.");
  }
  if (segments.length > 5) {
    throw new TypeError("EngineTheme ID supports a component plus at most three subtheme segments.");
  }

  return {
    groupId: segments[0],
    ...(segments.length >= 2 ? { componentId: segments[1] } : {}),
    subthemes: segments.slice(2),
  };
}

function assertJsonData(
  value: unknown,
  path: string,
  state: { nodes: number; active: Set<object> },
  depth: number,
): void {
  state.nodes += 1;
  if (state.nodes > MAX_THEME_NODES) {
    throw new TypeError("EngineTheme exceeds the maximum of " + MAX_THEME_NODES + " values.");
  }
  if (depth > MAX_THEME_DEPTH) {
    throw new TypeError("EngineTheme nesting exceeds " + MAX_THEME_DEPTH + " levels at " + path + ".");
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("EngineTheme contains a non-finite number at " + path + ".");
    return;
  }
  if (typeof value !== "object") {
    throw new TypeError("EngineTheme must be JSON data; unsupported value at " + path + ".");
  }

  const object = value as object;
  if (state.active.has(object)) {
    throw new TypeError("EngineTheme contains a cyclic reference at " + path + ".");
  }
  const prototype = Object.getPrototypeOf(object);
  if (!Array.isArray(object) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("EngineTheme values must use plain objects or arrays at " + path + ".");
  }
  if (Object.getOwnPropertySymbols(object).length > 0) {
    throw new TypeError("EngineTheme cannot contain symbol keys at " + path + ".");
  }

  state.active.add(object);
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      throw new TypeError("EngineTheme arrays cannot have extra properties or sparse entries at " + path + ".");
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) throw new TypeError("EngineTheme arrays cannot contain holes at " + path + ".");
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) {
        throw new TypeError("EngineTheme arrays cannot contain accessors at " + path + "[" + index + "].");
      }
      assertJsonData(descriptor.value, path + "[" + index + "]", state, depth + 1);
    }
  } else {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (DANGEROUS_KEYS.has(key)) {
        throw new TypeError("EngineTheme contains a reserved property name at " + path + "." + key + ".");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) {
        throw new TypeError("EngineTheme cannot contain accessors at " + path + "." + key + ".");
      }
      assertJsonData(descriptor.value, path + "." + key, state, depth + 1);
    }
  }
  state.active.delete(object);
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Define a serializable theme group. Construction performs local validation
 * only: it never fetches URLs, downloads assets, publishes the theme, or
 * evaluates code. NENC extracts statically resolvable calls into .etr files.
 */
export function createTheme<T extends EngineThemeDefinition>(
  definition: T,
): Readonly<T & { scope: EngineThemeScope }> {
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    throw new TypeError("createTheme() expects a plain theme definition object.");
  }

  // Validate before reading properties so getters cannot execute during
  // construction; themes are plain data, not user-defined runtime objects.
  assertJsonData(definition, "theme", { nodes: 0, active: new Set<object>() }, 0);
  const candidate = definition as Record<string, unknown>;
  if (typeof candidate.id !== "string" || !GROUP_ID_PATTERN.test(candidate.id)) {
    throw new TypeError("createTheme() requires a group ID without dots, such as mycoolthemes.");
  }

  const scope = candidate.scope === undefined ? "local" : candidate.scope;
  if (scope !== "local" && scope !== "global" && scope !== "remote") {
    throw new TypeError("EngineTheme scope must be local, global, or remote.");
  }

  const normalized = { ...definition, scope } as T & { scope: EngineThemeScope };

  let serialized: string;
  try {
    serialized = JSON.stringify(normalized);
  } catch {
    throw new TypeError("EngineTheme could not be serialized as JSON data.");
  }
  if (serialized.length > MAX_THEME_LENGTH) {
    throw new TypeError("EngineTheme exceeds the " + MAX_THEME_LENGTH + "-character size limit.");
  }

  // Clone once so later mutations to the caller's object cannot change a
  // registered/build-time definition. Themes are generally created once at
  // module initialization, so this bounded copy is cheaper than runtime work.
  const clone = JSON.parse(serialized) as T & { scope: EngineThemeScope };
  return freezeDeep(clone);
}
