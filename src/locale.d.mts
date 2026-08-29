export type AppLocale = "ja" | "en";
export function localeFromSearch(search:string):AppLocale;
export function languageSwitchUrl(href:string,locale:AppLocale):string;
export function publicWorkspaceForLocale<T extends string>(workspace:T,locale:AppLocale):T|"home";
export function localizedPublicUrl(baseUrl:string,ui:"desktop"|"phone",locale:AppLocale):string;
