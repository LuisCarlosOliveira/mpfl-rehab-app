// The app shell. It holds the stored protocol and the navigation state (appState.ts).
// Banners show above every screen (plan FR3, NFR2).
import { Suspense, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { bannersFor } from '../lib/mode';
import { localIsoDate } from '../lib/planView';
import { createProtocolStore, type Mode, type Protocol } from '../lib/protocol';
import { usesCamera } from '../lib/monitor/engine';
import { isMonitored } from '../lib/monitor/monitored';
import { keepsCamera } from '../lib/sessionPlan';
import { plural } from '../lib/sets';
import { selfProgressionOn } from '../lib/protocol/accept';
import { getGuideSeen, getLegPrefs, hasSeenPrivacyNotice, loadStoredProtocol, markGuideSeen, readValidRows, saveSession, setLegPrefs, type MpflDb, type SessionRecord } from '../lib/storage';
import { usePairing } from '../pairing/usePairing';
import type { LinkDeps } from '../pairing/rtcLink';
import type { LandmarkSource } from '../pose/source';
import { appReducer, backStep, initialAppState } from './appState';
import type { ScreenId } from '../lib/flow';
import { CompanionEntry } from './CompanionEntry';
import { focusHeading } from './focusHeading';
import { Home } from './Home';
import { planItems } from './Home';
import { EXERCISE_NAMES } from './labels';
import { LoadError, retryableLazy } from './LoadError';
import { LoadProtocol } from './LoadProtocol';
import { Notice } from './Notice';
import { Privacy } from './Privacy';
import { createSound, type Sound } from './sound';
import { runToSessionInput } from './sessionRecord';
import { Referral } from './Referral';
import { RedFlag } from './RedFlag';
import { LoadingScreen } from './Shell';
import { AppShell, type ShellTab } from './v3/AppShell';
import { useBackButton } from './useBackButton';
import { useBarHeight } from '../lib/useBarHeight';

// These three screens pull in Recharts. They load when the patient opens them, so Home stays small.
// A chunk that cannot load shows the message of LoadError, and a new try asks for it again (L2-02).
const Dashboard = retryableLazy(() => import('./Dashboard').then((m) => ({ default: m.Dashboard })));
const DataScreen = retryableLazy(() => import('./DataScreen').then((m) => ({ default: m.DataScreen })));
const ClinicianView = retryableLazy(() => import('./ClinicianView').then((m) => ({ default: m.ClinicianView })));

// The plan generator, the exercise flow (the pose code starts only when a session starts) and the phone screen of the
// second camera (QR code, jsQR) are not on the first screens either (L4-02). They load by the same rule.
const CheckProgress = retryableLazy(() => import('./CheckProgress').then((m) => ({ default: m.CheckProgress })));
const ConfirmPlan = retryableLazy(() => import('./ConfirmPlan').then((m) => ({ default: m.ConfirmPlan })));
const Onboarding = retryableLazy(() => import('./Onboarding').then((m) => ({ default: m.Onboarding })));
const PairCompanion = retryableLazy(() => import('./PairCompanion').then((m) => ({ default: m.PairCompanion })));
const NextCard = retryableLazy(() => import('./PlanSession').then((m) => ({ default: m.NextCard })));
const SessionOverview = retryableLazy(() => import('./PlanSession').then((m) => ({ default: m.SessionOverview })));
const PlanResult = retryableLazy(() => import('./PlanResult').then((m) => ({ default: m.PlanResult })));
const Session = retryableLazy(() => import('./Session').then((m) => ({ default: m.Session })));
const Setup = retryableLazy(() => import('./Setup').then((m) => ({ default: m.Setup })));
const Summary = retryableLazy(() => import('./Summary').then((m) => ({ default: m.Summary })));
const UpdatePlan = retryableLazy(() => import('./UpdatePlan').then((m) => ({ default: m.UpdatePlan })));

// The screens that load on demand. The shell cannot move the focus to their heading while the chunk loads,
// so FocusHeading does it when the screen appears. The first screen (Privacy) is not here: its focus stays on the body.
const LAZY_SCREENS: ReadonlySet<string> = new Set(['setup', 'session', 'summary', 'dashboard', 'data', 'clinician', 'onboarding', 'plan', 'confirm', 'update', 'progress', 'companion', 'next', 'overview']);

/** Moves the focus to the heading when a lazy screen appears. The shell cannot do it while the screen still loads. */
function FocusHeading({ children }: { children: ReactNode }) {
  useEffect(() => {
    focusHeading(document.querySelector<HTMLElement>('main h1'));
  }, []);
  return children;
}

// The screens that have a tab, and the screen that each tab opens. Every other screen is a step of a flow and shows no tabs.
const TAB_OF: Partial<Record<ScreenId, ShellTab>> = { home: 'today', progress: 'progress', dashboard: 'sessions', data: 'data' };
const SCREEN_OF: Record<ShellTab, ScreenId> = { today: 'home', progress: 'progress', sessions: 'dashboard', data: 'data' };
// The two live screens keep their own frame until they move to LiveShell. They render the camera and need the full window.
const LIVE_SCREENS: ReadonlySet<string> = new Set(['setup', 'session']);

type Rows = { state: 'loading' } | { state: 'error' } | { state: 'ready'; sessions: SessionRecord[]; skipped: number };

/** Reads the sessions in the parent, so the dashboard stays a pure view (plan FR13). */
function Progress({ db, onBack }: { db: MpflDb; onBack: () => void }) {
  const [rows, setRows] = useState<Rows>({ state: 'loading' });
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => db.sessions.orderBy('date').toArray())
      .then(
        // A stored row that fails the schema is left out and counted. It is not deleted.
        (stored) => {
          const { rows: sessions, skipped } = readValidRows(stored);
          if (alive) setRows({ state: 'ready', sessions, skipped });
        },
        () => alive && setRows({ state: 'error' }),
      );
    return () => {
      alive = false;
    };
  }, [db]);

  if (rows.state === 'loading') return <LoadingScreen />;
  if (rows.state === 'error') {
    return (
      <FocusHeading>
        <section aria-labelledby="progress-error-title">
          <h1 id="progress-error-title" tabIndex={-1}>
            Your sessions
          </h1>
          <Notice role="alert" icon="triangle-alert">
            <p>Your sessions could not be read. Go back and try again.</p>
          </Notice>
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
      <Dashboard sessions={rows.sessions} skipped={rows.skipped} title="Your sessions" onBack={onBack} />
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
  /** Tests give a fake peer connection for the second camera. The app gives nothing. */
  pairingDeps?: LinkDeps;
}

type Boot = { ready: false } | { ready: true; protocol: Protocol | null; error: { title: string; message: string } | null };

export function App({ db, mode, source, now = () => new Date(), sound, pairingDeps }: AppProps) {
  useBarHeight();
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
      <AppShell tab={null} onNavigate={() => undefined} banner={bannersFor(mode, false)}>
        <AppShell.Main>
          <LoadingScreen />
        </AppShell.Main>
      </AppShell>
    );
  }
  return <Shell db={db} mode={mode} source={source} now={now} sound={soundInUse} pairingDeps={pairingDeps} protocol={boot.protocol} bootError={boot.error} />;
}

interface ShellProps extends Required<Omit<AppProps, 'pairingDeps'>> {
  pairingDeps?: LinkDeps;
  protocol: Protocol | null;
  bootError: { title: string; message: string } | null;
}

function Shell({ db, mode, source, now, sound, pairingDeps, protocol: storedProtocol, bootError: storedError }: ShellProps) {
  const [protocol, setProtocol] = useState(storedProtocol);
  const [bootError, setBootError] = useState(storedError);
  const [state, dispatch] = useReducer(
    appReducer,
    { seenPrivacy: hasSeenPrivacyNotice(), hasProtocol: storedProtocol !== null, mode },
    initialAppState,
  );

  // F3: the Back button of the browser acts like the Back, Cancel or Stop button of the screen (appState.backStep).
  // The Session registers its Stop here, so a Back press ends the session and the camera.
  const stateNow = useRef(state);
  const stopSession = useRef<(() => void) | null>(null);
  const questionBack = useRef<(() => boolean) | null>(null); // the questions of "Create my plan" step back inside the screen (R3-04)
  useEffect(() => {
    stateNow.current = state;
  });
  useBackButton(state.screen, backStep(state) === null, () => {
    const now = stateNow.current;
    const step = backStep(now);
    if (step === 'stop-session') {
      // The Session is not on screen yet (its code still loads): no camera runs, so Back goes Home like Cancel.
      if (stopSession.current === null) {
        dispatch({ type: 'open', screen: 'home' });
        return { landed: 'home', root: true };
      }
      stopSession.current();
      return { landed: 'summary', root: false };
    }
    if (step === 'stay') return { landed: now.screen, root: false };
    if (now.screen === 'onboarding' && questionBack.current?.()) return { landed: 'onboarding', root: false };
    if (step === null) return { landed: now.screen, root: true };
    dispatch(step);
    const next = appReducer(now, step);
    return { landed: next.screen, root: backStep(next) === null };
  });

  // The second camera (T12b). One pairing lives from Setup to the end of the Session, so the Session can read it.
  // It stops when the person leaves Setup and Session by any way: Cancel, Stop, "Knee gave way or hurts", or a new screen.
  const { pairing, view: pairingView } = usePairing(pairingDeps);
  const pairingOpen = ['starting', 'offer', 'connecting', 'connected'].includes(pairingView.status);
  useEffect(() => {
    if (pairingOpen && state.screen !== 'setup' && state.screen !== 'session') pairing.close();
  }, [pairingOpen, state.screen, pairing]);

  // The only source of the active phase is the read-only store (FR4).
  const store = useMemo(() => (protocol ? createProtocolStore(protocol) : null), [protocol]);
  const phase = protocol && store ? protocol.phases.find((p) => p.id === store.activePhase) : undefined;
  // Only an exercise with a definition can start a session (isMonitored). Home shows no Start for another one.
  const chosen = phase?.exercises.find((e) => e.kind === state.exercise);
  const exercise = chosen !== undefined && isMonitored(chosen.kind) ? chosen : undefined;

  // The app has no URL routes. The browser must not restore the old scroll position when the history entry
  // above a root screen goes (useBackButton). The focused heading would then leave the screen.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  // Move focus to the heading when the screen changes, so a screen reader announces it.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    focusHeading(document.querySelector<HTMLElement>('main h1'));
  }, [state.screen]);

  // Today's session. The place in the plan, and whether the camera of the exercise before is still on.
  const plan = state.plan;
  const planMark = plan ? { index: plan.index, total: plan.kinds.length } : undefined;
  const last = plan?.entries[plan.entries.length - 1];
  const cameraKept = plan !== null && plan.index > 0 && last?.run != null && last.kind === plan.kinds[plan.index - 1] && keepsCamera(plan.kinds, plan.index - 1);
  // The camera stays on between two camera exercises only: on the Done step, and on the Next card when the next one uses it too.
  // The summary at the end stops it. Session and Setup also stop it by themselves. A single exercise has no plan, so it is not touched here.
  const screenNow = state.screen;
  const nextUsesCamera = state.exercise !== null && usesCamera(state.exercise);
  useEffect(() => {
    const keep = screenNow === 'setup' || screenNow === 'session' || (plan !== null && (screenNow === 'summary' || (screenNow === 'next' && nextUsesCamera)));
    if (plan !== null && !keep) source.stop();
  }, [screenNow, plan, nextUsesCamera, source]);

  const banners = bannersFor(mode, protocol?.example === true, protocol?.generated !== undefined && protocol.approvedOn === undefined);
  // The whole plan as rows, for the progress panels of the Done step and the Next card.
  const items = plan ? planItems(phase?.exercises ?? [], plan.kinds, protocol?.generated !== undefined) : [];

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
              onStartSession={(kinds) => {
                sound.unlock(); // inside the press, so the browser allows audio later
                dispatch({ type: 'start-session', kinds });
              }}
              onLoadProtocol={() => dispatch({ type: 'open', screen: 'load' })}
              onOpenData={() => dispatch({ type: 'open', screen: 'data' })}
              onOpenCompanion={() => dispatch({ type: 'open', screen: 'companion' })}
              onOpenPrivacy={() => dispatch({ type: 'open', screen: 'privacy' })}
              onUpdatePlan={mode === 'demo' ? () => dispatch({ type: 'open', screen: 'update' }) : undefined}
              onCheckProgress={mode === 'demo' ? () => dispatch({ type: 'open', screen: 'progress' }) : undefined}
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
              banners={banners}
              kind={exercise.kind}
              side={protocol.side}
              exerciseName={EXERCISE_NAMES[exercise.kind]}
              // The figure shows no number for a plan that the app made: its count value is no target (L2-01).
              targetFlexion={protocol.generated === undefined ? exercise.targetFlexion : undefined}
              limit={exercise.maxFlexion}
              returnWithinDeg={exercise.returnWithinDeg}
              source={source}
              pair={{ pairing, view: pairingView }}
              sound={sound}
              compact={getGuideSeen().includes(exercise.kind)}
              initialLeg={state.exerciseLeg ?? getLegPrefs().leg}
              initialCameraSide={state.cameraSide ?? getLegPrefs().cameraSide}
              plan={planMark && { ...planMark, detail: exercise.sets === undefined ? null : `${exercise.sets} ${plural(exercise.sets, 'set')}` }}
              cameraKept={cameraKept}
              onReady={(done) => {
                // The next start remembers the two answers and that the guide was seen. Only the words left or right are stored.
                if (usesCamera(exercise.kind)) setLegPrefs(done.exerciseLeg, done.cameraSide);
                markGuideSeen(exercise.kind);
                dispatch({ type: 'setup-done', ...done });
              }}
              onCancel={() => dispatch({ type: 'open', screen: 'home' })}
            />
          );
        }
        break;
      case 'session':
        if (exercise && protocol && store) {
          return (
            <Session
              banners={banners}
              exercise={exercise}
              side={state.exerciseLeg ?? protocol.side}
              cameraSide={state.cameraSide ?? undefined}
              baselineDeg={state.baselineDeg}
              source={source}
              second={{ source: pairing.source(), status: pairingView.status, message: pairingView.message }}
              sound={sound}
              painPauseThreshold={protocol.painPauseThreshold}
              stopRef={stopSession}
              plan={planMark}
              keepCamera={plan !== null && keepsCamera(plan.kinds, plan.index)}
              onEnd={(reason, summary) => {
                // The run is saved now, before any question. A closed tab or a crash after this point keeps the run.
                const run = { reason, summary };
                const record = saveSession(
                  db,
                  runToSessionInput({ run, exercise: exercise, protocol, phase: store.activePhase, redFlagBlocks: state.redFlagBlocks, legTracked: state.exerciseLeg ?? undefined, cameraSide: state.cameraSide ?? undefined, now }),
                );
                record.catch(() => undefined); // the Summary reads the failure from the same promise
                dispatch({ type: 'session-end', ...run, record });
              }}
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
              legTracked={state.exerciseLeg ?? undefined}
              cameraSide={state.cameraSide ?? undefined}
              db={db}
              now={now}
              plan={planMark && { ...planMark, keepCamera: plan !== null && keepsCamera(plan.kinds, plan.index), items }}
              onDone={() => dispatch(plan ? { type: 'plan-continue' } : { type: 'finish' })}
              onStop={() => dispatch({ type: 'plan-stop' })}
            />
          );
        }
        break;
      case 'next':
        if (plan && state.exercise) {
          return (
            <NextCard
              name={EXERCISE_NAMES[state.exercise]}
              index={plan.index}
              total={plan.kinds.length}
              items={items}
              onStart={() => dispatch({ type: 'open', screen: 'setup' })}
              onSkip={() => dispatch({ type: 'plan-skip' })}
              onStop={() => dispatch({ type: 'plan-stop' })}
            />
          );
        }
        break;
      case 'overview':
        if (plan) return <SessionOverview entries={plan.entries} onDone={() => dispatch({ type: 'finish' })} />;
        break;
      case 'dashboard':
        return <Progress db={db} onBack={() => dispatch({ type: 'open', screen: 'home' })} />;
      case 'data':
        return (
          <DataScreen
            db={db}
            onBack={() => dispatch({ type: 'open', screen: 'home' })}
            onOpenPrivacy={() => dispatch({ type: 'open', screen: 'privacy' })}
            onErased={() => {
              // Nothing of the old protocol stays in memory.
              setProtocol(null);
              setBootError(null);
              dispatch({ type: 'erased' });
            }}
            onOpenClinician={mode === 'demo' ? () => dispatch({ type: 'open', screen: 'clinician' }) : undefined}
          />
        );
      case 'onboarding':
        return (
          <Onboarding
            today={localIsoDate(now())}
            initial={state.draft?.origin === 'create' ? state.draft.inputs : null}
            backRef={questionBack}
            onDone={(draft) => dispatch({ type: 'draft', draft })}
            onCancel={() => dispatch({ type: 'open', screen: protocol ? 'home' : 'load' })}
          />
        );
      case 'plan':
        if (state.draft?.kind === 'plan') {
          return <PlanResult draft={state.draft} onUse={() => dispatch({ type: 'open', screen: 'confirm' })} onBack={() => dispatch({ type: 'open', screen: 'onboarding' })} />;
        }
        break;
      case 'referral':
        if (state.draft?.kind === 'referral') {
          return (
            <Referral
              draft={state.draft}
              onLoadFile={() => dispatch({ type: 'open', screen: 'load' })}
              onBack={() => dispatch({ type: 'open', screen: protocol ? 'home' : 'load' })}
            />
          );
        }
        break;
      case 'confirm':
        if (state.draft?.kind === 'plan') {
          return (
            <ConfirmPlan
              db={db}
              mode={mode}
              draft={state.draft}
              current={protocol}
              onAccepted={(saved) => {
                setProtocol(saved);
                dispatch({ type: 'plan-accepted' });
              }}
              onKeep={() => dispatch({ type: 'plan-kept' })}
            />
          );
        }
        break;
      case 'progress':
        if (protocol) {
          return <CheckProgress db={db} protocol={protocol} today={localIsoDate(now())} onUpdate={() => dispatch({ type: 'open', screen: 'update' })} onBack={() => dispatch({ type: 'open', screen: 'home' })} />;
        }
        break;
      case 'update':
        if (protocol) {
          return (
            <UpdatePlan
              db={db}
              protocol={protocol}
              today={localIsoDate(now())}
              selfProgression={selfProgressionOn()}
              onDone={(draft) => dispatch({ type: 'draft', draft })}
              onCancel={() => dispatch({ type: 'open', screen: 'home' })}
              onCreate={() => dispatch({ type: 'open', screen: 'onboarding' })}
            />
          );
        }
        break;
      case 'companion':
        // The phone screen needs no protocol and no red-flag check. It never starts an exercise.
        return <PairCompanion onExit={() => dispatch({ type: 'open', screen: 'home' })} />;
      case 'clinician':
        return (
          <ClinicianView mode={mode} now={now} onBack={() => dispatch({ type: 'open', screen: 'data' })} />
        );
    }
    return (
      <>
        <LoadProtocol
          db={db}
          mode={mode}
          initialError={bootError}
          onCancel={protocol ? () => dispatch({ type: 'open', screen: 'home' }) : undefined}
          onCreatePlan={() => dispatch({ type: 'open', screen: 'onboarding' })}
          onLoaded={() => {
            void loadStoredProtocol(db, mode).then((result) => {
              if (result?.ok) {
                setProtocol(result.protocol);
                dispatch({ type: 'protocol-loaded' });
              }
            });
          }}
        />
        {/* A new phone has no protocol, so the way to the phone screen sits here too. */}
        <div className="narrow mt">
          <CompanionEntry onOpen={() => dispatch({ type: 'open', screen: 'companion' })} />
        </div>
      </>
    );
  })();

  const content = (
    <LoadError key={state.screen} onBack={() => dispatch({ type: 'open', screen: 'home' })}>
      <Suspense fallback={<LoadingScreen />}>
        {LAZY_SCREENS.has(state.screen) ? <FocusHeading key={state.screen}>{screen}</FocusHeading> : screen}
      </Suspense>
    </LoadError>
  );

  if (LIVE_SCREENS.has(state.screen)) {
    // Setup and Session draw their own frame (LiveShell, with the notices). The frame below only covers the load and the load error.
    const frame = (inner: ReactNode) => (
      <AppShell tab={null} onNavigate={() => undefined} banner={banners}>
        <AppShell.Main>{inner}</AppShell.Main>
      </AppShell>
    );
    return (
      <LoadError key={state.screen} onBack={() => dispatch({ type: 'open', screen: 'home' })} frame={frame}>
        <Suspense fallback={frame(<LoadingScreen />)}>
          <FocusHeading key={state.screen}>{screen}</FocusHeading>
        </Suspense>
      </LoadError>
    );
  }
  // Tabs show on the main screens, and only when a protocol is stored. Flow screens never show them.
  const tab = protocol !== null && store !== null ? (TAB_OF[state.screen] ?? null) : null;
  return (
    <AppShell tab={tab} onNavigate={(next) => dispatch({ type: 'open', screen: SCREEN_OF[next] })} banner={banners}>
      <AppShell.Main>{content}</AppShell.Main>
    </AppShell>
  );
}
