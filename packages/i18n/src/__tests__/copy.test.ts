import { describe, expect, it } from "vitest";

import { resolveCopy } from "../copy.js";
import enUS from "../locales/en-US.json" with { type: "json" };
import esMX from "../locales/es-MX.json" with { type: "json" };
import { localizedValidation } from "../validation-copy.js";

const families = {
  "giftcards.status": [
    "pending",
    "generating",
    "ready",
    "partial",
    "failed",
    "cancelled",
    "active",
    "partially_redeemed",
    "depleted",
    "expired",
  ],
  "giftcards.wizard": ["step1", "step2", "step3", "step4"],
  "portal.transactionTypes": ["EARN", "REDEEM", "ADJUST", "REVERSE", "EXPIRE"],
  displayEnums: [
    "EMAIL",
    "SMS",
    "PUSH",
    "IN_APP",
    "WEBHOOK",
    "SUPER_ADMIN",
    "OPERATOR",
    "ANALYST",
    "PENDING",
    "CONFIRMED",
    "FAILED",
    "REVERSED",
    "DYNAMIC",
    "STATIC",
    "EARN",
    "REDEEM",
    "ADJUST",
    "REVERSE",
    "EXPIRE",
    "activate",
    "redeem",
    "refund",
    "cancel",
    "expire",
  ],
};

describe("semantic copy and dynamic label coverage", () => {
  it("keeps missing copy keys literal without traversing prototypes", () => {
    for (const key of ["missing.key", "__proto__", "constructor", "errors.constructor"])
      expect(resolveCopy(key, "es-MX")).toBe(key);
  });

  it.each(["es-MX", "en-US"])("covers all audited dynamic families in %s", (locale) => {
    for (const [prefix, values] of Object.entries(families))
      for (const value of values) {
        const key = `${prefix}.${value}`;
        expect(resolveCopy(key, locale)).not.toBe(key);
      }
  });

  it("keeps interpolation placeholders equal across languages", () => {
    function flatten(value: unknown, prefix = ""): Record<string, string> {
      if (typeof value === "string") return { [prefix]: value };
      if (typeof value !== "object" || value === null) return {};
      return Object.assign(
        {},
        ...Object.entries(value).map(([key, child]) =>
          flatten(child, prefix ? `${prefix}.${key}` : key),
        ),
      ) as Record<string, string>;
    }
    const es = flatten(esMX),
      en = flatten(enUS);
    for (const [key, value] of Object.entries(es))
      expect((value.match(/\{\{\w+\}\}/g) ?? []).sort(), key).toEqual(
        (en[key]?.match(/\{\{\w+\}\}/g) ?? []).sort(),
      );
  });

  it.each([
    [{ code: "invalid_type", received: "undefined" }, "Este campo es obligatorio"],
    [
      { code: "too_small", minimum: 1, inclusive: true, type: "number" },
      "Debe ser mayor o igual que 1",
    ],
    [{ code: "too_big", maximum: 10, type: "string" }, "Debe tener como máximo 10 caracteres"],
    [{ code: "invalid_string", validation: "url" }, "Debe ser una URL válida"],
    [{ code: "invalid_enum_value" }, "Selecciona una opción válida"],
    [{ code: "too_small", minimum: 5, inclusive: false, type: "number" }, "Debe ser mayor que 5"],
    [{ code: "too_big", maximum: 3, inclusive: false, type: "number" }, "Debe ser menor que 3"],
    [{ code: "too_small", minimum: 2, type: "array" }, "Debe tener al menos 2 elementos"],
  ])("localizes validation %j without changing its bounds", (issue, expected) => {
    expect(localizedValidation(issue, "es-MX")).toBe(expected);
    expect(localizedValidation(issue, "en-US")).not.toBe(expected);
  });
});
