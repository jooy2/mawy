---
title: mawyHighlighter
order: 3
---

# `mawyHighlighter`

이 라이브러리가 싣는 문법 하이라이터이고, 문서가 흔히 보여 주는 언어를 다룹니다. [코드 블록에 색 입히기](../../guide/viewer#코드-블록에-색-입히기)를 보세요.

::: fw react

```ts
const mawyHighlighter: MawyHighlighter;
const MAWY_HIGHLIGHT_LANGUAGES: readonly string[];
```

`mawy-react/highlight`는 별도의 진입점이라, 이것을 한 번도 참조하지 않는 애플리케이션은 아예 싣지 않습니다. 하이라이터 자체가 아니라 함수를 넘기는 것이 첫 로드에서 이것을 빼 두는 방법입니다.

```tsx
<MawyViewer
  value={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

`MAWY_HIGHLIGHT_LANGUAGES`는 이것이 답하는 모든 이름을 정렬해 둔 것이고, 그 목록을 그리려는 애플리케이션을 위한 것입니다.

:::

::: fw flutter

```dart
const MawyHighlighter mawyHighlighter;
List<String> get kMawyHighlightLanguages;
```

```dart
MawyViewer(value: document, highlight: mawyHighlighter);
```

Dart 빌드는 참조되지 않는 코드를 버리므로, 이것을 한 번도 참조하지 않는 애플리케이션은 그 뒤의 문법 표를 싣지 않습니다. `kMawyHighlightLanguages`는 이것이 답하는 모든 이름이고, 그 목록을 그리려는 애플리케이션을 위한 것입니다.

이것은 React 패키지의 하이라이터를 Dart로 옮긴 것입니다. `lib/src/highlight.dart`가 `src/highlight.ts`와 규칙 하나하나까지 대응하고, `tool/parity.dart`가 어느 한쪽이라도 지원하는 모든 언어의 코드 조각에 대해 두 쪽이 내놓는 토큰을 비교합니다.

:::

다루는 언어는 `js`, `ts`, `jsx`, `tsx`, `json`, `html`, `xml`, `css`, `bash`, `python`, `yaml`, `sql`, `dart`, `go`, `rust`, `java`, `c`, `cpp`과 각각이 답하는 다른 이름들입니다. 결과는 의도적으로, 그리고 앞으로도 **대략적**입니다. 중괄호가 든 템플릿 리터럴이나 나눗셈으로 읽히는 정규식은 조금 어긋나게 나오는데, 색이 정확할 필요는 없으므로 문제가 되지 않습니다.

그 이상이 필요하면 [`MawyHighlighter`](../types/highlighter)가 인터페이스의 전부이고, 그 뒤에 Shiki나 Prism이나 직접 만든 문법을 두는 데는 몇 줄이면 됩니다.
