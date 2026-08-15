export type AppBuildInfo={commit:string;dirty:boolean;basePath:string;publicBaseUrl:string};

const basePath=import.meta.env.BASE_URL;
export const appBuildInfo:AppBuildInfo={
  commit:__APP_BUILD_COMMIT__,
  dirty:__APP_BUILD_DIRTY__,
  basePath,
  publicBaseUrl:"https://bonnginn.github.io/brain-practical-navi/",
};

export const validBuildCommit=(value:string)=>/^[0-9a-f]{40}$/i.test(value);
export const currentAppBaseUrl=()=>new URL(basePath,location.origin).href;
