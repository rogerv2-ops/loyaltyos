import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiCopy } from "../lib/api-copy.js";
import { localizedEligibilityReason } from "../lib/eligibility-copy.js";
import { adminProgramsRoutes } from "../routes/admin/programs.js";

vi.mock("../db.js", () => ({
  prisma: { program: { findUnique: vi.fn().mockResolvedValue(null) } },
}));

describe("localized API copy preserves response contract", () => {
  it.each([
    ["es-MX", "Programa no encontrado"],
    ["en-US", "Program not found"],
  ])("localizes actual direct program reply for %s", async (locale, expected) => {
    const app = Fastify();
    app.addHook("preHandler", (request, _reply, done) => {
      request.programId = "program-a";
      done();
    });
    app.register(adminProgramsRoutes, { prefix: "/api/v1" });
    const result = await app.inject({
      method: "GET",
      url: "/api/v1/admin/programs/program-b",
      headers: { "accept-language": locale },
    });
    expect(result.statusCode).toBe(404);
    expect(result.json()).toEqual({ error: { code: "NOT_FOUND", message: expected } });
    await app.close();
  });

  it("does not mix locales across concurrent requests", async () => {
    const request = (language: string) => ({ headers: { "accept-language": language } });
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        Promise.resolve(
          apiCopy(request(index % 2 ? "es-MX" : "en-US"), "apiMessages.rewardNotFound"),
        ),
      ),
    );
    expect(results.filter((x) => x === "Recompensa no encontrada")).toHaveLength(10);
    expect(results.filter((x) => x === "Reward not found")).toHaveLength(10);
  });

  it.each([
    ["RewardNotFoundError", "Recompensa no encontrada"],
    ["RewardNotActiveError", "Recompensa no activa"],
    ["RewardOutOfStockError", "Recompensa agotada"],
    ["RewardTierInsufficientError", "Nivel insuficiente para recompensa"],
    ["RewardInsufficientPointsError", "Puntos insuficientes para recompensa"],
  ])("localizes eligibility %s without returning raw exception text", (name, expected) => {
    const error = new Error("private diagnostic with member data");
    error.name = name;
    expect(localizedEligibilityReason({ headers: { "accept-language": "es-MX" } }, error)).toBe(
      expected,
    );
  });

  it("uses a safe fallback for unknown eligibility exceptions", () => {
    expect(localizedEligibilityReason({ headers: {} }, new Error("sensitive"))).toBe(
      "Error en la solicitud",
    );
  });
});
afterEach(() => {
  vi.clearAllMocks();
});
