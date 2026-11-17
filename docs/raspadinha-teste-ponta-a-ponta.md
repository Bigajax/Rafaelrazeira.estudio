# Teste da raspadinha — 17/11/2026

Resultado: os cenários abaixo passaram. A aplicação publicada foi consultada sem criar participantes, sortear benefícios ou alterar cupons reais.

## Fluxo integrado

`scripts/teste-raspadinha-e2e.cjs` abre navegadores separados e um servidor Next real. Os formulários, APIs e ações do painel são os da aplicação; as migrações SQL executam em PostgreSQL local com PGlite. O serviço de autenticação e a interface HTTP do Supabase são simulados localmente, com credenciais fictícias.

- Acesso anônimo redireciona ao login; login de teste cria a sessão do administrador.
- O botão do painel abre inscrições e apresenta o QR.
- Seis navegadores cadastram nome/WhatsApp pela interface; o painel mostra seis participantes.
- Recarregar a página reconhece a inscrição pelo recibo do navegador.
- Confirmar o sorteio no painel distribui um site, dois cupons de 50% e três cupons de R$ 300, com seis códigos distintos.
- A consulta automática libera a raspagem; gestos de toque revelam o prêmio no bilhete. Cada participante vê seu próprio código e link de atendimento.
- Registrar uso no painel atualiza o bilhete; o cupom utilizado perde a ação de resgate.
- Um visitante sem inscrição vê o encerramento e nenhum código privado. Recarregar o painel preserva o vencedor.

Evidências locais: `.tmp/raspadinha-e2e-resultado.json` e `.tmp/raspadinha-e2e-painel.webp`. Contêm somente dados fictícios.

## Verificações complementares

| Teste | Resultado verificado |
| --- | --- |
| `teste-sorteio-arquitetos.cjs` | Distribuição com 1, 2, 3, 7, 100 e 300 participantes; 12 inscrições concorrentes; unicidade de WhatsApp; isolamento por proprietário; sorteios repetidos preservam vencedor; uso único e benefícios imutáveis. |
| `teste-inscricao-raspadinha.cjs` | Resposta perdida após salvar recupera a inscrição; falha antes de salvar mantém campos e permite tentar novamente; inscrição encerrada não expõe códigos. Executado contra o frontend publicado, com a API interceptada para simular falhas. |
| `teste-salvar-bilhete.cjs` | Downloads PNG reais de prévia e benefícios; valores/código corretos; cópia e permissão negada; cupom usado; consulta após reconexão e suspensão da consulta em aba oculta. |
| `teste-cupons-ui.cjs` | Três benefícios, preços e links próprios; prévia não emite cupom; visitante externo sem código. |
| `teste-raspagem.cjs` | Toque e mouse, gesto interrompido, mudança de tamanho, revelação ao soltar, teclado e preferência de movimento reduzido. |
| `teste-visual-raspadinha.cjs` | Header compartilhado, verde da marca, CTA rosa, animação contínua e estados em larguras de 320, 390, 768 e 1440 px. |

## Site e impressos publicados

- Prévia e participação respondem com HTTP 200. API pública consultada com sucesso; estado observado: `inscricoes-abertas`.
- `/crm/raspadinha` exige autenticação.
- Prévia publicada em 390 px: revelação dentro do bilhete, preço de R$ 749,50 no cupom de 50%, ação de salvar e ausência de rolagem horizontal.
- QR com monograma decodificado em 220, 350, 700 e 1600 px; destino exato: `https://rafaelrazeira.com.br/arquitetos/raspadinha/participar`.
- PDFs A5 e A4 disponíveis com HTTP 200, uma página, dimensões corretas dentro do arredondamento do renderizador. Hash dos arquivos publicados igual ao dos arquivos locais.
- O retorno do Supabase confirmou a redefinição de senha feita pelo formulário privado local. A nova senha não foi coletada nem usada por este teste.

## Limites

A prova integrada usa autenticação simulada e PostgreSQL local: não executa sorteio de teste no banco publicado e não valida o login com a senha real recém-definida. O caso de 300 verifica a distribuição dos benefícios, sem simular 300 celulares simultâneos. A leitura do QR foi digital; impressão e câmera física não foram testadas. A recuperação automática da inscrição continua dependendo do mesmo navegador e dos cookies preservados.

## Ajustes visuais e ações do bilhete

Validação complementar após as mudanças de design:

- Prêmio principal no título, área central maior no celular, laterais ocultas em telas pequenas e convite à landing page destacado após a revelação.
- Prata neutra com orientação de gesto; raspagem preservada durante redimensionamento e conclusão somente após soltar o toque ou mouse.
- Confetes contidos no bilhete, com 120 peças no celular e 180 no desktop para o site; 40 e 60 para o cupom de 50%. O cupom de R$ 300 usa apenas um brilho de 450 ms.
- Confetes não interceptam cliques nos botões. Ativar movimento reduzido durante a celebração interrompe os efeitos, incluindo a expansão do cartão.
- Compartilhamento recebe um PNG de 1080 × 1350 com o código do próprio bilhete. O arquivo é preparado antes do toque; a chamada conserva a ativação do usuário.
- Cancelar o compartilhamento não dispara download. Falhas orientam a usar o botão de salvar; navegadores sem suporte ao compartilhamento de arquivos recebem o PNG por download.
- Cópia confirma “Código copiado ✓” no próprio botão por 2,5 segundos e volta ao rótulo original. Permissão negada oferece orientação sem confirmar sucesso.
- Botões conferidos em 320, 390, 768 e 1440 px. TypeScript e testes de raspagem, conquista, layout e salvamento passaram.

O compartilhamento nativo foi verificado com a API simulada no navegador, sem enviar imagens para terceiros. O download de PNG foi real; o menu do sistema em aparelho físico não foi testado.

## Reproduzir o fluxo integrado

Requer dependências do projeto e Chrome no caminho padrão do Windows (ou variável `QA_CHROME_PATH`). O script abre seu próprio Next em porta disponível; não requer localhost:3000. Usa `.tmp/raspadinha-next-e2e` para a compilação e encerra os processos que iniciou.

```powershell
npm install --prefix .tmp/raspadinha-qa --no-save --no-package-lock @electric-sql/pglite
node scripts/teste-raspadinha-e2e.cjs
```

Os testes complementares de navegador usam `http://localhost:3000` por padrão e aceitam `QA_BASE_URL`. Neles, a API da participação é interceptada; os dados de cadastro não são enviados ao banco real.
