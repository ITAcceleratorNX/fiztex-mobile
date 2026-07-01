import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Txt } from '@shared/components/Txt';
import { useTheme } from '@shared/theme/ThemeContext';

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TestTimer({ durationMinutes, startedAt, onExpire }) {
  const { c } = useTheme();
  const totalSec = (durationMinutes || 45) * 60;
  const [left, setLeft] = useState(totalSec);

  useEffect(() => {
    if (!startedAt) return undefined;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, totalSec - elapsed);
      setLeft(remaining);
      if (remaining === 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, totalSec, onExpire]);

  const urgent = left < 300;
  const pct = totalSec > 0 ? (left / totalSec) * 100 : 0;

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
