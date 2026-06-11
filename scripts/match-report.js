// Gera relatório de matching ramal x usuário do sistema-chamados.
// NÃO altera nada. Apenas imprime análise no stdout.

const fs = require('fs');
const path = require('path');

const dir = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tmp', 'dir.json'), 'utf8'));
const users = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tmp', 'usuarios.json'), 'utf8'));

function norm(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) { return norm(s).split(' ').filter(Boolean); }

function matchUser(rawName) {
  const tks = tokens(rawName);
  if (!tks.length) return { kind: 'no-name', candidates: [] };

  const candidates = [];
  for (const u of users) {
    const uTks = tokens(u.nome);
    if (!uTks.length) continue;

    if (norm(rawName) === norm(u.nome)) {
      candidates.push({ user: u, score: 100, reason: 'exact' });
      continue;
    }
    const overlap = tks.filter(t => uTks.includes(t));
    if (!overlap.length) continue;
    const score = (overlap.length / Math.max(tks.length, uTks.length)) * 100;
    if (score >= 50) candidates.push({ user: u, score, reason: 'partial' });
  }
  candidates.sort((a, b) => b.score - a.score);

  if (!candidates.length) return { kind: 'none', candidates: [] };
  const top = candidates[0];
  if (top.score === 100) return { kind: 'exact', candidates: [top] };

  const tied = candidates.filter(c => Math.abs(c.score - top.score) < 0.01);
  if (tied.length === 1 && top.score >= 75) return { kind: 'partial', candidates: [top] };
  if (tied.length > 1) return { kind: 'ambiguous', candidates: tied };
  return { kind: 'partial', candidates: [top] };
}

const result = { exato: [], parcial: [], ambiguo: [], naoEncontrado: [], multiPessoa: [], grupo: [], semNome: [] };
const allEntries = [];
for (const sec of dir.sectors) {
  for (const e of sec.entries) {
    allEntries.push({ ...e, _sector: sec.sector });
  }
}

for (const e of allEntries) {
  if (e.grupo) { result.grupo.push(e); continue; }
  if (!e.names || !e.names.trim()) { result.semNome.push(e); continue; }

  const splitByComma = e.names.includes(',') || e.names.includes('/');
  const personNames = splitByComma
    ? e.names.split(/[,\/]/).map(s => s.trim()).filter(Boolean)
    : [e.names.trim()];

  if (personNames.length > 1) {
    const matches = personNames.map(n => ({ name: n, match: matchUser(n) }));
    result.multiPessoa.push({ entry: e, matches });
    continue;
  }

  const m = matchUser(personNames[0]);
  const item = { entry: e, match: m };
  if (m.kind === 'exact') result.exato.push(item);
  else if (m.kind === 'partial') result.parcial.push(item);
  else if (m.kind === 'ambiguous') result.ambiguo.push(item);
  else result.naoEncontrado.push(item);
}

console.log('# RELATÓRIO DE REALOCAÇÃO\n');
console.log(`Total ramais: ${allEntries.length}`);
console.log(`Grupos de transferência (intocados): ${result.grupo.length}`);
console.log(`Sem nome (locais como Portaria/Açougue): ${result.semNome.length}`);
console.log(`Match exato: ${result.exato.length}`);
console.log(`Match parcial (1 candidato): ${result.parcial.length}`);
console.log(`Múltiplas pessoas no ramal: ${result.multiPessoa.length}`);
console.log(`Ambíguo: ${result.ambiguo.length}`);
console.log(`Não encontrado → Pendente: ${result.naoEncontrado.length}\n`);

function row(e, prop, info) {
  return `  [${e.ext.padEnd(8)}] ${e.role.slice(0, 38).padEnd(38)} | ${(e.names || '').slice(0, 32).padEnd(32)} | ${e._sector.slice(0, 22).padEnd(22)} → ${prop.padEnd(28)} | ${info}`;
}

console.log('## MATCH EXATO');
result.exato.forEach(i => console.log(row(i.entry, i.match.candidates[0].user.setor || '(sem setor)', `→ ${i.match.candidates[0].user.nome}`)));

console.log('\n## MATCH PARCIAL (único candidato)');
result.parcial.forEach(i => console.log(row(i.entry, i.match.candidates[0].user.setor || '(sem setor)', `${i.match.candidates[0].score.toFixed(0)}% · ${i.match.candidates[0].user.nome}`)));

console.log('\n## MÚLTIPLAS PESSOAS NO MESMO RAMAL');
result.multiPessoa.forEach(i => {
  console.log(row(i.entry, '?', i.matches.map(m => `${m.name}→${m.match.candidates[0]?.user.setor || 'nada'}`).join(' | ')));
});

console.log('\n## AMBÍGUO (várias contas batem)');
result.ambiguo.forEach(i => console.log(row(i.entry, 'PENDENTE', i.match.candidates.map(c => `${c.user.nome}(${c.user.setor})`).join(' | '))));

console.log('\n## NÃO ENCONTRADO → PENDENTE');
result.naoEncontrado.forEach(i => console.log(row(i.entry, 'PENDENTE', '')));

console.log('\n## SEM NOME (locais; ficam onde estão)');
result.semNome.forEach(i => console.log(row(i.entry, '(sem mudança)', '')));

console.log('\n## GRUPOS DE TRANSFERÊNCIA (intocados)');
result.grupo.forEach(i => console.log(row(i.entry, '(grupo)', '')));
