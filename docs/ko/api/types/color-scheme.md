---
title: MawyColorScheme
order: 5
---

# `MawyColorScheme`

어느 팔레트로 그릴지.

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

`system`이 기본값이고 플랫폼 설정을 따릅니다. 브라우저에서는 `prefers-color-scheme`, 앱에서는 `MediaQuery.platformBrightnessOf`입니다. 어두운 페이지에 들어간 뷰어가 그 페이지에서 혼자 밝은 사각형이 되는 일을 이것이 막습니다. `light`와 `dark`는 플랫폼을 따르지 않으므로, 자체 전환 컨트롤을 가진 애플리케이션이 그것으로 뷰어를 몰 수 있습니다.
