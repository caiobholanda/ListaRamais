// Realocacao automatica. Roda EM PROD via `fly ssh console -C "node /app/scripts/realocate.js"`.
// Modifica /data/directory.json e /data/history.json. Politica agressiva (escolha do user).

const fs = require('fs');
const path = require('path');

const DIR = '/data';
const DATA_FILE = path.join(DIR, 'directory.json');
const HIST_FILE = path.join(DIR, 'history.json');
const USUARIOS_URL = 'https://sistema-chamados-granmarquise.fly.dev/api/hub/usuarios';
const SSO_SECRET = process.env.SSO_SECRET;

if (!SSO_SECRET) { console.error('SSO_SECRET ausente'); process.exit(1); }

function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tks(s) { return norm(s).split(' ').filter(Boolean); }

function matchOne(rawName, users) {
  const T = tks(rawName);
  if (!T.length) return { kind: 'none' };
  const cands = [];
  for (const u of users) {
    const U = tks(u.nome);
    if (!U.length) continue;
    if (norm(rawName) === norm(u.nome)) { cands.push({ user: u, score: 100 }); continue; }
    const overlap = T.filter(t => U.includes(t));
    if (!overlap.length) continue;
    const score = (overlap.length / Math.max(T.length, U.length)) * 100;
    if (score >= 50) cands.push({ user: u, score });
  }
  cands.sort((a, b) => b.score - a.score);
  if (!cands.length) return { kind: 'none' };
  const top = cands[0];
  const tied = cands.filter(c => Math.abs(c.score - top.score) < 0.01);
  if (tied.length > 1) return { kind: 'ambiguous', cands: tied };
  if (top.score === 100) return { kind: 'exact', user: top.user };
  return { kind: 'partial', user: top.user, score: top.score };
}

function resolveEntry(e, users) {
  if (e.grupo) return { skip: true };
  if (!e.names || !e.names.trim()) return { pendente: true, reason: 'sem nome' };
  const parts = (e.names.includes(',') || e.names.includes('/'))
    ? e.names.split(/[,\/]/).map(s => s.trim()).filter(Boolean)
    : [e.names.trim()];
  for (const p of parts) {
    const m = matchOne(p, users);
    if (m.kind === 'exact' || m.kind === 'partial') {
      const setor = m.user.setor;
      if (setor) return { setor, by: p, via: m.kind, score: m.score || 100 };
    }
  }
  for (const p of parts) {
    const m = matchOne(p, users);
    if (m.kind === 'ambiguous') return { pendente: true, reason: `ambiguo (${p})` };
  }
  return { pendente: true, reason: 'sem match' };
}

(async () => {
  const sectors = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const r = await fetch(USUARIOS_URL, { headers: { Authorization: `Bearer ${SSO_SECRET}` } });
  const d = await r.json();
  if (!d.ok) { console.error('Erro buscando usuarios:', d); process.exit(1); }
  const users = (d.users || []).filter(u => u.setor);
  console.log(`Usuarios com setor: ${users.length}`);

  const hist = fs.existsSync(HIST_FILE) ? JSON.parse(fs.readFileSync(HIST_FILE, 'utf8')) : [];
  const now = new Date().toISOString();
  const BY = { nome: 'Sistema (Realocação automática)', email: 'sistema@diretorio-ramais' };

  const allEntries = [];
  for (const sec of sectors) for (const e of sec.entries) allEntries.push({ entry: e, oldSector: sec.sector });

  const stats = { realocados: 0, pendentes: 0, skipped: 0, byVia: {} };
  const log = [];

  for (const item of allEntries) {
    const { entry, oldSector } = item;
    const res = resolveEntry(entry, users);
    if (res.skip) { stats.skipped++; continue; }
    if (res.pendente) {
      if (entry.pendente) { stats.pendentes++; continue; }
      entry.pendente = true;
      const beforeSnap = { sector: oldSector, role: entry.role, names: entry.names, ext: entry.ext, pendente: false };
      const afterSnap = { sector: oldSector, role: entry.role, names: entry.names, ext: entry.ext, pendente: true };
      hist.push({ entryId: entry.id, action: 'realocado', role: entry.role, sector: oldSector, by: BY.nome, email: BY.email, at: now, before: beforeSnap, after: afterSnap, motivo: res.reason });
      stats.pendentes++;
      log.push(`PENDENTE  [${entry.ext}] ${entry.role}: ${res.reason}`);
      continue;
    }
    const newSector = res.setor;
    if (newSector === oldSector) {
      if (entry.pendente) { delete entry.pendente; }
      continue;
    }
    const beforeSnap = { sector: oldSector, role: entry.role, names: entry.names, ext: entry.ext, pendente: !!entry.pendente };
    const afterSnap  = { sector: newSector, role: entry.role, names: entry.names, ext: entry.ext, pendente: false };
    entry.pendente = false;
    const oldSec = sectors.find(s => s.sector === oldSector);
    const idx = oldSec.entries.findIndex(x => x.id === entry.id);
    oldSec.entries.splice(idx, 1);
    let target = sectors.find(s => s.sector === newSector);
    if (!target) { target = { sector: newSector, short: newSector, entries: [] }; sectors.push(target); }
    target.entries.push(entry);
    hist.push({ entryId: entry.id, action: 'realocado', role: entry.role, sector: newSector, by: BY.nome, email: BY.email, at: now, before: beforeSnap, after: afterSnap, via: res.via, by_match: res.by });
    stats.realocados++;
    stats.byVia[res.via] = (stats.byVia[res.via] || 0) + 1;
    log.push(`OK        [${entry.ext}] ${entry.role}: ${oldSector} -> ${newSector} (${res.via} via "${res.by}")`);
  }

  for (let i = sectors.length - 1; i >= 0; i--) {
    if (!sectors[i].entries.length) sectors.splice(i, 1);
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(sectors, null, 2));
  fs.writeFileSync(HIST_FILE, JSON.stringify(hist, null, 2));

  console.log('\n=== RESULTADO ===');
  console.log(`Realocados: ${stats.realocados} (${JSON.stringify(stats.byVia)})`);
  console.log(`Pendentes:  ${stats.pendentes}`);
  console.log(`Skipped (grupos): ${stats.skipped}`);
  console.log('\n--- LOG ---');
  log.forEach(l => console.log(l));
})().catch(err => { console.error(err); process.exit(1); });
