// B1, the "Contact your care team" card (adaptation design 5.4). It reads one saved session and never judges it.
import { CONTACT_TITLE, contactReason } from '../src/lib/contactCard';
import type { SessionData } from '../src/lib/storage';

const clean: SessionData = {
  date: '2026-03-01T10:00:00.000Z', exercise: 'heel-slide', side: 'left', reps: 10, peakFlexion: 50, holdSeconds: null, topFlexion: null,
  marginDeg: 9, marginSource: 't', view: 'side', nearLimit: 0, overLimit: 0, tooFast: 0, gaveWayPresses: 0, redFlagBlocks: 0,
  pain: 2, swelling: 'none', protocolId: 'example-001', phase: 1, schemaVersion: 1,
};

const BANNED = /\b(correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone|met|streak|badge|improved|worse)\b|on track/i;

describe('contactReason', () => {
  it('gives nothing after a clean session', () => {
    expect(contactReason(clean, undefined)).toBeNull();
  });

  it('gives nothing for pain below the floor of 7 and no threshold, and for some swelling', () => {
    expect(contactReason({ ...clean, pain: 6, swelling: 'some' }, undefined)).toBeNull();
  });

  it('names a gave-way press', () => {
    expect(contactReason({ ...clean, gaveWayPresses: 1 }, undefined)).toEqual({
      kind: 'gave-way',
      text: 'On 2026-03-01 you pressed "Knee gave way or hurts".',
    });
  });

  it('names the FR12 pause for pain at the floor of 7', () => {
    expect(contactReason({ ...clean, pain: 7 }, undefined)?.text).toBe('On 2026-03-01 you reported pain 7 out of 10.');
  });

  it('uses a lower clinician threshold for the end pain', () => {
    expect(contactReason({ ...clean, pain: 4 }, 4)?.kind).toBe('pain');
    expect(contactReason({ ...clean, pain: 3 }, 4)).toBeNull();
  });

  it('names swelling "more than before"', () => {
    expect(contactReason({ ...clean, swelling: 'more' }, undefined)?.text).toBe('On 2026-03-01 you reported swelling: more than before.');
  });

  it('counts a pain answer between sets only when the clinician set a threshold', () => {
    expect(contactReason({ ...clean, setPain: [8] }, undefined)).toBeNull();
    expect(contactReason({ ...clean, setPain: [null, 5] }, 5)?.kind).toBe('pain');
    expect(contactReason({ ...clean, setPain: [4] }, 5)).toBeNull();
  });

  it('gives one reason only. A gave-way press comes first, then pain, then swelling', () => {
    expect(contactReason({ ...clean, gaveWayPresses: 1, pain: 9, swelling: 'more' }, undefined)?.kind).toBe('gave-way');
    expect(contactReason({ ...clean, pain: 9, swelling: 'more' }, undefined)?.kind).toBe('pain');
  });

  it('uses no verdict word in the title or any reason', () => {
    expect(CONTACT_TITLE).toBe('Contact your care team');
    for (const s of [{ ...clean, gaveWayPresses: 1 }, { ...clean, pain: 9 }, { ...clean, swelling: 'more' as const }]) {
      expect(contactReason(s, undefined)!.text).not.toMatch(BANNED);
    }
    expect(CONTACT_TITLE).not.toMatch(BANNED);
  });
});
