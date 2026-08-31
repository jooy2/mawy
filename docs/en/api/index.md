---
title: API
order: 2
---

# API

Everything the package exports. Each entry says what it is, what it takes and what it gives back.

::: warning Early The components are being built and are not here yet. What follows is the whole public surface of the package today. :::

## Types

Exported from `mawy` and from `mawy/types`. The second entry point exists so an application can name one of these in its own props without importing a component to get at it.

### `MawyMode`

```ts
type MawyMode = 'wysiwyg' | 'plain' | 'preview';
```

Which surface a document is shown on. The three are views of one document rather than three editors — see [the editor](../guide/editor).

- `'wysiwyg'` — the rendered document, edited in place.
- `'plain'` — the Markdown source, edited as text.
- `'preview'` — the rendered document, read-only.

### `MawyColorScheme`

```ts
type MawyColorScheme = 'light' | 'dark' | 'system';
```

Which palette to draw in. `system` follows `prefers-color-scheme` and is the default: an editor embedded in an application that already answers that query should not be the one white rectangle on a dark page.

### `MawyLocale`

```ts
type MawyLocale = 'en' | 'ko';
```

The language of the editor's own chrome — toolbar labels, menu entries, the text a screen reader is given. It has nothing to do with the language a document is written in.

## Stylesheet

### `mawy/styles.css`

The finished stylesheet, imported once by the embedding application. Every value the library draws with is a `--mawy-*` custom property, and that namespace is the entire supported surface for theming. Tokens cascade, so one declaration on a wrapping element reaches every Mawy surface inside it.

## Components

Nothing yet. `MawyEditor` and `MawyViewer` land with the first release — [the editor](../guide/editor) and [the viewer](../guide/viewer) describe what they are being built to do.
