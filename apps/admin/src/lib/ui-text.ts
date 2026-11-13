import { validationCopyKey } from "@loyaltyos/i18n";
import { format } from "date-fns";
import { enUS as englishDates, es as spanishDates } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import i18n from "../i18n";

// UI keys are semantic paths in the shared catalogs. No source-text lookup.
// Store semantic validation tokens; render with the current locale even after switching.
z.setErrorMap((issue) => ({ message: "@validation:" + JSON.stringify(validationCopyKey(issue)) }));

export function translateUi(
  key: string | undefined | null,
  params: Record<string, string | number> = {},
): string {
  if (key == null) return "";
  if (key.startsWith("@validation:")) {
    const token = JSON.parse(key.slice(12)) as {
      key: string;
      params: Record<string, string | number>;
    };
    return i18n.t(token.key, token.params);
  }
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
  return i18n.t(`displayEnums.${value}`, { defaultValue: i18n.t("common.unknown") });
}

export function formatUiDate(date: Date, pattern: string): string {
  return format(date, pattern, {
    locale: i18n.language.startsWith("es") ? spanishDates : englishDates,
  });
}
