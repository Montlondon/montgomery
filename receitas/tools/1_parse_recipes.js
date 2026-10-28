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
  if (/^Chef Carla Ramos/i.test(t) && /Pag\.\s*\|\s*\d+/i.test(t)) return true;
  return false;
}
function stripFooterFragment(l) {
  return l.replace(/Chef Carla Ramos\s*$/i, '').replace(/Pag\.\s*\|\s*\d+\s*$/i, '').trimEnd();
}

// marcadores de página, na MESMA lista `lines` usada para tudo (sem reconstrução separada)
const pageMarkers = [];
lines.forEach((l, i) => {
  const m = l.match(/Pag\.\s*\|\s*(\d+)/i);
  if (m) pageMarkers.push({ line: i, page: parseInt(m[1], 10) });
});
function pageForLine(lineIdx) {
  // o rodapé "Pag. | NN" de uma página aparece no texto DEPOIS do conteúdo dela;
  // a página certa de uma linha é a do PRÓXIMO marcador a partir dela.
  for (const pm of pageMarkers) if (pm.line >= lineIdx) return pm.page;
  return pageMarkers.length ? pageMarkers[pageMarkers.length - 1].page : 1;
}

const idxIngred = [];
lines.forEach((l, i) => { if (/^\s*ingredientes\s*$/i.test(l)) idxIngred.push(i); });

const recipes = [];
for (let k = 0; k < idxIngred.length; k++) {
  const ingLine = idxIngred[k];

  let ti = ingLine - 1;
  while (ti >= 0 && (lines[ti].trim() === '' || isFooterLine(lines[ti]))) ti--;
  let title = stripFooterFragment(lines[ti] || '').trim();
  if (!title || /^SUM[ÁA]RIO$/i.test(title)) continue;

  let modoIdx = -1;
  for (let j = ingLine + 1; j < lines.length && j < ingLine + 70; j++) {
    if (/^\s*modo de preparo\s*$/i.test(lines[j])) { modoIdx = j; break; }
  }
  if (modoIdx === -1) continue;

  const ingredientLines = lines.slice(ingLine + 1, modoIdx)
    .filter(l => !isFooterLine(l)).map(l => stripFooterFragment(l).trim()).filter(Boolean);

  let nextTitleLineIdx = lines.length;
  if (k + 1 < idxIngred.length) {
    let nt = idxIngred[k + 1] - 1;
    while (nt >= 0 && (lines[nt].trim() === '' || isFooterLine(lines[nt]))) nt--;
    nextTitleLineIdx = nt;
  }
  const stepLines = lines.slice(modoIdx + 1, nextTitleLineIdx)
    .filter(l => !isFooterLine(l)).map(l => stripFooterFragment(l).trim()).filter(Boolean);

  function mergeContinuations(arr) {
    const out = [];
    for (const l of arr) {
      if (out.length > 0 && !/^([0-9]+[.)]|[-•*])/.test(l) && /^[a-záàâãéêíóôõúç(]/i.test(l) && out[out.length - 1].length < 90) {
        out[out.length - 1] += ' ' + l;
      } else out.push(l);
    }
    return out;
  }

  const ingredients = mergeContinuations(ingredientLines).map(l => l.replace(/;$/, '').trim()).filter(Boolean);
  const steps = mergeContinuations(stepLines).map(l => l.replace(/^[0-9]+[.)]\s*/, '').trim()).filter(Boolean);

  // usa a linha do TÍTULO (não a de "ingredientes") como âncora: em algumas
  // páginas o rodapé "Pag. | NN" vem colado na própria linha do título, antes
  // da linha "ingredientes" — buscar a partir dali evita pular esse marcador.
  recipes.push({ title, ingredients, steps, page: pageForLine(ti) });
}

fs.writeFileSync(outPath, JSON.stringify(recipes, null, 2), 'utf8');
console.log('Parsed', recipes.length, 'recipes');
