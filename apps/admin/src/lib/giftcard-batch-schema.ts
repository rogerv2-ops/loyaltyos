import { z } from "zod";

export const wizardSchema = z.object({
  name: z.string().min(1, "interface.nameIsRequired").max(200),
  prefix: z
    .string()
    .max(8)
    .regex(/^[A-Z0-9]*$/, "interface.onlyUppercaseLettersAndNumbers")
    .optional()
    .or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  initialAmount: z.coerce.number().positive("interface.amountMustBeGreaterThan0"),
  currency: z.string().length(3).default("MXN"),
  expirationDate: z.date().optional(),
  termsTemplateId: z.string().min(1, "interface.selectATermsTemplate"),
});
