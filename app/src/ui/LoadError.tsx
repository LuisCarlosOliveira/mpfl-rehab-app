// A screen that cannot load (a lazy chunk that fails) must not blank the app (L2-02).
// LoadError catches the failure and shows a heading, a plain text and two ways on. A tab that stays open while the app
// is rebuilt asks for old chunk names that answer 404, and a new request for them cannot work. So "Try again" reloads
// the page, which loads the new index and the new chunk names. The data is in IndexedDB. Answers that are not saved are lost.
import { Component, lazy, useEffect, useRef, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Notice } from './Notice';

export const LOAD_ERROR_TEXT =
  'This screen could not load. The app may have been updated. Try again reloads the page. Saved sessions stay on this device. Unsaved answers are lost.';

/** Like `lazy`. The name marks a screen whose chunk can be missing. LoadError handles that case. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the props type comes from the screen that the caller loads
export function retryableLazy<C extends ComponentType<any>>(load: () => Promise<{ default: C }>) {
  const Inner = lazy(load);
  return function Screen(props: ComponentProps<C>) {
    return <Inner {...props} />;
  };
}

function Failed({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section aria-labelledby="load-error-title" className="narrow error-screen">
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

export class LoadError extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <Failed onRetry={() => window.location.reload()} onBack={this.props.onBack} />;
    }
    return this.props.children;
  }
}
