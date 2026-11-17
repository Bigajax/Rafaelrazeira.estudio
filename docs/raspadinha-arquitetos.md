# Raspadinha da palestra

Decisão do Rafael em 17/11/2026: todos escaneiam o mesmo QR code. Um participante ganha o site, dois recebem 50% de desconto e os demais recebem R$ 300 de desconto. Cada pessoa recebe um único benefício, sem acúmulo.

| Benefício | Quantidade | Valor final do site |
|---|---:|---:|
| Site de presente | 1 | R$ 0,00 |
| Cupom de 50% | Até 2 | R$ 749,50 |
| Cupom de R$ 300 | Demais participantes | R$ 1.199,00 |

Os valores ficam congelados para esta campanha, com preço original de R$ 1.499,00. Com menos de três inscritos, distribuem-se somente os benefícios possíveis: um site e até dois cupons de 50%. Não foi fixado prazo de validade nesta decisão; a aplicação não inventa uma data de expiração.

## Experiência

- `/arquitetos/raspadinha`: demonstração interativa, sem banco, com os resultados **Site de presente**, **50% de desconto** e **R$ 300 de desconto**. Pode raspar e recomeçar livremente; nenhum código real é emitido nesta página.
- `/arquitetos/raspadinha/participar`: página do QR público. Inscrição com nome e WhatsApp, espera pelo sorteio e revelação no próprio bilhete.
- `/crm/raspadinha`: abre inscrições, mostra/baixa o QR, lista participantes, encerra inscrições e distribui os três benefícios. Mostra separadamente os cupons de 50%, permite registrar a entrega do site e o uso dos cupons após aplicar o desconto à contratação.

O sorteio acontece ao comando do Rafael no painel, entre as inscrições já confirmadas. O bilhete só fica disponível para raspar depois desse comando. Não existe contagem regressiva nem liberação por tempo: o Rafael anuncia o momento na palestra. A tela de espera explica que a pessoa pode continuar assistindo e voltar pelo mesmo QR no navegador da inscrição.

Enquanto estiver visível, a página consulta o resultado em intervalos variados entre 8 e 12 segundos, contados após cada resposta, para espalhar as consultas de quem entrou ao mesmo tempo. Não há consultas automáticas simultâneas por página. A consulta tem limite de 15 segundos e tenta novamente em caso de falha. Ao voltar à aba, focar a janela ou recuperar a conexão, consulta imediatamente; também oferece atualização manual. Ao receber o resultado, encerra as consultas e libera a raspagem. O atraso normal é de até cerca de 12 segundos mais o tempo de rede; aba fechada não recebe notificação. Essa atualização não anuncia publicamente nome ou telefone do ganhador.

Não há limite de 100 participantes na distribuição. Com 300 inscrições confirmadas, são 1 site, 2 cupons de 50% e 297 cupons de R$ 300, sem benefícios vazios ou duplicados. A quantidade de prêmios principais não aumenta com o público. O teste local cobre até 300 inscrições; isso valida a distribuição, não mede a capacidade da hospedagem para 300 acessos simultâneos.

O site de presente segue a oferta atual: até oito projetos com páginas próprias, escritório e processo, contato com briefing no WhatsApp, versão para celular, preparação para Google e publicação. O ganhador fornece fotos e textos; domínio e fotografia ficam por conta do escritório. A criação tem valor de referência de R$ 1.499,00 e não gera cobrança ao ganhador.

Após o sorteio, cada participante recebe seu próprio código. O ganhador do site combina a entrega pelo WhatsApp; quem recebe desconto vê o valor original, o preço final e **Usar meu cupom**, que abre uma mensagem com nome, código e preço. O desconto é aplicado ao combinar a contratação, sem integração automática ao checkout. O uso é registrado pelo Rafael no CRM; depois disso a consulta mostra que o cupom foi utilizado.

Correção do Rafael em 17/11/2026: a conquista acontece **dentro do próprio bilhete**, sem substituir a página nem retirar o cartão. Depois da raspagem, a mesma área revela **“É seu!”**, **“Você ganhou um site!”**, o valor de R$ 1.499 em criação e o botão **Quero começar meu site**. O nome não aparece na mensagem de conquista. Selo, código e botão permanecem dentro do cartão. O botão abre o WhatsApp com o nome completo e o código do ganhador. Quando a entrega já está registrada, o bilhete informa esse estado. Não há apresentação de portfólio nem rolagem automática para outra composição.

A conquista tem uma chuva breve de confetes em papel, oliva e dourado, contida nos limites do bilhete. O cupom de 50% recebe uma celebração menor, também dentro do cartão; o de R$ 300 mantém a revelação breve. A opção de movimento reduzido remove animações e confetes. O foco vai para o título do prêmio dentro da área raspada, sem deslocar a página; o próximo Tab alcança o botão principal.

Os dois cupons também revelam toda a oferta dentro da mesma área raspada: “Você ganhou”, desconto em destaque, valor original riscado, preço final e botão **Usar meu cupom**. O de 50% recebe impressão mais clara e destaque maior; o de R$ 300 mantém o mesmo acabamento. Código individual e aviso de cupom utilizado permanecem dentro do bilhete. Nenhum nome aparece no resultado e a página não é substituída ao revelar.

Todos os resultados têm **Salvar meu cupom** (ou **Salvar meu prêmio**) e **Copiar código**, dentro do bilhete. O download gera um PNG de 1080 × 1350 px no próprio navegador, com identidade do estúdio, benefício, valores, código individual e condições. Não inclui o nome nem envia dados a um serviço de imagens. O arquivo registra o estado na hora de salvar; a validação e o uso único continuam no CRM. Cupons utilizados e sites entregues são identificados na imagem. Se copiar for bloqueado pelo navegador, a mensagem orienta selecionar o código visível.

Na prévia, há apenas **Salvar prévia**: a imagem diz **Prévia sem validade**, não contém código real e não pode ser resgatada. Não existe botão para copiar um código fictício. A pessoa pode guardar a imagem ou enviar pelo WhatsApp ao combinar a contratação; isso não registra automaticamente o uso. A consulta posterior continua pelo cookie no navegador original; perder esse cookie exige atendimento, sem recuperação pública apenas pelo telefone.

Na prévia, o bilhete usa a mensagem **“É seu!”**, sem nome e sem campo de personalização. O botão do site abre a página do serviço; não envia uma mensagem afirmando que a pessoa ganhou. Trocar de benefício ou recomeçar cancela animações pendentes.

## Ativar

1. Aplicar `supabase/sorteio-arquitetos.sql` e depois `supabase/sorteio-arquitetos-cupons.sql` no SQL Editor do mesmo projeto do CRM. Se o primeiro já foi aplicado, basta a migração dos cupons. São reaplicáveis e não reiniciam os resultados. Em reaplicações, o SQL dos cupons deve vir por último.
2. Conferir as variáveis já existentes: `SUPABASE_URL` (ou `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`, `CRM_OWNER_ID`, e as duas variáveis públicas de autenticação do Supabase usadas pelo CRM.
3. Publicar no deploy Next.js habitual do estúdio. O QR aponta para `SITE` em `lib/idiomas.ts`, seguido de `/arquitetos/raspadinha/participar`.
4. Entrar como dono em `/crm/raspadinha` e **Abrir inscrições e gerar QR code**.
5. Apresentar o QR a todos. Depois dos cadastros, atualizar a lista, clicar **Sortear site e cupons** e confirmar o encerramento.
6. Todos os inscritos abrem seus bilhetes e consultam o próprio código e benefício. Os dados dos demais não são divulgados na página pública.
7. Ao aplicar um desconto à contratação, usar **Registrar uso** na linha do participante e confirmar. Essa ação é definitiva. A entrega do site sorteado tem registro separado.

Se o site já tiver sido sorteado antes da migração de cupons, o painel oferece **Concluir distribuição dos cupons**. O comando preserva o ganhador e o horário originais e sorteia os dois cupons especiais entre os demais, concedendo R$ 300 aos restantes. A migração sozinha não distribui benefícios nem executa um sorteio.

## Garantias

Uma inscrição por WhatsApp e por recibo do navegador, com duas restrições de unicidade no Postgres. O recibo é um segredo aleatório de 256 bits em cookie HttpOnly, SameSite=Strict, restrito à API; somente seu hash é armazenado no banco. Apagar cookies ou trocar de navegador exige atendimento pelo Rafael, sem revelar dados só por informar um telefone.

Inscrever e sortear bloqueiam a mesma linha da campanha com `FOR UPDATE`: inscrições confirmadas depois do encerramento são recusadas. O sorteio usa UUIDs v4 novos, gerados criptograficamente pelo Postgres, para escolher o ganhador do site e duas outras pessoas. Todos os benefícios são atribuídos na mesma transação. Repetir o comando mantém a distribuição inteira.

Um índice único permite somente um site por campanha. Dois lugares exclusivos, numerados 1 e 2, limitam os cupons de 50%; cada participante tem apenas uma coluna de benefício. Preço e desconto são colunas geradas pelo Postgres, impedindo enviar outro valor pelo navegador ou gravar um preço manual. O banco impede trocar benefícios, transferir uma inscrição, reiniciar o sorteio, desfazer o uso de um cupom ou desfazer uma entrega. O registro de uso faz `UPDATE ... WHERE utilizado_em IS NULL`: tentativas simultâneas só registram uma utilização.

RLS limita a leitura ao dono, e todas as funções de escrita são revogadas para anon/authenticated e liberadas somente à chave de serviço. A API pública entrega apenas a situação do próprio recibo; telefone e dados dos demais nunca saem para o participante. Nome, telefone, código e horários ficam no CRM protegido. Não há envio automático de mensagens nem eventos de publicidade.

As rotas antigas por token, o SQL `raspadinha-arquitetos.sql` e seus testes permanecem isolados para preservar eventuais links da primeira versão de 50%. O novo painel e o QR público usam exclusivamente a campanha `bloco-arquitetura-site-2026`.

## Direção de design

Referência vista no navegador: [Herbar’s Scratch Cards](https://br.pinterest.com/pin/895231232162605785/). A fotografia serve só de referência, não é publicada como asset do estúdio.

O elemento central é o bilhete impresso: moldura branca serrilhada, miolo oliva, marca em branco, faixas laterais e cobertura de prata com textura. Duas folhas atrás dão espessura; o cartão que recebe o gesto permanece sem rotação para a raspagem acompanhar o dedo com precisão.

Tokens: papel `#F4F3EF`, oliva `#625222`, tinta `#272D25`, prata `#BFC1BD` e branco `#FFFEFB`. Instrument Sans na interface mantém o vínculo com a página de arquitetos; Georgia aparece na impressão do bilhete e no prêmio. A faixa prateada ocupa o centro, a mensagem explica o próximo gesto e os detalhes do site ficam em uma seção expansível.

```text
Computador                         Celular
marca                  evento      marca        evento
mensagem        pilha de bilhetes   mensagem
próxima ação    faixa para raspar   pilha de bilhetes
                                   faixa para raspar
prévia e troca de resultado         prévia e troca de resultado
```

O plano inicial de cartão translúcido sobre fotografia foi substituído pelo bilhete: a referência pede papel e impressão. Só o bilhete e a resposta ao gesto recebem movimento, com alternativas por botão/teclado e `prefers-reduced-motion` respeitado. A skill oficial está em `.agents/skills/frontend-design`, instalada de `anthropics/skills`.

A raspagem usa pixels visíveis e considera a densidade da tela: o traço do dedo tem 60 px, o do mouse 44 px, com borda irregular de prata e interpolação para movimentos rápidos não deixarem buracos. A faixa tem pelo menos 156 px de altura, prata acetinada com linhas finas, moldura interna e uma moeda impressa junto a “Raspe para descobrir”. Sob a cobertura, a impressão traz “Você ganhou”, o benefício em destaque e a legenda.

Pontos do gesto são desenhados por quadro; uma grade de cobertura acompanha o progresso sem ler os pixels da tela durante a interação. A revelação fica pronta ao apagar 40% da área inteira, ou ao apagar 72% da região central e pelo menos 24% da área inteira. Assim, a mensagem descoberta no centro não obriga raspar as bordas, e um toque isolado não basta. Ao atingir esse ponto, a indicação muda para “Solte para revelar”. Só depois de soltar a cobertura desaparece em 240 ms e a mensagem completa do prêmio é exibida, evitando mover a página durante o gesto. Redimensionar preserva o que já foi raspado, e interromper um toque não confirma uma revelação. Não há barra de progresso.

## Verificar

Instalar a dependência de QA, se faltar: `npm install --prefix .tmp/raspadinha-qa --no-package-lock --no-save @electric-sql/pglite`.

- `node scripts/teste-sorteio-arquitetos.cjs`: migração, inscrições concorrentes, sorteio único, privilégios, resultado e API, em Postgres local sem acessar produção.
- `node scripts/teste-cupons-ui.cjs`: três resultados em 320/390/1440 px, preservação do cartão e da área raspada, oferta/CTA/código dentro do bilhete, foco e teclado, valores e mensagens do WhatsApp, prévia sem emissão real e cupom utilizado. Requer localhost; `QA_BASE_URL` permite outro endereço local.
- `node scripts/teste-salvar-bilhete.cjs`: download real dos PNGs e conferência de tamanho/conteúdo, código copiado e permissão bloqueada, prévia sem validade, cupom utilizado, espera até o sorteio, liberação automática, pausa em aba oculta e reconexão. API simulada, sem acessar produção. Os intervalos são acelerados somente no navegador de teste.
- `node scripts/teste-conquista-ui.cjs`: conquista no bilhete em 320/390/768/1440 px, preservação do mesmo cartão e área raspada, nome/CTA/código dentro do cartão, confetes contidos, foco/teclado e movimento reduzido. Usa a prévia e uma resposta simulada da API, sem emitir prêmios reais.
- `node scripts/teste-raspadinha.cjs`: compatibilidade do fluxo legado de 50%.
- Conferência TypeScript e build Next.js.
- `node scripts/teste-raspagem.cjs`: gesto real de toque, mouse rápido, precisão em tela de alta densidade, revelação ao soltar, mudança de orientação, gesto interrompido e alternativa por teclado. Requer localhost em execução; `QA_BASE_URL` permite outro endereço local.
- Conferência de navegador em 320, 390, 768 e 1440 px, incluindo gesto de raspar, toque, teclado, reinício, cupom demonstrativo, inscrição, espera, resultado e erro de conexão.
