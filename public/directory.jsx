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
  const isGrupo = !!item.grupo;
  return (
    <article className="gm-row">
      <div className="gm-row__body">
        {isGrupo ? (
          <>
            <h3 className="gm-row__role"><Highlight text={item.names || `Ramal ${item.ext}`} query={query} /></h3>
            <p className="gm-row__names gm-row__names--grupo">Grupo de Transferência</p>
          </>
        ) : (
          <>
            <h3 className="gm-row__role"><Highlight text={item.role} query={query} /></h3>
            {item.names ? (
              <p className="gm-row__names"><Highlight text={item.names} query={query} /></p>
            ) : (
              <p className="gm-row__names gm-row__names--empty">
                {isToll ? "Discagem gratuita" : "Ramal de setor"}
              </p>
            )}
          </>
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

function SectorCombobox({ value, onChange }) {
  const [setores, setSetores] = useState([]);
  const [stale, setStale] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const dropRef = useRef(null);

  useEffect(() => {
    fetch('/api/setores')
      .then(r => r.json())
      .then(d => {
        setSetores((d.setores || []).sort((a, b) => a.name.localeCompare(b.name, 'pt')));
        setStale(!!d.stale);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = plainNorm(query.trim());
    if (!q) return setores;
    return setores.filter(s => plainNorm(s.name).includes(q));
  }, [setores, query]);

  function select(name) {
    setQuery(name); onChange(name); setOpen(false); setActive(-1);
  }

  function handleKey(e) {
    if (!open) {
      if (e.key === 'ArrowDown') { setOpen(true); setActive(0); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') { setActive(i => Math.min(i + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setActive(i => Math.max(i - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter' && active >= 0) { select(filtered[active].name); e.preventDefault(); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  }

  useEffect(() => {
    if (open && active >= 0 && dropRef.current) {
      const opt = dropRef.current.children[active];
      if (opt) opt.scrollIntoView({ block: 'nearest' });
    }
  }, [active, open]);

  return (
    <div className="adm-combo">
      <input
        className="adm-input"
        value={query}
        placeholder="Buscar setor…"
        autoComplete="off"
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKey}
      />
      {stale && <span className="adm-combo__stale">Usando cache (sistema-chamados offline)</span>}
      {open && filtered.length > 0 && (
        <div ref={dropRef} className="adm-combo__drop">
          {filtered.map((s, i) => (
            <div key={s.id} className={'adm-combo__opt' + (i === active ? ' is-active' : '')}
              onMouseDown={() => select(s.name)}>
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EntryForm({ entry, sectors, onSave, onCancel }) {
  const [grupo, setGrupo] = useState(entry ? !!entry.grupo : false);
  const [sector, setSector] = useState(entry && !entry.grupo ? entry.sector : '');
  const [role, setRole] = useState(entry && !entry.grupo ? entry.role : '');
  const [names, setNames] = useState(entry ? entry.names : '');
  const [ext, setExt] = useState(entry ? entry.ext : '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  function validate() {
    const e = {};
    if (!ext.trim()) e.ext = 'Ramal é obrigatório';
    if (!grupo) {
      if (!sector.trim()) e.sector = 'Setor é obrigatório';
      if (!role.trim()) e.role = 'Cargo é obrigatório';
    }
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSave() {
    setApiError('');
    if (!validate()) return;
    const all = sectors.flatMap(s => s.entries.map(x => ({ ...x, _sector: s.sector })));
    const dup = all.find(x => x.ext.trim() === ext.trim() && x.id !== entry?.id);
    if (dup) {
      const where = dup.grupo ? 'Grupo de Transferência' : `${dup.role} · ${dup._sector}`;
      if (!window.confirm(`Ramal ${ext} já está em uso:\n${where}\n\nSalvar mesmo assim?`)) return;
    }
    setSaving(true);
    const payload = grupo
      ? { grupo: true, names: names.trim(), ext: ext.trim() }
      : { grupo: false, sector: sector.trim(), short: (sectors.find(s => s.sector === sector)?.short || sector.split(/[\s/]/)[0]), role: role.trim(), names: names.trim(), ext: ext.trim() };
    const result = await onSave(payload);
    if (result && result.ok === false) {
      setApiError(result.erro || 'Erro ao salvar');
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return (
    <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="adm-modal">
        <div className="adm-modal__header">
          <span>{entry ? 'Editar Ramal' : 'Adicionar Ramal'}</span>
          <button className="adm-close-sm" onClick={onCancel} aria-label="Fechar"><IconClose size="16" /></button>
        </div>
        <div className="adm-modal__body">
          {apiError && <div className="adm-form-error">{apiError}</div>}

          <label className="adm-checkbox-row">
            <input type="checkbox" checked={grupo}
              onChange={e => {
                const v = e.target.checked;
                setGrupo(v);
                if (v) { setSector(''); setRole(''); setErrors({ ...errors, sector: '', role: '' }); }
              }} />
            <span>Grupo de Transferência</span>
          </label>

          {!grupo && (
            <>
              <label className="adm-label">Setor *</label>
              <SectorCombobox value={sector} onChange={v => { setSector(v); if (errors.sector) setErrors({ ...errors, sector: '' }); }} />
              {errors.sector && <span className="adm-field-error">{errors.sector}</span>}

              <label className="adm-label">Cargo / Função *</label>
              <input className={'adm-input' + (errors.role ? ' adm-input--err' : '')}
                value={role}
                onChange={e => { setRole(e.target.value); if (errors.role) setErrors({ ...errors, role: '' }); }}
                placeholder="Ex: Gerente de Recepção" />
              {errors.role && <span className="adm-field-error">{errors.role}</span>}
            </>
          )}

          <label className="adm-label">{grupo ? 'Nome do Grupo' : 'Nomes'}</label>
          <input className="adm-input" value={names} onChange={e => setNames(e.target.value)}
            placeholder={grupo ? 'Ex: Recepção Geral' : 'Ex: João Silva / Maria Santos'} />

          <label className="adm-label">Ramal / Número *</label>
          <input className={'adm-input' + (errors.ext ? ' adm-input--err' : '')}
            value={ext}
            onChange={e => { setExt(e.target.value); if (errors.ext) setErrors({ ...errors, ext: '' }); }}
            placeholder="Ex: 5001" />
          {errors.ext && <span className="adm-field-error">{errors.ext}</span>}
        </div>
        <div className="adm-modal__footer">
          <button className="adm-btn adm-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className="adm-btn adm-btn--gold" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ onClose }) {
  const [history, setHistory] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);

  function carregar() {
    setLoading(true);
    fetch('/api/directory/history')
      .then(r => r.json())
      .then(d => setHistory(d.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, []);

  const ACTION_LABEL = {
    criado: 'Criado', editado: 'Editado', ativado: 'Ativado', inativado: 'Inativado',
    setor_criado: 'Setor Criado', setor_editado: 'Setor Renomeado',
    setor_ativado: 'Setor Ativado', setor_inativado: 'Setor Desativado',
    marcado_grupo: 'Marcado como Grupo', desmarcado_grupo: 'Desmarcado como Grupo',
    realocado: 'Realocação automática',
  };
  const ACTION_CLS = {
    criado: 'adm-hist-badge--new', editado: 'adm-hist-badge--edit',
    ativado: 'adm-hist-badge--on', inativado: 'adm-hist-badge--off',
    setor_criado: 'adm-hist-badge--new', setor_editado: 'adm-hist-badge--edit',
    setor_ativado: 'adm-hist-badge--on', setor_inativado: 'adm-hist-badge--off',
    marcado_grupo: 'adm-hist-badge--edit', desmarcado_grupo: 'adm-hist-badge--edit',
    realocado: 'adm-hist-badge--edit',
  };
  const FIELD_LABEL = { sector: 'Setor', role: 'Cargo', names: 'Nomes', ext: 'Ramal', nome: 'Nome', grupo: 'Grupo', pendente: 'Pendente' };
  function fmtVal(k, v) {
    if (k === 'grupo' || k === 'pendente') return v ? 'Sim' : 'Não';
    return v || '—';
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function localDateStr(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function renderDiff(before, after) {
    if (!before || !after) return null;
    const changed = Object.keys(FIELD_LABEL).filter(k => (before[k] ?? (k === 'grupo' ? false : '')) !== (after[k] ?? (k === 'grupo' ? false : '')));
    if (!changed.length) return <span className="adm-hist-nodiff">Sem alterações nos campos.</span>;
    return (
      <div className="adm-hist-diff">
        {changed.map(k => (
          <div key={k} className="adm-hist-diff-row">
            <span className="adm-hist-diff-field">{FIELD_LABEL[k]}</span>
            <span className="adm-hist-diff-before">{fmtVal(k, before[k])}</span>
            <span className="adm-hist-diff-arrow">→</span>
            <span className="adm-hist-diff-after">{fmtVal(k, after[k])}</span>
          </div>
        ))}
      </div>
    );
  }

  const filtered = history && filterDate
    ? history.filter(h => localDateStr(h.at) === filterDate)
    : history;

  return (
    <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal adm-modal--hist">
        <div className="adm-modal__header">
          <span>Histórico Geral</span>
          <button className="adm-close-sm" onClick={onClose} aria-label="Fechar"><IconClose size="16" /></button>
        </div>
        <div className="adm-hist-filter">
          <input
            type="date"
            className="adm-input adm-hist-date-input"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            title="Filtrar por dia"
          />
          {filterDate && (
            <button className="adm-btn adm-btn--ghost adm-hist-clear-btn" onClick={() => setFilterDate('')}>
              ×  Limpar
            </button>
          )}
          <button className="adm-btn adm-btn--ghost adm-hist-clear-btn" onClick={carregar}
            disabled={loading} style={{ marginLeft: 'auto' }}>
            {loading ? '…' : '↻ Atualizar'}
          </button>
        </div>
        <div className="adm-hist-body">
          {filtered === null ? (
            <p className="adm-hist-empty">Carregando…</p>
          ) : filtered.length === 0 && !filterDate ? (
            <p className="adm-hist-empty">Nenhum registro ainda.</p>
          ) : filtered.length === 0 ? (
            <p className="adm-hist-empty">Nenhum registro neste dia.</p>
          ) : filtered.map((h, i) => (
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
              {(h.action === 'editado' || h.action === 'setor_editado' || h.action === 'marcado_grupo' || h.action === 'desmarcado_grupo' || h.action === 'realocado') && renderDiff(h.before, h.after)}
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
  const [filterText, setFilterText] = useState("");
  const [showHist, setShowHist] = useState(false);
  const [histKey, setHistKey] = useState(0);
  const [toast, setToast] = useState('');

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }
  function bumpHist() { setHistKey(k => k + 1); }

  const allEntries = useMemo(() =>
    sectors.flatMap(s => s.entries.map(e => ({ ...e, sector: s.sector, short: s.short }))),
    [sectors]
  );

  const visible = useMemo(() => {
    const q = plainNorm(filterText.trim());
    return allEntries
      .filter(e => filterSector === "all" || e.sector === filterSector)
      .filter(e => !q || plainNorm([e.role, e.names, e.ext, e.sector].join(" ")).includes(q));
  }, [allEntries, filterSector, filterText]);

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
          <input
            className="adm-input adm-toolbar__search"
            type="search"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Filtrar por cargo, nome, ramal…"
            autoComplete="off"
          />
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
              <span className="adm-cell adm-cell--role">
                {entry.grupo ? <span className="adm-grupo-tag">Grupo de Transferência</span> : entry.role}
              </span>
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
                  onClick={async () => { await onToggle(entry.id); bumpHist(); }}>
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
            const result = editEntry ? await onEdit(editEntry.id, data) : await onAdd(data);
            if (result && result.ok) {
              setFormOpen(false);
              notify(editEntry ? 'Ramal atualizado.' : 'Ramal adicionado.');
              bumpHist();
            }
            return result;
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {showHist && <HistoryModal key={histKey} onClose={() => setShowHist(false)} />}
      {toast && <div className="adm-toast">{toast}</div>}
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
  const [chamadosSetores, setChamadosSetores] = useState([]);

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

    const fetchSetores = () => fetch("/api/setores")
      .then(r => r.json())
      .then(d => setChamadosSetores(d.setores || []))
      .catch(() => {});
    fetchSetores();
    const t = setInterval(fetchSetores, 30000);
    return () => clearInterval(t);
  }, []);

  async function reloadDir() {
    const d = await fetch("/api/directory").then(r => r.json());
    if (d.ok) setAllSectors(d.sectors);
  }

  async function handleAdd(data) {
    try {
      const r = await fetch("/api/directory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json();
      if (d.ok) await reloadDir();
      return d;
    } catch { return { ok: false, erro: 'Erro de conexão' }; }
  }

  async function handleEdit(id, data) {
    try {
      const r = await fetch(`/api/directory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json();
      if (d.ok) await reloadDir();
      return d;
    } catch { return { ok: false, erro: 'Erro de conexão' }; }
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
      .filter((s) => {
        if (sector === "all") return true;
        if (sector === "__pendente") return s.entries.some(e => e.pendente);
        return s.sector === sector;
      })
      .map((s) => {
        let entries = s.entries;
        if (sector === "__pendente") entries = entries.filter(e => e.pendente);
        if (q) entries = entries.filter((e) => match(e, s, q));
        return { ...s, entries };
      })
      .filter((s) => s.entries.length > 0);
  }, [publicSectors, query, sector]);

  const shown = useMemo(() => filtered.reduce((n, s) => n + s.entries.length, 0), [filtered]);

  const chipList = useMemo(() => {
    const q = plainNorm(query.trim());
    const matchEntry = (e, s) => !q || match(e, s, q);
    const hasGrupos = publicSectors.some(s => s.sector === 'Grupos de Transferência' && s.entries.some(matchEntry));
    let pendCount = 0;
    publicSectors.forEach(s => s.entries.forEach(e => { if (e.pendente && matchEntry(e, s)) pendCount++; }));
    const setores = chamadosSetores
      .filter(s => s.name !== 'Grupos de Transferência')
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
      .map(s => ({ sector: s.name, short: s.name }));
    const out = [...setores];
    if (hasGrupos) out.push({ sector: 'Grupos de Transferência', short: 'Grupos Transferência' });
    if (pendCount > 0) out.push({ sector: '__pendente', short: 'Pendente' });
    return out;
  }, [chamadosSetores, publicSectors, query]);

  const counts = useMemo(() => {
    const q = plainNorm(query.trim()); const map = {};
    publicSectors.forEach((s) => {
      map[s.sector] = !q ? s.entries.length : s.entries.filter((e) => match(e, s, q)).length;
    });
    let pendCount = 0;
    publicSectors.forEach(s => s.entries.forEach(e => {
      if (e.pendente && (!q || match(e, s, q))) pendCount++;
    }));
    map.__pendente = pendCount;
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
        <GMChrome.SectorChips sectors={chipList} active={sector} onPick={setSector} counts={counts} />
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
