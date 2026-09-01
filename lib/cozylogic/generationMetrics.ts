import {
  estimateImageCostUsd,
  type ImageTokenUsage,
} from "@/lib/cozylogic/imageUsage";
import { logServerEvent } from "@/lib/cozylogic/serverLog";

type Audience = "guest" | "authenticated";

export function logGenerationSubmissionMetric(args: {
  audience: Audience;
  budgetTier: string;
  requestId: string;
  reused: boolean;
  submitToAcceptedDurationMs: number;
}) {
  logServerEvent("generation-metrics", "generation_metric", {
    phase: "submission",
    audience: args.audience,
    budgetTier: args.budgetTier,
    requestId: args.requestId,
    reused: args.reused,
    submitToAcceptedDurationMs: args.submitToAcceptedDurationMs,
    imageCallCount: 0,
  });
}

export async function recordGenerationExecutionMetric(args: {
  audience: Audience;
  budgetTier: string;
  requestId: string;
  model: string;
  quality: string;
  size: string;
  success: boolean;
  failureStage: string | null;
  imageCallCount: 0 | 1;
  submitToAcceptedDurationMs: number;
  openaiGenerationDurationMs: number | null;
  outputUploadDurationMs: number | null;
  totalGenerationDurationMs: number;
  usage: ImageTokenUsage | null;
}) {
  logServerEvent("generation-metrics", "generation_metric", {
    phase: "execution",
    audience: args.audience,
    budgetTier: args.budgetTier,
    requestId: args.requestId,
    model: args.model,
    quality: args.quality,
    size: args.size,
    success: args.success,
    failureStage: args.failureStage,
    reused: false,
    imageCallCount: args.imageCallCount,
    submitToAcceptedDurationMs: args.submitToAcceptedDurationMs,
    openaiGenerationDurationMs: args.openaiGenerationDurationMs,
    outputUploadDurationMs: args.outputUploadDurationMs,
    totalGenerationDurationMs: args.totalGenerationDurationMs,
    estimatedImageCostUsd: estimateImageCostUsd(args.model, args.usage),
    usage: args.usage,
  });
}
