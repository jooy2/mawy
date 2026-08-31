---
title: Getting started
order: 1
---

# Getting started

Mawy ships as one package per language. React is the one that exists today; Flutter is planned, and will be documented on these same pages when it arrives.

::: warning Not published yet

`npm install mawy` does not resolve to anything yet. Everything on this page is real and runs — the viewer exists and this site draws it — but it is reached by building the repository rather than by installing it. The editor lands next; follow the [changelog](../changelog).

:::

## Requirements

- **React 18 or 19**, as a peer dependency, along with `react-dom`.
- **Node.js 20.19 or later** to build with.
- A browser with `contenteditable`, `Selection` and `beforeinput` — every current one.

## Install

```bash
npm install mawy
```

`react` and `react-dom` are peer dependencies. If your project already has one of them, that is the copy Mawy uses.

The one runtime dependency is [`lucide-react`](https://lucide.dev), which is where the toolbar's icons come from. It is ISC-licensed, brings nothing else with it, and is tree-shaken down to the dozen glyphs actually drawn.

## Wiring up the stylesheet

Add one line to your application's CSS entry point:

```css
@import 'mawy/styles.css';
```

The stylesheet is finished CSS — no build-side setup, no plugin, no configuration. Everything the library draws goes through `--mawy-*` custom properties, so theming is a matter of redeclaring a token rather than out-specifying a rule. Tokens cascade, which means one declaration on a wrapping element reaches every Mawy surface inside it.

## Showing a document

```tsx
import { MawyViewer } from 'mawy';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

That is a finished reader: the document rendered, and a toolbar for the things a reader wants to change about it — the text size, the line height, the theme, the width of the column. None of it touches the document.

## Or no document at all

`value` is optional, and leaving it out is not an empty state — it is the other half of the component. With nothing to show, the viewer **is** a file picker: drop a `.md` file on it, or choose one.

```tsx
<MawyViewer onValueChange={(markdown, file) => save(file?.name, markdown)} />
```

## Choosing what the toolbar has

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

`true` is all of it, `false` is none of it, and an array is exactly those controls in exactly that order. [The viewer](./viewer#the-toolbar) lists them.

## What the package exports today

|  |  |
| --- | --- |
| `MawyViewer` | The read-only viewer. [Guide](./viewer), [API](../api/#mawyviewer). |
| `mawy/styles.css` | The stylesheet, above. |
| Types | `MawyMode`, `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyViewerToolbarItem`, `MawyViewerToolbarOption` |

The types are also available from `mawy/types`, so an application can name one in its own props without importing a component to get at it.

`MawyEditor` is not here yet — [the editor](./editor) is the shape it is being built to.

## Next

- [**The editor**](./editor) — the WYSIWYG and plain surfaces, and switching between them.
- [**The viewer**](./viewer) — rendering a document without editing it.
- [**API**](../api/) — every component and every option.
