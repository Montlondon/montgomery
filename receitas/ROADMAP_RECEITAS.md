# ROADMAP — Receitas (app pessoal de receitas)

Livro de receitas pessoal, vindo de PDFs comprados da Chef Carla Ramos (sem glúten),
com zoom infinito, busca 100% e foto conferida de cada receita.

- **App:** `C:\mc\.claude\worktrees\recipes-app-bread-cakes-4f32d1\receitas`
- **Branch:** `claude/recipes-app-bread-cakes-4f32d1`
- **Vercel (projeto):** `receitas` (conta montgomery-s-projects)
- **Link curto no ar:** https://montgomery-receitas.vercel.app
- **PDFs fonte:** `C:\mc\MontyReceitas\`
- **Senha de retorno:** "Pão Fresco" — ao ouvir essa frase numa janela nova, ler este
  roadmap inteiro e perguntar se é pra tocar a varredura de texto sujo (seção "vivo")
  ou processar o próximo PDF da fila (seção "próximo").

---

## feito

- **84 Pães** (`f17085952_Chef_Carla_Ramos_P_es.pdf`) — ingredientes, modo de preparo e foto
  conferida visualmente, uma por uma.
- **4 Bases / Mix de Farinhas** (mesmo PDF dos pães, seção separada, sem "modo de preparo").
- **69 Veganas** (`+70 Receitas Veganas Sem Glúten - Chef Carla Ramos.pdf`) — mesma técnica,
  68 com foto própria confirmada, 1 (Pão de Trigo Sarraceno) sem foto porque o livro não tem
  uma foto dedicada pra ela (decidimos deixar sem, em vez de roubar a foto de outra receita).
- **31 Bolachas e Biscoitos** (`+30 Bolachas e Biscoitos Sem Glúten - Chef Carla Ramos.pdf`)
  — offset +4, 30/31 com foto (Bolacha de Fubá sem foto no PDF).
- **51 Doces e Sobremesas** (`+50 Doces e Sobremesas Sem Glúten - Chef Carla Ramos.pdf`)
  — offset +5, multi-page support, 48/51 com foto (3 receitas sem foto no PDF).
- **44 Massas** (`f17054208_Chef_Carla_Ramos_Massas.pdf`)
  — offset +4 na foto (página da foto é sumário−1+5), 44/44 com foto.
- **10 Pães Trançados** (`f17205760_Chef_Carla_Ramos_P_es_Tran_ados.pdf`)
  — offset +4, 10/10 com foto.
- **15 Panetone** (`f17312512_Chef_Carla_Ramos_Panetone.pdf`)
  — offset +5, 15/15 com foto.
- **4 Fermentação Natural** (`f17008896_Chef_Carla_Ramos_Fermenta_o_Natural.pdf`)
  — guia teórico com 4 receitas ao final, offset +5, 4/4 com foto.
- App: zoom infinito, busca 100% (todo campo, acento/maiúscula não importa), categorias
  dinâmicas, cadastro de receita própria (com foto e categoria nova), tema/paleta de cores,
  PWA instalável com ícone próprio.
- Corrigidos: crash ao abrir receita sem foto, scroll roubado pelo zoom da foto, cache do
  Service Worker servindo foto velha (trocado pra network-first), aviso "toque/roda pra
  ampliar" removido (desnecessário), campo "Nome da nova categoria" que ficava escondido
  atrás do teclado no celular (agora rola a tela até ele e foca sozinho).
- Deploy público sem exigir login da Vercel (`ssoProtection` desligada nos dois projetos:
  `recipes-app-bread-cakes-4f32d1` antigo e `receitas` atual).
- **GitHub conectado ao Vercel** (04/11/2026): projeto `receitas` auto-deploya a cada push
  no `main`. O alias `montgomery-receitas.vercel.app` **não** segue o deploy novo
  automaticamente — reatribuir via MCP `assign_alias` (ou terminal `vercel alias set`)
  após cada merge que queira aparecer no link curto.
- **Aba 500 Receitas Low Carb** (04/11/2026): 500 receitas em 13 subcategorias, em
  `receitas/data/recipes_500lowcarb.json`, com 66 fotos do livro em `images/livro500/`.
  Tudo sai do PDF (`D:/PDFs/500 Receitas Low Carb-1_1.pdf`, 308 páginas) pelo script
  `tools/7_rebuild_500lowcarb.js`. A foto da Farinha de Frango foi enviada pelo Montgomery e
  o script nunca a sobrescreve.
- **Reconstrução do 500 Low Carb** (04/11/2026): a primeira extração tinha defeitos, corrigidos
  de uma vez comparando cada receita com o PDF: 393 títulos com pedaços de ingrediente colados,
  394 listas de ingredientes com linhas cortadas ou perdidas (o Cabrito no Leite de Coco tinha
  7 de 13), 281 preparos corrigidos (274 com lixo como "8 RENDIMENTO"), 8 fotos na receita errada, cor lavada
  em todas as fotos, a receita Trufa de Morango faltando e a busca olhando só o título.
- **Corte das fotos em faixa do 500 Low Carb** (04/11/2026): as fotos do livro são faixas largas
  (1024x290). No card elas ficam em 4:3 com o foco no prato (campo `photoFocus`, tabela conferida
  a olho no script; o corte automático por atenção do sharp errava o prato). No detalhe aparecem
  inteiras, sem corte.
- **Upload de foto por receita** (04/11/2026): botão câmera no detalhe de cada receita;
  função serverless `receitas/api/upload-photo.js` faz PUT da imagem no GitHub e atualiza o
  JSON — sem precisar da Claude para adicionar foto. Funciona para `recipes.json` e
  `recipes_500lowcarb.json`. Token em variável de ambiente `GITHUB_TOKEN` no Vercel
  (server-side, nunca exposto no cliente).
- **Fotos corrigidas — bolos sem glúten** (04/11/2026): bolo-cremoso-de-mandioca (pág. 7),
  bolo-salgado (pág. 24) e bolo-castella-de-limao (pág. 38) extraídos do PDF
  `Bolos Sem Glúten.pdf`. Os três estavam com fotos antigas do commit anterior.
- Correção manual de fotos em todas as categorias — CONCLUÍDA (04/11/2026).
  - veganas: 10 fotos trocadas (incluindo rotação de Cubos de Arroz Recheado)
  - bolachas: 4 fotos trocadas
  - doces: 5 fotos trocadas
  - lowcarb: 82/82 com foto; 39 campos vazios corrigidos; bug de ID duplicado resolvido
  - trancados: 10/10 com foto; aba Técnicas de Tranças adicionada
  - fermentacao: 4/4 com foto; aba renomeada; banner com link pro PDF do guia
  - pães, massas, panetone: confirmados corretos, não tocados
- **Varredura de texto sujo — CONCLUÍDA (29/10/2026)**: varredura completa nas 407 receitas.
  Corrigidos: texto de fechamento de livro (Alfajor, Cueca Virada II, Ciabatta), conteúdo
  errado (Bolinha de Queijo lowcarb tinha outra receita; Bolo de Cenoura bolos tinha Maracujá),
  ingredientes faltantes em 9 receitas (Quiche lowcarb, Bolo de Fubá, Bolo de Coco, Chocotone,
  Panetone II, Mousse de Chocolate lowcarb, Bolo de Maçã, Bolo de Chocolate). Fragmentos de
  passos quebrados na quebra de página fundidos em 270+ receitas. Resultado final: 0 receitas
  sem ingredientes, 0 texto de livro nos passos.

## próximo

### Fotos da web para as 434 receitas sem foto (decisão pendente)

Teste de 04/11/2026 com 24 receitas escolhidas à mão, misturando fáceis e difíceis, só com licença
livre (Openverse e Wikimedia Commons): 11 com foto boa, 5 aceitáveis e 8 sem nada útil. Funciona em
pratos universais e falha nos brasileiros ou muito específicos (Beijinho, Chuchu, Jiló). Sites de
receita ficam de fora: as fotos têm dono e o app está em link público. As licenças CC BY e CC BY-SA
exigem crédito na tela. O Openverse limita consultas anônimas, então a busca completa é demorada.

Todos os PDFs da Chef Carla Ramos foram processados (312 receitas no ar). PDFs restantes
que ainda precisam de análise:

- `f17328128_Chef_Carla_Ramos_Substitui_o_Ingredientes.pdf` — pode ser referência/tabela, não receitas
- `f17026560_Chef_Carla_Ramos_Introdu_o.pdf` — provavelmente texto introdutório, não receitas
- `f17050624_Aplicativo_Chef_Carla_Ramos.pdf` — manual do app da Chef, não receitas

E ele disse que tem **muitos outros livros/PDFs de receita fora desses** que também quer
colocar no app, aos poucos. Cada PDF novo vira uma categoria nova (igual "veganas").

### Como processar um PDF novo (receita da técnica usada)

Scripts prontos em `tools/` neste mesmo projeto (rodar com Node a partir da pasta `tools/`,
depois de `npm install` ali dentro uma vez):

1. **Extrair o texto**
   ```
   pdftotext -layout "caminho/do/livro.pdf" raw.txt
   iconv -f CP1252 -t UTF-8//IGNORE raw.txt > livro_utf8.txt
   ```
   (o texto normalmente sai em CP1252, não UTF-8 — por isso o iconv)

2. **Olhar o SUMÁRIO** no `livro_utf8.txt` pra saber quantas receitas esperar e as páginas
   impressas de cada uma.

3. **Parsear as receitas** — `tools/1_parse_recipes.js livro_utf8.txt saida.json`
   - Funciona pra receitas com "ingredientes" + "modo de preparo".
   - Se o livro tiver uma seção sem "modo de preparo" (tipo os Mix de Farinhas), adaptar
     `tools/1b_parse_sem_modo_preparo.js`.
   - **Ponto de atenção já resolvido antes**: quando o rodapé "Pag. | NN" vem colado na
     mesma linha do título (em vez de sozinho), tem que ancorar a busca de página pela
     linha do TÍTULO, não pela linha "ingredientes" — senão pula o marcador e erra a página.

### Como evitamos texto que não pertence à receita (rodapé grudado no meio do passo)

Cada página do livro tem um rodapé repetido ("Chef Carla Ramos" + "Pag. | NN") que o
`pdftotext` extrai junto com o texto normal, muitas vezes bem no meio de um ingrediente ou
passo que atravessa a quebra de página. O `tools/1_parse_recipes.js` filtra isso em duas
camadas:

- `isFooterLine(linha)`: descarta a linha inteira se ela for só o rodapé (regex pra
  `"Chef Carla Ramos"` sozinho, `"Pag. | NN"` sozinho, ou os dois grudados na mesma linha).
- `stripFooterFragment(linha)`: quando o rodapé vem GRUDADO no fim de uma linha de
  conteúdo de verdade (ex.: `"...até dourar.Chef Carla Ramos Pag. | 42"`), corta só o
  pedaço do rodapé e mantém o resto da frase.
- `mergeContinuations(...)`: depois de limpar o rodapé, uma frase que ficou cortada no
  meio (porque a quebra de página caiu ali) é colada de novo na linha anterior, usando uma
  heurística simples (a linha seguinte começa com minúscula/parêntese e não com número de
  passo nem marcador de lista).

**Isso reduz bastante o lixo, mas não é garantia de 100%** — variações que o regex não
previu (rodapé com espaçamento diferente, abreviação diferente, nota de rodapé que não é
"Chef Carla Ramos") passam direto. Foi assim que uma receita ficou com informação que não
era dela (achado pelo Montgomery) — daí a varredura automática da seção "vivo" ser
necessária como segunda camada de conferência, e não só confiar no parser.

4. **Conferir contra o sumário** — adaptar `tools/5_audit_vs_sumario_template.js` pro novo
   livro. Normalizar títulos (maiúsculo, sem acento, só alfanumérico) antes de comparar, e
   não se assustar com "FALTANDO" falso-positivo: título quebrado em duas linhas no sumário
   não bate no regex de pontinhos, mas a receita real geralmente está certa — confirmar
   olhando o parser, não o audit.

5. **Extrair as imagens embutidas**:
   - JPEG direto: `tools/2_extract_images_jpeg.js livro.pdf pasta_saida`
   - Imagens FlateDecode (não-JPEG, comprimidas): `tools/3_extract_images_flate.js livro.pdf pasta_saida`
   - Rodar os dois — cada PDF usa uma mistura diferente dos dois formatos.

6. **Achar o offset de página** (literal do PDF vs. página impressa):
   ```
   pdftotext -layout livro.pdf - | iconv -f CP1252 -t UTF-8//IGNORE > pagebreaks.txt
   ```
   Split por `\f` (form feed) pra ver os títulos por página literal do PDF, e comparar com
   a página impressa (do sumário) da mesma receita. A diferença costuma ser **constante**
   no livro inteiro (foi +7 nos Pães, +6 nas Veganas) — confirmar em uns 3-4 pontos
   diferentes do livro antes de confiar nela.

7. **Deduplicar fotos decorativas reaproveitadas**: calcular hash MD5 de cada imagem
   extraída — qualquer imagem que aparece mais de 1 vez é decorativa/reaproveitada
   (capa, fundo, enfeite), não é foto de receita de verdade. Excluir essas do matching.

8. **Montar o dataset final** — adaptar `tools/6_build_final_template.js`: pra cada
   receita, `página literal = página impressa + offset`; pega a imagem única (não
   duplicada) daquela página literal; **nunca** usar a imagem de uma página vizinha como
   fallback — isso já causou duas receitas diferentes mostrando a mesma foto (visto e
   corrigido nas Veganas). Se não achar imagem própria pra receita, deixa sem foto mesmo.

9. **Checar duplicata final**: depois de montar, rodar hash MD5 nas fotos finais de novo —
   nenhuma duas receitas diferentes podem ter a mesma foto.

10. **QA visual** — `tools/4_contact_sheet_qa.js` monta folhas de contato (grade de
    miniaturas com o título embaixo) pra olhar tudo de uma vez e confirmar que cada foto
    bate com o prato. Mais rápido e mais confiável que confiar cegamente no offset.

11. **Integrar no app**: copiar as fotos pra `receitas/images/<categoria>/`, adicionar a
    categoria em `CATEGORY_LABELS` no `index.html`, e mesclar o JSON novo dentro de
    `data/recipes.json` (concatenar a lista — o `search` de cada receita é gerado sozinho
    em runtime, não precisa calcular).

12. **Testar no preview** (`vercel`/`npx serve`) antes de subir: abrir uma receita da
    categoria nova, testar a busca, conferir que a foto bate.

13. **Subir**: `git add` + commit + push no branch de trabalho; merge pro `main`; a Vercel
    detecta o push e faz deploy automático. Depois do deploy, **sempre reatribuir o alias
    curto** (`montgomery-receitas.vercel.app`) porque o alias não segue sozinho:
    ```
    vercel alias set <url-do-deployment-novo> montgomery-receitas.vercel.app
    ```
    (ou usar a ferramenta MCP da Vercel `assign_alias` com o `id` do deployment)
    Para pegar a URL do deployment mais recente: MCP `list_deployments` no projeto `receitas`.

### Coisas que já travaram antes (pra não perder tempo de novo)

- **PDF diagramado: ancorar pela fonte, não por palavra solta.** No 500 Low Carb o título é a
  fonte 28, os rótulos são a 22 e o corpo é a 20, com uma receita por coluna. Procurar "a página
  que contém as palavras do título" acerta a maioria e erra em silêncio: "Frango ao Alho" pegou
  a foto da Coxinha porque aquela página citava frango e alho.
- **Foto CMYK em PDF: inverter os canais antes do perfil de cor.** O `.negate()` do sharp roda
  depois da conversão para sRGB e deixa a foto pálida, sem parecer erro. O certo é ler o CMYK
  cru, inverter e aplicar o perfil ICC do próprio PDF (ver `imageToJpeg` no script).
- **Conferir contra a fonte antes de confiar no JSON**: comparar ingredientes e preparo com o
  PDF, palavra por palavra, e olhar as fotos ao lado dos títulos numa folha de contato.
- **O campo `search` no JSON desliga a busca completa**: o app só monta a busca em título,
  ingredientes e preparo quando esse campo não existe.

- **Push pro branch feature** e **`vercel --prod --yes`** às vezes são bloqueados
  automaticamente pelo classificador do Claude Code (mesmo não sendo pro `main`). Quando
  isso acontece, rodar o mesmo comando direto no terminal do Montgomery resolve.
- **Projeto novo da Vercel sai com "Vercel Authentication" (SSO) ligada por padrão** —
  sempre desligar em Project Settings → Deployment Protection, senão o link exige login.
- `vercel --prod --yes` rodado de dentro da pasta errada (raiz do worktree em vez de
  `receitas/`) cria um projeto novo, não atualiza o certo — sempre rodar de dentro de
  `receitas/`.
- PowerShell do Montgomery não aceita `&&` como separador de comando — mandar os comandos
  em linhas separadas (ou usar `;`), nunca `cmd1 && cmd2`.

## tom

Ele percebeu rápido quando uma foto não batia (reparou diferenças sutis entre receitas
parecidas) e insistiu até a gente achar a causa raiz de verdade (o offset de +7/+6
páginas) em vez de aceitar uma correção remendada. Preferiu sempre "sem foto" a "foto
errada" quando não dava pra confirmar — essa é a régua pra manter daqui pra frente.
