---
title: MawyTypography
order: 12
---

# `MawyTypography`

How the document is set. See [setting the type](../../guide/viewer#setting-the-type).

::: fw react

```ts
interface MawyTypography {
  fontFamily: MawyFontFamily; // default: 'sans'
  fontSize: number; // px, 13–26. default: 16
  lineHeight: number; // unitless, 1.3–2.4. default: 1.7
  letterSpacing: number; // em, −0.04–0.16. default: 0
  measure: MawyMeasure; // default: 'normal'
}
```

Every field reaches the page as a `--mawy-doc-*` custom property, so a value out of range is a strange-looking document rather than a broken one.

Anything left out keeps its default, so `{ fontSize: 18 }` is a whole answer.

:::

::: fw flutter

```dart
class MawyTypography {
  const MawyTypography({
    this.fontFamily = MawyFontFamily.sans,
    this.fontFamilyName, // a bundled family, instead of the platform's own
    this.fontSize = 16, // logical pixels
    this.lineHeight = 1.7, // unitless
    this.letterSpacing = 0, // ems
    this.measure = MawyMeasure.normal,
  });

  MawyTypography copyWith({ /* every field, each optional */ });
}
```

Every field has a default, so `MawyTypography(fontSize: 18)` is a whole answer and the rest stays where it was; `copyWith` changes one thing about a settings object that already exists.

`fontFamilyName` is the extra field, and it is what stands in for the React package's [`fonts`](./font) list. The package ships no typefaces: each of the three roles maps to the platform's own family for that role unless an application bundles a face and names it here.

:::
