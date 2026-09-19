---
title: MawyQuotes
order: 22
---

# `MawyQuotes`

The four marks a quotation is drawn with, for a document whose language does not write one the way English does.

::: fw react

```ts
interface MawyQuotes {
  doubleOpen?: string; // default: “
  doubleClose?: string; // default: ”
  singleOpen?: string; // default: ‘
  singleClose?: string; // default: ’
}
```

:::

::: fw flutter

```dart
class MawyQuotes {
  const MawyQuotes({
    this.doubleOpen = '“',
    this.doubleClose = '”',
    this.singleOpen = '‘',
    this.singleClose = '’',
  });
}
```

:::

Passed as `typographerQuotes` in [`MawyParseOptions`](./parse-options), and nothing without `typographer`, which is what draws them. English and Korean write a quotation the same way, so the default covers both languages this library's interface speaks — and the document is not the interface, which is why this is an option at all.

::: fw react

```tsx
<MawyViewer
  value={document}
  parse={{ typographer: true, typographerQuotes: { doubleOpen: '„', doubleClose: '“' } }}
/>
```

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  parse: const MawyParseOptions(
    typographer: true,
    typographerQuotes: MawyQuotes(doubleOpen: '„', doubleClose: '“'),
  ),
);
```

:::

Every field keeps its default when it is left out, so the two above are the whole of what a German document needs. French writes `«a»`, and passing all four is how a quotation inside a quotation gets its own marks.

**The apostrophe is not one of the four.** `dogs’ bones` is drawn with `’` whatever the quotations are set to. It is the same character as English's closing single mark and it is not the same mark, and a German document that set its single marks to `‚‘` would otherwise come out as `dogs‘ bones`.

::: fw react

One thing costs a little caret precision on the `wysiwyg` surface: a mark written with more than one character, such as French's `«` followed by a no-break space. The marks are read back out of the page to find a line in the source, and a mark that is one character for one — which every mark here is by default — is read back exactly. See [Typography](../../guide/viewer#typography).

:::
