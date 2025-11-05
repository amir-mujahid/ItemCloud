// vite.env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_EMAILJS_SERVICE_ID: string;
  readonly VITE_EMAILJS_TEMPLATE_ID: string;
  readonly VITE_EMAILJS_UNLOCK_TEMPLATE_ID: string;
  readonly VITE_EMAILJS_PUBLIC_KEY: string;
  
  readonly VITE_APP_URL_MAIN: string
  readonly VITE_APP_URL_ALT: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
