import type { ReactNode } from 'react';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import type { Page } from '../../types/app-types';

interface AppLayoutProps {
  page: Page;
  onNavigate: (page: Page) => void;
  readyCount: number;
  children: ReactNode;
}

export default function AppLayout({
  page,
  onNavigate,
  readyCount,
  children,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <TitleBar />

      <div className="app-layout">
        <Sidebar
          page={page}
          onNavigate={onNavigate}
          readyCount={readyCount}
        />

        <div className="main-column">{children}</div>
      </div>
    </div>
  );
}
