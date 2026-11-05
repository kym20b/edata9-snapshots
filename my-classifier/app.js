// app.js — 화면. 기준(criteria.json) · 낱말(keywords.json) · 정답(data/answer.json)은 모두 파일에서 읽는다.
// 정답 파일은 채점 단추를 눌렀을 때만 연다.
// AI(Gemini)는 서버 함수 /api/classify 를 거쳐서만 부른다. 열쇠는 이 화면 어디에도 없다.
(function () {
  'use strict';

  var AI_URL = '/api/classify';
  var AI_BATCH = 10;          // 채점할 때 한 번에 보내는 문장 수
  var AI_WAIT_MS = 65000;     // 서버 함수가 60초까지 기다리므로 그보다 조금 더

  var state = { criteria: null, keywords: null };

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function getJSON(path) {
    return fetch(path, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error(path + ' (' + res.status + ')');
      return res.json();
    });
  }

  function showNotice(msg) {
    var box = $('notice');
    box.textContent = msg;
    box.hidden = false;
  }

  function levelIndex(value) {
    var levels = state.criteria['긴급도'].map(function (x) { return x['값']; });
    return levels.indexOf(value);
  }

  function setBadge(node, value) {
    node.textContent = value;
    node.className = 'badge lv' + levelIndex(value);
  }

  // ── AI 부르기 ──────────────────────────────────
  // sentences: [{id, text(가린 문장)}]  →  {model, results:[{id,칸,긴급도,이유} | {id,오류}]}
  // 통째로 실패하면 이유가 든 Error 로 거절한다.
  function callAI(sentences) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, AI_WAIT_MS);
    return fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteria: state.criteria, sentences: sentences }),
      signal: ctrl.signal
    }).then(function (res) {
      clearTimeout(timer);
      return res.text().then(function (txt) {
        var data = null;
        try { data = JSON.parse(txt); } catch (e) { data = null; }
        if (!res.ok || !data || !Array.isArray(data.results)) {
          throw new Error((data && data['오류']) || ('AI 서버가 알 수 없는 응답을 줬습니다 (HTTP ' + res.status + ')'));
        }
        return data;
      });
    }, function (err) {
      clearTimeout(timer);
      throw new Error(err && err.name === 'AbortError' ? 'AI 답을 기다리다 시간이 지났습니다' : 'AI 서버에 연결하지 못했습니다');
    });
  }

  // ── 탭 ─────────────────────────────────────────
  function setupTabs() {
    var tabs = [
      { btn: $('tab-classify'), panel: $('panel-classify') },
      { btn: $('tab-grade'), panel: $('panel-grade') }
    ];
    function select(i) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.btn.setAttribute('aria-selected', on ? 'true' : 'false');
        t.btn.tabIndex = on ? 0 : -1;
        t.panel.hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.btn.addEventListener('click', function () { select(i); });
      t.btn.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
          var next = (i + 1) % tabs.length;
          select(next);
          tabs[next].btn.focus();
        }
      });
    });
  }

  // ── 분류 탭 ────────────────────────────────────
  function showResult(masked, cat, urg, why, src, fail) {
    $('r-masked').textContent = masked;
    $('r-cat').textContent = cat;
    setBadge($('r-urg'), urg);
    $('r-why').textContent = why;
    $('r-src').textContent = src;
    $('r-fail').textContent = fail || '';
    $('r-fail').hidden = !fail;
    $('result').hidden = false;
  }

  function onClassify(ev) {
    ev.preventDefault();
    var raw = $('sentence').value.trim();
    if (!raw) { $('sentence').focus(); return; }

    var masked = window.Mask.mask(raw);
    var rule = window.Rules.classify(masked, state.criteria, state.keywords);
    var btn = $('btn-classify');
    btn.disabled = true;
    $('r-masked').textContent = masked;
    $('r-cat').textContent = '…';
    $('r-urg').textContent = '…';
    $('r-urg').className = 'badge';
    $('r-why').textContent = '';
    $('r-src').textContent = 'AI 분류 중…';
    $('r-fail').hidden = true;
    $('result').hidden = false;

    callAI([{ id: 'q1', text: masked }]).then(function (data) {
      var item = data.results[0];
      if (!item || item['오류']) throw new Error(item ? item['오류'] : 'AI 가 이 문장의 답을 주지 않았습니다');
      showResult(masked, item['칸'], item['긴급도'], item['이유'], 'AI(' + data.model + ')가 갈랐습니다', '');
    }).catch(function (e) {
      showResult(masked, rule['칸'], rule['긴급도'], rule['이유'], 'AI 없이 규칙으로 갈랐습니다', 'AI 실패 이유: ' + e.message);
    }).then(function () { btn.disabled = false; });
  }

  function chipList(words) {
    var ul = el('ul', 'chips');
    words.forEach(function (w) { ul.appendChild(el('li', null, w)); });
    return ul;
  }

  function exampleList(examples) {
    var ul = el('ul', 'ex');
    (examples || []).forEach(function (e) {
      ul.appendChild(el('li', null, e['id'] + ' · ‘' + e['낱말'] + '’ ← ' + e['문장']));
    });
    return ul;
  }

  function renderKeywords() {
    var body = $('kw-body');
    body.textContent = '';
    var kw = state.keywords;
    body.appendChild(el('p', 'meta', '규칙 낱말은 ' + kw['출처'] + ' 에서만 뽑았습니다 · 버전 ' + kw['version']));

    var order = state.criteria['두_칸에_걸칠_때']['순서'];
    body.appendChild(el('h3', null, '칸 (앞에 있는 칸이 먼저)'));
    order.forEach(function (c) {
      var item = kw['칸'][c] || { '낱말': [], '예': [] };
      body.appendChild(el('h3', null, c));
      body.appendChild(chipList(item['낱말']));
      body.appendChild(exampleList(item['예']));
    });

    body.appendChild(el('h3', null, '긴급도'));
    state.criteria['긴급도'].forEach(function (x) {
      var item = kw['긴급도'][x['값']] || { '낱말': [], '예': [] };
      body.appendChild(el('h3', null, x['값']));
      body.appendChild(chipList(item['낱말']));
      body.appendChild(exampleList(item['예']));
    });
  }

  // ── 채점 공통 ──────────────────────────────────
  function pct(n, total) {
    return total ? (n / total * 100).toFixed(1) + '%' : '-';
  }

  function frac(n, total, withPct) {
    return n + ' / ' + total + (withPct ? ' (' + pct(n, total) + ')' : '');
  }

  // 정답 한 줄마다: 가린 문장 · 규칙 판정. (AI 판정은 나중에 채운다)
  function prepare(answers) {
    return answers.map(function (a) {
      var masked = window.Mask.mask(a.text);
      return {
        a: a,
        masked: masked,
        rule: window.Rules.classify(masked, state.criteria, state.keywords),
        ai: null,      // {cat, urg, why}
        err: null      // AI 답을 못 받은 이유
      };
    });
  }

  function rulePick(j) { return { cat: j.rule['칸'], urg: j.rule['긴급도'] }; }
  function aiPick(j) { return j.ai ? { cat: j.ai.cat, urg: j.ai.urg } : null; }

  // pick(j) 가 null 이면 «답을 못 받음» → 오답으로 센다.
  function score(items, pick) {
    var top = state.criteria['두_칸에_걸칠_때']['순서'][0];   // 가장 앞 칸(보안)
    var s = { total: items.length, catOk: 0, urgOk: 0, bothOk: 0, none: 0, topTotal: 0, topMiss: 0 };
    items.forEach(function (j) {
      var isTop = j.a.category === top;
      if (isTop) s.topTotal++;
      var p = pick(j);
      if (!p) {
        s.none++;
        if (isTop) s.topMiss++;
        return;
      }
      var c = p.cat === j.a.category;
      var u = p.urg === j.a.urgency;
      if (c) s.catOk++;
      if (u) s.urgOk++;
      if (c && u) s.bothOk++;
      if (isTop && p.cat !== top) s.topMiss++;
    });
    return s;
  }

  function wrongList(entries) {
    var out = el('div');
    out.appendChild(el('h2', null, '틀린 문장 ' + entries.length + '개 (정답 → 판정)'));
    if (!entries.length) {
      out.appendChild(el('p', 'hint', '틀린 문장이 없습니다.'));
      return out;
    }
    var ul = el('ul', 'wrong');
    entries.forEach(function (w) {
      var li = el('li');
      li.appendChild(el('div', 'id', w.id));
      li.appendChild(el('div', 'txt', w.masked));
      w.lines.forEach(function (line) { li.appendChild(el('div', 'diff', line)); });
      ul.appendChild(li);
    });
    out.appendChild(ul);
    return out;
  }

  function wrongEntries(items, pick, withErr) {
    var list = [];
    items.forEach(function (j) {
      var p = pick(j);
      var lines = [];
      if (!p) {
        lines.push('답을 못 받음' + (withErr && j.err ? ' — ' + j.err : '') + ' (오답으로 셈)');
      } else {
        if (p.cat !== j.a.category) lines.push('칸  ' + j.a.category + ' → ' + p.cat);
        if (p.urg !== j.a.urgency) lines.push('긴급도  ' + j.a.urgency + ' → ' + p.urg);
      }
      if (lines.length) list.push({ id: j.a.id, masked: j.masked, lines: lines });
    });
    return list;
  }

  function setGradeButtons(disabled) {
    $('btn-grade').disabled = disabled;
    $('btn-grade-ai').disabled = disabled;
  }

  // ── 규칙으로 채점 ──────────────────────────────
  function renderRuleGrade(answers) {
    var out = $('grade-out');
    out.textContent = '';
    var items = prepare(answers);
    var s = score(items, rulePick);

    var stats = el('ul', 'stats');
    [['칸 정확도', frac(s.catOk, s.total, true)],
     ['긴급도 정확도', frac(s.urgOk, s.total, true)],
     ['둘 다 맞은 수', frac(s.bothOk, s.total, false)]].forEach(function (r) {
      var li = el('li');
      li.appendChild(el('span', null, r[0]));
      li.appendChild(el('strong', null, r[1]));
      stats.appendChild(li);
    });
    out.appendChild(stats);

    out.appendChild(el('p', 'cond',
      '조건: 규칙만 · 가린 문장으로 분류 · 채점용 ' + s.total + '개(data/answer.json) · 낱말 keywords.json 버전 ' +
      state.keywords['version'] + ' (출처 ' + state.keywords['출처'] + ')'));
    out.appendChild(wrongList(wrongEntries(items, rulePick, false)));
  }

  function onGrade() {
    var out = $('grade-out');
    setGradeButtons(true);
    out.textContent = '채점 중…';
    getJSON('data/answer.json').then(renderRuleGrade).catch(function (e) {
      out.textContent = '';
      showNotice('채점용 정답 파일을 읽지 못했습니다: ' + e.message);
    }).then(function () { setGradeButtons(false); });
  }

  // ── AI 로 채점 ─────────────────────────────────
  function runBatches(items, onProgress) {
    var done = 0;
    var model = null;
    var requests = 0;

    function next(start) {
      if (start >= items.length) return Promise.resolve();
      var chunk = items.slice(start, start + AI_BATCH);
      requests++;
      return callAI(chunk.map(function (j) { return { id: j.a.id, text: j.masked }; })).then(function (data) {
        model = data.model || model;
        var byId = {};
        data.results.forEach(function (r) { byId[r.id] = r; });
        chunk.forEach(function (j) {
          var r = byId[j.a.id];
          if (r && !r['오류']) j.ai = { cat: r['칸'], urg: r['긴급도'], why: r['이유'] };
          else j.err = r ? r['오류'] : 'AI 가 이 문장의 답을 주지 않았습니다';
        });
      }, function (e) {
        chunk.forEach(function (j) { j.err = e.message; });
      }).then(function () {
        done += chunk.length;
        onProgress(done);
        return next(start + AI_BATCH);
      });
    }

    return next(0).then(function () { return { model: model, requests: requests }; });
  }

  function summary(s) {
    var top = state.criteria['두_칸에_걸칠_때']['순서'][0];
    var o = {
      '문장 수': s.total,
      '칸 맞은 수': s.catOk,
      '긴급도 맞은 수': s.urgOk,
      '둘 다 맞은 수': s.bothOk,
      '답을 못 받은 수': s.none
    };
    o[top + ' 정답 수'] = s.topTotal;
    o[top + '을 다른 칸으로 놓친 수'] = s.topMiss;
    return o;
  }

  function compareTable(rs, as) {
    var t = el('table', 'cmp');
    var head = el('tr');
    ['항목', '규칙', 'AI'].forEach(function (h) { head.appendChild(el('th', null, h)); });
    t.appendChild(head);
    var top = state.criteria['두_칸에_걸칠_때']['순서'][0];
    [
      ['칸 정확도', frac(rs.catOk, rs.total, true), frac(as.catOk, as.total, true)],
      ['긴급도 정확도', frac(rs.urgOk, rs.total, true), frac(as.urgOk, as.total, true)],
      ['둘 다 맞은 수', frac(rs.bothOk, rs.total, false), frac(as.bothOk, as.total, false)],
      [top + '을 다른 칸으로 놓친 수', frac(rs.topMiss, rs.topTotal, false), frac(as.topMiss, as.topTotal, false)],
      ['답을 못 받은 문장', '해당 없음', as.none + '건 (오답으로 셈)']
    ].forEach(function (r) {
      var tr = el('tr');
      r.forEach(function (cell, i) { tr.appendChild(el(i === 0 ? 'th' : 'td', null, cell)); });
      t.appendChild(tr);
    });
    return t;
  }

  function downloadJSON(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function renderAIGrade(items, meta) {
    var out = $('grade-out');
    out.textContent = '';
    var rs = score(items, rulePick);
    var as = score(items, aiPick);

    out.appendChild(compareTable(rs, as));
    out.appendChild(el('p', 'cond',
      '조건: AI = ' + (meta.model || '모델 확인 못 함') + ' · 규칙 = keywords.json 버전 ' + state.keywords['version'] +
      ' · 둘 다 가린 문장으로 분류 · 채점용 ' + items.length + '개(data/answer.json) · ' +
      AI_BATCH + '개씩 ' + meta.requests + '번 보냄 · 측정 1회'));

    var dl = el('button', 'secondary', 'AI 채점 결과 내려받기');
    dl.type = 'button';
    dl.addEventListener('click', function () {
      downloadJSON('ai_채점결과.json', {
        '측정': {
          '시각': meta.finishedAt,
          '모델': meta.model,
          '문장 수': items.length,
          '한 번에 보낸 수': AI_BATCH,
          '요청 횟수': meta.requests,
          '가린 문장으로 분류': true,
          '측정 횟수': 1,
          'criteria 버전': state.criteria['version'],
          'keywords 버전': state.keywords['version']
        },
        '요약': {
          '규칙': summary(rs),
          'AI': summary(as)
        },
        '문장별': items.map(function (j) {
          return {
            'id': j.a.id,
            '가린 문장': j.masked,
            '정답 칸': j.a.category,
            '정답 긴급도': j.a.urgency,
            '규칙 칸': j.rule['칸'],
            '규칙 긴급도': j.rule['긴급도'],
            'AI 칸': j.ai ? j.ai.cat : null,
            'AI 긴급도': j.ai ? j.ai.urg : null,
            'AI 이유': j.ai ? j.ai.why : null,
            'AI 답 못 받은 이유': j.ai ? null : j.err
          };
        })
      });
    });
    out.appendChild(dl);

    out.appendChild(wrongList(wrongEntries(items, aiPick, true)));
  }

  function onGradeAI() {
    var out = $('grade-out');
    setGradeButtons(true);
    out.textContent = 'AI 채점 준비 중…';
    getJSON('data/answer.json').then(function (answers) {
      var items = prepare(answers);
      out.textContent = 'AI 채점 중… 0/' + items.length;
      return runBatches(items, function (done) {
        out.textContent = 'AI 채점 중… ' + done + '/' + items.length;
      }).then(function (meta) {
        meta.finishedAt = new Date().toISOString();
        renderAIGrade(items, meta);
      });
    }).catch(function (e) {
      out.textContent = '';
      showNotice('AI 채점을 끝내지 못했습니다: ' + e.message);
    }).then(function () { setGradeButtons(false); });
  }

  // ── 시작 ───────────────────────────────────────
  function init() {
    setupTabs();
    $('form').addEventListener('submit', onClassify);
    $('btn-grade').addEventListener('click', onGrade);
    $('btn-grade-ai').addEventListener('click', onGradeAI);

    if (location.protocol === 'file:') {
      showNotice('이 파일을 더블클릭으로 열면 기준 파일을 읽을 수 없습니다. 폴더에서 간이 서버를 켜고 주소(http://localhost:…)로 열어 주세요.');
      return;
    }

    Promise.all([getJSON('criteria.json'), getJSON('keywords.json')]).then(function (res) {
      state.criteria = res[0];
      state.keywords = res[1];
      renderKeywords();
      $('btn-classify').disabled = false;
      setGradeButtons(false);
    }).catch(function (e) {
      showNotice('기준 파일을 읽지 못했습니다: ' + e.message);
    });
  }

  init();
})();
