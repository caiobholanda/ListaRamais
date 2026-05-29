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
  const primaryTel = item.ext.split("/")[0].trim().replace(/\D/g, "");
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
        <a
          className={"gm-num" + (isLong ? " gm-num--sm" : "")}
          href={"tel:" + primaryTel}
          aria-label={(isToll ? "Ligar para " : "Ligar para ramal ") + item.ext}
        ><Highlight text={item.ext} query={query} /></a>
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

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("gm-theme") || "light");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("gm-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const data = window.GM_DIRECTORY;

  const match = (e, s, q) => {
    const hay = plainNorm([e.role, e.names, e.ext, s.sector].join(" "));
    return q.split(/\s+/).every((tok) => hay.includes(tok));
  };

  const filtered = useMemo(() => {
    const q = plainNorm(query.trim());
    return data
      .filter((s) => sector === "all" || s.sector === sector)
      .map((s) => q ? { ...s, entries: s.entries.filter((e) => match(e, s, q)) } : s)
      .filter((s) => s.entries.length > 0);
  }, [data, query, sector]);

  const shown = useMemo(() => filtered.reduce((n, s) => n + s.entries.length, 0), [filtered]);

  const counts = useMemo(() => {
    const q = plainNorm(query.trim()); const map = {};
    data.forEach((s) => {
      map[s.sector] = !q ? s.entries.length : s.entries.filter((e) => match(e, s, q)).length;
    });
    return map;
  }, [data, query]);

  const clear = () => setQuery("");

  return (
    <div className="gm-app">
      <GMChrome.Header theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} scrolled={scrolled} />
      <main className="gm-main">
        <GMChrome.Hero query={query} onQuery={setQuery} shown={shown} onClear={clear} />
        <GMChrome.SectorChips sectors={data} active={sector} onPick={setSector} counts={counts} />
        <div className="gm-results">
          {filtered.length === 0
            ? <EmptyState query={query} onClear={clear} />
            : filtered.map((s, i) => <Section key={s.sector} data={s} query={query} index={i + 1} />)}
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
