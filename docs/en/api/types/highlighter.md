---
title: MawyHighlighter
order: 18
---

# `MawyHighlighter`

Something that can colour a code block. See [colouring a code block](../../guide/viewer#colouring-a-code-block).

::: fw react

```ts
interface MawyHighlighter {
  /** Whether it has anything to say about this language. */
  supports(language: string): boolean;
  /** The code, taken apart. May be answered later. */
  highlight(code: string, language: string): MawyCodeToken[] | Promise<MawyCodeToken[]>;
}
```

A highlighter that has to fetch a grammar first is the usual reason to answer later, and a block whose colour has not arrived is drawn plain until it does.

:::

::: fw flutter

```dart
abstract class MawyHighlighter {
  const MawyHighlighter();

  /// Whether it has anything to say about this language.
  bool supports(String language);

  /// The code, taken apart.
  List<MawyCodeToken> highlight(String code, String language);
}
```

:::

Tokens rather than markup, which is the whole shape of it: what a highlighter hands back is text and names, and the renderer decides what that becomes. Nothing reaches the screen as markup, here as anywhere else in this library, so a highlighter cannot put something in a document by being wrong.

The one thing a highlighter has to promise is that its tokens **are** the code: joining every `text` back together has to give back exactly what it was given. What it hands back is checked against that, and a code block that fails the check is drawn plain — colour is not worth a document that says something else.

[`mawyHighlighter`](../functions/mawy-highlighter) is the one this library ships.

## `MawyCodeToken`

::: fw react

```ts
interface MawyCodeToken {
  text: string;
  /** `null` for a run that is nothing in particular. */
  kind: MawyCodeTokenKind | null;
}
```

:::

::: fw flutter

```dart
class MawyCodeToken {
  const MawyCodeToken(this.text, [this.kind]);

  final String text;
  /// `null` for a run that is nothing in particular.
  final MawyCodeTokenKind? kind;
}
```

:::

One run of a code block, and what it is.

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

The thirteen names a run can be given, and the whole list. A kind this does not name is drawn as the plain text it is, which is the rule that keeps a parsed document from becoming something nobody decided to draw.

::: fw react

## `MawyHighlight`

```ts
type MawyHighlight = MawyHighlighter | (() => MawyHighlighter | Promise<MawyHighlighter>);
```

A highlighter, or the way to get one, which is what the `highlight` prop takes. A function is what makes it lazy, and lazy is the point:

```tsx
<MawyViewer
  value={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

Nothing is fetched until a document with a fenced code block **and** a language on the fence is actually drawn. A reader who never opens one never pays for it, and an application that never sets the prop never ships it.

:::

::: fw flutter

The `highlight` argument takes a `MawyHighlighter` itself rather than a way to get one. There is nothing to fetch in an app, and a build that never names `mawyHighlighter` never carries the grammars behind it.

:::
