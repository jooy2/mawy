---
title: 타입
order: 2
---

# 타입

패키지가 내보내는 타입을 하나에 한 페이지씩 담았습니다.

::: fw react

`mawy-react`와 `mawy-react/types` 양쪽에서 내보냅니다. 두 번째 진입점은 컴포넌트를 import하지 않고 자기 props에 이 이름들을 쓰려는 애플리케이션을 위해 있습니다.

:::

::: fw flutter

`package:mawy/mawy.dart`에서 내보내고, 그것이 이 패키지의 공개 표면 전부입니다. import 하나면 다 됩니다.

:::

## 에디터와 뷰어

| 페이지 | 다루는 것 |
| --- | --- |
| [에디터 화면](./editor-mode) | 문서를 어느 화면으로 보여 줄지. |
| [`MawyEditorToolbarItem`](./editor-toolbar-item) | 에디터 툴바의 컨트롤 하나와 고르는 방법. |
| [`MawyEditorStatusItem`](./editor-status-item) | 에디터가 아래쪽 가장자리에서 세는 것. |
| [`MawyViewerToolbarItem`](./viewer-toolbar-item) | 뷰어 툴바의 컨트롤 하나와 고르는 방법. |
| [`MawyColorScheme`](./color-scheme) | 어느 팔레트로 그릴지. |
| [`MawyLocale`](./locale) | 인터페이스가 쓰는 언어. 문서의 언어가 아닙니다. |

## 문서 읽기

| 페이지 | 다루는 것 |
| --- | --- |
| [`MawyParseOptions`](./parse-options) | 마크다운 자체를 어떻게 읽을지. |
| [`MdDocument`](./md-document) | 파싱한 문서와 그 아래 모든 노드. |
| [`MawyUrlResolver`](./url-resolver) | 문서의 상대 URL이 어디를 가리키는지. |
| [`MawyDirectiveKind`](./directive-kind) | 디렉티브가 세 모양 중 어느 것으로 쓰였는지. |
| [디렉티브](./directives) | 이 패키지가 모르는 구성물을 무엇으로 그릴지. |
| [`MawyHighlighter`](./highlighter) | 코드 블록에 마크업이 아니라 토큰으로 색을 입히는 것. |
| [이미지](./image) | 그림이 무엇이 되는지, 에디터에 넣은 그림이 어디로 가는지. |

::: fw react

| 페이지                            | 다루는 것                             |
| --------------------------------- | ------------------------------------- |
| [`MawyHtmlPolicy`](./html-policy) | 문서 안에 쓰인 날 HTML을 어떻게 할지. |
| [`MawyLinkTarget`](./link-target) | 문서가 쓴 링크가 어디에서 열릴지.     |
| [`MawyRange`](./range)            | 문서의 한 조각이 쓰인 자리를 두 수로. |

:::

## 문서 조판

| 페이지                            | 다루는 것                          |
| --------------------------------- | ---------------------------------- |
| [`MawyTypography`](./typography)  | 문서를 어떻게 조판할지.            |
| [`MawyFontFamily`](./font-family) | 어느 서체로 조판할지.              |
| [`MawyMeasure`](./measure)        | 글줄이 얼마나 길게 흐를 수 있는지. |

::: fw react

| 페이지               | 다루는 것                                  |
| -------------------- | ------------------------------------------ |
| [`MawyFont`](./font) | 툴바가 제시하는 글꼴과, 넘길 만한 두 목록. |

:::

::: fw flutter

## 배치

| 페이지                                  | 다루는 것                                  |
| --------------------------------------- | ------------------------------------------ |
| [`MawyViewerAnchors`](./viewer-anchors) | 그려진 문서의 블록이 각각 어디에 놓였는지. |

:::
