const https = require('https');

const REPO   = 'Montlondon/montgomery';
const BRANCH = 'main';

function ghRequest(method, filePath, body) {
  return new Promise(function(resolve, reject) {
    var payload = body ? JSON.stringify(body) : null;
    var headers = {
      'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
      'User-Agent': 'receitas-upload',
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    var req = https.request({
      hostname: 'api.github.com',
      path: '/repos/' + REPO + '/contents/' + filePath,
      method: method,
      headers: headers
    }, function(res) {
      var raw = '';
      res.on('data', function(c){ raw += c; });
      res.on('end', function(){
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch(e) { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  var recipeId    = req.body.recipeId;
  var category    = req.body.category;
  var imageBase64 = req.body.imageBase64;
  var extension   = req.body.extension || 'jpg';

  if (!recipeId || !category || !imageBase64)
    return res.status(400).json({ error: 'recipeId, category e imageBase64 são obrigatórios' });

  var imgRepoPath  = 'receitas/images/' + category + '/' + recipeId + '.' + extension;
  var photoRelPath = 'images/' + category + '/' + recipeId + '.' + extension;
  var dataRepoPath = category === 'livro500'
    ? 'receitas/data/recipes_500lowcarb.json'
    : 'receitas/data/recipes.json';

  try {
    // 1. SHA existente da imagem (para update)
    var existing = await ghRequest('GET', imgRepoPath);
    var imgSha   = existing.status === 200 ? existing.data.sha : undefined;

    // 2. Upload da imagem
    var imgBody = { message: 'foto: ' + recipeId, content: imageBase64, branch: BRANCH };
    if (imgSha) imgBody.sha = imgSha;
    var imgResult = await ghRequest('PUT', imgRepoPath, imgBody);
    if (imgResult.status !== 200 && imgResult.status !== 201)
      throw new Error('Erro ao enviar imagem (' + imgResult.status + ')');

    // 3. Lê JSON atual
    var jsonRes = await ghRequest('GET', dataRepoPath);
    if (jsonRes.status !== 200) throw new Error('Arquivo de dados não encontrado');
    var jsonContent = JSON.parse(Buffer.from(jsonRes.data.content, 'base64').toString('utf8'));
    var jsonSha = jsonRes.data.sha;

    // 4. Atualiza campo photo
    var idx = jsonContent.findIndex(function(r){ return r.id === recipeId; });
    if (idx === -1) throw new Error('Receita não encontrada: ' + recipeId);
    jsonContent[idx].photo = photoRelPath;
    delete jsonContent[idx].photoCredit;
    delete jsonContent[idx].photoFocus;

    // 5. Salva JSON atualizado
    var updatedB64 = Buffer.from(JSON.stringify(jsonContent, null, 2), 'utf8').toString('base64');
    var jsonResult = await ghRequest('PUT', dataRepoPath, {
      message: 'foto: ' + recipeId + ' — path atualizado',
      content: updatedB64,
      sha: jsonSha,
      branch: BRANCH
    });
    if (jsonResult.status !== 200 && jsonResult.status !== 201)
      throw new Error('Erro ao salvar JSON (' + jsonResult.status + ')');

    res.status(200).json({ ok: true, photo: photoRelPath });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
