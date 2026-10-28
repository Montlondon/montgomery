const fs = require('fs');
const raw = fs.readFileSync('vegan_utf8.txt', 'utf8');
const lines = raw.split('\n');
const sum = [];
for (const l of lines) {
  const m = l.match(/^\s*(.+?)\.{4,}\s*(\d+)\s*$/);
  if (m) sum.push({ title: m[1].trim(), page: parseInt(m[2], 10) });
}
const norm = s => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');
const recipes = require('./vegan_parsed.json');
const recipeSet = new Map(recipes.map(r => [norm(r.title), r]));
console.log('sumario entries:', sum.length);
const skip = /^(DIREITOSAUTORAIS|VEGANA|CONCLUSAO)$/;
for (const s of sum) {
  const key = norm(s.title);
  if (skip.test(key)) continue;
  const r = recipeSet.get(key);
  if (!r) { console.log('FALTANDO:', s.title, 'p.' + s.page); continue; }
  if (r.page !== s.page) console.log('PAGINA DIFERENTE:', s.title, 'sumario p.' + s.page, 'parsed p.' + r.page);
}
console.log('recipes parsed:', recipes.length);
console.log('done');
