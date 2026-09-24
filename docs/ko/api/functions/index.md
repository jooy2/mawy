---
title: 함수
order: 3
---

# 함수

패키지가 내보내는 것 중 컴포넌트도 타입도 아닌 것입니다. 파서 자체, 제목에 주는 앵커, 문서가 가리키는 그림, 하이라이터, 그리고 찾기 바 뒤의 계산입니다.

| 페이지 | 무엇인지 |
| --- | --- |
| [`parseMarkdown`](./parse-markdown) | 뷰어가 하는 것과 같은 호출로 문자열을 마크다운으로 읽습니다. |
| [`slugify`](./slugify) | 제목의 앵커를 GitHub이 쓰는 방식으로 만듭니다. |
| [`imageUrls`](./image-urls) | 문서가 그림을 가져오는 주소를 모두 돌려줍니다. |
| [`mawyHighlighter`](./mawy-highlighter) | 이 라이브러리가 싣는 문법 하이라이터입니다. |
| [본문 찾기](./find) | 문서에서 본문 한 대목을 찾고 바꿉니다. |

::: fw react

`parseMarkdown`, `slugify`, `imageUrls`는 `mawy-react/markdown`에, `mawyHighlighter`는 `mawy-react/highlight`에 있습니다. 둘 다 별도의 진입점이라 한 번도 참조하지 않는 애플리케이션은 아예 싣지 않습니다. 또 어느 쪽도 React나 DOM이 필요 없으므로, 파서는 페이지에서와 마찬가지로 빌드 스크립트나 서버에서도 그대로 돕니다.

:::

::: fw flutter

모두 `package:mawy/mawy.dart`에서 나옵니다. Dart 빌드는 참조되지 않는 것을 버리므로, 하이라이터를 한 번도 이름 대지 않는 애플리케이션은 그 뒤의 문법 표를 싣지 않습니다.

:::
