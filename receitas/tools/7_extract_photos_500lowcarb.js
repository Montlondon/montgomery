/**
 * 7_extract_photos_500lowcarb.js
 *
 * Extrai imagens do PDF "500 Receitas Low Carb-1_1.pdf",
 * faz o matching por título de receita (texto próximo à imagem na mesma página),
 * salva as fotos em receitas/images/livro500/ e atualiza recipes_500lowcarb.json.
 *
 * Uso: node 7_extract_photos_500lowcarb.js
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { PDFDocument, PDFName, PDFRawStream } = require('./node_modules/pdf-lib');
const { PdfReader } = require('./node_modules/pdfreader');

const TOOLS_DIR = __dirname;
const WORKTREE  = path.resolve(TOOLS_DIR, '..');
const PDF_PATH  = 'D:/PDFs/500 Receitas Low Carb-1_1.pdf';
const IMG_DIR   = path.join(WORKTREE, 'images/livro500');
const JSON_PATH = path.join(WORKTREE, 'data/recipes_500lowcarb.json');

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function md5(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

// ─── 1. Extrai imagens JPEG por página via pdf-lib ─────────────────────────

async function extractImages(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages  = pdfDoc.getPages();
  const byPage = {}; // page (1-based) → [{ buf, hash, w, h }]
  const hashes = {}; // md5 → count

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const page = pages[i];
    const resources = page.node.Resources();
    if (!resources) continue;
    const xobjDict = resources.lookup(PDFName.of('XObject'));
    if (!xobjDict) continue;

    for (const [, ref] of xobjDict.entries()) {
      const xobj = pdfDoc.context.lookup(ref);
      if (!(xobj instanceof PDFRawStream)) continue;
      const subtype = xobj.dict.lookup(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Image') continue;

      const width  = xobj.dict.lookup(PDFName.of('Width'))?.numberValue;
      const height = xobj.dict.lookup(PDFName.of('Height'))?.numberValue;
      if (!width || !height || width < 100 || height < 100) continue;

      const filterObj = xobj.dict.lookup(PDFName.of('Filter'));
      let filters = [];
      if (filterObj) {
        if (Array.isArray(filterObj.array)) filters = filterObj.array.map(f => f.toString());
        else filters = [filterObj.toString()];
      }
      if (!filters.includes('/DCTDecode') && !filters.includes('/JPXDecode')) continue;

      // Converte para sRGB via sharp (resolve CMYK/ICCBased → preto no browser)
      const sharp = require('./node_modules/sharp');
      let buf;
      try {
        buf = await sharp(Buffer.from(xobj.contents))
          .toColorspace('srgb')
          .jpeg({ quality: 88 })
          .toBuffer();
      } catch (e) {
        continue; // imagem corrompida, pula
      }
      const hash = md5(buf);
      hashes[hash] = (hashes[hash] || 0) + 1;

      if (!byPage[pageNum]) byPage[pageNum] = [];
      byPage[pageNum].push({ buf, hash, w: width, h: height });
    }

    if (pageNum % 50 === 0) process.stdout.write(`  imagens: página ${pageNum}/${pages.length}\r`);
  }

  const total = Object.values(byPage).flat().length;
  console.log(`\nImagens JPEG encontradas: ${total} em ${Object.keys(byPage).length} páginas`);
  return { byPage, hashes };
}

// ─── 2. Texto por página via pdfreader ────────────────────────────────────

function extractText(pdfPath) {
  return new Promise((resolve, reject) => {
    const textByPage = {};
    const reader = new PdfReader();
    let currentPage = 0;

    reader.parseFileItems(pdfPath, (err, item) => {
      if (err) { reject(err); return; }
      if (!item) {
        console.log(`Texto extraído de ${Object.keys(textByPage).length} páginas`);
        resolve(textByPage);
        return;
      }
      if (item.page) {
        currentPage = item.page;
        if (!textByPage[currentPage]) textByPage[currentPage] = '';
      }
      if (item.text && currentPage) {
        textByPage[currentPage] += ' ' + item.text;
      }
    });
  });
}

// ─── 3. Matching receita → página ─────────────────────────────────────────

function buildPageMap(recipes, textByPage) {
  const pageMap = {};

  for (const r of recipes) {
    const normTitle = normalize(r.title);
    const words = normTitle.split(' ').filter(w => w.length > 3);
    if (words.length === 0) continue;

    let best = { page: null, score: 0 };
    for (const [pageStr, text] of Object.entries(textByPage)) {
      const normText = normalize(text);
      const hits  = words.filter(w => normText.includes(w)).length;
      const score = hits / words.length;
      if (score > best.score) {
        best = { page: parseInt(pageStr), score };
      }
    }

    if (best.score >= 0.6) {
      pageMap[r.id] = best.page;
    }
  }

  const found = Object.keys(pageMap).length;
  console.log(`Matching: ${found}/${recipes.length} receitas encontraram página (>= 60%)`);
  return pageMap;
}

// ─── 4. Salva fotos ───────────────────────────────────────────────────────

function savePhotos(recipes, byPage, hashes, pageMap) {
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const decorative = new Set(
    Object.entries(hashes).filter(([, c]) => c > 1).map(([h]) => h)
  );
  console.log(`Imagens decorativas (repetidas): ${decorative.size}`);

  let saved = 0;
  const updated = [];

  const regen = process.argv.includes('--regen');
  // fotos enviadas manualmente pelo usuário — nunca sobrescrever
  const manualPhotos = new Set(['lc500-farinha-de-frango-low-carb']);

  for (const r of recipes) {
    const hasPhoto = r.photo && r.photo.trim() && r.photo.startsWith('images/livro500/');
    if (hasPhoto && (!regen || manualPhotos.has(r.id))) { updated.push(r); continue; }
    if (!hasPhoto && (!r.photo || !r.photo.trim())) { /* sem foto — tenta extrair */ }

    const page = pageMap[r.id];
    if (!page || !byPage[page]) { updated.push(r); continue; }

    const candidates = (byPage[page] || [])
      .filter(img => !decorative.has(img.hash))
      .sort((a, b) => (b.w * b.h) - (a.w * a.h));

    if (candidates.length === 0) { updated.push(r); continue; }

    const img      = candidates[0];
    const filename = `${r.id}.jpg`;
    fs.writeFileSync(path.join(IMG_DIR, filename), img.buf);
    updated.push({ ...r, photo: `images/livro500/${filename}` });
    saved++;
  }

  console.log(`Fotos salvas: ${saved}`);
  return updated;
}

// ─── main ─────────────────────────────────────────────────────────────────

(async () => {
  console.log('=== Extração de fotos — 500 Low Carb ===\n');

  const recipes  = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const semFoto  = recipes.filter(r => !r.photo || !r.photo.trim()).length;
  console.log(`Receitas sem foto: ${semFoto}/${recipes.length}`);

  const pdfBytes = fs.readFileSync(PDF_PATH);
  console.log(`PDF: ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB\n`);

  console.log('1. Extraindo imagens JPEG...');
  const { byPage, hashes } = await extractImages(pdfBytes);

  console.log('\n2. Extraindo texto por página...');
  const textByPage = await extractText(PDF_PATH);

  console.log('\n3. Matching título → página...');
  const pageMap = buildPageMap(recipes, textByPage);

  const pagesWithImg = Object.keys(byPage).length;
  const receitasComImg = Object.entries(pageMap).filter(([, p]) => byPage[p]).length;
  console.log(`Páginas com imagem: ${pagesWithImg} | Receitas com imagem disponível: ${receitasComImg}`);

  console.log('\n4. Salvando fotos...');
  const updated = savePhotos(recipes, byPage, hashes, pageMap);

  console.log('\n5. Atualizando JSON...');
  fs.writeFileSync(JSON_PATH, JSON.stringify(updated, null, 2), 'utf8');

  const comFoto = updated.filter(r => r.photo && r.photo.trim()).length;
  console.log(`\n=== Concluído: ${comFoto}/${recipes.length} receitas com foto ===`);
})().catch(err => {
  console.error('ERRO FATAL:', err.message);
  process.exit(1);
});
