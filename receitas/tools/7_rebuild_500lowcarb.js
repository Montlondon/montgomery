// Reconstrói data/recipes_500lowcarb.json e images/livro500/ a partir do PDF.
// Âncoras: título em fonte 28, rótulos em fonte 22, uma receita por coluna da página.
// Uso: node 7_rebuild_500lowcarb.js ["caminho/do/livro.pdf"]

const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName, PDFRawStream, PDFArray, decodePDFRawStream } = require('pdf-lib');
const { PdfReader } = require('pdfreader');
const sharp = require('sharp');
const pako = require('pako');

const ROOT = path.resolve(__dirname, '..');
const PDF_PATH = process.argv[2] || 'D:/PDFs/500 Receitas Low Carb-1_1.pdf';
const IMG_DIR = path.join(ROOT, 'images/livro500');
const JSON_PATH = path.join(ROOT, 'data/recipes_500lowcarb.json');
const EXPECTED_RECIPES = 500;

// fotos enviadas pelo Montgomery: nunca sobrescrever
const MANUAL_PHOTOS = new Set(['lc500-farinha-de-frango-low-carb']);
const TITLE_FIXES = { 'Requeijão de Castanhade Caju': 'Requeijão de Castanha de Caju' };
const TITLE_SIZE = 28;
const LABEL_SIZE = 22;

const clean = s => s.replace(/\s+/g, ' ').trim();
const normalize = s => clean(s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' '));
const tokens = list => [...new Set(normalize(list.join(' ')).split(' ').filter(w => w.length > 3))];

function readItems(pdfPath) {
  return new Promise((resolve, reject) => {
    const items = {}, width = {};
    let current = 0;
    new PdfReader().parseFileItems(pdfPath, (err, item) => {
      if (err) return reject(err);
      if (!item) return resolve({ items, width });
      if (item.page) {
        current = item.page;
        items[current] = items[current] || [];
        width[current] = item.width;
      }
      if (item.text && current) {
        items[current].push({ text: item.text, size: item.R?.[0]?.TS?.[1] ?? 0, x: item.x, y: item.y });
      }
    });
  });
}

function toLines(list, mid, splitColumns) {
  const sorted = [...list].sort((a, b) => (splitColumns ? (a.x >= mid) - (b.x >= mid) : 0) || a.y - b.y || a.x - b.x);
  const lines = [];
  for (const i of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - i.y) < 0.2 && (last.x >= mid) === (i.x >= mid)) last.text += ' ' + i.text.trim();
    else lines.push({ x: i.x, y: i.y, text: i.text.trim() });
  }
  return lines.map(l => clean(l.text));
}

function parseIngredients(lines) {
  const body = lines.filter(l => !/^ingredientes:?$/i.test(l));
  const hasDash = body.some(l => l.startsWith('-'));
  const out = [];
  for (const l of body) {
    const startsNew = l.endsWith(':') || (hasDash ? l.startsWith('-') : /^\d/.test(l));
    const text = l.replace(/^-\s*/, '');
    if (startsNew || !out.length) out.push(text);
    else out[out.length - 1] += ' ' + text;
  }
  return out.map(clean);
}

function parseSteps(lines) {
  const out = [];
  for (const l of lines) {
    const numbered = l.match(/^\d+\.\s*(.*)$/);
    if (numbered) out.push(numbered[1]);
    else if (!out.length) out.push(l);
    else if (out[out.length - 1].endsWith('-')) out[out.length - 1] += l;
    else out[out.length - 1] += ' ' + l;
  }
  return out.map(clean);
}

function columnsOfPage(page, its, width) {
  const firstInCol = (re, inCol) => its.filter(i => i.size === LABEL_SIZE && re.test(i.text.trim()) && inCol(i)).sort((a, b) => a.y - b.y)[0];
  const labels = its.filter(i => i.size === LABEL_SIZE && /^INGREDIENTES/i.test(i.text.trim()));
  if (!labels.length) return [];

  const mid = width / 2 - 0.5;
  const twoCols = labels.some(l => l.x < mid) && labels.some(l => l.x >= mid);
  const colOf = i => (twoCols && i.x >= mid ? 1 : 0);
  const columns = [];

  for (let col = 0; col < (twoCols ? 2 : 1); col++) {
    const inCol = i => colOf(i) === col;
    const titleItems = its.filter(i => i.size === TITLE_SIZE && i.text.trim() && inCol(i)).sort((a, b) => a.y - b.y || a.x - b.x);
    if (!titleItems.length) throw new Error(`Página ${page} coluna ${col}: sem título`);
    const ingLabel = firstInCol(/^INGREDIENTES/i, inCol);
    const modoLabel = firstInCol(/^MODO DE PREPARO/i, inCol);
    if (!ingLabel || !modoLabel) throw new Error(`Página ${page} coluna ${col}: sem rótulos`);

    const rend = its.filter(i => /^RENDIMENTO/i.test(i.text.trim()) && inCol(i)).sort((a, b) => a.y - b.y)[0];
    const body = its.filter(i => i.size >= 18 && i.size < LABEL_SIZE && inCol(i));
    const ingItems = body.filter(i => i.y > ingLabel.y && i.y < modoLabel.y);
    const stepItems = body.filter(i => i.y > modoLabel.y && (!rend || i.y < rend.y));
    const twoSubColumns = !twoCols && ingItems.some(i => i.x >= mid && i.text.trim().startsWith('-'));
    const title = clean(titleItems.map(t => t.text).join(' '));

    columns.push({
      page, col, twoCols, title, norm: normalize(title),
      ingredients: parseIngredients(toLines(ingItems, mid, twoSubColumns)),
      steps: parseSteps(toLines(stepItems, mid, false)),
      text: ' ' + normalize(body.map(i => i.text).join(' ')) + ' ',
    });
  }
  return columns;
}

function alignByTitle(recipes, cols) {
  const R = recipes.length, C = cols.length;
  const dirty = recipes.map(r => normalize(r.title));
  const score = (i, j) => (dirty[i] === cols[j].norm || dirty[i].startsWith(cols[j].norm + ' ') ? 1 + cols[j].norm.length / 1000 : 0);
  const dp = Array.from({ length: R + 1 }, () => new Float64Array(C + 1));
  for (let i = 1; i <= R; i++) {
    for (let j = 1; j <= C; j++) {
      const s = score(i - 1, j - 1);
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], s ? dp[i - 1][j - 1] + s : 0);
    }
  }
  const pairs = new Map();
  for (let i = R, j = C; i > 0 && j > 0;) {
    const s = score(i - 1, j - 1);
    if (s && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + s)) < 1e-9) { pairs.set(i - 1, j - 1); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return pairs;
}

const ingredientOverlap = (r, col) => {
  const ts = tokens(r.ingredients);
  return ts.length ? ts.filter(w => col.text.includes(w)).length / ts.length : 0;
};

const mul = (m, c) => [
  m[0] * c[0] + m[1] * c[2], m[0] * c[1] + m[1] * c[3],
  m[2] * c[0] + m[3] * c[2], m[2] * c[1] + m[3] * c[3],
  m[4] * c[0] + m[5] * c[2] + c[4], m[4] * c[1] + m[5] * c[3] + c[5],
];

function imagePlacements(page, doc) {
  const contents = page.node.Contents();
  if (!contents) return {};
  const list = contents instanceof PDFArray ? contents.asArray().map(r => doc.context.lookup(r)) : [contents];
  const src = list.filter(s => s instanceof PDFRawStream)
    .map(s => Buffer.from(decodePDFRawStream(s).decode()).toString('latin1')).join('\n');
  const re = /(?:^|\s)(q|Q)(?=\s)|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm(?=\s)|(\/[^\s\/\[\]<>()]+)\s+Do(?=\s|$)/g;
  let ctm = [1, 0, 0, 1, 0, 0], m;
  const stack = [], out = {};
  while ((m = re.exec(src))) {
    if (m[1] === 'q') stack.push(ctm);
    else if (m[1] === 'Q') ctm = stack.pop() || ctm;
    else if (m[2] !== undefined) ctm = mul(m.slice(2, 8).map(Number), ctm);
    else if (m[8] && !out[m[8]]) out[m[8]] = ctm;
  }
  return out;
}

function imagesOfPage(page, doc) {
  const res = page.node.Resources();
  const dict = res && res.lookup(PDFName.of('XObject'));
  if (!dict) return [];
  const place = imagePlacements(page, doc);
  const box = page.getMediaBox();
  const out = [];
  for (const [key, ref] of dict.entries()) {
    const stream = doc.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    const sub = stream.dict.lookup(PDFName.of('Subtype'));
    if (!sub || sub.toString() !== '/Image') continue;
    const c = place[key.toString()];
    out.push({
      stream,
      w: stream.dict.lookup(PDFName.of('Width'))?.numberValue || 0,
      h: stream.dict.lookup(PDFName.of('Height'))?.numberValue || 0,
      cx: c ? (c[4] + (c[0] + c[2]) / 2 - box.x) / box.width : 0.5,
    });
  }
  return out.sort((a, b) => b.w * b.h - a.w * a.h);
}

function cmykTiff(ink, w, h, icc) {
  const tags = [
    [256, 4, 1, w], [257, 4, 1, h], [258, 3, 4, 0], [259, 3, 1, 1], [262, 3, 1, 5],
    [273, 4, 1, 0], [277, 3, 1, 4], [278, 4, 1, h], [279, 4, 1, ink.length],
    [284, 3, 1, 1], [332, 3, 1, 1], [34675, 7, icc.length, 0],
  ];
  const bitsOff = 8 + 2 + tags.length * 12 + 4, iccOff = bitsOff + 8, dataOff = iccOff + icc.length;
  tags[2][3] = bitsOff; tags[5][3] = dataOff; tags[11][3] = iccOff;
  const head = Buffer.alloc(dataOff);
  head.write('II', 0, 'latin1'); head.writeUInt16LE(42, 2); head.writeUInt32LE(8, 4);
  head.writeUInt16LE(tags.length, 8);
  tags.forEach(([tag, type, count, val], i) => {
    const o = 10 + i * 12;
    head.writeUInt16LE(tag, o); head.writeUInt16LE(type, o + 2); head.writeUInt32LE(count, o + 4);
    if (type === 3 && count === 1) head.writeUInt16LE(val, o + 8); else head.writeUInt32LE(val, o + 8);
  });
  for (let i = 0; i < 4; i++) head.writeUInt16LE(8, bitsOff + i * 2);
  icc.copy(head, iccOff);
  return Buffer.concat([head, ink]);
}

// o libvips entrega o CMYK do JPEG com 255 = sem tinta; a inversão precisa vir antes do perfil de cor
async function imageToJpeg(stream, doc) {
  let jpeg = Buffer.from(stream.contents);
  if (String(stream.dict.lookup(PDFName.of('Filter'))).includes('FlateDecode')) jpeg = Buffer.from(pako.inflate(jpeg));
  const meta = await sharp(jpeg).metadata();
  if (meta.space !== 'cmyk') return sharp(jpeg).toColourspace('srgb').jpeg({ quality: 88 }).toBuffer();

  const cs = stream.dict.lookup(PDFName.of('ColorSpace'));
  if (!(cs instanceof PDFArray) || cs.get(0).toString() !== '/ICCBased') throw new Error('Imagem CMYK sem perfil ICC');
  const icc = Buffer.from(decodePDFRawStream(doc.context.lookup(cs.get(1))).decode());
  const { data, info } = await sharp(jpeg).pipelineColourspace('cmyk').toColourspace('cmyk').raw().toBuffer({ resolveWithObject: true });
  const ink = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) ink[i] = 255 - data[i];
  return sharp(cmykTiff(ink, info.width, info.height, icc)).toColourspace('srgb').jpeg({ quality: 88 }).toBuffer();
}

(async () => {
  const recipes = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const { items, width } = await readItems(PDF_PATH);
  const doc = await PDFDocument.load(fs.readFileSync(PDF_PATH), { ignoreEncryption: true });
  const pdfPages = doc.getPages();

  const cols = Object.keys(items).map(Number).sort((a, b) => a - b)
    .flatMap(p => columnsOfPage(p, items[p], width[p]));
  if (cols.length !== EXPECTED_RECIPES) throw new Error(`Esperava ${EXPECTED_RECIPES} títulos no PDF, achei ${cols.length}`);

  const pairs = alignByTitle(recipes, cols);
  const usedCols = new Set(pairs.values());
  recipes.forEach((r, i) => {
    if (pairs.has(i)) return;
    const candidates = cols.map((c, j) => [ingredientOverlap(r, c), j]).filter(([, j]) => !usedCols.has(j)).sort((a, b) => b[0] - a[0]);
    if (!candidates.length || candidates[0][0] < 0.8) throw new Error(`Sem coluna no PDF para: ${r.title}`);
    pairs.set(i, candidates[0][1]);
    usedCols.add(candidates[0][1]);
    console.log(`Casada por ingredientes: "${r.title}" => "${cols[candidates[0][1]].title}"`);
  });

  const records = recipes.map((r, i) => {
    const col = cols[pairs.get(i)];
    const overlap = ingredientOverlap(r, col);
    if (overlap < 0.7) throw new Error(`Ingredientes não batem (${overlap.toFixed(2)}): ${r.title} x ${col.title}`);
    return { recipe: r, col };
  });
  cols.forEach((col, j) => {
    if (usedCols.has(j)) return;
    const before = records.filter(x => x.col.page <= col.page).pop();
    const id = 'lc500-' + normalize(col.title).replace(/ /g, '-');
    console.log(`Receita nova: "${col.title}" (pág ${col.page}) na subcategoria ${before.recipe.subcategory}`);
    records.splice(records.indexOf(before) + 1, 0, {
      col,
      recipe: { id, category: before.recipe.category, subcategory: before.recipe.subcategory, subcategoryLabel: before.recipe.subcategoryLabel, photo: '' },
    });
  });
  if (records.length !== EXPECTED_RECIPES) throw new Error(`Esperava ${EXPECTED_RECIPES} receitas, montei ${records.length}`);
  if (new Set(records.map(x => x.recipe.id)).size !== records.length) throw new Error('IDs duplicados');

  const photoOf = new Map();
  let notRecipe = 0;
  for (const page of [...new Set(cols.map(c => c.page))]) {
    const onPage = records.filter(x => x.col.page === page);
    for (const img of imagesOfPage(pdfPages[page - 1], doc)) {
      const wanted = onPage[0].col.twoCols && img.cx >= 0.5 ? 1 : 0;
      const target = onPage.length === 1 ? onPage[0] : onPage.find(x => x.col.col === wanted);
      if (!target || photoOf.has(target.recipe.id)) { notRecipe++; continue; }
      photoOf.set(target.recipe.id, img);
    }
  }

  fs.mkdirSync(IMG_DIR, { recursive: true });
  let written = 0;
  const output = [];
  for (const { recipe, col } of records) {
    const file = `${recipe.id}.jpg`;
    let photo = '';
    if (MANUAL_PHOTOS.has(recipe.id)) {
      photo = recipe.photo;
    } else if (photoOf.has(recipe.id)) {
      fs.writeFileSync(path.join(IMG_DIR, file), await imageToJpeg(photoOf.get(recipe.id).stream, doc));
      photo = `images/livro500/${file}`;
      written++;
    }
    const { search, ...rest } = recipe;
    output.push({ ...rest, title: TITLE_FIXES[col.title] || col.title, ingredients: col.ingredients, steps: col.steps, photo });
  }

  const referenced = new Set(output.map(r => r.photo).filter(Boolean).map(p => path.basename(p)));
  const stale = fs.readdirSync(IMG_DIR).filter(f => !referenced.has(f));
  stale.forEach(f => fs.unlinkSync(path.join(IMG_DIR, f)));

  fs.writeFileSync(JSON_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  const prev = new Map(recipes.map(r => [r.id, r]));
  const changed = key => output.filter(r => prev.has(r.id) && JSON.stringify(prev.get(r.id)[key]) !== JSON.stringify(r[key])).length;
  console.log(`Receitas: ${output.length} | títulos alterados: ${changed('title')} | ingredientes alterados: ${changed('ingredients')} | preparo alterado: ${changed('steps')}`);
  console.log(`Fotos: ${written} escritas do PDF, ${MANUAL_PHOTOS.size} manual preservada, ${stale.length} removidas (${stale.join(', ') || 'nenhuma'}), ${notRecipe} imagens fora de receita`);
  console.log(`Com foto: ${output.filter(r => r.photo).length} | sem foto: ${output.filter(r => !r.photo).length}`);
})().catch(err => { console.error('ERRO:', err.message); process.exit(1); });
