# Peça de mesa — raspadinha da Bloco Arquitetura

Arquivos finais em `public/evento/`:

- `raspadinha-mesa-a5.pdf`: uma peça vertical de 148 × 210 mm, para suporte de mesa.
- `raspadinha-mesa-a4-duas-pecas.pdf`: folha horizontal de 297 × 210 mm, com duas peças e linha de corte central.
- `qr-raspadinha-monograma.png`: QR isolado, 1600 × 1600 px, fundo branco.
- `qr-raspadinha-monograma.svg`: QR vetorial com o monograma incorporado.

Imprimir em tamanho real / 100%, sem cabeçalho ou rodapé adicionais. Para a versão com duas peças, selecionar papel A4 horizontal e cortar na linha central. O desenho tem margens brancas para impressão comum. O QR mede 76 mm na peça, incluindo sua margem branca.

O código abre `https://rafaelrazeira.com.br/arquitetos/raspadinha/participar`, o cadastro real do evento. É o mesmo endereço para todos; nenhum participante ou código privado aparece no material. As inscrições precisam estar abertas no painel na hora de apresentar o QR. Gerar ou publicar o PDF não abre inscrições nem reinicia o sorteio.

Texto: **Seu escritório pode ganhar um site.** A peça explica o cadastro de nome/WhatsApp, a espera pelo anúncio e a raspagem no mesmo navegador. Informa um site de presente, até dois cupons de 50% e R$ 300 de desconto para os demais. Não acrescenta prazo de validade nem data de evento.

Identidade: verde `#046C40`, rosa `#E31B62`, papel branco, Instrument Sans nos títulos e Inter no texto. O QR entra em um bilhete verde com bordas serrilhadas, retomando a experiência digital. Nome e monograma usam os arquivos existentes da marca.

## Gerar novamente

As fontes são incorporadas a partir do build local de `/arquitetos`; abrir a landing no localhost antes da geração.

```powershell
npm install --prefix .tmp/qr-qa --no-save --no-package-lock jsqr pdf-lib
node scripts/gerar-mesa-raspadinha.cjs
```

O script gera QR com correção H e margem branca de quatro módulos, adiciona o monograma em uma placa central pequena e testa a leitura com `jsQR`, independente do gerador. Confere versões reduzidas, JPEG com desfoque leve e rotação, além do QR renderizado em cada composição. As duas versões do PDF são conferidas com `pdf-lib`: uma página e dimensões corretas. As prévias ficam em `.tmp/impressos-raspadinha/`.

PDFs mantêm o desenho do QR em SVG; as imagens da marca e as fontes ficam incorporadas. A conferência é digital: não substitui a leitura de uma cópia na impressora e no suporte que serão usados no evento.
