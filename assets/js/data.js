/* ============================================================
   CRONOLOGIA MCU — dados
   Fonte: mapa mental "Cronologia MCU" + ordem cronológica interna.

   Campos de cada título
     id    identificador curto
     sh    nome no card (a coluna já informa a franquia)
     pt    nome completo em português
     or    título original
     y     ano de lançamento
     t     filme | série | especial
     ph    fase (1..6) ou null quando está fora da continuidade
     col   coluna / franquia
     b     índice do período em BEATS — a linha exata é calculada pelo layout
     wh    quando se passa dentro da história
     syn   sinopse curta
     next  continuação direta  →  [id, ...]
     req   pré-requisitos      →  [[id, motivo, obrigatório?], ...]
   ============================================================ */
(function (global) {
  "use strict";

  /* Colunas, da esquerda para a direita.
     Esta ordem não é alfabética nem temática: saiu de uma busca local partindo
     da ordem de estreia das franquias, otimizando três coisas —

       1. nenhuma linha visualmente vazia. É o que mais importa: com 13 colunas
          numa tela cabem ~6, então se os títulos de um período caem todos em
          colunas distantes, quem rola vê faixas em branco e pensa que falta
          conteúdo. Restrição dura: nenhuma das 8 primeiras linhas pode estar
          vazia na janela inicial, e no máximo 3 linhas seguidas sem card em
          qualquer janela de 6 colunas (era 10).
       2. compacidade: títulos do mesmo período ficam próximos — distância
          média caiu de 3,3 para 2,1 colunas.
       3. cruzamentos entre ligações, o critério de menor peso: cruzamento
          perpendicular é legível, ao contrário de linha sobreposta (que o
          roteador elimina por construção) e de tela vazia.

     Reordenar esta lista reembaralha o desenho todo. A ordem pode ser livre
     porque é o cabeçalho fixo que identifica cada franquia. */
  const COLS = [
    ["iron",    "Homem de Ferro"],
    ["thor",    "Thor"],
    ["ant",     "Homem-Formiga"],
    ["cosmos",  "Cósmico"],
    ["aven",    "Vingadores"],
    ["cap",     "Capitão América"],
    ["wakanda", "Wakanda"],
    ["magic",   "Magia & Multiverso"],
    ["spider",  "Homem-Aranha"],
    ["hulk",    "Hulk"],
    ["novos",   "Novos Heróis"],
    ["guard",   "Guardiões"],
    ["alt",     "Paralelos & Sony"]
  ];

  /* Períodos em ordem cronológica: [rótulo, era]. Vários títulos podem
     compartilhar um período — o layout decide quantas linhas cada um ocupa. */
  const BEATS = [
    ["1943 – 1945",       "A Origem"],
    ["1995",              "A Origem"],
    ["2010",              "Os Vingadores se Reúnem"],
    ["2011",              "Os Vingadores se Reúnem"],
    ["2012",              "Os Vingadores se Reúnem"],
    ["Natal de 2012",     "Um Mundo Maior"],
    ["2013",              "Um Mundo Maior"],
    ["2014",              "Um Mundo Maior"],
    ["2015",              "Um Mundo Maior"],
    ["2016",              "A Fratura"],
    ["2017",              "A Fratura"],
    ["2018",              "A Guerra do Infinito"],
    ["2018 · 2023",       "A Guerra do Infinito"],
    ["Fora do tempo",     "O Blip e o Retorno"],
    ["2023",              "O Blip e o Retorno"],
    ["2024",              "O Blip e o Retorno"],
    ["2025",              "O Multiverso se Abre"],
    ["2026",              "Rumo às Guerras Secretas"],
    ["Universo paralelo", "Rumo às Guerras Secretas"],
    ["2026 →",            "Rumo às Guerras Secretas"],
    ["Depois",            "Rumo às Guerras Secretas"]
  ];

  /* As seis Fases se agrupam em duas Sagas — este é o agrupamento oficial da
     Marvel. Cada fase tem uma cor só para poder ser distinguida no diagrama;
     a cor não representa nenhuma Joia do Infinito. */
  const SAGAS = [
    { nome: "Saga do Infinito",   fases: [1, 2, 3], fecha: "Vingadores: Ultimato" },
    { nome: "Saga do Multiverso", fases: [4, 5, 6], fecha: "Vingadores: Guerras Secretas" }
  ];
  const SAGA_DE = {};
  SAGAS.forEach(s => s.fases.forEach(f => { SAGA_DE[f] = s; }));

  /* Pares inseparáveis: a mesma história partida em dois, ou um título que
     começa no segundo em que o outro termina. Só estes ganham linha grossa. */
  const STRICT = [
    "av3>av4", "dooms>swars", "sm2>sm3", "sm3>sm4", "thor3>av3",
    "wv>ds2", "fws>ca4", "ant2>av4", "loki2>dpool"
  ];

  const TITLES = [
    { id:"ca1", b:0, col:"cap", ph:1, y:2011, t:"filme",
      sh:"O Primeiro Vingador", pt:"Capitão América: O Primeiro Vingador",
      or:"Captain America: The First Avenger", wh:"1943 – 1945",
      syn:"Steve Rogers, um rapaz franzino rejeitado pelo Exército, se torna o primeiro super-soldado e enfrenta a Hidra durante a Segunda Guerra. No fim, ele cai no gelo e desperta setenta anos depois.",
      next:["ca2"], req:[] },

    { id:"cmar", b:1, col:"cosmos", ph:3, y:2019, t:"filme",
      sh:"Capitã Marvel", pt:"Capitã Marvel", or:"Captain Marvel", wh:"1995",
      syn:"Uma piloto da Força Aérea sem memória descobre que é humana, que ganhou poderes cósmicos e que lutava do lado errado de uma guerra alienígena. É aqui que Nick Fury perde o olho e batiza a Iniciativa Vingadores.",
      next:["marvels"], req:[] },

    { id:"im1", b:2, col:"iron", ph:1, y:2008, t:"filme",
      sh:"Homem de Ferro", pt:"Homem de Ferro", or:"Iron Man", wh:"2010",
      syn:"Sequestrado no Afeganistão, o bilionário Tony Stark constrói uma armadura para escapar e decide parar de vender armas. A cena pós-crédito com Nick Fury é o marco zero do universo compartilhado.",
      next:["im2"], req:[] },

    { id:"hulk", b:3, col:"hulk", ph:1, y:2008, t:"filme",
      sh:"O Incrível Hulk", pt:"O Incrível Hulk", or:"The Incredible Hulk", wh:"2011",
      syn:"Bruce Banner vive escondido procurando uma cura enquanto o Exército o caça. Termina com Stark procurando o General Ross para falar de uma equipe.",
      next:[], req:[] },

    { id:"im2", b:3, col:"iron", ph:1, y:2010, t:"filme",
      sh:"Homem de Ferro 2", pt:"Homem de Ferro 2", or:"Iron Man 2", wh:"2011",
      syn:"Tony está morrendo pelo próprio reator enquanto Ivan Vanko cobra uma dívida do pai dele. Natasha Romanoff surge infiltrada e a S.H.I.E.L.D. assume o centro da trama.",
      next:["im3"], req:[
        ["im1","Você precisa da doença do paládio e da relação com Obadiah e Howard Stark montadas no primeiro filme.",false],
        ["ca1","O escudo protótipo e o legado de Howard Stark só significam algo se você já viu a origem do Capitão.",false]] },

    { id:"thor1", b:3, col:"thor", ph:1, y:2011, t:"filme",
      sh:"Thor", pt:"Thor", or:"Thor", wh:"2011",
      syn:"Banido de Asgard por arrogância, Thor cai na Terra sem poderes enquanto Loki toma o trono. Apresenta o Tesseract em posse da S.H.I.E.L.D. na cena final.",
      next:["thor2"], req:[] },

    { id:"av1", b:4, col:"aven", ph:1, y:2012, t:"filme",
      sh:"Os Vingadores", pt:"Os Vingadores", or:"The Avengers", wh:"2012",
      syn:"Loki rouba o Tesseract e abre um portal sobre Nova York. Seis heróis que não se suportam viram um time — o evento que todo filme posterior chama de “a Batalha de Nova York”.",
      next:["av2"], req:[
        ["im2","Fecha o arco de Tony e monta a S.H.I.E.L.D. como instituição.",true],
        ["thor1","Loki, o Bifrost e a relação com Thor vêm inteiros daqui.",true],
        ["ca1","Steve acorda no presente exatamente onde este filme o deixou.",true],
        ["hulk","Banner já está em fuga e sob controle quando o filme começa.",false]] },

    { id:"im3", b:5, col:"iron", ph:2, y:2013, t:"filme",
      sh:"Homem de Ferro 3", pt:"Homem de Ferro 3", or:"Iron Man 3", wh:"Natal de 2012",
      syn:"Tony vive um estresse pós-traumático depois de Nova York e perde tudo para o Mandarim. O filme trata as consequências psicológicas do primeiro Vingadores.",
      next:[], req:[
        ["av1","Todo o trauma de Tony é reação direta à Batalha de Nova York.",true],
        ["im2","Pepper no comando da Stark Industries e a parceria com Happy vêm do segundo filme.",false]] },

    { id:"thor2", b:6, col:"thor", ph:2, y:2013, t:"filme",
      sh:"O Mundo Sombrio", pt:"Thor: O Mundo Sombrio", or:"Thor: The Dark World", wh:"2013",
      syn:"Jane Foster é contaminada pelo Éter e Malekith quer usá-lo para apagar a luz do universo. É o filme que revela a segunda Joia do Infinito e planta Loki no trono disfarçado de Odin.",
      next:["thor3"], req:[
        ["thor1","A traição de Loki e o estado de Asgard são herdados diretamente.",true],
        ["av1","Loki chega preso por causa da invasão de Nova York.",true]] },

    { id:"ca2", b:7, col:"cap", ph:2, y:2014, t:"filme",
      sh:"O Soldado Invernal", pt:"Capitão América 2: O Soldado Invernal",
      or:"Captain America: The Winter Soldier", wh:"2014",
      syn:"Steve descobre que a Hidra cresceu dentro da S.H.I.E.L.D. e enfrenta um assassino com o rosto do melhor amigo. A S.H.I.E.L.D. deixa de existir — o que muda o cenário de tudo o que vem depois.",
      next:["ca3"], req:[
        ["ca1","Bucky Barnes só tem peso se você viveu a amizade dele com Steve.",true],
        ["av1","Steve trabalhando para a S.H.I.E.L.D. e a relação com Natasha começam aqui.",true]] },

    { id:"gg1", b:7, col:"guard", ph:2, y:2014, t:"filme",
      sh:"Guardiões da Galáxia", pt:"Guardiões da Galáxia", or:"Guardians of the Galaxy", wh:"2014",
      syn:"Um ladrão humano e quatro fugitivos disputam um orbe que guarda a Joia do Poder e acabam salvando um planeta. Abre a frente cósmica do MCU e apresenta Thanos em pessoa.",
      next:["gg2"], req:[] },

    { id:"gg2", b:7, col:"guard", ph:2, y:2017, t:"filme",
      sh:"Guardiões Vol. 2", pt:"Guardiões da Galáxia Vol. 2", or:"Guardians of the Galaxy Vol. 2",
      wh:"2014, poucos meses depois",
      syn:"Peter Quill encontra o pai, Ego, e descobre que o pai verdadeiro era Yondu. Introduz Mantis, Adam Warlock e a fratura entre Gamora e Nebulosa.",
      next:["gg3"], req:[["gg1","Sequência imediata: mesmo time, mesma dívida com os Soberanos.",true]] },

    { id:"av2", b:8, col:"aven", ph:2, y:2015, t:"filme",
      sh:"Era de Ultron", pt:"Vingadores: Era de Ultron", or:"Avengers: Age of Ultron", wh:"2015",
      syn:"Uma IA criada por Stark decide que salvar a Terra é extinguir a humanidade. Nasce o Visão, entram Wanda e Pietro, e o time se racha pela primeira vez.",
      next:["av3"], req:[
        ["av1","O cetro de Loki, recuperado da Hidra, é o ponto de partida.",true],
        ["ca2","A queda da S.H.I.E.L.D. explica por que os Vingadores agem sozinhos.",true],
        ["thor2","Thor investiga as Joias do Infinito por causa do Éter.",false]] },

    { id:"ant1", b:8, col:"ant", ph:2, y:2015, t:"filme",
      sh:"Homem-Formiga", pt:"Homem-Formiga", or:"Ant-Man", wh:"2015",
      syn:"Scott Lang, um ex-detento, herda o traje de Hank Pym para impedir que a tecnologia caia em mãos erradas. Apresenta o Reino Quântico, peça central do futuro da saga.",
      next:["ant2"], req:[["av2","O filme cita a batalha de Sokovia e Scott invade uma base dos Vingadores.",false]] },

    { id:"ca3", b:9, col:"cap", ph:3, y:2016, t:"filme",
      sh:"Guerra Civil", pt:"Capitão América: Guerra Civil", or:"Captain America: Civil War", wh:"2016",
      syn:"Os Acordos de Sokovia dividem os Vingadores entre assinar ou resistir, e Zemo usa a morte dos Stark para quebrar o time por dentro. Estreiam o Homem-Aranha e o Pantera Negra do MCU.",
      next:[], req:[
        ["ca2","Bucky é o motor da história inteira.",true],
        ["av2","Sokovia é a razão de existirem os Acordos.",true],
        ["ant1","Scott entra no time do Capitão vindo direto da cena pós-crédito.",false],
        ["im3","A instabilidade de Tony vem sendo construída desde aqui.",false]] },

    { id:"bwid", b:9, col:"cap", ph:4, y:2021, t:"filme",
      sh:"Viúva Negra", pt:"Viúva Negra", or:"Black Widow", wh:"2016, dias após Guerra Civil",
      syn:"Foragida pelos Acordos, Natasha volta ao passado na Sala Vermelha para acertar contas com a família falsa e com Dreykov. Apresenta Yelena Belova e o Treinador.",
      next:["tbolts"], req:[["ca3","Natasha está fugindo exatamente das consequências deste filme.",true]] },

    { id:"bp1", b:9, col:"wakanda", ph:3, y:2018, t:"filme",
      sh:"Pantera Negra", pt:"Pantera Negra", or:"Black Panther", wh:"2016, uma semana após Guerra Civil",
      syn:"T'Challa assume o trono de Wakanda e é desafiado por Killmonger, um primo criado nos Estados Unidos. Termina com Wakanda revelando ao mundo que nunca foi um país pobre.",
      next:["bp2"], req:[["ca3","T'Challa está de luto pelo pai, morto neste filme.",true]] },

    { id:"sm1", b:9, col:"spider", ph:3, y:2017, t:"filme",
      sh:"De Volta ao Lar", pt:"Homem-Aranha: De Volta ao Lar", or:"Spider-Man: Homecoming", wh:"2016",
      syn:"Peter Parker tenta provar a Tony Stark que é grande o bastante para os Vingadores enquanto enfrenta o Abutre. Mostra o MCU pela ótica de quem varre o entulho depois das batalhas.",
      next:["sm2"], req:[
        ["ca3","Peter foi recrutado por Stark aqui e o filme começa nesse ponto exato.",true],
        ["av1","O Abutre existe porque catava sucata alienígena da invasão de Nova York.",false]] },

    { id:"ds1", b:9, col:"magic", ph:3, y:2016, t:"filme",
      sh:"Doutor Estranho", pt:"Doutor Estranho", or:"Doctor Strange", wh:"2016 – 2017",
      syn:"Um neurocirurgião arrogante perde as mãos num acidente e encontra na magia o que a medicina não deu. Abre o lado místico do MCU e coloca a Joia do Tempo em Kamar-Taj.",
      next:["ds2"], req:[] },

    { id:"thor3", b:10, col:"thor", ph:3, y:2017, t:"filme",
      sh:"Ragnarok", pt:"Thor: Ragnarok", or:"Thor: Ragnarok", wh:"2017",
      syn:"Hela destrói o martelo de Thor e toma Asgard, enquanto ele vira gladiador em Sakaar ao lado do Hulk. Asgard é destruída e o povo asgardiano parte num navio — que Thanos intercepta.",
      next:["thor4"], req:[
        ["thor2","Loki no trono e a morte de Frigga vêm daqui.",true],
        ["av2","Thor e Hulk desapareceram no fim daquele filme; é onde Banner estava.",true],
        ["ds1","Estranho aparece e a cena só funciona se você conhece o Santuário.",false]] },

    { id:"ant2", b:11, col:"ant", ph:3, y:2018, t:"filme",
      sh:"Homem-Formiga e a Vespa", pt:"Homem-Formiga e a Vespa", or:"Ant-Man and the Wasp",
      wh:"2018, ao mesmo tempo que Guerra Infinita",
      syn:"Em prisão domiciliar, Scott ajuda Hank e Hope a resgatar Janet do Reino Quântico. A cena pós-crédito acontece no exato instante do estalo de Thanos.",
      next:["ant3"], req:[
        ["ant1","Continuação direta, com Scott pagando pelo que fez em Guerra Civil.",true],
        ["ca3","A prisão domiciliar é consequência de ter lutado no aeroporto.",true]] },

    { id:"av3", b:11, col:"aven", ph:3, y:2018, t:"filme",
      sh:"Guerra Infinita", pt:"Vingadores: Guerra Infinita", or:"Avengers: Infinity War", wh:"2018",
      syn:"Thanos caça as seis Joias do Infinito para apagar metade da vida do universo — e consegue. O filme cobra dez anos de construção e termina com os heróis derrotados.",
      next:["av4"], req:[
        ["av2","O time está fragmentado e o Visão carrega a Joia da Mente.",true],
        ["thor3","O filme abre segundos depois do fim de Ragnarok.",true],
        ["gg2","Os Guardiões, Gamora e Nebulosa chegam com esse histórico pronto.",true],
        ["ca3","O Capitão está foragido e sem escudo por causa da Guerra Civil.",true],
        ["bp1","O ato final é em Wakanda, aberta ao mundo no fim daquele filme.",true],
        ["ds1","A Joia do Tempo e o Santuário são peças centrais.",true],
        ["sm1","Peter já é herói assumido e recebe a armadura Homem-Aranha de Ferro.",false],
        ["im3","O Tony que abre este filme vem inteiro daqui: o pesadelo, o medo de perder Pepper e a armadura que ele nunca desliga.",false]] },

    { id:"av4", b:12, col:"aven", ph:3, y:2019, t:"filme",
      sh:"Ultimato", pt:"Vingadores: Ultimato", or:"Avengers: Endgame", wh:"2018 e 2023",
      syn:"Cinco anos após o estalo, os sobreviventes usam o Reino Quântico para roubar as Joias no passado e desfazer o Blip. Fecha a Saga do Infinito e cria as ramificações temporais de toda a Fase 4.",
      next:["dooms"], req:[
        ["av3","É a segunda metade da mesma história. Estritamente obrigatório.",true],
        ["ant2","A viagem no tempo só existe por causa do Reino Quântico e do sumiço de Scott.",true],
        ["cmar","Carol Danvers volta ao jogo aqui e nada explica de onde ela veio.",true],
        ["bwid","O sacrifício de Natasha pesa muito mais com a família dela apresentada.",false]] },

    { id:"loki1", b:13, col:"magic", ph:4, y:2021, t:"série",
      sh:"Loki · T1", pt:"Loki — 1ª Temporada", or:"Loki — Season 1", wh:"Fora do tempo",
      syn:"O Loki de 2012, que fugiu com o Tesseract, é preso pela Autoridade de Variância Temporal e obrigado a caçar uma variante de si mesmo. A morte de Aquele Que Permanece rompe a Linha Sagrada do Tempo e abre o Multiverso.",
      next:["loki2"], req:[["av4","Este Loki só existe porque escapou durante o assalto ao tempo de 2012.",true]] },

    { id:"whatif", b:13, col:"magic", ph:4, y:2021, t:"série",
      sh:"What If…? · T1", pt:"What If…? — 1ª Temporada", or:"What If…? — Season 1", wh:"Multiverso",
      syn:"O Vigia observa realidades alternativas onde uma única escolha muda tudo. Cada episódio é uma variação dos filmes que você já viu — por isso vem depois deles.",
      next:[], req:[
        ["loki1","A existência de linhas paralelas é estabelecida na série do Loki.",true],
        ["av4","Vários episódios reimaginam eventos até Ultimato; ver antes estraga tudo.",true]] },

    { id:"wv", b:14, col:"magic", ph:4, y:2021, t:"série",
      sh:"WandaVision", pt:"WandaVision", or:"WandaVision", wh:"2023, três semanas após Ultimato",
      syn:"Wanda escraviza uma cidade inteira dentro de uma sitcom para não encarar o luto pelo Visão. Ela assume o manto de Feiticeira Escarlate e conhece o Darkhold.",
      next:["agatha"], req:[
        ["av4","O ponto de partida é a morte do Visão e o luto pós-Blip.",true],
        ["av2","A relação com o Visão e a origem dos poderes de Wanda nascem ali.",true]] },

    { id:"fws", b:15, col:"cap", ph:4, y:2021, t:"série",
      sh:"Falcão e o Soldado Invernal", pt:"Falcão e o Soldado Invernal",
      or:"The Falcon and the Winter Soldier", wh:"2024, seis meses após Ultimato",
      syn:"Sam Wilson devolve o escudo e o governo nomeia outro Capitão América, enquanto os Apátridas lutam contra o mundo pós-Blip. Sam finalmente aceita o manto e Bucky começa a se reconstruir.",
      next:["ca4"], req:[
        ["av4","Steve entrega o escudo a Sam no fim de Ultimato — é a cena zero da série.",true],
        ["ca2","Zemo e o passado de Bucky voltam inteiros.",true],
        ["ca3","Zemo está preso por causa do que fez na Guerra Civil.",true]] },

    { id:"sm2", b:15, col:"spider", ph:3, y:2019, t:"filme",
      sh:"Longe de Casa", pt:"Homem-Aranha: Longe de Casa", or:"Spider-Man: Far From Home",
      wh:"2024, oito meses após Ultimato",
      syn:"Em excursão pela Europa, Peter é manipulado por Mysterio, que se apresenta como herói de outra dimensão. A cena pós-crédito revela a identidade de Peter ao mundo inteiro.",
      next:["sm3"], req:[
        ["av4","O luto por Tony Stark e o Blip são o eixo emocional do filme.",true],
        ["sm1","Continuação direta: mesma escola, mesmo Ned, mesma MJ.",true]] },

    { id:"shang", b:15, col:"novos", ph:4, y:2021, t:"filme",
      sh:"Shang-Chi", pt:"Shang-Chi e a Lenda dos Dez Anéis",
      or:"Shang-Chi and the Legend of the Ten Rings", wh:"2024",
      syn:"Shang-Chi foge do pai, Wenwu, o verdadeiro dono dos Dez Anéis e da organização que sequestrou Tony Stark. Expande o MCU para a mitologia de Ta Lo e apresenta Katy e Xialing.",
      next:[], req:[
        ["im3","O falso Mandarim daquele filme é retomado e explicado aqui.",false],
        ["av4","Wong e Banner aparecem já pós-Blip na cena pós-crédito.",false]] },

    { id:"eter", b:15, col:"cosmos", ph:4, y:2021, t:"filme",
      sh:"Eternos", pt:"Eternos", or:"Eternals", wh:"2024",
      syn:"Dez seres imortais que protegem a Terra há sete mil anos descobrem que sua missão era preparar o planeta para o nascimento de um Celestial. Reescreve a escala cósmica e a pré-história do MCU.",
      next:[], req:[["av4","O Blip é o gatilho que reativa os Desviantes e reúne o grupo.",true]] },

    { id:"sony", b:15, col:"alt", ph:null, y:2021, t:"filme",
      sh:"Venom 2", pt:"Venom 2: Tempo de Carnificina", or:"Venom: Let There Be Carnage",
      wh:"Universo Sony",
      syn:"Produção da Sony, fora do MCU. Importa por um motivo só: a cena pós-crédito joga Eddie Brock no universo da Marvel, ligando direto em Sem Volta Para Casa.",
      next:[], req:[] },

    { id:"hawk", b:15, col:"novos", ph:4, y:2021, t:"série",
      sh:"Gavião Arqueiro", pt:"Gavião Arqueiro", or:"Hawkeye", wh:"Natal de 2024",
      syn:"Clint Barton quer passar o Natal em casa, mas Kate Bishop veste o traje do Ronin e puxa a máfia de agasalho e o Rei do Crime para cima dele. Apresenta Kate, Yelena vingativa e Maya Lopez.",
      next:["echo"], req:[
        ["av4","O passado de Ronin e a morte de Natasha são o peso que Clint carrega.",true],
        ["bwid","Yelena chega atrás de Clint por causa da cena pós-crédito de Viúva Negra.",true]] },

    { id:"sm3", b:15, col:"spider", ph:4, y:2021, t:"filme",
      sh:"Sem Volta Para Casa", pt:"Homem-Aranha: Sem Volta Para Casa", or:"Spider-Man: No Way Home",
      wh:"Natal de 2024",
      syn:"Exposto ao mundo, Peter pede a Estranho um feitiço para que todos esqueçam quem ele é — e rasga o Multiverso, trazendo vilões e Aranhas de outras realidades. Termina com Peter apagado da memória de todos.",
      next:["sm4"], req:[
        ["sm2","O filme começa no segundo em que Longe de Casa termina.",true],
        ["ds1","O feitiço, Wong e Kamar-Taj precisam estar estabelecidos.",true],
        ["loki1","A abertura do Multiverso é o que torna o feitiço tão perigoso.",true],
        ["sony","As aparições de Venom fecham com a cena pós-crédito de Tempo de Carnificina.",false]] },

    { id:"moon", b:16, col:"novos", ph:4, y:2022, t:"série",
      sh:"Cavaleiro da Lua", pt:"Cavaleiro da Lua", or:"Moon Knight", wh:"2025",
      syn:"Steven Grant descobre que divide o corpo com um mercenário e serve ao deus egípcio Khonshu. É a história mais isolada do MCU — dá para ver quase sem contexto.",
      next:[], req:[] },

    { id:"morb", b:16, col:"alt", ph:null, y:2022, t:"filme",
      sh:"Morbius", pt:"Morbius", or:"Morbius", wh:"Universo Sony",
      syn:"Também da Sony e independente. A cena pós-crédito tenta forçar uma ligação com o Abutre do MCU, mas nada nos filmes da Marvel depende dela.",
      next:[], req:[] },

    { id:"ds2", b:16, col:"magic", ph:4, y:2022, t:"filme",
      sh:"Multiverso da Loucura", pt:"Doutor Estranho no Multiverso da Loucura",
      or:"Doctor Strange in the Multiverse of Madness", wh:"2025",
      syn:"América Chavez atravessa universos fugindo de algo que quer roubar seu poder — e esse algo é Wanda, corrompida pelo Darkhold. Mostra o custo real de brincar com o Multiverso.",
      next:[], req:[
        ["wv","Sem WandaVision a vilã do filme é incompreensível. Estritamente obrigatório.",true],
        ["sm3","O feitiço que rachou o Multiverso é a causa direta.",true],
        ["ds1","Mordo, Christine e o Olho de Agamotto vêm do primeiro filme.",true],
        ["whatif","O episódio de Estranho Supremo é retomado literalmente.",false]] },

    { id:"thor4", b:16, col:"thor", ph:4, y:2022, t:"filme",
      sh:"Amor e Trovão", pt:"Thor: Amor e Trovão", or:"Thor: Love and Thunder", wh:"2025",
      syn:"Gorr caça deuses por vingança enquanto Jane Foster reaparece empunhando o Mjolnir como Poderosa Thor. Fecha a jornada de Thor com Nova Asgard já estabelecida na Terra.",
      next:[], req:[
        ["thor3","Asgard destruída, Valquíria e Korg vêm daqui.",true],
        ["av4","Thor sai com os Guardiões no fim de Ultimato — é onde o filme começa.",true],
        ["thor2","A relação com Jane e o Mjolnir dependem desse filme.",true]] },

    { id:"msm", b:16, col:"novos", ph:4, y:2022, t:"série",
      sh:"Ms. Marvel", pt:"Ms. Marvel", or:"Ms. Marvel", wh:"2025",
      syn:"Kamala Khan, fã declarada da Capitã Marvel, ganha poderes a partir de um bracelete da família e descobre uma herança que atravessa a Partição da Índia. A cena final liga direto em The Marvels.",
      next:["marvels"], req:[
        ["cmar","Toda a identidade da Kamala é construída em cima da idolatria por Carol.",true],
        ["av4","Ela é da geração que cresceu vendo os Vingadores como lenda pós-Blip.",false]] },

    { id:"shulk", b:16, col:"hulk", ph:4, y:2022, t:"série",
      sh:"Mulher-Hulk", pt:"Mulher-Hulk: Defensora de Heróis", or:"She-Hulk: Attorney at Law", wh:"2025",
      syn:"Jennifer Walters recebe o sangue do primo Bruce e passa a advogar para super-humanos. Retoma Abominável, o Sr. Sinistro e o Demolidor num tom de comédia jurídica.",
      next:[], req:[
        ["av4","Bruce aparece já como Hulk Inteligente, resultado de Ultimato.",true],
        ["hulk","Abominável volta e o histórico com Banner importa.",false],
        ["shang","O anel do Wenwu aparece na trama do Sr. Sinistro.",false]] },

    { id:"bp2", b:16, col:"wakanda", ph:4, y:2022, t:"filme",
      sh:"Wakanda Para Sempre", pt:"Pantera Negra: Wakanda Para Sempre",
      or:"Black Panther: Wakanda Forever", wh:"2025",
      syn:"Wakanda enlutada pela morte de T'Challa é pressionada pelo mundo e pelo reino submarino de Namor. Shuri assume o manto e Riri Williams entra no MCU.",
      next:["iheart"], req:[
        ["bp1","É a continuação direta do reinado de T'Challa.",true],
        ["av4","A abertura ao mundo e o pós-Blip definem a pressão diplomática.",false]] },

    { id:"wolf", b:16, col:"novos", ph:4, y:2022, t:"especial",
      sh:"Lobisomem por Natureza", pt:"Lobisomem por Natureza", or:"Werewolf by Night", wh:"2025",
      syn:"Um especial em preto e branco no estilo dos filmes de monstro clássicos, onde caçadores disputam uma relíquia. Apresenta Jack Russell e Elsa Bloodstone.",
      next:[], req:[] },

    { id:"ggx", b:16, col:"guard", ph:4, y:2022, t:"especial",
      sh:"Especial de Festas", pt:"Especial de Festas dos Guardiões",
      or:"The Guardians of the Galaxy Holiday Special", wh:"Natal de 2025",
      syn:"Mantis e Drax vão à Terra sequestrar Kevin Bacon como presente de Natal para Quill. Curto, mas revela que Mantis é irmã de Peter — informação usada no Vol. 3.",
      next:["gg3"], req:[["thor4","Os Guardiões compraram Nolandia depois de se separarem de Thor.",true]] },

    { id:"echo", b:16, col:"novos", ph:5, y:2024, t:"série",
      sh:"Echo", pt:"Echo", or:"Echo", wh:"2025",
      syn:"Maya Lopez volta para a comunidade Choctaw tentando escapar do império criminoso do Rei do Crime. Mais cru e violento, conecta o MCU à Marvel da Netflix.",
      next:["dd"], req:[["hawk","Maya sai direto do confronto com Clint e Kingpin.",true]] },

    { id:"gg3", b:16, col:"guard", ph:5, y:2023, t:"filme",
      sh:"Guardiões Vol. 3", pt:"Guardiões da Galáxia Vol. 3", or:"Guardians of the Galaxy Vol. 3",
      wh:"2025",
      syn:"Para salvar Rocket, o grupo enfrenta o Alto Evolucionário e finalmente encara a origem do guaxinim. Fecha o time original e despede-se de cada integrante.",
      next:[], req:[
        ["gg2","Adam Warlock, Nebulosa e o luto por Gamora vêm daqui.",true],
        ["av3","A Gamora deste filme é a versão de 2014 trazida por Thanos.",true],
        ["ggx","O especial de Natal é o prólogo literal do filme.",false]] },

    { id:"ant3", b:17, col:"ant", ph:5, y:2023, t:"filme",
      sh:"Quantumania", pt:"Homem-Formiga e a Vespa: Quantumania",
      or:"Ant-Man and the Wasp: Quantumania", wh:"2026",
      syn:"A família Lang é sugada para o Reino Quântico e encontra Kang, o Conquistador, exilado lá. É a apresentação oficial do vilão da saga e da escala do Multiverso.",
      next:[], req:[
        ["ant2","Cassie crescida e Janet resgatada vêm direto daqui.",true],
        ["loki1","Aquele Que Permanece é uma variante de Kang; sem isso o vilão perde metade do peso.",true]] },

    { id:"invas", b:17, col:"cosmos", ph:5, y:2023, t:"série",
      sh:"Invasão Secreta", pt:"Invasão Secreta", or:"Secret Invasion", wh:"2026",
      syn:"Nick Fury volta do espaço para descobrir que Skrulls infiltrados querem tomar a Terra por dentro. Cobra a promessa que Fury fez aos refugiados skrull décadas antes.",
      next:[], req:[
        ["cmar","O acordo de Fury com Talos e os Skrulls é firmado ali.",true],
        ["fws","O cenário político pós-Blip e os Apátridas preparam o terreno.",false],
        ["av4","Fury estava na estação espacial S.A.B.E.R. desde Longe de Casa.",false]] },

    { id:"loki2", b:17, col:"magic", ph:5, y:2023, t:"série",
      sh:"Loki · T2", pt:"Loki — 2ª Temporada", or:"Loki — Season 2", wh:"Fora do tempo",
      syn:"Com a Linha do Tempo se ramificando sem controle, Loki tenta consertar o Tear Temporal e termina se tornando o próprio eixo que sustenta o Multiverso. É a série que define as regras da Saga do Multiverso.",
      next:["dpool"], req:[
        ["loki1","Continuação direta, mesmo elenco, mesmo cliffhanger.",true],
        ["ant3","O Kang de Quantumania é a prova prática do que a AVT temia.",false]] },

    { id:"marvels", b:17, col:"cosmos", ph:5, y:2023, t:"filme",
      sh:"The Marvels", pt:"The Marvels", or:"The Marvels", wh:"2026",
      syn:"Carol, Kamala e Monica têm os poderes entrelaçados e precisam impedir Dar-Benn de rasgar o espaço-tempo. A cena pós-crédito abre a porta dos mutantes.",
      next:[], req:[
        ["cmar","É a sequência direta da história de Carol.",true],
        ["msm","Kamala vem inteira da série dela, incluindo o bracelete.",true],
        ["wv","Monica Rambeau ganha os poderes em WandaVision.",true],
        ["invas","O contexto skrull e a queda de Fury pesam na trama.",false]] },

    { id:"dpool", b:17, col:"novos", ph:5, y:2024, t:"filme",
      sh:"Deadpool & Wolverine", pt:"Deadpool & Wolverine", or:"Deadpool & Wolverine", wh:"2024 – 2026",
      syn:"A AVT recruta Wade Wilson porque o universo da Fox está morrendo sem seu Âncora — o Wolverine. Traz a Fox oficialmente para o MCU e é praticamente uma aula sobre as regras da AVT.",
      next:[], req:[
        ["loki2","Toda a lógica da AVT, Vazio e Aquele Que Permanece vem daqui.",true],
        ["av4","O Blip e a linha do tempo consertada são referência constante.",false]] },

    { id:"agatha", b:17, col:"magic", ph:5, y:2024, t:"série",
      sh:"Agatha Sempre", pt:"Agatha Sempre", or:"Agatha All Along", wh:"2026",
      syn:"Sem poderes depois de Westview, Agatha Harkness monta um coven improvável para percorrer a Estrada das Bruxas. Revela Wiccano e amplia a bruxaria do MCU.",
      next:[], req:[
        ["wv","É a continuação direta de WandaVision, do mesmo ponto e com a mesma Agatha.",true],
        ["ds2","O destino de Wanda e o Darkhold pesam sobre a série.",true]] },

    { id:"ca4", b:17, col:"cap", ph:5, y:2025, t:"filme",
      sh:"Admirável Mundo Novo", pt:"Capitão América: Admirável Mundo Novo",
      or:"Captain America: Brave New World", wh:"2026",
      syn:"Sam Wilson, agora Capitão América sem soro, se vê no meio de um incidente internacional envolvendo o presidente Thaddeus Ross e o adamantium da Ilha Celestial. Costura pontas soltas do Incrível Hulk e dos Eternos.",
      next:[], req:[
        ["fws","Sam assume o escudo nessa série; é o pré-requisito absoluto.",true],
        ["hulk","Ross, Samuel Sterns e o Líder voltam depois de quinze anos.",true],
        ["eter","A “Ilha Celestial” é o corpo de Tiamut, emergido no fim de Eternos.",true],
        ["bwid","Ross e a política dos Acordos ganham camada aqui.",false]] },

    { id:"tbolts", b:17, col:"cap", ph:5, y:2025, t:"filme",
      sh:"Thunderbolts*", pt:"Thunderbolts*", or:"Thunderbolts*", wh:"2026",
      syn:"Valentina reúne antivilões descartáveis — Yelena, Treinador, Fantasma, Guardião Vermelho, John Walker — numa missão feita para matá-los. O grupo termina rebatizado como Novos Vingadores.",
      next:[], req:[
        ["bwid","Yelena, Treinador e Guardião Vermelho vêm todos daqui.",true],
        ["fws","John Walker e a Condessa Valentina são apresentados nessa série.",true],
        ["ant2","Fantasma vem de Homem-Formiga e a Vespa.",true],
        ["hawk","O acerto de contas de Yelena passa por essa série.",false]] },

    { id:"iheart", b:17, col:"iron", ph:5, y:2025, t:"série",
      sh:"Coração de Ferro", pt:"Coração de Ferro", or:"Ironheart", wh:"2026",
      syn:"Riri Williams volta a Chicago querendo construir a melhor armadura já feita e acaba se aliando ao Capuz, que traz magia negra para a equação. É a ponte entre o legado tecnológico de Stark e o oculto.",
      next:[], req:[
        ["bp2","Riri é apresentada em Wakanda Para Sempre e a armadura vem de lá.",true],
        ["im1","O legado de Stark é o espelho da personagem em cada cena.",false]] },

    { id:"dd", b:17, col:"novos", ph:5, y:2025, t:"série",
      sh:"Demolidor: Renascido", pt:"Demolidor: Renascido", or:"Daredevil: Born Again", wh:"2026",
      syn:"Matt Murdock voltou ao direito e Wilson Fisk foi eleito prefeito de Nova York — os dois tentando fingir que mudaram. Traz o tom adulto da Netflix para dentro da continuidade oficial.",
      next:[], req:[
        ["shulk","Matt aparece no MCU oficialmente nessa série.",true],
        ["echo","O império do Kingpin e o estado dele vêm de Echo.",true],
        ["sm3","Matt reaparece como advogado do Peter.",false]] },

    { id:"ff", b:18, col:"novos", ph:6, y:2025, t:"filme",
      sh:"Quarteto Fantástico", pt:"Quarteto Fantástico: Primeiros Passos",
      or:"The Fantastic Four: First Steps", wh:"Universo paralelo, anos 1960",
      syn:"A primeira família da Marvel enfrenta Galactus e o Surfista Prateado num universo retrofuturista próprio. Pode ser visto quase sozinho — e é a porta de entrada para Doomsday.",
      next:["dooms"], req:[["loki2","O filme se passa em outra linha do tempo; as regras do Multiverso ajudam.",false]] },

    { id:"xmen97", b:18, col:"alt", ph:null, y:2024, t:"série",
      sh:"X-Men '97", pt:"X-Men '97", or:"X-Men '97", wh:"Universo alternativo",
      syn:"Continuação direta do desenho de 1992, fora da continuidade dos filmes. Está aqui porque o público do MCU foi orientado a assisti-la antes de Doomsday.",
      next:[], req:[] },

    { id:"sm4", b:19, col:"spider", ph:6, y:2026, t:"filme",
      sh:"Um Novo Dia", pt:"Homem-Aranha: Um Novo Dia", or:"Spider-Man: Brand New Day", wh:"2026",
      syn:"Peter recomeça do zero, sem que ninguém saiba quem ele é, num Nova York que mudou. Retoma o fio deixado no fim de Sem Volta Para Casa.",
      next:[], req:[
        ["sm3","Peter foi apagado da memória de todos ali; é o ponto de partida.",true],
        ["dd","Matt Murdock continua na órbita do personagem.",false]] },

    { id:"dooms", b:19, col:"aven", ph:6, y:2026, t:"filme",
      sh:"Doomsday", pt:"Vingadores: Doomsday", or:"Avengers: Doomsday", wh:"2026 – ?",
      syn:"O evento que junta Vingadores, Thunderbolts, Quarteto Fantástico e os X-Men da Fox contra o Doutor Destino. É o Guerra Infinita da Saga do Multiverso.",
      next:["swars"], req:[
        ["av4","O Blip, a morte de Tony e o fim da Saga do Infinito são o alicerce de tudo que este filme cobra.",true],
        ["loki2","O Multiverso instável é a premissa do filme.",true],
        ["ff","O Quarteto e o Destino entram por aqui.",true],
        ["tbolts","Os Novos Vingadores formados ali são parte do time.",true],
        ["ca4","Sam lidera os Vingadores a partir desse filme.",true],
        ["dpool","A ponte com o universo da Fox é construída aqui.",false],
        ["ds2","América Chavez e o custo do Multiverso importam.",false],
        ["sm4","O filme do Peter apresenta Jean Grey e amarra o Homem-Aranha à trama dos X-Men que Doomsday reúne.",false]] },

    { id:"swars", b:20, col:"aven", ph:6, y:2027, t:"filme",
      sh:"Guerras Secretas", pt:"Vingadores: Guerras Secretas", or:"Avengers: Secret Wars", wh:"?",
      syn:"O fecho anunciado da Saga do Multiverso, onde realidades colidem e algo novo nasce do que sobrar. É o Ultimato desta saga.",
      next:[], req:[["dooms","É a segunda metade da mesma história. Estritamente obrigatório.",true]] }
  ];

  global.MCU = { COLS, BEATS, SAGAS, SAGA_DE, STRICT, TITLES };
})(window);
