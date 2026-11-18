# Conferência da prévia

Realizada em 18/11/2026 no Chrome local, usando a página servida em http://localhost:4318/.

- Larguras de 320, 390, 768, 1440 e 1920 pixels: resposta HTTP 200, fontes e fotografias carregadas, sem rolagem horizontal.
- Galerias: cinco fotos da Casa Ville, três do estúdio e três renders. Conferidos carregamento, contagem, identificação de render, avanço pelo teclado, fechamento com Escape e liberação da rolagem.
- Celular: menu abre e fecha ao navegar, serviços expandem, galeria cabe na largura da tela.
- Contato: link usa o WhatsApp (44) 99991-3481, confirmado pelo usuário. Não foi enviada mensagem.
- Movimento reduzido: a rolagem suave é desativada quando essa preferência está ativa.
- Créditos e apresentação: disponíveis e sem transbordamento horizontal no celular.
- Manifesto: 12 imagens com página de origem, URL pública do arquivo e crédito.
- Nenhuma resposta HTTP com erro ou erro JavaScript observado na conferência final.

Foram 139 verificações automatizadas aprovadas na versão atual. Foram conferidos a abertura e seus três ambientes, os arquivos de maior resolução, as miniaturas, legendas, os orçamentos por projeto e a ampliação da fotografia clicada. O gesto de deslizar foi exercitado pelo Chrome com eventos de toque: o movimento horizontal avançou a foto, e o vertical preservou a seleção. As capturas de desktop e celular foram examinadas visualmente. A leitura entre 320 e 1920 pixels permanece sem transbordamento horizontal.

Foi incorporada uma versão pública da área social da Casa Ville de 2048 × 1366 pixels, encontrada no carregamento normal da matéria Club&Casa. A consulta ao Instagram não encontrou versões maiores para o estúdio e a cozinha. Os originais pendentes e a bio preparada para validação da Paula estão relacionados em `MATERIAIS-PAULA.md`.

Evidências locais em `verificacao/resultado.json` e capturas em `verificacao/`. Para repetir: `node verificar.mjs` com o servidor local ativo e o Chrome instalado no caminho indicado no script.

Esta conferência não equivale a homologação em aparelhos físicos ou navegadores diferentes. O Instagram foi parcialmente acessível; os limites da pesquisa estão descritos em `dist/apresentacao.html`. Não houve publicação em produção.

A chamada de orçamento foi conferida em desktop e celular: os oito botões abrem o formulário. Foram verificados campos obrigatórios, rejeição de nome composto apenas por espaços, mensagem com os dados preenchidos, manutenção e limpeza do projeto de referência, foco inicial, ciclo de Tab, Escape, retorno do foco e preservação da galeria ao fechar o formulário sobreposto. A ação de continuar foi interceptada durante o teste, sem abrir o WhatsApp nem enviar mensagens. O destino e a mensagem preparados foram inspecionados.

A revisão de coesão agrupa fotos, textos e ações por projeto e uniformiza a largura do conteúdo, as colunas e os intervalos. As capturas de 1440 e 390 pixels foram examinadas: quadros de projetos íntegros, recortes legíveis e contato agrupado. O retorno do foco ao menu móvel é conferido após a conclusão do evento de fechamento do modal.
