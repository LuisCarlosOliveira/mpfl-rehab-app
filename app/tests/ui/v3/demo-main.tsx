import { createRoot } from 'react-dom/client';
import '../../../src/ui/styles.css';
import { AppDemo, LiveDemo, type DemoData } from './Demo';

const q = new URLSearchParams(location.search);
const data: DemoData = q.get('data') === 'worst' ? 'worst' : 'base';
createRoot(document.getElementById('root')!).render(q.get('view') === 'live' ? <LiveDemo data={data} /> : <AppDemo data={data} />);
