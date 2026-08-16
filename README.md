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
| Linha cheia fina | Continuação direta da franquia — reta quando os dois estão na mesma coluna sem nada no caminho |
| Linha cheia grossa | Inseparável: a mesma história partida em dois |
| Linha pontilhada | Dependência — precisa ter visto para entender |

Passe o mouse em qualquer linha para ver o motivo. Clique num card para abrir
o dossiê e isolar só as ligações dele.

**Cores e sagas.** Cada fase tem uma cor própria, só para poder ser distinguida
no diagrama — a cor não representa nenhuma Joia do Infinito. O agrupamento real
é em duas sagas: **Saga do Infinito** (Fases 1, 2 e 3, fecha em *Ultimato*) e
**Saga do Multiverso** (Fases 4, 5 e 6, fecha em *Guerras Secretas*). A legenda
mostra as fases agrupadas assim, e o dossiê traz a saga de cada título. O card
inteiro funciona como capa: um gradiente na cor da fase varre o canto superior
esquerdo. Os chips no topo isolam uma fase, mesmo com os títulos espalhados pela
cronologia.

**No card.** Fase, tipo, título, quando se passa e — entre parênteses — o ano de
lançamento. O contador com o triângulo (▲3) diz quantos títulos você precisa ter
visto antes; o texto completo do "quando se passa" aparece ao passar o mouse.

**Densidade.** O botão de densidade alterna entre três tamanhos reais de card
(Padrão 136×80, Compacta 112×68, Ampla 180×94). Não é zoom: o layout é
recalculado e o roteamento refeito, então o texto nunca fica borrado. Na Padrão
o diagrama ocupa 2278px — cabe em ~80% de uma tela de 1920; na Compacta, 1865px.

**Busca.** Digitar abre uma lista de sugestões; escolher uma leva a tela até o
título e acende as ligações dele. Funciona sem acento — "capita" acha
*Capitã Marvel*, "guardioes" acha *Guardiões*. Setas e Enter navegam pela lista.

**Atalhos.** `/` foca a busca · `Esc` fecha a lista, depois limpa seleção e filtro ·
clicar no fundo desfaz a seleção e volta ao filtro que estiver ativo ·
arrastar o fundo navega · `Shift` + roda rola na horizontal.

**No celular** o fluxograma vira uma lista cronológica com os períodos como
títulos e as ligações em texto ("antes" / "depois") — desenhar 120 setas numa
tela de 390px não seria legível. A barra fica em duas faixas, com os filtros de
fase rolando de lado, e o dossiê abre em tela cheia.

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
validar.bat / validar.js   confere os dados antes de publicar
assets/favicon.svg
assets/css/styles.css      tokens, temas claro/escuro, componentes
assets/js/data.js          os 59 títulos, colunas, períodos, ligações
assets/js/layout.js        motor: camadas + roteamento ortogonal
assets/js/app.js           interface, filtros, dossiê, navegação
```

### Como acrescentar filmes e ligações

**Quem pode editar.** Só quem tem acesso ao repositório no GitHub. O site é
estático: não tem banco, não tem login, não tem formulário de escrita. Um
visitante não consegue alterar nada nem que queira — não existe o que atacar.
O controle de acesso já é o do GitHub, então **não precisa de painel de
administrador**, e criar um seria abrir um risco que hoje não existe.

O ciclo é: editar `assets/js/data.js` → conferir → `git push`. A Vercel
republica sozinha em cerca de meio minuto.

#### 1. Acrescentar um título

Abra `assets/js/data.js` e copie um bloco existente como molde:

```js
{ id:"exemplo", b:17, col:"novos", ph:5, y:2026, t:"filme",
  sh:"Nome no card", pt:"Nome completo em português", or:"Original Title",
  wh:"2026",
  syn:"Duas frases de sinopse.",
  next:["outro"],                                  // continuação direta
  req:[["dependencia","Por que precisa ver antes.", true]] }
```

| Campo | O que é |
|---|---|
| `id` | apelido curto e único, sem espaço nem acento — é como as ligações se referem a ele |
| `b` | índice do período em `BEATS`, **não** a linha; a linha é calculada sozinha |
| `col` | franquia; tem de ser uma das chaves de `COLS` |
| `ph` | fase de 1 a 6, ou `null` se estiver fora da continuidade |
| `t` | `filme`, `série` ou `especial` |
| `sh` | nome que aparece no card — curto, até ~30 caracteres |
| `pt` / `or` | nome completo em português e o título original |
| `wh` | quando se passa; o card mostra só o que vem antes da vírgula |
| `y` | ano de lançamento |
| `syn` | duas frases, aparecem no dossiê |

#### 2. Acrescentar uma ligação

Existem duas, e a diferença importa:

```js
// no título de ORIGEM — sequência direta, vira linha cheia
next:["id_do_seguinte"]

// no título de DESTINO — dependência, vira linha pontilhada com o motivo
req:[["id_do_anterior", "Por que precisa ter visto antes.", true]]
```

O `true` no fim significa "você precisa ter visto"; `false` significa
"ajuda a entender". Isso separa as duas listas do dossiê.

Para a linha grossa de *inseparável* (a mesma história partida em dois),
acrescente o par em `STRICT`, no formato `"origem>destino"`. A ligação precisa
existir antes, em `next` ou em `req`.

**A ligação só pode descer no tempo.** Se A liga em B, o período de B tem de ser
igual ou posterior ao de A. O validador avisa quando isso é violado.

#### 3. Conferir antes de publicar

Dê dois cliques em **`validar.bat`** (ou rode `node validar.js`). Ele aponta:

- id que não existe, por erro de digitação
- coluna ou período inválido
- ligação apontando para trás no tempo
- dependência sem motivo escrito
- vírgula, aspas ou colchete faltando — **com o número da linha**
- linha do desenho passando por cima de um card

Enquanto houver erro, ele lista o que corrigir. Passando, diz `TUDO CERTO`.

#### 4. Publicar

```bash
git add assets/js/data.js
git commit -m "Acrescenta Vingadores: Guerras Secretas"
git push
```

A Vercel detecta o push e republica. Não existe passo de build.

#### Acrescentar uma franquia ou um período novo

- **Franquia:** acrescente um par em `COLS`. Cuidado: a ordem das colunas foi
  otimizada (veja abaixo) e mexer nela reembaralha o desenho.
- **Período:** acrescente em `BEATS`, na posição cronológica certa. Como os
  títulos apontam para `BEATS` pelo índice, inserir no meio desloca todos os
  `b` seguintes — nesse caso rode o validador, que aponta o estrago.

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
cards**, nas três densidades. Os 696 cruzamentos perpendiculares que restam são
legíveis — é assim que qualquer diagrama funciona.

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
