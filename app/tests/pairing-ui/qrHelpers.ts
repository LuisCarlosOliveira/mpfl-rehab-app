import { encode } from 'uqr';

export type Frame = { data: Uint8ClampedArray; width: number; height: number };

/** Draw a boolean matrix as dark and light pixels. Each module is `scale` pixels wide, with a light border. */
export function frameFromMatrix(matrix: boolean[][], border = 4, scale = 4, invert = false): Frame {
  const modules = matrix.length + border * 2;
  const width = modules * scale;
  const data = new Uint8ClampedArray(width * width * 4);
  for (let py = 0; py < width; py++) {
    for (let px = 0; px < width; px++) {
      const mx = Math.floor(px / scale) - border;
      const my = Math.floor(py / scale) - border;
      const dark = matrix[my]?.[mx] === true;
      const value = dark !== invert ? 0 : 255;
      const i = (py * width + px) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return { data, width, height: width };
}

/** A real QR frame for a text. It uses the same options as the app, unless the caller sets others. */
export function frameFor(text: string, options: Parameters<typeof encode>[1] = { ecc: 'M', maxVersion: 11 }, invert = false): Frame {
  return frameFromMatrix(encode(text, { ...options, border: 0 }).data, 4, 4, invert);
}
