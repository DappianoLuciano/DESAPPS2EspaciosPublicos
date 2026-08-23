import { AppShell } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <AppShell
      navbar={{ width: 280, breakpoint: 'sm' }}
      padding={0}
      style={{ backgroundColor: '#F8F9F7' }}
    >
      <AppShell.Navbar>
        <Sidebar />
      </AppShell.Navbar>

      <AppShell.Main>
        <Header />
        <div style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
