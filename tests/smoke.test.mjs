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
    assert.match(result, /<GenerationOverlay/);
    assert.match(result, /roomId=\{room\.id\}/);
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
    const uploadRoute = read("src/app/api/demo/upload/route.ts");

    assert.match(page, /GenerationOverlay/);
    assert.match(page, /\/api\/demo\/\$\{encodeURIComponent\(token\)\}\/status/);
    assert.match(page, /uploadToSignedUrl/);
    assert.match(page, /if \(submitRef\.current\) return/);
    assert.match(route, /buildDemoIdempotencyKey/);
    assert.match(route, /\.eq\("trial_token", idempotencyKey\)/);
    assert.match(route, /verifyDemoUploadSession/);
    assert.match(route, /\.in\("status", \["failed", "error"\]\)/);
    assert.match(route, /retried/);
    assert.match(uploadRoute, /createSignedUploadUrl/);
    assert.match(uploadRoute, /guest_session_created/);
    assert.match(route, /getConfiguredImageModel\(\)/);
  });

  it("keeps the room preview controls friendly and card based", () => {
    const constants = read("lib/cozylogic/constants.ts");
    const newPage = read("src/app/(protected)/app/new/page.tsx");
    const demoPage = read("src/app/demo/page.tsx");

    assert.match(constants, /STYLE_METADATA/);
    assert.match(constants, /BUDGET_METADATA/);
    assert.match(constants, /STYLE_CHOICES/);
    assert.match(constants, /BUDGET_CHOICES/);
    assert.match(constants, /enumValue: "cozy_neutral"/);
    assert.match(constants, /displayLabel: "Cozy Neutral"/);
    assert.match(constants, /displayLabel: "Warm Modern"/);
    assert.match(constants, /displayLabel: "Soft Boho"/);
    assert.match(constants, /displayLabel: "Clean Traditional"/);
    assert.match(constants, /displayLabel: "Small Space Smart"/);
    assert.match(constants, /Free Fix — Use what I already own/);
    assert.match(constants, /Under \$100 — Small cozy refresh/);
    assert.match(constants, /Under \$500 — Real room glow-up/);
    assert.match(constants, /Dream Mode — Show me the upgraded version/);
    assert.match(constants, /DEFAULT_BUDGET_TIER = "rearrange_only"/);
    assert.match(newPage, /Preview the refresh/);
    assert.match(demoPage, /Preview my free room refresh/);
    assert.match(newPage, /STYLE_CHOICES\.map/);
    assert.match(demoPage, /STYLE_CHOICES\.map/);
    assert.match(newPage, /BUDGET_PREVIEW_SETTINGS\[budgetTier\]/);
    assert.match(demoPage, /BUDGET_PREVIEW_SETTINGS\[budgetTier\]/);
    assert.doesNotMatch(newPage, /MODE_OPTIONS/);
    assert.doesNotMatch(demoPage, /MODE_OPTIONS/);
    assert.doesNotMatch(newPage, /GOALS\.map/);
    assert.doesNotMatch(demoPage, /GOALS\.map/);
    assert.doesNotMatch(demoPage, /BUDGET_TIERS\.map/);
    assert.doesNotMatch(demoPage, /STYLES\.map/);
    assert.doesNotMatch(newPage, /type="range"/);
    assert.doesNotMatch(demoPage, /type="range"/);
    assert.equal(existsSync(join(root, "components/ModeStrength.tsx")), false);
  });

  it("adds optional affiliate shopping links to result pages", () => {
    const envExample = read(".env.example");
    const shop = read("components/ShopThisLook.tsx");
    const result = read("src/app/(protected)/app/result/[roomId]/page.tsx");
    const demoResult = read("src/app/demo/result/[token]/page.tsx");

    assert.match(envExample, /AMAZON_ASSOCIATE_TAG=$/m);
    assert.doesNotMatch(envExample, /NEXT_PUBLIC_AMAZON/);
    assert.match(shop, /Shop this cozy look/);
    assert.match(shop, /ROOM_SUGGESTIONS/);
    assert.match(shop, /GOAL_SUGGESTIONS/);
    assert.match(shop, /BUDGET_SUGGESTIONS/);
    assert.match(shop, /process\.env\.AMAZON_ASSOCIATE_TAG/);
    assert.match(shop, /https:\/\/www\.amazon\.com\/s\?/);
    assert.match(shop, /As an Amazon Associate, CozyLogic may earn from qualifying purchases\./);
    assert.match(shop, /rel="nofollow sponsored noopener noreferrer"/);
    assert.doesNotMatch(result, /organizer_recs_json/);
    assert.doesNotMatch(result, /recommendations=\{/);
    assert.match(result, /<ShopThisLook/);
    assert.match(demoResult, /<ShopThisLook/);
  });

  it("keeps image generation fast and server-configured", () => {
    const envExample = read(".env.example");
    const config = read("lib/cozylogic/generationConfig.ts");
    const route = read("src/app/api/generate/route.ts");
    const demoRoute = read("src/app/api/demo/generate/route.ts");

    assert.match(envExample, /COZYLOGIC_IMAGE_QUALITY=low/);
    assert.match(envExample, /COZYLOGIC_IMAGE_SIZE=auto/);
    assert.match(config, /getConfiguredImageQuality/);
    assert.match(config, /getConfiguredImageSize/);
    assert.match(route, /getConfiguredImageQuality\(planState\.plan === "pro" \? "medium" : "low"\)/);
    assert.match(route, /getConfiguredImageSize\("auto"\)/);
    assert.match(route, /passCount: 1/);
    assert.match(route, /maxRetries: 0/);
    assert.match(route, /OpenAI image call started/);
    assert.match(route, /Supabase upload started/);
    assert.doesNotMatch(route, /tidyBytes/);
    assert.doesNotMatch(route, /openai\.chat\.completions\.create/);
    assert.doesNotMatch(route, /fallbackModel/);
    assert.match(demoRoute, /getConfiguredImageQuality\("low"\)/);
    assert.match(demoRoute, /getConfiguredImageSize\("auto"\)/);
    assert.match(demoRoute, /formData\.append\("quality", args\.quality\)/);
    assert.doesNotMatch(demoRoute, /fallbackModel/);
  });

  it("protects generation UX while waiting and recovers from failed jobs", () => {
    const newPage = read("src/app/(protected)/app/new/page.tsx");
    const demoPage = read("src/app/demo/page.tsx");
    const overlay = read("components/GenerationOverlay.tsx");
    const result = read("src/app/(protected)/app/result/[roomId]/page.tsx");
    const demoResult = read("src/app/demo/result/[token]/page.tsx");

    assert.match(newPage, /generateSubmitRef\.current = true/);
    assert.match(newPage, /disabled=\{busy \|\| !!generationJob \|\| !canContinue\}/);
    assert.match(newPage, /onRetry=\{resetFailedGeneration\}/);
    assert.match(newPage, /setRoomId\(null\)/);
    assert.match(demoPage, /submitRef\.current = true/);
    assert.match(demoPage, /disabled=\{busy \|\| !!generationJob\}/);
    assert.match(demoPage, /onRetry=\{resetFailedGeneration\}/);
    assert.match(overlay, /fixed inset-0 z-\[100\]/);
    assert.match(overlay, /Studying your room/);
    assert.match(overlay, /Keeping your layout realistic/);
    assert.match(overlay, /Testing cozy changes/);
    assert.match(overlay, /Finalizing your preview/);
    assert.match(overlay, /Please do not refresh or click preview again/);
    assert.match(overlay, /This one got stuck/);
    assert.match(overlay, /friendlyGenerationError/);
    assert.match(result, /We could not finish this preview/);
    assert.match(result, /retryHref="\/app\/new"/);
    assert.match(result, /href="\/app\/new"/);
    assert.match(demoResult, /We could not finish this free preview/);
    assert.match(demoResult, /statusUrl=\{`\/api\/demo\/\$\{encodeURIComponent\(token\)\}\/status`\}/);
    assert.match(demoResult, /retryHref="\/demo"/);
    assert.match(demoResult, /href="\/demo"/);
  });

  it("keeps generation realistic and preserves fixed room evidence", () => {
    const route = read("src/app/api/generate/route.ts");
    const demoRoute = read("src/app/api/demo/generate/route.ts");
    const prompts = read("lib/cozylogic/prompts.ts");
    const inventory = read("lib/cozylogic/inventoryPrompt.ts");
    const generationLanguage = `${route}\n${demoRoute}\n${prompts}\n${inventory}`;

    assert.doesNotMatch(generationLanguage, /MAGAZINE-WORTHY/i);
    assert.doesNotMatch(generationLanguage, /full redesign/i);
    assert.doesNotMatch(generationLanguage, /AT LEAST 8/i);
    assert.doesNotMatch(generationLanguage, /At least TWO major items/i);
    assert.doesNotMatch(generationLanguage, /stronger transformation/i);
    assert.match(route, /Return exactly ONE realistic "AFTER" image/);
    assert.match(demoRoute, /Return exactly one realistic AFTER image/);
    assert.match(generationLanguage, /walls, windows, doors/);
    assert.match(generationLanguage, /same camera angle/i);
    assert.match(generationLanguage, /If a TV is present/);
    assert.match(generationLanguage, /Do not force major movement/);
    assert.match(inventory, /exercise or gym equipment/);
    assert.match(inventory, /walkers and mobility aids/);
    assert.match(inventory, /pet furniture/);
    assert.match(inventory, /Do NOT add any new furniture/);
    assert.match(inventory, /Do NOT remove, hide, crop out/);
    assert.match(inventory, /Do NOT add decor unless that exact decor is already visible/);
    assert.match(route, /STRICT_INVENTORY_PRESERVATION_RULES/);
    assert.match(demoRoute, /STRICT_INVENTORY_PRESERVATION_RULES/);
  });

  it("keeps signed uploads scoped to the authenticated user's path", () => {
    const upload = read("components/UploadCard.tsx");
    const route = read("src/app/api/images/signed-url/route.ts");
    const statusRoute = read("src/app/api/images/upload-status/route.ts");

    assert.doesNotMatch(upload, /auth\.getSession/);
    assert.doesNotMatch(upload, /console\.(?:log|debug|info)/);
    assert.match(route, /validateImageFileMetadata/);
    assert.match(route, /isOwnedUploadPath\(path, user\.id\)/);
    assert.match(route, /forbidden_path/);
    assert.match(upload, /uploadToSignedUrl/);
    assert.match(statusRoute, /upload_start/);
    assert.match(statusRoute, /upload_end/);
  });

  it("reports friendly pre-generation failures and structured stages", () => {
    const demoPage = read("src/app/demo/page.tsx");
    const newPage = read("src/app/(protected)/app/new/page.tsx");
    const demoRoute = read("src/app/api/demo/generate/route.ts");
    const generateRoute = read("src/app/api/generate/route.ts");
    const uploadRoute = read("src/app/api/demo/upload/route.ts");
    const logger = read("lib/cozylogic/serverLog.ts");

    assert.match(demoPage, /if \(uploadError\)/);
    assert.match(demoPage, /storage_upload_failed/);
    assert.match(newPage, /generation job/);
    assert.match(newPage, /if \(!res\.ok\) \{[\s\S]*setRoomId\(null\)/);
    assert.match(demoRoute, /generation_job_creation_failed/);
    assert.match(generateRoute, /generation_job_creation_failed/);
    assert.match(demoRoute, /generation job creation started/);
    assert.match(generateRoute, /generation job creation started/);
    assert.match(demoRoute, /OpenAI image call started/);
    assert.match(generateRoute, /OpenAI image call started/);
    assert.match(uploadRoute, /upload_start/);
    assert.match(uploadRoute, /upload_end/);
    assert.match(logger, /SENSITIVE_FIELD/);
    assert.match(logger, /final_failure/);
    assert.doesNotMatch(demoPage, /setGenerationJob\(\{\}\)/);
  });

  it("keeps signed-in saved results available beyond a signed URL TTL", () => {
    const result = read("src/app/(protected)/app/result/[roomId]/page.tsx");

    assert.doesNotMatch(result, /isExpired/);
    assert.doesNotMatch(result, /Unlock this preview/);
    assert.doesNotMatch(result, /blur-sm opacity-80/);
    assert.match(result, /\{outputUrl \? \(/);
  });

  it("includes synthetic QA fixtures for four representative room types", () => {
    const fixtures = JSON.parse(read("tests/fixtures/room-qa.json"));

    assert.deepEqual(
      fixtures.map((fixture) => fixture.roomType),
      ["bedroom", "living_room", "office", "small_space"]
    );
    for (const fixture of fixtures) {
      assert.match(fixture.id, /^synthetic-/);
      assert.equal(typeof fixture.scene, "string");
      assert.ok(fixture.scene.length > 40);
      assert.ok(fixture.preserve.includes("architecture"));
      assert.ok(fixture.preserve.includes("windows"));
      assert.ok(fixture.preserve.includes("camera_angle"));
    }
  });

  it("keeps the editorial mission board UI surfaces present", () => {
    const home = read("src/app/page.tsx");
    const demoPage = read("src/app/demo/page.tsx");
    const newPage = read("src/app/(protected)/app/new/page.tsx");
    const overlay = read("components/GenerationOverlay.tsx");
    const board = read("components/ResultMissionBoard.tsx");
    const result = read("src/app/(protected)/app/result/[roomId]/page.tsx");
    const demoResult = read("src/app/demo/result/[token]/page.tsx");
    const shop = read("components/ShopThisLook.tsx");

    assert.match(home, /room mission no\. 01/);
    assert.match(home, /mission board rules/);
    assert.match(demoPage, /CozyLogic room mission/);
    assert.match(newPage, /CozyLogic room mission/);
    assert.match(overlay, /room mission in progress/);
    assert.match(board, /Move this first/);
    assert.match(board, /Keep this/);
    assert.match(board, /Optional buys/);
    assert.match(result, /before \/ after clippings/);
    assert.match(demoResult, /before \/ after clippings/);
    assert.match(shop, /Optional buys/);
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
