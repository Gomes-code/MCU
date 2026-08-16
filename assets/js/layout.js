/* ============================================================
   CRONOLOGIA MCU — motor de layout

   Duas etapas independentes:

   1. CAMADAS  (layer)
      Cada título sobe para a primeira linha possível dentro do seu período,
      respeitando duas regras: nenhuma seta pode apontar para cima, e dois
      títulos da mesma franquia não dividem linha. Isso compacta o diagrama
      e garante que toda aresta desça pelo menos uma linha — o que elimina
      de saída o caso mais difícil de rotear (ligação horizontal).

   2. ROTEAMENTO  (route)
      Todo caminho é ortogonal e usa só três tipos de trecho:
        · vertical dentro da coluna, na faixa vazia acima/abaixo do card
        · horizontal num corredor entre duas linhas
        · vertical num corredor entre duas colunas
      Como corredores nunca contêm cards, nenhuma linha atravessa um card.
      Dentro de cada corredor as arestas recebem faixas distintas por
      coloração de intervalos: dois trechos paralelos só compartilham faixa
      se não se cruzarem. Os corredores crescem conforme a demanda.
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- alocador de faixas dentro de um corredor ---------- */
  function Alloc() { this.lanes = []; }

  Alloc.prototype._fits = function (i, lo, hi) {
    const iv = this.lanes[i];
    for (let k = 0; k < iv.length; k++) {
      if (!(hi < iv[k][0] || lo > iv[k][1])) return false;
    }
    return true;
  };
  /* menor faixa livre para o intervalo, sem reservar */
  Alloc.prototype.probe = function (a, b, pad) {
    const lo = Math.min(a, b) - pad, hi = Math.max(a, b) + pad;
    for (let i = 0; i < this.lanes.length; i++) if (this._fits(i, lo, hi)) return i;
    return this.lanes.length;
  };
  /* menor faixa livre, reservando o intervalo */
  Alloc.prototype.take = function (a, b, pad) {
    const lo = Math.min(a, b) - pad, hi = Math.max(a, b) + pad;
    for (let i = 0; i < this.lanes.length; i++) {
      if (this._fits(i, lo, hi)) { this.lanes[i].push([lo, hi]); return i; }
    }
    this.lanes.push([[lo, hi]]);
    return this.lanes.length - 1;
  };
  Alloc.prototype.size = function () { return this.lanes.length; };

  /* ---------- 1. camadas ---------- */

  /* ordena um período topologicamente para que um pré-requisito do mesmo
     período seja sempre posicionado antes de quem depende dele */
  function topoWithin(list, preds) {
    const ids = new Set(list.map(n => n.id));
    const indeg = {}, adj = {}, byId = {};
    list.forEach(n => { indeg[n.id] = 0; adj[n.id] = []; byId[n.id] = n; });
    list.forEach(n => (preds[n.id] || []).forEach(p => {
      if (ids.has(p)) { adj[p].push(n.id); indeg[n.id]++; }
    }));
    const q = list.filter(n => indeg[n.id] === 0).map(n => n.id);
    const out = [], done = new Set();
    while (q.length) {
      const id = q.shift();
      out.push(byId[id]); done.add(id);
      adj[id].forEach(m => { if (--indeg[m] === 0) q.push(m); });
    }
    list.forEach(n => { if (!done.has(n.id)) out.push(n); });
    return out;
  }

  function layer(titles, preds) {
    const byBeat = new Map();
    titles.forEach(n => {
      if (!byBeat.has(n.b)) byBeat.set(n.b, []);
      byBeat.get(n.b).push(n);
    });
    const beats = [...byBeat.keys()].sort((a, b) => a - b);
    const row = {}, taken = new Set(), beatRows = {};
    let floor = 0;

    beats.forEach(b => {
      let maxR = floor - 1;
      topoWithin(byBeat.get(b), preds).forEach(n => {
        let r = floor;
        (preds[n.id] || []).forEach(p => {
          if (row[p] !== undefined) r = Math.max(r, row[p] + 1);
        });
        while (taken.has(r + "|" + n.col)) r++;
        row[n.id] = r;
        taken.add(r + "|" + n.col);
        if (r > maxR) maxR = r;
      });
      beatRows[b] = [floor, maxR];
      floor = maxR + 1;
    });

    return { row: row, beatRows: beatRows, rows: floor };
  }

  /* ---------- 2. geometria ---------- */

  /* colX[c] = x da coluna c ; gapL[i] = x onde começa o corredor i
     corredor vertical i fica à esquerda da coluna i (i = nCols → após a última) */
  function measure(nCols, rows, cardW, cardH, vgap, hgap) {
    const colX = [], gapL = [];
    let x = 0;
    for (let c = 0; c < nCols; c++) {
      gapL[c] = x; x += vgap[c];
      colX[c] = x; x += cardW;
    }
    gapL[nCols] = x;
    const totalW = x + vgap[nCols];

    const rowY = [], gTop = [];
    let y = 0;
    for (let r = 0; r < rows; r++) {
      gTop[r] = y; y += hgap[r];
      rowY[r] = y; y += cardH;
    }
    gTop[rows] = y;
    const totalH = y + hgap[rows];

    return { colX, gapL, rowY, gTop, totalW, totalH };
  }

  /* ---------- portas de saída e entrada ---------- */
  const PORT_MIN = 7;   /* afastamento mínimo entre duas portas, em px */

  function ports(titles, edges, pos, cardW, cellAt) {
    const outs = {}, ins = {};
    edges.forEach(e => {
      (outs[e.a] = outs[e.a] || []).push(e);
      (ins[e.b] = ins[e.b] || []).push(e);
    });
    /* Uma ligação de cada card é a principal e sai/entra pelo centro; as
       outras se distribuem ao redor. Quando os dois cards elegem a mesma
       ligação — o caso comum de uma sequência na mesma coluna — as duas portas
       caem no mesmo x e o traço vira uma reta, sem degrau. */
    const cmp = (a, b) => {
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
      return 0;
    };
    /* elege a ligação principal: mesma coluna primeiro, depois continuação
       declarada, depois a mais próxima na vertical */
    const anchorOf = (arr, id, other) => {
      const me = pos[id];
      let best = null, bestKey = null;
      arr.filter(e => e.kind !== "dep").forEach(e => {
        const o = pos[e[other]];
        const key = [Math.abs(o.c - me.c), Math.abs(o.r - me.r), e.isNext ? 0 : 1];
        if (!best || cmp(key, bestKey) < 0) { best = e; bestKey = key; }
      });
      return best;
    };
    /* espalha uma lista de arestas numa faixa [a, b] da largura do card */
    const spread = (list, x0, a, b, key) => {
      const n = list.length;
      if (!n) return;
      if (n === 1) { list[0][key] = x0 + cardW * (a + b) / 2; return; }
      list.forEach((e, i) => { e[key] = x0 + cardW * (a + (b - a) * i / (n - 1)); });
    };

    const assign = (map, other, key) => {
      Object.keys(map).forEach(id => {
        const arr = map[id].sort((p, q) =>
          (pos[p[other]].x - pos[q[other]].x) || (p[other] < q[other] ? -1 : 1));
        const x0 = pos[id].x;
        const anchor = anchorOf(arr, id, other);
        if (!anchor) {
          const n = arr.length;
          arr.forEach((e, i) => { e[key] = x0 + cardW * (i + 1) / (n + 1); });
          return;
        }
        anchor[key] = x0 + cardW * 0.5;
        const rest = arr.filter(e => e !== anchor);
        const mine = pos[id].x;
        spread(rest.filter(e => pos[e[other]].x < mine), x0, 0.10, 0.38, key);
        spread(rest.filter(e => pos[e[other]].x >= mine), x0, 0.62, 0.90, key);
      });
    };
    assign(outs, "b", "px");
    assign(ins, "a", "qx");

    /* Quando dois cards da mesma franquia ficam em linhas vizinhas, as saídas
       do de cima e as entradas do de baixo dividem o mesmo corredor. Se uma
       porta de saída cair no mesmo x de uma de entrada, os dois trechos
       verticais se sobrepõem. Aqui as entradas são realocadas numa grade fina
       que evita as saídas de cima e as demais entradas. */
    titles.forEach(A => {
      const pa = pos[A.id];
      const belowId = cellAt[(pa.r + 1) + "|" + pa.c];
      if (!belowId) return;
      const arriving = ins[belowId] || [];
      const leaving = outs[A.id] || [];
      if (!arriving.length || !leaving.length) return;

      /* A ligação que vai de A direto para o card de baixo não entra na conta:
         ali as duas portas coincidirem é o objetivo, não um conflito — é o que
         transforma o traço numa reta contínua. */
      const direta = arriving.find(e => e.a === A.id);
      const x0 = pos[belowId].x;
      const blocked = leaving.filter(e => e !== direta).map(e => e.px);
      const slots = [];
      const total = arriving.length + leaving.length + 1;
      for (let k = 1; k <= total; k++) slots.push(x0 + cardW * k / (total + 1));

      const used = direta ? [direta.qx] : [];
      arriving.forEach(e => {
        if (e === direta) return;                        /* mantém a reta */
        const free = slots.filter(s =>
          blocked.every(x => Math.abs(x - s) >= PORT_MIN) &&
          used.every(x => Math.abs(x - s) >= PORT_MIN));
        if (!free.length) return;                       /* mantém a posição atual */
        let pick = free[0];
        for (const s of free) if (Math.abs(s - e.qx) < Math.abs(pick - e.qx)) pick = s;
        e.qx = pick;
        used.push(pick);
      });
    });
  }

  /* ---------- roteamento ---------- */
  /* Cada corredor horizontal é dividido em três zonas empilhadas:

       gTop ┄┄ SAÍDA   trechos que descem de um card da linha de cima
            ┄┄ DEGRAU  ligações entre linhas vizinhas
       gBot ┄┄ ENTRADA trechos que sobem para um card da linha de baixo

     A ordem importa: o trecho vertical que desce de um card cruza tudo o que
     está acima da sua faixa, e o que sobe para um card cruza tudo o que está
     abaixo. Com as zonas nesta ordem, descidas e subidas nunca se encontram. */
  function route(edges, pos, G, cfg, nCols, rows, cellAt) {
    /* Quando os dois cards estão na mesma coluna, as portas coincidem e não há
       nenhum card entre eles, o caminho é um traço reto de ponta a ponta — sem
       corredor e sem degrau. É o desenho mais legível possível para uma
       sequência direta, e é o que o olho espera ver. */
    const reta = new Set();
    const colBusy = {};
    edges.forEach(e => {
      const A = pos[e.a], B = pos[e.b];
      if (A.c !== B.c || Math.abs(e.px - e.qx) > 0.6) return;
      for (let r = A.r + 1; r < B.r; r++) if (cellAt[r + "|" + A.c]) return;
      /* duas retas na mesma coluna não podem dividir o mesmo x */
      const lane = (colBusy[A.c] = colBusy[A.c] || new Alloc());
      const y1 = A.y + cfg.cardH, y2 = B.y;
      if (lane.probe(y1, y2, 2) !== 0) return;
      lane.take(y1, y2, 2);
      reta.add(e.key);
    });

    const hOut = [], hMid = [], hIn = [], vCh = [];
    for (let i = 0; i <= rows; i++) {
      hOut[i] = new Alloc(); hMid[i] = new Alloc(); hIn[i] = new Alloc();
    }
    for (let i = 0; i <= nCols; i++) vCh[i] = new Alloc();

    const gapMid = i => G.gapL[i] + (i === nCols
      ? (G.totalW - G.gapL[i]) / 2
      : (G.colX[i] - G.gapL[i]) / 2);

    /* saltos curtos primeiro: ficam nas faixas internas, perto dos cards,
       e os longos se acomodam por fora — menos cruzamentos */
    const order = edges.slice().sort((e1, e2) => {
      const d1 = pos[e1.b].r - pos[e1.a].r, d2 = pos[e2.b].r - pos[e2.a].r;
      return d1 - d2 || Math.abs(e1.px - e1.qx) - Math.abs(e2.px - e2.qx);
    });

    /* passe A — escolhe o corredor vertical de cada salto longo.
       O intervalo reservado é o trecho inteiro entre os dois cards: é
       conservador, porém garante que dois fios verticais não se sobreponham. */
    order.forEach(e => {
      const A = pos[e.a], B = pos[e.b];
      if (reta.has(e.key)) {
        e.pts = [[e.px, A.y + cfg.cardH], [e.qx, B.y]];
        e.straight = true;
        return;
      }
      e.long = (B.r - A.r) >= 2;
      if (!e.long) return;
      const ay = A.y + cfg.cardH, by = B.y;
      const cA = A.c, cB = B.c;
      const cands = cA === cB ? [cA, cA + 1]
        : (cB > cA ? [cB, cA + 1] : [cB + 1, cA]);
      let best = null;
      cands.forEach(gi => {
        if (gi < 0 || gi > nCols) return;
        const lane = vCh[gi].probe(ay, by, 6);
        if (!best || lane < best.lane) best = { gi: gi, lane: lane };
      });
      e.gi = best.gi;
      e.vLane = vCh[e.gi].take(ay, by, 6);
      e.vx = G.gapL[e.gi] + cfg.padV + e.vLane * cfg.stepV;
    });

    /* passe B — saltos longos: zona de saída no topo, de entrada no fundo */
    order.forEach(e => {
      if (e.straight || !e.long) return;
      const A = pos[e.a], B = pos[e.b];
      const ay = A.y + cfg.cardH, by = B.y;
      const gO = A.r + 1, gI = B.r;
      const lo = hOut[gO].take(e.px, e.vx, 5);
      const li = hIn[gI].take(e.vx, e.qx, 5);
      const hy1 = G.gTop[gO] + cfg.padH + lo * cfg.stepH;
      const hy2 = G.rowY[B.r] - cfg.padH - li * cfg.stepH;
      e.pts = [[e.px, ay], [e.px, hy1], [e.vx, hy1], [e.vx, hy2], [e.qx, hy2], [e.qx, by]];
    });

    /* passe C — linhas vizinhas, na zona do meio (já sabemos a altura da de saída) */
    order.forEach(e => {
      if (e.straight || e.long) return;
      const A = pos[e.a], B = pos[e.b];
      const ay = A.y + cfg.cardH, by = B.y;
      const g = A.r + 1;
      if (Math.abs(e.px - e.qx) < 0.6) { e.pts = [[e.px, ay], [e.qx, by]]; return; }
      const lane = hMid[g].take(e.px, e.qx, 5);
      const hy = G.gTop[g] + cfg.padH + (hOut[g].size() + lane) * cfg.stepH;
      e.pts = [[e.px, ay], [e.px, hy], [e.qx, hy], [e.qx, by]];
    });

    return {
      hOut: hOut.map(a => a.size()),
      hMid: hMid.map(a => a.size()),
      hIn: hIn.map(a => a.size()),
      vCh: vCh.map(a => a.size())
    };
  }

  /* ---------- ciclo completo: dimensiona corredores conforme a demanda ---------- */
  function build(titles, edges, preds, cfg) {
    const nCols = cfg.nCols;
    const lay = layer(titles, preds);
    const rows = lay.rows;

    /* demanda de faixas acumulada entre passes — monotônica, então converge */
    const needH = new Array(rows + 1).fill(0);
    const needV = new Array(nCols + 1).fill(0);
    let G, pos, used;

    for (let pass = 0; pass < 3; pass++) {
      const hgap = [], vgap = [];
      for (let i = 0; i <= rows; i++) {
        hgap[i] = Math.max(cfg.gapH, 2 * cfg.padH + needH[i] * cfg.stepH);
      }
      for (let i = 0; i <= nCols; i++) {
        vgap[i] = Math.max(cfg.gapV, 2 * cfg.padV + needV[i] * cfg.stepV);
      }
      G = measure(nCols, rows, cfg.cardW, cfg.cardH, vgap, hgap);

      pos = {};
      const cellAt = {};
      titles.forEach(n => {
        const r = lay.row[n.id], c = cfg.colIndex[n.col];
        pos[n.id] = { x: G.colX[c], y: G.rowY[r], r: r, c: c };
        cellAt[r + "|" + c] = n.id;
      });

      edges.forEach(e => { e.straight = false; e.long = false; });
      ports(titles, edges, pos, cfg.cardW, cellAt);
      used = route(edges, pos, G, cfg, nCols, rows, cellAt);

      let grew = false;
      for (let i = 0; i <= rows; i++) {
        const n = (used.hOut[i] || 0) + (used.hMid[i] || 0) + (used.hIn[i] || 0);
        if (n > needH[i]) { needH[i] = n; grew = true; }
      }
      for (let i = 0; i <= nCols; i++) {
        if ((used.vCh[i] || 0) > needV[i]) { needV[i] = used.vCh[i]; grew = true; }
      }
      if (!grew) break;
    }

    return {
      rows: rows, row: lay.row, beatRows: lay.beatRows,
      pos: pos, geom: G, lanes: used
    };
  }

  /* ---------- polilinha → path SVG com cantos arredondados ---------- */
  function tidy(pts) {
    const a = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i], q = a[a.length - 1];
      if (Math.abs(p[0] - q[0]) < 0.6 && Math.abs(p[1] - q[1]) < 0.6) continue;
      a.push(p);
    }
    if (a.length < 3) return a;
    const b = [a[0]];
    for (let i = 1; i < a.length - 1; i++) {
      const p0 = b[b.length - 1], p1 = a[i], p2 = a[i + 1];
      const cross = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
      if (Math.abs(cross) < 0.6) continue;   /* colinear: o meio é dispensável */
      b.push(p1);
    }
    b.push(a[a.length - 1]);
    return b;
  }

  function path(pts, radius) {
    const p = tidy(pts);
    if (p.length < 2) return "";
    let d = "M" + r1(p[0][0]) + " " + r1(p[0][1]);
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1];
      const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const rr = Math.min(radius, d1 / 2, d2 / 2);
      const ax = b[0] + (a[0] - b[0]) / d1 * rr, ay = b[1] + (a[1] - b[1]) / d1 * rr;
      const cx = b[0] + (c[0] - b[0]) / d2 * rr, cy = b[1] + (c[1] - b[1]) / d2 * rr;
      d += " L" + r1(ax) + " " + r1(ay) +
           " Q" + r1(b[0]) + " " + r1(b[1]) + " " + r1(cx) + " " + r1(cy);
    }
    const last = p[p.length - 1];
    return d + " L" + r1(last[0]) + " " + r1(last[1]);
  }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* ---------- grafo derivado dos dados ----------
     Duas passadas independentes, para que a ordem em que os títulos aparecem
     no arquivo de dados nunca altere o resultado:
       1ª  continuações diretas
       2ª  dependências — se a seta já existe, apenas empresta o motivo a ela
     Uma aresta listada em STRICT vira "inseparável" (linha grossa). */
  function graph(titles, strict) {
    const by = {};
    titles.forEach(n => { by[n.id] = n; });
    const S = new Set(strict || []);
    const edges = [], index = {}, preds = {}, needed = {}, prevOf = {};
    titles.forEach(n => { preds[n.id] = []; needed[n.id] = []; });

    titles.forEach(n => (n.next || []).forEach(id => {
      if (!by[id]) return;
      const k = n.id + ">" + id;
      if (k in index) return;
      index[k] = edges.length;
      edges.push({ a: n.id, b: id, kind: S.has(k) ? "hard" : "seq", why: null, key: k, isNext: true });
      preds[id].push(n.id);
      prevOf[id] = n.id;
    }));

    titles.forEach(n => (n.req || []).forEach(r => {
      const id = r[0], why = r[1], hard = !!r[2];
      if (!by[id]) return;
      needed[id].push([n.id, why, hard]);
      const k = id + ">" + n.id;
      if (k in index) {
        const e = edges[index[k]];
        if (!e.why) e.why = why;
        return;
      }
      index[k] = edges.length;
      edges.push({ a: id, b: n.id, kind: S.has(k) ? "hard" : "dep", why: why, key: k });
      preds[n.id].push(id);
    }));

    return { edges: edges, preds: preds, needed: needed, prevOf: prevOf, byId: by };
  }

  global.MCULayout = { build: build, path: path, layer: layer, graph: graph };
})(window);
