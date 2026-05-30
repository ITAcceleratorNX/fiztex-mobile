// Auth screens — welcome, role select, QR + Face ID

function AuthWelcome({ onContinue }) {
  return (
    <>
      <div style={{ padding: '60px 24px 0', textAlign: 'center', height: 'calc(100% - 50px)', display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>
          <TamosGlyph size={84}/>
          <div style={{ marginTop: 22, fontSize: 38, fontWeight: 800, letterSpacing: -1, lineHeight: 1, color: 'var(--ink)' }}>
            Tamos
          </div>
          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, letterSpacing: 4, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
            education · international
          </div>
        </div>

        {/* Hero hexagons */}
        <div style={{ position: 'relative', flex: 1, marginTop: 32, marginBottom: 16 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <HexCluster/>
          </div>
        </div>

        <div style={{ textAlign: 'left', padding: '0 4px 24px' }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.7, lineHeight: 1.15 }}>
            Школа в твоём кармане
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.5 }}>
            Расписание, оценки, кружки, достижения и связь с учителями — всё в одном месте.
          </p>
        </div>

        <div style={{ paddingBottom: 24 }}>
          <PrimaryButton color="green" onClick={onContinue}>Войти</PrimaryButton>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-3)' }}>
            Нет аккаунта? <span style={{ color: 'var(--tamos-green)', fontWeight: 600 }}>Спросите у школы</span>
          </div>
        </div>
      </div>
    </>
  );
}

// Decorative hex cluster for hero
function HexCluster() {
  return (
    <div style={{ position: 'relative', width: 280, height: 280 }}>
      {/* Center large hex */}
      <div style={{ position: 'absolute', top: 90, left: 90 }}>
        <Hex size={100} fill="var(--tamos-green)"/>
      </div>
      {/* Top-right red */}
      <div style={{ position: 'absolute', top: 30, right: 50 }}>
        <Hex size={84} fill="var(--tamos-red)"/>
      </div>
      {/* Left blue */}
      <div style={{ position: 'absolute', top: 60, left: 10 }}>
        <Hex size={72} fill="var(--tamos-blue)"/>
      </div>
      {/* Bottom gold */}
      <div style={{ position: 'absolute', bottom: 30, left: 100 }}>
        <Hex size={64} fill="var(--tamos-gold)"/>
      </div>
      {/* Bottom-right outline */}
      <div style={{ position: 'absolute', bottom: 60, right: 30 }}>
        <Hex size={56} fill="transparent" stroke="var(--border-strong)" strokeWidth={3}/>
      </div>
    </div>
  );
}

function AuthSignIn({ onRole, onBack }) {
  return (
    <>
      <ScreenHeader title="Вход" back={onBack}/>
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.2, marginTop: 8 }}>
          Как ты заходишь?
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>
          Выбери способ — приложение запомнит выбор для следующего раза.
        </p>

        {/* QR */}
        <div style={{ marginTop: 24, position: 'relative' }}>
          <Card style={{ padding: 22, background: 'linear-gradient(135deg, #2A8847 0%, #1B6B36 100%)', color: '#fff', border: 'none', overflow: 'hidden', position: 'relative' }}>
            <HexPattern color="rgba(255,255,255,0.10)" size={26}/>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 52, height: 52, position: 'relative' }}>
                <Hex size={52} fill="rgba(255,255,255,0.20)"/>
                <Icon name="qr" size={26} color="#fff" style={{ position: 'absolute', inset: 13 }}/>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 14 }}>Вход по QR-коду</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Покажи QR на входе в школу</div>
              <button style={{ marginTop: 14, padding: '10px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600, fontSize: 14 }}>
                Сгенерировать QR
              </button>
            </div>
          </Card>
        </div>

        {/* Face ID */}
        <Card style={{ marginTop: 12, padding: 22, position: 'relative', overflow: 'hidden' }} onClick={() => onRole('select')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, position: 'relative' }}>
              <Hex size={52} fill="var(--tamos-blue)"/>
              <Icon name="face" size={26} color="#fff" style={{ position: 'absolute', inset: 13 }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Face ID</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>Привязанный аккаунт</div>
            </div>
            <Icon name="chevronRight" size={20} color="var(--ink-3)"/>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button style={{ color: 'var(--ink-2)', fontSize: 14, fontWeight: 600 }}>
            Войти по email и паролю
          </button>
        </div>
      </div>
    </>
  );
}

function AuthRolePicker({ onPick, onBack }) {
  const roles = [
    { id: 'student', name: 'Ученик',  sub: 'Расписание, оценки, ачивки', color: 'green' },
    { id: 'parent',  name: 'Родитель', sub: 'Следить за ребёнком', color: 'blue' },
    { id: 'teacher', name: 'Учитель', sub: 'Классы, оценки, фидбек',  color: 'red' },
  ];
  return (
    <>
      <ScreenHeader title="Роль" back={onBack}/>
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.2 }}>
          Я захожу как
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>
          На демо можно переключить роль в настройках.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
          {roles.map(r => (
            <Card key={r.id} onClick={() => onPick(r.id)} style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', width: 56, height: 56 }}>
                <Hex size={56} fill={`var(--tamos-${r.color})`}/>
                <Icon name={r.id === 'student' ? 'star' : r.id === 'parent' ? 'user' : 'pencil'} size={24} color="#fff" style={{ position: 'absolute', inset: 16 }}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{r.name}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{r.sub}</div>
              </div>
              <Icon name="chevronRight" size={20} color="var(--ink-3)"/>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

// Face ID auth animation moment
function AuthFaceID({ onSuccess, onBack }) {
  React.useEffect(() => {
    const t = setTimeout(() => onSuccess && onSuccess(), 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <ScreenHeader title="Face ID" back={onBack}/>
      <div style={{ padding: '0 24px', textAlign: 'center' }}>
        <div style={{ margin: '40px auto 0', width: 180, height: 180, position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 999,
            background: 'var(--blue-soft)',
            animation: 'pulse 2s ease-in-out infinite',
          }}/>
          <Hex size={180} fill="var(--tamos-blue)" style={{ position: 'absolute', inset: 0, opacity: 0.15 }}/>
          <div style={{ position: 'absolute', inset: 30 }}>
            <Hex size={120} fill="var(--tamos-blue)"/>
          </div>
          <Icon name="face" size={68} color="#fff" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}/>
        </div>
        <div style={{ marginTop: 28, fontSize: 17, fontWeight: 700 }}>Смотри в камеру</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>Идентификация…</div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.4 } 50% { transform: scale(1.1); opacity: 0.7 } }`}</style>
      </div>
    </>
  );
}

Object.assign(window, { AuthWelcome, AuthSignIn, AuthRolePicker, AuthFaceID, HexCluster });
