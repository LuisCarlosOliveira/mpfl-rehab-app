// The notices of the live screens. The shell of the app passes the full list (prototype, example, not approved).
// A live screen that gets none shows the notices of the build mode, so the prototype banner is never missing.
import { appMode, bannersFor } from '../lib/mode';

export const liveBanners = (): readonly string[] => bannersFor(appMode(import.meta.env.VITE_PATIENT_USE_APPROVED), false);
