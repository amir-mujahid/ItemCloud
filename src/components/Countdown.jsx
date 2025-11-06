// src/components/Countdown.jsx
import { useEffect, useState } from 'react';

export default function Countdown({ expiresAtMs, onExpire }) {
  const [left, setLeft] = useState(() => Math.max(0, expiresAtMs - Date.now()));
  
  useEffect(() => {
    const t = setInterval(() => {
      const v = Math.max(0, expiresAtMs - Date.now());
      setLeft(v);
      if (v === 0) onExpire?.();
    }, 200);
    return () => clearInterval(t);
  }, [expiresAtMs, onExpire]);

  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  
  const isUrgent = left < 60000; // Less than 1 minute
  
  return (
    <span className={`font-mono font-bold text-lg ${isUrgent ? 'text-red-600 dark:text-red-400 animate-pulse' : ''}`}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}