import { validationCopyKey } from "@loyaltyos/i18n";
import { format } from "date-fns";
import { enUS as englishDates, es as spanishDates } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import i18n from "../i18n";

// UI keys are semantic paths in the shared catalogs. No source-text lookup.
// Store semantic validation tokens; render with the current locale even after switching.
const validationTokens = new Map<string, ReturnType<typeof validationCopyKey>>();
z.setErrorMap((issue) => {
  const copy = validationCopyKey(issue);
  const token = "@validation:" + JSON.stringify(copy);
  validationTokens.set(token, copy);
  return { message: token };
});

export function translateUi(
  key: string | undefined | null,
  params: Record<string, string | number> = {},
): string {
  if (key == null) return "";
  const token = validationTokens.get(key);
  if (token) return i18n.t(token.key, token.params);
  // Never parse text supplied by an error, API response or user as JSON.
  if (key.startsWith("@validation:")) return key;
  if (
    !key.startsWith("interface.") &&
    !key.startsWith("validation.") &&
    !key.startsWith("common.") &&
    !key.startsWith("aiUi.")
  )
    return key;
  return i18n.t(key, params);
}

export function useUiText(): typeof translateUi {
  useTranslation();
  return translateUi;
}

export function translateEnum(value: string): string {
  return i18n.t(`displayEnums.${value}`, {
    defaultValue: `${i18n.t("common.unknown")} (${value})`,
  });
}

export function formatUiDate(date: Date, pattern: string): string {
  return format(date, pattern, {
    locale: i18n.language.startsWith("es") ? spanishDates : englishDates,
  });
}

/** Only audited built-in labels are translation keys. All other values stay literal. */
export function translateLabel(labels: Record<string, string>, value: string): string {
  return Object.hasOwn(labels, value) ? translateUi(labels[value]) : value;
}
