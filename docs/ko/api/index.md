---
title: API
order: 2
---

# API

패키지가 내보내는 모든 것. 각 항목은 그것이 무엇이고, 무엇을 받고, 무엇을 돌려주는지를 적습니다.

::: warning 초기 단계입니다

오늘 존재하는 컴포넌트는 `MawyViewer`입니다. `MawyEditor`가 다음입니다 — 무엇을 목표로 만들어지는지는 [에디터](../guide/editor)에 있습니다. 아직 npm에 게시된 것은 없고 API는 안정적이지 않습니다.

:::

## 컴포넌트

### `MawyViewer`

마크다운 문서를 그리고, 편집하지는 않습니다. 무엇을 왜 하는지는 [뷰어](../guide/viewer)에 있습니다.

```tsx
import { MawyViewer } from 'mawy';

<MawyViewer value={document} />;
```

`children`과 `onChange`를 뺀 `<div>`의 모든 프롭을 받아 그대로 넘깁니다. `ref`는 가장 바깥 엘리먼트에 닿습니다.

#### 문서

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `value` | `string` | — | 마크다운 문서. 이것을 넘기면 문서의 주인은 애플리케이션이 됩니다. 스스로 바뀌지 않습니다. |
| `defaultValue` | `string` | `''` | 뷰어가 문서를 직접 가질 때, 시작할 문서. |
| `onValueChange` | `(value: string, file: File \| null) => void` | — | 새 문서와 그것이 온 파일. `value`를 넘겼든 아니든 호출됩니다. |
| `empty` | `ReactNode` | 파일 선택기 | 문서가 없을 때 대신 그릴 것. |

`value`도 `defaultValue`도 없으면 뷰어가 곧 파일 선택기입니다. 대비책이 아니라 이 컴포넌트의 설계 자체입니다.

#### 읽기와 그리기

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](#mawyparseoptions) | `{ gfm: true, breaks: false }` | 마크다운을 어떻게 읽을지. |
| `html` | [`MawyHtmlPolicy`](#mawyhtmlpolicy) | `'escape'` | 문서 안에 쓰인 원본 HTML을 어떻게 할지. |
| `locale` | [`MawyLocale`](#mawylocale) | `'en'` | 뷰어 자신의 chrome이 쓰는 언어. 문서와는 무관합니다. |

#### 겉모습

| 프롭 | 타입 | 기본값 | 하는 일 |
| --- | --- | --- | --- |
| `colorScheme` | [`MawyColorScheme`](#mawycolorscheme) | — | 팔레트. 애플리케이션이 주인일 때. |
| `defaultColorScheme` | `MawyColorScheme` | `'system'` | 시작할 팔레트. |
| `onColorSchemeChange` | `(scheme: MawyColorScheme) => void` | — | 바뀔 때마다 호출됩니다. 제어 여부와 무관하게. |
| `typography` | `Partial<`[`MawyTypography`](#mawytypography)`>` | — | 문서 조판. 애플리케이션이 주인일 때. |
| `defaultTypography` | `Partial<MawyTypography>` | 아래 참고 | 처음의 조판. |
| `onTypographyChange` | `(typography: MawyTypography) => void` | — | 바뀔 때마다 호출됩니다. 제어 여부와 무관하게. |
| `toolbar` | [`MawyViewerToolbarOption`](#mawyviewertoolbaroption) | `true` | 툴바에 어떤 컨트롤을 어떤 순서로 둘지. |
| `fonts` | `readonly `[`MawyFont`](#mawyfont)`[]` | `MAWY_SYSTEM_FONTS` | 툴바가 제시할 글꼴과 나열 순서. |

`typography`나 `defaultTypography`에서 빠뜨린 항목은 기본값을 지킵니다. `{ fontSize: 18 }`은 완전한 답입니다. 기본값은 고딕, 16px, 줄 간격 1.7, 자간 없음, `normal` 폭입니다.

#### 파일 열기

| 프롭       | 타입      | 기본값                           | 하는 일                       |
| ---------- | --------- | -------------------------------- | ----------------------------- |
| `fileDrop` | `boolean` | `value`를 넘기지 않았으면 `true` | 뷰어에 놓은 파일을 열지 여부. |
| `accept`   | `string`  | 마크다운·텍스트 확장자 전부      | 파일 선택기가 제시할 것.      |

5메가바이트가 넘는 파일은 읽지 않고 거절합니다.

## 타입

`mawy`와 `mawy/types` 양쪽에서 내보냅니다. 두 번째 진입점은 애플리케이션이 컴포넌트를 가져오지 않고도 자기 프롭에 이 타입들을 쓸 수 있게 하기 위한 것입니다.

### `MawyMode`

```ts
type MawyMode = 'wysiwyg' | 'plain' | 'preview';
```

문서를 어느 화면에서 보여줄지. 셋은 세 개의 에디터가 아니라 한 문서를 보는 세 가지 방식입니다 — [에디터](../guide/editor)를 보세요.

- `'wysiwyg'` — 그려진 문서를 그 자리에서 편집.
- `'plain'` — 마크다운 원문을 텍스트로 편집.
- `'preview'` — 그려진 문서, 읽기 전용.

### `MawyColorScheme`

```ts
type MawyColorScheme = 'light' | 'dark' | 'system';
```

어느 팔레트로 그릴지. `system`은 `prefers-color-scheme`을 따르며 기본값입니다. 이미 그 질의에 답하고 있는 애플리케이션 안에 들어간 에디터가 어두운 페이지 위의 흰 사각형 하나가 되어서는 안 되기 때문입니다. `light`과 `dark`는 따르지 않습니다. 자체 스위치가 있는 애플리케이션이 그것으로 뷰어를 몰 수 있도록.

### `MawyLocale`

```ts
type MawyLocale = 'en' | 'ko';
```

에디터 자신의 chrome이 쓰는 언어 — 툴바 레이블, 메뉴 항목, 스크린 리더에게 주는 문장. 문서가 쓰인 언어와는 무관합니다.

### `MawyParseOptions`

```ts
interface MawyParseOptions {
  gfm?: boolean; // 기본값: true
  breaks?: boolean; // 기본값: false
}
```

- **`gfm`** — GitHub Flavored Markdown: 표, 체크박스 목록, `~~취소선~~`, 알림 블록, 그리고 맨 URL이 링크가 되는 것.
- **`breaks`** — 문단 안의 줄바꿈 하나를 줄바꿈으로 볼지. 기본은 꺼짐입니다. 마크다운이 그렇게 말하기 때문입니다. 켜면 채팅 클라이언트와 이슈 트래커의 동작과 같아집니다. 마크다운을 써 본 적 없는 독자가 기대하는 쪽입니다.

### `MawyHtmlPolicy`

```ts
type MawyHtmlPolicy = 'escape' | 'sanitize' | 'raw';
```

문서 안에 쓰인 원본 HTML을 어떻게 할지.

- `'escape'` — 쓰인 글자 그대로 보여줍니다. 기본값이고, 조건 없이 안전한 유일한 값입니다.
- `'sanitize'` — 그립니다. 허용 목록 밖의 요소·속성·URL 스킴은 먼저 제거하고.
- `'raw'` — 쓰인 그대로 그립니다. 그다음 일은 호출자의 몫입니다.

셋 중 어느 것도 링크에는 영향을 주지 않습니다. `[click](javascript:…)`은 모든 값에서 거절됩니다. 그것은 HTML이 아니라 마크다운이고, HTML 정책을 바꾼 것이 그것에 대한 말이었던 적은 없기 때문입니다.

### `MawyTypography`

```ts
interface MawyTypography {
  fontFamily: MawyFontFamily; // 기본값: 'sans'
  fontSize: number; // px, 13–26. 기본값: 16
  lineHeight: number; // 단위 없음, 1.3–2.4. 기본값: 1.7
  letterSpacing: number; // em, −0.04–0.16. 기본값: 0
  measure: MawyMeasure; // 기본값: 'normal'
}
```

문서가 어떻게 조판되는지. 모든 항목은 `--mawy-doc-*` 커스텀 속성으로 화면에 도달하므로, 범위를 벗어난 값은 망가진 문서가 아니라 이상해 보이는 문서가 됩니다.

### `MawyFontFamily`

```ts
type MawyFontFamily = 'sans' | 'serif' | 'mono' | (string & {});
```

뷰어가 받은 글꼴 중 하나의 `id`입니다. `sans`·`serif`·`mono`는 라이브러리가 스스로 제공하는 셋이고, 글꼴 이름이 아니라 역할입니다. 내려받는 것이 없고, 각 역할 뒤의 스택은 애플리케이션이 다시 선언할 수 있는 `--mawy-font-*` 커스텀 속성입니다. 그 밖의 문자열은 `fonts`로 넘긴 글꼴의 `id`입니다.

### `MawyFont`

```ts
interface MawyFont {
  id: string;
  label?: string;
  stack?: string;
  href?: string;
}
```

툴바가 제시하는 글꼴 하나.

- **`id`** — 이 글꼴을 고르기 위해 `typography.fontFamily`에 넣는 값.
- **`label`** — 툴바에 보이는 이름. 빼면 `sans`·`serif`·`mono`는 로케일에서, 그 밖에는 `id`에서 가져옵니다.
- **`stack`** — CSS `font-family` 값. 기본값은 `var(--mawy-font-{id})`.
- **`href`** — 글꼴을 그리기 전에 도착해야 하는 스타일시트. 글꼴을 처음 그릴 때 또는 글꼴 메뉴에 이름이 처음 보일 때, 페이지당 한 번 받아옵니다.

### `MAWY_SYSTEM_FONTS`

```ts
const MAWY_SYSTEM_FONTS: readonly MawyFont[];
```

독자의 기기에 이미 있는 것으로 그리는 세 역할. `href`가 없으므로 기본 상태의 뷰어는 아무것도 받아오지 않습니다.

### `MAWY_WEB_FONTS`

```ts
const MAWY_WEB_FONTS: readonly MawyFont[];
```

바로 쓸 수 있는 열세 개의 오픈 라이선스 글꼴. 전부 SIL Open Font License이며 상업적 사용·임베딩·재배포가 허용됩니다. Inter, IBM Plex Sans, Atkinson Hyperlegible, Source Serif 4, Literata, Lora, EB Garamond, JetBrains Mono, 그리고 한글 다섯: Pretendard, Noto Sans KR, Noto Serif KR, 나눔명조, 고운돋움.

**애플리케이션이 직접 넘기지 않으면 절대 쓰이지 않습니다.** 남의 페이지 안에 들어간 컴포넌트가 그들이 고르지 않은 폰트 CDN에 연결을 열 이유는 없습니다. 그래서 기본값이 아니라 export입니다.

```tsx
<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />
```

### `MawyMeasure`

```ts
type MawyMeasure = 'narrow' | 'normal' | 'wide' | 'full';
```

본문이 얼마나 넓게 뻗을 수 있는지: 34rem, 44rem, 56rem, 또는 제한 없음. 너무 긴 줄은 글자를 키웠을 때 따라오는 실패이고, 그래서 툴바에서 글자 크기 옆에 있습니다. `full`은 이미 자기 단을 받은 뷰어, 그 안에 또 하나를 만들 필요가 없는 경우를 위한 것입니다.

### `MawyViewerToolbarItem`

```ts
type MawyViewerToolbarItem =
  | 'fontFamily'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'measure'
  | 'colorScheme'
  | 'outline'
  | 'copy'
  | 'open'
  | 'separator';
```

뷰어 툴바의 컨트롤 하나. `separator`는 컨트롤이 아니라 가는 구분선을 그립니다.

### `MawyViewerToolbarOption`

```ts
type MawyViewerToolbarOption = boolean | readonly MawyViewerToolbarItem[];
```

`true`는 위 순서대로 전부, `false`는 툴바 없음, 배열은 정확히 그 컨트롤들을 정확히 그 순서로. 목록에 없는 컨트롤을 더할 방법은 없습니다 — 임의의 자식을 받는 툴바는 라이브러리가 더 이상 키보드로 다루게 만들어 줄 수 없는 툴바입니다.

## 스타일시트

### `mawy/styles.css`

완성된 스타일시트. 애플리케이션이 한 번 가져옵니다. 라이브러리가 그리는 모든 값은 `--mawy-*` 커스텀 속성이고, 그 네임스페이스가 테마의 전부입니다.

토큰은 `:root`가 아니라 **`.mawy-root`** 에 선언됩니다. 컴포넌트 라이브러리가 문서 루트에 값을 쓸 일은 없고, `:root`에서 팔레트를 읽는 뷰어는 밝은 페이지 안에서 어두울 수 없기 때문입니다. 토큰은 상속되므로, 감싸는 엘리먼트 하나에 선언하면 그 안의 모든 Mawy 표면에 닿습니다.

| 묶음 | 토큰 |
| --- | --- |
| 서체 | `--mawy-font-sans`, `--mawy-font-serif`, `--mawy-font-mono` |
| 문서 | `--mawy-doc-font`, `--mawy-doc-size`, `--mawy-doc-line-height`, `--mawy-doc-letter-spacing`, `--mawy-doc-measure` |
| 면 | `--mawy-bg`, `--mawy-bg-sunken`, `--mawy-bg-raised`, `--mawy-chrome` |
| 글자 | `--mawy-fg`, `--mawy-fg-muted`, `--mawy-fg-subtle` |
| 선 | `--mawy-border`, `--mawy-border-strong` |
| 강조색 | `--mawy-accent`, `--mawy-accent-hover`, `--mawy-accent-fg`, `--mawy-accent-soft` |
| 코드 | `--mawy-code-bg`, `--mawy-code-fg`, `--mawy-mark-bg`, `--mawy-mark-fg` |
| 알림 | `--mawy-note`, `--mawy-tip`, `--mawy-important`, `--mawy-warning`, `--mawy-caution` |
| 모양과 움직임 | `--mawy-radius-sm`, `--mawy-radius-md`, `--mawy-radius-lg`, `--mawy-shadow-1`, `--mawy-shadow-2`, `--mawy-duration`, `--mawy-easing` |

문서를 그리는 데 쓰는 클래스 이름 `.mawy-md-*` 역시 지원되는 표면입니다. 라이브러리가 렌더 프롭을 내주지 않아도 애플리케이션이 표나 코드 블록의 스타일을 바꿀 수 있습니다.
