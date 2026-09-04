import assert from "node:assert/strict";
import test from "node:test";
import { usesInternalBearerAuthentication } from "../src/lib/request-auth.ts";
import { blogIngestAuthorized, n8nAuthorized } from "../src/lib/internal-auth.ts";

test("only designated automation routes bypass Cloudflare Access", () => {
  assert.equal(usesInternalBearerAuthentication("/api/t1/sync"), true);
  assert.equal(usesInternalBearerAuthentication("/api/t1/monitor"), true);
  assert.equal(usesInternalBearerAuthentication("/api/t1/live-monitor"), true);
  assert.equal(usesInternalBearerAuthentication("/api/integrations/blog/replies"), true);
  assert.equal(usesInternalBearerAuthentication("/api/integrations/n8n/blog/replies/remind"), true);
  assert.equal(usesInternalBearerAuthentication("/api/integrations/n8n/tasks"), true);
  assert.equal(usesInternalBearerAuthentication("/api/worker/executions/claim"), true);
  assert.equal(usesInternalBearerAuthentication("/api/t1/sync/anything"), false);
  assert.equal(usesInternalBearerAuthentication("/api/automation/tasks"), false);
  assert.equal(usesInternalBearerAuthentication("/api/errors"), false);
});

test("blog ingestion uses its own fail-closed bearer token", () => {
  const previous = process.env.MANO_BLOG_INGEST_TOKEN;
  try {
    process.env.MANO_BLOG_INGEST_TOKEN = "blog-ingest-token";
    assert.equal(blogIngestAuthorized(new Request("https://admin.mano.io.kr/api/integrations/blog/replies", {headers:{authorization:"Bearer blog-ingest-token"}})), true);
    assert.equal(blogIngestAuthorized(new Request("https://admin.mano.io.kr/api/integrations/blog/replies", {headers:{authorization:"Bearer wrong"}})), false);
    delete process.env.MANO_BLOG_INGEST_TOKEN;
    assert.equal(blogIngestAuthorized(new Request("https://admin.mano.io.kr/api/integrations/blog/replies", {headers:{authorization:"Bearer blog-ingest-token"}})), false);
  } finally { if(previous===undefined)delete process.env.MANO_BLOG_INGEST_TOKEN;else process.env.MANO_BLOG_INGEST_TOKEN=previous; }
});

test("T1 automation bearer authentication fails closed", () => {
  const previous = process.env.MANO_N8N_TOKEN;
  try {
    delete process.env.MANO_N8N_TOKEN;
    assert.equal(n8nAuthorized(new Request("http://mano-admin:3000/api/t1/sync")), false);
    process.env.MANO_N8N_TOKEN = "test-token-value";
    assert.equal(n8nAuthorized(new Request("http://mano-admin:3000/api/t1/sync")), false);
    assert.equal(n8nAuthorized(new Request("http://mano-admin:3000/api/t1/sync", {headers:{authorization:"Bearer wrong-token"}})), false);
    assert.equal(n8nAuthorized(new Request("http://mano-admin:3000/api/t1/sync", {headers:{authorization:"Bearer test-token-value"}})), true);
    assert.equal(n8nAuthorized(new Request("http://mano-admin:3000/api/t1/monitor", {headers:{authorization:"Bearer wrong-token"}})), false);
    assert.equal(n8nAuthorized(new Request("http://mano-admin:3000/api/t1/monitor", {headers:{authorization:"Bearer test-token-value"}})), true);
    assert.equal(n8nAuthorized(new Request("http://mano-admin:3000/api/t1/live-monitor", {headers:{authorization:"Bearer wrong-token"}})), false);
    assert.equal(n8nAuthorized(new Request("http://mano-admin:3000/api/t1/live-monitor", {headers:{authorization:"Bearer test-token-value"}})), true);
  } finally {
    if (previous === undefined) delete process.env.MANO_N8N_TOKEN;
    else process.env.MANO_N8N_TOKEN = previous;
  }
});
