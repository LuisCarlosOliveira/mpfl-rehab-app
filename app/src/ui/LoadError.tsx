// A screen that cannot load (a lazy chunk that fails) must not blank the app (L2-02).
// LoadError catches the failure and shows a heading, a plain text and two ways on. A tab that stays open while the app
// is rebuilt asks for old chunk names that answer 404, and a new request for them cannot work. So "Try again" reloads
// the page, which loads the new index and the new chunk names. The data is in IndexedDB. Answers that are not saved are lost.
import { Component, lazy, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import { StateScreen } from './StateScreen';

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
  return (
    <StateScreen
      id="load-error-title"
      icon="triangle-alert"
      title="Screen not loaded"
      primary={{ label: 'Try again', icon: 'refresh-cw', onClick: onRetry }}
      secondary={{ label: 'Back to Home', icon: 'arrow-left', onClick: onBack }}
    >
      {LOAD_ERROR_TEXT}
    </StateScreen>
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
