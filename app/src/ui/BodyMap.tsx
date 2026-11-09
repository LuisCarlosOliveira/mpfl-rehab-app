// The body map (U1, U2). One svg layer over the camera picture, drawn from the landmark numbers.
// The app never copies a frame: no canvas, no video read, no pixel. The svg is the same box as the picture.
// Frames arrive through BodyMapHandle.update(). It writes svg attributes through refs and sets no React state.
// The map shows no rating and no verdict colour. It never changes class or colour with the angle.
// The chosen leg is bold with a dark outline. The other leg is dashed. A joint below the visibility gate gets a label such as
// "Ankle not seen" in the top corner, with no ring and no line at the place that the model guesses: a mark away from the person
// would mislead (live frames of clip 05 and 06). The bones to that joint are hidden. The names and the gate are the ones of the
// setup rules (src/lib/setupRules.ts).
//
// Place it in a screen like this (one line each):
//   const map = useRef<BodyMapHandle>(null);
//   inside the frame that holds the video:  <BodyMap ref={map} leg={leg} mirrored={PREVIEW_MIRRORED} />  and give the video className={`preview ${mirrorClass(PREVIEW_MIRRORED)}`}
//   next to the frame:                      <BodyMapSwitch />
//   in the frame callback:                  map.current?.update(landmarks, timeMs, source.aspect());
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { MIN_VISIBILITY, flexion, kneeAngle, type Landmark, type Side } from '../lib/angle';

/** The preview is not mirrored. The picture and the map take their mirror from this one value. */
export const PREVIEW_MIRRORED = false;
export const mirrorClass = (mirrored: boolean): string => (mirrored ? 'mirrored' : '');

export interface BodyMapHandle {
  /** Draw the newest landmarks. Give null when no pose is found. `aspect` is video width divided by height. */
  update(landmarks: Landmark[] | null, timeMs: number, aspect?: number): void;
}

interface Props {
  /** The leg that the person chose. */
  leg: Side;
  /** Give the same value as the picture. */
  mirrored?: boolean;
}

// Landmark ids of MediaPipe. A leg is hip, knee, ankle and foot index.
const LEG_IDS: Record<Side, readonly [number, number, number, number]> = { left: [23, 25, 27, 31], right: [24, 26, 28, 32] };
const SOFT: readonly (readonly [number, number])[] = [[11, 12], [11, 23], [12, 24], [23, 24], [11, 13], [13, 15], [12, 14], [14, 16]];
const SIDES: readonly Side[] = ['left', 'right'];
const JOINT_NAMES = ['Hip', 'Knee', 'Ankle'] as const;
const LOST_HOLD_MS = 500; // a joint must stay below the gate this long before the map shows it as not seen: no blink
const H = 1000; // view box height. The width is the aspect times H.
const DEFAULT_ASPECT = 16 / 9;
// ENGINEERING, not clinical. Measured on 7 real clips in the real app (docs/live-test/skeleton-validation.md): a point leaves its place for one
// update and comes back (11 times in 200 s at 6 updates each second, 22 times at 17 updates each second, 3 to 15 percent of the picture width). A point that is further than this fraction of
// the width from where a steady move would put it waits, up to MAX_HOLD updates. If the later updates agree, it is drawn. If not, it was a spike.
const SPIKE_FRACTION = 0.02;
const MAX_HOLD = 2; // ENGINEERING. Some spikes last two updates (a point on the other leg for 170 ms). A real jump, such as a cut, waits at most this many updates.
// ENGINEERING. A text sits on the inner side of the picture. It changes side only when the point is this far past the middle, so it does not hop.
const SIDE_BAND = 0.06;
const POINT_IDS: readonly number[] = [...new Set([...SOFT.flat(), ...LEG_IDS.left, ...LEG_IDS.right])];

const seen = (p: Landmark | undefined): p is Landmark => p !== undefined && (p.visibility ?? 1) >= MIN_VISIBILITY;
const r1 = (n: number) => Math.round(n * 10) / 10;

// The hide choice lasts for this page session only. It is not stored.
let hidden = false;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
const setHidden = (value: boolean) => {
  hidden = value;
  listeners.forEach((fn) => fn());
};
/** For tests: show the map again. */
export const resetBodyMapHidden = () => setHidden(false);
const useHidden = () => useSyncExternalStore(subscribe, () => hidden);

/** The switch "Hide body map". A real checkbox in a 48 px row. */
export function BodyMapSwitch() {
  const isHidden = useHidden();
  return (
    <label className="option body-map-switch">
      <input type="checkbox" checked={isHidden} onChange={(e) => setHidden(e.target.checked)} />
      <span>Hide body map</span>
    </label>
  );
}

export const BodyMap = forwardRef<BodyMapHandle, Props>(function BodyMap({ leg, mirrored = false }, ref) {
  const isHidden = useHidden();
  const svg = useRef<SVGSVGElement>(null);
  const els = useRef<Record<string, SVGElement>>({});
  const unit = useRef(1 / 0.4); // view box units for one screen pixel. The observer sets the real value.
  const aspect = useRef(DEFAULT_ASPECT);
  const lowSince = useRef<(number | null)[]>([null, null, null]);
  const track = useRef(new Map<number, { last: Landmark; prev: Landmark; held: number }>());
  const sides = useRef({ arc: 1, chosen: 1 });

  const layout = () => {
    const root = svg.current;
    if (!root) return;
    root.setAttribute('viewBox', `0 0 ${r1(aspect.current * H)} ${H}`);
    const box = root.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) unit.current = 1 / Math.min(box.width / (aspect.current * H), box.height / H);
    // Sizes that must stay the same on the screen, whatever the size of the picture: the joint circles and the outline of the labels.
    const px = unit.current;
    for (const side of SIDES) [0, 1, 2].forEach((j) => els.current[`${side}-j${j}`]?.setAttribute('r', String(r1((j === 1 ? 7 : 4.5) * px))));
    root.querySelectorAll('.bm-label').forEach((t) => t.setAttribute('stroke-width', String(r1(3.5 * px))));
  };

  useLayoutEffect(() => {
    const root = svg.current;
    els.current = {};
    if (!root) return;
    root.querySelectorAll<SVGElement>('[data-k]').forEach((el) => (els.current[el.dataset.k!] = el));
    lowSince.current = [null, null, null];
    layout();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(layout);
    observer.observe(root);
    return () => observer.disconnect();
  }, [isHidden, leg]);

  useImperativeHandle(
    ref,
    () => ({
      update(input, timeMs, aspectNow = DEFAULT_ASPECT) {
        let landmarks = input;
        const e = els.current;
        const root = svg.current;
        if (!root) return;
        if (aspectNow !== aspect.current) {
          aspect.current = aspectNow;
          layout();
        }
        const px = unit.current;
        const W = aspect.current * H;
        const show = (k: string, on: boolean) => e[k]?.setAttribute('display', on ? 'inline' : 'none');
        const at = (p: Landmark) => ({ x: r1(p.x * W), y: r1(p.y * H) });
        const line = (k: string, a: Landmark, b: Landmark) => {
          const el = e[k];
          if (!el) return;
          const p = at(a);
          const q = at(b);
          el.setAttribute('x1', String(p.x));
          el.setAttribute('y1', String(p.y));
          el.setAttribute('x2', String(q.x));
          el.setAttribute('y2', String(q.y));
        };
        const move = (k: string, p: { x: number; y: number }) => {
          e[k]?.setAttribute('cx', String(p.x));
          e[k]?.setAttribute('cy', String(p.y));
        };
        const innerSide = (key: 'arc' | 'chosen', x: number) => {
          const s = sides.current;
          if (s[key] === 1 && x > W * (0.5 + SIDE_BAND)) s[key] = -1;
          else if (s[key] === -1 && x < W * (0.5 - SIDE_BAND)) s[key] = 1;
          return s[key];
        };
        const text = (k: string, x: number, y: number, anchor: 'start' | 'end', size = 14) => {
          const el = e[k];
          if (!el) return;
          el.setAttribute('x', String(r1(x)));
          el.setAttribute('y', String(r1(y)));
          el.setAttribute('text-anchor', anchor);
          el.setAttribute('font-size', String(r1(size * px)));
        };

        // One spike filter for every point. It writes the steady place and leaves the visibility as it is.
        const steady = (id: number, p: Landmark): Landmark => {
          const t = track.current.get(id);
          if (!seen(p)) {
            track.current.delete(id);
            return p;
          }
          if (!t) {
            track.current.set(id, { last: p, prev: p, held: 0 });
            return p;
          }
          const from = (a: Landmark, b: Landmark) => Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);
          const expected = { x: 2 * t.last.x - t.prev.x, y: 2 * t.last.y - t.prev.y };
          const spike = Math.min(from(p, expected), from(p, t.last)) > SPIKE_FRACTION * W;
          if (spike && t.held < MAX_HOLD) {
            t.held += 1;
            return t.last;
          }
          t.held = 0;
          t.prev = t.last;
          t.last = p;
          return p;
        };

        if (!landmarks || landmarks.length < 33) {
          // Hide the groups only. The lines inside a bone group keep no display value of their own.
          Object.keys(e).forEach((k) => !/-[hc]$/.test(k) && e[k]!.setAttribute('display', 'none'));
          lowSince.current = [null, null, null];
          track.current.clear();
          return;
        }
        landmarks = landmarks.slice();
        for (const id of POINT_IDS) landmarks[id] = steady(id, landmarks[id]!);

        for (const [a, b] of SOFT) show(`soft-${a}-${b}`, seen(landmarks[a]) && seen(landmarks[b]));
        for (const [a, b] of SOFT) if (seen(landmarks[a]) && seen(landmarks[b])) line(`soft-${a}-${b}`, landmarks[a]!, landmarks[b]!);

        // How long each joint of the chosen leg has been below the gate.
        const chosen = LEG_IDS[leg].map((id) => landmarks[id]!);
        const lost = [0, 1, 2].map((j) => {
          if (seen(chosen[j])) {
            lowSince.current[j] = null;
            return false;
          }
          lowSince.current[j] ??= timeMs;
          return timeMs - (lowSince.current[j] as number) >= LOST_HOLD_MS;
        });

        for (const side of SIDES) {
          const pts = LEG_IDS[side].map((id) => landmarks[id]!);
          const mine = side === leg;
          for (let i = 0; i < 3; i++) {
            const a = pts[i]!;
            const b = pts[i + 1]!;
            const on = mine ? !lost[i] && !lost[i + 1] : seen(a) && seen(b);
            show(`${side}-${i}`, on);
            if (!on) continue;
            line(`${side}-${i}-h`, a, b);
            line(`${side}-${i}-c`, a, b);
          }
          for (let j = 0; j < 3; j++) {
            const on = mine ? !lost[j] : seen(pts[j]);
            show(`${side}-j${j}`, on);
            if (on) move(`${side}-j${j}`, at(pts[j]!));
          }
        }

        // The label of a joint that the camera does not see. The labels stack in the top corner. Only the chosen leg has them.
        let row = 0;
        for (let j = 0; j < 3; j++) {
          show(`lost-${j}`, lost[j]!);
          if (!lost[j]) continue;
          text(`lost-${j}`, 14 * px, (26 + 22 * row++) * px, 'start');
        }

        // The label of the chosen leg, at the middle of the thigh. It is drawn after the angle text, so that it can move out of its way.
        const [hip, knee, ankle] = chosen as [Landmark, Landmark, Landmark];
        const thighOn = !lost[0] && !lost[1];
        show('chosen-label', thighOn);

        // The arc at the chosen knee and its number. Same gate as the angle: three joints seen.
        const angle = kneeAngle(hip, knee, ankle, aspect.current);
        const bend = angle === null ? null : flexion(angle);
        const arcOn = bend !== null && bend >= 1;
        show('arc-core', arcOn);
        show('arc-halo', arcOn);
        show('arc-text', arcOn);
        if (arcOn) {
          const k = at(knee);
          const r = 34 * px;
          const thigh = Math.atan2((knee.y - hip.y) * H, (knee.x - hip.x) * W);
          const shank = Math.atan2((ankle.y - knee.y) * H, (ankle.x - knee.x) * W);
          const delta = ((shank - thigh + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
          const d = `M ${r1(k.x + r * Math.cos(thigh))} ${r1(k.y + r * Math.sin(thigh))} A ${r1(r)} ${r1(r)} 0 0 ${delta > 0 ? 1 : 0} ${r1(k.x + r * Math.cos(shank))} ${r1(k.y + r * Math.sin(shank))}`;
          e['arc-core']!.setAttribute('d', d);
          e['arc-halo']!.setAttribute('d', d);
          const inward = innerSide('arc', k.x);
          text('arc-text', k.x + inward * (r + 12 * px), k.y + 4 * px, inward === 1 ? 'start' : 'end');
          e['arc-text']!.textContent = `${Math.round(bend)}° estimated angle`;
        }

        if (thighOn) {
          const m = at({ x: (hip.x + knee.x) / 2, y: (hip.y + knee.y) / 2 });
          const inward = innerSide('chosen', m.x);
          const size = 14 * px;
          const box = (el: SVGElement) => {
            const w = (el.textContent ?? '').length * 0.6 * size; // a letter is about 0.6 of the font size wide
            const x = Number(el.getAttribute('x'));
            const left = el.getAttribute('text-anchor') === 'end' ? x - w : x;
            return { left, right: left + w, top: Number(el.getAttribute('y')) - size, bottom: Number(el.getAttribute('y')) };
          };
          text('chosen-label', m.x + inward * 16 * px, m.y - 20 * px, inward === 1 ? 'start' : 'end');
          if (arcOn) {
            const a = box(e['chosen-label']!);
            const b = box(e['arc-text']!);
            // The two texts must not lie on each other. The leg label moves above the angle text.
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) e['chosen-label']!.setAttribute('y', String(r1(b.top - 4 * px)));
          }
        }
      },
    }),
    [leg],
  );

  if (isHidden) return null;
  const cls = (side: Side) => (side === leg ? 'bm-chosen' : 'bm-other');
  // The other leg comes first, so the chosen leg lies on top.
  const order = [...SIDES].sort((a) => (a === leg ? 1 : -1));
  return (
    <svg
      ref={svg}
      className={`body-map ${mirrorClass(mirrored)}`.trim()}
      viewBox={`0 0 ${DEFAULT_ASPECT * H} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <g className="bm-soft">
        {SOFT.map(([a, b]) => (
          <line key={`${a}-${b}`} data-k={`soft-${a}-${b}`} className="bm-soft-line" display="none" />
        ))}
      </g>
      {order.map((side) => (
        <g key={side}>
          {[0, 1, 2].map((i) => (
            <g key={i} data-k={`${side}-${i}`} className={`bm-bone ${cls(side)}`} display="none">
              <line data-k={`${side}-${i}-h`} className={`bm-halo ${cls(side)}`} />
              <line data-k={`${side}-${i}-c`} className={`bm-core ${cls(side)}`} />
            </g>
          ))}
          {[0, 1, 2].map((j) => (
            <circle key={j} data-k={`${side}-j${j}`} className={`bm-joint ${cls(side)}${side === leg && j === 1 ? ' bm-knee' : ''}`} r={j === 1 ? 17 : 11} display="none" />
          ))}
        </g>
      ))}
      {JOINT_NAMES.map((name, j) => (
        <text key={name} data-k={`lost-${j}`} className="bm-label" display="none">{`${name} not seen`}</text>
      ))}
      <path data-k="arc-halo" className="bm-halo bm-arc" display="none" />
      <path data-k="arc-core" className="bm-core bm-arc" display="none" />
      <text data-k="arc-text" className="bm-label" display="none" />
      <text data-k="chosen-label" className="bm-label" display="none">
        Chosen leg
      </text>
    </svg>
  );
});
