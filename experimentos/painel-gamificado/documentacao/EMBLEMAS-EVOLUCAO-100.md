# Performance — coleção de emblemas 1–100

Atualização visual de 13/10/2026, exclusiva do experimento separado do painel da loja.

## Estrutura da coleção

São 21 desenhos-base: nível 1 e marcos visuais de cinco em cinco, até o 100. Entre as faixas, uma a quatro joias na face do escudo indicam a progressão. A numeração individual completa a identificação dos 100 níveis. Não são 100 silhuetas desenhadas separadamente.

A seta original da marca permanece dentro da joia central. Verde profundo, metais e rosa nos detalhes mantêm a identidade. A evolução muda silhueta e ornamentos, além da cor. O número 100 recebe proporção própria para caber no emblema compacto.

| Nível | Identidade | Elementos principais |
| --- | --- | --- |
| 1 | Fundação | Escudo essencial |
| 5 | Ascensão | Moldura facetada |
| 10 | Conquista | Insígnia reforçada |
| 15 | Distinção | Aletas e ombreiras |
| 20 | Prestígio | Louros e coroa |
| 25 | Nobreza | Asas e coroa imperial |
| 30 | Bastião | Bastiões e ponte dourada |
| 35 | Guardião | Pináculos e selo alongado |
| 40 | Vanguarda | Armadura de platina |
| 45 | Fortaleza | Muralha em degraus |
| 50 | Excelência | Aureola e joias cardinais |
| 55 | Domínio | Asas ascendentes |
| 60 | Referência | Estrela cristalina |
| 65 | Honra | Estandartes e coroa |
| 70 | Soberania | Manto e coroa soberana |
| 75 | Maestria | Bússola de quatro pontas |
| 80 | Legado | Louros de legado |
| 85 | Lendário | Leque em ouro rosado |
| 90 | Ícone | Dupla órbita e diadema |
| 95 | Supremo | Asas verticais e tríade |
| 100 | Centenário | Coroa, asas e selo mestre |

## Como visualizar

Abrir `http://localhost:3405/?cenario=mapa-nivel-25#evolucao` e clicar em **Ver evolução dos emblemas**. A prévia abre no desenho 100, com versão grande e compacta lado a lado. O seletor permite consultar qualquer nível. A coleção alterna entre 21 desenhos-base e todos os 100 níveis; clicar num escudo atualiza a prévia.

Na página Evolução, a faixa de marcos mantém os níveis já alcançados e as próximas faixas próximas ao nível atual. A coleção completa fica na galeria, evitando uma sequência de dezenas de níveis futuros no painel.

Consultar a galeria não concede XP, não troca o cenário e não altera o histórico. Os nomes são identidades visuais; não são certificações ou indicadores de vendas. Os marcos funcionais continuam os existentes no motor. Esta entrega define desenhos até o 100, sem impor um limite à fórmula de progressão.

## Implementação

- `components/emblem-designs.mjs`: faixas, nomes, descrições e geometrias vetoriais.
- `components/EvolutionEmblem.jsx`: escudo, ornamentos, seta e joias de progresso; IDs de gradiente únicos por instância.
- `components/EmblemGallery.jsx`: consulta dos 100 níveis, comparação compacta e navegação por teclado.
- `components/Achievements.jsx`: marcos próximos e acesso à galeria.
- `performance.css`: metais, proporções e layout responsivo.

| Aspecto | Antes | Depois |
| --- | --- | --- |
| Movimento dos emblemas | Desenhos estáticos até 25 | Desenhos estáticos até 100 |
| Galeria | Modal estático | Modal estático com seleção de nível |
| Recompensas | Sequência existente de XP | Sequência preservada |
| Redução de movimento | Respeitada | Respeitada |

## Verificação

Build de produção aprovado. Conferidos os 100 SVGs, limites do desenho e IDs de gradiente sem duplicação. Layout conferido em 320, 375, 768 e 1440 px, sem rolagem horizontal. Número 100 conferido na versão compacta de 48 px. Teclado, Escape, retorno de foco e consulta sem alteração do histórico aprovados. Regressões de experiência, coleção e recompensas executadas no navegador.

Prancha visual: `.tmp/painel-gamificado/emblemas-1-100-colecao.png`, na raiz do repositório. Evidências detalhadas: `.tmp/painel-gamificado/verificacao-emblemas-100.json`.
