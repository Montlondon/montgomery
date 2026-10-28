const fs = require('fs');
const sharp = require('sharp');
const recipes = require('./vegan_parsed.json');
const allImages = require('./vegan_images/manifest_all.json');

const PAGE_OFFSET = 6;
const byPage = {};
allImages.forEach(img => {
  if (!byPage[img.page]) byPage[img.page] = [];
  byPage[img.page].push(img);
});

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const outDir = 'vegan_final';
fs.mkdirSync(outDir, { recursive: true });

const result = [];
const missing = [];

(async () => {
  for (const r of recipes) {
    const literalPage = r.page + PAGE_OFFSET;
    let candidates = (byPage[literalPage] || []).filter(x => x.dupCount === 1);
    let chosen = null;
    if (candidates.length > 0) {
      chosen = candidates.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b));
    }
    const id = slugify(r.title);
    let photoFile = null;
    if (chosen) {
      photoFile = id + '.jpg';
      await sharp('vegan_images/' + chosen.file)
        .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 72, mozjpeg: true })
        .toFile(outDir + '/' + photoFile);
    } else {
      missing.push({ title: r.title, page: r.page, literalPage });
    }
    result.push({
      id,
      title: r.title.replace(/\s+/g, ' ').trim()
        .toLowerCase().replace(/(^|\s|-)\S/g, c => c.toUpperCase()),
      category: 'veganas',
      ingredients: r.ingredients,
      steps: r.steps,
      photo: photoFile ? 'images/veganas/' + photoFile : null,
      page: r.page,
      literalPage
    });
  }
  fs.writeFileSync('vegan_final/recipes.json', JSON.stringify(result, null, 2));
  console.log('Total:', result.length, '| com foto:', result.filter(r => r.photo).length, '| sem foto:', missing.length);
  missing.forEach(m => console.log('  SEM FOTO:', m.title, 'p.' + m.page, 'literal', m.literalPage));
})();
