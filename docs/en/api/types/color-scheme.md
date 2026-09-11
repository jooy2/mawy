---
title: MawyColorScheme
order: 5
---

# `MawyColorScheme`

Which palette to draw in.

::: fw react

```ts
type MawyColorScheme = 'light' | 'dark' | 'system';
```

:::

::: fw flutter

```dart
enum MawyColorScheme { light, dark, system }
```

:::

`system` is the default and follows the platform setting: `prefers-color-scheme` in a browser, `MediaQuery.platformBrightnessOf` in an app. That keeps a viewer embedded in a dark page from being the one light rectangle on it. `light` and `dark` do not follow the platform, so an application with a switch of its own can drive the viewer from that.
