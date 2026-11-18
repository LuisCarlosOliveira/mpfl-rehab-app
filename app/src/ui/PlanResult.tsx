// The plan that the app made, before the person confirms it. Nothing is saved on this screen.
// Every number comes from the generator output. "Why this plan" lists each rule with its sources, its evidence level
// and its population caveat, and the values that stay "Ask your surgeon" with the reason.
import { GENERATED_BANNER } from '../lib/mode';
import { answerLines, countStartText, doseScope, HOLD_TIME_LINE, monitorLine, PLAN_NAMES, whyView, type PlanDraft } from '../lib/planView';
import { NO_NUMBER, RULES } from '../lib/protocolGen';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { prescription } from './Home';
import { PlanLines } from './HomeExercises';
import { SourceNote, SourceNotes } from './SourceNote';
import './screensV2.css';

/** Why the heel slide is not in phase 1 without a limit. Sources: S1 and P3 (audit row V36). P1 starts it in phase 2 (V37 note). No number. */
const HEEL_NOT_ADDED =
  'Heel slide: not added. S1 and P3 start it in phase 1. P1 starts it later. The app adds it when you give the knee-bend limit of your surgeon (Update my plan).';

type PlanOnly = Extract<PlanDraft, { kind: 'plan' }>;

interface Props {
  draft: PlanOnly;
  onUse: () => void;
  onBack: () => void;
}

function WhyList({ entries, label, asks }: { entries: PlanOnly['why']; label: string; asks: boolean }) {
  return (
    <ul className="why-list" aria-label={label}>
      {entries.map((e) => {
        const v = whyView(e);
        return (
          <li key={v.id} className="why-entry">
            <details className="why-details">
              <summary>
                <span className="why-head">
                  <h3>{v.title}</h3>
                  {asks && v.ask !== null && <span className="chip chip-accent">{v.ask}</span>}
                  {v.needsReview && <span className="chip">A clinician has not reviewed this value.</span>}
                </span>
                <span className="chev">
                  <Icon name="chevron-down" />
                </span>
              </summary>
              <div className="why-body">
            <p>{v.text}</p>
            {v.noNumber !== null && (
              <>
                <p className="no-number">{NO_NUMBER}</p>
                {v.noNumber.words !== '' && <p className="detail">{v.noNumber.words}</p>}
              </>
            )}
            <dl className="facts">
              <div className="fact-row">
                <dt>Evidence</dt>
                <dd>{v.evidence}</dd>
              </div>
              <div className="fact-row">
                <dt>Population</dt>
                <dd>{v.population}</dd>
              </div>
              <div className="fact-row">
                <dt>Sources</dt>
                <dd>
                  {v.sources.map((s) => (
                    <span key={s} className="why-source">
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
              {v.conservative && (
                <div className="fact-row">
                  <dt>When sources disagree</dt>
                  <dd>{v.conservative}</dd>
                </div>
              )}
              {v.applied.length > 0 && (
                <div className="fact-row">
                  <dt>Values in your plan</dt>
                  <dd>
                    {v.applied.map((a) => (
                      <span key={a} className="why-source">
                        {a}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function PlanResult({ draft, onUse, onBack }: Props) {
  const { protocol, why, inputs } = draft;
  const phase = protocol.phases.find((p) => p.id === protocol.activePhase);
  const exercises = phase?.exercises ?? [];
  const made = why.filter((e) => e.outcome === 'generated');
  const left = why.filter((e) => e.outcome === 'refused');
  const hasHeel = exercises.some((e) => e.kind === 'heel-slide');
  const minLimit = RULES.ENG_TARGET.values.minLimit;
  const heelNote =
    inputs.surgeonLimit.kind === 'degrees'
      ? `Heel slide: the limit that you entered is below ${minLimit} degrees. The app adds the heel slide only from ${minLimit} degrees. Ask your care team.`
      : protocol.activePhase === 1
        ? HEEL_NOT_ADDED
        : 'Heel slide: ask your surgeon for a knee-bend limit. The app adds the heel slide only with that number.';
  const phaseOneStays = why.find((e) => e.ruleId === 'PH2' && e.outcome === 'refused');

  return (
    <section aria-labelledby="plan-title" className="narrow v2-screens">
      <header className="page-head">
        <h1 id="plan-title" tabIndex={-1}>
          Your plan
        </h1>
      </header>
      <div className="stack">
        <Notice role="note" icon="info">
          <p>{GENERATED_BANNER}</p>
        </Notice>

        <section className="stack-s" aria-labelledby="plan-phase">
          <h2 id="plan-phase">{phase ? `Phase ${phase.id} ${phase.name}` : `Phase ${protocol.activePhase}`}</h2>
          <ul className="plan-exercises dose-list" aria-label="Exercises in your plan">
            {exercises.map((e) => {
              const lines = prescription(e, true);
              // The first line is the dose (sets and reps, or sets, or the hold). The other lines stay under the name as plain text.
              const [dose, ...rest] = lines;
              return (
                <li key={e.kind} className="dose-row">
                  <p className="exercise-name dose-name">{PLAN_NAMES[e.kind]}</p>
                  {dose && <p className="dose">{dose.text}</p>}
                  {rest.length > 0 && (
                    <ul className="dose-notes">
                      {rest.map((line) => (
                        <li key={line.text}>{line.text}</li>
                      ))}
                    </ul>
                  )}
                  {monitorLine(e.kind) !== null && <p className="detail dose-note">{monitorLine(e.kind)}</p>}
                  {e.kind === 'seated-extension-hold' && e.holdSeconds === undefined && <p className="detail dose-note">{HOLD_TIME_LINE}</p>}
                  {e.targetFlexion !== undefined && e.kind !== 'seated-extension-hold' && <p className="detail dose-note">{countStartText(e.targetFlexion)}.</p>}
                </li>
              );
            })}
          </ul>
          <SourceNotes made={made.map((e) => e.ruleId)} scope={doseScope(protocol)} />
          {!hasHeel && (
            <Notice role="note" icon="info">
              <p>{heelNote}</p>
            </Notice>
          )}
          {phaseOneStays !== undefined && (
            <Notice role="note" icon="info">
              <p>{phaseOneStays.text}</p>
            </Notice>
          )}
          <PlanLines protocol={protocol} why={why} />
          <div className="range-reference">
              <SourceNote rule="RANGE_NONE" />
            </div>
          <p className="detail">Other doses and the next stage: ask your care team. Open Why this plan to see the source of each rule.</p>
        </section>

        <details className="card disclosure">
          <summary>
            <h2>Why this plan</h2>
            <span className="chip chip-accent">{made.length + left.length} rules</span>
            <span className="chev">
              <Icon name="chevron-down" />
            </span>
          </summary>
          <div className="disclosure-body stack">
            <div className="stack-s">
              <p className="why-group">Your answers</p>
              <ul className="why-answers" aria-label="Your answers">
                {answerLines(inputs).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="stack-s">
              <p className="why-group">Rules behind your plan</p>
              <WhyList entries={made} label="Rules behind your plan" asks={false} />
            </div>
            <div className="stack-s">
              <p className="why-group">Not in your plan, and why</p>
              <WhyList entries={left} label="Not in your plan, and why" asks />
            </div>
          </div>
        </details>
      </div>

      <div className="action-bar">
        <button type="button" className="btn btn-primary btn-lg" onClick={onUse}>
          Use this plan
        </button>
        <button type="button" className="btn btn-lg" onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
      </div>
    </section>
  );
}
