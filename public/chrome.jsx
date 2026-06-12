const { useState, useEffect, useRef, useMemo } = React;

function Logo() {
  return (
    <a className="gm-logo" href="#top" aria-label="Hotel Gran Marquise — início">
      <span className="gm-logo__mono" aria-hidden="true">GM</span>
      <span className="gm-logo__rule" aria-hidden="true" />
      <span className="gm-logo__words">
        <span className="gm-logo__pre">Hotel</span>
        <span className="gm-logo__name">Gran Marquise</span>
        <span className="gm-logo__tag">Diretório de Ramais</span>
      </span>
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

function Header({ theme, onToggle, scrolled, isAdmin, onAdminClick }) {
  function sairParaHub() {
    // Limpa qualquer storage local antes de redirecionar para o Hub.
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    window.location.href = 'https://hub-granmarquise.fly.dev/';
  }
  return (
    <header className={"gm-header" + (scrolled ? " is-scrolled" : "")} id="top">
      <div className="gm-header__inner">
        <Logo />
        <div className="gm-header__right">
          {isAdmin && (
            <button className="gm-gear-btn" onClick={onAdminClick} title="Gerenciar diretório" aria-label="Gerenciar diretório">
              <IconGear size="18" />
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={onToggle} />
          <button
            className="gm-gear-btn"
            onClick={sairParaHub}
            title="Sair e voltar ao Hub"
            aria-label="Sair e voltar ao Hub"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 12, fontSize: 13, fontWeight: 500 }}
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
