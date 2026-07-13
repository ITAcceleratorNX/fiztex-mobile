import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Txt } from '@shared/components/Txt';
import { useTheme } from '@shared/theme/ThemeContext';

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Backend-driven timer: parent syncs deadline via remainingSeconds after each save. */
export function TestTimer({ remainingSeconds, durationMinutes, onExpire, onLowTime }) {
  const { c } = useTheme();
  const deadlineRef = useRef(Date.now() + (remainingSeconds || 0) * 1000);
  const expiredRef = useRef(false);
  const [left, setLeft] = useState(remainingSeconds || 0);

  const warnThreshold = (durationMinutes || 0) >= 10 ? 600 : 60;
  const lowTime = left <= warnThreshold && left > 0;

  useEffect(() => {
    deadlineRef.current = Date.now() + (remainingSeconds || 0) * 1000;
    expiredRef.current = false;
  }, [remainingSeconds]);

  useEffect(() => {
    onLowTime?.(lowTime);
  }, [lowTime, onLowTime]);

  useEffect(() => {
    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setLeft(secondsLeft);
      if (secondsLeft <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [onExpire]);

  const totalSec = (durationMinutes || 45) * 60;
  const pct = totalSec > 0 ? (left / totalSec) * 100 : 0;

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Txt style={{ fontSize: 13, color: c.ink2, fontWeight: '600' }}>Осталось времени</Txt>
        <Txt
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: lowTime ? c.red : c.ink,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatTime(left)}
        </Txt>
      </View>
      <View style={{ height: 6, borderRadius: 999, backgroundColor: c.bg2, overflow: 'hidden' }}>
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: lowTime ? c.red : c.green,
            borderRadius: 999,
          }}
        />
      </View>
    </View>
  );
}
