/* ============================================================
   Confere assets/js/data.js antes de você publicar.

   Rode com:  node validar.js      (ou dê dois cliques em validar.bat)

   Ele aponta erro de digitação, ligação para um título que não existe,
   seta apontando para trás no tempo e campo faltando — as coisas que
   quebram o desenho silenciosamente.
   ============================================================ */
"use strict";

const path = require("path");
global.window = global;

const DIR = path.join(__dirname, "assets", "js");
try {
  require(path.join(DIR, "data.js"));
  require(path.join(DIR, "layout.js"));
} catch (e) {
  /* erro de sintaxe: o Node guarda arquivo e linha no stack, e é essa a
     informação que resolve o problema — a mensagem sozinha não diz onde */
  const local = (e.stack || "").match(/([^\\/\n]+\.js):(\d+)/);
  console.log("");
  console.log("  1 ERRO(S) — corrija antes de publicar:");
  console.log("    - " + (local
    ? "erro de escrita em " + local[1] + ", linha " + local[2] + ": " + e.message +
      ". Quase sempre e' virgula, aspas ou colchete faltando."
    : "nao consegui ler os dados: " + e.message));
  console.log("");
  process.exit(1);
}

const { COLS, BEATS, SAGAS, STRICT, TITLES } = window.MCU;
const LX = window.MCULayout;

const erros = [];
const avisos = [];
const erro = m => erros.push(m);
const aviso = m => avisos.push(m);

const by = {};
const colunas = new Set(COLS.map(c => c[0]));
const TIPOS = new Set(["filme", "série", "especial"]);

/* Rotulo do periodo à prova de b invalido: sem isso o proprio validador
   quebra ao tentar descrever o erro que acabou de encontrar. */
const periodo = n => (BEATS[n.b] ? BEATS[n.b][0] : "periodo invalido b=" + n.b);
const temPeriodo = n => typeof n.b === "number" && !!BEATS[n.b];

try {
/* ---------- 1. cada titulo isolado ---------- */
TITLES.forEach((n, i) => {
  const onde = n.id ? '"' + n.id + '"' : "titulo na posicao " + (i + 1);

  if (!n.id) erro(onde + ": falta o campo id");
  else if (by[n.id]) erro('id repetido: "' + n.id + '" aparece duas vezes');
  else by[n.id] = n;

  ["sh", "pt", "or", "wh", "syn"].forEach(k => {
    if (!n[k] || !String(n[k]).trim()) erro(onde + ": o campo " + k + " esta vazio");
  });

  if (!colunas.has(n.col)) {
    erro(onde + ': a coluna "' + n.col + '" nao existe. Use uma destas: ' +
         [...colunas].join(", "));
  }
  if (typeof n.b !== "number" || !BEATS[n.b]) {
    erro(onde + ": o periodo b=" + n.b + " nao existe. Vao de 0 a " + (BEATS.length - 1) +
         " (0 = " + BEATS[0][0] + ", " + (BEATS.length - 1) + " = " + BEATS[BEATS.length - 1][0] + ")");
  }
  if (n.ph !== null && !(n.ph >= 1 && n.ph <= 6)) {
    erro(onde + ": fase " + n.ph + " invalida. Use 1 a 6, ou null se estiver fora da continuidade");
  }
  if (!TIPOS.has(n.t)) {
    erro(onde + ': tipo "' + n.t + '" invalido. Use: filme, série ou especial');
  }
  if (typeof n.y !== "number") erro(onde + ": o ano y precisa ser um numero");
  if (n.sh && n.sh.length > 30) {
    aviso(onde + ': o nome curto tem ' + n.sh.length + ' caracteres e pode ser cortado no card ("' + n.sh + '")');
  }
});

/* ---------- 2. ligacoes ---------- */
TITLES.forEach(n => {
  if (!n.id) return;

  (n.next || []).forEach(alvo => {
    if (!by[alvo]) {
      return erro('"' + n.id + '" continua em "' + alvo + '", que nao existe. Erro de digitacao?');
    }
    if (temPeriodo(n) && temPeriodo(by[alvo]) && by[alvo].b < n.b) {
      erro('"' + n.id + '" (' + periodo(n) + ') continua em "' + alvo + '" (' +
           periodo(by[alvo]) + '), que acontece antes. As setas so podem descer no tempo');
    }
  });

  (n.req || []).forEach((r, i) => {
    if (!Array.isArray(r) || r.length < 3) {
      return erro('"' + n.id + '": o pre-requisito na posicao ' + (i + 1) +
                  ' precisa ter 3 partes: ["id", "motivo", true ou false]');
    }
    const [alvo, motivo, obrig] = r;
    if (!by[alvo]) {
      return erro('"' + n.id + '" depende de "' + alvo + '", que nao existe. Erro de digitacao?');
    }
    if (temPeriodo(n) && temPeriodo(by[alvo]) && by[alvo].b > n.b) {
      erro('"' + n.id + '" (' + periodo(n) + ') depende de "' + alvo + '" (' +
           periodo(by[alvo]) + '), que acontece depois. Inverta a ligacao');
    }
    if (!motivo || !String(motivo).trim()) {
      erro('"' + n.id + '" depende de "' + alvo + '" sem explicar o motivo. ' +
           'O motivo aparece na linha pontilhada e no dossie');
    }
    if (typeof obrig !== "boolean") {
      erro('"' + n.id + '" -> "' + alvo + '": o terceiro valor tem de ser true (obrigatorio) ' +
           'ou false (ajuda a entender). Veio: ' + JSON.stringify(obrig));
    }
    if (alvo === n.id) erro('"' + n.id + '" depende de si mesmo');
  });
});

/* ---------- 3. STRICT ---------- */
(STRICT || []).forEach(k => {
  const p = k.split(">");
  if (p.length !== 2) return erro('STRICT: "' + k + '" deveria ser "origem>destino"');
  const [a, b] = p;
  if (!by[a] || !by[b]) {
    return erro('STRICT: "' + k + '" cita um titulo que nao existe');
  }
  const existe = (by[a].next || []).includes(b) ||
                 (by[b].req || []).some(r => r[0] === a);
  if (!existe) {
    erro('STRICT: "' + k + '" nao corresponde a nenhuma ligacao declarada. ' +
         'Crie a ligacao primeiro, no next de "' + a + '" ou no req de "' + b + '"');
  }
});

} catch (e) {
  erro("nao consegui terminar a conferencia: " + e.message +
       ". Costuma ser virgula ou colchete faltando em data.js");
}

/* ---------- 4. o desenho fecha? ---------- */
let R = null;
if (!erros.length) {
  try {
    const colIndex = {};
    COLS.forEach((c, i) => { colIndex[c[0]] = i; });
    const g = LX.graph(TITLES, STRICT);
    R = LX.build(TITLES, g.edges, g.preds, {
      nCols: COLS.length, colIndex,
      cardW: 136, cardH: 80, gapV: 24, gapH: 32,
      padH: 9, padV: 8, stepH: 6, stepV: 6
    });

    /* nenhuma linha pode passar por cima de um card */
    let porCima = 0;
    const caixas = TITLES.map(n => ({ id: n.id, x: R.pos[n.id].x, y: R.pos[n.id].y, w: 136, h: 80 }));
    g.edges.forEach(e => {
      for (let i = 1; i < e.pts.length; i++) {
        const [x1, y1] = e.pts[i - 1], [x2, y2] = e.pts[i];
        const lo = { x: Math.min(x1, x2), y: Math.min(y1, y2) };
        const hi = { x: Math.max(x1, x2), y: Math.max(y1, y2) };
        caixas.forEach(c => {
          if (c.id === e.a || c.id === e.b) return;
          if (Math.min(hi.x, c.x + c.w) - Math.max(lo.x, c.x) > 1.5 &&
              Math.min(hi.y, c.y + c.h) - Math.max(lo.y, c.y) > 1.5) porCima++;
        });
      }
    });
    if (porCima) erro(porCima + " trecho(s) de linha passando por cima de um card");

    const retas = g.edges.filter(e => e.pts.length === 2).length;
    console.log("");
    console.log("  " + TITLES.length + " titulos  ·  " + g.edges.length + " ligacoes  ·  " +
                R.rows + " linhas no diagrama");
    console.log("  " + retas + " ligacoes em linha reta  ·  desenho de " +
                Math.round(R.geom.totalW) + " x " + Math.round(R.geom.totalH) + " px");
    const porFase = [1, 2, 3, 4, 5, 6].map(f =>
      "F" + f + ": " + TITLES.filter(n => n.ph === f).length).join("   ");
    console.log("  " + porFase + "   fora das sagas: " + TITLES.filter(n => n.ph === null).length);
  } catch (e) {
    erro("o desenho nao fechou: " + e.message);
  }
}

/* ---------- resultado ---------- */
console.log("");
if (avisos.length) {
  console.log("  AVISOS (nao impedem publicar)");
  avisos.forEach(a => console.log("    - " + a));
  console.log("");
}
if (erros.length) {
  console.log("  " + erros.length + " ERRO(S) — corrija antes de publicar:");
  erros.forEach(e => console.log("    - " + e));
  console.log("");
  process.exit(1);
}
console.log("  TUDO CERTO. Pode publicar.");
console.log("");
