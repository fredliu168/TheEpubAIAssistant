/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_ALIBABA_CLOUD_ACCESS_KEY_ID: string;
    readonly VITE_ALIBABA_CLOUD_ACCESS_KEY_SECRET: string;
    readonly VITE_ALIBABA_CLOUD_SIGN_NAME: string;
    readonly VITE_ALIBABA_CLOUD_TEMPLATE_CODE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
