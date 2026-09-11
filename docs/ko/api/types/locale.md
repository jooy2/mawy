---
title: MawyLocale
order: 6
---

# `MawyLocale`

뷰어와 에디터 인터페이스가 쓰는 언어입니다.

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

**영어와 한국어**이고 기본값은 `en`입니다. 툴바 이름표와 메뉴 항목, 스크린 리더에 주는 글의 언어를 정합니다. 문서가 어떤 언어로 쓰였는지와는 무관합니다. 두 패키지가 같은 이름 아래 같은 낱말을 싣고, 한쪽에만 있는 로케일은 이 라이브러리가 제공하는 로케일이 아닙니다.
