// A small label. On the camera slot it sits in the corner and names what the picture is.
import type { ReactNode } from 'react';
import './parts.css';

export function Chip({ children }: { children: ReactNode }) {
  return <span className="v3-chip">{children}</span>;
}
