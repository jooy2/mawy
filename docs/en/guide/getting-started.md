---
title: Getting started
order: 1
---

# Getting started

Mawy ships as one package per language. React is the one that exists today; Flutter is planned, and will be documented on these same pages when it arrives.

::: warning Not published yet This page describes the package as it is being built. `npm install mawy` does not resolve to anything yet, and the API below is the part that exists — the shared type vocabulary. The editor components land with the first release; follow the [changelog](../changelog). :::

## Requirements

- **React 18 or 19**, as a peer dependency, along with `react-dom`.
- **Node.js 20.19 or later** to build with.
- A browser with `contenteditable`, `Selection` and `beforeinput` — every current one.

## Install

```bash
npm install mawy
```

`react` and `react-dom` are peer dependencies. If your project already has one of them, that is the copy Mawy uses.

## Wiring up the stylesheet

Add one line to your application's CSS entry point:

```css
@import 'mawy/styles.css';
```

The stylesheet is finished CSS — no build-side setup, no plugin, no configuration. Everything the library draws goes through `--mawy-*` custom properties, so theming is a matter of redeclaring a token rather than out-specifying a rule. Tokens cascade, which means one declaration on a wrapping element reaches every Mawy surface inside it.

## What the package exports today

The type vocabulary every component will be written in:

```ts
import type { MawyColorScheme, MawyLocale, MawyMode } from 'mawy';
```

| Type | Values | What it is |
| --- | --- | --- |
| `MawyMode` | `'wysiwyg'`, `'plain'`, `'preview'` | Which surface a document is shown on. See [the editor](./editor). |
| `MawyColorScheme` | `'light'`, `'dark'`, `'system'` | Which palette to draw in. `system` follows `prefers-color-scheme`. |
| `MawyLocale` | `'en'`, `'ko'` | The language of the editor's own chrome — not of the document. |

The same types are available from `mawy/types`, so an application can name one in its own props without importing a component to get at it.

## Next

- [**The editor**](./editor) — the WYSIWYG and plain surfaces, and switching between them.
- [**The viewer**](./viewer) — rendering a document without editing it.
- [**API**](../api/) — every component and every option.
