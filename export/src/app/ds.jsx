// Tamos design system — tokens, primitives, icons, hexagonal motif
// All theming is via CSS variables on the device root. Pass `dark` prop to flip.

const TAMOS = {
  // Brand — from logo (hexagonal mosaic red/green/blue)
  green:  '#2A8847',
  greenDeep: '#1B6B36',
  blue:   '#2C4A9E',
  blueDeep:  '#1F3A82',
  red:    '#D63030',
  redDeep:   '#B12626',
  gold:   '#F2B73D',
  goldDeep:  '#D69A1E',
};

// Light + dark CSS variables. Scoped to .tamos-root so canvas frames can flip
// independently.
const themeCSS = `
  .tamos-root {
    --bg: #F6F4EE;
    --bg-2: #ECEAE2;
    --surface: #FFFFFF;
    --surface-2: #F9F7F1;
    --ink: #14110D;
    --ink-2: #4A463E;
    --ink-3: #8C8678;
    --border: #E4DFD3;
    --border-strong: #C9C2B0;
    --shadow: 0 1px 2px rgba(20,17,13,0.04), 0 8px 24px rgba(20,17,13,0.06);
    --shadow-lg: 0 4px 12px rgba(20,17,13,0.06), 0 24px 48px rgba(20,17,13,0.10);
    --tamos-green: ${TAMOS.green};
    --tamos-green-deep: ${TAMOS.greenDeep};
    --tamos-blue: ${TAMOS.blue};
    --tamos-blue-deep: ${TAMOS.blueDeep};
    --tamos-red: ${TAMOS.red};
    --tamos-red-deep: ${TAMOS.redDeep};
    --tamos-gold: ${TAMOS.gold};
    --tamos-gold-deep: ${TAMOS.goldDeep};
    --green-soft: #E5F1E6;
    --blue-soft: #E4E9F4;
    --red-soft:  #F6E3E0;
    --gold-soft: #FBEFCF;
    font-family: 'Onest', -apple-system, system-ui, sans-serif;
    color: var(--ink);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }
  .tamos-root.dark {
    --bg: #0F0E0C;
    --bg-2: #19171A;
    --surface: #1B1916;
    --surface-2: #232019;
    --ink: #F5F2E9;
    --ink-2: #B9B3A3;
    --ink-3: #6E6A5E;
    --border: #2C2823;
    --border-strong: #423D34;
    --shadow: 0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.5);
    --shadow-lg: 0 4px 12px rgba(0,0,0,0.5), 0 24px 48px rgba(0,0,0,0.65);
    --green-soft: #1B3024;
    --blue-soft: #1C2541;
    --red-soft:  #3A1F1C;
    --gold-soft: #3A2D14;
  }
  .tamos-root * { box-sizing: border-box; }
  .tamos-root button { font: inherit; color: inherit; background: none; border: none; padding: 0; cursor: pointer; }
  .tamos-root::-webkit-scrollbar { display: none; }
  .tamos-scroll { overflow-y: auto; scrollbar-width: none; }
  .tamos-scroll::-webkit-scrollbar { display: none; }
  .tamos-root h1, .tamos-root h2, .tamos-root h3, .tamos-root h4, .tamos-root p { margin: 0; }
`;

// ─── Hexagon primitive ──────────────────────────────────────────────────────
// Pointy-top regular hexagon. Pass `fill` (string) for solid, or `pattern` for
// the Tamos three-colour mosaic identity glyph.
function Hex({ size = 24, fill = 'currentColor', stroke, strokeWidth = 0, style = {}, children }) {
  // Pointy-top hex: w = √3/2 * h. We use viewBox 100×100 normalized.
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <polygon
        points="50,2 95,27 95,73 50,98 5,73 5,27"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {children}
    </svg>
  );
}

// Tamos identity glyph — the 3-coloured hex cluster from the school logo, but
// abstracted (not a recreation). 4-hex arrangement.
function TamosGlyph({ size = 40, style = {} }) {
  const s = size;
  // 4 small hexes packed inside one bounding box. Approx the logo composition.
  const dotSize = s * 0.46;
  const wrap = { position: 'relative', width: s, height: s, ...style };
  const hex = (x, y, color) => (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: dotSize, height: dotSize, display: 'flex',
    }}>
      <Hex size={dotSize} fill={color} />
    </div>
  );
  return (
    <div style={wrap}>
      {hex(s * 0.00, s * 0.10, TAMOS.green)}
      {hex(s * 0.40, s * 0.00, TAMOS.red)}
      {hex(s * 0.27, s * 0.42, TAMOS.blue)}
      {hex(s * 0.54, s * 0.42, '#fff')}
    </div>
  );
}

// Honeycomb pattern background for hero sections
function HexPattern({ color = 'rgba(255,255,255,0.08)', size = 36 }) {
  const id = React.useId();
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        <pattern id={id} x="0" y="0" width={size * 1.732} height={size * 1.5} patternUnits="userSpaceOnUse">
          <polygon points={`${size*0.866},0 ${size*1.732},${size*0.5} ${size*1.732},${size*1.5} ${size*0.866},${size*2} 0,${size*1.5} 0,${size*0.5}`}
            fill="none" stroke={color} strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`}/>
    </svg>
  );
}

// ─── Common primitives ──────────────────────────────────────────────────────
function Card({ children, style = {}, padded = true, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)',
      borderRadius: 20,
      border: '1px solid var(--border)',
      padding: padded ? 16 : 0,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

function Pill({ children, color = 'gray', style = {} }) {
  const colorMap = {
    green: ['var(--tamos-green)', 'var(--green-soft)'],
    blue:  ['var(--tamos-blue)',  'var(--blue-soft)'],
    red:   ['var(--tamos-red)',   'var(--red-soft)'],
    gold:  ['var(--tamos-gold-deep)', 'var(--gold-soft)'],
    gray:  ['var(--ink-2)', 'var(--bg-2)'],
  };
  const [fg, bg] = colorMap[color] || colorMap.gray;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 12, fontWeight: 600, letterSpacing: 0.1,
      padding: '4px 9px', borderRadius: 999,
      background: bg, color: fg,
      ...style,
    }}>{children}</span>
  );
}

function Avatar({ name = '', size = 40, color = 'green', img }) {
  const c = { green: TAMOS.green, blue: TAMOS.blue, red: TAMOS.red, gold: TAMOS.gold }[color] || TAMOS.green;
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Hex size={size} fill={c} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: size * 0.36,
        backgroundImage: img ? `url(${img})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
        WebkitMaskImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 100 100\\"><polygon points=\\"50,2 95,27 95,73 50,98 5,73 5,27\\"/></svg>")',
        WebkitMaskSize: 'contain', maskImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 100 100\\"><polygon points=\\"50,2 95,27 95,73 50,98 5,73 5,27\\"/></svg>")',
        maskSize: 'contain',
      }}>{!img && initials}</div>
    </div>
  );
}

function PrimaryButton({ children, onClick, color = 'green', style = {}, full = true, disabled }) {
  const colorMap = {
    green: ['var(--tamos-green)', '#fff'],
    blue:  ['var(--tamos-blue)',  '#fff'],
    red:   ['var(--tamos-red)',   '#fff'],
    gold:  ['var(--tamos-gold-deep)', '#fff'],
    ghost: ['var(--surface-2)', 'var(--ink)'],
  };
  const [bg, fg] = colorMap[color] || colorMap.green;
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      width: full ? '100%' : 'auto',
      height: 54, borderRadius: 999,
      background: bg, color: fg,
      fontSize: 16, fontWeight: 600, letterSpacing: -0.1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '0 24px',
      boxShadow: color !== 'ghost' ? '0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 14px rgba(20,17,13,0.12)' : undefined,
      opacity: disabled ? 0.5 : 1,
      transition: 'transform 0.1s',
      ...style,
    }}>{children}</button>
  );
}

// ─── Iconography (line, 24px) ───────────────────────────────────────────────
function Icon({ name, size = 24, color = 'currentColor', strokeWidth = 1.8 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    book: <><path d="M4 5a3 3 0 0 1 3-3h13v18H7a3 3 0 0 0-3 3z"/><path d="M4 5v18"/></>,
    trophy: <><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M10 15h4M9 20h6M12 15v5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M17 20h4"/></>,
    star: <><path d="M12 2l3 7 7 .9-5.2 4.7L18.5 22 12 18l-6.5 4 1.7-7.4L2 9.9 9 9z"/></>,
    map: <><path d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2z"/><path d="M9 3v16M15 5v16"/></>,
    bell: <><path d="M18 16V11a6 6 0 0 0-12 0v5l-2 3h16zM10 21a2 2 0 0 0 4 0"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    chevronRight: <><path d="M9 6l6 6-6 6"/></>,
    chevronDown: <><path d="M6 9l6 6 6-6"/></>,
    chevronLeft: <><path d="M15 6l-6 6 6 6"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    check: <><path d="M5 12l5 5L20 7"/></>,
    x: <><path d="M6 6l12 12M18 6L6 18"/></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/></>,
    flame: <><path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-7-1 4 2 5 3 5 0-5 4-7 4-11 3 3 5 7 5 13 0 4-3 7-8 7z"/></>,
    coin: <><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1 1-2 3-2s3 1 3 2-1 1.5-3 1.5-3 .5-3 1.5 1 2 3 2 3-1 3-2"/></>,
    chat: <><path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4A8 8 0 1 1 21 12z"/></>,
    pencil: <><path d="M4 20l4-1L19 8l-3-3L5 16zM15 6l3 3"/></>,
    camera: <><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M9 6l2-3h2l2 3"/></>,
    arrowRight: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.5-2.4.9a7 7 0 0 0-1.7-1L14.4 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-.9-2 3.5L6 11a7 7 0 0 0 0 2l-2 1.6 2 3.5 2.4-.9a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.4.9 2-3.5L19 13"/></>,
    play: <><path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none"/></>,
    heroes: <><path d="M12 2l3 4-3 2-3-2zM5 9l3 3-3 4-3-3zM19 9l3 3-3 4-3-3zM12 13l3 4-3 5-3-5z"/></>,
    bag: <><path d="M5 7h14l-1 14H6zM9 7V5a3 3 0 0 1 6 0v2"/></>,
    clean: <><path d="M8 4h8l1 6H7zM12 10v6M9 22h6M9 22v-3M15 22v-3"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    face: <><circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M8 15s1.5 2 4 2 4-2 4-2"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>,
    upload: <><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></>,
    filter: <><path d="M4 5h16M7 12h10M10 19h4"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

// ─── Status bar (compact, replaces ios-frame's for branded variants) ────────
function TamosStatusBar({ dark = false, time = '9:41' }) {
  const c = dark ? '#fff' : 'var(--ink)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '17px 30px 8px', fontFamily: 'inherit', fontWeight: 600,
      fontSize: 17, color: c, position: 'relative', zIndex: 5,
    }}>
      <span>{time}</span>
      <div style={{ width: 130 }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="0.6" fill={c}/><rect x="5" y="5" width="3" height="6" rx="0.6" fill={c}/><rect x="10" y="2" width="3" height="9" rx="0.6" fill={c}/><rect x="15" y="0" width="3" height="11" rx="0.6" fill={c}/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3.5" stroke={c} strokeOpacity="0.4" fill="none"/><rect x="2" y="2" width="19" height="8" rx="2" fill={c}/></svg>
      </div>
    </div>
  );
}

// ─── Bottom tab bar ─────────────────────────────────────────────────────────
function BottomTabs({ active, onChange, items, dark }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
      paddingBottom: 24, paddingTop: 8,
      background: 'linear-gradient(to top, var(--surface) 60%, transparent)',
    }}>
      <div style={{
        margin: '0 14px', borderRadius: 28,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        padding: 6,
      }}>
        {items.map((it) => {
          const isOn = it.id === active;
          return (
            <button key={it.id} onClick={() => onChange(it.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 0',
              color: isOn ? '#fff' : 'var(--ink-2)',
              background: isOn ? 'var(--tamos-green)' : 'transparent',
              borderRadius: 22,
              transition: 'background 0.15s',
            }}>
              <Icon name={it.icon} size={22} strokeWidth={isOn ? 2.2 : 1.8}/>
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.1 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── App header (replaces ios-frame's IOSNavBar) ────────────────────────────
function AppHeader({ greeting, name, right, dark }) {
  return (
    <div style={{ padding: '6px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar name={name} size={44} color="blue" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 500 }}>{greeting}</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      </div>
      {right}
    </div>
  );
}

// Screen header with back chevron
function ScreenHeader({ title, back, right, large = false, sub }) {
  return (
    <div style={{ padding: '4px 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44 }}>
        {back !== undefined && (
          <button onClick={back} style={{
            width: 38, height: 38, borderRadius: 999, background: 'var(--surface)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="chevronLeft" size={20} />
          </button>
        )}
        {!large && <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>{title}</div>}
        {!large && (right || <div style={{ width: 38 }}/>)}
      </div>
      {large && (
        <div style={{ marginTop: 8 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: '36px' }}>{title}</h1>
          {sub && <div style={{ color: 'var(--ink-2)', fontSize: 14, marginTop: 4 }}>{sub}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Phone shell (matches IOSDevice but with custom theming + scroll handling) ──
function TamosPhone({ children, dark = false, width = 402, height = 874, scroll = true }) {
  return (
    <div className={`tamos-root ${dark ? 'dark' : ''}`} style={{
      width, height, borderRadius: 48, overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
    }}>
      {/* dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 100,
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      }}>
        <TamosStatusBar dark={dark} />
      </div>
      <div className={scroll ? 'tamos-scroll' : ''} style={{
        position: 'absolute', inset: 0, paddingTop: 50,
        overflowY: scroll ? 'auto' : 'hidden', overflowX: 'hidden',
      }}>
        {children}
      </div>
      {/* home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100,
        background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)', zIndex: 200,
      }}/>
    </div>
  );
}

// Inject CSS once globally
(function injectThemeCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tamos-theme-css')) return;
  const tag = document.createElement('style');
  tag.id = 'tamos-theme-css';
  tag.textContent = themeCSS;
  document.head.appendChild(tag);
})();

Object.assign(window, {
  TAMOS, Hex, TamosGlyph, HexPattern,
  Card, Pill, Avatar, PrimaryButton, Icon,
  TamosStatusBar, BottomTabs, AppHeader, ScreenHeader, TamosPhone,
});
