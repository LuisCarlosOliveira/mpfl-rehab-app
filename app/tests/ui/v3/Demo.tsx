import { useState } from 'react';
import { AppShell, type ShellTab } from '../../../src/ui/v3/AppShell';
import { BigNumber } from '../../../src/ui/v3/BigNumber';
import { Chip } from '../../../src/ui/v3/Chip';
import { ExerciseHeader } from '../../../src/ui/v3/ExerciseHeader';
import { LiveShell } from '../../../src/ui/v3/LiveShell';
import { PlanList } from '../../../src/ui/v3/PlanList';
import { RadioList } from '../../../src/ui/v3/RadioList';
import { SegmentedChoice } from '../../../src/ui/v3/SegmentedChoice';
import { SessionProgress } from '../../../src/ui/v3/SessionProgress';

export type DemoData = 'base' | 'worst';
export type DemoView = 'app' | 'live';

export const BANNER = 'Prototype. Not for patient use.';

const BASE = {
  name: 'Straight leg raise',
  plan: ['Straight leg raise', 'Heel slide', 'Quadriceps set', 'Gluteal set', 'Calf raise', 'Hip abduction'].map((name, i) => ({ id: `e${i + 1}`, name, dose: '2 sets of 10' })),
  current: 'e3',
  angle: 64,
  reps: 7,
  swelling: ['Less than before', 'Same as before', 'More than before'],
  time: ['Under 4 weeks', '4 to 8 weeks', '8 to 12 weeks', 'More than 12 weeks'],
};

const WORST = {
  name: 'Gesäßmuskelanspannung im Liegen, heutige Trainingseinheit',
  plan: [
    'Gesäßmuskelanspannung im Liegen, heutige Trainingseinheit',
    'Fersengleiten mit Handtuch unter dem Fuß',
    'Oberschenkelmuskel anspannen, Knie durchdrücken',
    'Beinheben im Liegen mit gestrecktem Knie',
    'Wadenheben im Stehen, beidbeinig',
    'Hüftabduktion in Seitenlage',
    'Hüftstreckung in Bauchlage',
    'Einbeinstand mit Augen offen',
    'Mini-Kniebeuge mit Stuhl',
    'Treppensteigen, eine Stufe',
    'Gehen auf der Stelle',
    'Dehnung der Oberschenkelrückseite',
  ].map((name, i) => ({ id: `e${i + 1}`, name, dose: i % 2 ? '2 Sätze à 10 Wiederholungen, 3 Sekunden halten' : '3 Sätze à 12 Wiederholungen' })),
  current: 'e11',
  angle: 128,
  reps: 128,
  swelling: ['Weniger geschwollen als vorher', 'Gleich geschwollen wie vorher', 'Mehr als vorher geschwollen'],
  time: ['Weniger als vier Wochen seit der Operation', 'Vier bis acht Wochen seit der Operation', 'Acht bis zwölf Wochen seit der Operation', 'Mehr als zwölf Wochen seit der Operation'],
};

const pick = (data: DemoData) => (data === 'worst' ? WORST : BASE);
const opts = (labels: string[]) => labels.map((label, i) => ({ value: String(i), label }));

export function AppDemo({ data, tab = 'today' }: { data: DemoData; tab?: ShellTab }) {
  const d = pick(data);
  const [leg, setLeg] = useState<string | null>('0');
  const [side, setSide] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>('1');
  const [t, setT] = useState<ShellTab>(tab);
  const at = d.plan.findIndex((p) => p.id === d.current) + 1;
  return (
    <AppShell tab={t} onNavigate={setT} banner={BANNER}>
      <AppShell.Main>
        <ExerciseHeader eyebrow="Phase 1, week 2" name={d.name}>
          <SessionProgress unit="Exercise" total={d.plan.length} current={at} set={{ current: 1, total: 2 }} />
        </ExerciseHeader>
        <AppShell.Columns>
          <div>
            <PlanList items={d.plan} currentId={d.current}>
              <button type="button" className="demo-btn">
                Start {d.plan[at - 1]?.name}
              </button>
            </PlanList>
          </div>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <BigNumber label="Knee angle" value={d.angle} unit="degrees" tone="primary" note="estimated angle, not a medical measurement" />
            <BigNumber label="Knee angle" value={null} unit="degrees" missingReason="Ankle not seen" note="estimated angle, not a medical measurement" />
            <SegmentedChoice name="leg" legend="Which leg is operated?" value={leg} onChange={setLeg} options={[{ value: '0', label: 'Left' }, { value: '1', label: 'Right' }]} />
            <SegmentedChoice name="swell" legend="Swelling today" value={side} onChange={setSide} options={opts(d.swelling)} />
            <RadioList name="time" legend="Time since your surgery" value={time} onChange={setTime} options={opts(d.time)}>
              <p>Ask your surgeon if you are not sure.</p>
            </RadioList>
          </div>
        </AppShell.Columns>
      </AppShell.Main>
      <AppShell.Actions label="Session actions">
        <button type="button" className="demo-btn demo-primary">
          Start session, nothing new today
        </button>
      </AppShell.Actions>
    </AppShell>
  );
}

export function LiveDemo({ data }: { data: DemoData }) {
  const d = pick(data);
  const at = d.plan.findIndex((p) => p.id === d.current) + 1;
  return (
    <LiveShell banner={BANNER}>
      <LiveShell.Header>
        <ExerciseHeader eyebrow="Straight leg raise, left leg" name={d.name}>
          <SessionProgress unit="Exercise" total={d.plan.length} current={at} set={{ current: 1, total: 2 }} />
        </ExerciseHeader>
      </LiveShell.Header>
      <LiveShell.Camera label="Camera view">
        <Chip>Drawn placeholder, not a camera image</Chip>
      </LiveShell.Camera>
      <LiveShell.Panel>
        <BigNumber label="Reps" value={d.reps} unit="reps" tone="primary" />
        <BigNumber label="Knee angle" value={d.angle} unit="degrees" note="estimated angle, not a medical measurement" />
        <button type="button" className="demo-btn demo-primary">
          Stop
        </button>
        <button type="button" className="demo-btn">
          Knee gave way or hurts
        </button>
      </LiveShell.Panel>
    </LiveShell>
  );
}
