import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Txt } from '@shared/components/Txt';
import { useTheme } from '@shared/theme/ThemeContext';

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Driven by the server's `remainingSeconds` (refreshed on every answer save, same as the
// web flow) rather than a purely local clock — the backend stays the timing source of truth.
export function TestTimer({ remainingSeconds, totalSeconds, onExpire }) {
  const { c } = useTheme();
  const [left, setLeft] = useState(remainingSeconds ?? 0);
  const anchor = useRef({ remaining: remainingSeconds ?? 0, at: Date.now() });

  useEffect(() => {
    if (typeof remainingSeconds !== 'number') return;
    anchor.current = { remaining: remainingSeconds, at: Date.now() };
    setLeft(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - anchor.current.at) / 1000);
      const remaining = Math.max(0, anchor.current.remaining - elapsed);
      setLeft(remaining);
      if (remaining === 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [onExpire]);

  const urgent = left < 300;
  const pct = totalSeconds > 0 ? (left / totalSeconds) * 100 : 0;

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Txt style={{ fontSize: 13, color: c.ink2, fontWeight: '600' }}>Осталось времени</Txt>
        <Txt style={{ fontSize: 22, fontWeight: '800', color: urgent ? c.red : c.ink, fontVariant: ['tabular-nums'] }}>
          {formatTime(left)}
        </Txt>
      </View>
      <View style={{ height: 6, borderRadius: 999, backgroundColor: c.bg2, overflow: 'hidden' }}>
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: urgent ? c.red : c.green,
            borderRadius: 999,
          }}
        />
      </View>
    </View>
  );
}
