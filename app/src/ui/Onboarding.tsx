// "Create my plan": the questions of the protocol generator (docs/protocol-generator-design.md section 2).
// One question for each screen. The referral questions come first. The answers stay in this component.
// Nothing is saved here. The generator runs only when the person presses "Make my plan", and it saves nothing.
import { useEffect, useRef, useState } from 'react';
import {
  answered, earlyReferral, emptyAnswers, fromInputs, limitNumber, stepsFor, surgeryDateProblem, toInputs,
  type Answers, type StepId,
} from '../lib/onboarding';
import { draftOf, type PlanDraft } from '../lib/planView';
import { generateProtocol, type GeneratorInputs } from '../lib/protocolGen';
import { ChoiceGroup, LimitChoice, RedFlagChecklist, SwellingChoice, YES_NO, YES_NO_UNKNOWN } from './answerControls';
import { Icon } from './Icon';
import { PainScale } from './PainScale';

interface Props {
  /** The calendar date of today, as year-month-day. The app gives it from the clock. */
  today: string;
  /** Earlier answers. The screen then opens on the summary, so the person can change one. */
  initial?: GeneratorInputs | null;
  onDone: (draft: PlanDraft) => void;
  onCancel: () => void;
}

const TITLES: Record<StepId, string> = {
  writtenPlan: 'Did your care team give you a written rehab plan?',
  procedure: 'Which operation did you have?',
  ageBand: 'How old are you?',
  bothKnees: 'Did you have surgery on both knees?',
  firstSurgery: 'Is this your first MPFL surgery on this knee?',
  specialRules: 'Did your surgeon give special rules, for example about the graft, the fixation or the shape of your knee?',
  surgeryDate: 'What was the date of your surgery?',
  side: 'Which knee did you have surgery on?',
  limit: 'Did your surgeon give a limit for how far you can bend your knee, also with a brace?',
  redFlags: 'Do any of these apply today?',
  today: 'How is your knee today?',
  clearance: 'Has your surgeon or physiotherapist said that you can start the next stage?',
  summary: 'Check your answers',
};

const CHANGE_LABELS: Record<Exclude<StepId, 'summary'>, string> = {
  writtenPlan: 'the written plan answer',
  procedure: 'the operation',
  ageBand: 'the age answer',
  bothKnees: 'the both knees answer',
  firstSurgery: 'the first surgery answer',
  specialRules: 'the special rules answer',
  surgeryDate: 'the date of surgery',
  side: 'the side of the knee',
  limit: 'the knee-bend limit',
  redFlags: 'the red flags',
  today: 'the pain and swelling today',
  clearance: 'the next stage answer',
};

const SUMMARY_LABELS: Record<Exclude<StepId, 'summary'>, string> = {
  writtenPlan: 'Written plan from your care team',
  procedure: 'Operation',
  ageBand: 'Age',
  bothKnees: 'Surgery on both knees',
  firstSurgery: 'First MPFL surgery on this knee',
  specialRules: 'Special rules from your surgeon',
  surgeryDate: 'Date of surgery',
  side: 'Operated knee',
  limit: 'Knee-bend limit',
  redFlags: 'Red flags',
  today: 'Pain and swelling today',
  clearance: 'Next stage said by your care team',
};

const PROCEDURES = [
  { value: 'mpflr-only', label: 'MPFL reconstruction only' },
  { value: 'combined', label: 'MPFL reconstruction with another procedure' },
  { value: 'unknown', label: 'I do not know' },
] as const;
const AGES = [
  { value: '18-plus', label: '18 or older' },
  { value: 'under-18', label: 'Under 18' },
] as const;
const SIDES = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
] as const;
const SWELLING_TEXT = { none: 'No swelling', some: 'Some swelling', more: 'More than before' } as const;

const word = (v: string | null) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'I do not know');

/** The answer of one step as a short line for the summary. */
function valueText(step: Exclude<StepId, 'summary'>, a: Answers): string {
  switch (step) {
    case 'writtenPlan': case 'firstSurgery': case 'specialRules': case 'clearance':
      return word(step === 'clearance' ? a.phaseClearance : a[step]);
    case 'procedure': return PROCEDURES.find((p) => p.value === a.procedure)?.label ?? '';
    case 'ageBand': return AGES.find((p) => p.value === a.ageBand)?.label ?? '';
    case 'bothKnees': return a.bothKnees ? 'Yes' : 'No';
    case 'surgeryDate': return a.surgeryDate;
    case 'side': return a.side === 'left' ? 'Left' : 'Right';
    case 'limit': return a.limitKind === 'degrees' ? `${limitNumber(a.limitDegrees)} degrees` : a.limitKind === 'none' ? 'No limit' : 'I do not know';
    case 'redFlags': {
      const n = Object.values(a.redFlags).filter(Boolean).length;
      return n === 0 ? 'None ticked' : `${n} ticked`;
    }
    case 'today': return `Pain ${a.pain} out of 10, ${SWELLING_TEXT[a.swelling ?? 'none'].toLowerCase()}`;
  }
}

export function Onboarding({ today, initial = null, onDone, onCancel }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => (initial ? fromInputs(initial) : emptyAnswers()));
  const [step, setStep] = useState<StepId>(initial ? 'summary' : 'writtenPlan');
  // After Change on the summary, Next goes back to the summary. A new question that the change opens comes first.
  const [fromSummary, setFromSummary] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const steps = stepsFor(answers, today);
  const index = steps.indexOf(step);
  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));

  function goNext() {
    if (index <= steps.indexOf('specialRules')) {
      const referral = earlyReferral(answers, today);
      if (referral) {
        onDone(draftOf(referral, 'create', null));
        return;
      }
    }
    if (fromSummary) {
      const open = steps.find((s) => s !== 'summary' && !answered(s, answers, today));
      setStep(open ?? 'summary');
      if (open === undefined) setFromSummary(false);
      return;
    }
    setStep(steps[index + 1] ?? 'summary');
  }

  function goBack() {
    if (fromSummary) {
      setStep('summary');
      setFromSummary(false);
    } else if (index === 0) onCancel();
    else setStep(steps[index - 1] as StepId);
  }

  function makePlan() {
    const inputs = toInputs(answers, today);
    if (inputs === null) return;
    onDone(draftOf(generateProtocol(inputs, today), 'create', inputs));
  }

  const dateProblem = surgeryDateProblem(answers.surgeryDate, today);

  const body = (() => {
    switch (step) {
      case 'writtenPlan':
        return <ChoiceGroup name="writtenPlan" legend={TITLES.writtenPlan} value={answers.writtenPlan} choices={YES_NO_UNKNOWN} onChange={(v) => set({ writtenPlan: v as Answers['writtenPlan'] })} />;
      case 'procedure':
        return (
          <>
            <ChoiceGroup name="procedure" legend={TITLES.procedure} value={answers.procedure} choices={PROCEDURES} onChange={(v) => set({ procedure: v as Answers['procedure'] })} />
            <p className="detail">Your discharge letter names the operation. If you are not sure, choose I do not know.</p>
            <p className="detail">
              Another procedure can be a bone cut below the kneecap (tibial tubercle osteotomy), groove reshaping (trochleoplasty), cartilage repair, or a release or
              lengthening of the outer tissue.
            </p>
          </>
        );
      case 'ageBand':
        return <ChoiceGroup name="ageBand" legend={TITLES.ageBand} value={answers.ageBand} choices={AGES} onChange={(v) => set({ ageBand: v as Answers['ageBand'] })} />;
      case 'bothKnees':
        return <ChoiceGroup name="bothKnees" legend={TITLES.bothKnees} value={answers.bothKnees === null ? null : answers.bothKnees ? 'yes' : 'no'} choices={YES_NO} onChange={(v) => set({ bothKnees: v === 'yes' })} />;
      case 'firstSurgery':
        return <ChoiceGroup name="firstSurgery" legend={TITLES.firstSurgery} value={answers.firstSurgery} choices={YES_NO_UNKNOWN} onChange={(v) => set({ firstSurgery: v as Answers['firstSurgery'] })} />;
      case 'specialRules':
        return <ChoiceGroup name="specialRules" legend={TITLES.specialRules} value={answers.specialRules} choices={YES_NO_UNKNOWN} onChange={(v) => set({ specialRules: v as Answers['specialRules'] })} />;
      case 'surgeryDate':
        return (
          <div className="field choices">
            <label htmlFor="surgery-date">Date of surgery</label>
            <input
              id="surgery-date"
              className="text-input"
              type="date"
              max={today}
              value={answers.surgeryDate}
              aria-invalid={dateProblem !== null}
              aria-describedby={dateProblem === null ? undefined : 'surgery-date-problem'}
              onChange={(e) => set({ surgeryDate: e.target.value })}
            />
            {dateProblem !== null && (
              <p id="surgery-date-problem" className="detail" role="alert">
                {dateProblem}
              </p>
            )}
            <p className="detail">The app keeps this date on this device only. It uses the date to count the weeks since surgery.</p>
          </div>
        );
      case 'side':
        return <ChoiceGroup name="side" legend={TITLES.side} value={answers.side} choices={SIDES} onChange={(v) => set({ side: v as Answers['side'] })} />;
      case 'limit':
        return (
          <>
            <LimitChoice
              name="limit"
              legend={TITLES.limit}
              kind={answers.limitKind}
              degrees={answers.limitDegrees}
              onKind={(limitKind) => set({ limitKind })}
              onDegrees={(limitDegrees) => set({ limitDegrees })}
            />
            <p className="detail">Use the limit from your surgeon or physiotherapist, also a brace limit.</p>
            {answers.limitKind === 'none' && <p className="detail">Before week 6, the app needs the number from your surgeon to add the heel slide.</p>}
          </>
        );
      case 'redFlags':
        return (
          <>
            <p className="lede">Tick each sentence that is true today.</p>
            <RedFlagChecklist ticked={answers.redFlags} onToggle={(id, on) => set({ redFlags: { ...answers.redFlags, [id]: on } })} />
          </>
        );
      case 'today':
        return (
          <div className="stack">
            <PainScale name="pain" value={answers.pain} onChange={(pain) => set({ pain })} />
            <SwellingChoice name="swelling" value={answers.swelling} onChange={(swelling) => set({ swelling })} />
          </div>
        );
      case 'clearance':
        return <ChoiceGroup name="clearance" legend={TITLES.clearance} value={answers.phaseClearance} choices={YES_NO_UNKNOWN} onChange={(v) => set({ phaseClearance: v as Answers['phaseClearance'] })} />;
      case 'summary':
        return (
          <ul className="answer-list" aria-label="Your answers">
            {steps.filter((s): s is Exclude<StepId, 'summary'> => s !== 'summary').map((s) => (
              <li key={s} className="answer-row">
                <div>
                  <p className="answer-label">{SUMMARY_LABELS[s]}</p>
                  <p className="answer-value">{s === 'surgeryDate' ? <span className="num">{valueText(s, answers)}</span> : valueText(s, answers)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Change ${CHANGE_LABELS[s]}`}
                  onClick={() => {
                    setFromSummary(true);
                    setStep(s);
                  }}
                >
                  Change
                </button>
              </li>
            ))}
          </ul>
        );
    }
  })();

  const summary = step === 'summary';
  return (
    <section aria-labelledby="question-title" className="narrow">
      <header className="page-head">
        <div className="stack-s">
          {!summary && <p className="detail">{`Question ${index + 1} of ${steps.length - 1}`}</p>}
          <h1 id="question-title" tabIndex={-1} ref={heading}>
            {TITLES[step]}
          </h1>
        </div>
      </header>
      <div className="stack">{body}</div>
      <div className="action-bar">
        {summary ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={makePlan}>
            Make my plan
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" disabled={!answered(step, answers, today)} onClick={goNext}>
            Next
            <Icon name="chevron-right" size={20} />
          </button>
        )}
        <button type="button" className="btn btn-lg" onClick={goBack}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
      </div>
    </section>
  );
}
