import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BUDGET_TIERS,
  GOALS,
  ROOM_TYPES,
  STYLES,
} from "../lib/cozylogic/constants.ts";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), "utf8");
const contract = JSON.parse(read("tests/fixtures/production-schema-contract.json"));

describe("production schema compatibility contract", () => {
  it("keeps application selections aligned with production CHECK constraints", () => {
    assert.deepEqual([...ROOM_TYPES], contract.tables.rooms.roomTypeCheck);
    assert.deepEqual([...GOALS], contract.tables.rooms.goalCheck);
    assert.deepEqual([...STYLES], contract.tables.rooms.styleKeyCheck);
    assert.deepEqual([...BUDGET_TIERS], contract.tables.rooms.budgetTierCheck);
    assert.deepEqual(contract.tables.rooms.statusCheck, [
      "draft",
      "generating",
      "generated",
      "failed",
    ]);
  });

  it("keeps the signed-in generation select on real rooms columns", () => {
    const route = read("src/app/api/generate/route.ts");
    const select = route.match(/const ROOM_SELECT =\s*\n\s*"([^"]+)"/)?.[1];
    assert.ok(select, "ROOM_SELECT should stay statically inspectable");
    for (const column of select.split(",")) {
      assert.ok(contract.tables.rooms.columns.includes(column), `unknown rooms column: ${column}`);
    }
    assert.doesNotMatch(route, /updated_at/);
    assert.match(route, /\.update\(\{ status: "generating", generation_status: "queued"/);
    assert.match(route, /status: "draft",\s*generation_status: null/);
    assert.doesNotMatch(route, /\.update\(\{ status: "queued"/);
    assert.doesNotMatch(route, /\.update\(\{ status: "error"/);
  });
});
