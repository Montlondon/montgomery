# Roadmap concluído — Montgomery Rádio

Histórico do que já foi feito. Itens novos entram no topo.

## 2026-10-22
- Cápsula de categoria ao lado do coração (favoritar + categorizar numa
  ação só), nas rádios por cidade e na busca.
- Ícones do app (PWA) com cantos arredondados, combinando com o resto
  do sistema.
- 13 novas capitais estaduais do Brasil no globo (Rio Branco, Maceió,
  Macapá, Vitória, São Luís, Cuiabá, Campo Grande, João Pessoa, Natal,
  Porto Velho, Boa Vista, Aracaju, Palmas), via radio-browser.info —
  script `add_brazil_capitals.py` deixado no projeto pra repetir.
- Categorias automáticas por estilo musical brasileiro (Sertanejo,
  Forró, Pagode, Funk Brasil, Samba, MPB, Gospel, Axé, Rock Nacional,
  Reggae), semeadas nos favoritos na primeira visita.
- Fronteiras do mundo (177 países, Natural Earth 110m simplificado) e
  divisas dos 26 estados do Brasil + DF, desenháveis no globo (botão
  no cabeçalho) — scripts `simplify_states_geojson.py` e dados em
  `br-states.json` / `world-countries.json`.
- Media Session API — próxima/anterior funcionam pelos controles do
  carro, Bluetooth, Android Auto/CarPlay e tela de bloqueio.
- Reconexão automática do áudio (retry com backoff, watchdog de
  travamento, evento `online`) em vez de desistir no primeiro erro de
  rede.
- Painel "largo" (expandir) nas duas abas laterais, pra nome de rádio
  não cortar.
- Modo "só o globo" (tela cheia, esconde toda a interface) — ótimo
  pra deixar rodando numa segunda tela.
- Destaque de "tocando agora" sincronizado em todas as listas abertas
  (antes só atualizava no dock ao usar próxima/anterior).
- Microfone com reconhecimento de voz (PT/FR/EN, alternável) pra ditar
  rádio/cidade sem tirar a mão do volante.
- Reorganização final dos painéis: lupinha = busca de rádio + rádios
  favoritas; coração = abre direto a aba da cidade, com busca de
  cidade e cidades favoritas; os dois botões viraram toggle (um clique
  abre, outro fecha).
- Correção de nome de rádio duplicado no "tocando agora" (quando não
  havia cidade real).
- Dock reorganizado pra nunca mais esconder botão por falta de espaço
  (quebra de linha em vez de cortar/sumir).
- Métricas de uso simples (visitas e rádios tocadas) — tabela só de
  escrita no Supabase, sem leitura pública.
- v1.57 → v1.62.
