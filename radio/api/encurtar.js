function slugificar(texto) {
  return (texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default async function handler(req, res) {
  const url = req.query.url;
  const nome = req.query.nome;
  if (!url || !url.startsWith('https://radiomontgomery.vercel.app/')) {
    res.status(400).json({ error: 'url inválida' });
    return;
  }
  try {
    const slug = slugificar(nome);
    if (slug) {
      const sufixo = Math.random().toString(36).slice(2, 6);
      const alias = 'radio-' + slug + '-' + sufixo;
      const rBonito = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url) + '&alias=' + encodeURIComponent(alias));
      const shortBonito = await rBonito.text();
      if (shortBonito.startsWith('http')) {
        res.status(200).json({ short: shortBonito });
        return;
      }
    }
    const r = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url));
    const short = await r.text();
    if (!short.startsWith('http')) throw new Error('resposta inesperada');
    res.status(200).json({ short });
  } catch (e) {
    res.status(200).json({ short: url });
  }
}
