const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const recipesPath = process.argv[2];
  const imgDir = process.argv[3];
  const outDir = process.argv[4];
  const perSheet = parseInt(process.argv[5] || '20', 10);

  const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf8')).filter(r => r.photo);
  fs.mkdirSync(outDir, { recursive: true });

  const cell = 220, labelH = 34, cols = 5;
  const rows = Math.ceil(perSheet / cols);
  const sheetW = cell * cols, sheetH = (cell + labelH) * rows;

  for (let s = 0; s * perSheet < recipes.length; s++) {
    const chunk = recipes.slice(s * perSheet, s * perSheet + perSheet);
    const composites = [];
    for (let i = 0; i < chunk.length; i++) {
      const r = chunk[i];
      const col = i % cols, row = Math.floor(i / cols);
      const x = col * cell, y = row * (cell + labelH);
      const thumb = await sharp(path.join(imgDir, r.photo)).resize(cell, cell, { fit: 'cover' }).toBuffer();
      composites.push({ input: thumb, left: x, top: y });
      const label = `<svg width="${cell}" height="${labelH}"><rect width="100%" height="100%" fill="#222"/><text x="4" y="22" font-size="13" fill="white" font-family="Arial">${(s*perSheet+i)+' '+r.title.slice(0,26)}</text></svg>`;
      composites.push({ input: Buffer.from(label), left: x, top: y + cell });
    }
    await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#fff' } })
      .composite(composites)
      .jpeg({ quality: 78 })
      .toFile(path.join(outDir, `sheet_${s}.jpg`));
    console.log('wrote sheet', s, 'items', chunk.length);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
