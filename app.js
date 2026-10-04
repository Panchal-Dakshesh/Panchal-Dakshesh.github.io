(() => {
  "use strict";
  const P = window.PROFILE;
  const NS = "http://www.w3.org/2000/svg";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svg = $("#graph");
  const stage = $("#stage");

  // ---------------------------------------------------------------- graph model
  const nodes = [];
  const edges = [];
  const byId = {};
  function addNode(n) { n.out = []; n.in = []; nodes.push(n); byId[n.id] = n; return n; }
  function addEdge(a, b) { const e = { from: byId[a], to: byId[b] }; edges.push(e); e.from.out.push(e); e.to.in.push(e); return e; }

  const current = P.career[P.career.length - 1];
  const core = addNode({ id: "core", kind: "core", layer: 2, label: P.handle, sub: P.role.toLowerCase() });
  Object.entries(P.skills).forEach(([g, def]) => {
    addNode({ id: "g:" + g, kind: "group", layer: 1, label: g, group: g, data: def, color: def.color });
    def.items.forEach((s) => {
      addNode({ id: "s:" + s, kind: "skill", layer: 0, label: s, group: g, color: def.color });
      addEdge("s:" + s, "g:" + g);
    });
    addEdge("g:" + g, "core");
  });
  addNode({ id: "o:career", kind: "out", layer: 3, label: "career.log", sub: `${P.career.length} commits`, status: "career" });
  P.projects.forEach((p) => addNode({ id: "o:" + p.repo, kind: "out", layer: 3, label: p.repo, sub: `${p.lang.toLowerCase()} · ${p.status}`, status: p.status, data: p }));
  const POSTS = (window.POSTS || []).filter((p) => !p.draft);
  const nCase = POSTS.filter((p) => p.kind === "case").length, nNote = POSTS.filter((p) => p.kind === "note").length;
  addNode({ id: "o:cases", kind: "out", layer: 3, label: "case-studies", sub: nCase ? `${nCase} write-up${nCase > 1 ? "s" : ""}` : "first one soon", status: "cases" });
  addNode({ id: "o:notes", kind: "out", layer: 3, label: "notes", sub: nNote ? `${nNote} post${nNote > 1 ? "s" : ""}` : "first one soon", status: "notes" });
  addNode({ id: "o:contact", kind: "out", layer: 3, label: "contact", sub: "say hi", status: "contact" });
  nodes.filter((n) => n.layer === 3).forEach((n) => addEdge("core", n.id));

  const layers = [0, 1, 2, 3].map((l) => nodes.filter((n) => n.layer === l));

  // ---------------------------------------------------------------- measuring
  const ctx = document.createElement("canvas").getContext("2d");
  function textW(s, size = 12, weight = 400) {
    ctx.font = `${weight} ${size}px "JetBrains Mono", ui-monospace, Menlo, monospace`;
    return ctx.measureText(s).width;
  }
  function sizeNodes() {
    nodes.forEach((n) => {
      if (n.kind === "core") { n.w = 124; n.h = 124; }
      else if (n.kind === "group") { n.w = textW(n.label, 12, 700) + textW(String(n.data.items.length)) + 34; n.h = 32; }
      else if (n.kind === "out") { n.w = Math.max(textW(n.label), textW(n.sub, 10.5)) + 38; n.h = 42; }
      else { n.w = textW(n.label) + 32; n.h = 26; }
    });
  }

  // ---------------------------------------------------------------- layout
  let W = 0, H = 0, portrait = false;
  function layout() {
    sizeNodes();
    W = stage.clientWidth;
    portrait = W < 980;
    svg.classList.toggle("portrait", portrait);
    if (portrait) layoutPortrait(); else layoutLandscape();
  }

  function layoutLandscape() {
    H = stage.clientHeight;
    svg.style.height = "100%";
    const top = 20, bottom = 44, avail = H - top - bottom;
    const L0 = layers[0];
    const rowH = 32;
    const perCol = Math.max(6, Math.floor(avail / rowH));
    const cols = Math.ceil(L0.length / perCol);
    const rows = Math.ceil(L0.length / cols);
    const w0col = Math.max(...L0.map((n) => n.w));
    const colsW = [w0col * cols + 14 * (cols - 1), Math.max(...layers[1].map((n) => n.w)), core.w, Math.max(...layers[3].map((n) => n.w))];
    const margin = 32;
    const gap = Math.max(60, (W - margin * 2 - colsW.reduce((a, b) => a + b, 0)) / 3);
    const x0 = margin;
    const x1 = x0 + colsW[0] + gap;
    const x2 = x1 + colsW[1] + gap;
    const x3 = x2 + colsW[2] + gap;

    const y0 = top + (avail - rows * rowH) / 2 + rowH / 2;
    L0.forEach((n, i) => {
      const c = Math.floor(i / rows), r = i % rows;
      n.tx = x0 + c * (w0col + 14) + (w0col - n.w);
      n.ty = y0 + r * rowH;
    });
    // groups sit at the average height of their skills, then get de-overlapped
    const G = layers[1];
    G.forEach((g) => { const ys = g.in.map((e) => e.from.ty); g.ty = ys.reduce((a, b) => a + b, 0) / ys.length; g.tx = x1; });
    spread(G, "ty", 44, top + 15, H - bottom - 15);
    core.tx = x2; core.ty = top + avail / 2;
    const O = layers[3];
    const oh = 54;
    O.forEach((n, i) => { n.tx = x3; n.ty = top + avail / 2 + (i - (O.length - 1) / 2) * oh; });
  }

  function spread(list, key, minGap, lo, hi) {
    list.sort((a, b) => a[key] - b[key]);
    for (let i = 1; i < list.length; i++) if (list[i][key] - list[i - 1][key] < minGap) list[i][key] = list[i - 1][key] + minGap;
    const over = list[list.length - 1][key] - hi;
    if (over > 0) list.forEach((n) => (n[key] -= over));
    const under = lo - list[0][key];
    if (under > 0) list.forEach((n) => (n[key] += under));
  }

  function layoutPortrait() {
    const pad = 16, gapX = 8, rowH = 36, band = 70;
    let y = 30;
    const flow = (list) => {
      let rows = [[]], rw = 0;
      list.forEach((n) => {
        if (rw + n.w > W - pad * 2 && rows[rows.length - 1].length) { rows.push([]); rw = 0; }
        rows[rows.length - 1].push(n);
        rw += n.w + gapX;
      });
      rows.forEach((row) => {
        const total = row.reduce((a, n) => a + n.w, 0) + gapX * (row.length - 1);
        let x = (W - total) / 2;
        row.forEach((n) => { n.tx = x; n.ty = y; x += n.w + gapX; });
        y += rowH;
      });
      y += band - rowH;
    };
    flow(layers[0]);
    flow(layers[1]);
    core.tx = (W - core.w) / 2; core.ty = y + 30; y += core.h + band - 20;
    flow(layers[3]);
    H = y;
    const room = stage.clientHeight;
    if (window.innerWidth > 900 && H < room) { const dy = (room - H) / 2; nodes.forEach((n) => (n.ty += dy)); H = room; }
    svg.style.height = H + "px";
  }

  // ---------------------------------------------------------------- rendering
  const gEdges = document.createElementNS(NS, "g");
  const gPackets = document.createElementNS(NS, "g");
  const gNodes = document.createElementNS(NS, "g");
  svg.append(gEdges, gPackets, gNodes);

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  sizeNodes();
  edges.forEach((e) => {
    const c = e.from.color || e.to.color;
    const isOut = e.from.kind === "core";
    const w = e.from.kind === "group" ? 1.4 + e.from.data.items.length * 0.7 : isOut ? 1.2 : 1.3;
    e.el = el("path", { class: "edge" + (isOut ? " out" : "") + (e.from.kind === "skill" ? " s2g" : ""), "stroke-width": w }, gEdges);
    if (c) e.el.style.setProperty("--c", c);
  });
  nodes.forEach((n) => {
    const cls = ["node", "k-" + n.kind];
    if (n.status) cls.push("s-" + n.status);
    n.el = el("g", { class: cls.join(" "), tabindex: "-1", "data-id": n.id }, gNodes);
    if (n.color) n.el.style.setProperty("--c", n.color);
    if (n.kind === "core") {
      const r = n.w / 2;
      el("circle", { class: "halo", cx: r, cy: 0, r }, n.el);
      el("circle", { class: "spin", cx: r, cy: 0, r: r - 7 }, n.el);
      el("circle", { class: "disc", cx: r, cy: 0, r: r - 14 }, n.el);
      n.t1 = el("text", { "text-anchor": "middle", x: r, y: -1 }, n.el); n.t1.textContent = n.label;
      n.t2 = el("text", { "text-anchor": "middle", class: "sub", x: r, y: 15 }, n.el); n.t2.textContent = n.sub;
      return;
    }
    n.rect = el("rect", { rx: n.kind === "skill" ? 13 : n.kind === "group" ? 8 : 8 }, n.el);
    if (n.kind === "skill") {
      el("circle", { class: "dotc", cx: 13, cy: 0, r: 3.5 }, n.el);
      n.t1 = el("text", { x: 23, y: 4 }, n.el); n.t1.textContent = n.label;
    } else if (n.kind === "group") {
      n.t1 = el("text", { x: 12, y: 4 }, n.el); n.t1.textContent = n.label;
      n.t2 = el("text", { class: "count", "text-anchor": "end", y: 4 }, n.el); n.t2.textContent = n.data.items.length;
    } else {
      el("circle", { class: "dotc", cx: 15, cy: 0, r: 4 }, n.el);
      n.t1 = el("text", { x: 27, y: -2 }, n.el); n.t1.textContent = n.label;
      n.t2 = el("text", { class: "sub", x: 27, y: 12 }, n.el); n.t2.textContent = n.sub;
    }
  });

  function place() {
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    nodes.forEach((n) => {
      n.el.setAttribute("transform", `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`);
      if (!n.rect) return;
      n.rect.setAttribute("x", 0); n.rect.setAttribute("y", -n.h / 2);
      n.rect.setAttribute("width", n.w); n.rect.setAttribute("height", n.h);
      if (n.kind === "group") n.t2.setAttribute("x", n.w - 11);
    });
    edges.forEach((e) => {
      const a = e.from, b = e.to;
      let d;
      if (portrait) {
        const x1 = a.x + a.w / 2, y1 = a.y + a.h / 2, x2 = b.x + b.w / 2, y2 = b.y - b.h / 2;
        const my = (y1 + y2) / 2;
        d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
      } else {
        const x1 = a.x + a.w, y1 = a.y, x2 = b.x, y2 = b.y;
        const mx = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      }
      e.el.setAttribute("d", d);
      e.len = null;
    });
  }

  // ---------------------------------------------------------------- intro: build from scratch
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function intro(done) {
    nodes.forEach((n) => {
      n.sx = Math.random() * Math.max(0, W - n.w);
      n.sy = 20 + Math.random() * Math.max(0, H - 40);
      n.x = n.sx; n.y = n.sy;
      n.delay = (n.layer * 260) + Math.random() * 380;
    });
    gEdges.style.opacity = 0;
    const dur = 1100, t0 = performance.now();
    caption(`scattered: ${layers[0].length} skills, no structure. building...`);
    function frame(now) {
      let alive = false;
      nodes.forEach((n) => {
        const t = Math.min(1, Math.max(0, (now - t0 - n.delay) / dur));
        if (t < 1) alive = true;
        const k = ease(t);
        n.x = n.sx + (n.tx - n.sx) * k;
        n.y = n.sy + (n.ty - n.sy) * k;
      });
      const p = Math.min(1, Math.max(0, (now - t0 - 900) / 900));
      gEdges.style.opacity = p;
      place();
      if (alive || p < 1) requestAnimationFrame(frame);
      else done();
    }
    requestAnimationFrame(frame);
  }

  function settle() { nodes.forEach((n) => { n.x = n.tx; n.y = n.ty; }); gEdges.style.opacity = 1; place(); }

  // ---------------------------------------------------------------- packets
  const packets = [];
  const pool = [];
  let lastSpawn = 0, running = false;
  function pathLen(e) { if (e.len == null) e.len = e.el.getTotalLength(); return e.len; }
  function spawn() {
    const s = layers[0][Math.floor(Math.random() * layers[0].length)];
    const e1 = s.out[0], e2 = e1.to.out[0];
    const outs = core.out;
    const e3 = outs[Math.floor(Math.random() * outs.length)];
    const c = pool.pop() || el("circle", { class: "packet", r: 3 }, gPackets);
    c.style.display = "";
    c.style.setProperty("--c", s.color);
    packets.push({ chain: portrait ? [e2, e3] : [e1, e2, e3], i: 0, d: 0, c, v: 0.11 + Math.random() * 0.07 });
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min(50, now - (loop.t || now));
    loop.t = now;
    if (now - lastSpawn > 260 && packets.length < 34 && !document.hidden) { spawn(); lastSpawn = now; }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      const e = p.chain[p.i];
      const L = pathLen(e);
      p.d += dt * p.v;
      if (p.d >= L) {
        p.d -= L; p.i++;
        if (p.i >= p.chain.length) { p.c.style.display = "none"; pool.push(p.c); packets.splice(i, 1); continue; }
      }
      const pt = p.chain[p.i].el.getPointAtLength(Math.min(p.d, pathLen(p.chain[p.i])));
      p.c.setAttribute("cx", pt.x.toFixed(1));
      p.c.setAttribute("cy", pt.y.toFixed(1));
    }
    requestAnimationFrame(loop);
  }
  function startPackets() { if (reduced || running) return; running = true; requestAnimationFrame(loop); }

  // ---------------------------------------------------------------- focus / selection
  let sel = core, open = null;
  function related(n) {
    const set = new Set([n]);
    const up = [n], down = [n];
    while (up.length) { const x = up.pop(); x.in.forEach((e) => { if (!set.has(e.from)) { set.add(e.from); up.push(e.from); } }); }
    while (down.length) { const x = down.pop(); x.out.forEach((e) => { if (!set.has(e.to)) { set.add(e.to); down.push(e.to); } }); }
    return set;
  }
  function highlight(n) {
    nodes.forEach((x) => x.el.classList.remove("hot"));
    edges.forEach((e) => e.el.classList.remove("hot"));
    if (!n || n.kind === "core") { svg.classList.remove("focus"); return; }
    const set = related(n);
    // keep only real paths through n: ancestors of n go up, descendants go down
    set.forEach((x) => x.el.classList.add("hot"));
    edges.forEach((e) => { if (set.has(e.from) && set.has(e.to)) e.el.classList.add("hot"); });
    svg.classList.add("focus");
  }
  function select(n, { show = false } = {}) {
    if (sel) sel.el.classList.remove("sel");
    sel = n;
    n.el.classList.add("sel");
    $("#sel").textContent = n.label;
    const L = layers[n.layer];
    $("#pos").textContent = `${n.layer + 1}:${L.indexOf(n) + 1}`;
    highlight(n);
    if (show || open) openFloat(n);
    if (portrait) {
      const r = n.el.getBoundingClientRect(), s = stage.getBoundingClientRect();
      if (r.top < s.top || r.bottom > s.bottom) stage.scrollBy({ top: r.top - s.top - s.height / 3, behavior: reduced ? "auto" : "smooth" });
    }
  }

  svg.addEventListener("click", (ev) => {
    const g = ev.target.closest(".node");
    if (!g) { closeFloat(); return; }
    select(byId[g.dataset.id], { show: true });
  });
  svg.addEventListener("mouseover", (ev) => { const g = ev.target.closest(".node"); if (g) highlight(byId[g.dataset.id]); });
  svg.addEventListener("mouseout", (ev) => { if (!ev.relatedTarget || !ev.relatedTarget.closest || !ev.relatedTarget.closest(".node")) highlight(open ? sel : null); });

  // ---------------------------------------------------------------- floating window content
  const sha = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7); };
  const pill = (id, text) => { const c = byId[id] && byId[id].color; return `<button type="button" class="pill" data-go="${esc(id)}"${c ? ` style="--c:${c}"` : ""}>${esc(text)}</button>`; };
  const years = new Date().getFullYear() - parseInt(P.career[0].ts, 10);

  function content(n) {
    if (n.kind === "core") {
      return [
        "~/dakshesh/README.md",
        `<h2>${esc(P.name)}</h2>
        <div class="meta">${esc(P.role)} · ${esc(current.role)} @ ${esc(current.company)} · ${esc(P.location)}</div>
        <div class="lede">${esc(P.intro)}</div>
        ${P.about.map((p) => `<p>${esc(p)}</p>`).join("")}
        <h3>inputs</h3><div class="pills">${layers[1].map((g) => pill(g.id, g.group)).join("")}</div>
        <h3>outputs</h3><div class="pills">${layers[3].map((o) => pill(o.id, o.label)).join("")}</div>`,
      ];
    }
    if (n.kind === "group") {
      return [
        `transforms/${n.group}.sql`,
        `<h2><span class="swatch" style="--c:${n.color}"></span>${esc(n.group)}</h2>
        <div class="lede">${esc(n.data.note)}</div>
        <h3>sources (${n.data.items.length})</h3><div class="pills">${n.data.items.map((s) => pill("s:" + s, s)).join("")}</div>
        <h3>sink</h3><div class="pills">${pill("core", P.handle)}</div>`,
      ];
    }
    if (n.kind === "skill") {
      const g = byId["g:" + n.group];
      return [
        `sources/${n.label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        `<h2>${esc(n.label)}</h2>
        <div class="meta">source → ${esc(n.group)} → ${esc(P.handle)}</div>
        <div class="lede">${esc(g.data.note)}</div>
        <h3>flows into</h3><div class="pills">${pill(g.id, n.group)}${pill("core", P.handle)}</div>
        <h3>same transform</h3><div class="pills">${g.data.items.filter((s) => s !== n.label).map((s) => pill("s:" + s, s)).join("") || '<span class="meta">just this one. it\'s a lot.</span>'}</div>`,
      ];
    }
    if (n.status === "career") {
      const log = [...P.career].reverse();
      return [
        "git log --oneline career",
        `<h2>career.log</h2><div class="meta">${years} years, ${P.career.length} commits, no force pushes</div>
        <h3>history</h3>
        <ul class="log">${log.map((e, i) => `<li><span class="sha">${sha(e.ts + e.role)}</span><span class="ts">${esc(e.ts)}</span><span>${i === 0 ? '<span class="head">HEAD</span> ' : ""}${esc(e.role)} <span class="co">@ ${esc(e.company)}</span></span></li>`).join("")}</ul>`,
      ];
    }
    if (n.status === "cases" || n.status === "notes") {
      const k = n.status === "cases" ? "case" : "note";
      const items = POSTS.filter((p) => p.kind === k);
      const link = (p) => p.url || `post.html?p=${encodeURIComponent(p.slug)}`;
      const blurb = k === "case"
        ? "Problems I hit in production and how I got out of them. The dead ends included."
        : "Whatever I'm studying, written down until I actually understand it.";
      return [
        `writing/${n.label}`,
        `<h2>${k === "case" ? "Case studies" : "Notes"}</h2>
        <div class="lede">${blurb}</div>
        ${items.length
          ? `<ul class="log">${items.slice(0, 6).map((p) => `<li><span class="ts">${esc(p.date)}</span><span></span><span><a href="${esc(link(p))}"${p.url ? ' target="_blank" rel="noopener"' : ""}>${esc(p.title)}</a></span></li>`).join("")}</ul>`
          : '<p class="meta">nothing published yet. the first one is being written. probably over-engineered.</p>'}
        <h3>all writing</h3><a href="writing.html${k === "case" ? "?kind=case" : "?kind=note"}">open writing →</a>`,
      ];
    }
    if (n.status === "contact") {
      return [
        "contact",
        `<h2>Say hi</h2>
        <div class="lede">Happy to talk CDC, streaming, or why your pipeline is lagging.</div>
        <div class="kv"><b>linkedin</b><a href="${esc(P.links.linkedin)}" target="_blank" rel="noopener">in/dakshesh-panchal</a><br>
        <b>github</b><a href="${esc(P.links.github)}" target="_blank" rel="noopener">Panchal-Dakshesh</a></div>`,
      ];
    }
    const p = n.data;
    const linkHtml = p.status === "building"
      ? '<span class="meta">not public yet. it will be.</span>'
      : `<a href="${esc(P.links.github)}/${esc(p.repo)}" target="_blank" rel="noopener">github.com/Panchal-Dakshesh/${esc(p.repo)}</a>`;
    return [
      `outputs/${p.repo}`,
      `<h2>${esc(p.repo)}</h2>
      <div class="lede">${esc(p.desc)}</div>
      <div class="kv"><b>lang</b>${esc(p.lang)}<br><b>status</b>${esc(p.status)}<br><b>repo</b>${linkHtml}</div>`,
    ];
  }

  const float = $("#float");
  function openFloat(n) {
    const [title, body] = content(n);
    $("#float-title").textContent = title;
    $("#float-body").innerHTML = body;
    float.hidden = false;
    open = n;
  }
  function closeFloat() { float.hidden = true; open = null; highlight(null); }
  $("#float-close").addEventListener("click", closeFloat);
  float.addEventListener("click", (ev) => { const b = ev.target.closest("[data-go]"); if (b) select(byId[b.dataset.go], { show: true }); });

  // ---------------------------------------------------------------- vim keys
  function move(dir) {
    const L = layers[sel.layer];
    const i = L.indexOf(sel);
    const along = portrait ? "x" : "y";
    if (dir === "j") return select(L[(i + 1) % L.length]);
    if (dir === "k") return select(L[(i - 1 + L.length) % L.length]);
    const nl = sel.layer + (dir === "l" ? 1 : -1);
    if (nl < 0 || nl > 3) return;
    const pos = sel[along] + (along === "x" ? sel.w / 2 : 0);
    const target = layers[nl].reduce((best, n) => {
      const d = Math.abs(n[along] + (along === "x" ? n.w / 2 : 0) - pos);
      return !best || d < best.d ? { n, d } : best;
    }, null);
    select(target.n);
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.target === cmdInput) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = ev.key;
    if ("hjkl".includes(k) && k.length === 1) { ev.preventDefault(); move(k); }
    else if (k === "ArrowDown") { ev.preventDefault(); move(portrait ? "l" : "j"); }
    else if (k === "ArrowUp") { ev.preventDefault(); move(portrait ? "h" : "k"); }
    else if (k === "ArrowRight") { ev.preventDefault(); move(portrait ? "j" : "l"); }
    else if (k === "ArrowLeft") { ev.preventDefault(); move(portrait ? "k" : "h"); }
    else if (k === "Enter" || k === "o") { ev.preventDefault(); openFloat(sel); highlight(sel); }
    else if (k === "Escape" || k === "q") { closeFloat(); svg.classList.remove("search"); }
    else if (k === "g") { select(layers[0][0]); }
    else if (k === "G") { select(layers[3][layers[3].length - 1]); }
    else if (k === ":" || k === "/") { ev.preventDefault(); openCmd(k); }
  });

  // ---------------------------------------------------------------- command line
  const cmdForm = $("#cmdline");
  const cmdInput = $("#cmd");
  const mode = $("#mode");
  let cmdKind = ":";
  function openCmd(kind) {
    cmdKind = kind;
    cmdForm.querySelector("label").textContent = kind;
    cmdForm.hidden = false;
    clearMsg();
    mode.textContent = kind === "/" ? "SEARCH" : "COMMAND";
    mode.classList.add("cmd");
    cmdInput.value = "";
    cmdInput.focus();
  }
  function closeCmd() { cmdForm.hidden = true; mode.textContent = "NORMAL"; mode.classList.remove("cmd"); cmdInput.blur(); }
  $("#colon-btn").addEventListener("click", () => openCmd(":"));
  cmdInput.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { closeCmd(); svg.classList.remove("search"); } });
  cmdInput.addEventListener("input", () => { if (cmdKind === "/") search(cmdInput.value); });
  cmdForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const v = cmdInput.value.trim();
    closeCmd();
    if (cmdKind === "/") { const m = search(v); if (m) select(m, { show: true }); return; }
    run(v);
  });

  let msgEl = null, msgTimer = null;
  function msg(text) {
    clearMsg();
    msgEl = document.createElement("div");
    msgEl.className = "msg";
    msgEl.textContent = text;
    document.body.appendChild(msgEl);
    msgTimer = setTimeout(clearMsg, 5000);
  }
  function clearMsg() { if (msgEl) msgEl.remove(); msgEl = null; clearTimeout(msgTimer); }

  function search(q) {
    q = q.toLowerCase();
    let first = null;
    layers[0].forEach((n) => { const m = q && n.label.toLowerCase().includes(q); n.el.classList.toggle("match", m); if (m && !first) first = n; });
    svg.classList.toggle("search", !!q);
    return first;
  }

  const cmds = {
    help: () => { openFloat({ kind: "help" }); },
    about: () => select(core, { show: true }),
    whoami: () => select(core, { show: true }),
    career: () => select(byId["o:career"], { show: true }),
    cases: () => select(byId["o:cases"], { show: true }),
    notes: () => select(byId["o:notes"], { show: true }),
    writing: () => { location.href = "writing.html"; },
    blog: () => { location.href = "writing.html"; },
    log: () => select(byId["o:career"], { show: true }),
    contact: () => select(byId["o:contact"], { show: true }),
    hire: () => { select(byId["o:contact"], { show: true }); msg("sensible. the contact node is open."); },
    projects: () => select(layers[3][1], { show: true }),
    skills: () => select(layers[1][0], { show: true }),
    q: () => msg("E37: there is no quitting here. try :contact instead."),
    "q!": () => msg("E37: still no."),
    wq: () => msg("written. still not quitting."),
    x: () => cmds.wq(),
    "set background=dark": () => msg("E519: not supported. this is a light-theme household."),
    colorscheme: () => msg("celeste. it's the only one installed. by choice."),
    "lazy": () => msg("0 plugins. built from scratch."),
    "checkhealth": () => msg(`ok: ${nodes.length} nodes, ${edges.length} edges, 0 cycles, 0 dependencies`),
  };
  function run(v) {
    if (!v) return;
    const fn = cmds[v] || cmds[v.split(/\s+/)[0]];
    if (fn) fn(v);
    else msg(`E492: Not an editor command: ${v}`);
  }

  // help is a pseudo-node with its own float
  const _content = content;
  content = function (n) {
    if (n.kind === "help") {
      const rows = [["h j k l", "move between nodes"], ["↵ / o", "open node"], ["esc / q", "close"], ["g / G", "first / last node"], ["/", "search skills"], [":about", "the README"], [":career", "git log"], [":projects", "outputs"], [":cases", "case studies"], [":notes", "study notes"], [":writing", "all writing"], [":contact", "say hi"], [":checkhealth", "graph stats"], [":q", "try it"]];
      return ["help.txt", `<h2>help</h2><div class="kv">${rows.map(([k, d]) => `<b>${esc(k)}</b>${esc(d)}`).join("<br>")}</div>`];
    }
    return _content(n);
  };

  // ---------------------------------------------------------------- caption, resize, boot
  function caption(t) { $("#caption").textContent = t; }

  let rz;
  window.addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => { layout(); settle(); }, 120);
  });

  function fillHero() {
    $("#role").textContent = `${P.role.toLowerCase()} · ${current.role} @ ${current.company}`;
    $("#intro").textContent = P.intro;
    $("#legend").innerHTML = layers[1].map((g) => `<button type="button" data-open="${esc(g.id)}" style="--c:${g.color}"><i></i><span>${esc(g.group)}</span><small>${g.data.items.length}</small></button>`).join("");
    document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => select(byId[b.dataset.open], { show: true })));
    document.querySelectorAll(".legend button").forEach((b) => {
      b.addEventListener("mouseenter", () => highlight(byId[b.dataset.open]));
      b.addEventListener("mouseleave", () => highlight(open ? sel : null));
    });
  }

  function boot() {
    fillHero();
    layout();
    const finish = () => {
      settle();
      select(core);
      caption(`${layers[0].length} sources → ${layers[1].length} transforms → 1 sink → ${layers[3].length} outputs · click any node, or press ?`);
      startPackets();
    };
    if (reduced) finish(); else intro(finish);
  }
  document.addEventListener("keydown", (ev) => { if (ev.key === "?" && ev.target !== cmdInput) { ev.preventDefault(); cmds.help(); } });

  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
})();
