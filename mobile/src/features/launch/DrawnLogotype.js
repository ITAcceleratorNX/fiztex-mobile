import React, { useMemo } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { LOGOTYPE_PATHS } from '@shared/components/logotypePaths';
import {
  INTRO, INTRO_EASING, LOGO_VIEWBOX, PHI, arrowHead, barSamples, letterWindow, polyline, ringSamples,
} from './launchModel';

// `Animated` добавляет обёрнутому компоненту `collapsable={false}` — свойство нативных `View`.
// Элементы SVG в вебе отдают его в DOM как атрибут, и React ругается в консоль на каждый кадр.
const withoutCollapsable = (Component) => React.forwardRef(({ collapsable, ...props }, ref) => (
  <Component ref={ref} {...props} />
));
const AnimatedPath = Animated.createAnimatedComponent(withoutCollapsable(Path));
const AnimatedG = Animated.createAnimatedComponent(withoutCollapsable(G));

function easingFor(spec) {
  return spec.bezier ? Easing.bezier(...spec.bezier) : Easing.out(Easing.poly(spec.out));
}

/** Доля пройденного отрезка раскадровки (0…1) с кривой этого отрезка. */
export function segment(t, [from, to], spec) {
  return t.interpolate({
    inputRange: [from, to],
    outputRange: [0, 1],
    easing: spec ? easingFor(spec) : undefined,
    extrapolate: 'clamp',
  });
}

/** Сколько места вокруг основания наконечника — с запасом на поворот, в единицах логотипа. */
const ARROW_BOX = 5;

/**
 * Наконечник, который едет на конце штриха: стоит основанием на точке пути и смотрит туда,
 * куда идёт штрих. Отдельный слой поверх `Svg` — сдвиг и поворот обычного `View` надёжнее,
 * чем анимированный `transform` у элемента внутри `Svg` на всех трёх платформах.
 */
function Arrowhead({ progress, samples, opacity, scale, color }) {
  const box = ARROW_BOX * scale;
  const transform = useMemo(() => {
    const inputRange = samples.points.map((p) => p.at);
    const track = (pick) => progress.interpolate({
      inputRange,
      outputRange: samples.points.map(pick),
      extrapolate: 'clamp',
    });
    return [
      { translateX: track((p) => p.x * scale - box) },
      { translateY: track((p) => p.y * scale - box) },
      { rotate: track((p) => `${p.angle}deg`) },
    ];
  }, [progress, samples, scale, box]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0, width: box * 2, height: box * 2, opacity, transform }}
    >
      <Svg width={box * 2} height={box * 2} viewBox={`${-ARROW_BOX} ${-ARROW_BOX} ${ARROW_BOX * 2} ${ARROW_BOX * 2}`}>
        <Path d={arrowHead()} fill={color} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Логотип, который рисуется по раскадровке `INTRO` (`t` — миллисекунды от начала): стрелка
 * обегает кольцо Φ, стойка растёт снизу со своей стрелкой, штрихи сменяются точным знаком,
 * буквы проявляются по одной. Конечный кадр совпадает с `PhysTechLogotype` той же высоты.
 */
export function DrawnLogotype({ t, height, color }) {
  const scale = height / LOGO_VIEWBOX.height;
  const width = LOGO_VIEWBOX.width * scale;

  const geometry = useMemo(() => {
    const ring = ringSamples();
    const bar = barSamples();
    return { ring, bar, ringPath: polyline(ring.points), barPath: polyline(bar.points) };
  }, []);

  const anim = useMemo(() => {
    const ring = segment(t, INTRO.ring, INTRO_EASING.ring);
    const bar = segment(t, INTRO.bar, INTRO_EASING.bar);
    const [glyphFrom, glyphTo] = INTRO.glyph;
    const visibleFrom = (start) => t.interpolate({
      inputRange: [start - 1, start, glyphFrom, glyphTo],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp',
    });
    return {
      ring,
      bar,
      ringOffset: ring.interpolate({ inputRange: [0, 1], outputRange: [geometry.ring.length, 0] }),
      barOffset: bar.interpolate({ inputRange: [0, 1], outputRange: [geometry.bar.length, 0] }),
      ringArrow: visibleFrom(INTRO.ring[0]),
      barArrow: visibleFrom(INTRO.bar[0]),
      strokes: t.interpolate({ inputRange: INTRO.glyph, outputRange: [1, 0], extrapolate: 'clamp' }),
      glyph: t.interpolate({ inputRange: INTRO.glyph, outputRange: [0, 1], extrapolate: 'clamp' }),
      letters: LOGOTYPE_PATHS.letters.map((_, i) => t.interpolate({
        inputRange: letterWindow(i),
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })),
    };
  }, [t, geometry]);

  // Штрих длиной L с пробелом чуть длиннее: при сдвиге на L не остаётся даже точки в начале.
  const dash = (length) => [length, length + 1];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}>
        <AnimatedPath
          d={geometry.ringPath}
          fill="none"
          stroke={color}
          strokeWidth={PHI.ring.width}
          strokeDasharray={dash(geometry.ring.length)}
          strokeDashoffset={anim.ringOffset}
          opacity={anim.strokes}
        />
        <AnimatedPath
          d={geometry.barPath}
          fill="none"
          stroke={color}
          strokeWidth={PHI.bar.width}
          strokeDasharray={dash(geometry.bar.length)}
          strokeDashoffset={anim.barOffset}
          opacity={anim.strokes}
        />
        <AnimatedG opacity={anim.glyph}>
          {LOGOTYPE_PATHS.phi.map((d, i) => <Path key={i} d={d} fill={color} stroke={color} />)}
        </AnimatedG>
        {LOGOTYPE_PATHS.letters.map((d, i) => (
          <AnimatedPath key={i} d={d} fill={color} stroke={color} opacity={anim.letters[i]} />
        ))}
      </Svg>
      <Arrowhead progress={anim.ring} samples={geometry.ring} opacity={anim.ringArrow} scale={scale} color={color} />
      <Arrowhead progress={anim.bar} samples={geometry.bar} opacity={anim.barArrow} scale={scale} color={color} />
    </View>
  );
}
