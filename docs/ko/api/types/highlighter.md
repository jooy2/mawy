---
title: MawyHighlighter
order: 18
---

# `MawyHighlighter`

코드 블록에 색을 입힐 수 있는 것입니다. [코드 블록에 색 입히기](../../guide/viewer#코드-블록에-색-입히기)를 보세요.

::: fw react

```ts
interface MawyHighlighter {
  /** 이 언어에 대해 할 말이 있는지. */
  supports(language: string): boolean;
  /** 해체한 코드. 나중에 답해도 됩니다. */
  highlight(code: string, language: string): MawyCodeToken[] | Promise<MawyCodeToken[]>;
}
```

나중에 답하는 흔한 이유는 문법을 먼저 가져와야 하는 하이라이터입니다. 색이 아직 도착하지 않은 블록은 도착할 때까지 색 없이 그립니다.

:::

::: fw flutter

```dart
abstract class MawyHighlighter {
  const MawyHighlighter();

  /// 이 언어에 대해 할 말이 있는지.
  bool supports(String language);

  /// 해체한 코드.
  List<MawyCodeToken> highlight(String code, String language);
}
```

:::

마크업이 아니라 토큰인 것이 이 설계의 전부입니다. 하이라이터가 돌려주는 것은 글자와 이름이고, 그것이 무엇이 될지는 렌더러가 정합니다. 이 라이브러리의 다른 곳과 마찬가지로 화면에 마크업으로 닿는 것은 없으므로, 하이라이터가 틀렸다고 해서 문서에 무언가를 넣을 수는 없습니다.

하이라이터가 지켜야 할 약속은 하나입니다. 토큰이 **곧 그 코드**여야 합니다. 모든 `text`를 도로 이어 붙이면 받은 것이 그대로 나와야 합니다. 돌려준 값을 그 기준으로 검사하고, 통과하지 못한 코드 블록은 색 없이 그립니다. 문서가 다른 말을 하게 만드는 값으로 얻을 만큼 색이 중요하지는 않습니다.

이 라이브러리가 싣는 하이라이터는 [`mawyHighlighter`](../functions/mawy-highlighter)입니다.

## `MawyCodeToken`

::: fw react

```ts
interface MawyCodeToken {
  text: string;
  /** 특별히 무엇도 아닌 조각은 `null`. */
  kind: MawyCodeTokenKind | null;
}
```

:::

::: fw flutter

```dart
class MawyCodeToken {
  const MawyCodeToken(this.text, [this.kind]);

  final String text;
  /// 특별히 무엇도 아닌 조각은 `null`.
  final MawyCodeTokenKind? kind;
}
```

:::

코드 블록의 조각 하나와 그것이 무엇인지입니다.

## `MawyCodeTokenKind`

::: fw react

```ts
type MawyCodeTokenKind =
  | 'comment'
  | 'string'
  | 'regex'
  | 'number'
  | 'constant'
  | 'keyword'
  | 'type'
  | 'function'
  | 'variable'
  | 'attribute'
  | 'tag'
  | 'operator'
  | 'punctuation';
```

:::

::: fw flutter

```dart
enum MawyCodeTokenKind {
  comment,
  string,
  regex,
  number,
  constant,
  keyword,
  type,
  function,
  variable,
  attribute,
  tag,
  operator,
  punctuation,
}
```

:::

조각에 붙일 수 있는 열세 이름이고, 목록은 이것이 전부입니다. 여기에 없는 종류는 그냥 글자로 그립니다. 파싱한 문서가 아무도 그리기로 정하지 않은 것이 되지 않게 하는 규칙입니다.

::: fw react

## `MawyHighlight`

```ts
type MawyHighlight = MawyHighlighter | (() => MawyHighlighter | Promise<MawyHighlighter>);
```

하이라이터, 또는 하이라이터를 가져오는 방법입니다. `highlight` 프롭이 받는 것이 이것입니다. 함수 형태가 지연 로딩을 만들고, 지연 로딩이 핵심입니다.

```tsx
<MawyViewer
  value={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

펜스 코드 블록이 있고 **그 펜스에 언어까지 적힌** 문서를 실제로 그리기 전에는 아무것도 가져오지 않습니다. 그런 문서를 한 번도 열지 않는 독자는 값을 치르지 않고, 프롭을 쓰지 않는 애플리케이션은 아예 싣지 않습니다.

:::

::: fw flutter

`highlight` 인자는 가져오는 방법이 아니라 `MawyHighlighter` 자체를 받습니다. 앱에는 가져올 것이 없고, `mawyHighlighter`를 한 번도 이름 대지 않는 빌드는 그 뒤의 문법 표를 싣지 않습니다.

:::
