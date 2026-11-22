import type { ReactNode, Ref } from 'react';
import './parts.css';

interface Props {
  eyebrow?: string;
  name: string;
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
