import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { resolveLocale } from "@/i18n/config";

const messageLoaders = {
  en: () => import("@/messages/en.json"),
  vi: () => import("@/messages/vi.json"),
};

export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("accept-language"));
  const messages = (await messageLoaders[locale]()).default;

  return { locale, messages };
});
