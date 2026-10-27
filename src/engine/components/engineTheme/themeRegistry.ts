import type { EngineComponentRegistry } from "../../core/registry";
import type { EngineThemeDefinition } from "../../schema/types";

export interface ScopedEngineThemeGroup {
  definition: Readonly<EngineThemeDefinition>;
  canonical: string;
  allowRemote: boolean;
}

const stores = new WeakMap<EngineComponentRegistry, Map<string, ScopedEngineThemeGroup>>();

function storeFor(registry: EngineComponentRegistry): Map<string, ScopedEngineThemeGroup> {
  let store = stores.get(registry);
  if (!store) {
    store = new Map();
    stores.set(registry, store);
  }
  return store;
}

/** @internal Register an already validated/frozen theme group into one app scope. */
export function registerScopedEngineThemeGroup(
  registry: EngineComponentRegistry,
  definition: Readonly<EngineThemeDefinition>,
  canonical: string,
  kind: "global" | "remote",
): void {
  const id = definition.id;
  if (typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) {
    throw new TypeError("Scoped EngineTheme registration requires a valid group ID.");
  }
  const store = storeFor(registry);
  const existing = store.get(id);
  if (kind === "global") {
    if (existing) {
      if (existing.allowRemote || existing.canonical !== canonical) {
        throw new Error("EngineTheme group ID '" + id + "' is already registered in this EngineComponentRegistry with a different definition.");
      }
      return;
    }
    store.set(id, { definition, canonical, allowRemote: false });
    return;
  }
  if (existing && !existing.allowRemote) {
    throw new Error("Remote EngineTheme ID '" + id + "' conflicts with an already registered local/global theme in this EngineComponentRegistry.");
  }
  store.set(id, { definition, canonical, allowRemote: true });
}

/** @internal Read a theme group only from the supplied application scope. */
export function getScopedEngineThemeGroup(
  registry: EngineComponentRegistry,
  id: string,
): ScopedEngineThemeGroup | undefined {
  return stores.get(registry)?.get(id);
}

/** @internal Remove a verified remote group from only the supplied scope. */
export function unregisterScopedRemoteEngineThemeGroup(
  registry: EngineComponentRegistry,
  id: string,
): boolean {
  const store = stores.get(registry);
  const existing = store?.get(id);
  if (!store || !existing || !existing.allowRemote) return false;
  return store.delete(id);
}
