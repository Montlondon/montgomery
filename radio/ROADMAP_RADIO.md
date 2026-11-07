# Roadmap â€” Montgomery RÃ¡dio

Itens pendentes/planejados. Quando um item for concluÃ­do, mover para o
[ROADMAP_RADIO_ARQUIVO.md](ROADMAP_RADIO_ARQUIVO.md) com a data.

## Deploy — comando correto
```
cd C:\mc\radio
vercel --prod --yes
vercel alias $(vercel --prod --yes 2>&1 | grep "Production  https://" | head -1 | grep -o "https://[^ ]*") radiomontgomery.vercel.app
```
URL oficial: https://radiomontgomery.vercel.app

## Antes de comercializar / compartilhar com outras pessoas
- [ ] **Favoritos por visitante** â€” hoje a sincronizaÃ§Ã£o na nuvem usa um
      registro Ãºnico (`id: 'montgomery'`) pra todo mundo que abrir o site.
      Precisa virar "um registro por pessoa/aparelho" antes de qualquer
      pessoa de fora usar o app, senÃ£o os favoritos se misturam.
- [ ] Analisar o que a chave pÃºblica do Supabase permite fazer, caso o
      cÃ³digo seja copiado por outra pessoa (hoje Ã© sÃ³ escrita, impacto
      baixo, mas vale revisar antes de crescer).

## ConteÃºdo
- [ ] Mais territÃ³rios â€” engordar as capitais que vieram com poucas
      rÃ¡dios (Porto Velho, MacapÃ¡, Rio Branco, SÃ£o LuÃ­s, Boa Vista,
      Palmas) e avaliar adicionar outros paÃ­ses/continentes com mais
      detalhe (hoje Ã© nÃ­vel "paÃ­s" via Natural Earth 110m).
- [ ] Revisar os tags dos estilos musicais brasileiros semeados
      (Rock Nacional sÃ³ achou 2 rÃ¡dios â€” vale um tag alternativo).

## Recursos novos
- [ ] CartÃ£o de compartilhamento bonito (meta tags Open Graph â€” tÃ­tulo,
      descriÃ§Ã£o, imagem do globo) pra quando o link for mandado no
      WhatsApp/Instagram.
- [ ] Temporizador pra dormir ("desligar em 30/60 min").
- [ ] Recuperar/trocar a senha do cadeado pelo prÃ³prio app.
- [ ] Painel simples sÃ³ pra vocÃª ver as mÃ©tricas de uso (visitas e
      rÃ¡dios tocadas) sem precisar pedir pra consultar via SQL.

## Ideias em aberto (sem compromisso ainda)
- [ ] Avaliar monetizaÃ§Ã£o (anÃºncio discreto, assinatura pra recursos
      extras) depois que houver uso real medido.
