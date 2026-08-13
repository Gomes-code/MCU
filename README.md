# Cronologia MCU

Fluxograma interativo do Universo Cinematográfico Marvel na ordem em que os
fatos acontecem — não na ordem de lançamento. 59 títulos (filmes, séries e
especiais), 118 ligações, e o motivo escrito de cada dependência.

Site estático: HTML, CSS e JavaScript sem dependências, sem build.

---

## Como ler o diagrama

**Eixo vertical — tempo.** De cima para baixo, na ordem dos fatos. Capitão
América abre em 1943; Capitã Marvel, lançada em 2019, aparece logo abaixo
porque se passa em 1995. A régua fixa à esquerda mostra o período de cada
linha e a era narrativa.

**Eixo horizontal — franquias.** Cada coluna é uma franquia, com o nome fixo
no topo e a contagem de títulos.

**Três tipos de ligação:**

| Traço | Significado |
|---|---|
| Linha cheia fina | Continuação direta da franquia |
| Linha cheia grossa | Inseparável: a mesma história partida em dois |
| Linha pontilhada | Dependência — precisa ter visto para entender |

Passe o mouse em qualquer linha para ver o motivo. Clique num card para abrir
o dossiê e isolar só as ligações dele.

**Cores.** Cada uma das seis Fases carrega a cor de uma Joia do Infinito
(Espaço, Realidade, Alma, Tempo, Poder, Mente). Isso codifica a fase de cada
título com um sistema que vem do próprio universo. Os chips no topo isolam uma
fase inteira, mesmo com os títulos espalhados pela cronologia.

**Atalhos.** `/` foca a busca · `Esc` limpa seleção, filtro ou fecha o dossiê ·
arrastar o fundo navega · `Shift` + roda rola na horizontal.

---

## Publicar na Vercel

O projeto não tem build. A Vercel serve a raiz direto.

### Pela interface

1. Suba o repositório para o GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. Em **Framework Preset**, escolha **Other**. Deixe *Build Command* e
   *Output Directory* vazios — o `vercel.json` já cuida do resto.
4. **Deploy**.

Cada push na branch principal gera um novo deploy automaticamente.

### Pela linha de comando

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # produção
```

### Rodar local

Os caminhos dos assets são absolutos (`/assets/...`), como em produção, então
abrir o `index.html` com duplo clique **não** funciona — precisa de um servidor.

**No Windows:** dê duplo clique em **`iniciar.bat`**. Ele entra na pasta certa
sozinho (de onde for chamado), encontra o Python, escolhe a primeira porta livre
a partir da 8000 e abre o navegador. Para parar, `Ctrl+C` ou feche a janela.

Para abrir também no celular, pela rede local:

```cmd
iniciar.bat rede
```

Isso imprime o endereço da máquina na rede (algo como
`http://192.168.1.30:8000`) — útil para conferir o layout mobile, que troca o
fluxograma por uma lista cronológica.

**Manualmente**, em qualquer sistema — o `cd` é o passo que costuma faltar:

```bash
cd caminho/para/MC-HISTO
python -m http.server 8000
```

E abra <http://localhost:8000>.

---

## Estrutura

```
index.html                 marcação da página
vercel.json                cabeçalhos e cache
iniciar.bat                sobe o servidor local no Windows
assets/favicon.svg
assets/css/styles.css      tokens, temas claro/escuro, componentes
assets/js/data.js          os 59 títulos, colunas, períodos, ligações
assets/js/layout.js        motor: camadas + roteamento ortogonal
assets/js/app.js           interface, filtros, dossiê, navegação
```

### `data.js` — editar o conteúdo

Cada título é um objeto. Para acrescentar um:

```js
{ id:"exemplo", b:17, col:"novos", ph:5, y:2026, t:"filme",
  sh:"Nome no card", pt:"Nome completo em português", or:"Original Title",
  wh:"2026",
  syn:"Duas frases de sinopse.",
  next:["outro"],                                  // continuação direta
  req:[["dependencia","Por que precisa ver antes.", true]] }
```

- `b` é o índice em `BEATS` (o período), **não** a linha. A linha é calculada.
- `col` tem de existir em `COLS`.
- No `req`, o terceiro valor `true` significa "obrigatório"; `false`,
  "ajuda a entender".
- `STRICT` lista os pares que ganham linha grossa.

Não existe passo de build: salve e recarregue.

### `layout.js` — como o desenho é decidido

**1. Camadas.** Cada título sobe para a primeira linha possível dentro do seu
período, respeitando duas regras: nenhuma seta aponta para cima, e dois títulos
da mesma franquia não dividem linha. Isso comprimiu o diagrama de 52 para 31
linhas e garante que toda aresta desça — o que elimina de saída o caso mais
difícil de rotear.

**2. Roteamento ortogonal.** Todo caminho usa só três tipos de trecho: vertical
dentro da coluna, horizontal num corredor entre linhas, e vertical num corredor
entre colunas. Corredores nunca contêm cards, então nenhuma linha atravessa um
card. Dentro de cada corredor as arestas recebem faixas distintas por coloração
de intervalos: dois trechos paralelos só dividem faixa se não se cruzarem. Os
corredores crescem conforme a demanda, e cada corredor horizontal é dividido em
três zonas (saída, degrau, entrada) para que descidas e subidas nunca se
encontrem.

Resultado verificado: **0 sobreposições paralelas** e **0 linhas atravessando
cards**. Os 696 cruzamentos perpendiculares que restam são legíveis — é assim
que qualquer diagrama funciona.

**A ordem das colunas em `COLS` é resultado de otimização**, não de tema. Ela
minimiza, em ordem de prioridade: linhas visualmente vazias, espalhamento
horizontal de cada linha, e cruzamentos. Reordenar a lista reembaralha o
desenho inteiro.

---

## Ressalvas de conteúdo

- Algumas posições pós-*Ultimato* são aproximadas: a Marvel nunca fixou
  oficialmente a ordem entre *Quantumania*, *Guardiões Vol. 3* e alguns títulos
  de 2026.
- *Venom 2*, *Morbius* e *X-Men '97* estão na coluna "Paralelos & Sony", fora da
  continuidade principal. Aparecem porque o mapa que originou este site os
  incluía, e porque *Venom 2* liga em *Sem Volta Para Casa*.
- *Vingadores: Doomsday* substituiu *Dinastia Kang* depois da troca de vilão.
- Não há notas de avaliação: em vez de números inventados, o site traz um
  marcador de "assistido" com barra de progresso, salvo no navegador.

Baseado no mapa mental "Cronologia MCU" (`Mapa Mental Geek (1).pdf`), completado
com a cronologia interna.
