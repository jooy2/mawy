---
title: API
order: 2
---

# API

패키지가 내보내는 컴포넌트와 타입과 함수를 하나에 한 페이지씩 담았습니다. 각 항목이 무엇이고 무엇을 받아 무엇을 돌려주는지 적었습니다.

여기 있는 것은 메뉴 위 스위치가 가리키는 패키지에 모두 존재하고 실제로 동작합니다. 한쪽에만 있는 이름은 해당 페이지가 그렇게 밝히고, 다른 쪽은 대신 무엇을 하는지 가리킵니다.

## 컴포넌트

::: fw react

| 페이지 | 무엇인지 |
| --- | --- |
| [`MawyViewer`](./components/mawy-viewer) | 마크다운 문서를 그리고, 편집하지는 않습니다. |
| [`MawyEditor`](./components/mawy-editor) | 뷰어를 옆에 둔 마크다운 에디터입니다. |
| [`MawyDocument`](./components/mawy-document) | 서버에서 그린 문서. 그것을 위한 자바스크립트는 보내지 않습니다. |

:::

::: fw flutter

| 페이지                                   | 무엇인지                                     |
| ---------------------------------------- | -------------------------------------------- |
| [`MawyViewer`](./components/mawy-viewer) | 마크다운 문서를 그리고, 편집하지는 않습니다. |
| [`MawyEditor`](./components/mawy-editor) | 뷰어를 옆에 둔 마크다운 에디터입니다.        |

:::

## 타입

::: fw react

| 페이지 | 다루는 이름 |
| --- | --- |
| [에디터 화면](./types/editor-mode) | `MawyMode` |
| [`MawyEditorToolbarItem`](./types/editor-toolbar-item) | `MawyEditorToolbarItem`, `MawyEditorToolbarOption` |
| [`MawyEditorStatusItem`](./types/editor-status-item) | `MawyEditorStatusItem`, `MawyEditorStatusOption` |
| [`MawyViewerToolbarItem`](./types/viewer-toolbar-item) | `MawyViewerToolbarItem`, `MawyViewerToolbarOption` |
| [프레임](./types/frame) | `MawyFrame`, `MawyToolbarPlacement` |
| [`MawyColorScheme`](./types/color-scheme) | `MawyColorScheme` |
| [`MawyLocale`](./types/locale) | `MawyLocale` |
| [`MawyParseOptions`](./types/parse-options) | `MawyParseOptions` |
| [`MdDocument`](./types/md-document) | `MdDocument`와 그 아래 모든 노드 타입 |
| [`MawyHtmlPolicy`](./types/html-policy) | `MawyHtmlPolicy` |
| [링크](./types/link-target) | `MawyLinkTarget`, `MawyLinkRel` |
| [`MawyUrlResolver`](./types/url-resolver) | `MawyUrlResolver`, `MawyUrlKind` |
| [`MawyTypography`](./types/typography) | `MawyTypography` |
| [`MawyFontFamily`](./types/font-family) | `MawyFontFamily` |
| [`MawyFont`](./types/font) | `MawyFont`, `MAWY_SYSTEM_FONTS`, `MAWY_WEB_FONTS` |
| [`MawyMeasure`](./types/measure) | `MawyMeasure` |
| [`MawyDirectiveKind`](./types/directive-kind) | `MawyDirectiveKind` |
| [디렉티브](./types/directives) | `MawyDirectives`, `MawyDirectiveProps` |
| [`MawyHighlighter`](./types/highlighter) | `MawyHighlighter`, `MawyHighlight`, `MawyCodeToken`, `MawyCodeTokenKind` |
| [이미지](./types/image) | `MawyImageProps`, `MawyImageUpload`, `MawyImageSource` |
| [`MawyRange`](./types/range) | `MawyRange` |

`mawy-react/types`에서도 가져올 수 있습니다. 컴포넌트를 import하지 않고 자기 props에 이 이름들을 쓰려는 애플리케이션을 위한 진입점입니다.

:::

::: fw flutter

| 페이지 | 다루는 이름 |
| --- | --- |
| [에디터 화면](./types/editor-mode) | `MawyEditorMode`, `kMawyEditorModes` |
| [`MawyEditorToolbarItem`](./types/editor-toolbar-item) | `MawyEditorToolbarItem`, `kMawyEditorToolbar` |
| [`MawyEditorStatusItem`](./types/editor-status-item) | `MawyEditorStatusItem`, `kMawyEditorStatus` |
| [`MawyViewerToolbarItem`](./types/viewer-toolbar-item) | `MawyViewerToolbarItem`, `kMawyViewerToolbar` |
| [`MawyColorScheme`](./types/color-scheme) | `MawyColorScheme` |
| [`MawyLocale`](./types/locale) | `MawyLocale` |
| [`MawyParseOptions`](./types/parse-options) | `MawyParseOptions` |
| [`MdDocument`](./types/md-document) | `MdDocument`와 그 아래 모든 노드 클래스 |
| [`MawyUrlResolver`](./types/url-resolver) | `MawyUrlResolver`, `MawyUrlKind` |
| [`MawyTypography`](./types/typography) | `MawyTypography` |
| [`MawyFontFamily`](./types/font-family) | `MawyFontFamily` |
| [`MawyMeasure`](./types/measure) | `MawyMeasure`, `MawyMeasureWidth` |
| [`MawyDirectiveKind`](./types/directive-kind) | `MawyDirectiveKind` |
| [디렉티브](./types/directives) | `MawyDirective`, `MawyDirectiveBuilder` |
| [`MawyHighlighter`](./types/highlighter) | `MawyHighlighter`, `MawyCodeToken`, `MawyCodeTokenKind` |
| [이미지](./types/image) | `MawyImage`, `MawyImageBuilder` |
| [`MawyViewerAnchors`](./types/viewer-anchors) | `MawyViewerAnchors` |

`package:mawy/mawy.dart`가 이 패키지의 공개 표면 전부입니다. import 하나면 다 됩니다.

:::

## 함수

| 페이지 | 무엇인지 |
| --- | --- |
| [`parseMarkdown`](./functions/parse-markdown) | 뷰어가 하는 것과 같은 방식으로 문자열을 마크다운으로 읽습니다. |
| [`slugify`](./functions/slugify) | 제목의 앵커를 GitHub이 쓰는 방식으로 만듭니다. |
| [`mawyHighlighter`](./functions/mawy-highlighter) | 이 라이브러리가 싣는 문법 하이라이터입니다. |
| [본문 찾기](./functions/find) | 찾기 바 뒤의 계산입니다. |

## 테마

[테마](./theming)는 이 라이브러리가 그릴 때 쓰는 모든 색과 모서리와 지속 시간이고, 애플리케이션이 바꿀 수 있는 범위의 전부입니다.

::: fw flutter

에디터는 서식 명령을 이루는 계산도 내보냅니다. `MawyCommand`, `runCommand`, `commandActive`, `continueList`, `indent`, 그리고 그것들이 다루는 `EditState`입니다. 자기 툴바에서 에디터를 모는 애플리케이션을 위한 것이고, React 패키지의 내부와 같은 이름의 같은 함수들입니다.

:::
