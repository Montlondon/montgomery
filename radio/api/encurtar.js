export default async function handler(req, res) {
  const url = req.query.url;
  if (!url || !url.startsWith('https://radiomontgomery.vercel.app/')) {
    res.status(400).json({ error: 'url inválida' });
    return;
  }
  try {
    const r = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url));
    const short = await r.text();
    if (!short.startsWith('http')) throw new Error('resposta inesperada');
    res.status(200).json({ short });
  } catch (e) {
    res.status(200).json({ short: url });
  }
}
