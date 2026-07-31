const { useState, useEffect, useRef, useMemo, useCallback } = React;

function Logo() {
  return (
    <a className="gm-logo" href="https://hub-granmarquise.fly.dev" target="_blank" rel="noopener noreferrer" aria-label="Abrir o Hub em nova aba" title="Abrir o Hub em nova aba" style={{ cursor: 'pointer' }}>
      <img
        src="https://letsimage.s3.amazonaws.com/editor/granmarquise/imgs/1760033174793-hotelgranmarquise_pos_footer.png"
        alt="Gran Marquise"
        className="gm-logo__img"
      />
      <span className="gm-logo__rule" aria-hidden="true" />
      <span className="gm-logo__tag">Lista de Contatos</span>
    </a>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === "dark";
  return (
    <button
      className="gm-toggle"
      onClick={onToggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
    >
      <span className={"gm-toggle__ic" + (dark ? "" : " is-on")}><IconSun /></span>
      <span className={"gm-toggle__ic" + (dark ? " is-on" : "")}><IconMoon /></span>
    </button>
  );
}

function AvatarHub() {
  const [nome, setNome] = useState('');
  const [fotoOk, setFotoOk] = useState(true);
  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.ok) setNome(d.nome || ''); })
      .catch(() => {});
  }, []);
  const iniciais = useMemo(() => {
    const p = (nome || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '';
    const a = p[0][0] || '';
    const b = p.length > 1 ? (p[p.length - 1][0] || '') : '';
    return (a + b).toUpperCase();
  }, [nome]);
  return (
    <span className="gm-user-avatar" title={nome || ''}>
      {fotoOk !== false
        ? <img src="/api/me/foto" alt="" onError={() => setFotoOk(false)} />
        : iniciais}
    </span>
  );
}

function Header({ theme, onToggle, scrolled, isAdmin, onAdminClick }) {
  function sairParaHub() {
    // Captura o tema ATUAL antes de limpar o storage para propagar ao Hub.
    let t = 'light';
    try { t = localStorage.getItem('gm-theme') === 'dark' ? 'dark' : 'light'; } catch {}
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    // ?logout=1&from=ramais permite ao Hub registrar este logout na jornada do usuario.
    // &theme=... mantem o modo de visualizacao sincronizado entre os sistemas.
    window.location.href = 'https://hub-granmarquise.fly.dev/?logout=1&from=ramais&theme=' + t;
  }
  // Padrao Gran Marquise (todos os sistemas do hub): DD/MM/AAAA · HH:MM (Fortaleza).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  const dataFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
  const horaFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit' }).format(now);
  return (
    <header className={"gm-header" + (scrolled ? " is-scrolled" : "")} id="top">
      <div className="gm-header__inner">
        <Logo />
        <div className="gm-header__right">
          <span className="gm-datahora" title="Horário de Fortaleza">{dataFmt} · {horaFmt}</span>
          <AvatarHub />
          {/* Botao 'Modo edicao' removido: para admin o modo edicao agora e'
              sempre ativo (lapis sempre visivel nos cards). */}
          {isAdmin && (
            <button className="gm-gear-btn" onClick={onAdminClick} title="Gerenciar diretório" aria-label="Gerenciar diretório">
              <IconGear size="18" />
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={onToggle} />
          <button
            className="gm-sair-btn"
            onClick={sairParaHub}
            title="Sair e voltar ao Hub"
            aria-label="Sair e voltar ao Hub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ query, onQuery, shown, onClear }) {
  const inputRef = useRef(null);
  useEffect(() => {
    function onKey(e) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault(); inputRef.current && inputRef.current.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) onClear();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClear]);

  return (
    <section className="gm-hero">
      <p className="gm-eyebrow">Lista de Ramais - Hotel Granmarquise</p>

      <div className="gm-search">
        <span className="gm-search__icon" aria-hidden="true"><IconSearch /></span>
        <input
          ref={inputRef}
          className="gm-search__input"
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Nome, cargo, setor ou número…"
          aria-label="Buscar ramal"
          autoComplete="off" spellCheck="false"
        />
        {query && (
          <button className="gm-search__clear" onClick={onClear} aria-label="Limpar busca"><IconClose /></button>
        )}
      </div>

      {query && (
        <p className="gm-hero__count" aria-live="polite">
          <span>{shown}</span> {shown === 1 ? "resultado" : "resultados"} para "{query}"
        </p>
      )}
    </section>
  );
}

function SectorChips({ sectors, active, onPick, counts }) {
  return (
    <nav className="gm-chips" aria-label="Filtrar por setor">
      <div className="gm-chips__rail">
        <button
          className={"gm-chip" + (active === "all" ? " is-active" : "")}
          onClick={() => onPick("all")} aria-pressed={active === "all"}
        >Todos</button>
        {sectors.map((s) => (
          <button
            key={s.sector}
            className={"gm-chip" + (active === s.sector ? " is-active" : "")}
            onClick={() => onPick(s.sector)} aria-pressed={active === s.sector}
            disabled={counts && counts[s.sector] === 0}
          >{s.short}</button>
        ))}
      </div>
    </nav>
  );
}

window.GMChrome = { Logo, ThemeToggle, Header, Hero, SectorChips };
