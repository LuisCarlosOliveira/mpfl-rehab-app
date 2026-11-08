/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The text "true" turns on patient mode. See src/lib/mode.ts. */
  readonly VITE_PATIENT_USE_APPROVED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
