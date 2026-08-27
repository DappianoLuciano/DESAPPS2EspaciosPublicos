import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProfileSettings from './pages/ProfileSettings';
import EventDetail from './pages/EventDetail';
import ReservationSuccess from './pages/ReservationSuccess';
import AdminDashboard from './pages/AdminDashboard';
import CreateEvent from './pages/CreateEvent';
import Login from './pages/Login';
import Register from './pages/Register';
import MyReservations from './pages/MyReservations';
import CategoryEvents from './pages/CategoryEvents';
import CancelReservation from './pages/CancelReservation';
import EventAttendees from './pages/EventAttendees';
import EventManagement from './pages/EventManagement';
import PublicSpaceManagement from './pages/PublicSpaceManagement';

const theme = {
  fontFamily: 'Open Sans, sans-serif',
  headings: { fontFamily: 'Nunito, sans-serif' },
};

function App() {
  return (
    <MantineProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/category/:id" element={<CategoryEvents />} />
                <Route path="/event/:id" element={<EventDetail />} />
                <Route path="/reservation-success" element={<ReservationSuccess />} />
                <Route path="/reservations" element={<MyReservations />} />
                <Route path="/cancel-reservation/:id" element={<CancelReservation />} />
                <Route path="/profile" element={<ProfileSettings />} />
                
                {/* Admin Routes */}
                <Route element={<PrivateRoute requireAdmin={true} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/events" element={<EventManagement />} />
                  <Route path="/admin/public-spaces" element={<PublicSpaceManagement />} />
                  <Route path="/admin/create-event" element={<CreateEvent />} />
                  <Route path="/admin/event/:id/edit" element={<CreateEvent />} />
                  <Route path="/admin/event/:id/attendees" element={<EventAttendees />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;
