(() => {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = new URLSearchParams(location.search);
  const showDrafts = params.has("drafts");
  const all = (window.POSTS || []).filter((p) => showDrafts || !p.draft);
  const KIND = { case: "case study", note: "note" };

  const href = (p) => p.url || `post.html?p=${encodeURIComponent(p.slug)}${p.draft ? "&drafts" : ""}`;
  const meta = (p) =>
    `<span class="kind k-${p.kind}">${KIND[p.kind] || p.kind}</span>` +
    (p.draft ? '<span class="draft-badge">draft</span>' : "") +
    (p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("") +
    (p.url ? `<span class="ext">↗ ${esc(new URL(p.url).hostname.replace(/^www\./, ""))}</span>` : "");

  // ---------------------------------------------------------------- index page
  const list = document.getElementById("list");
  if (list) {
    let kind = ["case", "note"].includes(params.get("kind")) ? params.get("kind") : "all";
    const count = (k) => all.filter((p) => k === "all" || p.kind === k).length;
    ["all", "case", "note"].forEach((k) => (document.getElementById("n-" + k).textContent = count(k)));

    function draw() {
      document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
      const items = all.filter((p) => kind === "all" || p.kind === kind);
      if (!items.length) {
        const what = kind === "note" ? "notes" : kind === "case" ? "case studies" : "posts";
        list.innerHTML = `<li class="empty">no ${what} published yet.<br>the first one is being written. probably over-engineered.</li>`;
        return;
      }
      list.innerHTML = items
        .map((p) => `<li class="item"><a href="${esc(href(p))}"${p.url ? ' target="_blank" rel="noopener"' : ""}>
          <span class="date">${esc(p.date)}</span>
          <span><h2>${esc(p.title)}</h2><p>${esc(p.summary || "")}</p><span class="meta">${meta(p)}</span></span>
        </a></li>`)
        .join("");
    }
    document.querySelectorAll(".tab").forEach((b) =>
      b.addEventListener("click", () => {
        kind = b.dataset.kind;
        const q = new URLSearchParams(location.search);
        if (kind === "all") q.delete("kind"); else q.set("kind", kind);
        history.replaceState(null, "", "?" + q.toString().replace(/=(?=&|$)/g, ""));
        draw();
      })
    );
    draw();
  }

  // ---------------------------------------------------------------- post page
  const prose = document.getElementById("prose");
  if (prose) {
    const slug = params.get("p");
    const p = (window.POSTS || []).find((x) => x.slug === slug && (showDrafts || !x.draft));
    const head = document.getElementById("post-head");
    if (!p) {
      document.getElementById("crumb").textContent = "404";
      head.innerHTML = "<h1>Not found.</h1>";
      prose.innerHTML = '<p>This post doesn\'t exist, or it\'s still a draft. <a href="writing.html">See everything that does.</a></p>';
      return;
    }
    if (p.url) { location.replace(p.url); return; }
    document.title = `${p.title} · Dakshesh Panchal`;
    document.getElementById("crumb").textContent = p.slug;
    let card = "";
    if (p.kind === "case" && p.problem && p.fix) {
      card = `<div class="pf">
        <div class="p"><div class="label">problem</div><div class="txt">${esc(p.problem)}</div></div>
        <div class="arrow" aria-hidden="true"><span>→</span></div>
        <div class="f"><div class="label">fix</div><div class="txt">${esc(p.fix)}</div></div>
        ${p.stack ? `<div class="pf-stack">stack: ${p.stack.map(esc).join(" · ")}</div>` : ""}
      </div>`;
    }
    head.innerHTML = `<div class="kicker">${esc(p.date)}</div><h1>${esc(p.title)}</h1><div class="meta">${meta(p)}</div>${card}`;
    fetch(`posts/${encodeURIComponent(p.slug)}.md`, { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then((md) => { prose.innerHTML = window.renderMarkdown(md); })
      .catch(() => { prose.innerHTML = `<p>Couldn't load <code>posts/${esc(p.slug)}.md</code>. If you're opening this file directly, run <code>python3 -m http.server</code> instead.</p>`; });
  }
})();
