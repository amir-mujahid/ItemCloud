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
  return <span className="font-mono">{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>;
}
