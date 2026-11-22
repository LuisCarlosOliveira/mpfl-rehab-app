import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  earlyReferral, emptyAnswers, fromInputs, GROUP_IDS, groupAnswered, groupOf, limitNumber, stepsFor, toInputs,
  type Answers, type GroupId, type StepId,
} from '../lib/onboarding';
import { draftOf, surgeryDateWords, type PlanDraft } from '../lib/planView';
import { generateProtocol, type GeneratorInputs } from '../lib/protocolGen';
import { ChoiceGroup, GATE_QUESTIONS, LimitChoice, RedFlagChecklist, SurgeryDateField, SwellingChoice, YES_NO, YES_NO_UNKNOWN } from './answerControls';
import { focusHeading } from './focusHeading';
import { Icon } from './Icon';
import { PainScale } from './PainScale';
import { Actions } from './v3/shellParts';
import { SessionProgress } from './v3/SessionProgress';
import './screensV2.css';
import './formsV3.css';

interface Props {
  today: string;
  initial?: GeneratorInputs | null;
  backRef?: MutableRefObject<(() => boolean) | null>;
  onDone: (draft: PlanDraft) => void;
  onCancel: () => void;
}

const TITLES = {
  writtenPlan: 'Did your care team give you a written rehab plan?',
  procedure: 'Which operation did you have?',
  ageBand: 'How old are you?',
  bothKnees: 'Did you have surgery on both knees?',
  firstSurgery: 'Is this your first MPFL surgery on this knee?',
  specialRules: 'Did your surgeon give special rules, for example about the graft, the fixation or the shape of your knee?',
  side: 'Which knee did you have surgery on?',
  limit: 'Did your surgeon give a limit for how far you can bend your knee, also with a brace?',
  redFlags: 'Do any of these apply today?',
  clearance: 'Has your surgeon or physiotherapist said that you can start the next stage?',
  walking: GATE_QUESTIONS.walking,
  legRaise: GATE_QUESTIONS.legRaise,
  seatedHold: GATE_QUESTIONS.seatedHold,
} as const;

const GROUP_PAGES: Record<GroupId, { title: string; intro: string; next: string }> = {
  about: { title: 'You and your surgery', intro: 'The app keeps your answers on this device.', next: 'Continue to your surgeon' },
  surgeon: { title: 'Your surgeon', intro: 'Use what your surgeon or physiotherapist told you.', next: 'Continue to today' },
  today: { title: 'How are you today?', intro: 'Last step. Then you can check your answers.', next: 'Check my answers' },
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
  walking: 'the walking answer',
  legRaise: 'the leg raise answer',
  seatedHold: 'the seated exercise answer',
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
  walking: 'Walking without crutches',
  legRaise: 'Leg raise with a straight knee',
  seatedHold: 'Knee straightening while you sit, said by your surgeon',
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

function valueText(step: Exclude<StepId, 'summary'>, a: Answers, today: string): string {
  switch (step) {
    case 'writtenPlan': case 'firstSurgery': case 'specialRules':
      return word(a[step]);
    case 'clearance': return word(a.phaseClearance);
    case 'walking': return word(a.walksWithoutCrutches);
    case 'legRaise': return word(a.legRaiseStraight);
    case 'seatedHold': return word(a.seatedHoldCleared);
    case 'procedure': return PROCEDURES.find((p) => p.value === a.procedure)?.label ?? '';
    case 'ageBand': return AGES.find((p) => p.value === a.ageBand)?.label ?? '';
    case 'bothKnees': return a.bothKnees ? 'Yes' : 'No';
    case 'surgeryDate': return surgeryDateWords(a.surgeryDate, today) ?? '';
    case 'side': return a.side === 'left' ? 'Left' : 'Right';
    case 'limit': return a.limitKind === 'degrees' ? `${limitNumber(a.limitDegrees)} degrees` : a.limitKind === 'none' ? 'No limit' : 'I do not know';
    case 'redFlags': {
      const n = Object.values(a.redFlags).filter(Boolean).length;
      return n === 0 ? 'None ticked' : `${n} ticked`;
    }
    case 'today': return `Pain ${a.pain} out of 10, ${SWELLING_TEXT[a.swelling ?? 'none'].toLowerCase()}`;
  }
}

export function Onboarding({ today, initial = null, backRef, onDone, onCancel }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => (initial ? fromInputs(initial, today) : emptyAnswers()));
  const [step, setStep] = useState<GroupId | 'summary'>(initial ? 'summary' : 'about');
  const [fromSummary, setFromSummary] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    focusHeading(heading.current);
  }, [step]);

  const steps = stepsFor(answers, today);
  const index = step === 'summary' ? GROUP_IDS.length : GROUP_IDS.indexOf(step);
  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));

  function goNext() {
    if (step === 'about' || step === 'surgeon') {
      const referral = earlyReferral(answers, today);
      if (referral) {
        onDone(draftOf(referral, 'create', null));
        return;
      }
    }
    if (fromSummary) {
      const open = GROUP_IDS.find((g) => !groupAnswered(g, answers, today));
      setStep(open ?? 'summary');
      if (open === undefined) setFromSummary(false);
      return;
    }
    setStep(GROUP_IDS[index + 1] ?? 'summary');
  }

  function goBack() {
    if (fromSummary) {
      setStep('summary');
      setFromSummary(false);
    } else if (index === 0) onCancel();
    else setStep(GROUP_IDS[index - 1] as GroupId);
  }

  useEffect(() => {
    if (!backRef) return;
    backRef.current = () => {
      if (index === 0 && !fromSummary) return false;
      goBack();
      return true;
    };
    return () => {
      backRef.current = null;
    };
  });

  function makePlan() {
    const inputs = toInputs(answers, today);
    if (inputs === null) return;
    onDone(draftOf(generateProtocol(inputs, today), 'create', inputs));
  }

  const yn = (name: keyof typeof TITLES, value: string | null, onChange: (v: string) => void, choices = YES_NO_UNKNOWN) => (
    <ChoiceGroup key={name} name={name} legend={TITLES[name]} row value={value} choices={choices} onChange={onChange} />
  );

  const body = (() => {
    switch (step) {
      case 'about':
        return (
          <>
            {yn('writtenPlan', answers.writtenPlan, (v) => set({ writtenPlan: v as Answers['writtenPlan'] }))}
            <ChoiceGroup name="procedure" legend={TITLES.procedure} value={answers.procedure} choices={PROCEDURES} onChange={(v) => set({ procedure: v as Answers['procedure'] })} />
            <p className="detail">Your discharge letter names the operation. If you are not sure, choose I do not know.</p>
            <p className="detail">
              Another procedure can be a bone cut below the kneecap (tibial tubercle osteotomy), groove reshaping (trochleoplasty), cartilage repair, or a release or
              lengthening of the outer tissue.
            </p>
            <ChoiceGroup name="ageBand" legend={TITLES.ageBand} row value={answers.ageBand} choices={AGES} onChange={(v) => set({ ageBand: v as Answers['ageBand'] })} />
            {yn('bothKnees', answers.bothKnees === null ? null : answers.bothKnees ? 'yes' : 'no', (v) => set({ bothKnees: v === 'yes' }), YES_NO)}
            {yn('firstSurgery', answers.firstSurgery, (v) => set({ firstSurgery: v as Answers['firstSurgery'] }))}
            {yn('specialRules', answers.specialRules, (v) => set({ specialRules: v as Answers['specialRules'] }))}
          </>
        );
      case 'surgeon':
        return (
          <>
            <SurgeryDateField value={answers.surgeryDate} today={today} onChange={(surgeryDate) => set({ surgeryDate })} />
            <p className="detail">The app keeps this date on this device only. It uses the date to count the weeks since surgery.</p>
            <ChoiceGroup name="side" legend={TITLES.side} row value={answers.side} choices={SIDES} onChange={(v) => set({ side: v as Answers['side'] })} />
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
      case 'today':
        return (
          <>
            <fieldset className="v3-choice">
              <legend>{TITLES.redFlags}</legend>
              <p className="lede">Tick each sentence that is true today.</p>
              <RedFlagChecklist ticked={answers.redFlags} onToggle={(id, on) => set({ redFlags: { ...answers.redFlags, [id]: on } })} />
            </fieldset>
            <PainScale name="pain" value={answers.pain} onChange={(pain) => set({ pain })} />
            <SwellingChoice name="swelling" value={answers.swelling} onChange={(swelling) => set({ swelling })} />
            {steps.includes('clearance') && yn('clearance', answers.phaseClearance, (v) => set({ phaseClearance: v as Answers['phaseClearance'] }))}
            {steps.includes('walking') && (
              <>
                {yn('walking', answers.walksWithoutCrutches, (v) => set({ walksWithoutCrutches: v as Answers['walksWithoutCrutches'] }))}
                {yn('legRaise', answers.legRaiseStraight, (v) => set({ legRaiseStraight: v as Answers['legRaiseStraight'] }))}
                {yn('seatedHold', answers.seatedHoldCleared, (v) => set({ seatedHoldCleared: v as Answers['seatedHoldCleared'] }))}
              </>
            )}
          </>
        );
      case 'summary':
        return (
          <ul className="answer-list" aria-label="Your answers">
            {steps.filter((s): s is Exclude<StepId, 'summary'> => s !== 'summary').map((s) => (
              <li key={s} className="answer-row">
                <div>
                  <p className="answer-label">{SUMMARY_LABELS[s]}</p>
                  <p className="answer-value">{s === 'surgeryDate' ? <span className="num">{valueText(s, answers, today)}</span> : valueText(s, answers, today)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Change ${CHANGE_LABELS[s]}`}
                  onClick={() => {
                    setFromSummary(true);
                    setStep(groupOf(s));
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
  const page = summary ? null : GROUP_PAGES[step];
  return (
    <section aria-labelledby="question-title" className="v3 v3-screen v2-screens v3-questions">
      <div className="v3-cols">
        <header className="v3-formhead">
          {page && <SessionProgress total={GROUP_IDS.length} current={index + 1} unit="Step" />}
          <h1 id="question-title" tabIndex={-1} ref={heading}>
            {page ? page.title : 'Check your answers'}
          </h1>
          {page && <p className="lede">{page.intro}</p>}
        </header>
        <div className="v3-fields">{body}</div>
      </div>
      <Actions label="Question buttons">
        <div className="v3-btnrow">
          <button type="button" className="btn btn-lg btn-back" onClick={goBack}>
            <Icon name="arrow-left" size={18} />
            Back
          </button>
          {page ? (
            <button type="button" className="btn btn-primary btn-lg" disabled={!groupAnswered(step as GroupId, answers, today)} onClick={goNext}>
              {page.next}
              <Icon name="chevron-right" size={20} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={makePlan}>
              Make my plan
            </button>
          )}
        </div>
      </Actions>
    </section>
  );
}
