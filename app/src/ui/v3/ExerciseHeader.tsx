// The top of a live or plan screen: eyebrow, the exercise name as the h1 and an optional child (the progress bar).
import type { ReactNode } from 'react';
import './parts.css';

interface Props {
  eyebrow?: string;
  name: string;
  children?: ReactNode;
}

export function ExerciseHeader({ eyebrow, name, children }: Props) {
  return (
    <div className="v3-exhead">
      {eyebrow && <p className="v3-eyebrow">{eyebrow}</p>}
      <h1>{name}</h1>
      {children}
    </div>
  );
}
