// === src/hooks/useSSE.js ===
import { useEffect, useRef } from 'react';

export default function useSSE(url, onEvent, deps = []) {
  const esRef = useRef(null);
  useEffect(() => {
    const es = new EventSource(url);
    esRef.current = es;
    es.addEventListener('change', (evt) => {
      try { onEvent(JSON.parse(evt.data)); } catch {}
    });
    es.addEventListener('ping', () => {});
    es.onerror = () => { es.close(); };
    return () => es.close();
  }, [url, onEvent, ...deps]);
}
