// The one read of the isTrusted flag. It is a separate file so that a test can stand in for the browser.
// A jsdom event is never trusted.

export const trustedFlag = (event: Event): boolean => event.isTrusted === true;
