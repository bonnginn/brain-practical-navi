export function localeFromSearch(search) {
  return new URLSearchParams(search).get("lang") === "en" ? "en" : "ja";
}

export function languageSwitchUrl(href, locale) {
  const url = new URL(href);
  if (locale === "en") url.searchParams.set("lang", "en");
  else url.searchParams.delete("lang");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function publicWorkspaceForLocale(workspace, locale) {
  return locale === "en" && (workspace === "collaborate" || workspace === "segment") ? "home" : workspace;
}

export function localizedPublicUrl(baseUrl, ui, locale) {
  const url = new URL(baseUrl);
  url.searchParams.set("ui", ui);
  if (locale === "en") url.searchParams.set("lang", "en");
  return `${url.toString()}#workspace/home`;
}
