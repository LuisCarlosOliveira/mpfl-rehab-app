import './zodConfig';
import { createRoot } from 'react-dom/client';
import { appMode } from './lib/mode';
import { cameraSource } from './pose/source';
import { createDb } from './lib/storage';
import { App } from './ui/App';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(
  <App db={createDb()} mode={appMode(import.meta.env.VITE_PATIENT_USE_APPROVED)} source={cameraSource()} />,
);
