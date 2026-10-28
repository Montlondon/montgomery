const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const sharp = require('sharp');
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
    let imgIndex = 0;
    for (const [key, ref] of xobjDict.entries()) {
      const xobj = pdfDoc.context.lookup(ref);
      if (!(xobj instanceof PDFRawStream)) continue;
      const subtype = xobj.dict.lookup(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Image') continue;
      const filterObj = xobj.dict.lookup(PDFName.of('Filter'));
      let filters = [];
      if (filterObj) {
        if (Array.isArray(filterObj.array)) filters = filterObj.array.map(f => f.toString());
        else filters = [filterObj.toString()];
      }
      if (!filters.includes('/FlateDecode')) continue;

      const width = xobj.dict.lookup(PDFName.of('Width'))?.numberValue;
      const height = xobj.dict.lookup(PDFName.of('Height'))?.numberValue;
      const bpc = xobj.dict.lookup(PDFName.of('BitsPerComponent'))?.numberValue || 8;
      let csRef = xobj.dict.get(PDFName.of('ColorSpace'));
      let csObj = xobj.dict.lookup(PDFName.of('ColorSpace'));
      let csName = csObj ? csObj.toString() : '/DeviceRGB';

      let channels = 3;
      if (csName === '/DeviceGray' || csName === '/CalGray') channels = 1;
      else if (csName === '/DeviceCMYK') channels = 4;
      else if (csName === '/DeviceRGB' || csName === '/CalRGB') channels = 3;
      else if (csObj && csObj.array && csObj.array[0] && csObj.array[0].toString() === '/ICCBased') {
        const iccStream = pdfDoc.context.lookup(csObj.array[1]);
        const n = iccStream && iccStream.dict ? iccStream.dict.lookup(PDFName.of('N'))?.numberValue : null;
        channels = n || 3;
      } else { console.log('  pulando colorspace não suportado:', csName, 'pagina', i+1); continue; }

      try {
        const raw = zlib.inflateSync(xobj.contents);
        const expected = width * height * channels;
        if (raw.length < expected) { console.log('  tamanho inesperado pagina', i+1, raw.length, 'esperado', expected); continue; }
        const outName = `p${String(i+1).padStart(3,'0')}_flate${imgIndex}.jpg`;
        let img = sharp(raw, { raw: { width, height, channels } });
        if (channels === 4) img = img.toColorspace('srgb'); // aproximação p/ CMYK
        await img.jpeg({ quality: 88 }).toFile(path.join(outDir, outName));
        manifest.push({ page: i + 1, file: outName, width, height, bytes: raw.length, fromFlate: true });
        imgIndex++;
      } catch (e) {
        console.log('  erro pagina', i+1, e.message);
      }
    }
  }
  fs.writeFileSync(path.join(outDir, 'manifest_flate.json'), JSON.stringify(manifest, null, 2));
  console.log('Extraídas', manifest.length, 'imagens FlateDecode');
}
main().catch(e => { console.error(e); process.exit(1); });
