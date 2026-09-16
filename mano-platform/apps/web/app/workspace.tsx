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
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { loadTree, saveTree } from "../lib/tree-storage";
import { loadDocuments, saveDocuments, type DocumentMap } from "../lib/document-storage";
import { BackupError, createBackup, parseBackup } from "../lib/workspace-backup";
import { searchWorkspace } from "../lib/workspace-search";
import { loadWorkspaceView, saveWorkspaceView } from "../lib/workspace-view-storage";

const initialTree: PageTreeState = { nodes: [] };

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
  readonly onSelect: (id: string) => void;
}

function TreeBranch({ tree, parentId, selectedId, onSelect }: TreeBranchProps) {
  const children = activeChildren(tree, parentId);
  if (children.length === 0) return null;

  return (
    <ul className="tree-list">
      {children.map((node) => (
        <li key={node.id}>
          <button className="tree-item" data-selected={node.id === selectedId} type="button" onClick={() => onSelect(node.id)}>
            <span aria-hidden="true">{node.kind === "folder" ? "▸" : "·"}</span>
            <span>{node.title}</span>
          </button>
          {node.kind === "folder" ? <TreeBranch tree={tree} parentId={node.id} selectedId={selectedId} onSelect={onSelect} /> : null}
        </li>
      ))}
    </ul>
  );
}

function MarkdownPreview({ source }: { readonly source: string }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push(<pre key={`code-${index}`} data-language={language || undefined}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = (heading[1] ?? "").length;
      const text = heading[2] ?? "";
      blocks.push(level === 1 ? <h1 key={index}>{text}</h1> : level === 2 ? <h2 key={index}>{text}</h2> : <h3 key={index}>{text}</h3>);
      continue;
    }
    const checklist = /^[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line);
    if (checklist) {
      blocks.push(<div className="preview-check" key={index}><input type="checkbox" checked={(checklist[1] ?? "").toLowerCase() === "x"} readOnly /><span>{checklist[2] ?? ""}</span></div>);
      continue;
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      blocks.push(<ul key={index}><li>{unordered[1] ?? ""}</li></ul>);
      continue;
    }
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      blocks.push(<ol key={index}><li>{ordered[1] ?? ""}</li></ol>);
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={index}>{line.slice(2)}</blockquote>);
      continue;
    }
    blocks.push(line.trim() === "" ? <div className="preview-space" key={index} /> : <p key={index}>{line}</p>);
  }
  return <article className="markdown-preview" aria-label="Markdown 미리보기">{blocks}</article>;
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
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const viewBaselineRef = useRef<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [splitMode, setSplitMode] = useState<"none" | "vertical" | "horizontal">("none");
  const [secondarySelectedId, setSecondarySelectedId] = useState<string | null>(null);
  const [primaryPreview, setPrimaryPreview] = useState(false);
  const [secondaryPreview, setSecondaryPreview] = useState(false);
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
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
  const isSearching = searchQuery.trim().length > 0;

  function selectNode(nodeId: string) {
    const node = tree.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    setSelectedId(nodeId);
    if (node.kind === "page") {
      setOpenTabIds((current) => current.includes(nodeId) ? current : [...current, nodeId]);
    }
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
    const loadedTree = loadTree(window.localStorage);
    const loadedDocuments = loadDocuments(window.localStorage);
    const loadedView = loadWorkspaceView(window.localStorage);
    const availablePageIds = new Set(loadedTree.tree.nodes
      .filter((node) => node.kind === "page" && !isNodeInTrash(loadedTree.tree, node.id))
      .map((node) => node.id));
    const restoredTabIds = loadedView.view.openTabIds.filter((id) => availablePageIds.has(id));
    const restoredActiveId = loadedView.view.activeTabId !== null && restoredTabIds.includes(loadedView.view.activeTabId)
      ? loadedView.view.activeTabId
      : restoredTabIds.at(-1) ?? null;
    viewBaselineRef.current = JSON.stringify(loadedView.view);
    setTree(loadedTree.tree);
    setDocuments(loadedDocuments.documents);
    setOpenTabIds(restoredTabIds);
    setSelectedId(restoredActiveId);
    const warnings = [
      loadedTree.status === "recovered" ? `${loadedTree.reason} 빈 작업 공간으로 복구했습니다.` : null,
      loadedDocuments.status === "recovered" ? `${loadedDocuments.reason} 빈 본문으로 복구했습니다.` : null,
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
    };
    const serializedView = JSON.stringify(view);
    if (serializedView === viewBaselineRef.current) return;
    try {
      saveWorkspaceView(window.localStorage, view);
      viewBaselineRef.current = serializedView;
    } catch {
      setStorageStatus("failed");
    }
  }, [hydrated, openTabIds, selectedId]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        newItemInputRef.current?.focus();
        newItemInputRef.current?.select();
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
        try {
          saveTree(window.localStorage, tree);
          saveDocuments(window.localStorage, documents);
          saveWorkspaceView(window.localStorage, {
            openTabIds,
            activeTabId: openTabIds.includes(selectedId ?? "") ? selectedId : null,
          });
          setTreeDirty(false);
          setDocumentsDirty(false);
          setStorageStatus("saved");
        } catch {
          setStorageStatus("failed");
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
        if (secondarySelectedId === null) setSecondarySelectedId(selected.id);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [documents, openTabIds, secondarySelectedId, selected, selectedId, tree]);

  function addNode(kind: WorkspaceNodeKind, parentId: string | null = null) {
    try {
      const next = createNode(tree, { id: newId(kind), kind, title, parentId });
      const created = next.nodes.at(-1)!;
      setTree(next);
      setTreeDirty(true);
      if (kind === "page") {
        setDocuments((current) => ({ ...current, [created.id]: emptyPageDocument(created.id) }));
        setDocumentsDirty(true);
        setOpenTabIds((current) => [...current, created.id]);
      }
      setSelectedId(created.id);
      setTitle("");
      setError(null);
    } catch (caught) {
      setError(caught instanceof PageTreeError && caught.code === "EMPTY_NODE_TITLE"
        ? "이름을 입력해 주세요."
        : "항목을 만들지 못했습니다.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addNode("page");
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
      setTreeDirty(true);
      setDocumentsDirty(true);
      setError(null);
      setBackupMessage("백업을 복원했습니다.");
    } catch (caught) {
      setBackupMessage(caught instanceof BackupError ? caught.message : "백업 파일을 읽지 못했습니다.");
    }
  }

  const childCount = selected?.kind === "folder" ? activeChildren(tree, selected.id).length : 0;
  const secondarySelected = useMemo(() => {
    const secondary = tree.nodes.find((node) => node.id === secondarySelectedId);
    if (secondary?.kind === "page" && openTabIds.includes(secondary.id) && !isNodeInTrash(tree, secondary.id)) return secondary;
    return selected?.kind === "page" ? selected : null;
  }, [openTabIds, secondarySelectedId, selected, tree]);
  const selectedDocument = selected?.kind === "page" ? documents[selected.id] : undefined;
  const bodyBlock = selectedDocument?.blocks[0];
  const bodyText = bodyBlock?.text ?? "";
  const lineCount = bodyText.length === 0 ? 1 : bodyText.split("\n").length;

  function updateBody(pageId: string, text: string) {
    const page = tree.nodes.find((node) => node.id === pageId);
    if (!page || page.kind !== "page") return;
    const current = documents[pageId] ?? emptyPageDocument(pageId);
    const firstBlock = current.blocks[0];
    const updated = firstBlock
      ? updateBlockText(current, firstBlock.id, text)
      : insertBlock(current, 0, { id: `${pageId}:body`, type: "paragraph", text });
    setDocuments((all) => ({ ...all, [pageId]: updated }));
    setDocumentsDirty(true);
  }

  function renderContentPanel(position: "primary" | "secondary") {
    const isSecondary = position === "secondary";
    const secondaryPosition = splitMode === "horizontal" ? "아래쪽" : "오른쪽";
    const panelSelected = isSecondary ? secondarySelected : selected;
    const panelDocument = panelSelected?.kind === "page" ? documents[panelSelected.id] : undefined;
    const panelBodyText = panelDocument?.blocks[0]?.text ?? "";
    const preview = isSecondary ? secondaryPreview : primaryPreview;
    return (
      <section
        className="content-panel"
        aria-label={isSecondary ? `${secondaryPosition} 분할 편집기` : "주 편집기"}
        aria-live={isSecondary ? undefined : "polite"}
      >
        {isSecondary ? (
          <div className="pane-tabs" role="tablist" aria-label={`${secondaryPosition} 분할 열린 페이지`}>
            {openTabIds.map((tabId) => {
              const tab = tree.nodes.find((node) => node.id === tabId && node.kind === "page");
              if (!tab) return null;
              return <button type="button" role="tab" aria-selected={tab.id === panelSelected?.id} key={tab.id} onClick={() => setSecondarySelectedId(tab.id)}>{tab.title}</button>;
            })}
          </div>
        ) : null}
        {!panelSelected ? (
          <div className="content-empty"><div className="note-mark" aria-hidden="true">마</div><p className="content-type">MY OWN NOTE</p><h2>기록을 선택해 주세요</h2><p>탐색기에서 페이지를 선택하거나 새 기록을 만들어 작업을 시작하세요.</p><div className="empty-shortcuts"><span><kbd>⌘</kbd><kbd>N</kbd> 새 기록</span><span><kbd>⌘</kbd><kbd>K</kbd> 빠른 검색</span></div></div>
        ) : panelSelected.kind === "folder" ? (
          <div className="selected-content"><p className="content-type">폴더 · 하위 항목 {childCount}개</p><h2>{panelSelected.title}</h2>{isSecondary ? null : <><ItemActions title={renameTitle} onTitleChange={setRenameTitle} onRename={submitRename} onTrash={moveSelectionToTrash} disabled={!hydrated} /><p>이 폴더 안에 새 페이지를 만들 수 있어요.</p><button className="primary-action" type="button" disabled={!hydrated} onClick={() => addNode("page", panelSelected.id)}>이 폴더에 페이지 추가</button></>}</div>
        ) : (
          <div className="selected-content page-editor">
            <p className="content-type">{isSecondary ? `페이지 · ${secondaryPosition} 분할` : "페이지"}</p>
            <h2>{panelSelected.title}</h2>
            {isSecondary ? null : <ItemActions title={renameTitle} onTitleChange={setRenameTitle} onRename={submitRename} onTrash={moveSelectionToTrash} disabled={!hydrated} />}
            <div className="editor-mode-switch" role="group" aria-label={`${isSecondary ? secondaryPosition : "주"} 편집기 보기`}>
              <button type="button" aria-pressed={!preview} onClick={() => isSecondary ? setSecondaryPreview(false) : setPrimaryPreview(false)}>편집</button>
              <button type="button" aria-pressed={preview} onClick={() => isSecondary ? setSecondaryPreview(true) : setPrimaryPreview(true)}>미리보기</button>
            </div>
            {preview ? <MarkdownPreview source={panelBodyText} /> : <><label htmlFor={isSecondary ? "page-body-secondary" : "page-body"}>{isSecondary ? `페이지 본문 (${secondaryPosition} 분할)` : "페이지 본문"}</label><textarea id={isSecondary ? "page-body-secondary" : "page-body"} value={panelBodyText} onChange={(event) => updateBody(panelSelected.id, event.target.value)} placeholder="여기에 기록을 시작하세요…" disabled={!hydrated} /></>}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="workspace-frame" data-sidebar-collapsed={sidebarCollapsed}>
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
        <form className="create-form" onSubmit={submit}>
          <label htmlFor="new-item-title">새 파일 또는 폴더</label>
          <div className="create-row">
            <input ref={newItemInputRef} id="new-item-title" aria-label="새 항목 이름" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="새 기록" autoComplete="off" disabled={!hydrated} />
            <button type="submit" aria-label="페이지" disabled={!hydrated} title="새 페이지">＋ 페이지</button>
            <button type="button" aria-label="폴더" disabled={!hydrated} title="새 폴더" onClick={() => addNode("folder")}>＋ 폴더</button>
          </div>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="search-box">
          <label htmlFor="workspace-search">전체 검색</label>
          <input ref={searchInputRef} id="workspace-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="제목과 본문 검색" disabled={!hydrated} />
        </div>
        <nav aria-label="폴더와 페이지" className="tree-nav">
          <div className="tree-section-title"><span>내 노트</span><span>{tree.nodes.length}</span></div>
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
          ) : tree.nodes.length === 0 ? <p className="tree-empty">아직 기록이 없어요. 위에서 첫 페이지를 만들어 보세요.</p> : <TreeBranch tree={tree} parentId={null} selectedId={selectedId} onSelect={selectNode} />}
        </nav>
        <div className="sidebar-management">
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
                if (selected?.kind === "page" && secondarySelectedId === null) setSecondarySelectedId(selected.id);
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
                if (selected?.kind === "page" && secondarySelectedId === null) setSecondarySelectedId(selected.id);
              }}
            >
              가로 분할
            </button>
          </div>
        </div>
        <div className="editor-content-area" data-split={selected?.kind === "page" ? splitMode : "none"}>
          {renderContentPanel("primary")}
          {splitMode !== "none" && selected?.kind === "page" ? renderContentPanel("secondary") : null}
        </div>
        <footer className="editor-statusbar">
          <div><span>줄 {lineCount}</span><span>문자 {bodyText.length}</span></div>
          <div><span>Markdown</span><span>UTF-8</span><span className="storage-status" data-status={storageStatus} role="status">{storageStatus === "loading" ? "불러오는 중" : storageStatus === "saved" ? "이 브라우저에 저장됨" : "저장하지 못했습니다"}</span></div>
        </footer>
      </section>
      </div>
    </div>
  );
}

interface ItemActionsProps {
  readonly title: string;
  readonly disabled: boolean;
  readonly onTitleChange: (title: string) => void;
  readonly onRename: (event: FormEvent<HTMLFormElement>) => void;
  readonly onTrash: () => void;
}

function ItemActions({ title, disabled, onTitleChange, onRename, onTrash }: ItemActionsProps) {
  return (
    <div className="item-actions">
      <form onSubmit={onRename}>
        <label htmlFor="rename-title">이름 변경</label>
        <input id="rename-title" value={title} onChange={(event) => onTitleChange(event.target.value)} disabled={disabled} />
        <button type="submit" disabled={disabled}>변경</button>
      </form>
      <button className="danger-action" type="button" disabled={disabled} onClick={onTrash}>휴지통으로 이동</button>
    </div>
  );
}
