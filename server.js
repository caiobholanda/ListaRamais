require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SSO_SECRET = process.env.SSO_SECRET || 'dev-sso-secret';

const ADMIN_EMAILS = [
  'christian.bernard@granmarquise.com.br',
  'ana.louise@granmarquise.com.br',
  'kamilly.sousa@granmarquise.com.br',
  'francisco.rodrigues@granmarquise.com.br',
  'richard@granmarquise.com.br',
  'suporte.ti@granmarquise.com.br',
  'estagio.ti@granmarquise.com.br',
];

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes((email || '').trim().toLowerCase());
}

const DATA_DIR = '/data';
const DATA_FILE = path.join(DATA_DIR, 'directory.json');
const HIST_FILE = path.join(DATA_DIR, 'history.json');
const SETORES_FILE = path.join(DATA_DIR, 'setores.json');

app.use(cookieParser());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadDir() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveDir(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function loadHist() {
  if (!fs.existsSync(HIST_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(HIST_FILE, 'utf8')); } catch { return []; }
}

function pushHist(entryId, action, user, before, after, ctx) {
  const h = loadHist();
  const item = { entryId, action, role: ctx?.role || '', sector: ctx?.sector || '', by: user.nome || user.email || 'admin', email: user.email || '', at: new Date().toISOString(), before: before || null, after: after || null };
  if (ctx?.tipo) item.tipo = ctx.tipo;
  h.push(item);
  fs.writeFileSync(HIST_FILE, JSON.stringify(h, null, 2), 'utf8');
}

function loadSetores() {
  if (!fs.existsSync(SETORES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SETORES_FILE, 'utf8')); } catch { return []; }
}
function saveSetores(data) {
  fs.writeFileSync(SETORES_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function nextSetorId(setores) {
  return setores.length ? Math.max(...setores.map(s => s.id)) + 1 : 1;
}
function normalizeStr(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function initFromSeed() {
  if (fs.existsSync(DATA_FILE)) return;
  const seedFile = path.join(__dirname, 'seed.json');
  if (!fs.existsSync(seedFile)) return;
  try {
    const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    saveDir(seed);
    console.log('[DiretorioRamais] directory.json inicializado a partir do seed (91 ramais)');
  } catch (e) {
    console.error('[DiretorioRamais] Falha ao inicializar seed:', e.message);
  }
}
initFromSeed();

function migrarSetores() {
  if (fs.existsSync(SETORES_FILE)) return;
  const dir = loadDir();
  const seen = new Set();
  const setores = [];
  let id = 1;
  for (const sec of dir) {
    const key = normalizeStr(sec.sector);
    if (!seen.has(key)) { seen.add(key); setores.push({ id: id++, name: sec.sector, active: true }); }
  }
  setores.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  saveSetores(setores);
}
migrarSetores();

function nextId(data) {
  let max = 0;
  for (const s of data) for (const e of s.entries) if (e.id > max) max = e.id;
  return max + 1;
}

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.hub_session;
  if (!token) return res.status(401).json({ ok: false, erro: 'Não autenticado' });
  try {
    const payload = jwt.verify(token, SSO_SECRET);
    if (payload.tipo !== 'admin') return res.status(403).json({ ok: false, erro: 'Acesso restrito a admins' });
    req.hubUser = payload;
    next();
  } catch {
    res.clearCookie('hub_session');
    return res.status(401).json({ ok: false, erro: 'Sessão expirada' });
  }
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/sso', (req, res) => {
  const { sso_token } = req.query;
  if (!sso_token) return res.redirect('/');
  try {
    const payload = jwt.verify(sso_token, SSO_SECRET);
    const tipo = isAdminEmail(payload.email) ? 'admin' : 'usuario';
    const session = jwt.sign(
      { nome: payload.nome, email: payload.email, tipo },
      SSO_SECRET,
      { expiresIn: '8h' }
    );
    res.cookie('hub_session', session, { httpOnly: true, sameSite: 'Strict', maxAge: 8 * 3600 * 1000 });
    res.cookie('hub_tipo', tipo, { sameSite: 'Strict', maxAge: 8 * 3600 * 1000 });
    return res.redirect('/');
  } catch {
    return res.redirect('/');
  }
});

app.get('/api/directory', (_req, res) => {
  res.json({ ok: true, sectors: loadDir() });
});

app.post('/api/directory', requireAdmin, (req, res) => {
  const { sector, short, role, names, ext } = req.body;
  if (!sector || !role || !ext) return res.status(400).json({ ok: false, erro: 'sector, role e ext são obrigatórios' });
  const data = loadDir();
  const id = nextId(data);
  let sec = data.find(s => s.sector === sector);
  if (!sec) { sec = { sector, short: short || sector, entries: [] }; data.push(sec); }
  sec.entries.push({ id, role, names: names || '', ext, active: true });
  saveDir(data);
  pushHist(id, 'criado', req.hubUser, null, { sector, role, names: names || '', ext }, { role, sector });
  res.status(201).json({ ok: true, id });
});

app.put('/api/directory/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { sector, short, role, names, ext } = req.body;
  if (!role || !ext) return res.status(400).json({ ok: false, erro: 'role e ext são obrigatórios' });
  const data = loadDir();
  let entry, oldSector;
  for (const sec of data) {
    const idx = sec.entries.findIndex(e => e.id === id);
    if (idx !== -1) { oldSector = sec.sector; [entry] = sec.entries.splice(idx, 1); if (!sec.entries.length) data.splice(data.indexOf(sec), 1); break; }
  }
  if (!entry) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  let targetSec = data.find(s => s.sector === sector);
  if (!targetSec) { targetSec = { sector, short: short || sector, entries: [] }; data.push(targetSec); }
  else if (short) targetSec.short = short;
  targetSec.entries.push({ ...entry, role, names: names || '', ext });
  saveDir(data);
  pushHist(id, 'editado', req.hubUser, { sector: oldSector, role: entry.role, names: entry.names, ext: entry.ext }, { sector, role, names: names || '', ext }, { role, sector });
  res.json({ ok: true });
});

app.patch('/api/directory/:id/toggle', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const data = loadDir();
  for (const sec of data) {
    const entry = sec.entries.find(e => e.id === id);
    if (entry) { entry.active = !entry.active; saveDir(data); pushHist(id, entry.active ? 'ativado' : 'inativado', req.hubUser, { active: !entry.active }, { active: entry.active }, { role: entry.role, sector: sec.sector }); return res.json({ ok: true, active: entry.active }); }
  }
  res.status(404).json({ ok: false, erro: 'Não encontrado' });
});

app.get('/api/directory/history', requireAdmin, (_req, res) => {
  res.json({ ok: true, history: loadHist().slice().reverse() });
});

app.get('/api/directory/:id/history', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const history = loadHist().filter(h => h.entryId === id).reverse();
  res.json({ ok: true, history });
});

app.get('/api/setores', (_req, res) => {
  res.json({ ok: true, setores: loadSetores() });
});

app.post('/api/setores', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ ok: false, erro: 'Nome obrigatório' });
  const setores = loadSetores();
  const norm = normalizeStr(name.trim());
  if (setores.some(s => normalizeStr(s.name) === norm))
    return res.status(409).json({ ok: false, erro: 'Setor já existe' });
  const id = nextSetorId(setores);
  setores.push({ id, name: name.trim(), active: true });
  saveSetores(setores);
  pushHist(null, 'setor_criado', req.hubUser, null, { nome: name.trim() }, { role: name.trim(), tipo: 'setor' });
  res.status(201).json({ ok: true, id });
});

app.put('/api/setores/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ ok: false, erro: 'Nome obrigatório' });
  const setores = loadSetores();
  const setor = setores.find(s => s.id === id);
  if (!setor) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  const norm = normalizeStr(name.trim());
  if (setores.some(s => s.id !== id && normalizeStr(s.name) === norm))
    return res.status(409).json({ ok: false, erro: 'Setor já existe' });
  const oldName = setor.name;
  setor.name = name.trim();
  saveSetores(setores);
  const dir = loadDir();
  for (const sec of dir) {
    if (sec.sector === oldName) {
      if (sec.short === oldName) sec.short = name.trim();
      sec.sector = name.trim();
    }
  }
  saveDir(dir);
  pushHist(null, 'setor_editado', req.hubUser, { nome: oldName }, { nome: name.trim() }, { role: name.trim(), tipo: 'setor' });
  res.json({ ok: true });
});

app.patch('/api/setores/:id/toggle', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const setores = loadSetores();
  const setor = setores.find(s => s.id === id);
  if (!setor) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  setor.active = !setor.active;
  saveSetores(setores);
  pushHist(null, setor.active ? 'setor_ativado' : 'setor_inativado', req.hubUser, { ativo: !setor.active }, { ativo: setor.active }, { role: setor.name, tipo: 'setor' });
  res.json({ ok: true, active: setor.active });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`DiretorioRamais rodando em http://localhost:${PORT}`));
