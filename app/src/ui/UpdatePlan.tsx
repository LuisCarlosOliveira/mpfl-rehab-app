// "Update my plan". The person opens it. The app checks the plan again from today's date and the stored answers.
// It proposes a change with the reason, and the person confirms or keeps the plan on the next screen (ConfirmPlan).
// This screen saves nothing. A change that moves forward needs VITE_SELF_PROGRESSION, and a safety event since the plan holds it.
import { useEffect, useState } from 'react';
import { clearanceAsked, emptyAnswers, gatesAsked, limitNumber, answered, type Answers } from '../lib/onboarding';
import { describeChanges, draftOf, eventsSince, gaveWaySince, movesForward, raisesLimit, weeksSince, type PlanDraft } from '../lib/planView';
import type { Protocol } from '../lib/protocol';
import { generateProtocol, type GeneratorInputs } from '../lib/protocolGen';
import { loadGeneratorInputs, type MpflDb, type StoredInputs } from '../lib/storage';
import { ChoiceGroup, LimitChoice, RedFlagChecklist, SwellingChoice, YES_NO_UNKNOWN } from './answerControls';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { PainScale } from './PainScale';

interface Props {
  db: MpflDb;
  protocol: Protocol;
  /** The calendar date of today, as year-month-day. The app gives it from the clock. */
  today: string;
  /** True when VITE_SELF_PROGRESSION is on. It is off by default. */
  selfProgression: boolean;
  onDone: (draft: PlanDraft) => void;
  onCancel: () => void;
  /** Opens the questions, when the stored answers are missing. */
  onCreate: () => void;
}

export const HOLD_NEXT_STAGE = 'Ask your care team about the next stage.';
export const HOLD_LIMIT = 'A higher limit needs your care team. The app keeps your current limit.';
export const HOLD_EVENT = 'Contact your care team before the next stage. The app recorded a safety event after the date of your plan.';

type Loaded = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; stored: StoredInputs; events: number; gaveWay: boolean };

export function UpdatePlan({ db, protocol, today, selfProgression, onDone, onCancel, onCreate }: Props) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });
  const [form, setForm] = useState<Answers>(emptyAnswers());

  useEffect(() => {
    let alive = true;
    Promise.all([loadGeneratorInputs(db), db.sessions.toArray()]).then(
      ([stored, sessions]) => {
        if (!alive) return;
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
      <section aria-labelledby="update-title" className="narrow">
        {head}
        <div className="skeleton" aria-hidden="true">
          <span />
          <span />
        </div>
      </section>
    );
  }

  if (loaded.state === 'missing') {
    return (
      <section aria-labelledby="update-title" className="narrow">
        {head}
        <Notice role="status" icon="info">
          <p>This device does not have your answers for the plan. Create the plan again to update it.</p>
        </Notice>
        <div className="action-bar">
          <button type="button" className="btn btn-primary btn-lg" onClick={onCreate}>
            Create my plan
          </button>
          <button type="button" className="btn btn-lg" onClick={onCancel}>
            <Icon name="arrow-left" size={18} />
            Back to Home
          </button>
        </div>
      </section>
    );
  }

  const { stored, events, gaveWay } = loaded;
  const set = (patch: Partial<Answers>) => setForm((f) => ({ ...f, ...patch }));
  const week = weeksSince(stored.surgeryDate ?? '', today);
  const asked = clearanceAsked(form, today);
  const limitReady = form.limitKind === 'degrees' ? limitNumber(form.limitDegrees) !== null : form.limitKind !== null;
  const gates = gatesAsked(form, today);
  const gatesReady = !gates || (form.walksWithoutCrutches !== null && form.legRaiseStraight !== null && form.seatedHoldCleared !== null);
  const ready = answered('today', form) && limitReady && (!asked || form.phaseClearance !== null) && gatesReady && week !== null;

  function check() {
    const degrees = limitNumber(form.limitDegrees);
    const inputs: GeneratorInputs = {
      ...stored,
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
    const heldText = raisesLimit(protocol, result.protocol) ? HOLD_LIMIT : HOLD_NEXT_STAGE;
    const hold = !forward ? null : !selfProgression ? heldText : events > 0 ? HOLD_EVENT : null;
    onDone(draftOf(result, 'update', inputs, describeChanges(protocol, result.protocol), hold));
  }

  return (
    <section aria-labelledby="update-title" className="narrow">
      {head}
      <div className="stack">
        <p className="lede">The app checks your plan again from today&apos;s date. The app changes nothing until you press Confirm.</p>

        <section className="stack-s" aria-labelledby="update-flags">
          <h2 id="update-flags">Do any of these apply today?</h2>
          <RedFlagChecklist ticked={form.redFlags} onToggle={(id, on) => set({ redFlags: { ...form.redFlags, [id]: on } })} />
        </section>

        <section className="stack-s" aria-labelledby="update-today">
          <h2 id="update-today">How is your knee today?</h2>
          <PainScale name="pain" value={form.pain} onChange={(pain) => set({ pain })} />
          <SwellingChoice name="swelling" value={form.swelling} onChange={(swelling) => set({ swelling })} />
        </section>

        <section className="stack-s" aria-labelledby="update-limit">
          <h2 id="update-limit">Your surgeon limit for the knee bend</h2>
          <LimitChoice
            name="limit"
            legend="Your surgeon limit for the knee bend"
            kind={form.limitKind}
            degrees={form.limitDegrees}
            onKind={(limitKind) => set({ limitKind })}
            onDegrees={(limitDegrees) => set({ limitDegrees })}
          />
          <p className="detail">Check that this is still the limit from your surgeon or physiotherapist, also a brace limit.</p>
        </section>

        {asked && (
          <section className="stack-s" aria-labelledby="update-stage">
            <h2 id="update-stage">The next stage</h2>
            <p className="lede">Has your surgeon or physiotherapist said that you can start the next stage?</p>
            <ChoiceGroup
              name="clearance"
              legend="Has your surgeon or physiotherapist said that you can start the next stage?"
              value={form.phaseClearance}
              choices={YES_NO_UNKNOWN}
              onChange={(v) => set({ phaseClearance: v as Answers['phaseClearance'] })}
            />
          </section>
        )}

        {gates && (
          <section className="stack-s" aria-labelledby="update-gates">
            <h2 id="update-gates">Your answers for the next exercises</h2>
            <ChoiceGroup
              name="walking"
              legend="Do you walk without crutches?"
              value={form.walksWithoutCrutches}
              choices={YES_NO_UNKNOWN}
              onChange={(v) => set({ walksWithoutCrutches: v as Answers['walksWithoutCrutches'] })}
            />
            <ChoiceGroup
              name="legRaise"
              legend="Can you lift your leg with a straight knee, with no bend in the knee while the leg is up?"
              value={form.legRaiseStraight}
              choices={YES_NO_UNKNOWN}
              onChange={(v) => set({ legRaiseStraight: v as Answers['legRaiseStraight'] })}
            />
            <ChoiceGroup
              name="seatedHold"
              legend="Did your surgeon say that you can do knee straightening exercises while you sit?"
              value={form.seatedHoldCleared}
              choices={YES_NO_UNKNOWN}
              onChange={(v) => set({ seatedHoldCleared: v as Answers['seatedHoldCleared'] })}
            />
            <p className="detail">The app does not check these answers.</p>
          </section>
        )}
      </div>

      <div className="action-bar">
        <button type="button" className="btn btn-primary btn-lg" disabled={!ready} onClick={check}>
          Check my plan
        </button>
        <button type="button" className="btn btn-lg" onClick={onCancel}>
          <Icon name="arrow-left" size={18} />
          Back to Home
        </button>
      </div>
    </section>
  );
}
