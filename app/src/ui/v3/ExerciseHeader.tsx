// The top of a live or plan screen: eyebrow, the exercise name as the h1 and an optional child (the progress bar).
import type { ReactNode, Ref } from 'react';
import './parts.css';

interface Props {
  eyebrow?: string;
  name: string;
  /** For a screen that sends the focus to its heading (a new step, a retry). The heading takes focus by script only. */
  titleRef?: Ref<HTMLHeadingElement>;
  titleId?: string;
  children?: ReactNode;
}

export function ExerciseHeader({ eyebrow, name, titleRef, titleId, children }: Props) {
  return (
    <div className="v3-exhead">
      {eyebrow && <p className="v3-eyebrow">{eyebrow}</p>}
      <h1 id={titleId} ref={titleRef} tabIndex={titleRef || titleId ? -1 : undefined}>
        {name}
      </h1>
      {children}
    </div>
  );
}
