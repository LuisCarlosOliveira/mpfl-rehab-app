import { useEffect, useState } from 'react';
import { clearanceAsked, emptyAnswers, gatesAsked, limitNumber, answered, type Answers } from '../lib/onboarding';
import { describeChanges, draftOf, eventsSince, gaveWaySince, holdTextFor, losesPainLimit, movesForward, weeksSince, type PlanDraft } from '../lib/planView';
import type { Protocol } from '../lib/protocol';
import { generateProtocol, type GeneratorInputs } from '../lib/protocolGen';
import { loadGeneratorInputs, readValidRows, type MpflDb, type StoredInputs } from '../lib/storage';
import { ChoiceGroup, GATE_QUESTIONS, LimitChoice, RedFlagChecklist, SurgeryDateField, SwellingChoice, YES_NO_UNKNOWN } from './answerControls';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { PainScale } from './PainScale';
import { Actions } from './v3/shellParts';
import './screensV2.css';
import './formsV3.css';

interface Props {
  db: MpflDb;
  protocol: Protocol;
  today: string;
  selfProgression: boolean;
  onDone: (draft: PlanDraft) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export const HOLD_EVENT = 'Contact your care team before the next stage. The app recorded a safety event after the date of your plan.';

type Loaded = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; stored: StoredInputs; events: number; gaveWay: boolean };

export function UpdatePlan({ db, protocol, today, selfProgression, onDone, onCancel, onCreate }: Props) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });
  const [form, setForm] = useState<Answers>(emptyAnswers());

  useEffect(() => {
    let alive = true;
    Promise.all([loadGeneratorInputs(db), db.sessions.toArray()]).then(
      ([stored, rows]) => {
        if (!alive) return;
        const sessions = readValidRows(rows).rows;
        if (stored === null) return setLoaded({ state: 'missing' });
        const since = protocol.generated?.on ?? '0000-00-00';
        setLoaded({ state: 'ready', stored, events: eventsSince(sessions, since, protocol.painPauseThreshold), gaveWay: gaveWaySince(sessions, since) });
        const limit = stored.surgeonLimit;
        setForm((f) => ({ ...f, surgeryDate: stored.surgeryDate ?? '', limitKind: limit.kind, limitDegrees: limit.kind === 'degrees' ? String(limit.degrees) : '' }));
      },
      () => alive && setLoaded({ state: 'missing' }),
    );
    return () => {
      alive = false;
    };
  }, [db, protocol]);

  const head = (
    <header className="page-head">
      <h1 id="update-title" tabIndex={-1}>
        Update my plan
      </h1>
    </header>
  );

  if (loaded.state === 'loading') {
    return (
      <section aria-labelledby="update-title" className="v3 v3-screen v2-screens v3-questions">
        <div className="v3-cols">
          <div className="v3-fields">
            {head}
            <div className="skeleton" aria-hidden="true">
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (loaded.state === 'missing') {
    return (
      <section aria-labelledby="update-title" className="v3 v3-screen v2-screens v3-questions">
        <div className="v3-cols">
          <div className="v3-fields">
            {head}
            <Notice role="status" icon="info">
              <p>This device does not have your answers for the plan. Create the plan again to update it.</p>
            </Notice>
          </div>
        </div>
        <Actions label="Update my plan buttons">
          <div className="v3-btnrow">
            <button type="button" className="btn btn-primary btn-lg" onClick={onCreate}>
              Create my plan
            </button>
            <button type="button" className="btn btn-lg" onClick={onCancel}>
              <Icon name="arrow-left" size={18} />
              Back to Home
            </button>
          </div>
        </Actions>
      </section>
    );
  }

  const { stored, events, gaveWay } = loaded;
  const set = (patch: Partial<Answers>) => setForm((f) => ({ ...f, ...patch }));
  const week = weeksSince(form.surgeryDate, today);
  const asked = clearanceAsked(form, today);
  const limitReady = form.limitKind === 'degrees' ? limitNumber(form.limitDegrees) !== null : form.limitKind !== null;
  const gates = gatesAsked(form, today);
  const gatesReady = !gates || (form.walksWithoutCrutches !== null && form.legRaiseStraight !== null && form.seatedHoldCleared !== null);
  const ready = answered('today', form) && limitReady && (!asked || form.phaseClearance !== null) && gatesReady && week !== null;

  function check() {
    const degrees = limitNumber(form.limitDegrees);
    const inputs: GeneratorInputs = {
      ...stored,
      surgeryDate: form.surgeryDate,
      surgeonLimit: form.limitKind === 'degrees' && degrees !== null ? { kind: 'degrees', degrees } : { kind: form.limitKind === 'none' ? 'none' : 'unknown' },
      phaseClearance: asked ? (form.phaseClearance ?? 'unknown') : 'no',
      walksWithoutCrutches: gates ? (form.walksWithoutCrutches ?? 'unknown') : 'unknown',
      legRaiseStraight: gates ? (form.legRaiseStraight ?? 'unknown') : 'unknown',
      seatedHoldCleared: gates ? (form.seatedHoldCleared ?? 'unknown') : 'unknown',
      kneeGaveWay: gaveWay,
      redFlags: Object.fromEntries(Object.entries(form.redFlags).filter(([, v]) => v)),
      pain: form.pain ?? 0,
      swelling: form.swelling ?? 'none',
    };
    const result = generateProtocol(inputs, today);
    if (result.kind === 'referral') {
      onDone(draftOf(result, 'update', inputs));
      return;
    }
    const forward = movesForward(protocol, result.protocol);
    // A stored clinician pain limit holds the move whatever the flag says. The flag or an event holds every other forward move.
    const hold = !forward ? null : !selfProgression || losesPainLimit(protocol, result.protocol) ? holdTextFor(protocol, result.protocol) : events > 0 ? HOLD_EVENT : null;
    onDone(draftOf(result, 'update', inputs, describeChanges(protocol, result.protocol, inputs), hold));
  }

  return (
    <section aria-labelledby="update-title" className="v3 v3-screen v2-screens v3-questions">
      <div className="v3-cols">
        <div className="v3-fields">
          {head}
          <p className="lede">The app checks your plan again from today&apos;s date. The app changes nothing until you press Confirm.</p>

          <section className="stack-s" aria-labelledby="update-date">
            <h2 id="update-date">Surgery date</h2>
            <SurgeryDateField value={form.surgeryDate} today={today} onChange={(surgeryDate) => set({ surgeryDate })} />
            <p className="detail">Change the date here if it is not right. The weeks and the plan follow this date.</p>
          </section>

          <section className="stack-s" aria-labelledby="update-limit">
            <h2 id="update-limit">Your surgeon limit for the knee bend</h2>
            <LimitChoice
              name="limit"
              legend="Did your surgeon give a limit for how far you can bend your knee, also with a brace?"
              kind={form.limitKind}
              degrees={form.limitDegrees}
              onKind={(limitKind) => set({ limitKind })}
              onDegrees={(limitDegrees) => set({ limitDegrees })}
            />
            <p className="detail">Check that this is still the limit from your surgeon or physiotherapist, also a brace limit.</p>
          </section>
        </div>

        <div className="v3-fields">
          <section className="stack-s" aria-labelledby="update-flags">
            <h2 id="update-flags">Do any of these apply today?</h2>
            <RedFlagChecklist ticked={form.redFlags} onToggle={(id, on) => set({ redFlags: { ...form.redFlags, [id]: on } })} />
          </section>

          <section className="stack-s" aria-labelledby="update-today">
            <h2 id="update-today">How is your knee today?</h2>
            <PainScale name="pain" value={form.pain} onChange={(pain) => set({ pain })} />
            <SwellingChoice name="swelling" value={form.swelling} onChange={(swelling) => set({ swelling })} />
          </section>

          {asked && (
            <section className="stack-s" aria-labelledby="update-stage">
              <h2 id="update-stage">The next stage</h2>
              <ChoiceGroup
                name="clearance"
                legend="Has your surgeon or physiotherapist said that you can start the next stage?"
                row
                value={form.phaseClearance}
                choices={YES_NO_UNKNOWN}
                onChange={(v) => set({ phaseClearance: v as Answers['phaseClearance'] })}
              />
            </section>
          )}

          {gates && (
            <section className="stack-s" aria-labelledby="update-gates">
              <h2 id="update-gates">Your answers for the next exercises</h2>
              <ChoiceGroup name="walking" legend={GATE_QUESTIONS.walking} row value={form.walksWithoutCrutches} choices={YES_NO_UNKNOWN} onChange={(v) => set({ walksWithoutCrutches: v as Answers['walksWithoutCrutches'] })} />
              <ChoiceGroup name="legRaise" legend={GATE_QUESTIONS.legRaise} row value={form.legRaiseStraight} choices={YES_NO_UNKNOWN} onChange={(v) => set({ legRaiseStraight: v as Answers['legRaiseStraight'] })} />
              <ChoiceGroup name="seatedHold" legend={GATE_QUESTIONS.seatedHold} row value={form.seatedHoldCleared} choices={YES_NO_UNKNOWN} onChange={(v) => set({ seatedHoldCleared: v as Answers['seatedHoldCleared'] })} />
              <p className="detail">The app does not check these answers.</p>
            </section>
          )}
        </div>
      </div>

      <Actions label="Update my plan buttons">
        <div className="v3-btnrow">
          <button type="button" className="btn btn-primary btn-lg" disabled={!ready} onClick={check}>
            Check my plan
          </button>
          <button type="button" className="btn btn-lg" onClick={onCancel}>
            <Icon name="arrow-left" size={18} />
            Back to Home
          </button>
        </div>
      </Actions>
    </section>
  );
}
