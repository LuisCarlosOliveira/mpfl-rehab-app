// Progress charts (FR13). The same component serves the patient and the care team view:
// the caller passes the sessions. Source of the wording: research/ux-flow.md section 3.4.
// Every chart has a data table with the same numbers, built by toTableRows. A chart has no
// line for a limit and no colour that carries a meaning. Nothing moves.
// An angle chart shows the camera error as a pale band around the values (U16). The band is not a range to reach.
import { useId, useState, type MouseEvent, type ReactNode } from 'react';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { buildProgressSeries, sortByDate, toTableRows, type ProgressSeries, type TableRow } from '../lib/progress';
import { MARGIN_DEG } from '../lib/margin';
import type { SessionRecord } from '../lib/storage';
import { Icon } from './Icon';
import { ANGLE_LABEL, EXERCISE_NAMES } from './labels';
import './dashboard.css';
import './screensV2.css';

const CHART_WIDTH = 480;
const CHART_HEIGHT = 300;
const MARGIN = { top: 12, right: 28, bottom: 36, left: 40 };

export interface ChartPoint {
  label: string;
  value: number | null;
  /** The value minus and plus the camera error of that session. Only angle charts have it. null when the value is missing. */
  band?: [number, number] | null;
  /** The camera error of that session, in degrees. Only angle charts have it. */
  margin?: number;
}
export interface ChartSeries {
  title: string;
  kind: 'line' | 'bar';
  yLabel: string;
  yDomain: [number, number | 'auto'];
  /** Fixed tick values. Without it the axis picks them. */
  yTicks?: number[];
  whenHeader: string;
  /** What one point is, for the line under the title. */
  noun: { one: string; many: string };
  /** An angle chart carries the band of the camera error. */
  angle: boolean;
  data: ChartPoint[];
}

const SESSIONS = { one: 'session', many: 'sessions' };
const DAYS = { one: 'day', many: 'days' };

/** The top of a value axis, so that three ticks (0, middle, top) land on whole numbers. */
const axisTop = (highest: number, step: number) => Math.max(step, Math.ceil(highest / step) * step);
const threeTicks = (top: number) => [0, top / 2, top];
const known = (values: (number | null)[]) => values.filter((v): v is number => v !== null);

/** What the charts draw. The values are the ones of the series, so the table can show the same numbers.
 *  `sessions` gives the camera error that each session stored, for the band of an angle chart. */
export function chartSeries(series: ProgressSeries, sessions: readonly SessionRecord[] = []): ChartSeries[] {
  const peaks = series.peakFlexion.map<ChartSeries>((s) => {
    const data = s.points.map<ChartPoint>((p) => {
      const margin = sessions.find((x) => x.id === p.sessionId)?.marginDeg ?? MARGIN_DEG;
      return { label: p.date.slice(0, 10), value: p.degrees, margin, band: p.degrees === null ? null : [Math.max(0, p.degrees - margin), p.degrees + margin] };
    });
    const top = axisTop(Math.max(0, ...data.map((d) => d.band?.[1] ?? 0)), 10);
    return { title: s.title, kind: 'line', yLabel: 'degrees', yDomain: [0, top], yTicks: threeTicks(top), whenHeader: 'Session (UTC)', noun: SESSIONS, angle: true, data };
  });
  const repsData = series.repsPerDay.points.map((p) => ({ label: p.day, value: p.reps }));
  const repsTop = axisTop(Math.max(0, ...known(repsData.map((d) => d.value))), 2);
  const reps: ChartSeries = {
    title: series.repsPerDay.title,
    kind: 'bar',
    yLabel: 'reps',
    yDomain: [0, repsTop],
    yTicks: threeTicks(repsTop),
    whenHeader: 'Day (UTC)',
    noun: DAYS,
    angle: false,
    data: repsData,
  };
  const pain: ChartSeries = {
    title: series.pain.title,
    kind: 'line',
    yLabel: 'pain, 0 to 10',
    yDomain: [0, 10],
    yTicks: [0, 5, 10],
    whenHeader: 'Session (UTC)',
    noun: SESSIONS,
    angle: false,
    data: series.pain.points.map((p) => ({ label: p.date.slice(0, 10), value: p.pain })),
  };
  return [...peaks, reps, pain];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-11-08" as "8 Nov". With the year, "8 Nov 2026". */
const dayText = (iso: string, year = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]}${year ? ` ${y}` : ''}`;
};

/** A number for display with one decimal at most, so a raw value like 126.199999 shows as 126.2. A value that is not a number gives an empty text. */
export const roundTo1 = (n: number): string => (Number.isFinite(n * 10) ? String(Math.round(n * 10) / 10) : '');

/** The text of a table row for display. The numbers inside it get one decimal at most. */
const shown = (text: string) => (/NaN|Infinity|undefined/.test(text) ? 'No value' : text).replace(/-?\d+\.\d{2,}/g, (m) => roundTo1(Number(m)));

/** The camera errors that the sessions stored: "9", or "6 to 9". */
function marginText(data: ChartPoint[]): string {
  const margins = data.flatMap((d) => (d.margin === undefined ? [] : [d.margin]));
  const low = Math.min(...margins);
  const high = Math.max(...margins);
  return low === high ? `${high}` : `${low} to ${high}`;
}

/** A timestamp as "2026-11-01 10:00". A day stays a day. */
const whenText = (when: string) => (when.length === 10 ? when : when.slice(0, 16).replace('T', ' '));

/** Facts only: how many values, the lowest, the highest and the last. No word about a trend. */
function summaryText(rows: TableRow[]): string {
  const known = rows.filter((r) => r.value !== null);
  if (known.length === 0) return 'No values.';
  const byValue = [...known].sort((a, b) => (a.value as number) - (b.value as number));
  return `${known.length} ${known.length === 1 ? 'value' : 'values'}. Lowest ${shown(byValue[0]!.valueText)}. Highest ${shown(byValue[byValue.length - 1]!.valueText)}. Last ${shown(known[known.length - 1]!.valueText)}.`;
}

/** A table box that a keyboard user can scroll. */
export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

function ChartBlock({ chart, rows }: { chart: ChartSeries; rows: TableRow[] }) {
  const id = useId();
  const [picked, setPicked] = useState<number | null>(null);
  const titleId = `${id}-title`;
  const summaryId = `${id}-summary`;
  const labels = chart.data.map((d) => d.label);
  const ends = [...new Set([labels[0], labels[labels.length - 1]])].filter((l): l is string => l !== undefined);
  const xAxis = (
    <XAxis dataKey="label" ticks={ends} tickFormatter={(v: string) => dayText(v)} interval={0} label={{ value: 'Date', position: 'insideBottom', offset: -22 }} />
  );
  const yAxis = <YAxis domain={chart.yDomain} ticks={chart.yTicks} allowDecimals={false} label={{ value: chart.yLabel, angle: -90, position: 'insideLeft', offset: 8 }} />;
  // A tap on the chart picks one point. Before a tap, the read-out shows the last value.
  const lastIndex = rows.reduce((at, r, i) => (r.value !== null ? i : at), -1);
  const pickedRow = picked !== null && rows[picked]?.value != null ? picked : lastIndex;
  const lastKnown = pickedRow >= 0 ? rows[pickedRow] : undefined;
  // The chart is scaled by CSS, so Recharts cannot map a tap to a point. The tap goes to the nearest drawn mark instead.
  // Marks are drawn for the values that exist, in order, so the Nth mark is the Nth row with a value.
  const withValue = rows.flatMap((r, i) => (r.value !== null ? [i] : []));
  const onPick = (event: MouseEvent<HTMLDivElement>) => {
    const marks = [...event.currentTarget.querySelectorAll('.recharts-line-dots .recharts-dot, .recharts-bar-rectangle')];
    let best = -1;
    let gap = Infinity;
    marks.forEach((m, j) => {
      const box = m.getBoundingClientRect();
      const far = Math.abs(box.left + box.width / 2 - event.clientX);
      if (far < gap) {
        gap = far;
        best = j;
      }
    });
    const row = withValue[best];
    if (row !== undefined) setPicked(row);
  };
  const common = { width: CHART_WIDTH, height: CHART_HEIGHT, data: chart.data, margin: MARGIN, accessibilityLayer: false };
  // One point makes no area, and Recharts then draws a stray dot. The caption still names the error.
  const bandDrawn = chart.data.filter((d) => d.band).length >= 2;
  const noun = rows.length === 1 ? chart.noun.one : chart.noun.many;

  return (
    <section className="dash-chart" aria-labelledby={titleId}>
      <h2 id={titleId}>{chart.title}</h2>
      {rows.length > 0 && (
        <p className="dash-range">
          {rows.length} {noun}, {dayText(rows[0]!.when.slice(0, 10), true)} to {dayText(rows[rows.length - 1]!.when.slice(0, 10), true)}
        </p>
      )}
      <p className="dash-last" aria-hidden="true">
        {lastKnown ? <data value={typeof lastKnown.value === 'number' && Number.isFinite(lastKnown.value) ? lastKnown.value : undefined}>{shown(lastKnown.valueText)}</data> : null}
      </p>
      {lastKnown && (
        <p className="dash-readout" aria-live="polite">
          {dayText(lastKnown.when.slice(0, 10), true)}
          {chart.angle ? ', estimated' : ''}
        </p>
      )}
      <p id={summaryId} className="dash-note">
        {summaryText(rows)}
      </p>
      {/* The tap is an extra way to read one value. The table below the chart holds every value for a keyboard or a screen reader. */}
      <div className="dash-chart-box" role="img" aria-labelledby={titleId} aria-describedby={summaryId} onClick={onPick}>
        {chart.kind === 'line' ? (
          <ComposedChart {...common}>
            <CartesianGrid vertical={false} />
            {xAxis}
            {yAxis}
            {bandDrawn && <Area dataKey="band" stroke="none" dot={false} activeDot={false} connectNulls={false} isAnimationActive={false} />}
            <Line dataKey="value" dot={{ r: 5 }} activeDot={false} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        ) : (
          <BarChart {...common}>
            <CartesianGrid vertical={false} />
            {xAxis}
            {yAxis}
            <Bar dataKey="value" isAnimationActive={false} />
          </BarChart>
        )}
      </div>
      {chart.angle && (
        <p className="dash-band-note">
          Camera error, estimated: about {marginText(chart.data)} degrees (best case, from still photos of healthy people). Not measured for this model.
        </p>
      )}
      <TableScroll label={`Data table: ${chart.title}`}>
        <table className="data-table" aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">{chart.whenHeader}</th>
              <th scope="col" className="num-cell">
                Value
              </th>
              {chart.angle && (
                <th scope="col" className="num-cell">
                  Camera error range
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const band = chart.data[i]?.band;
              return (
                <tr key={i}>
                  <td>{whenText(r.when)}</td>
                  <td className="num-cell">{shown(r.valueText)}</td>
                  {chart.angle && <td className="num-cell">{band && roundTo1(band[0]) !== '' && roundTo1(band[1]) !== '' ? `${roundTo1(band[0])} to ${roundTo1(band[1])} degrees` : 'no value'}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>
    </section>
  );
}

/** Said in place of a chart for the straight leg raise. No number, no chart. The number stays in the record, the export and the care team view. */
export const SLR_NOT_DRAWN = 'The angle at the top of a straight leg raise is saved for your care team. The app does not draw it.';

/** The charts with their tables, with no heading of their own. The care team view uses this part.
 *  `slrNote` puts one plain line where a straight leg raise chart would be (after the peak bend charts). Your sessions sets it. */
export function DashboardCharts({ sessions, slrNote = false }: { sessions: readonly SessionRecord[]; slrNote?: boolean }) {
  const series = buildProgressSeries(sessions);
  const rows = toTableRows(series);
  const charts = chartSeries(series, sessions);
  const peaks = series.peakFlexion.length;
  const block = (chart: ChartSeries) => <ChartBlock key={chart.title} chart={chart} rows={rows.filter((r) => r.series === chart.title)} />;
  return (
    <div className="chart-list">
      {charts.slice(0, peaks).map(block)}
      {slrNote && <p className="detail">{SLR_NOT_DRAWN}</p>}
      {charts.slice(peaks).map(block)}
    </div>
  );
}

/** The plain name of an exercise. A stored name that is not one of the known names shows as text, and never reads a property of the name table. */
const exerciseName = (kind: string) => (Object.hasOwn(EXERCISE_NAMES, kind) ? EXERCISE_NAMES[kind as keyof typeof EXERCISE_NAMES] : kind);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const isDay = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso);

/** The numbers above the charts. Every value comes from the stored sessions. No total and no word about a trend. */
function StatStrip({ sessions }: { sessions: readonly SessionRecord[] }) {
  const ordered = sortByDate(sessions);
  // The straight leg raise has no angle chart, so its peak is not the last peak either.
  const lastPeak = [...ordered].reverse().find((x) => x.exercise !== 'straight-leg-raise' && typeof x.peakFlexion === 'number' && roundTo1(x.peakFlexion) !== '');
  const days = ordered.map((x) => x.date.slice(0, 10)).filter(isDay);
  const first = days[0];
  const last = days[days.length - 1];
  const range = first === undefined || last === undefined ? '' : first === last ? `, ${dayText(first, true)}` : `, ${dayText(first, true)} to ${dayText(last, true)}`;
  const kinds = [...new Set(ordered.map((x) => String(x.exercise)))];
  const known = Object.keys(EXERCISE_NAMES);
  kinds.sort((a, b) => (known.indexOf(a) + 1 || 99) - (known.indexOf(b) + 1 || 99));
  return (
    <>
      <div className="stat-strip">
        <p className="stat-label">Last peak knee bend</p>
        {lastPeak ? (
          <p className="stat-value">
            <data className="stat-number" value={lastPeak.peakFlexion as number}>
              {roundTo1(lastPeak.peakFlexion as number)}
            </data>
            <span className="stat-unit">degrees</span>
          </p>
        ) : (
          <p className="stat-value">
            <span className="stat-none">No value</span>
          </p>
        )}
        {lastPeak && (
          <p className="stat-note">
            {exerciseName(String(lastPeak.exercise))}. {ANGLE_LABEL}
          </p>
        )}
        <p className="stat-range">
          {plural(ordered.length, 'session')}
          {range}
        </p>
      </div>
      <ul className="legend-list" aria-label="Exercises in your sessions">
        {kinds.map((kind) => {
          const mine = ordered.filter((x) => String(x.exercise) === kind);
          const withReps = mine.filter((x) => typeof x.reps === 'number' && Number.isFinite(x.reps));
          const reps = withReps.reduce((sum, x) => sum + (x.reps as number), 0);
          return (
            <li key={kind} className="legend-row">
              <span className="legend-name">{exerciseName(kind)}</span>
              <span className="legend-count">
                {plural(mine.length, 'session')}
                {withReps.length > 0 && Number.isFinite(reps) ? `, ${plural(reps, 'rep')}` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

interface Props {
  sessions: readonly SessionRecord[];
  title?: string;
  /** The number of stored rows that failed the schema and are left out. The line shows only when it is more than 0. */
  skipped?: number;
  onBack: () => void;
}

export function Dashboard({ sessions, title = 'Your sessions', skipped = 0, onBack }: Props) {
  return (
    <section aria-labelledby="dashboard-title" className="v2-screens v2-sessions">
      <header className="page-head">
        <h1 id="dashboard-title" tabIndex={-1}>
          {title}
        </h1>
        <button type="button" className="btn" onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          Back
        </button>
      </header>
      {Number.isInteger(skipped) && skipped > 0 && (
        <p className="detail" role="status">
          {skipped === 1 ? '1 saved row could not be read and is left out.' : `${skipped} saved rows could not be read and are left out.`}
        </p>
      )}
      {sessions.length === 0 ? (
        <div className="empty">
          <Icon name="chart-line" size={44} />
          <p className="empty-title">0 sessions</p>
          <p>No sessions yet. Start an exercise on Home and save it. Your charts show here.</p>
        </div>
      ) : (
        <div className="stack">
          <StatStrip sessions={sessions} />
          <p className="lede dash-lede">These numbers are a webcam estimate. Send the file to your care team. They decide any change to your plan.</p>
          <DashboardCharts sessions={sessions} slrNote={sessions.some((s) => s.exercise === 'straight-leg-raise')} />
        </div>
      )}
    </section>
  );
}
