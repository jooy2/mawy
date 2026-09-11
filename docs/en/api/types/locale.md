---
title: MawyLocale
order: 6
---

# `MawyLocale`

The language of the viewer's and the editor's own interface.

::: fw react

```ts
type MawyLocale = 'en' | 'ko';
```

:::

::: fw flutter

```dart
enum MawyLocale { en, ko }
```

:::

**English and Korean**, and `en` is the default. It sets the toolbar labels, the menu entries and the text a screen reader is given. It has nothing to do with the language a document is written in. Both packages ship the same words under the same names, and a locale that exists in only one of them is not one this library offers.
