export const WORKSPACE_VIEW_STORAGE_KEY = "mano.workspace.view";
const CURRENT_VERSION = 1;

export interface WorkspaceViewState {
  readonly openTabIds: readonly string[];
  readonly activeTabId: string | null;
}

interface StoredWorkspaceView {
  readonly version: number;
  readonly view: WorkspaceViewState;
}

export type WorkspaceViewLoadResult =
  | { readonly status: "empty" | "loaded"; readonly view: WorkspaceViewState }
  | { readonly status: "recovered"; readonly view: WorkspaceViewState; readonly reason: string };

const emptyView = (): WorkspaceViewState => ({ openTabIds: [], activeTabId: null });

function isWorkspaceView(value: unknown): value is WorkspaceViewState {
  if (!value || typeof value !== "object") return false;
  const view = value as { openTabIds?: unknown; activeTabId?: unknown };
  if (!Array.isArray(view.openTabIds) || !view.openTabIds.every((id) => typeof id === "string" && id.trim() !== "")) return false;
  if (new Set(view.openTabIds).size !== view.openTabIds.length) return false;
  return view.activeTabId === null || typeof view.activeTabId === "string";
}

export function loadWorkspaceView(storage: Pick<Storage, "getItem">): WorkspaceViewLoadResult {
  try {
    const raw = storage.getItem(WORKSPACE_VIEW_STORAGE_KEY);
    if (raw === null) return { status: "empty", view: emptyView() };
    const parsed = JSON.parse(raw) as Partial<StoredWorkspaceView>;
    if (parsed.version !== CURRENT_VERSION) {
      return { status: "recovered", view: emptyView(), reason: "지원하지 않는 탭 저장 버전입니다." };
    }
    if (!isWorkspaceView(parsed.view)) {
      return { status: "recovered", view: emptyView(), reason: "저장된 탭 상태가 올바르지 않습니다." };
    }
    return { status: "loaded", view: parsed.view };
  } catch {
    return { status: "recovered", view: emptyView(), reason: "저장된 탭 상태를 읽을 수 없습니다." };
  }
}

export function saveWorkspaceView(storage: Pick<Storage, "setItem">, view: WorkspaceViewState): void {
  storage.setItem(WORKSPACE_VIEW_STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, view } satisfies StoredWorkspaceView));
}
