import assert from "node:assert/strict";
import test from "node:test";
import { directionEditorState } from "../src/lib/direction-editor-state.ts";

test("opens and closes the direction editor for cancel and save", () => {
  assert.equal(directionEditorState("closed", "open"), "open");
  assert.equal(directionEditorState("open", "cancel"), "closed");
  assert.equal(directionEditorState("open", "saved"), "closed");
});
