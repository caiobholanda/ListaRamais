function normMap(str) {
  let norm = ""; const map = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    for (let k = 0; k < c.length; k++) { norm += c[k]; map.push(i); }
  }
  return { norm, map };
}
function plainNorm(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const CHAMADOS_SECTORS = [
  'Banquetes','Bar Rooftop','Comercial / Vendas','Compras / Almoxarifado','Concierge',
  'Confeitaria / Padaria','Controladoria','Cozinha','Estacionamento','Eventos e Convenções',
  'Financeiro','Fitness Center','Gerência Geral','Governança','Jurídico','Lavanderia',
  'Lobby Bar','Manutenção','Marketing','Mensageria / Portaria','Nutrição','Piscina',
  'Play Gran','Recepção','Recursos Humanos','Reservas','Restaurante Mangostin',
  'Restaurante Mucuripe','Revenue Management','Room Service','Rouparia','Segurança',
  "Spa by L'Occitane",'Tecnologia da Informação','Transportes'
];

function SectorCombobox({ value, onChange, dirSectors }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  const allOptions = useMemo(() => {
    const seen = new Set();
    return [...dirSectors, ...CHAMADOS_SECTORS]
      .filter(s => { const k = plainNorm(s); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.localeCompare(b, 'pt'));
  }, [dirSectors]);

  const filtered = useMemo(() => {
    const q = plainNorm(value.trim());
    return q ? allOptions.filter(s => plainNorm(s).includes(q)) : allOptions;
  }, [allOptions, value]);

  function pick(s) { onChange(s); setOpen(false); setHighlighted(-1); }

  function handleKeyDown(e) {
    if (!open) { if (e.key === 'ArrowDown') { setOpen(true); setHighlighted(0); e.preventDefault(); } return; }
    if (e.key === 'ArrowDown') { setHighlighted(h => Math.min(h + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setHighlighted(h => Math.max(h - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter' && highlighted >= 0) { pick(filtered[highlighted]); e.preventDefault(); }
    else if (e.key === 'Escape') { setOpen(false); setHighlighted(-1); }
  }

  useEffect(() => {
    if (open && highlighted >= 0 && dropRef.current) {
      const el = dropRef.current.children[highlighted];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, open]);

  return (
    <div className="adm-combo">
      <input
        ref={inputRef}
        className="adm-input"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        onKeyDown={handleKeyDown}
        placeholder="Setor"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="adm-combo__drop" ref={dropRef}>
          {filtered.map((s, i) => (
            <div key={s} className={"adm-combo__opt" + (i === highlighted ? " is-hi" : "")}
              onMouseDown={() => pick(s)} onMouseEnter={() => setHighlighted(i)}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Highlight({ text, query }) {
  if (!query || !text) return text || null;
  const q = plainNorm(query.trim());
  if (!q) return text;
  const { norm, map } = normMap(text);
  const out = []; let from = 0, idx, key = 0;
  while ((idx = norm.indexOf(q, from)) !== -1) {
    const oStart = map[idx];
    const oEnd = map[idx + q.length - 1] + 1;
    const prevOrig = out._lastOrig || 0;
    out.push(<span key={"t" + key}>{text.slice(prevOrig, oStart)}</span>);
    out.push(<mark key={"m" + key} className="gm-mark">{text.slice(oStart, oEnd)}</mark>);
    out._lastOrig = oEnd; from = idx + q.length; key++;
  }
  out.push(<span key="tail">{text.slice(out._lastOrig || 0)}</span>);
  return out;
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (val) => {
    const clean = val.replace(/\s/g, "");
    if (navigator.clipboard) navigator.clipboard.writeText(clean).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  };
  return [copied, copy];
}

function Entry({ item, query }) {
  const [copied, copy] = useCopy();
  const compact = item.ext.replace(/\s/g, "");
  const isToll = /^0800/.test(compact);
  const isLong = compact.length > 6;
  return (
    <article className="gm-row">
      <div className="gm-row__body">
        <h3 className="gm-row__role"><Highlight text={item.role} query={query} /></h3>
        {item.names ? (
          <p className="gm-row__names"><Highlight text={item.names} query={query} /></p>
        ) : (
          <p className="gm-row__names gm-row__names--empty">
            {isToll ? "Discagem gratuita" : "Ramal de setor"}
          </p>
        )}
      </div>
      <div className="gm-row__ext">
        <span className={"gm-num" + (isLong ? " gm-num--sm" : "")}>
          <Highlight text={item.ext} query={query} />
        </span>
        <button className="gm-row__copy" onClick={() => copy(item.ext)}
          aria-label="Copiar número" title={copied ? "Copiado!" : "Copiar"}>
          {copied ? <IconCheck size="15" /> : <IconCopy size="15" />}
        </button>
      </div>
    </article>
  );
}

function slug(s) { return plainNorm(s).replace(/[^a-z0-9]+/g, "-"); }

function Section({ data, query, index }) {
  return (
    <section className="gm-section" aria-labelledby={"sec-" + slug(data.sector)}>
      <div className="gm-section__head">
        <span className="gm-section__idx" aria-hidden="true">{String(index).padStart(2, "0")}</span>
        <h2 className="gm-section__title" id={"sec-" + slug(data.sector)}>
          <span className="gm-section__ic" aria-hidden="true"><SectorIcon sector={data.sector} size="18" /></span>
          <em>{data.sector}</em>
        </h2>
        <span className="gm-section__rule" aria-hidden="true" />
        <span className="gm-section__count">{String(data.entries.length).padStart(2, "0")}</span>
      </div>
      <div className="gm-grid">
        {data.entries.map((item, i) => <Entry key={data.sector + i} item={item} query={query} />)}
      </div>
    </section>
  );
}

function EmptyState({ query, onClear }) {
  return (
    <div className="gm-empty">
      <span className="gm-empty__icon" aria-hidden="true"><IconSearch size="30" sw="1.2" /></span>
      <h2 className="gm-empty__title">Nenhum ramal encontrado para <em>"{query}"</em>.</h2>
      <p className="gm-empty__sub">Tente outro nome, cargo, setor ou número.</p>
      <button className="gm-btn" onClick={onClear}>Limpar busca</button>
    </div>
  );
}

// ── Admin Panel ──────────────────────────────────────────────────────────────

function EntryForm({ entry, sectors, onSave, onCancel }) {
  const [sector, setSector] = useState(entry ? entry.sector : (sectors[0] ? sectors[0].sector : ""));
  const [role, setRole] = useState(entry ? entry.role : "");
  const [names, setNames] = useState(entry ? entry.names : "");
  const [ext, setExt] = useState(entry ? entry.ext : "");
  const [saving, setSaving] = useState(false);

  const existingSectors = sectors.map(s => s.sector);

  async function handleSave() {
    if (!sector.trim() || !role.trim() || !ext.trim()) return;
    setSaving(true);
    const short = sectors.find(s => s.sector === sector)?.short || sector.split(/[\s/]/)[0];
    await onSave({ sector: sector.trim(), short, role: role.trim(), names: names.trim(), ext: ext.trim() });
    setSaving(false);
  }

  return (
    <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="adm-modal">
        <div className="adm-modal__header">
          <span>{entry ? "Editar Ramal" : "Adicionar Ramal"}</span>
          <button className="adm-close-sm" onClick={onCancel} aria-label="Fechar"><IconClose size="16" /></button>
        </div>
        <div className="adm-modal__body">
          <label className="adm-label">Setor</label>
          <SectorCombobox value={sector} onChange={setSector} dirSectors={existingSectors} />

          <label className="adm-label">Cargo / Função *</label>
          <input className="adm-input" value={role} onChange={e => setRole(e.target.value)}
            placeholder="Ex: Gerente de Recepção" />

          <label className="adm-label">Nomes</label>
          <input className="adm-input" value={names} onChange={e => setNames(e.target.value)}
            placeholder="Ex: João Silva / Maria Santos" />

          <label className="adm-label">Ramal / Número *</label>
          <input className="adm-input" value={ext} onChange={e => setExt(e.target.value)}
            placeholder="Ex: 5001" />
        </div>
        <div className="adm-modal__footer">
          <button className="adm-btn adm-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className="adm-btn adm-btn--gold" onClick={handleSave}
            disabled={saving || !sector.trim() || !role.trim() || !ext.trim()}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ onClose }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    fetch('/api/directory/history')
      .then(r => r.json())
      .then(d => setHistory(d.history || []))
      .catch(() => setHistory([]));
  }, []);

  const ACTION_LABEL = { criado: 'Criado', editado: 'Editado', ativado: 'Ativado', inativado: 'Inativado' };
  const ACTION_CLS   = { criado: 'adm-hist-badge--new', editado: 'adm-hist-badge--edit', ativado: 'adm-hist-badge--on', inativado: 'adm-hist-badge--off' };
  const FIELD_LABEL  = { sector: 'Setor', role: 'Cargo', names: 'Nomes', ext: 'Ramal' };

  function fmtDate(iso) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function renderDiff(before, after) {
    if (!before || !after) return null;
    const changed = Object.keys(FIELD_LABEL).filter(k => before[k] !== after[k]);
    if (!changed.length) return <span className="adm-hist-nodiff">Sem alterações nos campos.</span>;
    return (
      <div className="adm-hist-diff">
        {changed.map(k => (
          <div key={k} className="adm-hist-diff-row">
            <span className="adm-hist-diff-field">{FIELD_LABEL[k]}</span>
            <span className="adm-hist-diff-before">{before[k] || '—'}</span>
            <span className="adm-hist-diff-arrow">→</span>
            <span className="adm-hist-diff-after">{after[k] || '—'}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal adm-modal--hist">
        <div className="adm-modal__header">
          <span>Histórico Geral</span>
          <button className="adm-close-sm" onClick={onClose} aria-label="Fechar"><IconClose size="16" /></button>
        </div>
        <div className="adm-hist-body">
          {history === null ? (
            <p className="adm-hist-empty">Carregando…</p>
          ) : history.length === 0 ? (
            <p className="adm-hist-empty">Nenhum registro ainda.</p>
          ) : history.map((h, i) => (
            <div key={i} className="adm-hist-item">
              <div className="adm-hist-item__head">
                <span className={"adm-hist-badge " + (ACTION_CLS[h.action] || '')}>{ACTION_LABEL[h.action] || h.action}</span>
                <span className="adm-hist-entry">
                  {h.role || `Ramal #${h.entryId}`}
                  {h.sector ? <em> · {h.sector}</em> : null}
                </span>
                <span className="adm-hist-by">{h.by}</span>
                <span className="adm-hist-at">{fmtDate(h.at)}</span>
              </div>
              {h.action === 'editado' && renderDiff(h.before, h.after)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ sectors, onClose, onAdd, onEdit, onToggle }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [filterSector, setFilterSector] = useState("all");
  const [showHist, setShowHist] = useState(false);

  const allEntries = useMemo(() =>
    sectors.flatMap(s => s.entries.map(e => ({ ...e, sector: s.sector, short: s.short }))),
    [sectors]
  );

  const visible = filterSector === "all"
    ? allEntries
    : allEntries.filter(e => e.sector === filterSector);

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div className="adm-panel" role="dialog" aria-label="Gerenciar diretório">
        <div className="adm-panel__header">
          <button className="adm-close-sm" onClick={onClose} aria-label="Fechar"><IconClose size="18" /></button>
          <span className="adm-title">Gerenciar Diretório</span>
          <button className="adm-hist-btn" onClick={() => setShowHist(true)}>
            <IconHistory size="13" sw="1.8" /> Histórico
          </button>
          <button className="adm-add-btn" onClick={() => { setEditEntry(null); setFormOpen(true); }}>
            <IconPlus size="14" sw="2.2" /> Adicionar
          </button>
        </div>

        <div className="adm-toolbar">
          <select className="adm-filter-select" value={filterSector}
            onChange={e => setFilterSector(e.target.value)}>
            <option value="all">Todos os setores</option>
            {sectors.map(s => <option key={s.sector} value={s.sector}>{s.short}</option>)}
          </select>
          <span className="adm-count">{visible.length} {visible.length === 1 ? "ramal" : "ramais"}</span>
        </div>

        <div className="adm-list">
          <div className="adm-list-head">
            <span>Setor</span>
            <span>Cargo</span>
            <span>Nomes</span>
            <span>Ramal</span>
            <span>Status</span>
            <span></span>
          </div>
          {visible.map(entry => (
            <div key={entry.id} className={"adm-row" + (entry.active === false ? " adm-row--off" : "")}>
              <span className="adm-cell adm-cell--sec" title={entry.sector}>{entry.short}</span>
              <span className="adm-cell adm-cell--role">{entry.role}</span>
              <span className="adm-cell adm-cell--names">{entry.names || <em className="adm-empty">—</em>}</span>
              <span className="adm-cell adm-cell--ext">{entry.ext}</span>
              <span className="adm-cell">
                <span className={"adm-badge" + (entry.active !== false ? " adm-badge--on" : " adm-badge--off")}>
                  {entry.active !== false ? "Ativo" : "Inativo"}
                </span>
              </span>
              <span className="adm-cell adm-cell--actions">
                <button className="adm-act" title="Editar"
                  onClick={() => { setEditEntry(entry); setFormOpen(true); }}>
                  <IconEdit size="14" sw="1.8" />
                </button>
                <button className={"adm-act adm-act--toggle" + (entry.active !== false ? " is-on" : "")}
                  title={entry.active !== false ? "Desativar" : "Ativar"}
                  onClick={() => onToggle(entry.id)}>
                  <span className="adm-toggle-pill" />
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {formOpen && (
        <EntryForm
          entry={editEntry}
          sectors={sectors}
          onSave={async (data) => {
            if (editEntry) await onEdit(editEntry.id, data);
            else await onAdd(data);
            setFormOpen(false);
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {showHist && <HistoryModal onClose={() => setShowHist(false)} />}
    </>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("gm-theme") || "light");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [allSectors, setAllSectors] = useState(window.GM_DIRECTORY || []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gm-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)hub_tipo=([^;]*)/);
    if (m && decodeURIComponent(m[1]) === "admin") setIsAdmin(true);

    fetch("/api/directory")
      .then(r => r.json())
      .then(d => { if (d.ok && d.sectors && d.sectors.length) setAllSectors(d.sectors); })
      .catch(() => {});
  }, []);

  async function reloadDir() {
    const d = await fetch("/api/directory").then(r => r.json());
    if (d.ok) setAllSectors(d.sectors);
  }

  async function handleAdd(data) {
    await fetch("/api/directory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    await reloadDir();
  }

  async function handleEdit(id, data) {
    await fetch(`/api/directory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    await reloadDir();
  }

  async function handleToggle(id) {
    await fetch(`/api/directory/${id}/toggle`, { method: "PATCH" });
    await reloadDir();
  }

  const publicSectors = useMemo(() =>
    allSectors
      .map(s => ({ ...s, entries: s.entries.filter(e => e.active !== false) }))
      .filter(s => s.entries.length > 0),
    [allSectors]
  );

  const match = (e, s, q) => {
    const hay = plainNorm([e.role, e.names, e.ext, s.sector].join(" "));
    return q.split(/\s+/).every((tok) => hay.includes(tok));
  };

  const filtered = useMemo(() => {
    const q = plainNorm(query.trim());
    return publicSectors
      .filter((s) => sector === "all" || s.sector === sector)
      .map((s) => q ? { ...s, entries: s.entries.filter((e) => match(e, s, q)) } : s)
      .filter((s) => s.entries.length > 0);
  }, [publicSectors, query, sector]);

  const shown = useMemo(() => filtered.reduce((n, s) => n + s.entries.length, 0), [filtered]);

  const counts = useMemo(() => {
    const q = plainNorm(query.trim()); const map = {};
    publicSectors.forEach((s) => {
      map[s.sector] = !q ? s.entries.length : s.entries.filter((e) => match(e, s, q)).length;
    });
    return map;
  }, [publicSectors, query]);

  const clear = () => setQuery("");

  return (
    <div className="gm-app">
      <GMChrome.Header
        theme={theme}
        onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
        scrolled={scrolled}
        isAdmin={isAdmin}
        onAdminClick={() => setShowAdmin(true)}
      />
      <main className="gm-main">
        <GMChrome.Hero query={query} onQuery={setQuery} shown={shown} onClear={clear} />
        <GMChrome.SectorChips sectors={publicSectors} active={sector} onPick={setSector} counts={counts} />
        <div className="gm-results">
          {filtered.length === 0
            ? <EmptyState query={query} onClear={clear} />
            : filtered.map((s, i) => <Section key={s.sector} data={s} query={query} index={i + 1} />)}
        </div>
      </main>

      {showAdmin && (
        <AdminPanel
          sectors={allSectors}
          onClose={() => setShowAdmin(false)}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
