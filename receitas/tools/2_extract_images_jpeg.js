const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName, PDFRawStream } = require('pdf-lib');

async function main() {
  const [,, pdfPath, outDir] = process.argv;
  fs.mkdirSync(outDir, { recursive: true });
  const bytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const manifest = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const resources = page.node.Resources();
    if (!resources) continue;
    const xobjDict = resources.lookup(PDFName.of('XObject'));
    if (!xobjDict) continue;
    const entries = xobjDict.entries();
    let imgIndex = 0;
    for (const [key, ref] of entries) {
      const xobj = pdfDoc.context.lookup(ref);
      if (!(xobj instanceof PDFRawStream)) continue;
      const subtype = xobj.dict.lookup(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Image') continue;
      const width = xobj.dict.lookup(PDFName.of('Width'))?.numberValue;
      const height = xobj.dict.lookup(PDFName.of('Height'))?.numberValue;
      if (!width || !height || width < 150 || height < 150) continue; // skip tiny icons
      const filterObj = xobj.dict.lookup(PDFName.of('Filter'));
      let filters = [];
      if (filterObj) {
        if (Array.isArray(filterObj.array)) filters = filterObj.array.map(f => f.toString());
        else filters = [filterObj.toString()];
      }
      let ext = 'bin';
      let data = xobj.contents;
      if (filters.includes('/DCTDecode')) ext = 'jpg';
      else if (filters.includes('/JPXDecode')) ext = 'jp2';
      else if (filters.includes('/FlateDecode')) ext = 'png_raw'; // needs reconstruction, skip for now
      else ext = 'raw';

      if (ext === 'jpg' || ext === 'jp2') {
        const fname = `p${String(i+1).padStart(3,'0')}_${imgIndex}.${ext === 'jp2' ? 'jp2' : 'jpg'}`;
        fs.writeFileSync(path.join(outDir, fname), data);
        manifest.push({ page: i+1, file: fname, width, height, bytes: data.length });
        imgIndex++;
      }
    }
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Extracted', manifest.length, 'images');
}

main().catch(e => { console.error(e); process.exit(1); });
