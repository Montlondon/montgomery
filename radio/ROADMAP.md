# Roadmap — Montgomery Rádio

Itens pendentes/planejados. Quando um item for concluído, mover para o
[ROADMAP_CONCLUIDO.md](ROADMAP_CONCLUIDO.md) com a data.

## Antes de comercializar / compartilhar com outras pessoas
- [ ] **Favoritos por visitante** — hoje a sincronização na nuvem usa um
      registro único (`id: 'montgomery'`) pra todo mundo que abrir o site.
      Precisa virar "um registro por pessoa/aparelho" antes de qualquer
      pessoa de fora usar o app, senão os favoritos se misturam.
- [ ] Analisar o que a chave pública do Supabase permite fazer, caso o
      código seja copiado por outra pessoa (hoje é só escrita, impacto
      baixo, mas vale revisar antes de crescer).

## Conteúdo
- [ ] Mais territórios — engordar as capitais que vieram com poucas
      rádios (Porto Velho, Macapá, Rio Branco, São Luís, Boa Vista,
      Palmas) e avaliar adicionar outros países/continentes com mais
      detalhe (hoje é nível "país" via Natural Earth 110m).
- [ ] Revisar os tags dos estilos musicais brasileiros semeados
      (Rock Nacional só achou 2 rádios — vale um tag alternativo).

## Recursos novos
- [ ] Cartão de compartilhamento bonito (meta tags Open Graph — título,
      descrição, imagem do globo) pra quando o link for mandado no
      WhatsApp/Instagram.
- [ ] Temporizador pra dormir ("desligar em 30/60 min").
- [ ] Recuperar/trocar a senha do cadeado pelo próprio app.
- [ ] Painel simples só pra você ver as métricas de uso (visitas e
      rádios tocadas) sem precisar pedir pra consultar via SQL.

## Ideias em aberto (sem compromisso ainda)
- [ ] Avaliar monetização (anúncio discreto, assinatura pra recursos
      extras) depois que houver uso real medido.
