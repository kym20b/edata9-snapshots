/* 포트폴리오 — portfolio.json 을 읽어 그린다. 매주 카드 한 칸을 JSON 에 더하면 사이트가 자란다. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  fetch("portfolio.json").then(r => r.json()).then(P => {
    $("#owner").textContent = P.owner;
    $("#headline").textContent = P.headline;
    $("#intro").textContent = P.intro;
    const slots = Array.from({ length: 8 }, (_, i) => P.cards.find(c => c.week === i + 1));
    $("#cards").innerHTML = slots.map((c, i) => c ? `
      <article class="card">
        ${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.title)} 화면" loading="lazy">` : `<div class="noimg">${i + 1}주</div>`}
        <div class="body">
          <div class="wk">${c.week}주</div>
          <h3>${esc(c.title)}</h3>
          <p class="line">${esc(c.line)}</p>
          <div class="judge"><b>내가 내린 판단</b>${esc(c.judgment)}</div>
          <div class="ai">${(c.ai || []).map(a => `<span>${esc(a)}</span>`).join("")}</div>
          ${c.url ? `<a class="go" href="${esc(c.url)}" target="_blank" rel="noopener">써 보기 →</a>`
                  : `<span class="go off">링크를 넣으십시오</span>`}
        </div>
      </article>` : `
      <article class="card empty"><div class="noimg">${i + 1}주</div>
        <div class="body"><h3>아직</h3><p class="line muted">이 주가 끝나면 한 칸을 채웁니다</p></div></article>`).join("");

    const p = P.proposal;
    if (p) {
      $("#proposal").hidden = false;
      $("#p-title").textContent = p.title;
      $("#p-ask").textContent = p.ask;
      $("#p-evidence").innerHTML = p.evidence.map(x => `<li>${esc(x)}</li>`).join("");
      $("#p-wrong").innerHTML = p.if_wrong.map(x => `<li>${esc(x)}</li>`).join("");
      $("#p-dont").textContent = p.dont;
    }
    document.body.dataset.ready = "1";
  });
})();
