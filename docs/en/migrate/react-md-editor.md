---
title: From react-md-editor
order: 4
---

# Moving from react-md-editor

What each `@uiw/react-md-editor` prop becomes in Mawy, and the one default that changes what your documents look like.

Written against `@uiw/react-md-editor` 4. This is the shortest of the four migrations. That editor is a `textarea` with a preview beside it, so it already holds your document as the Markdown string it is, and so does this one. Nothing has been rewritten on the way in and nothing will be on the way out.

What changes is the preview and everything around it. There, the preview is `@uiw/react-markdown-preview` rendering the same string through remark and rehype, configured by `previewOptions`. Here the preview is the library's own renderer, the same one [`MawyViewer`](../api/components/mawy-viewer) draws with, and it is configured by `parse`, `html` and `directives` rather than by a plugin list.

::: fw flutter

`@uiw/react-md-editor` is a React component, so there is nothing to migrate from inside a Flutter application. The documents carry over unchanged, and the one surface this package does not have is `wysiwyg`, which [the editor](../guide/editor) explains.

:::

## The component

```tsx
import MDEditor from '@uiw/react-md-editor';

<MDEditor value={document} onChange={(value) => save(value ?? '')} preview="live" height={600} />;
```

becomes

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor value={document} onChange={save} defaultMode="split" />;
```

`onChange` is handed a `string` rather than a `string | undefined`, so the `?? ''` goes. The editor fills its container, so the height is the container's.

## Props

| react-md-editor | Mawy | Notes |
| --- | --- | --- |
| `value` | `value` | Or `defaultValue` to let the editor keep the document |
| `onChange` | `onChange` | One argument, and never `undefined` |
| `preview: 'live'` | `defaultMode="split"` | The two panes, with a bar between them that drags |
| `preview: 'edit'` | `defaultMode="plain"` |  |
| `preview: 'preview'` | `defaultMode="preview"` |  |
| `hideToolbar` | `toolbar={false}` |  |
| `commands`, `extraCommands` | [`toolbar`](../api/types/editor-toolbar-item) | A list of names in the order you want them, `'separator'` included |
| `commandsFilter` | — | Leave the name off the list |
| A command of your own | — | Your own button, and `handle.insert(markdown)`. [From outside the editor](../api/components/mawy-editor#from-outside-the-editor) |
| `height`, `minHeight`, `maxHeight` | — | CSS on the element around it |
| `visibleDragbar` | — | The bar here is between the two panes rather than under the editor |
| `textareaProps` | `placeholder`, `readOnly` | The named ones have props; the surface itself is not handed through |
| `previewOptions` | `parse`, `html`, [`directives`](../guide/viewer#directives), `highlight` | See below |
| `components` | `image`, `directives` | The drawing is the library's; these two are the openings in it |
| `tabSize` | — | Two spaces, which is what a nested list marker needs. [Indenting](../guide/editor#indenting) |
| `defaultTabEnable` | — | `Escape` then `Tab` leaves the editor, so `Tab` can indent without trapping the focus |
| `highlightEnable` | — | The source is always coloured; `lineNumbers` turns the gutter off |
| `enableScroll` | — | In `split` the preview follows the source to the block rather than to the same fraction down |
| `fullscreen`, `overflow` | — | Nothing here draws over the page |
| `autoFocus`, `autoFocusEnd` | — | `handle.focus()` after mounting |
| `onStatistics` | [`status`](../api/types/editor-status-item) | The counts are drawn along the bottom: position, selection, lines, words, characters, bytes |
| `onHeightChange` | — |  |
| `data-color-mode` on an ancestor | `defaultColorScheme`, `colorScheme` | The palette travels with the component, so one editor can be dark inside a light page |

## The preview

`previewOptions` passes remark and rehype plugins to a Markdown renderer that is a separate package. There is no plugin list here, so each of those has its own answer:

| What you passed | Here |
| --- | --- |
| `remark-gfm` | — tables, task lists, strikethrough, footnotes and alerts are read by default. `gfm: false` in `parse` turns them off |
| `rehype-sanitize` | [`html`](../api/types/html-policy), which is `escape` by default and needs nothing added to be safe |
| `rehype-prism-plus`, a highlighter | [`highlight`](../api/functions/mawy-highlighter), which ships with the package |
| `remark-math`, KaTeX | — no mathematics |
| A Mermaid or chart renderer | A [directive](../guide/viewer#directives) and a component of yours, written `:::mermaid` rather than as a fenced block |
| `<!--rehype:style=...-->` comments | — an HTML comment is a comment |

## Read-only documents

`MDEditor.Markdown` becomes `MawyViewer`:

```tsx
<MDEditor.Markdown source={document} />
```

```tsx
<MawyViewer value={document} />
```

The viewer comes with a toolbar of its own for the text size, the line height, the theme and the column width, and `toolbar={false}` takes all of it away for a document that is part of a page rather than a thing being read. On a published page, [`MawyDocument`](../api/components/mawy-document) draws the same document on a server and ships no JavaScript for it, which also removes the `next/dynamic` import with `ssr: false` that this editor's README shows for Next.js.

## Your documents

**One default changes what your documents look like, and it is raw HTML.** `@uiw/react-md-editor` renders the HTML in a document, which is why its README tells you to add `rehype-sanitize` when the authors are not completely trusted. Here the default is `escape`: a `<div>` in a document is drawn as the characters `<div>`. For documents that are meant to draw their markup:

```tsx
<MawyEditor value={document} html="sanitize" />
```

Read [safety](../guide/viewer#safety) before you do. `sanitize` draws a short, deliberate list without a DOM, and what is not on that list is drawn as characters on a server.

Everything else carries over as it is. The text in your database is the text your authors typed, in both editors.

## What you gain

A drawn document you can type in. `wysiwyg` is the first surface the switch offers, and it edits the document where it is drawn without a second model behind it — the Markdown string stays the document. Take it out with `modes={['plain', 'split', 'preview']}` if the split view is what your writers want.
