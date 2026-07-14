import React, { useContext } from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { InkCtx } from './Txt';

// Line icon set (24px grid) — direct port of the SVG paths from web `ds.jsx`.
const ICONS = {
  home: (p) => <Path {...p} d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />,
  calendar: (p) => (
    <>
      <Rect {...p} x="3" y="5" width="18" height="16" rx="3" />
      <Path {...p} d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  book: (p) => (
    <>
      <Path {...p} d="M4 5a3 3 0 0 1 3-3h13v18H7a3 3 0 0 0-3 3z" />
      <Path {...p} d="M4 5v18" />
    </>
  ),
  trophy: (p) => (
    <>
      <Path {...p} d="M7 4h10v6a5 5 0 0 1-10 0z" />
      <Path {...p} d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M10 15h4M9 20h6M12 15v5" />
    </>
  ),
  user: (p) => (
    <>
      <Circle {...p} cx="12" cy="8" r="4" />
      <Path {...p} d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  qr: (p) => (
    <>
      <Rect {...p} x="3" y="3" width="7" height="7" rx="1" />
      <Rect {...p} x="14" y="3" width="7" height="7" rx="1" />
      <Rect {...p} x="3" y="14" width="7" height="7" rx="1" />
      <Path {...p} d="M14 14h3v3h-3zM20 14v3M14 20h3M17 20h4" />
    </>
  ),
  star: (p) => <Path {...p} d="M12 2l3 7 7 .9-5.2 4.7L18.5 22 12 18l-6.5 4 1.7-7.4L2 9.9 9 9z" />,
  map: (p) => (
    <>
      <Path {...p} d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2z" />
      <Path {...p} d="M9 3v16M15 5v16" />
    </>
  ),
  bell: (p) => <Path {...p} d="M18 16V11a6 6 0 0 0-12 0v5l-2 3h16zM10 21a2 2 0 0 0 4 0" />,
  clock: (p) => (
    <>
      <Circle {...p} cx="12" cy="12" r="9" />
      <Path {...p} d="M12 7v5l3 2" />
    </>
  ),
  chevronRight: (p) => <Path {...p} d="M9 6l6 6-6 6" />,
  chevronDown: (p) => <Path {...p} d="M6 9l6 6 6-6" />,
  chevronLeft: (p) => <Path {...p} d="M15 6l-6 6 6 6" />,
  plus: (p) => <Path {...p} d="M12 5v14M5 12h14" />,
  check: (p) => <Path {...p} d="M5 12l5 5L20 7" />,
  x: (p) => <Path {...p} d="M6 6l12 12M18 6L6 18" />,
  sparkle: (p) => <Path {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3" />,
  flame: (p) => <Path {...p} d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-7-1 4 2 5 3 5 0-5 4-7 4-11 3 3 5 7 5 13 0 4-3 7-8 7z" />,
  coin: (p) => (
    <>
      <Circle {...p} cx="12" cy="12" r="9" />
      <Path {...p} d="M12 7v10M9 9.5c0-1 1-2 3-2s3 1 3 2-1 1.5-3 1.5-3 .5-3 1.5 1 2 3 2 3-1 3-2" />
    </>
  ),
  chat: (p) => <Path {...p} d="M21 12a8 8 0 0 1-12 7l-5 1 1-4A8 8 0 1 1 21 12z" />,
  pencil: (p) => <Path {...p} d="M4 20l4-1L19 8l-3-3L5 16zM15 6l3 3" />,
  camera: (p) => (
    <>
      <Rect {...p} x="3" y="6" width="18" height="14" rx="2" />
      <Circle {...p} cx="12" cy="13" r="4" />
      <Path {...p} d="M9 6l2-3h2l2 3" />
    </>
  ),
  arrowRight: (p) => <Path {...p} d="M5 12h14M13 6l6 6-6 6" />,
  search: (p) => (
    <>
      <Circle {...p} cx="11" cy="11" r="7" />
      <Path {...p} d="M21 21l-4.5-4.5" />
    </>
  ),
  settings: (p) => (
    <>
      <Circle {...p} cx="12" cy="12" r="3" />
      <Path
        {...p}
        d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.5-2.4.9a7 7 0 0 0-1.7-1L14.4 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-.9-2 3.5L6 11a7 7 0 0 0 0 2l-2 1.6 2 3.5 2.4-.9a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.4.9 2-3.5L19 13"
      />
    </>
  ),
  play: (p) => <Path d={'M6 4l14 8-14 8z'} fill={p.stroke} stroke="none" />,
  heroes: (p) => <Path {...p} d="M12 2l3 4-3 2-3-2zM5 9l3 3-3 4-3-3zM19 9l3 3-3 4-3-3zM12 13l3 4-3 5-3-5z" />,
  bag: (p) => <Path {...p} d="M5 7h14l-1 14H6zM9 7V5a3 3 0 0 1 6 0v2" />,
  clean: (p) => <Path {...p} d="M8 4h8l1 6H7zM12 10v6M9 22h6M9 22v-3M15 22v-3" />,
  grid: (p) => (
    <>
      <Rect {...p} x="3" y="3" width="7" height="7" rx="1" />
      <Rect {...p} x="14" y="3" width="7" height="7" rx="1" />
      <Rect {...p} x="3" y="14" width="7" height="7" rx="1" />
      <Rect {...p} x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  face: (p) => (
    <>
      <Circle {...p} cx="12" cy="12" r="9" />
      <Path {...p} d="M8 10h.01M16 10h.01M8 15s1.5 2 4 2 4-2 4-2" />
    </>
  ),
  target: (p) => (
    <>
      <Circle {...p} cx="12" cy="12" r="9" />
      <Circle {...p} cx="12" cy="12" r="5" />
      <Circle cx="12" cy="12" r="1.5" fill={p.stroke} stroke="none" />
    </>
  ),
  upload: (p) => <Path {...p} d="M12 16V4M6 10l6-6 6 6M4 20h16" />,
  filter: (p) => <Path {...p} d="M4 5h16M7 12h10M10 19h4" />,
};

export default function Icon({ name, size = 24, color, strokeWidth = 1.8 }) {
  const inherited = useContext(InkCtx);
  const render = ICONS[name];
  if (!render) return null;
  const p = {
    stroke: color || inherited || '#0F172A',
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(p)}
    </Svg>
  );
}
