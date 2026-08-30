import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildFreeFixImagePrompt } from "../lib/cozylogic/freeFixPrompt.ts";
import { getConfiguredImageGeneration } from "../lib/cozylogic/generationConfig.ts";
import { getImageEditInputFidelity } from "../lib/cozylogic/imageEditPolicy.ts";
import { scorePreservationReview } from "../lib/cozylogic/preservationScore.ts";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), "utf8");

describe("Free Fix fidelity and durable processing", () => {
  it("isolates the promoted Free Fix configuration from every other tier", () => {
    const names = [
      "COZYLOGIC_FREE_FIX_IMAGE_MODEL",
      "COZYLOGIC_FREE_FIX_IMAGE_QUALITY",
      "COZYLOGIC_FREE_FIX_IMAGE_SIZE",
      "COZYLOGIC_IMAGE_MODEL",
      "COZYLOGIC_IMAGE_QUALITY",
      "COZYLOGIC_IMAGE_SIZE",
      "OPENAI_IMAGE_MODEL",
      "COZYLOGIC_IMAGE_MODEL_FALLBACK",
    ];
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));

    try {
      process.env.COZYLOGIC_IMAGE_MODEL = "gpt-image-1-mini";
      process.env.COZYLOGIC_IMAGE_QUALITY = "low";
      process.env.COZYLOGIC_IMAGE_SIZE = "1024x1024";
      delete process.env.COZYLOGIC_FREE_FIX_IMAGE_MODEL;
      delete process.env.COZYLOGIC_FREE_FIX_IMAGE_QUALITY;
      delete process.env.COZYLOGIC_FREE_FIX_IMAGE_SIZE;

      assert.deepEqual(
        getConfiguredImageGeneration({
          budgetTier: "rearrange_only",
          defaultQuality: "low",
          defaultSize: "1024x1024",
        }),
        { model: "gpt-image-2", quality: "medium", size: "auto" }
      );
      assert.deepEqual(
        getConfiguredImageGeneration({
          budgetTier: "under_500",
          defaultQuality: "medium",
          defaultSize: "auto",
        }),
        { model: "gpt-image-1-mini", quality: "low", size: "1024x1024" }
      );

      process.env.COZYLOGIC_FREE_FIX_IMAGE_MODEL = "gpt-image-2";
      process.env.COZYLOGIC_FREE_FIX_IMAGE_QUALITY = "medium";
      process.env.COZYLOGIC_FREE_FIX_IMAGE_SIZE = "auto";
      assert.deepEqual(
        getConfiguredImageGeneration({ budgetTier: "rearrange_only" }),
        { model: "gpt-image-2", quality: "medium", size: "auto" }
      );
    } finally {
      for (const name of names) {
        const value = previous[name];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  it("uses one strict prompt for signed-in and demo generation", () => {
    const prompt = buildFreeFixImagePrompt({
      roomTypeLabel: "Living room",
      styleLabel: "Cozy Neutral",
    });
    const signedRoute = read("src/app/api/generate/route.ts");
    const demoRoute = read("src/app/api/demo/generate/route.ts");

    assert.match(prompt, /object-preserving rearrangement preview, not a redesign/i);
    assert.match(prompt, /exercise or gym equipment/i);
    assert.match(prompt, /treadmills/i);
    assert.match(prompt, /walkers and mobility aids/i);
    assert.match(prompt, /pet furniture/i);
    assert.match(prompt, /storage bins/i);
    assert.match(prompt, /floor lamps/i);
    assert.match(prompt, /lighting fixtures/i);
    assert.match(prompt, /Do NOT change upholstery, rug design, or furniture style/i);
    assert.match(prompt, /Do NOT add any new furniture/i);
    assert.match(prompt, /If none exist, do not add them/i);
    assert.match(prompt, /visually similar substitutions/i);
    assert.match(prompt, /exactly ONE realistic photorealistic AFTER image/i);
    assert.match(signedRoute, /buildFreeFixImagePrompt/);
    assert.match(demoRoute, /buildFreeFixImagePrompt/);
    assert.equal((signedRoute.match(/openai\.images\.edit/g) ?? []).length, 1);
    assert.equal((demoRoute.match(/v1\/images\/edits/g) ?? []).length, 1);
    assert.match(signedRoute, /n:\s*1/);
    assert.match(demoRoute, /formData\.append\("n", "1"\)/);
  });

  it("uses documented model-specific input fidelity behavior", () => {
    assert.equal(getImageEditInputFidelity("gpt-image-1-mini", "rearrange_only"), undefined);
    assert.equal(getImageEditInputFidelity("gpt-image-2", "rearrange_only"), undefined);
    assert.equal(getImageEditInputFidelity("gpt-image-1.5", "rearrange_only"), "high");
    assert.equal(getImageEditInputFidelity("gpt-image-1", "under_500"), "low");
  });

  it("scores the manual canary at a strict all-or-nothing launch gate", () => {
    const fixture = JSON.parse(read("tests/fixtures/free-fix-canary.json"));
    const passing = scorePreservationReview({
      expectedInventory: fixture.expectedInventory,
      preservedInventory: fixture.expectedInventory,
      inventedMajorObjects: 0,
      architectureChanges: 0,
    });
    const failing = scorePreservationReview({
      expectedInventory: fixture.expectedInventory,
      preservedInventory: fixture.expectedInventory.filter((item) => item !== "treadmill"),
      inventedMajorObjects: 1,
      architectureChanges: 0,
    });

    assert.equal(passing.retentionPercent, 100);
    assert.equal(passing.passes, true);
    assert.equal(failing.passes, false);
    assert.deepEqual(failing.missingInventory, ["treadmill"]);
  });

  it("puts accepted jobs in durable result URLs before polling", () => {
    const signedPage = read("src/app/(protected)/app/new/page.tsx");
    const demoPage = read("src/app/demo/page.tsx");
    const signedResult = read("src/app/(protected)/app/result/[roomId]/page.tsx");
    const demoResult = read("src/app/demo/result/[token]/page.tsx");

    assert.match(signedPage, /router\.replace\(resultUrl\)/);
    assert.match(demoPage, /router\.replace\(resultUrl\)/);
    assert.doesNotMatch(signedPage, /GenerationOverlay/);
    assert.doesNotMatch(demoPage, /GenerationOverlay/);
    assert.match(signedResult, /<GenerationOverlay/);
    assert.match(demoResult, /<GenerationOverlay/);
    assert.match(signedResult, /roomId=\{room\.id\}/);
    assert.match(demoResult, /statusUrl=\{`\/api\/demo\//);
    assert.match(signedResult, /\.from\("rooms"\)/);
    assert.match(demoResult, /\.from\("guest_trials"\)/);
    assert.doesNotMatch(signedResult, /fetch\("\/api\/generate"/);
    assert.doesNotMatch(demoResult, /fetch\("\/api\/demo\/generate"/);
  });

  it("keeps Free Fix shopping-free and gives invalid demo links exits", () => {
    const shop = read("components/ShopThisLook.tsx");
    const signedResult = read("src/app/(protected)/app/result/[roomId]/page.tsx");
    const demoResult = read("src/app/demo/result/[token]/page.tsx");
    const recent = read("components/RecentDesignGrid.tsx");

    assert.match(shop, /budgetTier === "rearrange_only"\) return null/);
    assert.match(signedResult, /<UseWhatYouHave/);
    assert.match(demoResult, /<UseWhatYouHave/);
    assert.match(demoResult, /Try another preview/);
    assert.match(demoResult, />\s*Home\s*</);
    assert.doesNotMatch(recent, /GOAL_LABELS/);
  });

  it("reuses recoverable records instead of creating orphan retry rows", () => {
    const signedPage = read("src/app/(protected)/app/new/page.tsx");
    const signedRoute = read("src/app/api/generate/route.ts");
    const demoRoute = read("src/app/api/demo/generate/route.ts");
    const demoResult = read("src/app/demo/result/[token]/page.tsx");

    assert.match(signedPage, /retryableWithExistingDraft/);
    assert.match(signedRoute, /generation job rollback/);
    assert.match(signedRoute, /status: "draft",\s*generation_status: null/);
    assert.match(signedRoute, /pendingUsageRollback/);
    assert.match(demoRoute, /\["draft", "failed", "error"\]/);
    assert.doesNotMatch(demoResult, /trial\.status === "draft"/);
  });

  it("keeps the experiment isolated from production cost and retries", () => {
    const harness = read("scripts/preservation-fidelity-harness.mts");
    const config = read("lib/cozylogic/generationConfig.ts");

    assert.match(harness, /COZYLOGIC_PRESERVATION_CANDIDATE_MODEL/);
    assert.match(harness, /--confirm-paid-call/);
    assert.match(harness, /maxRetries:\s*0/);
    assert.equal((harness.match(/openai\.images\.edit/g) ?? []).length, 1);
    assert.doesNotMatch(harness, /chat\.completions/);
    assert.doesNotMatch(config, /COZYLOGIC_PRESERVATION_CANDIDATE/);
  });

  it("keeps production Free Fix single-call, idempotent, and pre-validation safe", () => {
    const signedRoute = read("src/app/api/generate/route.ts");
    const demoRoute = read("src/app/api/demo/generate/route.ts");
    const signedPage = read("src/app/(protected)/app/new/page.tsx");
    const demoPage = read("src/app/demo/page.tsx");

    assert.equal((signedRoute.match(/openai\.images\.edit/g) ?? []).length, 1);
    assert.equal((demoRoute.match(/v1\/images\/edits/g) ?? []).length, 1);
    assert.match(signedRoute, /maxRetries:\s*0/);
    assert.match(signedRoute, /n:\s*1/);
    assert.match(demoRoute, /formData\.append\("n", "1"\)/);
    assert.doesNotMatch(`${signedRoute}\n${demoRoute}`, /getConfiguredTextModel|chat\.completions/);
    assert.doesNotMatch(`${signedRoute}\n${demoRoute}`, /fallbackModel|fallbackCall/);
    assert.match(signedPage, /if \(generateSubmitRef\.current\) return/);
    assert.match(demoPage, /if \(submitRef\.current\) return/);
    assert.match(signedRoute, /room\.status === "generated"/);
    assert.match(signedRoute, /getJobResponse\(existingRoom\.id, idempotencyKey, true\)/);
    assert.match(demoRoute, /ACTIVE_OR_COMPLETED_TRIAL_STATUSES/);
    assert.match(demoRoute, /getTrialResponse\(existingTrial, true\)/);
    assert.ok(
      demoRoute.indexOf("hasMatchingImageSignature") <
        demoRoute.indexOf("after(async () =>")
    );
    assert.ok(
      signedRoute.indexOf("hasMatchingImageSignature") <
        signedRoute.indexOf("openai.images.edit")
    );
  });
});
