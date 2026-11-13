import enUS from "./locales/en-US.json" with { type: "json" };
import esMX from "./locales/es-MX.json" with { type: "json" };

/** Stateless catalog lookup: requests never change another request's locale. */
export function resolveCopy(
  key: string,
  locale: string,
  params: Record<string, string | number> = {},
): string {
  let value: unknown = locale.startsWith("en") ? enUS : esMX;
  for (const part of key.split(".")) {
    if (typeof value !== "object" || value === null || !Object.hasOwn(value, part)) return key;
    value = (value as Record<string, unknown>)[part];
  }
  if (typeof value !== "string") return key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(params[name] ?? `{{${name}}}`),
  );
}
