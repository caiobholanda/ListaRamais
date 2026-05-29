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

function StatusDot() {
  return (
    <span className="gm-status" title="Central em operação 24h">
      <span className="gm-status__dot" aria-hidden="true" />
      <span className="gm-status__txt">Em operação · 24h</span>
    </span>
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

function Header({ theme, onToggle, scrolled }) {
  return (
    <header className={"gm-header" + (scrolled ? " is-scrolled" : "")} id="top">
      <div className="gm-header__inner">
        <Logo />
        <div className="gm-header__right">
          <StatusDot />
          <ThemeToggle theme={theme} onToggle={onToggle} />
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

window.GMChrome = { Logo, ThemeToggle, StatusDot, Header, Hero, SectorChips };
