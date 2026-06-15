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
  const [copiedEmail, copyEmail] = useCopy();
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
            {item.email && (
              <p className="gm-row__names gm-row__email" style={{ marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <a href={`mailto:${item.email}`} style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'currentColor', textUnderlineOffset: 2 }}>
                  {item.email}
                </a>
                <button className="gm-row__copy gm-row__copy--email" onClick={() => copyEmail(item.email)}
                  aria-label="Copiar e-mail" title={copiedEmail ? "Copiado!" : "Copiar e-mail"}>
                  {copiedEmail ? <IconCheck size="13" /> : <IconCopy size="13" />}
                </button>
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

const DISPLAY_ALIAS = {
  'Tecnologia da Informação': 'TI',
  'Recursos Humanos': 'RH',
  "Spa by L'Occitane": 'SPA',
};
function displayName(s) { return DISPLAY_ALIAS[s] || s; }

function Section({ data, query, index }) {
  return (
    <section className="gm-section" aria-labelledby={"sec-" + slug(data.sector)}>
      <div className="gm-section__head">
        <span className="gm-section__idx" aria-hidden="true">{String(index).padStart(2, "0")}</span>
        <h2 className="gm-section__title" id={"sec-" + slug(data.sector)}>
          <span className="gm-section__ic" aria-hidden="true"><SectorIcon sector={data.sector} size="18" /></span>
          <em>{displayName(data.sector)}</em>
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

// Skeleton exibido enquanto o primeiro fetch de /api/directory esta em
// andamento. Da feedback visual em vez de "Nenhum resultado" piscando.
function DirectorySkeleton() {
  const bar = { background: 'color-mix(in srgb, var(--fg-soft) 18%, transparent)', borderRadius: 6, height: 18, animation: 'gmPulse 1.2s ease-in-out infinite' };
  const linha = (w) => <div style={{ ...bar, width: w, marginBottom: 10 }} />;
  return (
    <div aria-busy="true" aria-label="Carregando diretório" style={{ padding: '24px 0' }}>
      <style>{`@keyframes gmPulse { 0%,100% { opacity: .35 } 50% { opacity: .7 } }`}</style>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ marginBottom: 32 }}>
          <div style={{ ...bar, width: '180px', height: 22, marginBottom: 16 }} />
          {linha('92%')}
          {linha('86%')}
          {linha('78%')}
          {linha('70%')}
        </div>
      ))}
    </div>
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
    const ac = new AbortController();
    fetch('/api/setores', { signal: ac.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setSetores((d.setores || []).sort((a, b) => a.name.localeCompare(b.name, 'pt')));
        setStale(!!d.stale);
      })
      .catch(() => {});
    return () => ac.abort();
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
  const [email, setEmail] = useState(entry && entry.email ? entry.email : '');
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
    // E-mail e' opcional, mas se preenchido valida formato basico.
    const emailTrim = email.trim();
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      e.email = 'E-mail inválido';
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
    const emailFinal = email.trim() || null;
    const payload = grupo
      ? { grupo: true, names: names.trim(), email: emailFinal, ext: ext.trim() }
      : { grupo: false, sector: sector.trim(), short: (sectors.find(s => s.sector === sector)?.short || sector.split(/[\s/]/)[0]), role: role.trim(), names: names.trim(), email: emailFinal, ext: ext.trim() };
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
          <span>{entry ? 'Editar Contato' : 'Adicionar Contato'}</span>
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

          <label className="adm-label">E-mail</label>
          <input className={'adm-input' + (errors.email ? ' adm-input--err' : '')}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: '' }); }}
            placeholder="exemplo@granmarquise.com.br" />
          {errors.email && <span className="adm-field-error">{errors.email}</span>}

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

  const fetchAcRef = useRef(null);
  function carregar() {
    if (fetchAcRef.current) fetchAcRef.current.abort();
    fetchAcRef.current = new AbortController();
    const signal = fetchAcRef.current.signal;
    setLoading(true);
    fetch('/api/directory/history', { signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHistory(d.history || []); else setHistory([]); })
      .catch(err => { if (err.name !== 'AbortError') setHistory([]); })
      .finally(() => { setLoading(false); });
  }

  useEffect(() => {
    carregar();
    return () => { if (fetchAcRef.current) fetchAcRef.current.abort(); };
  }, []);

  // Trava scroll da pagina de tras enquanto o modal esta aberto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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
  const FIELD_LABEL = { sector: 'Setor', role: 'Cargo', names: 'Nomes', email: 'E-mail', ext: 'Ramal', nome: 'Nome', grupo: 'Grupo', pendente: 'Pendente' };
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

  // Agrupa itens por dia mantendo a ordem original (mais recente primeiro).
  const grupos = useMemo(() => {
    if (!filtered) return null;
    const g = [];
    let atualKey = null;
    let atualLista = null;
    for (const h of filtered) {
      const k = localDateStr(h.at);
      if (k !== atualKey) {
        atualKey = k;
        atualLista = [];
        g.push({ key: k, label: fmtDateHeader(h.at), itens: atualLista });
      }
      atualLista.push(h);
    }
    return g;
  }, [filtered]);

  function fmtHora(iso) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function fmtDateHeader(iso) {
    const d = new Date(iso);
    const hoje = new Date();
    const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, hoje)) return 'Hoje · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (sameDay(d, ontem)) return 'Ontem · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  return (
    <div className="adm-modal-overlay">
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
          ) : grupos.map(gr => (
            <div key={gr.key} className="adm-hist-day-group">
              <div className="adm-hist-day-header">
                <span className="adm-hist-day-label">{gr.label}</span>
                <span className="adm-hist-day-count">{gr.itens.length} {gr.itens.length === 1 ? 'registro' : 'registros'}</span>
              </div>
              {gr.itens.map((h, i) => (
                <div key={gr.key + '-' + i} className="adm-hist-item">
                  <div className="adm-hist-item__head">
                    <span className={"adm-hist-badge " + (ACTION_CLS[h.action] || '')}>{ACTION_LABEL[h.action] || h.action}</span>
                    <span className="adm-hist-entry">
                      {h.role || `Ramal #${h.entryId}`}
                      {h.sector ? <em> · {h.sector}</em> : null}
                    </span>
                    <span className="adm-hist-by">{h.by}</span>
                    <span className="adm-hist-at">{fmtHora(h.at)}</span>
                  </div>
                  {(h.action === 'editado' || h.action === 'setor_editado' || h.action === 'marcado_grupo' || h.action === 'desmarcado_grupo' || h.action === 'realocado') && renderDiff(h.before, h.after)}
                </div>
              ))}
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
  // 'all' | 'active' | 'inactive'. Combina com filterSector e filterText.
  const [filterStatus, setFilterStatus] = useState("all");
  // filterTextDebounced e o que efetivamente alimenta o useMemo: evita refiltrar
  // os ~100 itens a cada tecla. 300ms e suficiente para parecer instantaneo
  // sem disparar 5+ renders por palavra.
  const [filterTextDebounced, setFilterTextDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setFilterTextDebounced(filterText), 300);
    return () => clearTimeout(t);
  }, [filterText]);
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
    const q = plainNorm(filterTextDebounced.trim());
    return allEntries
      .filter(e => filterSector === "all" || e.sector === filterSector)
      // 'active' = entry.active !== false (default true). 'inactive' = explicitamente false.
      .filter(e => filterStatus === "all" || (filterStatus === "active" ? e.active !== false : e.active === false))
      // Busca textual: cargo, nomes, ramal, setor, email (todos normalizados).
      .filter(e => !q || plainNorm([e.role, e.names, e.ext, e.sector, e.email || ""].join(" ")).includes(q))
      .sort((a, b) => {
        const c = a.sector.localeCompare(b.sector, 'pt');
        return c !== 0 ? c : a.id - b.id;
      });
  }, [allEntries, filterSector, filterStatus, filterTextDebounced]);

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
            placeholder="Filtrar por cargo, nome, ramal, e-mail…"
            autoComplete="off"
          />
          <select className="adm-filter-select" value={filterSector}
            onChange={e => setFilterSector(e.target.value)}>
            <option value="all">Todos os setores</option>
            {sectors.slice().sort((a, b) => a.sector.localeCompare(b.sector, 'pt')).map(s => <option key={s.sector} value={s.sector}>{displayName(s.sector) === s.sector ? s.short : displayName(s.sector)}</option>)}
          </select>
          {/* Filtro de status: combinado com setor + texto. 'Todos' por default. */}
          <div className="adm-status-group" role="group" aria-label="Filtrar por status">
            {[
              { v: "all",      l: "Todos" },
              { v: "active",   l: "Ativos" },
              { v: "inactive", l: "Inativos" },
            ].map(opt => (
              <button key={opt.v}
                className={"adm-status-btn" + (filterStatus === opt.v ? " is-active" : "")}
                onClick={() => setFilterStatus(opt.v)}
                aria-pressed={filterStatus === opt.v}>
                {opt.l}
              </button>
            ))}
          </div>
          <span className="adm-count">{visible.length} {visible.length === 1 ? "ramal" : "ramais"}</span>
        </div>

        <div className="adm-list">
          <div className="adm-list-head">
            <span>Setor</span>
            <span>Cargo</span>
            <span>Nomes</span>
            <span>E-mail</span>
            <span>Ramal</span>
            <span>Status</span>
            <span></span>
          </div>
          {visible.map(entry => (
            <div key={entry.id} className={"adm-row" + (entry.active === false ? " adm-row--off" : "")}>
              <span className="adm-cell adm-cell--sec" title={entry.sector}>{displayName(entry.sector) === entry.sector ? entry.short : displayName(entry.sector)}</span>
              <span className="adm-cell adm-cell--role">
                {entry.grupo ? <span className="adm-grupo-tag">Grupo de Transferência</span> : entry.role}
              </span>
              <span className="adm-cell adm-cell--names">{entry.names || <em className="adm-empty">—</em>}</span>
              <span className="adm-cell adm-cell--email" title={entry.email || ''}>
                {entry.email
                  ? <a href={`mailto:${entry.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{entry.email}</a>
                  : <em className="adm-empty">—</em>}
              </span>
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
  // Sincronizacao de tema entre sistemas do Hub:
  // ?theme=dark|light na URL (vindo do Hub/outro) prevalece sobre o local.
  const [theme, setTheme] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const fromUrl = p.get("theme");
      if (fromUrl === "dark" || fromUrl === "light") return fromUrl;
    } catch {}
    return localStorage.getItem("gm-theme") || "light";
  });
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [allSectors, setAllSectors] = useState(window.GM_DIRECTORY || []);
  const [chamadosSetores, setChamadosSetores] = useState([]);
  // True ate o primeiro fetch de /api/directory terminar. Usado pra exibir
  // skeleton em vez de "Nenhum resultado" na tela vazia.
  const [booting, setBooting] = useState(() => !(window.GM_DIRECTORY && window.GM_DIRECTORY.length));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gm-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [toastApp, setToastApp] = useState('');
  function notifyApp(msg) { setToastApp(msg); setTimeout(() => setToastApp(''), 2800); }

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)hub_tipo=([^;]*)/);
    if (m && decodeURIComponent(m[1]) === "admin") setIsAdmin(true);

    // AbortController para evitar race condition entre cliques rapidos e cleanup do effect.
    const ac = new AbortController();

    fetch("/api/directory", { signal: ac.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.ok && d.sectors && d.sectors.length) setAllSectors(d.sectors); })
      .catch(() => {})
      .finally(() => { setBooting(false); });

    let pollAc = null;
    let pollTimer = null;
    const fetchSetores = () => {
      if (pollAc) pollAc.abort();
      pollAc = new AbortController();
      fetch("/api/setores", { signal: pollAc.signal })
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setChamadosSetores(d.setores || []))
        .catch(() => {});
    };
    function startPoll() {
      if (pollTimer) return;
      fetchSetores();
      pollTimer = setInterval(fetchSetores, 30000);
    }
    function stopPoll() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      if (pollAc) { pollAc.abort(); pollAc = null; }
    }
    function onVis() { document.hidden ? stopPoll() : startPoll(); }
    if (!document.hidden) startPoll();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      ac.abort();
      stopPoll();
    };
  }, []);

  // reloadDir continua existindo, mas agora so e usado por add/edit (onde a estrutura
  // pode mudar de setor); o toggle nao chama mais reloadDir.
  async function reloadDir() {
    try {
      const r = await fetch("/api/directory");
      if (!r.ok) return;
      const d = await r.json();
      if (d.ok) setAllSectors(d.sectors);
    } catch {}
  }

  async function handleAdd(data) {
    try {
      const r = await fetch("/api/directory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) return { ok: false, erro: d.erro || `Erro ${r.status}` };
      await reloadDir();
      return d;
    } catch { return { ok: false, erro: 'Erro de conexão' }; }
  }

  async function handleEdit(id, data) {
    try {
      const r = await fetch(`/api/directory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) return { ok: false, erro: d.erro || `Erro ${r.status}` };
      await reloadDir();
      return d;
    } catch { return { ok: false, erro: 'Erro de conexão' }; }
  }

  // Toggle otimista: atualiza UI antes de bater no servidor; manda o valor desejado
  // (active explicito); reverte em caso de falha; reconcilia se o servidor retornar
  // um valor diferente (ex.: outro admin tocou no mesmo registro).
  async function handleToggle(id) {
    let anterior = null;
    setAllSectors(prev => prev.map(s => ({
      ...s,
      entries: s.entries.map(e => {
        if (e.id !== id) return e;
        anterior = e.active !== false;
        return { ...e, active: !anterior };
      }),
    })));
    if (anterior === null) return; // id nao encontrado, nada a fazer
    const desejado = !anterior;
    try {
      const r = await fetch(`/api/directory/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: desejado }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.erro || `HTTP ${r.status}`);
      if (typeof d.active === 'boolean' && d.active !== desejado) {
        setAllSectors(prev => prev.map(s => ({
          ...s,
          entries: s.entries.map(e => e.id === id ? { ...e, active: d.active } : e),
        })));
      }
    } catch (err) {
      // Reverte estado local
      setAllSectors(prev => prev.map(s => ({
        ...s,
        entries: s.entries.map(e => e.id === id ? { ...e, active: anterior } : e),
      })));
      notifyApp('Não foi possível alterar o status. Tente novamente.');
    }
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
      .map(s => ({ sector: s.name, short: displayName(s.name) }));
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
          {booting && filtered.length === 0
            ? <DirectorySkeleton />
            : filtered.length === 0
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
      {toastApp && <div className="adm-toast adm-toast--app">{toastApp}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
