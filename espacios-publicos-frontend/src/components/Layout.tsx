import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);

  return (
    <AppShell
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !mobileOpened } }}
      padding={0}
      style={{ backgroundColor: '#F8F9F7' }}
    >
      <AppShell.Navbar>
        <Sidebar onNavigate={closeMobile} />
      </AppShell.Navbar>

      <AppShell.Main>
        <Header mobileOpened={mobileOpened} toggleMobile={toggleMobile} />
        <div style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
