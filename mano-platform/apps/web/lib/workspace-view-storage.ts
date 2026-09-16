export const WORKSPACE_VIEW_STORAGE_KEY = "mano.workspace.view";
const CURRENT_VERSION = 1;

export interface WorkspaceViewState {
  readonly openTabIds: readonly string[];
  readonly activeTabId: string | null;
  readonly splitMode: "none" | "vertical" | "horizontal";
  readonly splitPercent: number;
  readonly secondaryTabIds: readonly string[];
  readonly secondaryActiveTabId: string | null;
  readonly sidebarWidth: number;
  readonly sidebarCollapsed: boolean;
  readonly collapsedFolderIds: readonly string[];
  readonly primaryPreview: boolean;
  readonly secondaryPreview: boolean;
}

interface StoredWorkspaceView {
  readonly version: number;
  readonly view: WorkspaceViewState;
}

export type WorkspaceViewLoadResult =
  | { readonly status: "empty" | "loaded"; readonly view: WorkspaceViewState }
  | { readonly status: "recovered"; readonly view: WorkspaceViewState; readonly reason: string };

const emptyView = (): WorkspaceViewState => ({
  openTabIds: [], activeTabId: null, splitMode: "none", splitPercent: 50,
  secondaryTabIds: [], secondaryActiveTabId: null,
  sidebarWidth: 304, sidebarCollapsed: false, collapsedFolderIds: [],
  primaryPreview: false, secondaryPreview: false,
});

function normalizeWorkspaceView(value: unknown): WorkspaceViewState | null {
  if (!value || typeof value !== "object") return null;
  const view = value as Record<string, unknown>;
  if (!Array.isArray(view.openTabIds) || !view.openTabIds.every((id) => typeof id === "string" && id.trim() !== "")) return null;
  if (new Set(view.openTabIds).size !== view.openTabIds.length) return null;
  if (!(view.activeTabId === null || typeof view.activeTabId === "string")) return null;
  const splitMode = view.splitMode ?? "none";
  const splitPercent = view.splitPercent ?? 50;
  const secondaryTabIds = view.secondaryTabIds ?? [];
  const secondaryActiveTabId = view.secondaryActiveTabId ?? null;
  const sidebarWidth = view.sidebarWidth ?? 304;
  const sidebarCollapsed = view.sidebarCollapsed ?? false;
  const collapsedFolderIds = view.collapsedFolderIds ?? [];
  const primaryPreview = view.primaryPreview ?? false;
  const secondaryPreview = view.secondaryPreview ?? false;
  if (!(splitMode === "none" || splitMode === "vertical" || splitMode === "horizontal")) return null;
  if (typeof splitPercent !== "number" || !Number.isFinite(splitPercent) || splitPercent < 25 || splitPercent > 75) return null;
  if (!Array.isArray(secondaryTabIds) || !secondaryTabIds.every((id) => typeof id === "string" && id.trim() !== "")) return null;
  if (new Set(secondaryTabIds).size !== secondaryTabIds.length) return null;
  if (!(secondaryActiveTabId === null || typeof secondaryActiveTabId === "string")) return null;
  if (typeof sidebarWidth !== "number" || !Number.isFinite(sidebarWidth) || sidebarWidth < 220 || sidebarWidth > 480) return null;
  if (typeof sidebarCollapsed !== "boolean" || typeof primaryPreview !== "boolean" || typeof secondaryPreview !== "boolean") return null;
  if (!Array.isArray(collapsedFolderIds) || !collapsedFolderIds.every((id) => typeof id === "string" && id.trim() !== "")) return null;
  if (new Set(collapsedFolderIds).size !== collapsedFolderIds.length) return null;
  return { openTabIds: view.openTabIds, activeTabId: view.activeTabId, splitMode, splitPercent, secondaryTabIds, secondaryActiveTabId, sidebarWidth, sidebarCollapsed, collapsedFolderIds, primaryPreview, secondaryPreview } as WorkspaceViewState;
}

export function loadWorkspaceView(storage: Pick<Storage, "getItem">): WorkspaceViewLoadResult {
  try {
    const raw = storage.getItem(WORKSPACE_VIEW_STORAGE_KEY);
    if (raw === null) return { status: "empty", view: emptyView() };
    const parsed = JSON.parse(raw) as Partial<StoredWorkspaceView>;
    if (parsed.version !== CURRENT_VERSION) {
      return { status: "recovered", view: emptyView(), reason: "지원하지 않는 탭 저장 버전입니다." };
    }
    const view = normalizeWorkspaceView(parsed.view);
    if (!view) {
      return { status: "recovered", view: emptyView(), reason: "저장된 탭 상태가 올바르지 않습니다." };
    }
    return { status: "loaded", view };
  } catch {
    return { status: "recovered", view: emptyView(), reason: "저장된 탭 상태를 읽을 수 없습니다." };
  }
}

export function saveWorkspaceView(storage: Pick<Storage, "setItem">, view: WorkspaceViewState): void {
  storage.setItem(WORKSPACE_VIEW_STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, view } satisfies StoredWorkspaceView));
}
