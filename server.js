require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SSO_SECRET = process.env.SSO_SECRET || 'dev-sso-secret';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'directory.json');

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
    const session = jwt.sign(
      { nome: payload.nome, email: payload.email, tipo: payload.tipo || 'usuario' },
      SSO_SECRET,
      { expiresIn: '8h' }
    );
    res.cookie('hub_session', session, { httpOnly: true, sameSite: 'Strict', maxAge: 8 * 3600 * 1000 });
    res.cookie('hub_tipo', payload.tipo === 'admin' ? 'admin' : 'usuario', { sameSite: 'Strict', maxAge: 8 * 3600 * 1000 });
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
  res.status(201).json({ ok: true, id });
});

app.put('/api/directory/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { sector, short, role, names, ext } = req.body;
  if (!role || !ext) return res.status(400).json({ ok: false, erro: 'role e ext são obrigatórios' });
  const data = loadDir();
  let entry;
  for (const sec of data) {
    const idx = sec.entries.findIndex(e => e.id === id);
    if (idx !== -1) { [entry] = sec.entries.splice(idx, 1); if (!sec.entries.length) data.splice(data.indexOf(sec), 1); break; }
  }
  if (!entry) return res.status(404).json({ ok: false, erro: 'Não encontrado' });
  let targetSec = data.find(s => s.sector === sector);
  if (!targetSec) { targetSec = { sector, short: short || sector, entries: [] }; data.push(targetSec); }
  else if (short) targetSec.short = short;
  targetSec.entries.push({ ...entry, role, names: names || '', ext });
  saveDir(data);
  res.json({ ok: true });
});

app.patch('/api/directory/:id/toggle', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const data = loadDir();
  for (const sec of data) {
    const entry = sec.entries.find(e => e.id === id);
    if (entry) { entry.active = !entry.active; saveDir(data); return res.json({ ok: true, active: entry.active }); }
  }
  res.status(404).json({ ok: false, erro: 'Não encontrado' });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`DiretorioRamais rodando em http://localhost:${PORT}`));
