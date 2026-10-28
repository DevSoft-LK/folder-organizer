import Icon from '../ui/Icon';
import type { IconName } from '../ui/Icon';
import type { Page } from '../../types/app-types';

const navItems: { id: Page; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'organizer', label: 'File organizer', icon: 'folder' },
  { id: 'activity', label: 'Activity', icon: 'activity' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
  readyCount: number;
}

export default function Sidebar({
  page,
  onNavigate,
  readyCount,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">WORKSPACE</div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            className={`sidebar-link ${page === item.id ? 'active' : ''}`}
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={page === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>

            {item.id === 'organizer' && readyCount > 0 ? (
              <span className="sidebar-count">{readyCount}</span>
            ) : null}

            {page === item.id ? <span className="active-indicator" /> : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-security-card">
        <div className="security-icon">
          <Icon name="shield" size={19} />
        </div>
        <div className="security-title">Your files stay local</div>
        <p>
          File operations run on this device. Preview before moving anything.
        </p>
        <div className="security-status">
          <span /> Local protection enabled
        </div>
      </div>

      <div className="sidebar-footer">
        <img
          src="/icons/DevSoft.png"
          alt="DevSoft"
          className="sidebar-footer-logo"
        />

        <div className="sidebar-footer-copy">
          <strong>Folder Organizer</strong>
          <span>Desktop edition</span>
        </div>

        <span className="version-label">v0.1</span>
      </div>
    </aside>
  );
}
