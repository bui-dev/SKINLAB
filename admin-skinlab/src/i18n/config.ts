export const locales = ["en", "vi"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function resolveLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const acceptsVietnamese = acceptLanguage
    .toLowerCase()
    .split(",")
    .some((language) => language.trim().startsWith("vi"));

  return acceptsVietnamese ? "vi" : defaultLocale;
}
