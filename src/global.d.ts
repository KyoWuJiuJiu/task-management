declare interface JQuery {
  localize(): () => any;
}

declare module 'jquery-i18next' {
  export function init( ...args: any[] ): any;
}

interface ImportMetaEnv {
  readonly VITE_TASK_SYNC_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
