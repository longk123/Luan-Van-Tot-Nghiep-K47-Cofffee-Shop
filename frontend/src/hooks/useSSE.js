// === src/hooks/useSSE.js ===
import { useEffect, useRef } from 'react';

export default function useSSE(url, onEvent, deps = []) {
  const esRef = useRef(null);
  useEffect(() => {
    console.log('🔌 SSE connecting to:', url);
    const es = new EventSource(url);
    esRef.current = es;
    
    es.addEventListener('change', (evt) => {
      console.log('🔔 SSE event received:', evt.data);
      try { 
        const data = JSON.parse(evt.data);
        onEvent(data); 
      } catch (err) {
        console.error('❌ SSE parse error:', err);
      }
    });
    
    es.addEventListener('ping', () => {
      console.log('🏓 SSE ping received');
    });
    
    es.onopen = () => {
      console.log('✅ SSE connection opened');
    };
    
    es.onerror = (err) => { 
      console.error('❌ SSE connection error:', err);
      es.close(); 
    };
    
    return () => {
      console.log('🔌 SSE disconnecting');
      es.close();
    };
  }, [url, onEvent, ...deps]);
}
