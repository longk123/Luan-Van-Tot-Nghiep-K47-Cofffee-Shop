import { useEffect, useState } from 'react';
import Dashboard from './Dashboard.jsx';
import { api } from '../api.js';

export default function POS() {
  const [shift, setShift] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getMyOpenShift();
        setShift(res?.data || null);
      } catch (error) {
        console.error('Error loading shift:', error);
        setShift(null);
      }
    })();
  }, []);

  return <Dashboard defaultMode="pos" shift={shift} />;
}
