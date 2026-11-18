// In-page helpers for honesty-audit.mjs. Loaded with addInitScript. They only read the page. They change nothing.
(() => {
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // A visible element, also when an ancestor hides it (opacity, display, visibility).
  const deepVis = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const cls = (el) => (typeof el.className === 'string' ? el.className : el.className && el.className.baseVal) || '';
  const sel = (el) => {
    const c = cls(el).trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${c ? '.' + c : ''}`;
  };
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
  };

  // Any CSS colour string to [r, g, b, a] (0 to 255, a 0 to 1). Chrome returns rgb() for most values. The canvas is the fallback.
  let cv;
  const toRGBA = (s) => {
    let m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)$/.exec(s);
    if (m) {
      let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return [+m[1], +m[2], +m[3], a];
    }
    try {
      cv = cv || document.createElement('canvas');
      cv.width = cv.height = 1;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.clearRect(0, 0, 1, 1);
      g.fillStyle = '#000';
      g.fillStyle = s;
      g.fillRect(0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    } catch {
      return null;
    }
  };

  const colours = () => {
    const out = new Map();
    const add = (el, prop, value) => {
      if (!value || value === 'none' || value === 'currentcolor') return;
      const key = value;
      let e = out.get(key);
      if (!e) {
        e = { value, count: 0, samples: [], props: {} };
        out.set(key, e);
      }
      e.count++;
      e.props[prop] = (e.props[prop] || 0) + 1;
      if (e.samples.length < 3) e.samples.push({ sel: sel(el), prop, text: (el.textContent || '').trim().slice(0, 30) });
    };
    let n = 0;
    for (const el of document.querySelectorAll('body, body *')) {
      if (['SCRIPT', 'STYLE', 'VIDEO', 'LINK', 'META'].includes(el.tagName)) continue;
      if (!deepVis(el)) continue;
      n++;
      const cs = getComputedStyle(el);
      const hasText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      const isSvg = el instanceof SVGElement;
      if (hasText || el.tagName === 'INPUT') add(el, 'color', cs.color);
      add(el, 'backgroundColor', cs.backgroundColor);
      if (isSvg) {
        add(el, 'fill', cs.fill);
        if (parseFloat(cs.strokeWidth) > 0) add(el, 'stroke', cs.stroke);
      }
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        if (cs['border' + side + 'Style'] !== 'none' && parseFloat(cs['border' + side + 'Width']) > 0) add(el, 'border' + side + 'Color', cs['border' + side + 'Color']);
      }
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) add(el, 'outlineColor', cs.outlineColor);
    }
    const rows = [];
    for (const e of out.values()) {
      const rgba = toRGBA(e.value);
      if (rgba) rows.push({ ...e, rgba });
    }
    return { visibleElements: n, rows };
  };

  const texts = () => {
    const attrs = [];
    for (const el of document.querySelectorAll('[aria-label],[title],[alt],[placeholder]')) {
      if (!deepVis(el)) continue;
      for (const a of ['aria-label', 'title', 'alt', 'placeholder']) {
        const v = el.getAttribute(a);
        if (v) attrs.push(v);
      }
    }
    return { body: document.body.innerText, attrs };
  };

  const targets = () => {
    const out = [];
    const seen = new Set();
    const nodes = document.querySelectorAll('button, a[href], summary, select, textarea, input, [role=button], [role=tab], [role=link], [role=radio], [role=switch], [tabindex]:not([tabindex="-1"])');
    for (const el of nodes) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.tagName === 'INPUT' && el.type === 'hidden') continue;
      if (el.disabled) continue;
      // A radio or checkbox: its label is the target when the input is hidden or small.
      let box = el;
      let kind = el.tagName.toLowerCase() + (el.type ? ':' + el.type : '');
      if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) {
        const lab = el.closest('label') || (el.id ? document.querySelector(`label[for="${el.id}"]`) : null);
        const r0 = el.getBoundingClientRect();
        if (lab) { const rl = lab.getBoundingClientRect(); if (rl.width * rl.height >= r0.width * r0.height) box = lab; }
      }
      if (!deepVis(box) && !deepVis(el)) continue;
      const r = box.getBoundingClientRect();
      // The skip link waits above the page (top: -6rem) until a key press focuses it. A person who taps never sees it, so it is not a tap target at rest.
      if (r.bottom <= 0 && el.matches('a[href^="#"]')) continue;
      // inline link inside a sentence: WCAG 2.2 allows it. The audit marks it.
      const inline = el.tagName === 'A' && !!el.closest('p, li') && getComputedStyle(el).display === 'inline';
      out.push({ sel: sel(box), kind, name: (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().slice(0, 40), w: +r.width.toFixed(2), h: +r.height.toFixed(2), inline, group: el.name || '' });
    }
    return out;
  };

  // Elements whose text is an angle number. `label` is the required phrase. `maxChars` limits how far "next to" reaches.
  const angles = (label, maxChars) => {
    const re = /(^|\s)(-?\d+(\.\d+)?|--)\s*(°|degrees?\b)/i;
    const cand = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!deepVis(el)) continue;
      if (['SCRIPT', 'STYLE', 'OPTION'].includes(el.tagName)) continue;
      const t = (el instanceof SVGElement ? el.textContent : el.innerText) || '';
      if (!t || t.length > 140 || !re.test(t)) continue;
      // keep the smallest element: none of its children matches
      const childHit = [...el.children].some((c) => deepVis(c) && re.test((c instanceof SVGElement ? c.textContent : c.innerText) || ''));
      if (childHit) continue;
      cand.push(el);
    }
    const lc = label.toLowerCase();
    return cand.map((el) => {
      let depth = 0;
      let found = false;
      let chars = 0;
      const blk = el.closest('.dash-chart, section:has(> h2):has(table)');
      if (blk) {
        // a chart block: the title of the block counts as "next to" every number of the block and of its table
        const t = (blk.innerText || '').toLowerCase();
        found = t.includes(lc);
        chars = t.length;
        depth = -1;
      } else {
        for (let n = el; n && n !== document.body; n = n.parentElement, depth++) {
          const t = ((n instanceof SVGElement ? n.textContent : n.innerText) || '').toLowerCase();
          if (t.length > maxChars && depth > 0) break;
          chars = t.length;
          if (t.includes(lc)) {
            found = true;
            break;
          }
        }
      }
      const protocolValue = !!el.closest('.chip, .gauge-caption, .facts, [data-protocol-value]');
      return { sel: sel(el), text: ((el instanceof SVGElement ? el.textContent : el.innerText) || '').trim().slice(0, 50), full: ((el instanceof SVGElement ? el.textContent : el.innerText) || '').trim(), found, depth, chars, protocolValue };
    });
  };

  const findText = (needle) => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!deepVis(el)) continue;
      const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join('');
      if (own.includes(needle)) {
        const r = el.getBoundingClientRect();
        out.push({ sel: sel(el), top: +r.top.toFixed(0), bottom: +r.bottom.toFixed(0), inViewport: r.top < innerHeight && r.bottom > 0 });
      }
    }
    return out;
  };

  const bottomBar = () => {
    const out = [];
    for (const el of document.querySelectorAll('nav, [role=tablist], [class*=tabbar i], [class*=bottom-bar i], [class*=bottombar i], [class*=navbar i]')) {
      if (!deepVis(el)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const atBottom = r.bottom >= innerHeight - 4 && r.top > innerHeight / 2;
      out.push({ sel: sel(el), position: cs.position, atBottom, h: +r.height.toFixed(1), label: el.getAttribute('aria-label') || '', items: [...el.querySelectorAll('a, button, [role=tab]')].map((b) => ({ text: (b.textContent || '').trim(), current: b.getAttribute('aria-current') || b.getAttribute('aria-selected') || '', h: +b.getBoundingClientRect().height.toFixed(1), w: +b.getBoundingClientRect().width.toFixed(1) })) });
    }
    return out;
  };

  const gauges = () => {
    const out = [];
    for (const el of document.querySelectorAll('svg')) {
      if (!deepVis(el)) continue;
      const c = cls(el);
      const hasLimit = !!el.querySelector('[class*=limit i]');
      if (/gauge|ruler/i.test(c) || hasLimit) {
        const nums = [...el.querySelectorAll('text')].map((t) => t.textContent.trim()).filter((t) => /\d/.test(t));
        const ticks = el.querySelectorAll('[class*=tick i], line').length;
        out.push({ sel: sel(el), hasLimit, numericLabels: nums, ticks, caption: ((el.parentElement && el.parentElement.innerText) || '').trim().slice(0, 160) });
      }
    }
    return out;
  };

  const fontSizes = () => {
    const out = [];
    for (const el of document.querySelectorAll('[class*=readout-number i], [class*=live-number i], [class*=angle i]')) {
      if (!deepVis(el)) continue;
      const t = (el.innerText || '').trim();
      if (!/^(--|-?\d+)$/.test(t)) continue;
      out.push({ sel: sel(el), text: t, px: parseFloat(getComputedStyle(el).fontSize) });
    }
    return out;
  };

  const progress = () => [...document.querySelectorAll('progress, meter, [role=progressbar]')].filter(deepVis).map((el) => ({ sel: sel(el), label: el.getAttribute('aria-label') || '', hidden: el.getAttribute('aria-hidden') === 'true' }));

  const gamify = () =>
    [...document.querySelectorAll('[class*=badge i], [class*=streak i], [class*=trophy i], [class*=confetti i], [class*=medal i], [class*=goal i], [class*=milestone i], [class*=achievement i], [class*=score i], [class*=grade i], [data-testid*=badge i], [data-testid*=streak i]')]
      .filter(deepVis)
      .map((el) => ({ sel: sel(el), text: (el.textContent || '').trim().slice(0, 40) }));

  // Charts. Reads Recharts markup and the data table. Counts only what is drawn.
  const charts = () => {
    const out = [];
    for (const sec of document.querySelectorAll('section[aria-labelledby]')) {
      if (!sec.querySelector('.recharts-wrapper, svg.recharts-surface, table')) continue;
      if (sec.querySelector('section[aria-labelledby]')) continue; // an outer screen section
      if (!deepVis(sec)) continue;
      const wrap = sec.querySelector('.recharts-wrapper');
      const title = (sec.querySelector('h2') || {}).textContent || '';
      const yAxes = wrap ? wrap.querySelectorAll('.recharts-yAxis').length : 0;
      const yAxesRight = wrap ? [...wrap.querySelectorAll('.recharts-yAxis')].filter((a) => (a.getAttribute('class') || '').includes('orientation-right') || /right/.test(a.getAttribute('orientation') || '')).length : 0;
      const xAxes = wrap ? wrap.querySelectorAll('.recharts-xAxis').length : 0;
      const labels = wrap ? [...wrap.querySelectorAll('.recharts-label, .recharts-text.recharts-label')].map((l) => l.textContent.trim()).filter(Boolean) : [];
      const lines = wrap ? wrap.querySelectorAll('.recharts-line-curve').length : 0;
      const bars = wrap ? wrap.querySelectorAll('.recharts-bar-rectangle').length : 0;
      const areas = wrap ? wrap.querySelectorAll('.recharts-area-area').length : 0;
      const dots = wrap ? wrap.querySelectorAll('.recharts-line-dots circle, .recharts-line-dot, .recharts-dot').length : 0;
      const refLines = wrap ? wrap.querySelectorAll('.recharts-reference-line, .recharts-reference-area, .recharts-reference-dot').length : 0;
      const legend = !!sec.querySelector('.recharts-legend-wrapper, [class*=legend i]');
      // text nodes inside the plot that are not axis ticks or axis labels: a number on every point
      const dataLabels = wrap ? [...wrap.querySelectorAll('text')].filter((t) => !t.closest('.recharts-cartesian-axis') && !t.closest('.recharts-label') && !/recharts-label|tick-value/.test(t.getAttribute('class') || '') && /\d/.test(t.textContent)).length : 0;
      const marks = [];
      if (wrap) {
        for (const m of wrap.querySelectorAll('.recharts-line-curve, .recharts-bar-rectangle path, .recharts-bar-rectangle rect, .recharts-area-area, .recharts-line-dots circle')) {
          const cs = getComputedStyle(m);
          marks.push({ cls: (m.getAttribute('class') || '').split(' ')[0], fill: cs.fill, stroke: cs.stroke, dash: cs.strokeDasharray });
        }
      }
      const table = sec.querySelector('table');
      const rows = table ? [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim())) : [];
      out.push({ title: title.trim().slice(0, 200), hasChart: !!wrap, yAxes, yAxesRight, xAxes, labels, lines, bars, areas, dots, refLines, legend, dataLabels, marks, hasTable: !!table, tableRows: rows.length, tableValues: rows.map((r) => r[1]), tableHead: table ? [...table.querySelectorAll('thead th')].map((h) => h.textContent.trim()) : [], note: (sec.innerText.match(/Camera error[^\n]*/) || [''])[0].slice(0, 160) });
    }
    return out;
  };

  const overflow = () => ({ scrollW: document.documentElement.scrollWidth, innerW: innerWidth });

  window.__audit = { vis, deepVis, sel, rect, colours, texts, targets, angles, findText, bottomBar, gauges, fontSizes, progress, gamify, charts, overflow };
})();
