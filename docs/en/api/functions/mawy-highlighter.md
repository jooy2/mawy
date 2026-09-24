---
title: mawyHighlighter
order: 4
---

# `mawyHighlighter`

The syntax highlighter this library ships, for the languages a document usually shows. See [colouring a code block](../../guide/viewer#colouring-a-code-block).

::: fw react

```ts
const mawyHighlighter: MawyHighlighter;
const MAWY_HIGHLIGHT_LANGUAGES: readonly string[];
```

`mawy-react/highlight` is an entry point of its own, so an application that never references it never ships it — and passing a function rather than the highlighter itself is what keeps it out of the first load:

```tsx
<MawyViewer
  value={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

`MAWY_HIGHLIGHT_LANGUAGES` is every name it answers to, sorted, for an application drawing a list of them.

:::

::: fw flutter

```dart
const MawyHighlighter mawyHighlighter;
List<String> get kMawyHighlightLanguages;
```

```dart
MawyViewer(value: document, highlight: mawyHighlighter);
```

An application that never references it never carries the grammars behind it, because a Dart build drops unreferenced code. `kMawyHighlightLanguages` is every name it answers to, for an application drawing a list of them.

This is the React package's highlighter in Dart. `lib/src/highlight.dart` matches `src/highlight.ts` rule for rule, and `tool/parity.dart` diffs every token the two produce over a piece of every language either of them supports.

:::

The languages are `js`, `ts`, `jsx`, `tsx`, `json`, `html`, `xml`, `css`, `bash`, `python`, `yaml`, `sql`, `dart`, `go`, `rust`, `java`, `c`, `cpp` and the other names each of those answers to. The result is **approximate**, deliberately and permanently: a template literal with a brace in it, or a regular expression that reads as division, comes out slightly wrong, which does not matter, because colour does not have to be exact.

For anything more than that, [`MawyHighlighter`](../types/highlighter) is the whole interface, and Shiki, Prism or a grammar of your own behind it is a few lines.
