import { appMode, bannersFor } from '../lib/mode';

export const liveBanners = (): readonly string[] => bannersFor(appMode(import.meta.env.VITE_PATIENT_USE_APPROVED), false);
