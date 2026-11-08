// One result shape for every pairing function that reads outside text. These functions never throw.
export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; code: E };

export const fail = <E extends string>(code: E): { ok: false; code: E } => ({ ok: false, code });
