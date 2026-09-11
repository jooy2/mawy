---
title: MawyFontFamily
order: 13
---

# `MawyFontFamily`

Which typeface the document is set in.

::: fw react

```ts
type MawyFontFamily = 'sans' | 'serif' | 'mono' | (string & {});
```

The `id` of one of the fonts the viewer was given. `sans`, `serif` and `mono` are the three it offers on its own, and they are roles rather than font names: nothing is downloaded, and the stack behind each is a `--mawy-font-*` custom property an application can redeclare. Any other string is the `id` of a font passed through [`fonts`](./font).

:::

::: fw flutter

```dart
enum MawyFontFamily { sans, serif, mono }
```

The three roles, and only the three. They are roles rather than font names: each maps to the platform's own family for that role, and an application that wants a particular face bundles it and names it through [`MawyTypography.fontFamilyName`](./typography). There is no fourth value, because there is no list of fonts to add one to.

:::
