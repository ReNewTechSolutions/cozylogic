import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

describe("route smoke checks", () => {
  it("honors a validated next path in the auth callback", () => {
    const login = read("src/app/login/page.tsx");
    const callback = read("src/app/auth/callback/route.ts");

    assert.match(login, /emailRedirectTo: `\$\{origin\}\/auth\/callback\?next=/);
    assert.match(callback, /function getSafeNextPath/);
    assert.match(callback, /value\.startsWith\("\/\/"\)/);
    assert.match(callback, /searchParams\.get\("next"\)/);
    assert.match(callback, /NextResponse\.redirect\(new URL\(next, origin\)\)/);
  });

  it("serves /app as the dashboard and links clearly to account", () => {
    const dashboard = read("src/app/(protected)/app/page.tsx");

    assert.match(dashboard, /export default async function DashboardPage/);
    assert.match(dashboard, /<h1[^>]*>Dashboard<\/h1>/);
    assert.match(dashboard, /href="\/app\/new"/);
    assert.match(dashboard, /href="\/app\/history"/);
    assert.match(dashboard, /href="\/app\/account"/);
    assert.doesNotMatch(dashboard, /params\.roomId/);
    assert.doesNotMatch(dashboard, /function ResultPage/);
  });

  it("keeps the protected result page at /app/result/[roomId]", () => {
    const result = read("src/app/(protected)/app/result/[roomId]/page.tsx");

    assert.match(result, /export default async function ResultPage/);
    assert.match(result, /const \{ roomId \} = await params/);
    assert.match(result, /<GenerationOverlay roomId=\{room\.id\}/);
    assert.match(result, /href="\/app"/);
  });

  it("keeps new generation flow pointed at /api/generate and result pages", () => {
    const page = read("src/app/(protected)/app/new/page.tsx");
    const route = read("src/app/api/generate/route.ts");
    const status = read("src/app/api/generate/status/route.ts");

    assert.match(page, /fetch\("\/api\/generate"/);
    assert.match(page, /GenerationOverlay/);
    assert.match(page, /\/api\/generate\/status\?id=/);
    assert.match(route, /after\(async \(\) =>/);
    assert.match(route, /getJobResponse/);
    assert.match(route, /idempotencyKey/);
    assert.match(route, /\.eq\("status", "draft"\)/);
    assert.match(route, /generation_status: "queued"/);
    assert.match(status, /resultUrl: `\/app\/result\/\$\{room\.id\}`/);
  });

  it("keeps demo generation idempotent and waiting on status", () => {
    const page = read("src/app/demo/page.tsx");
    const route = read("src/app/api/demo/generate/route.ts");

    assert.match(page, /GenerationOverlay/);
    assert.match(page, /\/api\/demo\/\$\{encodeURIComponent\(token\)\}\/status/);
    assert.match(route, /buildDemoIdempotencyKey/);
    assert.match(route, /\.eq\("trial_token", idempotencyKey\)/);
    assert.match(route, /getConfiguredImageModel\(\)/);
  });

  it("uses one path-param generation delete route", () => {
    const button = read("components/DeleteGenerationButton.tsx");
    const route = read("src/app/api/generations/[generationId]/delete/route.ts");

    assert.match(button, /fetch\(`\/api\/generations\/\$\{generationId\}\/delete`/);
    assert.match(route, /params: Promise<\{ generationId: string \}>/);
    assert.match(route, /const \{ generationId \} = await ctx\.params/);
    assert.match(route, /deleted_at: now/);
    assert.equal(existsSync(join(root, "src/app/api/generations/delete/route.ts")), false);
    assert.equal(existsSync(join(root, "src/app/api/generations/[Id]/delete/route.ts")), false);
  });
});
