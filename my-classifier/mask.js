// mask.js — 이름 · 전화번호 · 사번을 [이름] [전화번호] [사번] 으로 바꾼다.
// 분류는 이 함수를 거친 문장으로 한다.
// 이름은 패턴으로만 찾는다(호칭 앞 · «○○○입니다» · «이름은 ○○○»). 이 밖의 자리에 쓴 이름은 못 가린다.
(function (root) {
  'use strict';

  // 이름처럼 보이지만 이름이 아닌 앞말. 이 낱말이 호칭 앞에 오면 가리지 않는다.
  var NOT_NAME = ['우리', '저희', '신입', '새로', '담당', '옆자리', '우리팀', '다른', '이전', '해당'];

  function isName(word) {
    return NOT_NAME.indexOf(word) === -1;
  }

  function mask(text) {
    var s = String(text);

    // 전화번호: 010-1234-5678 · 02-123-4567 · 01012345678
    s = s.replace(/\b0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}\b|\b01\d{8,9}\b/g, '[전화번호]');

    // 사번: «사번 00000» · «사번은 12345» · «사원번호: A1234»
    s = s.replace(/(사번|사원번호)(\s*[은는이가:]?\s*)[A-Za-z]{0,2}\d{3,}/g, '$1$2[사번]');

    // 이름 ① 호칭 앞: «홍길동 사원» · «김아무개 대리»
    s = s.replace(/([가-힣]{2,4})(\s+)(사원|대리|과장|차장|부장)/g, function (m, name, sp, title) {
      return isName(name) ? '[이름]' + sp + title : m;
    });

    // 이름 ② «이름은 ○○○» · «성함은 ○○○»
    s = s.replace(/(이름은|성함은)\s*[가-힣]{2,4}/g, '$1 [이름]');

    // 이름 ③ 문장 머리 «○○○입니다» · «저는 ○○○입니다»
    s = s.replace(/(^|[,.!?]\s*)([가-힣]{2,4})(?=입니다|이에요|예요)/g, function (m, head, name) {
      return isName(name) ? head + '[이름]' : m;
    });
    s = s.replace(/(저는\s*)([가-힣]{2,4})(?=입니다|이에요|예요)/g, function (m, head, name) {
      return isName(name) ? head + '[이름]' : m;
    });

    return s;
  }

  var api = { mask: mask };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Mask = api;
})(typeof window !== 'undefined' ? window : this);
