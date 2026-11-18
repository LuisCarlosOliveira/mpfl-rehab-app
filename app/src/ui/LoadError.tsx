// A screen that cannot load (a lazy chunk that fails) must not blank the app (L2-02).
// LoadError catches the failure and shows a heading, a plain text and two ways on. A tab that stays open while the app
// is rebuilt asks for old chunk names that answer 404, and a new request for them cannot work. So "Try again" reloads
// the page, which loads the new index and the new chunk names. The data is in IndexedDB. Answers that are not saved are lost.
import { Component, lazy, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import { StateScreen } from './StateScreen';

export const LOAD_ERROR_TEXT =
  'This screen could not load. The app may have been updated. Try again reloads the page. Saved sessions stay on this device. Unsaved answers are lost.';

/** The text when the device has no network. It is read when the failed state shows, so there is no listener. */
export const OFFLINE_ERROR_TEXT = 'You are offline. Reconnect, then press Try again. Saved sessions stay on this device. Unsaved answers are lost.';

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
      {typeof navigator !== 'undefined' && navigator.onLine === false ? OFFLINE_ERROR_TEXT : LOAD_ERROR_TEXT}
    </StateScreen>
  );
}

interface Props {
  onBack: () => void;
  /** Wraps the failed screen in a frame. The live screens bring their own frame, so a failure needs one. */
  frame?: (inner: ReactNode) => ReactNode;
  children: ReactNode;
}

export class LoadError extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      const failed = <Failed onRetry={() => window.location.reload()} onBack={this.props.onBack} />;
      return this.props.frame ? this.props.frame(failed) : failed;
    }
    return this.props.children;
  }
}
