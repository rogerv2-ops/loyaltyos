import { resolveCopy } from "./copy.js";

export interface ValidationIssueCopy {
  code: string;
  message?: string;
  type?: string;
  received?: unknown;
  expected?: unknown;
  validation?: unknown;
  minimum?: unknown;
  maximum?: unknown;
  inclusive?: boolean;
}

export function validationCopyKey(issue: ValidationIssueCopy): {
  key: string;
  params: Record<string, string | number>;
} {
  const params: Record<string, string | number> = {};
  let key = "invalid";
  if (issue.code === "invalid_type") {
    key =
      issue.received === "undefined"
        ? "required"
        : issue.expected === "integer"
          ? "integer"
          : issue.expected === "number"
            ? "number"
            : "invalid";
  } else if (issue.code === "too_small" || issue.code === "too_big") {
    const limit = issue.code === "too_small" ? issue.minimum : issue.maximum;
    if (typeof limit === "number" || typeof limit === "string") params.limit = limit;
    if (issue.type === "string") key = issue.code === "too_small" ? "minLength" : "maxLength";
    else if (issue.type === "array" || issue.type === "set")
      key = issue.code === "too_small" ? "minItems" : "maxItems";
    else if (issue.inclusive === false)
      key = issue.code === "too_small" ? "greaterThan" : "lessThan";
    else key = issue.code === "too_small" ? "min" : "max";
  } else if (issue.code === "invalid_string")
    key = issue.validation === "url" ? "url" : issue.validation === "email" ? "email" : "invalid";
  else if (issue.code === "invalid_enum_value") key = "option";
  else if (issue.code === "invalid_date") key = "date";
  return { key: `validation.${key}`, params };
}

export function localizedValidation(issue: ValidationIssueCopy, locale: string): string {
  const message = issue.message;
  if (
    message &&
    ["interface.", "validation.", "apiMessages."].some((prefix) => message.startsWith(prefix))
  )
    return resolveCopy(message, locale);
  const { key, params } = validationCopyKey(issue);
  return resolveCopy(key, locale, params);
}
