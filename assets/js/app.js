/* ============================================================
   CRONOLOGIA MCU — interface
   Depende de data.js (window.MCU) e layout.js (window.MCULayout).
   ============================================================ */
(function () {
  "use strict";

  const { COLS, BEATS, STONES, STRICT, TITLES } = window.MCU;
  const LX = window.MCULayout;
  const NS = "http://www.w3.org/2000/svg";
  const $ = id => document.getElementById(id);

  const colIndex = {}, colName = {};
  COLS.forEach((c, i) => { colIndex[c[0]] = i; colName[c[0]] = c[1]; });

  const G = LX.graph(TITLES, STRICT);
  const { edges, preds, needed, prevOf, byId } = G;
  const phColor = n => "var(--p" + (n.ph || 0) + ")";
  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* três níveis de densidade; o card fica menor, não borrado */
  const DENS = [
    { name: "Padrão",   cardW: 176, cardH: 92,  gapV: 38, gapH: 46, stepH: 9,   stepV: 10, font: 15.5 },
    { name: "Compacta", cardW: 142, cardH: 78,  gapV: 30, gapH: 36, stepH: 7.5, stepV: 8,  font: 13.5 },
    { name: "Ampla",    cardW: 208, cardH: 104, gapV: 46, gapH: 56, stepH: 10,  stepV: 12, font: 17 }
  ];
  let dens = 0;

  const stage = $("stage"), canvas = $("canvas"), heads = $("headsSlide"),
        rail = $("railSlide"), tip = $("tip");
  const cards = {}, dots = {};
  let wires = null, R = null, cfg = null;

  /* ---------------- cards ---------------- */
  const ICO_CHK = '<svg viewBox="0 0 24 24"><path d="M4 12.5 9 17.5 20 6.5"/></svg>';

  function mline(n) {
    const bits = [];
    const rq = (n.req || []).map(r => byId[r[0]] && byId[r[0]].sh).filter(Boolean);
    const nx = (n.next || []).map(i => byId[i] && byId[i].sh).filter(Boolean);
    if (rq.length) bits.push("<span><b>antes</b> " + rq.join(" · ") + "</span>");
    if (nx.length) bits.push("<span><b>depois</b> " + nx.join(" · ") + "</span>");
    return bits.length ? '<div class="mline">' + bits.join("") + "</div>" : "";
  }

  const seen = new Set(JSON.parse(localStorage.getItem("mcu.seen") || "[]"));

  function buildCards() {
    TITLES.forEach(n => {
      const b = document.createElement("button");
      b.className = "node pre";
      b.dataset.id = n.id;
      b.style.setProperty("--pc", phColor(n));
      if (seen.has(n.id)) b.classList.add("seen");
      b.innerHTML =
        '<div class="meta"><span class="ph">' + (n.ph ? "F" + n.ph : "ALT") + "</span>" +
          "<s>·</s><span>" + n.t + "</span><s>·</s><span>" + n.y + "</span></div>" +
        "<h3>" + n.sh + "</h3>" +
        '<div class="when">' + n.wh + "</div>" +
        mline(n) +
        '<span class="seen-btn" title="Marcar como assistido">' + ICO_CHK + "</span>";
      b.addEventListener("click", ev => {
        if (ev.target.closest(".seen-btn")) { toggleSeen(n.id); return; }
        open(n.id);
      });
      b.addEventListener("animationend", () => b.classList.remove("in"));
      canvas.appendChild(b);
      cards[n.id] = b;
    });
  }

  /* ---------------- diagrama ---------------- */
  function markers() {
    const defs = document.createElementNS(NS, "defs");
    ["seq", "hard", "dep"].forEach(k => {
      for (let p = 0; p <= 6; p++) {
        const m = document.createElementNS(NS, "marker");
        m.setAttribute("id", "a-" + k + "-" + p);
        m.setAttribute("viewBox", "0 0 10 10");
        m.setAttribute("refX", "8.6"); m.setAttribute("refY", "5");
        m.setAttribute("markerUnits", "userSpaceOnUse");
        m.setAttribute("markerWidth", k === "dep" ? "8" : "11");
        m.setAttribute("markerHeight", k === "dep" ? "8" : "11");
        m.setAttribute("orient", "auto");
        const t = document.createElementNS(NS, "path");
        t.setAttribute("d", "M0.5 1 L9 5 L0.5 9 Z");
        t.setAttribute("fill", k === "dep" && p === 0 ? "var(--ink3)" : "var(--p" + p + ")");
        m.appendChild(t); defs.appendChild(m);
      }
    });
    return defs;
  }

  function layout() {
    const d = DENS[dens];
    cfg = {
      nCols: COLS.length, colIndex: colIndex,
      cardW: d.cardW, cardH: d.cardH, gapV: d.gapV, gapH: d.gapH,
      padH: 13, padV: 13, stepH: d.stepH, stepV: d.stepV
    };
    R = LX.build(TITLES, edges, preds, cfg);

    const root = document.documentElement.style;
    root.setProperty("--cardW", d.cardW + "px");
    root.setProperty("--cardH", d.cardH + "px");
    canvas.style.setProperty("--nodeFont", d.font + "px");
    canvas.querySelectorAll(".node h3").forEach(h => { h.style.fontSize = d.font + "px"; });

    if (isMobile()) { renderMobile(); return; }

    canvas.style.width = Math.ceil(R.geom.totalW) + "px";
    canvas.style.height = Math.ceil(R.geom.totalH) + "px";

    TITLES.forEach(n => {
      const p = R.pos[n.id], c = cards[n.id];
      c.style.left = p.x + "px";
      c.style.top = p.y + "px";
    });

    paintSwimlanes();
    drawWires();
    buildRail();
    buildHeads();
    buildMap();
    sync();
  }

  function paintSwimlanes() {
    canvas.querySelectorAll(".swim, .band").forEach(e => e.remove());
    const g = R.geom;
    COLS.forEach((c, i) => {
      const el = document.createElement("div");
      el.className = "swim";
      el.style.left = (g.colX[i] - 8) + "px";
      el.style.width = (cfg.cardW + 16) + "px";
      canvas.insertBefore(el, canvas.firstChild);
    });
    /* uma linha tracejada onde a era muda: separa sem pesar */
    let lastEra = null;
    Object.keys(R.beatRows).map(Number).sort((a, b) => a - b).forEach(b => {
      const era = BEATS[b][1];
      if (era === lastEra) return;
      lastEra = era;
      const r = R.beatRows[b][0];
      if (r === 0) return;
      const el = document.createElement("div");
      el.className = "band line";
      el.style.top = (g.gTop[r] + cfg.gapH / 2) + "px";
      el.style.width = Math.ceil(g.totalW) + "px";
      canvas.insertBefore(el, canvas.firstChild);
    });
  }

  function drawWires() {
    if (wires) wires.remove();
    wires = document.createElementNS(NS, "svg");
    wires.setAttribute("class", "wires");
    wires.setAttribute("aria-hidden", "true");
    wires.setAttribute("width", Math.ceil(R.geom.totalW));
    wires.setAttribute("height", Math.ceil(R.geom.totalH));
    wires.appendChild(markers());

    const far = cfg.cardH * 6;
    edges.forEach((e, i) => {
      const d = LX.path(e.pts, dens === 1 ? 5 : 7);
      const ph = byId[e.a].ph || 0;
      const isFar = (R.pos[e.b].y - R.pos[e.a].y) > far;

      const hit = document.createElementNS(NS, "path");
      hit.setAttribute("d", d); hit.setAttribute("class", "hit");
      hit.setAttribute("stroke", "transparent"); hit.setAttribute("stroke-width", "13");
      hit.setAttribute("fill", "none"); hit.dataset.i = i;

      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", "e " + e.kind + (isFar ? " far" : ""));
      p.style.setProperty("--ec", "var(--p" + ph + ")");
      if (e.kind === "dep") {
        p.setAttribute("stroke-dasharray", "5 5");
        p.setAttribute("marker-end", "url(#a-dep-0)");
      } else {
        p.setAttribute("stroke", "var(--p" + ph + ")");
        p.setAttribute("marker-end", "url(#a-" + e.kind + "-" + ph + ")");
      }
      e.el = p; e.hit = hit;
      wires.appendChild(p); wires.appendChild(hit);
    });
    canvas.insertBefore(wires, canvas.querySelector(".node"));
  }

  /* ---------------- régua de tempo e cabeçalho ---------------- */
  function buildRail() {
    rail.textContent = "";
    const g = R.geom;
    let lastEra = null;
    Object.keys(R.beatRows).map(Number).sort((a, b) => a - b).forEach(b => {
      const [r0, r1] = R.beatRows[b];
      const era = BEATS[b][1], newEra = era !== lastEra;
      lastEra = era;

      if (newEra && r0 > 0) {
        const ln = document.createElement("div");
        ln.className = "edge";
        ln.style.top = (g.gTop[r0] + cfg.gapH / 2) + "px";
        rail.appendChild(ln);
      }
      const t = document.createElement("div");
      t.className = "tick" + (newEra ? " era" : "");
      t.dataset.b = b;
      t.style.top = g.rowY[r0] + "px";
      t.innerHTML = "<b>" + BEATS[b][0] + "</b>" + (newEra ? "<i>" + era + "</i>" : "");
      rail.appendChild(t);
    });
    rail.style.height = Math.ceil(g.totalH) + "px";
  }

  function buildHeads() {
    heads.textContent = "";
    const g = R.geom;
    const count = {};
    TITLES.forEach(n => { count[n.col] = (count[n.col] || 0) + 1; });
    COLS.forEach((c, i) => {
      const h = document.createElement("div");
      h.className = "hd";
      h.dataset.col = c[0];
      h.style.left = g.colX[i] + "px";
      h.style.width = cfg.cardW + "px";
      h.innerHTML = c[1] + "<em>" + (count[c[0]] || 0) + "</em>";
      heads.appendChild(h);
    });
    heads.style.width = Math.ceil(g.totalW) + "px";
  }

  function sync() {
    heads.style.transform = "translateX(" + (-stage.scrollLeft) + "px)";
    rail.style.transform = "translateY(" + (-stage.scrollTop) + "px)";
    syncViewport();
    highlightTick();
  }

  function highlightTick() {
    const mid = stage.scrollTop + stage.clientHeight * 0.32;
    let cur = null;
    rail.querySelectorAll(".tick").forEach(t => {
      t.classList.remove("now");
      if (parseFloat(t.style.top) <= mid) cur = t;
    });
    if (cur) cur.classList.add("now");
  }

  /* ---------------- minimapa ---------------- */
  const map = $("map"), mapIn = $("mapIn"), vp = $("vp");
  let MS = 1;

  function buildMap() {
    mapIn.querySelectorAll("b").forEach(b => b.remove());
    const w = mapIn.clientWidth || 100;
    MS = w / R.geom.totalW;
    mapIn.style.height = (R.geom.totalH * MS) + "px";
    TITLES.forEach(n => {
      const p = R.pos[n.id], el = document.createElement("b");
      el.style.cssText =
        "left:" + (p.x * MS) + "px;top:" + (p.y * MS) + "px;" +
        "width:" + Math.max(2, cfg.cardW * MS) + "px;" +
        "height:" + Math.max(1.5, cfg.cardH * MS) + "px";
      el.style.setProperty("--pc", phColor(n));
      dots[n.id] = el;
      mapIn.appendChild(el);
    });
  }
  function syncViewport() {
    vp.style.left = (stage.scrollLeft * MS) + "px";
    vp.style.top = (stage.scrollTop * MS) + "px";
    vp.style.width = (stage.clientWidth * MS) + "px";
    vp.style.height = (stage.clientHeight * MS) + "px";
  }
  function jump(ev) {
    const r = mapIn.getBoundingClientRect();
    stage.scrollTo({
      left: (ev.clientX - r.left) / MS - stage.clientWidth / 2,
      top: (ev.clientY - r.top) / MS - stage.clientHeight / 2,
      behavior: "auto"
    });
  }
  let mdrag = false;
  map.addEventListener("mousedown", e => { mdrag = true; jump(e); e.preventDefault(); });
  addEventListener("mousemove", e => { if (mdrag) jump(e); });
  addEventListener("mouseup", () => { mdrag = false; });

  /* ---------------- versão mobile ---------------- */
  function renderMobile() {
    canvas.querySelectorAll(".mhead").forEach(e => e.remove());
    canvas.style.width = ""; canvas.style.height = "";
    if (wires) wires.remove(), wires = null;
    canvas.querySelectorAll(".swim, .band").forEach(e => e.remove());

    const order = TITLES.slice().sort((a, b) =>
      (a.b - b.b) || (R.row[a.id] - R.row[b.id]) || (colIndex[a.col] - colIndex[b.col]));
    let lastBeat = null;
    order.forEach(n => {
      if (n.b !== lastBeat) {
        lastBeat = n.b;
        const h = document.createElement("div");
        h.className = "mhead";
        h.innerHTML = BEATS[n.b][0] + "<em>" + BEATS[n.b][1] + "</em>";
        canvas.appendChild(h);
      }
      canvas.appendChild(cards[n.id]);
      cards[n.id].classList.remove("pre");
    });
  }

  /* ---------------- filtros e seleção ---------------- */
  let sel = null, phFilter = null;
  const q = $("q"), chips = $("chips");

  function paint() {
    const term = q.value.trim().toLowerCase();
    chips.querySelectorAll(".chip[data-ph]").forEach(c =>
      c.setAttribute("aria-pressed", String(+c.dataset.ph === phFilter)));

    const filtering = !!term || !!phFilter;
    const vis = new Set();
    TITLES.forEach(n => {
      const ok = (!phFilter || n.ph === phFilter) &&
        (!term || (n.sh + " " + n.pt + " " + n.or).toLowerCase().includes(term));
      if (ok) vis.add(n.id);
      const c = cards[n.id];
      c.classList.toggle("dim", !ok);
      if (dots[n.id]) dots[n.id].style.opacity = ok ? "" : "0.1";
      if (filtering && ok && c.classList.contains("pre")) { c.classList.remove("pre"); io.unobserve(c); }
    });

    const cEl = $("count");
    if (filtering) {
      const bits = [];
      if (phFilter) bits.push("Fase " + phFilter);
      if (term) bits.push('"' + term + '"');
      cEl.textContent = vis.size + " de " + TITLES.length + " · " + bits.join(" + ");
      cEl.style.color = vis.size ? "" : "var(--p2)";
    } else {
      cEl.textContent = TITLES.length + " títulos · " + R.rows + " linhas";
      cEl.style.color = "";
    }

    canvas.querySelectorAll(".tag").forEach(t => t.remove());
    tagBoxes = [];
    if (!wires) return;

    if (sel) {
      wires.classList.add("focus");
      let put = 0;
      edges.forEach(e => {
        const on = e.a === sel || e.b === sel;
        e.el.classList.toggle("on", on);
        depMarker(e, on);
        /* rotula só o que ENTRA: um nó como Ultimato tem 14 saídas e os
           rótulos se atropelariam. O motivo de cada uma está no dossiê. */
        if (on && e.why && e.b === sel && put < 6) { label(e); put++; }
      });
    } else if (filtering) {
      wires.classList.add("focus");
      edges.forEach(e => {
        const on = vis.has(e.a) && vis.has(e.b);
        e.el.classList.toggle("on", on);
        depMarker(e, on);
      });
    } else {
      wires.classList.remove("focus");
      edges.forEach(e => { e.el.classList.remove("on"); depMarker(e, false); });
    }

    Object.keys(cards).forEach(id => cards[id].classList.toggle("sel", id === sel));

    const hot = new Set();
    if (sel) {
      hot.add(byId[sel].col);
      edges.forEach(e => {
        if (e.a === sel) hot.add(byId[e.b].col);
        if (e.b === sel) hot.add(byId[e.a].col);
      });
    }
    heads.querySelectorAll(".hd").forEach(h => h.classList.toggle("hot", hot.has(h.dataset.col)));
  }

  function depMarker(e, lit) {
    if (e.kind !== "dep") return;
    e.el.setAttribute("marker-end", "url(#a-dep-" + (lit ? (byId[e.a].ph || 0) : 0) + ")");
  }

  /* caixas já posicionadas nesta rodada de rótulos */
  let tagBoxes = [];

  function label(e) {
    if (isMobile()) return;
    const len = e.el.getTotalLength();
    if (!len) return;
    const p = e.el.getPointAtLength(Math.max(0, len - 30));
    const t = document.createElement("div");
    t.className = "tag";
    t.innerHTML = e.why;
    canvas.appendChild(t);

    const w = t.offsetWidth, h = t.offsetHeight;
    /* Os rótulos formam uma coluna ao lado do card selecionado, e não em cima
       dele: todos alinhados no mesmo x, empilhados na ordem de chegada. */
    const s = R.pos[sel];
    let x = s.x + cfg.cardW + 16;
    if (x + w > R.geom.totalW - 6) x = Math.max(4, s.x - w - 16);
    let y = Math.max(4, p.y - h / 2);

    /* empurra para baixo enquanto encostar num rótulo já colocado */
    const hits = b => !(x + w + 6 < b.x || x > b.x + b.w + 6 ||
                        y + h + 5 < b.y || y > b.y + b.h + 5);
    let guard = 0;
    while (guard++ < 60 && tagBoxes.some(hits)) y += 9;

    tagBoxes.push({ x: x, y: y, w: w, h: h });
    t.style.left = x + "px";
    t.style.top = y + "px";
  }

  q.addEventListener("input", paint);

  /* ---------------- assistidos ---------------- */
  function toggleSeen(id) {
    seen.has(id) ? seen.delete(id) : seen.add(id);
    localStorage.setItem("mcu.seen", JSON.stringify([...seen]));
    cards[id].classList.toggle("seen", seen.has(id));
    const btn = $("mark");
    if (btn && btn.dataset.id === id) setMark(btn, id);
    progress();
  }
  function progress() {
    const p = Math.round(seen.size / TITLES.length * 100);
    $("pct").textContent = p + "%";
    $("fill").style.width = p + "%";
  }

  /* ---------------- dossiê ---------------- */
  const veil = $("veil"), dossier = $("dossier");
  let lastFocus = null;
  const ICO_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function relRow(id, why, kind) {
    const n = byId[id];
    if (!n) return "";
    const glyph = { req: "↑", hard: "!", next: "↓", by: "↓" }[kind];
    const c = kind === "hard" ? "var(--p2)" : phColor(n);
    return '<button class="rel" data-go="' + id + '" style="--rc:' + c + '">' +
      '<span class="ico">' + glyph + "</span><span>" +
      '<span class="nm">' + n.pt + "<em>" + (n.ph ? "F" + n.ph : "paralelo") + " · " + n.y + "</em></span>" +
      (why ? '<p class="why">' + why + "</p>" : "") +
      "</span></button>";
  }
  function block(title, html) {
    return "<section><h5>" + title + "</h5>" +
      (html || '<p class="empty">Nada aqui — este título não depende de outros nesse eixo.</p>') +
      "</section>";
  }
  function setMark(btn, id) {
    const on = seen.has(id);
    btn.classList.toggle("on", on);
    btn.innerHTML = ICO_CHK + (on ? "Assistido" : "Marcar como assistido");
  }

  function open(id) {
    const n = byId[id];
    if (!n) return;
    sel = id; paint(); center(id);
    lastFocus = document.activeElement;

    const hard = (n.req || []).filter(r => r[2]);
    const soft = (n.req || []).filter(r => !r[2]);
    const nx = (n.next || []).filter(i => byId[i]);
    const by = needed[id] || [];
    const stone = n.ph ? STONES[n.ph][0] + " · " + STONES[n.ph][1] : "—";
    const totalRows = R.rows;

    dossier.style.setProperty("--pc", phColor(n));
    dossier.innerHTML =
      '<div class="top">' +
        '<button class="x" id="cls" aria-label="Fechar">' + ICO_X + "</button>" +
        '<div class="kick">' +
          '<span class="pill">' + (n.ph ? "Fase " + n.ph : "Fora da continuidade") + "</span>" +
          "<span>" + n.t + "</span><span>·</span><span>" + colName[n.col] + "</span>" +
          "<span>·</span><span>" + BEATS[n.b][1] + "</span>" +
        "</div>" +
        '<h2 id="dTitle">' + n.pt + "</h2>" +
        '<p class="sub">' + n.or + "</p>" +
        '<dl class="facts">' +
          "<div><dt>Lançamento</dt><dd>" + n.y + "</dd></div>" +
          "<div><dt>Quando se passa</dt><dd>" + n.wh + "</dd></div>" +
          "<div><dt>Linha do diagrama</dt><dd>" + (R.row[id] + 1) + " de " + totalRows + "</dd></div>" +
          "<div><dt>Joia da fase</dt><dd>" + stone + "</dd></div>" +
        "</dl>" +
      "</div>" +
      '<div class="body">' +
        '<p class="syn">' + n.syn + "</p>" +
        block("Você precisa ter visto antes", hard.map(r => relRow(r[0], r[1], "hard")).join("")) +
        block("Ajuda a entender melhor", soft.map(r => relRow(r[0], r[1], "req")).join("")) +
        block("Continua diretamente em", nx.map(i => relRow(i, null, "next")).join("") || (
          by.length
            ? '<p class="empty">Sem sequência direta — mas este título destrava ' + by.length +
              (by.length > 1 ? " outros" : " outro") + ", na lista abaixo.</p>"
            : prevOf[id]
              ? '<p class="empty">Ponta final desta franquia. Vem de <b>' + byId[prevOf[id]].pt + "</b>.</p>"
              : null)) +
        block("Este título é pré-requisito para",
          by.map(r => relRow(r[0], r[1], r[2] ? "hard" : "by")).join("")) +
        '<div class="foot">' +
          '<button class="act" id="mark" data-id="' + id + '"></button>' +
          '<span class="hintline">ESC fecha · clique num título para navegar</span>' +
        "</div>" +
      "</div>";

    setMark($("mark"), id);
    $("mark").onclick = () => toggleSeen(id);
    $("cls").onclick = close;
    dossier.querySelectorAll("[data-go]").forEach(b => { b.onclick = () => open(b.dataset.go); });
    veil.hidden = false;
    dossier.scrollTop = 0;
    $("cls").focus();
  }
  function close() { veil.hidden = true; if (lastFocus) lastFocus.focus(); }
  veil.addEventListener("mousedown", ev => { if (ev.target === veil) close(); });

  function center(id) {
    if (isMobile()) {
      cards[id].scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
      return;
    }
    const p = R.pos[id];
    if (!p) return;
    stage.scrollTo({
      left: Math.max(0, p.x - stage.clientWidth / 2 + cfg.cardW / 2),
      top: Math.max(0, p.y - stage.clientHeight / 2 + cfg.cardH / 2),
      behavior: reduced() ? "auto" : "smooth"
    });
  }

  /* ---------------- tooltip nas linhas ---------------- */
  const KIND = { seq: "Continuação direta", hard: "Inseparável", dep: "Dependência" };

  canvas.addEventListener("mouseover", ev => {
    const h = ev.target.closest(".hit");
    if (!h) return;
    const e = edges[+h.dataset.i];
    if (!e) return;
    e.el.classList.add("hov"); depMarker(e, true);
    tip.innerHTML = '<span class="k">' + KIND[e.kind] + "</span><b>" + byId[e.a].sh +
      "</b> → <b>" + byId[e.b].sh + "</b>" +
      (e.why ? '<div class="w">' + e.why + "</div>" : "");
    tip.classList.add("on");
  });
  canvas.addEventListener("mouseout", ev => {
    const h = ev.target.closest(".hit");
    if (!h) return;
    const e = edges[+h.dataset.i];
    if (e) { e.el.classList.remove("hov"); depMarker(e, e.el.classList.contains("on")); }
    tip.classList.remove("on");
  });
  addEventListener("mousemove", ev => {
    if (!tip.classList.contains("on")) return;
    tip.style.left = Math.min(ev.clientX + 14, innerWidth - tip.offsetWidth - 10) + "px";
    tip.style.top = Math.max(10, ev.clientY - tip.offsetHeight - 14) + "px";
  });

  /* ---------------- entrada em cena ---------------- */
  const io = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.style.animationDelay = (colIndex[byId[el.dataset.id].col] % 5) * 32 + "ms";
      el.classList.remove("pre"); el.classList.add("in");
      io.unobserve(el);
    });
  }, { root: stage, rootMargin: "0px 240px -6% 0px", threshold: .01 });

  /* ---------------- arrastar para panoramar ---------------- */
  let drag = null;
  stage.addEventListener("mousedown", e => {
    if (e.button !== 0 || e.target.closest(".node") || e.target.closest(".hit")) return;
    drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop };
  });
  addEventListener("mousemove", e => {
    if (!drag) return;
    if (!stage.classList.contains("grabbing") &&
        (Math.abs(e.clientX - drag.x) > 4 || Math.abs(e.clientY - drag.y) > 4)) {
      stage.classList.add("grabbing");
    }
    if (stage.classList.contains("grabbing")) {
      stage.scrollLeft = drag.l - (e.clientX - drag.x);
      stage.scrollTop = drag.t - (e.clientY - drag.y);
    }
  });
  addEventListener("mouseup", () => { drag = null; stage.classList.remove("grabbing"); });
  stage.addEventListener("wheel", e => {
    if (e.shiftKey) { stage.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });
  stage.addEventListener("scroll", sync, { passive: true });

  /* ---------------- controles ---------------- */
  function chipsInit() {
    const stones = $("stones");
    [1, 2, 3, 4, 5, 6].forEach(p => {
      const c = document.createElement("button");
      c.className = "chip";
      c.style.setProperty("--pc", "var(--p" + p + ")");
      c.setAttribute("aria-pressed", "false");
      c.dataset.ph = p;
      c.innerHTML = "<i></i>F" + p;
      c.title = "Fase " + p + " — Joia do " + STONES[p][0];
      c.onclick = () => {
        phFilter = phFilter === p ? null : p;
        sel = null; paint();
        if (phFilter) {
          const f = TITLES.filter(n => n.ph === phFilter)
            .sort((a, b) => R.row[a.id] - R.row[b.id])[0];
          if (f) center(f.id);
        }
      };
      chips.appendChild(c);

      const s = document.createElement("div");
      s.className = "stone";
      s.style.setProperty("--pc", "var(--p" + p + ")");
      s.innerHTML = "<i></i>F" + p + " · " + STONES[p][0];
      stones.appendChild(s);
    });
    const all = document.createElement("button");
    all.className = "chip plain";
    all.textContent = "Tudo";
    all.onclick = () => { phFilter = null; q.value = ""; sel = null; paint(); };
    chips.appendChild(all);
  }

  $("tDen").onclick = () => {
    dens = (dens + 1) % DENS.length;
    $("tDen").title = "Densidade: " + DENS[dens].name;
    relayout();
  };
  const leg = $("legend");
  $("tLeg").onclick = () => {
    const on = leg.hidden;
    leg.hidden = !on;
    $("tLeg").setAttribute("aria-pressed", String(on));
  };
  $("tTheme").onclick = () => {
    const cur = document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = cur === "dark" ? "light" : "dark";
  };

  addEventListener("keydown", ev => {
    if (ev.key === "/" && document.activeElement !== q) { ev.preventDefault(); q.focus(); return; }
    if (ev.key !== "Escape") return;
    if (!veil.hidden) close();
    else if (sel) { sel = null; paint(); }
    else if (q.value || phFilter) { q.value = ""; phFilter = null; paint(); }
  });

  /* ---------------- ciclo ---------------- */
  let raf;
  function relayout() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      layout();
      paint();
      if (!isMobile()) Object.keys(cards).forEach(id => {
        if (cards[id].classList.contains("pre")) io.observe(cards[id]);
      });
    });
  }
  let lastMobile = isMobile();
  addEventListener("resize", () => {
    const m = isMobile();
    if (m !== lastMobile) {
      lastMobile = m;
      if (!m) { canvas.querySelectorAll(".mhead").forEach(e => e.remove()); }
    }
    relayout();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  buildCards();
  chipsInit();
  progress();
  relayout();

  /* ---------------- abertura ---------------- */
  const intro = $("intro");
  let gone = false;
  function enter() {
    if (gone) return;
    gone = true;
    intro.classList.add("off");
    setTimeout(() => { intro.remove(); relayout(); }, 520);
  }
  intro.addEventListener("click", enter);
  intro.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") enter(); });
  setTimeout(enter, 4200);
  intro.focus();
})();
