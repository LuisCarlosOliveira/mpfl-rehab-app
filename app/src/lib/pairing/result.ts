export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; code: E };

export const fail = <E extends string>(code: E): { ok: false; code: E } => ({ ok: false, code });
