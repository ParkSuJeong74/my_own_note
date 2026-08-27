import assert from "node:assert/strict";
import test from "node:test";
import { parseReferences } from "../src/lib/task-prompts.ts";

test("references support labelled URLs and file paths",()=>{
  assert.deepEqual(parseReferences("Issue | https://github.com/example/1\nfiles/blog/photo.jpg\n/files/output.md"),[
    {label:"Issue",value:"https://github.com/example/1"},{label:"Link",value:"files/blog/photo.jpg"},{label:"File path",value:"/files/output.md"},
  ]);
});
