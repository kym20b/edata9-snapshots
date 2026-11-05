// rules.js — AI 없이 낱말로만 칸 · 긴급도를 가른다. 낱말과 순서는 모두 파일에서 읽는다.
//   criteria.json  : 칸 · 순서 · 긴급도 값
//   keywords.json  : 칸마다 · 긴급도마다 낱말, 긴급도 기본값
// 띄어쓰기는 무시하고 맞춰 본다(«안 켜» = «안켜»).
(function (root) {
  'use strict';

  function squash(s) {
    return String(s).replace(/\s+/g, '').toLowerCase();
  }

  function found(textSq, words) {
    return words.filter(function (w) { return textSq.indexOf(squash(w)) !== -1; });
  }

  function quote(words) {
    return words.map(function (w) { return '‘' + w + '’'; }).join('·');
  }

  function classify(text, criteria, keywords) {
    var sq = squash(text);

    // ── 칸: 순서 앞쪽부터 낱말이 하나라도 있으면 그 칸. 없으면 순서의 마지막 칸.
    var order = criteria['두_칸에_걸칠_때']['순서'];
    var fallback = order[order.length - 1];
    var front = order.slice(0, -1);
    var catHits = {};
    order.forEach(function (c) {
      catHits[c] = found(sq, (keywords['칸'][c] || {})['낱말'] || []);
    });
    var chosen = front.filter(function (c) { return catHits[c].length > 0; })[0] || fallback;

    var catReason;
    if (chosen !== fallback) {
      var others = front.filter(function (c) { return c !== chosen && catHits[c].length > 0; });
      catReason = quote(catHits[chosen]) + ' → ' + chosen +
        (others.length ? ' (' + others.join('·') + ' 낱말도 있지만 앞 칸 우선)' : '');
    } else if (catHits[fallback].length) {
      catReason = quote(catHits[fallback]) + ' 만 있고 앞 칸 낱말이 없어 ' + fallback;
    } else {
      catReason = '어느 칸 낱말도 없어 ' + fallback;
    }

    // ── 긴급도: 낱말이 가장 많은 값. 같으면 criteria.json 에서 앞에 있는 값. 없으면 기본값.
    var levels = criteria['긴급도'].map(function (x) { return x['값']; });
    var urgHits = {};
    levels.forEach(function (v) {
      urgHits[v] = found(sq, ((keywords['긴급도'][v] || {})['낱말']) || []);
    });
    var best = null;
    levels.forEach(function (v) {
      if (urgHits[v].length > 0 && (best === null || urgHits[v].length > urgHits[best].length)) best = v;
    });

    var urgency, urgReason;
    if (best === null) {
      urgency = keywords['긴급도_기본값'];
      urgReason = '긴급도 낱말이 없어 기본값 ' + urgency;
    } else {
      urgency = best;
      var tied = levels.filter(function (v) { return v !== best && urgHits[v].length === urgHits[best].length; });
      urgReason = quote(urgHits[best]) + ' → ' + urgency +
        (tied.length ? ' (' + tied.join('·') + ' 와 낱말 수가 같아 앞 값)' : '');
    }

    return {
      '칸': chosen,
      '긴급도': urgency,
      '칸낱말': catHits[chosen],
      '긴급도낱말': urgHits[urgency] || [],
      '이유': '칸: ' + catReason + ' / 긴급도: ' + urgReason
    };
  }

  var api = { classify: classify };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Rules = api;
})(typeof window !== 'undefined' ? window : this);
