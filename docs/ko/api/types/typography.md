---
title: MawyTypography
order: 12
---

# `MawyTypography`

문서를 어떻게 조판할지. [조판 값 정하기](../../guide/viewer#조판-값-정하기)를 보세요.

::: fw react

```ts
interface MawyTypography {
  fontFamily: MawyFontFamily; // 기본값: 'sans'
  fontSize: number; // px, 13–26. 기본값: 16
  lineHeight: number; // 단위 없음, 1.3–2.4. 기본값: 1.7
  letterSpacing: number; // em, −0.04–0.16. 기본값: 0
  measure: MawyMeasure; // 기본값: 'normal'
}
```

모든 항목이 `--mawy-doc-*` 커스텀 속성으로 페이지에 닿으므로, 범위를 벗어난 값은 망가진 문서가 아니라 이상해 보이는 문서가 됩니다.

빠뜨린 항목은 기본값을 지키므로 `{ fontSize: 18 }` 하나로 답이 됩니다.

:::

::: fw flutter

```dart
class MawyTypography {
  const MawyTypography({
    this.fontFamily = MawyFontFamily.sans,
    this.fontFamilyName, // 플랫폼의 것 대신, 번들한 서체 이름
    this.fontSize = 16, // 논리 픽셀
    this.lineHeight = 1.7, // 단위 없음
    this.letterSpacing = 0, // em
    this.measure = MawyMeasure.normal,
  });

  MawyTypography copyWith({ /* 모든 항목, 각각 선택 */ });
}
```

항목마다 기본값이 있어서 `MawyTypography(fontSize: 18)` 하나로 답이 되고 나머지는 그대로입니다. 이미 있는 설정을 하나만 바꿀 때는 `copyWith`를 씁니다.

`fontFamilyName`이 여분의 항목이고, React 패키지의 [`fonts`](./font) 목록을 대신하는 것입니다. 이 패키지는 글꼴을 싣지 않습니다. 세 역할은 각각 그 역할에 해당하는 플랫폼의 서체로 가고, 애플리케이션이 서체를 번들해 여기에 이름을 대면 그것으로 갑니다.

:::
