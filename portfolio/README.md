# 내 포트폴리오 — 시작

1주 금요일에 받아서, **매주 금요일에 카드 한 칸**을 더합니다. 9주가 끝나면 링크 하나로 9주가 보입니다.

## 한 칸 더하기

`portfolio.json` 의 `cards` 에 이 모양으로 하나를 넣습니다.

```json
{"week": 1, "title": "감 테스트", "line": "무엇을 하는 도구인지 한 줄",
 "judgment": "이 도구에 내가 박아 넣은 판단 하나",
 "ai": ["Claude Code", "v0"], "url": "https://(내 주소).vercel.app", "img": "img/w1.jpg"}
```

- **`judgment` 가 가장 중요합니다.** 무엇을 만들었는지보다 **무엇을 정했는지**가 남에게 보여줄 것입니다
- 화면 캡처를 `img/` 에 넣고 `img` 에 경로를 적습니다 (없으면 비워 둡니다)
- 9주차에 `proposal` 을 채웁니다 — 제안 1건

## 올리기

Vercel → Import → Framework Preset: Other → Deploy. 한 번 올리면 이후에는 `git push` 할 때마다 다시 올라갑니다.
