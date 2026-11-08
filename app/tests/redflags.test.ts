import { RED_FLAGS, evaluateRedFlags, GENERAL_GUIDANCE_NOTE } from '../src/lib/redflags';

describe('red flag list', () => {
  it('has two groups and unique ids', () => {
    const groups = new Set(RED_FLAGS.map((f) => f.group));
    expect(groups).toEqual(new Set(['care-team', 'emergency']));
    expect(new Set(RED_FLAGS.map((f) => f.id)).size).toBe(RED_FLAGS.length);
  });

  it('carries the unverified note', () => {
    expect(GENERAL_GUIDANCE_NOTE).toMatch(/not verified for MPFL surgery/i);
  });
});

describe('evaluateRedFlags', () => {
  it('does not block when nothing is answered yes', () => {
    expect(evaluateRedFlags({})).toMatchObject({ blocked: false, group: null });
  });

  it.each(RED_FLAGS.map((f) => [f.id, f.group] as const))('blocks the session for "%s" (%s)', (id, group) => {
    const r = evaluateRedFlags({ [id]: true });
    expect(r.blocked).toBe(true);
    expect(r.group).toBe(group);
    expect(r.message.length).toBeGreaterThan(0);
  });

  it('shows the emergency message when both groups are present', () => {
    const care = RED_FLAGS.find((f) => f.group === 'care-team')!;
    const emergency = RED_FLAGS.find((f) => f.group === 'emergency')!;
    const r = evaluateRedFlags({ [care.id]: true, [emergency.id]: true });
    expect(r.group).toBe('emergency');
    expect(r.message).toMatch(/emergency services/i);
  });

  it('uses the care team message for the care-team group', () => {
    const care = RED_FLAGS.find((f) => f.group === 'care-team')!;
    expect(evaluateRedFlags({ [care.id]: true }).message).toMatch(/care team/i);
  });

  it('ignores an answer of false and an unknown id', () => {
    expect(evaluateRedFlags({ [RED_FLAGS[0]!.id]: false, nope: true }).blocked).toBe(false);
  });
});
