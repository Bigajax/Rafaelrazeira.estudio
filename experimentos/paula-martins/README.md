# Paula Martins Arquitetura — prévia local

Site estático independente. Não foi publicado ou integrado às rotas da aplicação principal.

## Visualizar

Nesta pasta, execute `npm run dev` e abra http://localhost:4318/.

- Site: http://localhost:4318/
- Apresentação, pesquisa e validações: http://localhost:4318/apresentacao.html
- Relação individual das 12 imagens: http://localhost:4318/creditos.html
- Registro de origem: [dist/imagens.json](dist/imagens.json)
- Conferência e evidências: [VERIFICACAO.md](VERIFICACAO.md)
- Diagnóstico e decisões da revisão visual: [REVISAO-DESIGN.md](REVISAO-DESIGN.md)
- Bio preparada para validação e relação dos originais a solicitar: [MATERIAIS-PAULA.md](MATERIAIS-PAULA.md)

A pasta `dist/` contém a prévia portátil, com todas as fotos e fontes locais. Pode ser servida por qualquer servidor HTTP estático. O `server.mjs` escuta apenas no endereço de loopback.

## Demonstração na Vercel

Reutilizar o projeto `paula-martins`, separado do site principal, com raiz em `experimentos/paula-martins`. O `vercel.json` define o preset Other, desativa instalação e build e serve a pasta `dist/`. Manter essas mesmas configurações no projeto da Vercel. Não é necessário executar o Next.js da raiz do repositório.

O projeto acompanha a branch `main`; seu domínio de demonstração é https://paula-martins.vercel.app/. O ambiente Production desse projeto separado continua sendo uma demonstração, sem vinculação ao site oficial da cliente. Os endereços exclusivos de deployment podem exigir autenticação da Vercel. No envio pela CLI, selecionar explicitamente o projeto `paula-martins` e a equipe `rafaels-projects-f3ef53c3`. Não reutilizar nem modificar a vinculação `.vercel` do projeto principal. A página mantém `noindex`, e o cabeçalho `X-Robots-Tag` reforça a instrução de não indexar. Antes de entregar, conferir que o domínio de demonstração abre sem exigir conta da Vercel.

### Correção do 404 em 18/11/2026

O deployment `dpl_3be2a4gXHmUMTCoXz2uJAB8J9Xm7`, do commit `882a90e`, estava READY e com aliases corretos, mas publicou uma saída vazia (`lambdas[0].output: []`). Os logs registraram a remoção de 1747 arquivos pelo `.vercelignore` e o aviso `Build output contains no "functions", "static", or "services" directory`.

O filtro global `*`, com exceções relativas apenas a `dist`, não preservou a prévia ao ser aplicado aos caminhos do repositório no deploy Git. Foi removido o `.vercelignore` restritivo; o limite de publicação continua sendo `outputDirectory: dist`, portanto pesquisa e código de apoio não viram arquivos públicos. O preset persistido no projeto também foi alinhado de Node para Other. Não reintroduzir esse filtro global para o deploy Git deste monorepositório.

Referência de configuração: [documentação oficial da Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Conteúdo e curadoria

Foram selecionadas cinco fotografias da Casa Ville, três do estúdio em Santa Fé, três renders de cozinha para área de lazer e um retrato da Paula. As galerias mantêm a separação por projeto, com miniaturas, legendas e navegação por deslize, botões ou teclado. Os renders aparecem identificados na capa e na ampliação. Nenhuma imagem de banco ou IA foi usada. A área social da Casa Ville recebeu uma versão pública de 2048 × 1366 pixels; estúdio e cozinha continuam dependendo dos originais da cliente para maior resolução.

A Casa Ville apresenta o pedido, as escolhas e os usos dos ambientes. Cada projeto reúne fotografia, descrição e ações em um único conjunto. A largura de conteúdo, os alinhamentos e os intervalos são compartilhados entre as seções. Cada projeto e cada galeria abrem o formulário com referência contextual. A bio foi preparada com conteúdo verificável e ainda depende da validação editorial da Paula.

A chamada principal é “Solicite um orçamento”, em destaque na abertura e disponível também no menu, nos projetos, nas galerias e no contato final. Os oito botões abrem um modal com nome, cidade/estado, serviço desejado e descrição do projeto. Os campos são obrigatórios e validados. “Continuar no WhatsApp” leva o resumo para revisão na conversa com Paula; o projeto de referência é mantido quando aplicável. O site não grava o formulário no servidor ou em armazenamento local. Os testes interceptam a continuação para não abrir conversas reais.

A bio pública do Instagram confirma os cinco serviços. O número 99991-3481 aparece na bio; a matéria Club&Casa confirma DDD 44 e o e-mail. O usuário confirmou nesta conversa que (44) 99991-3481 é o WhatsApp atual.

O acesso ao Instagram foi parcial: bio, grade, publicações e carrosséis abriram no navegador. Os destaques exigiram cadastro. Um Reel de evento foi aberto, sem avaliação integral ou extração de frames. Fontes e limites estão detalhados na apresentação. Não havia capturas anexadas disponíveis.

Não foi encontrado logo oficial verificável. A composição tipográfica do nome e a paleta são propostas. Confirmar uso das imagens, créditos definitivos, identidade, bio, escopo dos serviços, títulos dos projetos e processo. Os originais do estúdio e dos renders precisam de maior resolução para uma publicação futura.

O processo sugerido está somente na apresentação para validação. A interface usa temas para a conversa inicial e não afirma etapas ou prazos desconhecidos.

## Arquivos

- `dist/`: apresentação navegável e documentos de apoio.
- `pesquisa/`: evidências das páginas públicas, candidatas e capturas das referências; não é servido pelo servidor.
- `preparar.mjs`: curadoria, conversão de imagens e obtenção de fontes.
- `documentar.mjs`: gera as páginas de fontes e apresentação.
- `verificar.mjs`: conferência responsiva e funcional pelo Chrome local.

Pesquisa realizada em 18/11/2026. O material permanece como prévia local; direitos de publicação devem ser confirmados antes de colocá-lo em produção.
