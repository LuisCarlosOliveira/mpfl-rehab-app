import { confirmByPerson } from '../src/lib/protocol/accept';
import { trustedFlag } from '../src/lib/protocol/trustedFlag';

// No stand-in here. A jsdom event is never trusted, so every event of a script must be refused.
describe('confirmByPerson with the real trusted flag', () => {
  it('reads the trusted flag of a real event', () => {
    expect(trustedFlag(new MouseEvent('click'))).toBe(false);
  });

  it('refuses a click made by script', () => {
    expect(confirmByPerson(new MouseEvent('click'))).toBeNull();
  });

  it('refuses the click method of a button', () => {
    const button = document.createElement('button');
    document.body.append(button);
    let seen: Event | undefined;
    button.addEventListener('click', (e) => (seen = e));
    button.click();
    button.remove();
    expect(confirmByPerson(seen as Event)).toBeNull();
  });

  it('refuses a plain object and a proxy that claim to be trusted', () => {
    expect(confirmByPerson({ type: 'click', isTrusted: true } as unknown as Event)).toBeNull();
    const proxy = new Proxy(new MouseEvent('click'), { get: (t, k) => (k === 'isTrusted' ? true : Reflect.get(t, k)) });
    expect(confirmByPerson(proxy)).toBeNull();
  });

  it('cannot be forged by a change of the flag on the event', () => {
    const e = new MouseEvent('click');
    expect(() => Object.defineProperty(e, 'isTrusted', { value: true })).toThrow();
    expect(confirmByPerson(e)).toBeNull();
  });
});
