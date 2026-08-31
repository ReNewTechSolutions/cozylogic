import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatUtcDate,
  formatUtcDateTime,
} from "../lib/cozylogic/dateFormat.ts";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), "utf8");

describe("result and history stabilization", () => {
  it("formats saved timestamps deterministically in UTC", () => {
    const timestamp = "2026-08-30T00:02:23.000Z";
    const originalTimeZone = process.env.TZ;

    try {
      process.env.TZ = "America/Chicago";
      const chicago = [formatUtcDate(timestamp), formatUtcDateTime(timestamp)];
      process.env.TZ = "Asia/Tokyo";
      const tokyo = [formatUtcDate(timestamp), formatUtcDateTime(timestamp)];

      assert.deepEqual(chicago, tokyo);
      assert.deepEqual(chicago, ["Aug 30, 2026", "Aug 30, 2026, 12:02 AM UTC"]);
      assert.equal(formatUtcDate("not-a-date"), "");
      assert.equal(formatUtcDateTime(null), "");
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });

  it("removes environment-default date rendering from saved-result surfaces", () => {
    const surfaces = [
      "components/RecentDesignGrid.tsx",
      "src/app/(protected)/app/page.tsx",
      "src/app/(protected)/app/account/page.tsx",
      "src/app/(protected)/app/history/page.tsx",
      "src/app/(protected)/app/result/[roomId]/page.tsx",
      "src/app/demo/result/[token]/page.tsx",
    ].map(read).join("\n");

    assert.doesNotMatch(surfaces, /toLocale(?:String|DateString|TimeString)/);
    assert.match(surfaces, /formatUtcDate/);
    assert.match(surfaces, /formatUtcDateTime/);
  });

  it("batches history image signing and filters incomplete or deleted results", () => {
    const images = read("lib/cozylogic/images.ts");
    const grid = read("components/RecentDesignGrid.tsx");
    const history = read("src/app/(protected)/app/history/page.tsx");

    assert.match(images, /createSignedUrls\(uniquePaths, expiresIn\)/);
    assert.equal((grid.match(/getSignedUrls\(/g) ?? []).length, 2);
    assert.doesNotMatch(grid, /getSignedUrl\(/);
    assert.match(history, /\.is\("deleted_at", null\)/);
    assert.match(history, /!!g\.room && !!g\.output_image_path/);
    assert.match(grid, /loading="lazy"/);
    assert.match(grid, /decoding="async"/);
  });

  it("keeps result rendering generation-free and tier-correct", () => {
    const signedResult = read("src/app/(protected)/app/result/[roomId]/page.tsx");
    const demoResult = read("src/app/demo/result/[token]/page.tsx");
    const combined = `${signedResult}\n${demoResult}`;

    assert.doesNotMatch(combined, /\/api\/(?:demo\/)?generate/);
    assert.doesNotMatch(combined, /openai|images\/edits/i);
    assert.match(signedResult, /budget_tier !== "rearrange_only"/);
    assert.match(signedResult, /budget_tier === "rearrange_only"/);
    assert.match(demoResult, /budget_tier !== "rearrange_only"/);
    assert.match(demoResult, /budget_tier === "rearrange_only"/);
    assert.match(combined, /<ShopThisLook/);
    assert.match(combined, /<UseWhatYouHave/);
  });

  it("stops polling immediately after completion and cleans up timers", () => {
    const overlay = read("components/GenerationOverlay.tsx");

    assert.match(overlay, /if \(pollInterval !== null\) window\.clearInterval\(pollInterval\)/);
    assert.match(overlay, /if \(refreshTimeout !== null\) window\.clearTimeout\(refreshTimeout\)/);
    assert.equal((overlay.match(/window\.setInterval\(poll, 2500\)/g) ?? []).length, 1);
  });
});
