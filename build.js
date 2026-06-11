// Pre-compila os .jsx do diretorio para um unico bundle minificado em
// public/assets/app.js. Mantemos React e ReactDOM como globais do <script src=...>
// para nao bundlar React (continuamos servindo via unpkg, mas agora .production.min).
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'public');
const OUT_DIR = path.join(SRC, 'assets');
const OUT = path.join(OUT_DIR, 'app.js');

// Ordem importa: directory.jsx consome IconX, Header, GM_DIRECTORY.
const FILES = ['icons.jsx', 'chrome.jsx', 'data.js', 'directory.jsx'];

async function build() {
  let combined = '';
  for (const f of FILES) {
    const code = fs.readFileSync(path.join(SRC, f), 'utf8');
    const isJsx = f.endsWith('.jsx');
    const transformed = await esbuild.transform(code, {
      loader: isJsx ? 'jsx' : 'js',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      target: 'es2019',
    });
    combined += `\n/* ── ${f} ── */\n` + transformed.code + '\n';
  }
  const final = await esbuild.transform(combined, {
    minify: true,
    target: 'es2019',
  });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, final.code);
  const kb = (final.code.length / 1024).toFixed(1);
  console.log(`[build] ${OUT} (${kb} KB)`);
}

build().catch(err => { console.error('[build] erro:', err); process.exit(1); });
