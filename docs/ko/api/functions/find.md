---
title: 본문 찾기
order: 4
---

# 본문 찾기

찾기 바 뒤의 계산이고, 애플리케이션이 자기 인터페이스에서 직접 몰 수 있도록 내보낸 것입니다.

::: fw react

찾기 바는 뷰어와 에디터 자신의 것입니다. 두 툴바 어느 쪽의 [`'find'`](../types/viewer-toolbar-item)이든, 그리고 버튼을 그리든 말든 `Mod`+`F`입니다. 그 아래의 함수는 내부에 있습니다. 브라우저에는 `window.find`가, `<textarea>`에는 `setSelectionRange`가 있어서 자기 검색을 모는 애플리케이션에는 필요한 것이 이미 있기 때문입니다.

:::

::: fw flutter

```dart
List<MawyMatch> findMatches(String value, String query, bool matchCase);
int matchFrom(List<MawyMatch> matches, int caret, {required bool forwards});
MawyReplaced replaceMatch(String value, MawyMatch match, String replacement);
MawyReplacedAll replaceAll(String value, String query, String replacement, bool matchCase);
```

문자열을 다루는 순수 함수입니다. 겹치는 일치에 "모두 바꾸기"가 무엇을 하는지는 산술에 관한 물음인데, 그것을 물으려고 에디터를 올려야 하는 테스트는 까다로운 절반을 아무도 쓰지 않는 테스트입니다. `src/internal/search.ts`를 함수 하나하나까지 Dart로 옮긴 것이고, `tool/parity.dart`가 둘을 비교합니다.

| 타입              | 무엇인지                                                  |
| ----------------- | --------------------------------------------------------- |
| `MawyMatch`       | 일치 하나가 문서의 어디인지. `start`와 `end`.             |
| `MawyReplaced`    | 치환이 남긴 문서와 캐럿이 간 자리. `value`와 `caret`.     |
| `MawyReplacedAll` | "모두 바꾸기"가 남긴 문서와 바꾼 개수. `value`와 `count`. |

`matchFrom`은 `matches`의 인덱스로 답하고, 갈 곳이 없으면 `-1`로 답합니다. 앞으로는 캐럿과 같거나 그 뒤에서 시작하는 첫 일치, 뒤로는 그 앞에서 시작하는 마지막 일치이고, 둘 다 순환합니다. 파일 끝에서 멈추는 검색은 끝내려면 맨 위로 스크롤해야 하는 검색이기 때문입니다.

`replaceAll`은 `replaceMatch`를 반복하지 않고 한 번에 처리하는데, 속도 때문이 아닙니다. `a`를 `aa`로 한 번에 하나씩 바꾸면 바꿔 놓은 것을 다시 찾아 또 바꾸기를 끝없이 반복합니다. 검색 대상은 손대기 전의 문서입니다.

**정규식이 아니라 언제나 평문입니다.** 빠진 기능이 아니라 결정입니다. 찾기 상자가 `(`를 조용히 문법 오류로 컴파일하는 에디터는 글 쓰는 사람이 문서를 맡길 수 없는 에디터이고, 마크다운 문서에는 `*`, `[`, `.`, `+`가 가득합니다. 대신 있는 것이 대소문자 구분 스위치이고, 사람들이 실제로 찾는 옵션이 그것입니다.

:::
