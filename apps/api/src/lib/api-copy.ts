import { resolveCopy, resolveLocale } from "@loyaltyos/i18n";
import type { FastifyRequest } from "fastify";

/** Presentation only: preserve callers' response codes, status and fields. */
export function apiCopy(
  request: Pick<FastifyRequest, "headers">,
  key: string,
  params?: Record<string, string | number>,
): string {
  return resolveCopy(
    key,
    resolveLocale({ acceptLanguage: request.headers["accept-language"] }),
    params,
  );
}
