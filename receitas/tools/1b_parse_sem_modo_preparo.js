const fs = require('fs');
const txtPath = process.argv[2];
const outPath = process.argv[3];
const raw = fs.readFileSync(txtPath, 'utf8');
const lines = raw.split('\n').map(l => l.replace(/\r/g, ''));

function isFooterLine(l) {
  const t = l.trim();
  if (/^Chef Carla Ramos\s*$/i.test(t)) return true;
  if (/^Pag\.\s*\|\s*\d+$/i.test(t)) return true;
  if (/Chef Carla Ramos.*Pag\.\s*\|\s*\d+\s*$/i.test(t)) return true;
  return false;
}
function stripFooterFragment(l) {
  return l.replace(/Chef Carla Ramos\s*$/i, '').replace(/Pag\.\s*\|\s*\d+\s*$/i, '').trimEnd();
}
const pageMarkers = [];
lines.forEach((l, i) => { const m = l.match(/Pag\.\s*\|\s*(\d+)/i); if (m) pageMarkers.push({ line: i, page: parseInt(m[1], 10) }); });
function pageForLine(lineIdx) { for (const pm of pageMarkers) if (pm.line >= lineIdx) return pm.page; return 1; }

const titleIdx = [];
lines.forEach((l, i) => { if (/^MIX DE FARINHAS\s*\d/i.test(l.trim())) titleIdx.push(i); });

const mixes = [];
for (let k = 0; k < titleIdx.length; k++) {
  const ti = titleIdx[k];
  const title = stripFooterFragment(lines[ti]).trim();
  let ingLine = -1;
  for (let j = ti + 1; j < ti + 10; j++) if (/^\s*ingredientes\s*$/i.test(lines[j])) { ingLine = j; break; }
  if (ingLine === -1) continue;
  const endIdx = (k + 1 < titleIdx.length) ? titleIdx[k + 1] : ti + 40;
  const block = lines.slice(ingLine + 1, endIdx).filter(l => !isFooterLine(l)).map(l => stripFooterFragment(l).trim());
  const ingredients = [];
  let finalidade = '';
  for (const l of block) {
    if (!l) continue;
    if (/^Finalidade:/i.test(l)) { finalidade = l.replace(/^Finalidade:\s*/i, ''); continue; }
    if (/^Obs/i.test(l)) break; // para antes das observações
    ingredients.push(l.replace(/;$/, ''));
  }
  mixes.push({
    title: title.replace(/\s+/g, ' ').trim(),
    ingredients,
    steps: finalidade ? [finalidade] : [],
    page: pageForLine(ti)
  });
}
fs.writeFileSync(outPath, JSON.stringify(mixes, null, 2), 'utf8');
console.log('Mixes extraídos:', mixes.length);
mixes.forEach(m => console.log(' -', m.page, m.title, '| ing:', m.ingredients.length));
