import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("workspace page editor exposes debounced saving and conflict states", () => {
  const editor = read("src/components/workspace-page-editor.tsx");
  assert.match(editor, /setTimeout\(async\(\)=>/);
  assert.match(editor, /},600\)/);
  assert.match(editor, /response\.status\s*===\s*409/);
  assert.match(editor, /저장 중/);
  assert.match(editor, /저장 실패/);
});

test("workspace page APIs preserve version and ownership boundaries", () => {
  const repository = read("src/lib/block-workspace-repository.ts");
  assert.match(repository, /version=version\+1/);
  assert.match(repository, /id=\$1 AND page_id=\$2 AND version=\$5/);
  assert.match(repository, /BEGIN/);
  assert.match(repository, /ROLLBACK/);
  assert.match(repository, /WITH RECURSIVE subtree/);
  assert.match(repository, /archived_at=now\(\)/);
  assert.match(repository, /parent\.archived_at IS NULL/);
});

test("block editor supports conversion, enter insertion, movement, todo, and deletion",()=>{const editor=read("src/components/workspace-page-editor.tsx"),repository=read("src/lib/block-workspace-repository.ts");assert.match(editor,/BULLETED_LIST/);assert.match(editor,/type===\"TODO\"/);assert.match(editor,/event\.key===\"Enter\"/);assert.match(editor,/method:\"DELETE\"/);assert.match(editor,/moveWorkspaceBlockAction/);assert.match(repository,/addWorkspaceParagraphAfter/);assert.match(repository,/archiveWorkspaceBlock/);});

test("pages expose bounded content search, recent pages, and slash commands",()=>{const page=read("src/app/pages/page.tsx"),editor=read("src/components/workspace-page-editor.tsx"),repository=read("src/lib/block-workspace-repository.ts");assert.match(page,/slice\(0,100\)/);assert.match(page,/최근 페이지/);assert.match(repository,/content->>'text' ILIKE/);assert.match(repository,/last_opened_at DESC LIMIT \$1/);assert.match(editor,/workspace-slash-menu/);assert.match(editor,/event\.key==="Escape"/);});
