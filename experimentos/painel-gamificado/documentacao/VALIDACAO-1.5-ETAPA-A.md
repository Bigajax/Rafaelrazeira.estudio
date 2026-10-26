# Performance 1.5 — kit da Etapa A

**Estúdio Rafael Razeira · 13/10/2026 · Sessões preparadas, ainda não realizadas**

Material para começar a validação da experiência atual. Testar se o lojista descobre uma necessidade, entende a evidência, realiza um cuidado, reconhece a confirmação e encontra o acompanhamento. A interface usada é a 1.4 A/B simulada.

## 1. Pergunta central da rodada

**O lojista consegue sair de uma recomendação e chegar a um cuidado registrado, entendendo o que mudou e o que ainda depende de acompanhamento?**

Não apresentar o produto primeiro. Observar a compreensão espontânea. A gamificação permanece no contexto, mas não é uma tarefa do teste nem um motivo para elogiar a pessoa.

## 2. Preparação prática

Formato escolhido por Rafael: sessões moderadas ao vivo. Cinco lojistas, familiaridade digital variada, sessões individuais de 25–35 minutos. Usar código P01–P05, sem identificar clientes na ficha. A pessoa responsável pela sessão observa a navegação e registra as falas; o assistente pode ajudar a organizar e interpretar os relatos fornecidos nesta conversa. Esta escolha não representa agendamento ou realização das sessões.

Preparar o protótipo no computador de teste. `http://localhost:3405` funciona na máquina em que o servidor está rodando; o endereço não abre o experimento no celular de outra pessoa. Para sessão remota, usar a máquina do moderador com compartilhamento combinado ou um ambiente de teste acessível e autorizado. Nenhuma publicação foi feita por este kit.

Usar um perfil de navegador exclusivo da pesquisa, preservando a sessão pessoal de Rafael. Entre participantes, reiniciar somente o cenário experimental. Conferir que dados fictícios, cenário e tarefa estão corretos antes de começar.

Ter a [ficha individual](FICHA-PILOTO-1.5.md) pronta, obter consentimento para a sessão e gravação quando houver, e testar acesso/áudio previamente. Não pedir credenciais ou registros reais de clientes nesta rodada.

## 3. Abertura neutra e tempo da sessão

Ler: “Estamos testando uma ferramenta para ajudar a cuidar de uma vitrine. Os produtos e números são fictícios. Imagine que esta é sua loja. Abra o sistema e me mostre o que faria primeiro. Queremos entender o que ficou claro e o que precisamos melhorar.”

Não explicar missões, níveis, critérios de amostra ou Intelligence. Não apontar a recomendação. Se houver silêncio, pedir apenas que a pessoa conte o que está pensando.

| Parte | Tempo de referência |
| --- | --- |
| Contexto, consentimento e acesso | 3 minutos |
| Descoberta e cuidado completo | 10 minutos |
| Caso de pouco tráfego | 6 minutos |
| Leitura do acompanhamento histórico | 6 minutos |
| Pergunta de utilidade e fechamento | 5 minutos |

Esses tempos organizam a sessão; não são limites para impedir a conclusão. Uma tarefa extra só entra se houver tempo, evitando apressar o caminho principal.

## 4. Tarefa principal: descoberta até acompanhamento

Preparação do moderador: abrir `http://localhost:3405/?cenario=procura-esgotado#inicio`. Confirmar que há uma decisão elegível. Usar esse cenário porque ele possui execução e observação vinculadas à mesma ocorrência.

Primeiro pedido: **“Imagine que esta é sua loja. Abra o sistema e me mostre o que faria primeiro.”** Depois que a pessoa indicar um cuidado, pedir: **“Faça o cuidado que escolheu e veja o que vem depois.”**

| Etapa | Observar sem ensinar |
| --- | --- |
| Descoberta | Reconhece a peça e o motivo da recomendação? |
| Entendimento | Distingue interesse observado de venda e considera a disponibilidade? |
| Ação | Encontra uma decisão permitida e registra justificativa? |
| Confirmação | Percebe o que foi salvo e distingue análise de entrada de estoque? |
| Acompanhamento | Encontra a observação e entende que ainda falta ação declarada ou dado posterior? |

Referência interna do moderador: o editor oferece decisão e nota; salvar confirma a análise e concede a recompensa existente uma vez. Em Evolução, a observação pede o próximo passo. Registrar encaminhamento é uma declaração sem alteração de estoque ou XP extra. Essa sequência não cria dados futuros de visita.

Não escolher a decisão pela pessoa. Não orientar a compra de estoque. Se ela optar por não agir, investigar o significado da escolha; não classificar automaticamente como falha. Registrar ajuda e ponto de interrupção quando não encontra uma ação ou navegação.

O cenário histórico com comparação é outra tarefa. Não carregar resultados históricos e apresentá-los como consequência da decisão que o participante acabou de registrar.

## 5. Tarefa de baixo tráfego

Preparação: `http://localhost:3405/?cenario=mapa-poucos-dados#inicio`. A peça sem foto possui 18 visitantes na fonte fictícia e um cuidado de apresentação acionável.

Pedido: **“Encontre e faça algo útil para cuidar desta loja.”** Observar identificação da foto ausente, chegada ao editor, escolha de imagem, salvamento e interpretação da confirmação.

Registrar se a ausência de comparação transmite inutilidade ou julgamento negativo. A amostra comparativa não é requisito para salvar a foto. O cenário não possui observação posterior dessa foto no estado atual; seu percurso termina na confirmação e no histórico. Se a pessoa esperar acompanhamento específico ali, registrar a expectativa como achado.

A ilustração de exemplo pode ser usada para concluir a tarefa fictícia. A descrição da operação permanece ilustrativa, sem inferir fidelidade de produto real.

## 6. Tarefa de acompanhamento histórico

Preparação: `http://localhost:3405/?cenario=acompanhamento-comercial#evolucao`. O cenário contém uma ação histórica e fonte posterior fictícia que pode ser carregada pelo controle existente.

Pedido: **“Veja o que aconteceu depois desta divulgação. O que estes números permitem dizer?”** Observar localização do acompanhamento, leitura das datas, denominadores e interpretação espontânea.

Se a pessoa não encontrar o controle de dados fictícios, registrar o obstáculo antes de ajudar. Quando houver comparação, pedir que explique com suas palavras. Só depois investigar se acredita que clique confirma venda ou que a ação causou a diferença.

Essa tarefa avalia a leitura de um período já preparado. Não representa duas semanas de uso observadas nesta sessão.

## 7. Lacunas existentes para testar separadamente

A inspeção local encontrou duas diferenças que precisam ficar visíveis no registro da pesquisa:

| Caminho | Estado atual | Como testar |
| --- | --- | --- |
| Interesse por tamanho no mapa-comercial | Destaque com 14 declarações; análise e vitrine, sem registro de decisão por esse sinal | Investigar expectativa e ponto em que falta a ação |
| Foto de pouco tráfego | Cuidado e confirmação disponíveis; sem observação vinculada no cenário | Investigar expectativa de acompanhamento |

Tarefa extra de interesse: abrir `?cenario=mapa-comercial#inicio` e pedir “Veja esta recomendação e tente tratar a situação”. Não mudar a pessoa para outro cenário e marcar a tarefa como concluída. Registrar exatamente até onde chegou.

Não remover critérios de evidência ou criar uma recompensa para completar o exemplo. A decisão de conectar esses caminhos deve se apoiar na pesquisa e em um contrato de necessidade elegível. Esses achados são de inspeção técnica; ainda não são observações de lojistas.

## 8. Pergunta de valor percebido

Depois da interpretação espontânea e antes de explicar o funcionamento, perguntar: **“Essa informação ajudou você a decidir o que fazer?”**

Oferecer as opções propostas:

- Sim, tomei uma decisão.
- Entendi, mas não preciso agir agora.
- Não foi útil.

Registrar também ausência de resposta. Em seguida perguntar o motivo, qual informação fez diferença e o que ainda falta. Aceitar uma explicação livre que não caiba bem nas opções e anotar a dificuldade de escolha.

“Não preciso agir agora” pode ser uma decisão útil. “Sim” não demonstra que a decisão foi correta, que gerou resultado ou que justifica uma assinatura. “Não foi útil” precisa de contexto: a pessoa já sabia, faltou dado, o produto não se aplica ou a orientação não ficou clara?

Começar nas entrevistas. Não inserir a pergunta como formulário permanente no painel nesta etapa. Não criar XP por responder nem transformar ausência de resposta em avaliação negativa.

Na análise interna, apresentar contagens por opção entre respostas válidas, separadas da quantidade de pessoas convidadas ou expostas. Deduplicar por participante e tarefa. Não somar as três categorias em uma nota única de utilidade; preservar frases e motivos.

## 9. Registro e critérios de decisão

Usar uma ficha por participante. Registrar tempo de entendimento a partir do momento em que a informação fica visível; primeiro clique, trocas de contexto, retorno necessário, ajuda, etapa alcançada e expectativa não atendida.

Metas preliminares: quatro de cinco explicam evidência e próximo passo em até um minuto, sem ajuda; quatro de cinco concluem o cuidado principal sem ajuda; nenhuma confusão crítica persistente. Escolher manter indisponível ou não agir agora pode ser válido; a execução correta é o registro da escolha elegível.

Confusões críticas: decisão tomada como reposição executada, consulta tomada como declaração, clique tomado como venda ou comparação tomada como prova de causa. Corrigir entendimento e repetir a tarefa afetada antes de ligar dados reais.

| Achado | Evidência/participante | Severidade | Ajuste | Tarefa a repetir |
| --- | --- | --- | --- | --- |
| A preencher | A preencher | A preencher | A preencher | A preencher |

Depois das cinco sessões, decidir entre corrigir e repetir, rever a relevância das regras ou preparar o piloto em leitura. Relatar casos e contagens; não alegar prova estatística. Disposição para pagar requer investigação própria.

## 10. Preparação da conferência de fontes na Etapa B

Usar uma loja de teste autorizada, sem precisar começar por inteligência mais sofisticada. Identificar seu catálogo, vínculo de usuário, coleta e tabelas implantadas. A inspeção do repositório não verificou migrações ou registros de produção.

| Conferência manual | Evidência a registrar |
| --- | --- |
| Visita | Evento único, visitante anônimo, período e incremento esperado |
| Abertura da peça | Produto correto e população distinta de exposição ao card |
| Clique no WhatsApp | Sinal de clique confirmado, sem inferir mensagem ou venda |
| Disponibilidade | Variação e versão atuais do catálogo, separadas da procura histórica |
| Consulta ao esgotado | Toque registrado como consulta |
| Declaração explícita | Segunda ação e recibo próprios; fonte ainda precisa de integração |
| Repetição | Mesmo evento preserva resultado sem duplicar contagem |
| Isolamento | Outra loja e operador sem vínculo não acessam o recurso |
| Coleta incompleta | Ausência/parcialidade distinta de zero observado |

Para cada caso, registrar estado anterior, ação, identificador de evento, retorno, estado posterior e esperado. Não registrar segredos, dados pessoais de clientes ou a chave de rastreamento no relatório.

Conferir critérios de visitante, fuso, atraso e deduplicação. Agregados mensais não permitem reconstruir eventos individuais. Só depois de reconciliar os dados formar recomendações e comparações em modo de leitura.

## 11. Situação e próximos materiais

O roteiro e a ficha estão preparados. A inspeção encontrou caminhos concluíveis e lacunas concretas. Os espaços de respostas continuam em branco: nenhuma entrevista foi realizada nem convite enviado por esta tarefa.

A conferência técnica no Chrome local passou: decisão, confirmação, encaminhamento e espera vinculados à mesma ocorrência; 80 XP concedidos uma única vez; estoque preservado após a nota; foto salva no cenário com 18 visitantes. A ausência de observação da foto nesse cenário também foi confirmada. O registro fica em `.tmp/painel-gamificado/verificacao-etapa-a-preparacao.json`, na raiz do repositório. Isso confirma funcionamento e limites do roteiro, não compreensão ou utilidade para um lojista.

Próxima organização: selecionar participantes e formato, preparar a sessão de teste e executar a primeira observação. O envio de convites é uma ação própria do responsável pela pesquisa.

Referências: [Plano 1.5 — revisão atual](PLANO-1.5-UTILIDADE-COMERCIAL.md), [ficha individual](FICHA-PILOTO-1.5.md), [roteiro geral](VALIDACAO-COM-LOJISTAS.md), [documento da interface 1.4](PERFORMANCE-1.4-DOCUMENTO-CONSOLIDADO.md) e [contrato de integração](../integration/README.md).
