import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type RuntimeEvent = Record<string, unknown>;

function parseRuntimeEvent(line: string): RuntimeEvent | null {
  try {
    const outer = JSON.parse(line) as RuntimeEvent;
    if (outer.service === "cozylogic") return outer;

    for (const key of ["message", "msg", "text"]) {
      const nested = outer[key];
      if (typeof nested !== "string") continue;
      try {
        const parsed = JSON.parse(nested) as RuntimeEvent;
        if (parsed.service === "cozylogic") {
          if (!parsed.timestamp && typeof outer.timestamp === "string") {
            parsed.timestamp = outer.timestamp;
          }
          return parsed;
        }
      } catch {}
    }
  } catch {}
  return null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npm run beta:metrics -- <vercel-runtime-log-export.jsonl>");
  process.exitCode = 1;
} else {
  const events = readFileSync(resolve(inputPath), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseRuntimeEvent)
    .filter((event): event is RuntimeEvent => Boolean(event));

  const metrics = events.filter(
    (event) => event.scope === "generation-metrics" && event.event === "generation_metric"
  );
  const executions = metrics.filter((event) => event.phase === "execution");
  const submissions = metrics.filter((event) => event.phase === "submission");
  const uploads = events.filter(
    (event) =>
      (event.scope === "demo-upload" || event.scope === "signed-upload") &&
      event.event === "upload_end" &&
      typeof event.durationMs === "number"
  );
  const imageCalls = executions.reduce(
    (total, event) => total + numberValue(event.imageCallCount),
    0
  );
  const successful = executions.filter((event) => event.success === true).length;
  const failed = executions.filter((event) => event.success === false).length;
  const estimatedCostUsd = executions.reduce(
    (total, event) => total + numberValue(event.estimatedImageCostUsd),
    0
  );
  const byConfiguration: Record<string, { calls: number; success: number; failed: number; cost: number }> = {};
  const byUtcDay: Record<string, { calls: number; success: number; failed: number; cost: number }> = {};

  for (const event of executions) {
    const key = `${String(event.model ?? "unknown")} / ${String(event.quality ?? "unknown")}`;
    byConfiguration[key] ??= { calls: 0, success: 0, failed: 0, cost: 0 };
    byConfiguration[key].calls += numberValue(event.imageCallCount);
    byConfiguration[key].success += event.success === true ? 1 : 0;
    byConfiguration[key].failed += event.success === false ? 1 : 0;
    byConfiguration[key].cost += numberValue(event.estimatedImageCostUsd);
    const day = typeof event.timestamp === "string" ? event.timestamp.slice(0, 10) : "unknown";
    byUtcDay[day] ??= { calls: 0, success: 0, failed: 0, cost: 0 };
    byUtcDay[day].calls += numberValue(event.imageCallCount);
    byUtcDay[day].success += event.success === true ? 1 : 0;
    byUtcDay[day].failed += event.success === false ? 1 : 0;
    byUtcDay[day].cost += numberValue(event.estimatedImageCostUsd);
  }

  const report = {
    imageCalls,
    successfulGenerations: successful,
    failedGenerations: failed,
    completionRate: successful + failed ? Number((successful / (successful + failed)).toFixed(4)) : null,
    reusedSubmissions: submissions.filter((event) => event.reused === true).length,
    estimatedImageCostUsd: Number(estimatedCostUsd.toFixed(4)),
    averageDurationsMs: {
      upload: average(uploads.map((event) => numberValue(event.durationMs)).filter(Boolean)),
      submitToAccepted: average(
        submissions.map((event) => numberValue(event.submitToAcceptedDurationMs)).filter(Boolean)
      ),
      openai: average(
        executions.map((event) => numberValue(event.openaiGenerationDurationMs)).filter(Boolean)
      ),
      outputUpload: average(
        executions.map((event) => numberValue(event.outputUploadDurationMs)).filter(Boolean)
      ),
      total: average(
        executions.map((event) => numberValue(event.totalGenerationDurationMs)).filter(Boolean)
      ),
    },
    byConfiguration: Object.fromEntries(
      Object.entries(byConfiguration).map(([key, value]) => [
        key,
        { ...value, cost: Number(value.cost.toFixed(4)) },
      ])
    ),
    byUtcDay: Object.fromEntries(
      Object.entries(byUtcDay).map(([key, value]) => [
        key,
        { ...value, cost: Number(value.cost.toFixed(4)) },
      ])
    ),
    note: "Affiliate clicks and funnel events are read in Vercel Analytics > Events; they are not runtime-log records.",
  };

  console.log(JSON.stringify(report, null, 2));
}
