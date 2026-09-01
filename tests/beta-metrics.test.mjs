import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  estimateImageCostUsd,
  normalizeImageTokenUsage,
} from "../lib/cozylogic/imageUsage.ts";
import { getDailyImageCallLimit } from "../lib/cozylogic/costGuard.ts";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

describe("small-beta telemetry and cost safeguards", () => {
  it("normalizes image usage and estimates GPT Image 2 cost from tokens", () => {
    const usage = normalizeImageTokenUsage({
      input_tokens: 110,
      input_tokens_details: { image_tokens: 100, text_tokens: 10 },
      output_tokens: 200,
      total_tokens: 310,
    });

    assert.deepEqual(usage, {
      inputTokens: 110,
      inputImageTokens: 100,
      inputTextTokens: 10,
      outputTokens: 200,
      totalTokens: 310,
    });
    assert.equal(estimateImageCostUsd("gpt-image-2", usage), 0.00685);
  });

  it("uses a conservative bounded daily image-job limit", () => {
    const previous = process.env.COZYLOGIC_DAILY_IMAGE_CALL_LIMIT;
    delete process.env.COZYLOGIC_DAILY_IMAGE_CALL_LIMIT;
    assert.equal(getDailyImageCallLimit(), 25);
    process.env.COZYLOGIC_DAILY_IMAGE_CALL_LIMIT = "999999";
    assert.equal(getDailyImageCallLimit(), 10_000);
    if (previous === undefined) delete process.env.COZYLOGIC_DAILY_IMAGE_CALL_LIMIT;
    else process.env.COZYLOGIC_DAILY_IMAGE_CALL_LIMIT = previous;
  });

  it("keeps the event taxonomy complete and generation routes cost-guarded", () => {
    const names = read("lib/cozylogic/productEventNames.ts");
    const signed = read("src/app/api/generate/route.ts");
    const demo = read("src/app/api/demo/generate/route.ts");
    const metrics = read("lib/cozylogic/generationMetrics.ts");

    for (const event of [
      "homepage_viewed",
      "demo_started",
      "upload_started",
      "upload_succeeded",
      "upload_failed",
      "generation_submitted",
      "generation_accepted",
      "generation_completed",
      "generation_failed",
      "result_viewed",
      "result_reopened",
      "free_fix_selected",
      "under_100_selected",
      "under_500_selected",
      "dream_mode_selected",
      "amazon_affiliate_link_clicked",
      "account_creation_started",
      "account_created",
    ]) {
      assert.match(names, new RegExp(event));
    }

    assert.match(names, /Record<string, string \| boolean \| null>/);
    assert.doesNotMatch(names, /ProductEventProperties[^;]*number/);

    assert.match(signed, /checkDailyImageBudget/);
    assert.match(demo, /checkDailyImageBudget/);
    assert.match(metrics, /imageCallCount/);
    assert.match(metrics, /openaiGenerationDurationMs/);
    assert.match(metrics, /estimatedImageCostUsd/);
  });
});
