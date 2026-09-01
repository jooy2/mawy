---
title: 시작하기
order: 1
---

# 시작하기

Mawy는 프레임워크마다 하나의 패키지로 배포되고, 그 둘은 두 개의 라이브러리가 아니라 하나입니다. 같은 파서, 문서를 같은 방식으로 읽는 것, 16진수까지 같은 팔레트. 사이드바에서 쓰실 것을 고르세요. 메뉴 위에 있는 그 스위치가 이 사이트 모든 페이지의 내용을 바꿉니다.

|             |                                                                |                   |
| ----------- | -------------------------------------------------------------- | ----------------- |
| **React**   | npm의 [`mawy-react`](https://www.npmjs.com/package/mawy-react) | 뷰어**와** 에디터 |
| **Flutter** | pub.dev의 [`mawy`](https://pub.dev/packages/mawy)              | 뷰어              |

::: warning 초기 버전이고, 버전이 그렇게 말합니다

`0.1.0`이 둘 다의 첫 릴리스입니다. 이 페이지의 내용은 전부 실제로 동작합니다 — 이 사이트가 설치하는 것과 같은 소스에서 두 패키지를 모두 그립니다 — 다만 `0.x`는 마이너 버전 사이에서도 API가 바뀔 수 있습니다. 그것이 중요하다면 버전을 고정하고, [변경 기록](../changelog)을 확인하세요.

:::

## 요구 사항

::: fw react

- **React 18 또는 19**. `react-dom`과 함께 peer dependency입니다.
- 빌드에는 **Node.js 20.19 이상**.
- `contenteditable`과 `Selection`, `beforeinput`을 지원하는 브라우저 — 최신 브라우저는 모두 해당합니다.

:::

::: fw flutter

- **Flutter 3.32 이상**과 함께 오는 Dart SDK.
- 그 밖에는 없습니다. 이 패키지는 Material도 Cupertino도 import하지 않으므로, `MaterialApp` 안에도 `CupertinoApp` 안에도 맨 `WidgetsApp` 안에도 두 번째 디자인 시스템을 끌고 들어가지 않고 들어갑니다.

:::

## 설치

::: fw react

```bash
npm install mawy-react
```

`react`와 `react-dom`은 peer dependency입니다. 프로젝트에 이미 있다면 Mawy는 그 사본을 씁니다.

런타임 의존성은 하나, 툴바 아이콘이 나오는 [`lucide-react`](https://lucide.dev)입니다. ISC 라이선스이고, 다른 것을 끌고 오지 않으며, 실제로 그리는 십여 개 글리프까지 tree-shaking됩니다.

:::

::: fw flutter

```bash
flutter pub add mawy
```

의존성은 하나, 툴바 아이콘이 나오는 [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter)입니다. `lucide-react`가 그리는 것과 같은 세트이고, 그래서 두 툴바가 비슷한 툴바가 아니라 같은 툴바입니다. MIT 라이선스이고 다른 것을 끌고 오지 않습니다. 다만 여기서 작지 않은 유일한 것이기도 합니다. 빌드에서 가변 폰트로 3MB쯤이고, 앱 번들에서는 평범하지만 웹에서는 알아둘 값입니다.

:::

### 얼마나 큰가

::: fw react

| 무엇을 가져오면         | gzip    |
| ----------------------- | ------- |
| `MawyViewer`            | 23.0 kB |
| `MawyEditor`            | 38.9 kB |
| `mawy-react/highlight`  | 2.8 kB  |
| `mawy-react/styles.css` | 5.5 kB  |

React는 세지 않았습니다. 애플리케이션에 이미 있으니까요. `lucide-react`는 셌습니다. 이것 때문에 따라오니까요. **문서를 읽기만 하는 페이지는 에디터를 싣지 않습니다.** 툴바도, 실행 취소 기록도, 붙여넣기 경로도, `contenteditable` 화면도 전부 번들에서 떨어져 나갑니다. 위 두 줄 사이의 15킬로바이트가 그만큼의 값입니다.

이 숫자들은 어림이 아니라 배포되는 파일을 실제로 번들한 결과이고, `packages/react/size-budget.json`에 적혀 있으며, 넘어서는 변경은 CI가 떨어뜨립니다. 그래서 바라는 값이 아니라 받는 값입니다.

:::

::: fw flutter

앱 번들은 페이지처럼 재지 않습니다. 여기서 알아둘 만한 값은 위에 적은 아이콘 폰트의 3MB 하나이고, 이 절은 React 패키지의 것입니다.

:::

## 연결하기

::: fw react

애플리케이션의 CSS 진입점에 한 줄을 더합니다.

```css
@import 'mawy-react/styles.css';
```

이 스타일시트는 완성된 CSS입니다. 빌드 쪽 설정도, 플러그인도, 구성도 없습니다. 라이브러리가 그리는 모든 것이 `--mawy-*` 커스텀 프로퍼티를 지나므로, 테마를 바꾸는 일은 규칙을 이기는 것이 아니라 토큰을 다시 선언하는 일입니다. 토큰은 상속되므로, 감싸는 엘리먼트에 한 번 선언하면 그 안의 모든 Mawy 표면에 닿습니다.

:::

::: fw flutter

연결할 것이 없습니다. 팔레트는 전역이 아니라 위젯을 따라 내려갑니다. 밝은 화면 안에서 문서 하나만 어둡게 할 수 있는 이유가 그것입니다.

```dart
import 'package:mawy/mawy.dart';
```

:::

## 문서 보여주기

::: fw react

```tsx
import { MawyViewer } from 'mawy-react';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

:::

그것으로 완성된 읽기 화면입니다. 그려진 문서와, 읽는 사람이 바꾸고 싶어 하는 것들을 위한 툴바 — 글자 크기, 줄 간격, 테마, 본문 폭. 어느 것도 문서를 건드리지 않습니다.

<MawyDemo name="viewer/basic" flutter="viewer/basic" :height="520" />

## 툴바에 무엇을 둘지

::: fw react

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

`true`는 전부, `false`는 없음, 배열은 정확히 그 컨트롤들을 정확히 그 순서로.

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  toolbar: const <MawyViewerToolbarItem>[
    MawyViewerToolbarItem.fontSize,
    MawyViewerToolbarItem.colorScheme,
  ],
);
```

`kMawyViewerToolbar`가 전부이고 `const []`가 없음입니다. 목록은 정확히 그 컨트롤들을 정확히 그 순서로.

:::

목록은 [뷰어](./viewer#툴바)에 있습니다.

## 문서 쓰기

::: fw react

```tsx
import { MawyEditor } from 'mawy-react';

export function Page() {
  return <MawyEditor defaultValue="# Hello" onChange={save} />;
}
```

문법에 색이 입혀진 마크다운 원문, 그 옆의 실시간 미리보기, 모든 명령에 키보드 단축키가 있는 서식 툴바, 그리고 세어 주는 상태 표시줄. 나머지는 [에디터](./editor)에 있습니다.

:::

::: fw flutter

문법에 색이 입혀진 마크다운 원문, 그 옆의 실시간 미리보기, 서식 툴바, 그리고 세어 주는 상태 표시줄.

```dart
MawyEditor(defaultValue: '# Hello', onChange: save);
```

React 패키지의 넷이 아니라 화면은 셋입니다. `plain`, `split`, `preview`. 빠진 하나는 `wysiwyg`이고, 그것은 그려진 자리에서 문서를 편집하며 전적으로 `contenteditable` 위에 서 있습니다. Flutter에는 그런 것이 없고, 여기서 그려지는 화면은 뷰어로 남습니다. 이유는 [에디터](./editor)에 있습니다.

:::

## 문서가 아예 없을 때

::: fw react

`value`는 선택입니다. 빼는 것은 빈 상태가 아니라 컴포넌트의 나머지 절반입니다. 보여줄 것이 없으면 뷰어가 **곧** 파일 선택기입니다. `.md` 파일을 놓거나, 하나를 고르세요.

```tsx
<MawyViewer onValueChange={(markdown, file) => save(file?.name, markdown)} />
```

:::

::: fw flutter

`value`는 필수입니다. 파일을 여는 것은 파일 선택기를 뜻하고, 그것은 플러그인을 뜻합니다. 이 패키지에는 없고 애플리케이션에는 대개 이미 있는 의존성이죠. 그래서 파일을 읽는 것은 여러분의 몫이고 그리는 것이 Mawy의 몫입니다.

:::

## 지금 패키지에 든 것

::: fw react

|  |  |
| --- | --- |
| `MawyViewer` | 읽기 전용 뷰어. [가이드](./viewer), [API](../api/#mawyviewer) |
| `MawyEditor` | 에디터. [가이드](./editor) |
| `mawy-react/highlight` | 문법 하이라이터. 별도 진입점 |
| `mawy-react/styles.css` | 위의 스타일시트 |
| 타입 | `MawyMode`, `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyHighlight`, `MawyImageUpload`, 그리고 툴바·상태 항목 타입들 |

타입은 `mawy-react/types`에서도 가져올 수 있습니다. 컴포넌트를 import하지 않고도 자기 props에 타입 이름을 쓸 수 있도록.

:::

::: fw flutter

|  |  |
| --- | --- |
| `MawyViewer` | 읽기 전용 뷰어. [가이드](./viewer) |
| `MawyEditor` | 에디터. 원문과 미리보기, 그 사이의 전환. [가이드](./editor) |
| `parseMarkdown` | 파서, 그리고 그것이 만드는 `Md*` 트리 전부 |
| `MawyTokens` | 팔레트. `MawyTokens.light`와 `MawyTokens.dark`, 그리고 직접 만들 때의 `copyWith` |
| `mawyHighlighter` | 신택스 하이라이터. 지목해야만 빌드에 남습니다 |
| 타입 | `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyViewerToolbarItem`, `MawyTokensBuilder`, `MawyHighlighter`, `MawyCodeToken`, `MawyCodeTokenKind`, `MawyMatch` |

import 하나면 전부입니다. `package:mawy/mawy.dart`.

:::

## 다음

- [**뷰어**](./viewer) — 편집하지 않고 문서를 그리기.
- [**에디터**](./editor) — 위지윅 화면과 원문 화면, 그리고 그 사이의 전환. 지금은 React만.
- [**API**](../api/) — 모든 컴포넌트와 모든 옵션.
