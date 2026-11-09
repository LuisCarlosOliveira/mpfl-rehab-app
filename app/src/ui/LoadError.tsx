// A screen that cannot load (a lazy chunk that fails, for example offline) must not blank the app (L2-02).
// LoadError catches the failure and shows a heading, a plain text and two ways on. retryableLazy makes a lazy screen
// that asks for its chunk again after a failure, because React.lazy keeps a failed import for ever.
import { Component, Fragment, lazy, useEffect, useRef, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Notice } from './Notice';

export const LOAD_ERROR_TEXT = 'This screen could not load. Check your connection and try again.';

// The screens whose import failed. "Try again" gives each one a new lazy component.
const failed = new Set<() => void>();

/** Like `lazy`. After a failed import, "Try again" in LoadError makes the next render ask for the chunk again. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the props type comes from the screen that the caller loads
export function retryableLazy<C extends ComponentType<any>>(load: () => Promise<{ default: C }>) {
  let Inner = lazy(request);
  function request() {
    return load().catch((error: unknown) => {
      failed.add(() => {
        Inner = lazy(request);
      });
      throw error;
    });
  }
  return function Screen(props: ComponentProps<C>) {
    return <Inner {...props} />;
  };
}

function Failed({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section aria-labelledby="load-error-title" className="narrow">
      <header className="page-head">
        <h1 id="load-error-title" tabIndex={-1} ref={heading}>
          Screen not loaded
        </h1>
      </header>
      <div className="stack">
        <Notice role="alert" icon="triangle-alert">
          <p>{LOAD_ERROR_TEXT}</p>
        </Notice>
      </div>
      <div className="action-bar">
        <button type="button" className="btn btn-primary btn-lg" onClick={onRetry}>
          <Icon name="refresh-cw" size={18} />
          Try again
        </button>
        <button type="button" className="btn btn-lg" onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          Back to Home
        </button>
      </div>
    </section>
  );
}

interface Props {
  onBack: () => void;
  children: ReactNode;
}

export class LoadError extends Component<Props, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  retry() {
    failed.forEach((reset) => reset());
    failed.clear();
    this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
  }

  render() {
    if (this.state.failed) {
      return <Failed onRetry={() => this.retry()} onBack={this.props.onBack} />;
    }
    // A new key mounts the children again, so the lazy screen asks for its chunk again.
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
