// The app shell. It holds the stored protocol and the navigation state (appState.ts).
// Banners show above every screen (plan FR3, NFR2).
import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { bannersFor } from '../lib/mode';
import { createProtocolStore, type Mode, type Protocol } from '../lib/protocol';
import { hasSeenPrivacyNotice, loadStoredProtocol, type MpflDb, type SessionRecord } from '../lib/storage';
import type { LandmarkSource } from '../pose/source';
import { appReducer, initialAppState } from './appState';
import { Banners } from './Banners';
import { Home } from './Home';
import { EXERCISE_NAMES } from './labels';
import { LoadProtocol } from './LoadProtocol';
import { Privacy } from './Privacy';
import { createSound, type Sound } from './sound';
import { RedFlag } from './RedFlag';
import { Session } from './Session';
import { Setup } from './Setup';
import { Summary } from './Summary';

// These three screens pull in Recharts. They load when the patient opens them, so Home stays small.
const Dashboard = lazy(() => import('./Dashboard').then((m) => ({ default: m.Dashboard })));
const DataScreen = lazy(() => import('./DataScreen').then((m) => ({ default: m.DataScreen })));
const ClinicianView = lazy(() => import('./ClinicianView').then((m) => ({ default: m.ClinicianView })));

/** Moves the focus to the heading when a lazy screen appears. The shell cannot do it while the screen still loads. */
function FocusHeading({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, []);
  return children;
}

type Rows = { state: 'loading' } | { state: 'error' } | { state: 'ready'; sessions: SessionRecord[] };

/** Reads the sessions in the parent, so the dashboard stays a pure view (plan FR13). */
function Progress({ db, onBack }: { db: MpflDb; onBack: () => void }) {
  const [rows, setRows] = useState<Rows>({ state: 'loading' });
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => db.sessions.orderBy('date').toArray())
      .then(
        (sessions) => alive && setRows({ state: 'ready', sessions }),
        () => alive && setRows({ state: 'error' }),
      );
    return () => {
      alive = false;
    };
  }, [db]);

  if (rows.state === 'loading') return <h1>Loading</h1>;
  if (rows.state === 'error') {
    return (
      <FocusHeading>
        <section aria-labelledby="progress-error-title">
          <h1 id="progress-error-title" tabIndex={-1}>
            Progress
          </h1>
          <p role="alert">Your sessions could not be read. Go back and try again.</p>
          <div className="actions">
            <button type="button" className="btn" onClick={onBack}>
              Back
            </button>
          </div>
        </section>
      </FocusHeading>
    );
  }
  return (
    <FocusHeading>
      <Dashboard sessions={rows.sessions} onBack={onBack} />
    </FocusHeading>
  );
}

export interface AppProps {
  db: MpflDb;
  mode: Mode;
  source: LandmarkSource;
  /** The clock. Tests replace it. */
  now?: () => Date;
  /** The sound cues. The app makes one. Tests give one over a fake audio context. */
  sound?: Sound;
}

type Boot = { ready: false } | { ready: true; protocol: Protocol | null; error: { title: string; message: string } | null };

export function App({ db, mode, source, now = () => new Date(), sound }: AppProps) {
  const [soundInUse] = useState(() => sound ?? createSound());
  const [boot, setBoot] = useState<Boot>({ ready: false });

  useEffect(() => {
    let alive = true;
    const ready = (protocol: Protocol | null, error: { title: string; message: string } | null) => {
      if (alive) setBoot({ ready: true, protocol, error });
    };
    loadStoredProtocol(db, mode).then(
      (result) => {
        if (result === null) ready(null, null);
        else if (result.ok) ready(result.protocol, null);
        else ready(null, { title: 'Stored file refused', message: result.error.message });
      },
      () => ready(null, { title: 'Stored file not read', message: 'The stored protocol could not be read. Pick the file again.' }),
    );
    return () => {
      alive = false;
    };
  }, [db, mode]);

  if (!boot.ready) {
    return (
      <div className="app">
        <Banners texts={bannersFor(mode, false)} />
        <main>
          <h1>Loading</h1>
        </main>
      </div>
    );
  }
  return <Shell db={db} mode={mode} source={source} now={now} sound={soundInUse} protocol={boot.protocol} bootError={boot.error} />;
}

interface ShellProps extends Required<AppProps> {
  protocol: Protocol | null;
  bootError: { title: string; message: string } | null;
}

function Shell({ db, mode, source, now, sound, protocol: storedProtocol, bootError: storedError }: ShellProps) {
  const [protocol, setProtocol] = useState(storedProtocol);
  const [bootError, setBootError] = useState(storedError);
  const [state, dispatch] = useReducer(
    appReducer,
    { seenPrivacy: hasSeenPrivacyNotice(), hasProtocol: storedProtocol !== null, mode },
    initialAppState,
  );

  // The only source of the active phase is the read-only store (FR4).
  const store = useMemo(() => (protocol ? createProtocolStore(protocol) : null), [protocol]);
  const phase = protocol && store ? protocol.phases.find((p) => p.id === store.activePhase) : undefined;
  const exercise = phase?.exercises.find((e) => e.kind === state.exercise);

  // Move focus to the heading when the screen changes, so a screen reader announces it.
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [state.screen]);

  const banners = bannersFor(mode, protocol?.example === true);

  const screen = (() => {
    switch (state.screen) {
      case 'privacy':
        return <Privacy onDone={() => dispatch({ type: 'privacy-seen' })} />;
      case 'home':
        if (protocol && store) {
          return (
            <Home
              protocol={protocol}
              phase={phase}
              activePhase={store.activePhase}
              db={db}
              now={now}
              onStart={(kind) => dispatch({ type: 'choose-exercise', exercise: kind })}
              onOpenPrivacy={() => dispatch({ type: 'open', screen: 'privacy' })}
              onLoadProtocol={() => dispatch({ type: 'open', screen: 'load' })}
              onOpenProgress={() => dispatch({ type: 'open', screen: 'dashboard' })}
              onOpenData={() => dispatch({ type: 'open', screen: 'data' })}
            />
          );
        }
        break;
      case 'redflag':
        return (
          <RedFlag
            onClear={() => dispatch({ type: 'red-flags-clear' })}
            onBlocked={() => dispatch({ type: 'red-flags-blocked' })}
            onCancel={() => dispatch({ type: 'open', screen: 'home' })}
          />
        );
      case 'setup':
        if (exercise && protocol) {
          return (
            <Setup
              kind={exercise.kind}
              side={protocol.side}
              exerciseName={EXERCISE_NAMES[exercise.kind]}
              limit={exercise.maxFlexion}
              source={source}
              sound={sound}
              onReady={() => dispatch({ type: 'open', screen: 'session' })}
              onCancel={() => dispatch({ type: 'open', screen: 'home' })}
            />
          );
        }
        break;
      case 'session':
        if (exercise && protocol) {
          return (
            <Session
              exercise={exercise}
              side={protocol.side}
              source={source}
              sound={sound}
              onEnd={(reason, summary) => dispatch({ type: 'session-end', reason, summary })}
            />
          );
        }
        break;
      case 'summary':
        if (exercise && protocol && store && state.run) {
          return (
            <Summary
              run={state.run}
              exercise={exercise}
              protocol={protocol}
              activePhase={store.activePhase}
              redFlagBlocks={state.redFlagBlocks}
              db={db}
              now={now}
              onDone={() => dispatch({ type: 'finish' })}
            />
          );
        }
        break;
      case 'dashboard':
        return <Progress db={db} onBack={() => dispatch({ type: 'open', screen: 'home' })} />;
      case 'data':
        return (
          <FocusHeading key="data">
            <DataScreen
              db={db}
              onBack={() => dispatch({ type: 'open', screen: 'home' })}
              onErased={() => {
                // Nothing of the old protocol stays in memory.
                setProtocol(null);
                setBootError(null);
                dispatch({ type: 'erased' });
              }}
              onOpenClinician={mode === 'demo' ? () => dispatch({ type: 'open', screen: 'clinician' }) : undefined}
            />
          </FocusHeading>
        );
      case 'clinician':
        return (
          <FocusHeading key="clinician">
            <ClinicianView mode={mode} now={now} onBack={() => dispatch({ type: 'open', screen: 'data' })} />
          </FocusHeading>
        );
    }
    return (
      <LoadProtocol
        db={db}
        mode={mode}
        initialError={bootError}
        onCancel={protocol ? () => dispatch({ type: 'open', screen: 'home' }) : undefined}
        onLoaded={() => {
          void loadStoredProtocol(db, mode).then((result) => {
            if (result?.ok) {
              setProtocol(result.protocol);
              dispatch({ type: 'protocol-loaded' });
            }
          });
        }}
      />
    );
  })();

  return (
    <div className="app">
      <Banners texts={banners} />
      <main ref={main}>
        <Suspense fallback={<h1>Loading</h1>}>{screen}</Suspense>
      </main>
    </div>
  );
}
