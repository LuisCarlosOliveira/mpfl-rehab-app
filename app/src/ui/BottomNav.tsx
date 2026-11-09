// The bottom bar of the three main screens: Home, Your sessions and My data. It never shows on a flow screen (Red flag, Setup, Session, Summary).
import { Icon, type IconName } from './Icon';

export type NavScreen = 'home' | 'dashboard' | 'data';

const ITEMS: readonly { screen: NavScreen; label: string; icon: IconName }[] = [
  { screen: 'home', label: 'Home', icon: 'dumbbell' },
  { screen: 'dashboard', label: 'Your sessions', icon: 'chart-line' },
  { screen: 'data', label: 'My data', icon: 'database' },
];

export const isNavScreen = (screen: string): screen is NavScreen => ITEMS.some((i) => i.screen === screen);

interface Props {
  current: NavScreen;
  onOpen: (screen: NavScreen) => void;
}

export function BottomNav({ current, onOpen }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <ul>
        {ITEMS.map((item) => (
          <li key={item.screen}>
            <button
              type="button"
              className="bottom-nav-item"
              aria-current={item.screen === current ? 'page' : undefined}
              onClick={() => item.screen !== current && onOpen(item.screen)}
            >
              <Icon name={item.icon} size={22} />
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
