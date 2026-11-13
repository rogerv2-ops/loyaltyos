import { describe, expect, it } from "vitest";
import { z } from "zod";

import { wizardSchema } from "../../../lib/giftcard-batch-schema";

type WizardData = z.infer<typeof wizardSchema>;

function makeValid(): WizardData {
  return {
    name: "Test Batch",
    prefix: "TEST",
    quantity: 100,
    initialAmount: 500,
    currency: "MXN",
    expirationDate: new Date(Date.now() + 86400000),
    termsTemplateId: "tpl_123",
  };
}

describe("BatchWizard schema", () => {
  it("uses the actual page schema's semantic amount validation", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), initialAmount: 0 });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.find((issue) => issue.path[0] === "initialAmount")?.message).toBe(
        "interface.amountMustBeGreaterThan0",
      );
  });

  it("accepts a valid payload", () => {
    const result = wizardSchema.safeParse(makeValid());
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 200 chars", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), name: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects quantity of 0", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects quantity over 1M", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), quantity: 1_000_001 });
    expect(result.success).toBe(false);
  });

  it("rejects negative initial amount", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), initialAmount: -10 });
    expect(result.success).toBe(false);
  });

  it("rejects zero initial amount", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), initialAmount: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts empty prefix (converts to empty string)", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), prefix: "" });
    expect(result.success).toBe(true);
  });

  it("accepts undefined prefix", () => {
    const { prefix: _, ...rest } = makeValid();
    const result = wizardSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects lowercase prefix", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), prefix: "abc" });
    expect(result.success).toBe(false);
  });

  it("accepts uppercase alphanumeric prefix", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), prefix: "HOLIDAY" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid currency length", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), currency: "US" });
    expect(result.success).toBe(false);
  });

  it("rejects empty termsTemplateId", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), termsTemplateId: "" });
    expect(result.success).toBe(false);
  });

  it("defaults currency to MXN when omitted", () => {
    const { currency: _, ...rest } = makeValid();
    const result = wizardSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("MXN");
    }
  });

  it("coerces string quantity to number", () => {
    const result = wizardSchema.safeParse({ ...makeValid(), quantity: "500" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(500);
    }
  });
});
