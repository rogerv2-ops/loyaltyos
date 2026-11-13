import { RewardInsufficientPointsError, RewardTierInsufficientError } from "@loyaltyos/rewards";
import type { FastifyRequest } from "fastify";

import { apiCopy } from "./api-copy.js";

// Domain error identity selects presentation only. No eligibility decisions change.
const REASON_KEYS: Record<string, string> = {
  RewardNotFoundError: "errors.REWARD_NOT_FOUND",
  RewardNotActiveError: "errors.REWARD_NOT_ACTIVE",
  RewardOutOfStockError: "errors.REWARD_OUT_OF_STOCK",
  RewardTierInsufficientError: "errors.REWARD_TIER_INSUFFICIENT",
  RewardInsufficientPointsError: "errors.REWARD_INSUFFICIENT_POINTS",
};
export function localizedEligibilityReason(
  request: Pick<FastifyRequest, "headers">,
  error: unknown,
): string {
  if (error instanceof RewardTierInsufficientError)
    return apiCopy(request, "eligibility.tierRequired", {
      required: error.required,
      current: error.current,
    });
  if (error instanceof RewardInsufficientPointsError)
    return apiCopy(request, "eligibility.pointsRequired", {
      required: error.required,
      current: error.current,
    });
  const name = error instanceof Error ? error.name : "";
  return apiCopy(request, REASON_KEYS[name] ?? "errors.REQUEST_ERROR");
}
