"use client";

import {
  PageTreeError,
  createDocument,
  createNode,
  deleteNodePermanently,
  insertBlock,
  isNodeInTrash,
  renameNode,
  restoreNode,
  trashNode,
  updateBlockText,
  type DocumentState,
  type PageTreeState,
  type WorkspaceNode,
  type WorkspaceNodeKind,
} from "@mano/editor-core";
import { type ChangeEvent, type CSSProperties, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";

import { loadTree, saveTree } from "../lib/tree-storage";
import { loadDocuments, saveDocuments, type DocumentMap } from "../lib/document-storage";
import { appendRevision, loadRevisions, saveRevisions, type RevisionMap } from "../lib/revision-storage";
import { BackupError, createBackup, parseBackup } from "../lib/workspace-backup";
import { searchWorkspace } from "../lib/workspace-search";
import { collectPageReferences } from "../lib/workspace-references";
import { collectWorkspaceTags } from "../lib/workspace-tags";
import { loadWorkspaceView, saveWorkspaceView } from "../lib/workspace-view-storage";
import { NotionMarkdownEditor } from "./notion-markdown-editor";

const initialTree: PageTreeState = { nodes: [] };
const DEFAULT_SIDEBAR_WIDTH = 304;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 480;
const MIN_SPLIT_PERCENT = 25;
const MAX_SPLIT_PERCENT = 75;
const MAX_HISTORY_ENTRIES = 100;
const MAX_MARKDOWN_FILE_SIZE = 5 * 1024 * 1024;

interface PageEditHistory {
  readonly past: readonly string[];
  readonly future: readonly string[];
}

function emptyPageDocument(pageId: string): DocumentState {
  return insertBlock(createDocument(pageId), 0, { id: `${pageId}:body`, type: "paragraph", text: "" });
}

function newId(kind: WorkspaceNodeKind): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${kind}-${suffix}`;
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("File read failed")));
    reader.readAsText(file);
  });
}

function activeChildren(tree: PageTreeState, parentId: string | null): WorkspaceNode[] {
  return tree.nodes
    .filter((node) => node.parentId === parentId && !isNodeInTrash(tree, node.id))
    .sort((left, right) => left.order - right.order);
}

function trashRoots(tree: PageTreeState): WorkspaceNode[] {
  return tree.nodes
    .filter((node) => node.trashed)
    .filter((node) => {
      let parentId = node.parentId;
      while (parentId !== null) {
        const parent = tree.nodes.find((candidate) => candidate.id === parentId);
        if (!parent) return false;
        if (parent.trashed) return false;
        parentId = parent.parentId;
      }
      return true;
    })
    .sort((left, right) => left.order - right.order);
}

interface TreeBranchProps {
  readonly tree: PageTreeState;
  readonly parentId: string | null;
  readonly selectedId: string | null;
  readonly collapsedFolderIds: ReadonlySet<string>;
  readonly onSelect: (id: string) => void;
  readonly onToggleFolder: (id: string) => void;
}

function TreeBranch({ tree, parentId, selectedId, collapsedFolderIds, onSelect, onToggleFolder }: TreeBranchProps) {
  const children = activeChildren(tree, parentId);
  if (children.length === 0) return null;

  return (
    <ul className="tree-list">
      {children.map((node) => (
        <li key={node.id}>
          <div className="tree-row">
            {node.kind === "folder" ? <button className="tree-disclosure" type="button" aria-label={collapsedFolderIds.has(node.id) ? "하위 항목 펼치기" : "하위 항목 접기"} aria-expanded={!collapsedFolderIds.has(node.id)} title={`${node.title} ${collapsedFolderIds.has(node.id) ? "펼치기" : "접기"}`} onClick={() => onToggleFolder(node.id)}>{collapsedFolderIds.has(node.id) ? "▸" : "▾"}</button> : <span className="tree-leaf" aria-hidden="true">·</span>}
            <button className="tree-item" data-node-id={node.id} data-selected={node.id === selectedId} type="button" onClick={() => onSelect(node.id)}>
              <span>{node.title}</span>
            </button>
          </div>
          {node.kind === "folder" && !collapsedFolderIds.has(node.id) ? <TreeBranch tree={tree} parentId={node.id} selectedId={selectedId} collapsedFolderIds={collapsedFolderIds} onSelect={onSelect} onToggleFolder={onToggleFolder} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function Workspace() {
  const [tree, setTree] = useState<PageTreeState>(initialTree);
  const [documents, setDocuments] = useState<DocumentMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [treeDirty, setTreeDirty] = useState(false);
  const [documentsDirty, setDocumentsDirty] = useState(false);
  const [storageStatus, setStorageStatus] = useState<"loading" | "saved" | "failed">("loading");
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [markdownFileMessage, setMarkdownFileMessage] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const viewBaselineRef = useRef<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [splitMode, setSplitMode] = useState<"none" | "vertical" | "horizontal">("none");
  const [splitPercent, setSplitPercent] = useState(50);
  const [resizingSplit, setResizingSplit] = useState(false);
  const [secondarySelectedId, setSecondarySelectedId] = useState<string | null>(null);
  const [secondaryTabIds, setSecondaryTabIds] = useState<string[]>([]);
  const [secondaryCandidateId, setSecondaryCandidateId] = useState("");
  const [primaryPreview, setPrimaryPreview] = useState(false);
  const [secondaryPreview, setSecondaryPreview] = useState(false);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(() => new Set());
  const [cursorState, setCursorState] = useState<{ pane: "primary" | "secondary"; pageId: string; start: number; end: number } | null>(null);
  const [editHistory, setEditHistory] = useState<Record<string, PageEditHistory>>({});
  const [revisions, setRevisions] = useState<RevisionMap>({});
  const [selectedRevisionIds, setSelectedRevisionIds] = useState<Record<string, string>>({});
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);
  const primaryEditorRef = useRef<HTMLTextAreaElement>(null);
  const secondaryEditorRef = useRef<HTMLTextAreaElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [creationKind, setCreationKind] = useState<WorkspaceNodeKind | null>(null);
  const [creationParentId, setCreationParentId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => tree.nodes.find((node) => node.id === selectedId) ?? null, [selectedId, tree.nodes]);
  const recoverableTrash = useMemo(() => trashRoots(tree), [tree]);
  const deleteTarget = useMemo(
    () => recoverableTrash.find((node) => node.id === deleteTargetId) ?? null,
    [deleteTargetId, recoverableTrash],
  );
  const searchResults = useMemo(
    () => searchWorkspace(tree, documents, searchQuery),
    [documents, searchQuery, tree],
  );
  const workspaceTags = useMemo(() => collectWorkspaceTags(tree, documents), [documents, tree]);
  const isSearching = searchQuery.trim().length > 0;

  function selectNode(nodeId: string) {
    const node = tree.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    setSelectedId(nodeId);
    if (node.kind === "page") {
      setOpenTabIds((current) => current.includes(nodeId) ? current : [...current, nodeId]);
    }
  }

  function toggleFolder(nodeId: string) {
    setCollapsedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function closeTab(nodeId: string) {
    setOpenTabIds((current) => {
      const closedIndex = current.indexOf(nodeId);
      const next = current.filter((id) => id !== nodeId);
      if (selectedId === nodeId) {
        setSelectedId(next[Math.min(closedIndex, next.length - 1)] ?? null);
      }
      return next;
    });
  }

  function openSecondaryTab(nodeId: string) {
    const node = tree.nodes.find((candidate) => candidate.id === nodeId);
    if (!node || node.kind !== "page" || isNodeInTrash(tree, nodeId)) return;
    setSecondaryTabIds((current) => current.includes(nodeId) ? current : [...current, nodeId]);
    setSecondarySelectedId(nodeId);
    setSecondaryCandidateId("");
  }

  function closeSecondaryTab(nodeId: string) {
    setSecondaryTabIds((current) => {
      const closedIndex = current.indexOf(nodeId);
      const next = current.filter((id) => id !== nodeId);
      if (secondarySelectedId === nodeId) {
        setSecondarySelectedId(next[Math.min(closedIndex, next.length - 1)] ?? null);
      }
      return next;
    });
  }

  function moveTab(nodeId: string, targetIndex: number) {
    setOpenTabIds((current) => {
      const sourceIndex = current.indexOf(nodeId);
      if (sourceIndex < 0) return current;
      const boundedTarget = Math.max(0, Math.min(targetIndex, current.length - 1));
      if (sourceIndex === boundedTarget) return current;
      const next = [...current];
      next.splice(sourceIndex, 1);
      next.splice(boundedTarget, 0, nodeId);
      return next;
    });
  }

  function dropTab(targetId: string) {
    if (draggedTabId === null || draggedTabId === targetId) return;
    const targetIndex = openTabIds.indexOf(targetId);
    if (targetIndex >= 0) moveTab(draggedTabId, targetIndex);
    setDraggedTabId(null);
  }

  useEffect(() => {
    setRenameTitle(selected?.title ?? "");
  }, [selected]);

  useEffect(() => {
    if (pendingRenameId === null || selected?.id !== pendingRenameId) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
    setPendingRenameId(null);
  }, [pendingRenameId, selected]);

  useEffect(() => {
    const loadedTree = loadTree(window.localStorage);
    const loadedDocuments = loadDocuments(window.localStorage);
    const loadedRevisions = loadRevisions(window.localStorage);
    const loadedView = loadWorkspaceView(window.localStorage);
    const availablePageIds = new Set(loadedTree.tree.nodes
      .filter((node) => node.kind === "page" && !isNodeInTrash(loadedTree.tree, node.id))
      .map((node) => node.id));
    const restoredTabIds = loadedView.view.openTabIds.filter((id) => availablePageIds.has(id));
    const restoredActiveId = loadedView.view.activeTabId !== null && restoredTabIds.includes(loadedView.view.activeTabId)
      ? loadedView.view.activeTabId
      : restoredTabIds.at(-1) ?? null;
    const restoredSecondaryTabIds = loadedView.view.secondaryTabIds.filter((id) => availablePageIds.has(id));
    const restoredSecondaryActiveId = loadedView.view.secondaryActiveTabId !== null && restoredSecondaryTabIds.includes(loadedView.view.secondaryActiveTabId)
      ? loadedView.view.secondaryActiveTabId
      : restoredSecondaryTabIds.at(-1) ?? null;
    const availableFolderIds = new Set(loadedTree.tree.nodes.filter((node) => node.kind === "folder" && !isNodeInTrash(loadedTree.tree, node.id)).map((node) => node.id));
    const restoredCollapsedFolderIds = loadedView.view.collapsedFolderIds.filter((id) => availableFolderIds.has(id));
    viewBaselineRef.current = JSON.stringify(loadedView.view);
    setTree(loadedTree.tree);
    setDocuments(loadedDocuments.documents);
    setRevisions(loadedRevisions.revisions);
    setOpenTabIds(restoredTabIds);
    setSelectedId(restoredActiveId);
    setSplitMode(loadedView.view.splitMode);
    setSplitPercent(loadedView.view.splitPercent);
    setSecondaryTabIds(restoredSecondaryTabIds);
    setSecondarySelectedId(restoredSecondaryActiveId);
    setSidebarWidth(loadedView.view.sidebarWidth);
    setSidebarCollapsed(loadedView.view.sidebarCollapsed);
    setCollapsedFolderIds(new Set(restoredCollapsedFolderIds));
    setPrimaryPreview(loadedView.view.primaryPreview);
    setSecondaryPreview(loadedView.view.secondaryPreview);
    const warnings = [
      loadedTree.status === "recovered" ? `${loadedTree.reason} 빈 작업 공간으로 복구했습니다.` : null,
      loadedDocuments.status === "recovered" ? `${loadedDocuments.reason} 빈 본문으로 복구했습니다.` : null,
      loadedRevisions.status === "recovered" ? `${loadedRevisions.reason} 빈 버전 기록으로 복구했습니다.` : null,
      loadedView.status === "recovered" ? `${loadedView.reason} 빈 탭 상태로 복구했습니다.` : null,
    ].filter((warning): warning is string => warning !== null);
    setStorageWarning(warnings.length > 0 ? warnings.join(" ") : null);
    setStorageStatus("saved");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || (!treeDirty && !documentsDirty)) return;
    try {
      if (treeDirty) saveTree(window.localStorage, tree);
      if (documentsDirty) saveDocuments(window.localStorage, documents);
      setStorageStatus("saved");
      setTreeDirty(false);
      setDocumentsDirty(false);
    } catch {
      setStorageStatus("failed");
    }
  }, [documents, documentsDirty, hydrated, tree, treeDirty]);

  useEffect(() => {
    if (!hydrated) return;
    const view = {
      openTabIds,
      activeTabId: openTabIds.includes(selectedId ?? "") ? selectedId : null,
      splitMode,
      splitPercent,
      secondaryTabIds,
      secondaryActiveTabId: secondaryTabIds.includes(secondarySelectedId ?? "") ? secondarySelectedId : null,
      sidebarWidth,
      sidebarCollapsed,
      collapsedFolderIds: [...collapsedFolderIds],
      primaryPreview,
      secondaryPreview,
    };
    const serializedView = JSON.stringify(view);
    if (serializedView === viewBaselineRef.current) return;
    try {
      saveWorkspaceView(window.localStorage, view);
      viewBaselineRef.current = serializedView;
    } catch {
      setStorageStatus("failed");
    }
  }, [collapsedFolderIds, hydrated, openTabIds, primaryPreview, secondaryPreview, secondarySelectedId, secondaryTabIds, selectedId, sidebarCollapsed, sidebarWidth, splitMode, splitPercent]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    commandInputRef.current?.focus();
  }, [commandPaletteOpen]);

  useEffect(() => {
    if (creationKind === null) return;
    newItemInputRef.current?.focus();
    newItemInputRef.current?.select();
  }, [creationKind]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "p") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        setCommandQuery("");
        setCommandIndex(0);
        return;
      }
      if (key === "n") {
        event.preventDefault();
        beginCreation("page");
        return;
      }
      if (key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (key === "s") {
        event.preventDefault();
        const pageId = cursorState?.pane === "secondary" && secondarySelectedId === cursorState.pageId
          ? cursorState.pageId
          : selected?.kind === "page" ? selected.id : null;
        saveExplicitly(pageId);
        return;
      }
      if (key === "z" || (key === "y" && event.ctrlKey && !event.metaKey)) {
        const pageId = cursorState?.pane === "secondary" && secondarySelectedId === cursorState.pageId
          ? cursorState.pageId
          : selected?.kind === "page" ? selected.id : null;
        if (pageId !== null) {
          event.preventDefault();
          if ((key === "z" && event.shiftKey) || key === "y") redoEdit(pageId);
          else undoEdit(pageId);
        }
        return;
      }
      if (key === "w" && selectedId !== null && openTabIds.includes(selectedId)) {
        event.preventDefault();
        closeTab(selectedId);
        return;
      }
      if (event.key === "\\" && selected?.kind === "page") {
        event.preventDefault();
        const nextMode = event.shiftKey ? "horizontal" : "vertical";
        setSplitMode((mode) => mode === nextMode ? "none" : nextMode);
        if (secondaryTabIds.length === 0) openSecondaryTab(selected.id);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [collapsedFolderIds, cursorState, documents, editHistory, openTabIds, primaryPreview, revisions, secondaryPreview, secondarySelectedId, secondaryTabIds, selected, selectedId, sidebarCollapsed, sidebarWidth, splitMode, splitPercent, tree]);

  useEffect(() => {
    if (!resizingSidebar) return;
    function resize(event: PointerEvent) {
      setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, event.clientX)));
    }
    function stopResizing() {
      setResizingSidebar(false);
    }
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResizing);
    return () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResizing);
    };
  }, [resizingSidebar]);

  useEffect(() => {
    if (!resizingSplit || splitMode === "none") return;
    function resize(event: PointerEvent) {
      const bounds = editorContentRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const rawPercent = splitMode === "vertical"
        ? ((event.clientX - bounds.left) / bounds.width) * 100
        : ((event.clientY - bounds.top) / bounds.height) * 100;
      setSplitPercent(Math.max(MIN_SPLIT_PERCENT, Math.min(MAX_SPLIT_PERCENT, rawPercent)));
    }
    function stopResizing() {
      setResizingSplit(false);
    }
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResizing);
    return () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResizing);
    };
  }, [resizingSplit, splitMode]);

  function resizeSidebarWithKeyboard(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Home") {
      event.preventDefault();
      setSidebarWidth(MIN_SIDEBAR_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      setSidebarWidth(MAX_SIDEBAR_WIDTH);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setSidebarWidth((width) => Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width + direction * 16)));
    }
  }

  function resizeSplitWithKeyboard(event: ReactKeyboardEvent<HTMLDivElement>) {
    const decreaseKey = splitMode === "vertical" ? "ArrowLeft" : "ArrowUp";
    const increaseKey = splitMode === "vertical" ? "ArrowRight" : "ArrowDown";
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setSplitPercent(event.key === "Home" ? MIN_SPLIT_PERCENT : MAX_SPLIT_PERCENT);
    } else if (event.key === decreaseKey || event.key === increaseKey) {
      event.preventDefault();
      const direction = event.key === decreaseKey ? -1 : 1;
      setSplitPercent((percent) => Math.max(MIN_SPLIT_PERCENT, Math.min(MAX_SPLIT_PERCENT, percent + direction * 5)));
    }
  }

  function navigateExplorerWithKeyboard(event: ReactKeyboardEvent<HTMLElement>) {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>(".tree-item") : null;
    if (!target) return;
    const explorer = event.currentTarget;
    const visibleItems = [...explorer.querySelectorAll<HTMLButtonElement>(".tree-item")];
    const currentIndex = visibleItems.indexOf(target);
    const nodeId = target.dataset.nodeId;
    const node = tree.nodes.find((candidate) => candidate.id === nodeId);
    if (currentIndex < 0 || !node) return;

    let focusTarget: HTMLButtonElement | undefined;
    if (event.key === "ArrowDown") focusTarget = visibleItems[currentIndex + 1];
    else if (event.key === "ArrowUp") focusTarget = visibleItems[currentIndex - 1];
    else if (event.key === "Home") focusTarget = visibleItems[0];
    else if (event.key === "End") focusTarget = visibleItems.at(-1);
    else if (event.key === "ArrowRight" && node.kind === "folder") {
      event.preventDefault();
      if (collapsedFolderIds.has(node.id)) {
        toggleFolder(node.id);
        requestAnimationFrame(() => {
          const items = [...explorer.querySelectorAll<HTMLButtonElement>(".tree-item")];
          items.find((item) => tree.nodes.find((candidate) => candidate.id === item.dataset.nodeId)?.parentId === node.id)?.focus();
        });
      } else {
        focusTarget = visibleItems.slice(currentIndex + 1).find((item) => tree.nodes.find((candidate) => candidate.id === item.dataset.nodeId)?.parentId === node.id);
      }
    } else if (event.key === "ArrowLeft" && node.kind === "folder" && !collapsedFolderIds.has(node.id)) {
      event.preventDefault();
      toggleFolder(node.id);
    } else if (event.key === "ArrowLeft" && node.parentId !== null) {
      focusTarget = visibleItems.find((item) => item.dataset.nodeId === node.parentId);
    } else {
      return;
    }

    if (focusTarget) {
      event.preventDefault();
      focusTarget.focus();
    }
  }

  function addNode(kind: WorkspaceNodeKind, parentId: string | null = null) {
    try {
      const baseTitle = kind === "page" ? "제목 없음" : "새 폴더";
      const siblingTitles = new Set(tree.nodes.filter((node) => node.parentId === parentId && !isNodeInTrash(tree, node.id)).map((node) => node.title));
      let defaultTitle = baseTitle;
      for (let suffix = 2; siblingTitles.has(defaultTitle); suffix += 1) defaultTitle = `${baseTitle} ${suffix}`;
      const next = createNode(tree, { id: newId(kind), kind, title: title.trim() || defaultTitle, parentId });
      const created = next.nodes.at(-1)!;
      setTree(next);
      setTreeDirty(true);
      if (kind === "page") {
        setDocuments((current) => ({ ...current, [created.id]: emptyPageDocument(created.id) }));
        setDocumentsDirty(true);
        setOpenTabIds((current) => [...current, created.id]);
      }
      setSelectedId(created.id);
      setPendingRenameId(created.id);
      setTitle("");
      setCreationKind(null);
      setCreationParentId(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof PageTreeError && caught.code === "EMPTY_NODE_TITLE"
        ? "이름을 입력해 주세요."
        : "항목을 만들지 못했습니다.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creationKind !== null) addNode(creationKind, creationParentId);
  }

  function beginCreation(kind: WorkspaceNodeKind, parentId: string | null = null) {
    addNode(kind, parentId);
  }

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    try {
      setTree(renameNode(tree, selected.id, renameTitle));
      setTreeDirty(true);
      setError(null);
    } catch (caught) {
      setError(caught instanceof PageTreeError && caught.code === "EMPTY_NODE_TITLE"
        ? "새 이름을 입력해 주세요."
        : "이름을 변경하지 못했습니다.");
    }
  }

  function moveSelectionToTrash() {
    if (!selected) return;
    try {
      setTree(trashNode(tree, selected.id));
      setTreeDirty(true);
      const trashedIds = new Set<string>([selected.id]);
      let foundDescendant = true;
      while (foundDescendant) {
        foundDescendant = false;
        for (const node of tree.nodes) {
          if (node.parentId !== null && trashedIds.has(node.parentId) && !trashedIds.has(node.id)) {
            trashedIds.add(node.id);
            foundDescendant = true;
          }
        }
      }
      setOpenTabIds((current) => current.filter((id) => !trashedIds.has(id)));
      setSecondaryTabIds((current) => current.filter((id) => !trashedIds.has(id)));
      if (secondarySelectedId !== null && trashedIds.has(secondarySelectedId)) setSecondarySelectedId(null);
      setSelectedId(null);
      setError(null);
    } catch {
      setError("휴지통으로 이동하지 못했습니다.");
    }
  }

  function restoreFromTrash(nodeId: string) {
    try {
      setTree(restoreNode(tree, nodeId));
      setTreeDirty(true);
      const node = tree.nodes.find((candidate) => candidate.id === nodeId);
      setSelectedId(nodeId);
      if (node?.kind === "page") setOpenTabIds((current) => current.includes(nodeId) ? current : [...current, nodeId]);
      setError(null);
    } catch {
      setError("항목을 복원하지 못했습니다.");
    }
  }

  function openSearchResult(nodeId: string) {
    selectNode(nodeId);
    setSearchQuery("");
  }

  function beginPermanentDelete(nodeId: string) {
    setDeleteTargetId(nodeId);
    setDeleteConfirmation("");
    setDeleteError(null);
  }

  function cancelPermanentDelete() {
    setDeleteTargetId(null);
    setDeleteConfirmation("");
    setDeleteError(null);
  }

  function confirmPermanentDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleteTarget) return;
    if (deleteConfirmation !== deleteTarget.title) {
      setDeleteError("항목 이름이 일치하지 않습니다.");
      return;
    }

    const deletedIds = new Set<string>([deleteTarget.id]);
    let foundDescendant = true;
    while (foundDescendant) {
      foundDescendant = false;
      for (const node of tree.nodes) {
        if (node.parentId !== null && deletedIds.has(node.parentId) && !deletedIds.has(node.id)) {
          deletedIds.add(node.id);
          foundDescendant = true;
        }
      }
    }
    const pageIds = tree.nodes
      .filter((node) => deletedIds.has(node.id) && node.kind === "page")
      .map((node) => node.id);

    setTree(deleteNodePermanently(tree, deleteTarget.id));
    setTreeDirty(true);
    if (pageIds.length > 0) {
      setOpenTabIds((current) => current.filter((id) => !deletedIds.has(id)));
      setSecondaryTabIds((current) => current.filter((id) => !deletedIds.has(id)));
      if (secondarySelectedId !== null && deletedIds.has(secondarySelectedId)) setSecondarySelectedId(null);
      setDocuments((current) => {
        const next = { ...current };
        for (const pageId of pageIds) delete next[pageId];
        return next;
      });
      setDocumentsDirty(true);
    }
    cancelPermanentDelete();
  }

  function exportBackup() {
    try {
      const contents = createBackup({ tree, documents });
      const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `mano-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setBackupMessage("백업 파일을 만들었습니다. 안전한 곳에 보관해 주세요.");
    } catch {
      setBackupMessage("백업 파일을 만들지 못했습니다.");
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const restored = parseBackup(await readFileText(file));
      setTree(restored.tree);
      setDocuments(restored.documents);
      setSelectedId(null);
      setOpenTabIds([]);
      setSecondarySelectedId(null);
      setSecondaryTabIds([]);
      setTreeDirty(true);
      setDocumentsDirty(true);
      setError(null);
      setBackupMessage("백업을 복원했습니다.");
    } catch (caught) {
      setBackupMessage(caught instanceof BackupError ? caught.message : "백업 파일을 읽지 못했습니다.");
    }
  }

  async function importMarkdown(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(md|markdown)$/i.test(file.name)) {
      setMarkdownFileMessage("Markdown(.md, .markdown) 파일만 가져올 수 있습니다.");
      return;
    }
    if (file.size > MAX_MARKDOWN_FILE_SIZE) {
      setMarkdownFileMessage("Markdown 파일은 5 MiB 이하여야 합니다.");
      return;
    }
    try {
      const text = await readFileText(file);
      const pageTitle = file.name.replace(/\.(md|markdown)$/i, "").trim() || "가져온 문서";
      const pageId = newId("page");
      const nextTree = createNode(tree, { id: pageId, kind: "page", title: pageTitle, parentId: null });
      const document = updateBlockText(emptyPageDocument(pageId), `${pageId}:body`, text);
      setTree(nextTree);
      setDocuments((current) => ({ ...current, [pageId]: document }));
      setTreeDirty(true);
      setDocumentsDirty(true);
      setOpenTabIds((current) => [...current, pageId]);
      setSelectedId(pageId);
      setMarkdownFileMessage(`“${pageTitle}” 페이지를 가져왔습니다.`);
      setError(null);
    } catch {
      setMarkdownFileMessage("Markdown 파일을 읽지 못했습니다.");
    }
  }

  function exportMarkdown() {
    if (selected?.kind !== "page") return;
    try {
      const safeTitle = selected.title.normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").trim() || "mano-note";
      const contents = documents[selected.id]?.blocks[0]?.text ?? "";
      const url = URL.createObjectURL(new Blob([contents], { type: "text/markdown;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeTitle}.md`;
      link.click();
      URL.revokeObjectURL(url);
      setMarkdownFileMessage(`“${selected.title}” 페이지를 내보냈습니다.`);
    } catch {
      setMarkdownFileMessage("Markdown 파일을 만들지 못했습니다.");
    }
  }

  const childCount = selected?.kind === "folder" ? activeChildren(tree, selected.id).length : 0;
  const secondarySelected = useMemo(() => {
    const secondary = tree.nodes.find((node) => node.id === secondarySelectedId);
    if (secondary?.kind === "page" && secondaryTabIds.includes(secondary.id) && !isNodeInTrash(tree, secondary.id)) return secondary;
    return null;
  }, [secondarySelectedId, secondaryTabIds, tree]);
  const secondaryCandidates = useMemo(
    () => openTabIds.filter((id) => !secondaryTabIds.includes(id)).map((id) => tree.nodes.find((node) => node.id === id)).filter((node): node is WorkspaceNode => node?.kind === "page"),
    [openTabIds, secondaryTabIds, tree.nodes],
  );
  const selectedDocument = selected?.kind === "page" ? documents[selected.id] : undefined;
  const bodyBlock = selectedDocument?.blocks[0];
  const bodyText = bodyBlock?.text ?? "";
  const statusPageId = cursorState?.pageId ?? (selected?.kind === "page" ? selected.id : null);
  const statusText = statusPageId === null ? "" : documents[statusPageId]?.blocks[0]?.text ?? "";
  const cursorOffset = Math.min(cursorState?.start ?? 0, statusText.length);
  const cursorPrefix = statusText.slice(0, cursorOffset);
  const cursorLine = cursorPrefix.split("\n").length;
  const cursorColumn = (cursorPrefix.length - (cursorPrefix.lastIndexOf("\n") + 1)) + 1;
  const selectedCharacterCount = cursorState === null ? 0 : Math.max(0, cursorState.end - cursorState.start);

  function saveExplicitly(pageId: string | null) {
    try {
      const nextRevisions = pageId === null
        ? revisions
        : appendRevision(revisions, pageId, documents[pageId]?.blocks[0]?.text ?? "");
      saveTree(window.localStorage, tree);
      saveDocuments(window.localStorage, documents);
      saveWorkspaceView(window.localStorage, {
        openTabIds,
        activeTabId: openTabIds.includes(selectedId ?? "") ? selectedId : null,
        splitMode,
        splitPercent,
        secondaryTabIds,
        secondaryActiveTabId: secondaryTabIds.includes(secondarySelectedId ?? "") ? secondarySelectedId : null,
        sidebarWidth,
        sidebarCollapsed,
        collapsedFolderIds: [...collapsedFolderIds],
        primaryPreview,
        secondaryPreview,
      });
      saveRevisions(window.localStorage, nextRevisions);
      setRevisions(nextRevisions);
      setTreeDirty(false);
      setDocumentsDirty(false);
      setStorageStatus("saved");
    } catch {
      setStorageStatus("failed");
    }
  }

  function restoreRevision(pageId: string, text: string) {
    updateBody(pageId, text);
  }

  function updateBody(pageId: string, text: string, recordHistory = true) {
    const page = tree.nodes.find((node) => node.id === pageId);
    if (!page || page.kind !== "page") return;
    const current = documents[pageId] ?? emptyPageDocument(pageId);
    const firstBlock = current.blocks[0];
    const currentText = firstBlock?.text ?? "";
    if (currentText === text) return;
    if (recordHistory) {
      setEditHistory((all) => {
        const history = all[pageId] ?? { past: [], future: [] };
        return { ...all, [pageId]: { past: [...history.past, currentText].slice(-MAX_HISTORY_ENTRIES), future: [] } };
      });
    }
    const updated = firstBlock
      ? updateBlockText(current, firstBlock.id, text)
      : insertBlock(current, 0, { id: `${pageId}:body`, type: "paragraph", text });
    setDocuments((all) => ({ ...all, [pageId]: updated }));
    setDocumentsDirty(true);
  }

  function undoEdit(pageId: string) {
    const history = editHistory[pageId];
    if (!history) return;
    const previous = history.past.at(-1);
    if (previous === undefined) return;
    const currentText = documents[pageId]?.blocks[0]?.text ?? "";
    setEditHistory((all) => ({ ...all, [pageId]: { past: history.past.slice(0, -1), future: [currentText, ...history.future].slice(0, MAX_HISTORY_ENTRIES) } }));
    updateBody(pageId, previous, false);
  }

  function redoEdit(pageId: string) {
    const history = editHistory[pageId];
    if (!history) return;
    const next = history.future[0];
    if (next === undefined) return;
    const currentText = documents[pageId]?.blocks[0]?.text ?? "";
    setEditHistory((all) => ({ ...all, [pageId]: { past: [...history.past, currentText].slice(-MAX_HISTORY_ENTRIES), future: history.future.slice(1) } }));
    updateBody(pageId, next, false);
  }

  function captureCursor(pane: "primary" | "secondary", pageId: string, editor: HTMLTextAreaElement) {
    setCursorState({ pane, pageId, start: editor.selectionStart, end: editor.selectionEnd });
  }

  const commands = [
    { id: "new-page", label: "새 페이지 만들기", shortcut: "⌘/Ctrl+N", enabled: hydrated },
    { id: "search", label: "전체 검색", shortcut: "⌘/Ctrl+K", enabled: hydrated },
    { id: "save", label: "현재 작업 저장", shortcut: "⌘/Ctrl+S", enabled: hydrated },
    { id: "sidebar", label: sidebarCollapsed ? "탐색기 열기" : "탐색기 닫기", shortcut: "", enabled: true },
    { id: "vertical", label: "세로 분할 전환", shortcut: "⌘/Ctrl+\\", enabled: selected?.kind === "page" },
    { id: "horizontal", label: "가로 분할 전환", shortcut: "⌘/Ctrl+Shift+\\", enabled: selected?.kind === "page" },
    { id: "close-tab", label: "현재 탭 닫기", shortcut: "⌘/Ctrl+W", enabled: selectedId !== null && openTabIds.includes(selectedId) },
  ] as const;
  const filteredCommands = commands.filter((command) => command.label.toLocaleLowerCase().includes(commandQuery.trim().toLocaleLowerCase()));
  const activeCommandIndex = Math.min(commandIndex, Math.max(0, filteredCommands.length - 1));

  function executeCommand(commandId: (typeof commands)[number]["id"]) {
    const command = commands.find((candidate) => candidate.id === commandId);
    if (!command?.enabled) return;
    setCommandPaletteOpen(false);
    if (commandId === "new-page") {
      beginCreation("page");
    } else if (commandId === "search") {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    } else if (commandId === "save") {
      saveExplicitly(selected?.kind === "page" ? selected.id : null);
    } else if (commandId === "sidebar") {
      setSidebarCollapsed((collapsed) => !collapsed);
    } else if (commandId === "close-tab" && selectedId !== null) {
      closeTab(selectedId);
    } else if ((commandId === "vertical" || commandId === "horizontal") && selected?.kind === "page") {
      const nextMode = commandId;
      setSplitMode((mode) => mode === nextMode ? "none" : nextMode);
      if (secondaryTabIds.length === 0) openSecondaryTab(selected.id);
    }
  }

  function handleCommandPaletteKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setCommandPaletteOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredCommands.length === 0) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setCommandIndex((index) => (index + direction + filteredCommands.length) % filteredCommands.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = filteredCommands[activeCommandIndex];
      if (command?.enabled) executeCommand(command.id);
    }
  }

  function renderContentPanel(position: "primary" | "secondary") {
    const isSecondary = position === "secondary";
    const secondaryPosition = splitMode === "horizontal" ? "아래쪽" : "오른쪽";
    const panelSelected = isSecondary ? secondarySelected : selected;
    const panelDocument = panelSelected?.kind === "page" ? documents[panelSelected.id] : undefined;
    const panelBodyText = panelDocument?.blocks[0]?.text ?? "";
    const panelRevisions = panelSelected?.kind === "page" ? revisions[panelSelected.id] ?? [] : [];
    const panelReferences = panelSelected?.kind === "page"
      ? collectPageReferences(tree, documents, panelSelected.id)
      : { outgoing: [], backlinks: [], unresolved: [] };
    const selectedRevision = panelSelected?.kind === "page"
      ? panelRevisions.find((revision) => revision.id === selectedRevisionIds[panelSelected.id]) ?? null
      : null;
    return (
      <section
        className="content-panel"
        aria-label={isSecondary ? `${secondaryPosition} 분할 편집기` : "주 편집기"}
        aria-live={isSecondary ? undefined : "polite"}
      >
        {isSecondary ? (
          <div className="secondary-pane-header">
          <div className="pane-tabs" role="tablist" aria-label={`${secondaryPosition} 분할 열린 페이지`}>
            {secondaryTabIds.map((tabId) => {
              const tab = tree.nodes.find((node) => node.id === tabId && node.kind === "page");
              if (!tab) return null;
              return <span className="pane-tab" key={tab.id}><button type="button" role="tab" aria-selected={tab.id === panelSelected?.id} onClick={() => setSecondarySelectedId(tab.id)}>{tab.title}</button><button type="button" aria-label={`${tab.title} 보조 탭 닫기`} onClick={() => closeSecondaryTab(tab.id)}>×</button></span>;
            })}
          </div>
          <div className="secondary-tab-add">
            <select aria-label="보조 영역에 추가할 페이지" value={secondaryCandidateId || secondaryCandidates[0]?.id || ""} onChange={(event) => setSecondaryCandidateId(event.target.value)} disabled={secondaryCandidates.length === 0}>
              {secondaryCandidates.length === 0 ? <option value="">추가할 탭 없음</option> : secondaryCandidates.map((node) => <option value={node.id} key={node.id}>{node.title}</option>)}
            </select>
            <button type="button" disabled={secondaryCandidates.length === 0} onClick={() => openSecondaryTab(secondaryCandidateId || secondaryCandidates[0]?.id || "")}>보조 탭 추가</button>
          </div>
          </div>
        ) : null}
        {!panelSelected ? (
          <div className="content-empty"><div className="note-mark" aria-hidden="true">마</div><p className="content-type">MY OWN NOTE</p><h2>기록을 선택해 주세요</h2><p>탐색기에서 페이지를 선택하거나 새 기록을 만들어 작업을 시작하세요.</p><div className="empty-shortcuts"><span><kbd>⌘</kbd><kbd>N</kbd> 새 기록</span><span><kbd>⌘</kbd><kbd>K</kbd> 빠른 검색</span></div></div>
        ) : panelSelected.kind === "folder" ? (
          <div className="selected-content"><p className="content-type">폴더 · 하위 항목 {childCount}개</p><h2>{panelSelected.title}</h2>{isSecondary ? null : <><ItemActions inputRef={renameInputRef} title={renameTitle} onTitleChange={setRenameTitle} onRename={submitRename} onTrash={moveSelectionToTrash} disabled={!hydrated} /><p>이 폴더 안에 새 페이지를 만들 수 있어요.</p><button className="primary-action" type="button" disabled={!hydrated} onClick={() => beginCreation("page", panelSelected.id)}>이 폴더에 페이지 추가</button></>}</div>
        ) : (
          <div className="selected-content page-editor">
            <p className="content-type">{isSecondary ? `페이지 · ${secondaryPosition} 분할` : "페이지"}</p>
            <h2>{panelSelected.title}</h2>
            {isSecondary ? null : <ItemActions inputRef={renameInputRef} title={renameTitle} onTitleChange={setRenameTitle} onRename={submitRename} onTrash={moveSelectionToTrash} disabled={!hydrated} />}
            <details className="revision-history">
              <summary>버전 기록 ({panelRevisions.length})</summary>
              <div className="revision-actions">
                <button type="button" disabled={!hydrated} onClick={() => saveExplicitly(panelSelected.id)}>현재 버전 저장</button>
                {panelRevisions.length === 0 ? <p>명시적으로 저장한 버전이 없습니다.</p> : (
                  <ol>
                    {panelRevisions.map((revision, index) => (
                      <li key={revision.id}>
                        <button type="button" aria-pressed={selectedRevision?.id === revision.id} onClick={() => setSelectedRevisionIds((current) => ({ ...current, [panelSelected.id]: revision.id }))}>
                          버전 {panelRevisions.length - index} · {new Date(revision.createdAt).toLocaleString("ko-KR")}
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                {selectedRevision ? <div className="revision-preview"><pre>{selectedRevision.text || "(빈 문서)"}</pre><button type="button" onClick={() => restoreRevision(panelSelected.id, selectedRevision.text)}>이 버전 복원</button></div> : null}
              </div>
            </details>
            <details className="page-references">
              <summary>연결된 문서 ({panelReferences.outgoing.length + panelReferences.backlinks.length})</summary>
              <div className="reference-groups">
                <section aria-label="나가는 링크"><strong>나가는 링크</strong>{panelReferences.outgoing.length === 0 ? <p>연결된 페이지가 없습니다.</p> : <ul>{panelReferences.outgoing.map((page) => <li key={page.id}><button type="button" onClick={() => selectNode(page.id)}>{page.title}</button></li>)}</ul>}</section>
                <section aria-label="백링크"><strong>백링크</strong>{panelReferences.backlinks.length === 0 ? <p>이 페이지를 연결한 문서가 없습니다.</p> : <ul>{panelReferences.backlinks.map((page) => <li key={page.id}><button type="button" onClick={() => selectNode(page.id)}>{page.title}</button></li>)}</ul>}</section>
                {panelReferences.unresolved.length > 0 ? <section aria-label="미해결 링크"><strong>미해결</strong><ul>{panelReferences.unresolved.map((title) => <li key={title}>[[{title}]]</li>)}</ul></section> : null}
              </div>
            </details>
            <div className="inline-editor-actions" aria-label={`${isSecondary ? secondaryPosition : "주"} 편집기 작업`}>
              <span>Markdown 단축키는 스페이스로 적용됩니다</span>
              <button type="button" disabled={(editHistory[panelSelected.id]?.past.length ?? 0) === 0} onClick={() => undoEdit(panelSelected.id)}>실행 취소</button>
              <button type="button" disabled={(editHistory[panelSelected.id]?.future.length ?? 0) === 0} onClick={() => redoEdit(panelSelected.id)}>다시 실행</button>
            </div>
            <NotionMarkdownEditor source={panelBodyText} disabled={!hydrated} label={isSecondary ? `페이지 블록 편집기 (${secondaryPosition} 분할)` : "페이지 블록 편집기"} onChange={(source) => updateBody(panelSelected.id, source)} />
            <label className="legacy-editor-input" htmlFor={isSecondary ? "page-body-secondary" : "page-body"}>{isSecondary ? `페이지 본문 (${secondaryPosition} 분할)` : "페이지 본문"}<textarea ref={isSecondary ? secondaryEditorRef : primaryEditorRef} id={isSecondary ? "page-body-secondary" : "page-body"} value={panelBodyText} onChange={(event) => { updateBody(panelSelected.id, event.target.value); captureCursor(position, panelSelected.id, event.currentTarget); }} onSelect={(event) => captureCursor(position, panelSelected.id, event.currentTarget)} onFocus={(event) => captureCursor(position, panelSelected.id, event.currentTarget)} disabled={!hydrated} /></label>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="workspace-frame" data-sidebar-collapsed={sidebarCollapsed} data-sidebar-resizing={resizingSidebar} style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      {commandPaletteOpen ? <div className="command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandPaletteOpen(false); }}>
        <div className="command-palette" role="dialog" aria-modal="true" aria-label="명령 팔레트" onKeyDown={handleCommandPaletteKey}>
          <label htmlFor="command-query">명령 검색</label>
          <input ref={commandInputRef} id="command-query" value={commandQuery} onChange={(event) => { setCommandQuery(event.target.value); setCommandIndex(0); }} placeholder="명령을 입력하세요" autoComplete="off" />
          {filteredCommands.length === 0 ? <p>일치하는 명령이 없습니다.</p> : <ul role="listbox" aria-label="명령 목록">{filteredCommands.map((command, index) => <li key={command.id}><button type="button" role="option" aria-selected={index === activeCommandIndex} disabled={!command.enabled} onMouseMove={() => setCommandIndex(index)} onClick={() => executeCommand(command.id)}><span>{command.label}</span><kbd>{command.shortcut}</kbd></button></li>)}</ul>}
        </div>
      </div> : null}
      <header className="workbench-header">
        <div className="workbench-brand">
          <span className="brand-mark" aria-hidden="true">마</span>
          <strong>마노</strong>
        </div>
        <div className="workbench-tools">
          <span className="local-badge">LOCAL WORKSPACE</span>
          <button
            className="icon-button"
            type="button"
            aria-expanded={!sidebarCollapsed}
            aria-controls="workspace-sidebar"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? "탐색기 열기" : "탐색기 닫기"}
          </button>
        </div>
      </header>
      <div className="workspace-grid">
      <aside id="workspace-sidebar" className="sidebar" aria-labelledby="tree-title">
        <div className="sidebar-heading">
          <div><p className="eyebrow">EXPLORER</p><h1 id="tree-title">내 기록</h1></div>
          <span className="item-count" aria-label={`전체 ${tree.nodes.length}개`}>{tree.nodes.length}</span>
        </div>
        {storageWarning ? <p className="storage-warning" role="alert">{storageWarning}</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="search-box">
          <label htmlFor="workspace-search">전체 검색</label>
          <input ref={searchInputRef} id="workspace-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="제목과 본문 검색" disabled={!hydrated} />
        </div>
        <nav aria-label="폴더와 페이지" className="tree-nav" onKeyDown={navigateExplorerWithKeyboard}>
          <div className="tree-section-title"><span>내 노트</span><span className="tree-create-actions"><button type="button" aria-label="페이지" disabled={!hydrated} title="새 페이지" onClick={() => beginCreation("page")}>＋ 페이지</button><button type="button" aria-label="폴더" disabled={!hydrated} title="새 폴더" onClick={() => beginCreation("folder")}>＋ 폴더</button><small>{tree.nodes.length}</small></span></div>
          <form className="inline-create" data-active={creationKind !== null} onSubmit={submit}>
            <label htmlFor="new-item-title">{creationKind === "folder" ? "새 폴더 이름" : "새 페이지 이름"}</label>
            <input ref={newItemInputRef} id="new-item-title" aria-label="새 항목 이름" value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setTitle(""); setCreationKind(null); setCreationParentId(null); } }} placeholder={creationKind === "folder" ? "폴더 이름" : "페이지 이름"} autoComplete="off" disabled={!hydrated} />
            <button type="submit" disabled={!hydrated || creationKind === null}>만들기</button>
            <button type="button" onClick={() => { setTitle(""); setCreationKind(null); setCreationParentId(null); }}>생성 취소</button>
          </form>
          {!hydrated ? <p className="tree-empty">저장된 기록을 불러오고 있어요.</p> : isSearching ? (
            searchResults.length === 0 ? <p className="tree-empty" role="status">검색 결과가 없어요.</p> : (
              <ul className="search-results">
                {searchResults.map((result) => (
                  <li key={result.node.id}>
                    <button type="button" onClick={() => openSearchResult(result.node.id)}>
                      <span>{result.node.title}</span>
                      <small>{result.node.kind === "folder" ? "폴더 제목" : result.matchedBy === "title" ? "페이지 제목" : "페이지 본문"}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : tree.nodes.length === 0 ? <p className="tree-empty">아직 기록이 없어요. 위에서 첫 페이지를 만들어 보세요.</p> : <TreeBranch tree={tree} parentId={null} selectedId={selectedId} collapsedFolderIds={collapsedFolderIds} onSelect={selectNode} onToggleFolder={toggleFolder} />}
        </nav>
        <div className="sidebar-management">
        <details className="sidebar-tool">
          <summary># 태그 <span>{workspaceTags.length}</span></summary>
          {workspaceTags.length === 0 ? <p className="tag-empty">본문에 #태그를 입력하면 여기에 표시됩니다.</p> : (
            <ul className="tag-list">
              {workspaceTags.map((tag) => (
                <li key={tag.key}>
                  <button type="button" aria-pressed={searchQuery.toLocaleLowerCase() === `#${tag.key}`} onClick={() => setSearchQuery(`#${tag.label}`)}>
                    <span>#{tag.label}</span><small>{tag.pageIds.length}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </details>
        <details className="sidebar-tool">
          <summary>▤ Markdown 파일</summary>
          <div className="backup-actions">
            <button type="button" disabled={!hydrated || selected?.kind !== "page"} onClick={exportMarkdown}>현재 페이지 내보내기</button>
            <label className="file-action">페이지 가져오기<input type="file" accept="text/markdown,.md,.markdown" disabled={!hydrated} onChange={importMarkdown} /></label>
          </div>
          <p className="backup-caution">UTF-8 Markdown 파일을 최대 5 MiB까지 가져옵니다.</p>
          {markdownFileMessage ? <p className="backup-message" role="alert">{markdownFileMessage}</p> : null}
        </details>
        <details className="sidebar-tool">
          <summary>↻ 백업 및 복원</summary>
          <div className="backup-actions">
            <button type="button" disabled={!hydrated} onClick={exportBackup}>백업 내보내기</button>
            <label className="file-action">백업 가져오기<input type="file" accept="application/json,.json" disabled={!hydrated} onChange={importBackup} /></label>
          </div>
          <p className="backup-caution">백업 파일에는 암호화되지 않은 본문이 포함됩니다.</p>
          {backupMessage ? <p className="backup-message" role="alert">{backupMessage}</p> : null}
        </details>
        <details className="sidebar-tool trash-tool">
          <summary id="trash-title">⌫ 휴지통 <span>{recoverableTrash.length}</span></summary>
          <section className="trash-section" aria-labelledby="trash-title">
          {recoverableTrash.length === 0 ? <p>휴지통이 비어 있어요.</p> : (
            <ul>
              {recoverableTrash.map((node) => (
                <li key={node.id}>
                  <span>{node.title}</span>
                  <div className="trash-actions"><button type="button" onClick={() => restoreFromTrash(node.id)}>복원</button><button className="danger-action" type="button" onClick={() => beginPermanentDelete(node.id)}>영구 삭제</button></div>
                </li>
              ))}
            </ul>
          )}
          {deleteTarget ? (
            <form className="delete-confirmation" onSubmit={confirmPermanentDelete}>
              <strong>“{deleteTarget.title}”을(를) 영구 삭제할까요?</strong>
              <p>복원할 수 없습니다. 먼저 백업을 권장합니다.</p>
              <label htmlFor="delete-confirmation">확인을 위해 항목 이름 입력</label>
              <input id="delete-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" />
              {deleteError ? <p className="delete-error" role="alert">{deleteError}</p> : null}
              <div><button className="danger-action" type="submit">완전히 삭제</button><button type="button" onClick={cancelPermanentDelete}>취소</button></div>
            </form>
          ) : null}
          </section>
        </details>
        </div>
        <div className="sidebar-footer"><span>● 로컬 저장소</span><span>{storageStatus === "failed" ? "저장 오류" : "동기화됨"}</span></div>
      </aside>
      <div
        className="sidebar-resizer"
        role="separator"
        aria-label="탐색기 너비 조절"
        aria-orientation="vertical"
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        aria-valuenow={sidebarWidth}
        tabIndex={sidebarCollapsed ? -1 : 0}
        onDoubleClick={() => setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
        onKeyDown={resizeSidebarWithKeyboard}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setResizingSidebar(true);
        }}
      />
      <section className="editor-workbench" aria-label="문서 편집기">
        <div className="editor-tabbar" aria-label="열린 문서">
          <div className="editor-tabs" role="tablist" aria-label="열린 페이지">
            {openTabIds.length === 0 ? <div className="editor-tab-placeholder">시작하기</div> : openTabIds.map((tabId) => {
              const tab = tree.nodes.find((node) => node.id === tabId);
              if (!tab || tab.kind !== "page") return null;
              return (
                <div
                  className="editor-tab"
                  data-active={tabId === selectedId}
                  data-dragging={tabId === draggedTabId}
                  draggable
                  key={tabId}
                  onDragStart={(event) => {
                    setDraggedTabId(tabId);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", tabId);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropTab(tabId);
                  }}
                  onDragEnd={() => setDraggedTabId(null)}
                >
                  <button className="tab-select" type="button" role="tab" aria-selected={tabId === selectedId} onClick={() => setSelectedId(tabId)}>
                    <span aria-hidden="true">▤</span><span>{tab.title}</span>
                  </button>
                  <span className="tab-move-actions">
                    <button type="button" aria-label={`${tab.title} 탭 왼쪽으로 이동`} disabled={openTabIds[0] === tabId} onClick={() => moveTab(tabId, openTabIds.indexOf(tabId) - 1)}>‹</button>
                    <button type="button" aria-label={`${tab.title} 탭 오른쪽으로 이동`} disabled={openTabIds.at(-1) === tabId} onClick={() => moveTab(tabId, openTabIds.indexOf(tabId) + 1)}>›</button>
                  </span>
                  <button className="tab-close" type="button" aria-label={`${tab.title} 탭 닫기`} onClick={() => closeTab(tabId)}>×</button>
                </div>
              );
            })}
          </div>
          <div className="editor-layout-actions">
            <span className="tab-context">{selected ? "로컬 문서" : "마노 워크스페이스"}</span>
            <button
              type="button"
              aria-pressed={splitMode === "vertical"}
              disabled={selected?.kind !== "page"}
              onClick={() => {
                setSplitMode((mode) => mode === "vertical" ? "none" : "vertical");
                if (selected?.kind === "page" && secondaryTabIds.length === 0) openSecondaryTab(selected.id);
              }}
            >
              세로 분할
            </button>
            <button
              type="button"
              aria-pressed={splitMode === "horizontal"}
              disabled={selected?.kind !== "page"}
              onClick={() => {
                setSplitMode((mode) => mode === "horizontal" ? "none" : "horizontal");
                if (selected?.kind === "page" && secondaryTabIds.length === 0) openSecondaryTab(selected.id);
              }}
            >
              가로 분할
            </button>
          </div>
        </div>
        <div ref={editorContentRef} className="editor-content-area" data-split={selected?.kind === "page" ? splitMode : "none"} data-resizing={resizingSplit} style={{ "--split-percent": `${splitPercent}%` } as CSSProperties}>
          {renderContentPanel("primary")}
          {splitMode !== "none" && selected?.kind === "page" ? <>
            <div
              className="split-resizer"
              role="separator"
              aria-label="분할 영역 크기 조절"
              aria-orientation={splitMode === "vertical" ? "vertical" : "horizontal"}
              aria-valuemin={MIN_SPLIT_PERCENT}
              aria-valuemax={MAX_SPLIT_PERCENT}
              aria-valuenow={Math.round(splitPercent)}
              tabIndex={0}
              onDoubleClick={() => setSplitPercent(50)}
              onKeyDown={resizeSplitWithKeyboard}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture?.(event.pointerId);
                setResizingSplit(true);
              }}
            />
            {renderContentPanel("secondary")}
          </> : null}
        </div>
        <footer className="editor-statusbar">
          <div><span>줄 {cursorLine}, 열 {cursorColumn}</span>{selectedCharacterCount > 0 ? <span>선택 {selectedCharacterCount}</span> : null}<span>문자 {statusText.length}</span><span>{cursorState?.pane === "secondary" ? "보조 편집기" : "주 편집기"}</span></div>
          <div><span>Markdown</span><span>UTF-8</span><span className="storage-status" data-status={storageStatus} role="status">{storageStatus === "loading" ? "불러오는 중" : storageStatus === "saved" ? "이 브라우저에 저장됨" : "저장하지 못했습니다"}</span></div>
        </footer>
      </section>
      </div>
    </div>
  );
}

interface ItemActionsProps {
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly title: string;
  readonly disabled: boolean;
  readonly onTitleChange: (title: string) => void;
  readonly onRename: (event: FormEvent<HTMLFormElement>) => void;
  readonly onTrash: () => void;
}

function ItemActions({ inputRef, title, disabled, onTitleChange, onRename, onTrash }: ItemActionsProps) {
  return (
    <div className="item-actions">
      <form onSubmit={onRename}>
        <label htmlFor="rename-title">이름 변경</label>
        <input ref={inputRef} id="rename-title" value={title} onChange={(event) => onTitleChange(event.target.value)} disabled={disabled} />
        <button type="submit" disabled={disabled}>변경</button>
      </form>
      <button className="danger-action" type="button" disabled={disabled} onClick={onTrash}>휴지통으로 이동</button>
    </div>
  );
}
