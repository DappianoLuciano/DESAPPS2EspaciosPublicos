import { useEffect, useState } from 'react';
import { listEmergencyEventNotices } from './api';
import type { EmergencyEventNotice } from './api';

/** Si la consulta falla la pantalla sigue igual, solo sin avisos. */
export function useEmergencyNotices(): Map<string, EmergencyEventNotice> {
  const [notices, setNotices] = useState(new Map<string, EmergencyEventNotice>());

  useEffect(() => {
    listEmergencyEventNotices()
      .then((items) => setNotices(new Map(items.map((notice) => [notice.eventId, notice]))))
      .catch(() => setNotices(new Map()));
  }, []);

  return notices;
}
