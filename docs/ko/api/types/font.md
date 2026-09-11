---
title: MawyFont
order: 14
---

# `MawyFont`

뷰어 툴바가 제시하는 글꼴 하나입니다. [글꼴](../../guide/viewer#글꼴)을 보세요.

::: fw flutter

이것은 React 패키지의 것입니다. 이 패키지는 글꼴을 싣지도 이름을 대지도 않으므로 더할 목록 자체가 없습니다. 애플리케이션이 번들한 서체는 [`MawyTypography.fontFamilyName`](./typography)으로 이름을 댑니다.

:::

::: fw react

```ts
interface MawyFont {
  id: string;
  label?: string;
  stack?: string;
  href?: string;
}
```

글꼴을 처음 그리는 순간에 스타일시트를 가져오는 것은 브라우저만의 재주이고, 그래서 이것이 이름 하나가 아니라 글꼴의 목록입니다.

- **`id`** — 이 글꼴을 고르려고 `typography.fontFamily`에 넣는 값.
- **`label`** — 툴바에 보이는 글자. `sans`, `serif`, `mono`는 비워 두면 로케일에서 가져오고, 나머지는 `id`로 대신합니다.
- **`stack`** — CSS의 `font-family` 값. 기본값은 `var(--mawy-font-{id})`입니다.
- **`href`** — 글꼴을 그리기 전에 도착해야 하는 스타일시트. 글꼴을 처음 그리거나 글꼴 메뉴에 그 이름을 처음 보일 때, 페이지당 한 번 가져옵니다.

## `MAWY_SYSTEM_FONTS`

```ts
const MAWY_SYSTEM_FONTS: readonly MawyFont[];
```

독자의 기기에 이미 있는 것으로 그리는 세 역할입니다. `href`를 가진 것이 하나도 없으므로 기본 뷰어는 아무것도 가져오지 않습니다.

## `MAWY_WEB_FONTS`

```ts
const MAWY_WEB_FONTS: readonly MawyFont[];
```

바로 제시할 수 있는 오픈 라이선스 글꼴 열세 종입니다. 모두 SIL Open Font License이고, 상업적 사용과 임베딩, 재배포가 허용됩니다. Inter, IBM Plex Sans, Atkinson Hyperlegible, Source Serif 4, Literata, Lora, EB Garamond, JetBrains Mono, 그리고 한글 다섯 종인 Pretendard, Noto Sans KR, Noto Serif KR, 나눔명조, 고운돋움입니다.

**애플리케이션이 넘기지 않으면 절대 쓰이지 않습니다.** 남의 페이지에 들어간 컴포넌트가 그 페이지가 고르지도 않은 글꼴 CDN에 연결을 열 이유는 없으므로, 기본값이 아니라 내보내는 값으로 두었습니다.

```tsx
<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />
```

:::
