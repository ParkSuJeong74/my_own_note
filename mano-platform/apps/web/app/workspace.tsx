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
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";

import { loadTree, saveTree } from "../lib/tree-storage";
import { loadDocuments, saveDocuments, type DocumentMap } from "../lib/document-storage";
import { BackupError, createBackup, parseBackup } from "../lib/workspace-backup";
import { searchWorkspace } from "../lib/workspace-search";

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

  useEffect(() => {
    setRenameTitle(selected?.title ?? "");
  }, [selected]);

  useEffect(() => {
    const loadedTree = loadTree(window.localStorage);
    const loadedDocuments = loadDocuments(window.localStorage);
    setTree(loadedTree.tree);
    setDocuments(loadedDocuments.documents);
    const warnings = [
      loadedTree.status === "recovered" ? `${loadedTree.reason} 빈 작업 공간으로 복구했습니다.` : null,
      loadedDocuments.status === "recovered" ? `${loadedDocuments.reason} 빈 본문으로 복구했습니다.` : null,
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

  function addNode(kind: WorkspaceNodeKind, parentId: string | null = null) {
    try {
      const next = createNode(tree, { id: newId(kind), kind, title, parentId });
      const created = next.nodes.at(-1)!;
      setTree(next);
      setTreeDirty(true);
      if (kind === "page") {
        setDocuments((current) => ({ ...current, [created.id]: emptyPageDocument(created.id) }));
        setDocumentsDirty(true);
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
      setSelectedId(nodeId);
      setError(null);
    } catch {
      setError("항목을 복원하지 못했습니다.");
    }
  }

  function openSearchResult(nodeId: string) {
    setSelectedId(nodeId);
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
      setTreeDirty(true);
      setDocumentsDirty(true);
      setError(null);
      setBackupMessage("백업을 복원했습니다.");
    } catch (caught) {
      setBackupMessage(caught instanceof BackupError ? caught.message : "백업 파일을 읽지 못했습니다.");
    }
  }

  const childCount = selected?.kind === "folder" ? activeChildren(tree, selected.id).length : 0;
  const selectedDocument = selected?.kind === "page" ? documents[selected.id] : undefined;
  const bodyBlock = selectedDocument?.blocks[0];
  const bodyText = bodyBlock?.text ?? "";

  function updateBody(text: string) {
    if (!selected || selected.kind !== "page") return;
    const current = documents[selected.id] ?? emptyPageDocument(selected.id);
    const firstBlock = current.blocks[0];
    const updated = firstBlock
      ? updateBlockText(current, firstBlock.id, text)
      : insertBlock(current, 0, { id: `${selected.id}:body`, type: "paragraph", text });
    setDocuments((all) => ({ ...all, [selected.id]: updated }));
    setDocumentsDirty(true);
  }

  return (
    <div className="workspace-grid">
      <aside className="sidebar" aria-labelledby="tree-title">
        <div className="sidebar-heading">
          <div><p className="eyebrow">MY OWN NOTE</p><h1 id="tree-title">내 기록</h1></div>
          <span className="item-count" aria-label={`전체 ${tree.nodes.length}개`}>{tree.nodes.length}</span>
        </div>
        <p className="storage-status" data-status={storageStatus} role="status">
          {storageStatus === "loading" ? "불러오는 중" : storageStatus === "saved" ? "이 브라우저에 저장됨" : "저장하지 못했습니다"}
        </p>
        {storageWarning ? <p className="storage-warning" role="alert">{storageWarning}</p> : null}
        <div className="backup-actions">
          <button type="button" disabled={!hydrated} onClick={exportBackup}>백업 내보내기</button>
          <label className="file-action">백업 가져오기<input type="file" accept="application/json,.json" disabled={!hydrated} onChange={importBackup} /></label>
        </div>
        <p className="backup-caution">백업 파일에는 암호화되지 않은 본문이 포함됩니다.</p>
        {backupMessage ? <p className="backup-message" role="alert">{backupMessage}</p> : null}
        <form className="create-form" onSubmit={submit}>
          <label htmlFor="new-item-title">새 항목 이름</label>
          <div className="create-row">
            <input id="new-item-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="새 기록" autoComplete="off" disabled={!hydrated} />
            <button type="submit" disabled={!hydrated}>페이지</button>
            <button type="button" disabled={!hydrated} onClick={() => addNode("folder")}>폴더</button>
          </div>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="search-box">
          <label htmlFor="workspace-search">전체 검색</label>
          <input id="workspace-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="제목과 본문 검색" disabled={!hydrated} />
        </div>
        <nav aria-label="폴더와 페이지" className="tree-nav">
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
          ) : tree.nodes.length === 0 ? <p className="tree-empty">아직 기록이 없어요. 위에서 첫 페이지를 만들어 보세요.</p> : <TreeBranch tree={tree} parentId={null} selectedId={selectedId} onSelect={setSelectedId} />}
        </nav>
        <section className="trash-section" aria-labelledby="trash-title">
          <h2 id="trash-title">휴지통</h2>
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
      </aside>
      <section className="content-panel" aria-live="polite">
        {!selected ? (
          <div className="content-empty"><div className="note-mark" aria-hidden="true">M</div><h2>기록을 선택해 주세요</h2><p>왼쪽에서 폴더나 페이지를 만들면 이곳에서 내용을 확인할 수 있어요.</p></div>
        ) : selected.kind === "folder" ? (
          <div className="selected-content"><p className="content-type">폴더 · 하위 항목 {childCount}개</p><h2>{selected.title}</h2><ItemActions title={renameTitle} onTitleChange={setRenameTitle} onRename={submitRename} onTrash={moveSelectionToTrash} disabled={!hydrated} /><p>이 폴더 안에 새 페이지를 만들 수 있어요.</p><button className="primary-action" type="button" disabled={!hydrated} onClick={() => addNode("page", selected.id)}>이 폴더에 페이지 추가</button></div>
        ) : (
          <div className="selected-content page-editor"><p className="content-type">페이지</p><h2>{selected.title}</h2><ItemActions title={renameTitle} onTitleChange={setRenameTitle} onRename={submitRename} onTrash={moveSelectionToTrash} disabled={!hydrated} /><label htmlFor="page-body">페이지 본문</label><textarea id="page-body" value={bodyText} onChange={(event) => updateBody(event.target.value)} placeholder="여기에 기록을 시작하세요…" disabled={!hydrated} /></div>
        )}
      </section>
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
