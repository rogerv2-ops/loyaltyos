export { changeLanguage, enUS, esMX, getCurrentLanguage, initCatalog, t } from "./catalog.js";
export { resolveCopy } from "./copy.js";
export type { SupportedLocale } from "./detect.js";
export { DEFAULT_LOCALE, getSupportedLocales, isSupportedLocale, resolveLocale } from "./detect.js";
export {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPoints,
  formatRelativeDate,
} from "./format.js";
export type { TFunction, TranslationKey } from "./types.js";
export { localizedValidation, validationCopyKey } from "./validation-copy.js";
