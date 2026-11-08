// Progress charts (FR13). The same component serves the patient and the care team view:
// the caller passes the sessions. Source of the wording: research/ux-flow.md section 3.4.
// Every chart has a data table with the same numbers, built by toTableRows. A chart has no
// target line and no colour that carries a meaning. Nothing moves.
import { useId, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { buildProgressSeries, toTableRows, type ProgressSeries, type TableRow } from '../lib/progress';
import type { SessionRecord } from '../lib/storage';
import './dashboard.css';

const CHART_WIDTH = 480;
const CHART_HEIGHT = 300;
const MARGIN = { top: 12, right: 28, bottom: 36, left: 40 };

export interface ChartPoint {
  label: string;
  value: number | null;
}
export interface ChartSeries {
  title: string;
  kind: 'line' | 'bar';
  yLabel: string;
  yDomain: [number, number | 'auto'];
  whenHeader: string;
  data: ChartPoint[];
}

/** What the charts draw. The values are the ones of the series, so the table can show the same numbers. */
export function chartSeries(series: ProgressSeries): ChartSeries[] {
  const peaks = series.peakFlexion.map<ChartSeries>((s) => ({
    title: s.title,
    kind: 'line',
    yLabel: 'degrees',
    yDomain: [0, 'auto'],
    whenHeader: 'Session (UTC)',
    data: s.points.map((p) => ({ label: p.date.slice(0, 10), value: p.degrees })),
  }));
  const reps: ChartSeries = {
    title: series.repsPerDay.title,
    kind: 'bar',
    yLabel: 'reps',
    yDomain: [0, 'auto'],
    whenHeader: 'Day (UTC)',
    data: series.repsPerDay.points.map((p) => ({ label: p.day, value: p.reps })),
  };
  const pain: ChartSeries = {
    title: series.pain.title,
    kind: 'line',
    yLabel: 'pain, 0 to 10',
    yDomain: [0, 10],
    whenHeader: 'Session (UTC)',
    data: series.pain.points.map((p) => ({ label: p.date.slice(0, 10), value: p.pain })),
  };
  return [...peaks, reps, pain];
}

/** A timestamp as "2026-11-01 10:00". A day stays a day. */
const whenText = (when: string) => (when.length === 10 ? when : when.slice(0, 16).replace('T', ' '));

/** Facts only: how many values, the lowest, the highest and the last. No word about a trend. */
function summaryText(rows: TableRow[]): string {
  const known = rows.filter((r) => r.value !== null);
  if (known.length === 0) return 'No values.';
  const byValue = [...known].sort((a, b) => (a.value as number) - (b.value as number));
  return `${known.length} values. Lowest ${byValue[0]!.valueText}. Highest ${byValue[byValue.length - 1]!.valueText}. Last ${known[known.length - 1]!.valueText}.`;
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
  const titleId = `${id}-title`;
  const summaryId = `${id}-summary`;
  const xAxis = <XAxis dataKey="label" interval="preserveStartEnd" label={{ value: 'Date', position: 'insideBottom', offset: -22 }} />;
  const yAxis = <YAxis domain={chart.yDomain} allowDecimals={false} label={{ value: chart.yLabel, angle: -90, position: 'insideLeft', offset: 8 }} />;
  const common = { width: CHART_WIDTH, height: CHART_HEIGHT, data: chart.data, margin: MARGIN, accessibilityLayer: false };

  return (
    <section className="dash-chart" aria-labelledby={titleId}>
      <h2 id={titleId}>{chart.title}</h2>
      <p id={summaryId} className="dash-note">
        {summaryText(rows)}
      </p>
      <div className="dash-chart-box" role="img" aria-labelledby={titleId} aria-describedby={summaryId}>
        {chart.kind === 'line' ? (
          <LineChart {...common}>
            <CartesianGrid vertical={false} />
            {xAxis}
            {yAxis}
            <Line dataKey="value" dot={{ r: 5 }} activeDot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        ) : (
          <BarChart {...common}>
            <CartesianGrid vertical={false} />
            {xAxis}
            {yAxis}
            <Bar dataKey="value" isAnimationActive={false} />
          </BarChart>
        )}
      </div>
      <TableScroll label={`Data table: ${chart.title}`}>
        <table className="data-table" aria-labelledby={titleId}>
          <thead>
            <tr>
              <th scope="col">{chart.whenHeader}</th>
              <th scope="col" className="num-cell">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{whenText(r.when)}</td>
                <td className="num-cell">{r.valueText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </section>
  );
}

/** The charts with their tables, with no heading of their own. The care team view uses this part. */
export function DashboardCharts({ sessions }: { sessions: readonly SessionRecord[] }) {
  const series = buildProgressSeries(sessions);
  const rows = toTableRows(series);
  return (
    <>
      {chartSeries(series).map((chart) => (
        <ChartBlock key={chart.title} chart={chart} rows={rows.filter((r) => r.series === chart.title)} />
      ))}
    </>
  );
}

interface Props {
  sessions: readonly SessionRecord[];
  title?: string;
  onBack: () => void;
}

export function Dashboard({ sessions, title = 'Progress', onBack }: Props) {
  return (
    <section aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" tabIndex={-1}>
        {title}
      </h1>
      <div className="actions">
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
      </div>
      {sessions.length === 0 ? (
        <p>No sessions yet. Do a session and save it. Your charts will show here.</p>
      ) : (
        <>
          <p>These numbers are a webcam estimate. Send the file to your care team. They decide any change to your plan.</p>
          <DashboardCharts sessions={sessions} />
        </>
      )}
    </section>
  );
}
