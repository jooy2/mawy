---
title: MawyFont
order: 14
---

# `MawyFont`

A typeface the viewer's toolbar offers. See [typefaces](../../guide/viewer#typefaces).

::: fw flutter

This one is the React package's. This package ships no typefaces and names none, so there is no list to add to: a face an application has bundled is named through [`MawyTypography.fontFamilyName`](./typography) instead.

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

A stylesheet fetched at the moment a font is first drawn is a browser's trick, which is why this is a list of fonts rather than a single name.

- **`id`** — what `typography.fontFamily` is set to in order to choose this font.
- **`label`** — what the toolbar shows. `sans`, `serif` and `mono` take theirs from the locale when it is left out; anything else falls back to its `id`.
- **`stack`** — the CSS `font-family` value. Defaults to `var(--mawy-font-{id})`.
- **`href`** — a stylesheet that has to arrive before the font can be drawn. Fetched once per page, the first time the font is drawn or its name is shown in the typeface menu.

## `MAWY_SYSTEM_FONTS`

```ts
const MAWY_SYSTEM_FONTS: readonly MawyFont[];
```

The three roles, drawn with whatever the reader's machine already has. None of them has an `href`, so the default viewer fetches nothing at all.

## `MAWY_WEB_FONTS`

```ts
const MAWY_WEB_FONTS: readonly MawyFont[];
```

Thirteen open-licensed families, ready to be offered. Every one is under the SIL Open Font License, which permits commercial use, embedding and redistribution. They are Inter, IBM Plex Sans, Atkinson Hyperlegible, Source Serif 4, Literata, Lora, EB Garamond, JetBrains Mono, and five for Korean: Pretendard, Noto Sans KR, Noto Serif KR, Nanum Myeongjo and Gowun Dodum.

**It is never used unless an application passes it in.** A component embedded in somebody else's page has no business opening a connection to a font CDN they did not choose, so this is an export rather than a default:

```tsx
<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />
```

:::
