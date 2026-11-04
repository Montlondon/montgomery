/**
 * extract_500lowcarb.js
 * Extrai receitas do "500 Receitas Low Carb" usando coordenadas x,y
 * para separar as duas colunas por página.
 */
const { PdfReader } = require('./node_modules/pdfreader');
const fs = require('fs');
const path = require('path');

const PDF_PATH = 'D:/PDFs/500 Receitas Low Carb-1_1.pdf';
const OUT_PATH = path.join(__dirname, '../data/recipes_500lowcarb.json');

const SECTION_MAP = [
  { match: /FARINHAS.*LEITES/i,              sub: 'farinhas', label: 'Farinhas e Leites' },
  { match: /PAT[EÊ]S/i,                      sub: 'pates',    label: 'Patês' },
  { match: /MOLHOS/i,                        sub: 'molhos',   label: 'Molhos' },
  { match: /CAF[EÉ].*MANH[AÃ]/i,            sub: 'cafe',     label: 'Café da Manhã e Lanches' },
  { match: /\bAVES\b/i,                      sub: 'aves',     label: 'Aves' },
  { match: /CARNES/i,                        sub: 'carnes',   label: 'Carnes' },
  { match: /PEIXES/i,                        sub: 'peixes',   label: 'Peixes' },
  { match: /LEGUMES|VEGETAIS/i,              sub: 'legumes',  label: 'Legumes e Vegetais' },
  { match: /SALADAS/i,                       sub: 'saladas',  label: 'Saladas' },
  { match: /SOPAS|CREMES/i,                 sub: 'sopas',    label: 'Sopas e Cremes' },
  { match: /TORTAS|SUFL/i,                  sub: 'tortas',   label: 'Tortas e Suflês' },
  { match: /DOCES.*SOBREMESAS|SOBREMESAS/i,  sub: 'doces',    label: 'Doces e Sobremesas' },
  { match: /BEBIDAS/i,                       sub: 'bebidas',  label: 'Bebidas' },
];

function detectSection(text) {
  for (const s of SECTION_MAP) if (s.match.test(text)) return s;
  return null;
}

function toId(title) {
  return 'lc500-' + title.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isNoise(t) {
  return /licenciado para|protegido por|eduzz|cpf|cnpj/i.test(t);
}

function buildRecipe(items, subcategory, subcategoryLabel) {
  // Sort by y
  items.sort((a, b) => a.y - b.y);

  // Merge items on same y into lines
  const lines = [];
  let curY = -999, curLine = '';
  for (const it of items) {
    if (Math.abs(it.y - curY) > 0.4) {
      if (curLine.trim()) lines.push(curLine.trim());
      curLine = it.text;
      curY = it.y;
    } else {
      curLine += ' ' + it.text;
    }
  }
  if (curLine.trim()) lines.push(curLine.trim());

  const SKIP_RE = /^(INGREDIENTES\s*:?|MODO\s+DE\s+PREPARO\s*:?|RENDIMENTO.*|M\.\s*PREPARO|\d+\s*>?|>|\d+\s*P\s*\.|.*Min\s*\.)$/i;
  const SEC_RE  = /^(FARINHAS|PAT[EÊ]S|MOLHOS|CAF[EÉ]|ALMO[Ç]|DOCES|PEIXES|CARNES|LEGUMES|SALADAS|SOPAS|TORTAS|BEBIDAS|AVES)/i;

  const ingredients = [];
  const steps = [];
  const titleCandidates = [];
  let stepBuf = '';
  let inStep = false;
  let pastIngredientes = false;

  for (const line of lines) {
    const l = line.replace(/\s+/g, ' ').trim();
    if (!l || isNoise(l)) continue;

    // Section header
    if (SEC_RE.test(l)) continue;

    // Skip markers
    if (SKIP_RE.test(l)) {
      if (/INGREDIENTES/i.test(l)) pastIngredientes = true;
      if (stepBuf && (/RENDIMENTO|M\.\s*PREPARO|\d+\s*P\s*\./i.test(l))) {
        steps.push(stepBuf.trim()); stepBuf = ''; inStep = false;
      }
      continue;
    }

    // Before INGREDIENTES: = title lines
    if (!pastIngredientes) {
      if (l.length > 2 && l.length < 80) titleCandidates.push(l);
      continue;
    }

    // Ingredient line
    if (/^-\s/.test(l)) {
      if (inStep && stepBuf) { steps.push(stepBuf.trim()); stepBuf = ''; inStep = false; }
      const ing = l.replace(/^-\s*/, '').trim();
      if (ing.length > 1) ingredients.push(ing);
      continue;
    }

    // Step start
    if (/^\d+[\.\)]\s/.test(l)) {
      if (stepBuf) steps.push(stepBuf.trim());
      stepBuf = l.replace(/^\d+[\.\)]\s*/, '').trim();
      inStep = true;
      continue;
    }

    // Continuation of step
    if (inStep) {
      stepBuf += ' ' + l;
      continue;
    }

    // Loose text after ingredients
    titleCandidates.push(l);
  }
  if (stepBuf) steps.push(stepBuf.trim());

  if (!ingredients.length || !steps.length) return null;

  // Title: join all pre-INGREDIENTES candidates (some titles wrap to 2 lines)
  const preCandidates = [];
  let postTitle = false;
  for (const c of titleCandidates) {
    const t = c.replace(/\s+/g, ' ').trim();
    if (!t || t.length <= 1 || isNoise(t) || /RENDIMENTO|M\.\s*PREPARO|\d+\s*P\b/i.test(t)) continue;
    // Once we hit a line that looks like a page number (single/double digit) stop
    if (/^\d{1,3}$/.test(t)) { postTitle = true; continue; }
    if (postTitle) continue;
    preCandidates.push(t);
  }
  // Keep only the pre-INGREDIENTES lines (the last continuous group before ingredients)
  const title = preCandidates.join(' ').trim();
  if (!title || title.length < 2) return null;

  return {
    id: toId(title),
    title,
    category: 'livro500',
    subcategory,
    subcategoryLabel,
    ingredients,
    steps,
    photo: '',
    search: title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  };
}

// ─── Main (callback-based, no Promise) ────────────────────────────────────────
console.log('Lendo PDF…');

let curPage = 0;
const pageItems = {};
let currentSub = 'outros';
let currentLabel = 'Outros';
const recipes = [];
const seen = new Set();

new PdfReader().parseFileItems(PDF_PATH, (err, item) => {
  if (err) { console.error(err); return; }

  if (!item) {
    // EOF — process all pages
    const numPages = Math.max(...Object.keys(pageItems).map(Number));
    console.log('Total de páginas:', numPages);

    for (let p = 7; p <= numPages; p++) {
      const items = pageItems[p] || [];
      if (!items.length) continue;

      const pageText = items.map(i => i.text).join(' ');

      const sec = detectSection(pageText);
      if (sec) { currentSub = sec.sub; currentLabel = sec.label; }

      if (!/INGREDIENTES/i.test(pageText)) continue;

      // Split columns: left x<18, right x>=18
      const left  = items.filter(i => i.x <  18 && !isNoise(i.text));
      const right = items.filter(i => i.x >= 18 && !isNoise(i.text));

      if (left.some(i  => /INGREDIENTES/i.test(i.text))) {
        const rec = buildRecipe([...left], currentSub, currentLabel);
        if (rec && !seen.has(rec.id)) { seen.add(rec.id); recipes.push(rec); }
      }
      if (right.some(i => /INGREDIENTES/i.test(i.text))) {
        const rec = buildRecipe([...right], currentSub, currentLabel);
        if (rec && !seen.has(rec.id)) { seen.add(rec.id); recipes.push(rec); }
      }
    }

    console.log('Receitas extraídas:', recipes.length);

    const bySub = {};
    recipes.forEach(r => { bySub[r.subcategory] = (bySub[r.subcategory] || 0) + 1; });
    console.log('\nPor subcategoria:');
    Object.entries(bySub).forEach(([k, v]) => console.log(' ', k, '→', v));

    console.log('\nAMOSTRA (5 primeiras):');
    recipes.slice(0, 5).forEach(r => {
      console.log('\n---', r.title, '(' + r.subcategory + ')');
      console.log('  ING:', r.ingredients.slice(0, 2).join(' | '));
      console.log('  STEP1:', (r.steps[0] || '').slice(0, 80));
    });

    fs.writeFileSync(OUT_PATH, JSON.stringify(recipes, null, 2), 'utf8');
    console.log('\nSalvo em:', OUT_PATH);
    return;
  }

  if (item.page) {
    curPage = item.page;
    if (!pageItems[curPage]) pageItems[curPage] = [];
  }
  if (item.text && curPage > 0) {
    pageItems[curPage].push({ x: item.x || 0, y: item.y || 0, text: item.text });
  }
});
