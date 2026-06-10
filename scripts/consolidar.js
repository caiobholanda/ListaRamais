// Consolida todos os ramais nos setores canonicos do sistema-chamados.
// Mapeamento por palavras-chave no role (cargo).

const fs = require('fs');
const path = require('path');

const DIR = '/data';
const DATA_FILE = path.join(DIR, 'directory.json');
const HIST_FILE = path.join(DIR, 'history.json');

function smartMap(role, names, ext) {
  const r = (role || '').toLowerCase();
  const n = (names || '').toLowerCase();
  const all = `${r} ${n}`;

  if (/mucuripe/.test(all)) return 'Restaurante Mucuripe';
  if (/mangostin/.test(all)) return 'Restaurante Mangostin';
  if (/lobby bar/.test(all)) return 'Lobby Bar';
  if (/cozinha da piscina/.test(all)) return 'Piscina';
  if (/^piscina/.test(r) || / piscina/.test(r)) return 'Piscina';
  if (/confeitaria|padaria/.test(all)) return 'Confeitaria / Padaria';
  if (/room service/.test(all)) return 'Room Service';
  if (/cozinha banquetes/.test(all)) return 'Banquetes';
  if (/cozinha central|chef executivo/.test(all)) return 'Cozinha';
  if (/hortifruti|gard manger|cozinha|açougue/.test(all)) return 'Cozinha';
  if (/nutricionista|nutrição/.test(all)) return 'Nutrição';
  if (/maitre|hostess|relacionamento/.test(all) && /restaurante|mucuripe|mangostin/.test(all)) return 'Restaurante Mucuripe';

  if (/portaria/.test(all)) return 'Mensageria / Portaria';
  if (/segurança/.test(r)) return 'Segurança';
  if (/\bti\b|datacenter|tecnologia/.test(all)) return 'Tecnologia da Informação';

  if (/marketing|comunicação/.test(all)) return 'Marketing';
  if (/gerente geral$/.test(r)) return 'Gerência Geral';
  if (/assistente comercial.*gerência geral|assistente.*gerência geral/.test(all)) return 'Gerência Geral';

  if (/concierge/.test(all)) return 'Concierge';
  if (/governança|governanta/.test(all)) return 'Governança';
  if (/rouparia/.test(all)) return 'Rouparia';
  if (/lavanderia/.test(all)) return 'Lavanderia';
  if (/estacionamento/.test(all)) return 'Estacionamento';
  if (/spa/.test(all)) return 'Spa by L\'Occitane';
  if (/recep|mesa vip|capitão porteiro/.test(all)) return 'Recepção';

  if (/reservas/.test(all)) return 'Reservas';
  if (/eventos.*sociais|sociais|consultora.*sociais/.test(all)) return 'Eventos e Convenções';
  if (/coordenadora de eventos|eventos|banquetes|stewart|steward|apoio piso/.test(all)) return 'Eventos e Convenções';
  if (/vendas/.test(all)) return 'Comercial / Vendas';

  if (/compra|almoxarif/.test(all)) return 'Compras / Almoxarifado';
  if (/financeiro|tesouraria|faturamento|controller|fiscal|apoio administrativo|analista pleno/.test(all)) return 'Controladoria';
  if (/qualidade|gestão de pessoas|pessoal|aprendiz/.test(all)) return 'Recursos Humanos';
  if (/manutenção|pcm|edificaç|obra|engenheiro|sala de serviço|administrativo de obras/.test(all)) return 'Manutenção';

  if (/play gran/.test(all)) return 'Play Gran';
  if (/toll free|0800/.test(r) || /toll free/.test(n)) return 'Reservas';
  if (/elevador spa/.test(all)) return 'Spa by L\'Occitane';
  if (/dionísio/.test(all)) return 'Gerência Geral';

  if (/revenue/.test(all)) return 'Revenue Management';

  // Fallback para entries com sector original A&B
  if (/a&b|a&amp;b|assistente operacional/.test(all)) return 'A&B';

  return null;
}

const sectors = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const hist = fs.existsSync(HIST_FILE) ? JSON.parse(fs.readFileSync(HIST_FILE, 'utf8')) : [];
const now = new Date().toISOString();
const BY = { nome: 'Sistema (Consolidação canônica)', email: 'sistema@diretorio-ramais' };

// Setores canônicos do sistema-chamados
const CANONICAL = new Set([
  'A&B','Banquetes','Bar Rooftop','Comercial / Vendas','Compras / Almoxarifado','Concierge',
  'Confeitaria / Padaria','Controladoria','Cozinha','Estacionamento','Eventos e Convenções',
  'Financeiro','Fitness Center','Gerência Geral','Governança','Jurídico','Lavanderia',
  'Lobby Bar','Manutenção','Marketing','Mensageria / Portaria','Nutrição','Piscina','Play Gran',
  'Recepção','Recursos Humanos','Reservas','Restaurante Mangostin','Restaurante Mucuripe',
  'Revenue Management','Room Service','Rouparia','Segurança','Spa by L\'Occitane',
  'Tecnologia da Informação','Transportes'
]);
const GRUPO_SEC = 'Grupos de Transferência';

const allEntries = [];
for (const sec of sectors) for (const e of sec.entries) allEntries.push({ entry: e, oldSector: sec.sector });

const stats = { moved: 0, cleared: 0, kept: 0, unmapped: [] };
const log = [];

for (const { entry, oldSector } of allEntries) {
  if (entry.grupo) { stats.kept++; continue; }
  const target = smartMap(entry.role, entry.names, entry.ext);
  if (!target) {
    stats.unmapped.push(`${entry.ext} ${entry.role}`);
    continue;
  }
  if (target === oldSector) {
    if (entry.pendente) {
      entry.pendente = false;
      hist.push({ entryId: entry.id, action: 'realocado', role: entry.role, sector: oldSector, by: BY.nome, email: BY.email, at: now,
        before: { sector: oldSector, role: entry.role, names: entry.names, ext: entry.ext, pendente: true },
        after:  { sector: oldSector, role: entry.role, names: entry.names, ext: entry.ext, pendente: false },
        motivo: 'pendente limpa (ja no setor canonico)' });
      stats.cleared++;
      log.push(`CLEAR     [${entry.ext}] ${entry.role}: pendente removida (${oldSector})`);
    } else {
      stats.kept++;
    }
    continue;
  }
  // Move
  const oldSec = sectors.find(s => s.sector === oldSector);
  const idx = oldSec.entries.findIndex(x => x.id === entry.id);
  oldSec.entries.splice(idx, 1);
  let dest = sectors.find(s => s.sector === target);
  if (!dest) { dest = { sector: target, short: target, entries: [] }; sectors.push(dest); }
  const before = { sector: oldSector, role: entry.role, names: entry.names, ext: entry.ext, pendente: !!entry.pendente };
  entry.pendente = false;
  const after = { sector: target, role: entry.role, names: entry.names, ext: entry.ext, pendente: false };
  dest.entries.push(entry);
  hist.push({ entryId: entry.id, action: 'realocado', role: entry.role, sector: target, by: BY.nome, email: BY.email, at: now, before, after });
  stats.moved++;
  log.push(`MOVE      [${entry.ext}] ${entry.role}: ${oldSector} -> ${target}`);
}

// Remove setores vazios
for (let i = sectors.length - 1; i >= 0; i--) {
  if (!sectors[i].entries.length) sectors.splice(i, 1);
}

fs.writeFileSync(DATA_FILE, JSON.stringify(sectors, null, 2));
fs.writeFileSync(HIST_FILE, JSON.stringify(hist, null, 2));

console.log('=== CONSOLIDAÇÃO ===');
console.log(`Movidos: ${stats.moved}`);
console.log(`Pendentes limpas: ${stats.cleared}`);
console.log(`Mantidos (ja no setor certo): ${stats.kept}`);
console.log(`Nao mapeados: ${stats.unmapped.length}`);
if (stats.unmapped.length) console.log(stats.unmapped.map(u => '  - ' + u).join('\n'));

console.log('\n--- LOG ---');
log.forEach(l => console.log(l));

console.log('\n--- SETORES FINAIS ---');
sectors.sort((a, b) => a.sector.localeCompare(b.sector, 'pt')).forEach(s =>
  console.log(`  [${s.entries.length}] ${s.sector}${CANONICAL.has(s.sector) || s.sector === GRUPO_SEC ? '' : ' ⚠ NAO CANONICO'}`)
);
