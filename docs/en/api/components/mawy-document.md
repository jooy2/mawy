---
title: MawyDocument
order: 3
---

# `MawyDocument`

A document drawn once, on a server, with no JavaScript shipped for it.

::: fw flutter

This one is the React package's. A Flutter application draws its documents on the device, so there is no server half to it — [`MawyViewer`](./mawy-viewer) is the whole of what this package renders with.

:::

::: fw react

`MawyViewer` renders on a server perfectly well and then hydrates, because everything it offers a reader is behaviour: the toolbar, the find bar, the outline and the copy buttons all need the component on the page. A documentation site, a blog or a changelog needs none of that, and `mawy-react/server` exists so a page of documents does not ship forty kilobytes of JavaScript.

```tsx
import { MawyDocument } from 'mawy-react/server';
import 'mawy-react/styles.css';

export default async function Page() {
  return <MawyDocument value={await readFile('README.md', 'utf8')} />;
}
```

A React Server Component in a framework that has them, and an ordinary component to `renderToStaticMarkup` in one that does not. The markup is the same markup and the stylesheet is the same stylesheet, so a page built this way and a page with a viewer on it look alike.

[Publishing](../../guide/publishing) is the whole of what a page needs around one of these when people are going to find it through a search engine.

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The Markdown. |
| `parse` | [`MawyParseOptions`](../types/parse-options) | `{ gfm: true, breaks: false, definitionLists: true, headingIds: true }` | How it is read. |
| `html` | [`MawyHtmlPolicy`](../types/html-policy) | `'escape'` | What becomes of raw HTML written inside it. |
| `linkTarget` | [`MawyLinkTarget`](../types/link-target) | `'blank'` | Where a link the document wrote opens. |
| `linkRel` | [`MawyLinkRel`](../types/link-target#mawylinkrel) | — | What such a link declares about where it goes. Added to what it already declares. |
| `links` | [`MawyLinkPolicy`](../types/drawing-policy#mawylinkpolicy) | `'show'` | How a link the document wrote is drawn: as a link, as its words, as its source, or not at all. |
| `images` | [`MawyImagePolicy`](../types/drawing-policy#mawyimagepolicy) | `'show'` | How a picture is drawn: fetched, as its description, as its source, or not at all. |
| `directives` | [`MawyDirectives`](../types/directives) | — | What draws the constructs this package does not know about. |
| `image` | `ComponentType<`[`MawyImageProps`](../types/image)`>` | — | What draws a picture the document points at, and how a framework's own image component gets used. |
| `resolveUrl` | [`MawyUrlResolver`](../types/url-resolver) | — | Where a relative URL in the document points. |
| `headingBase` | `number` | `1` | Which of `h1` to `h6` the document's own `#` is drawn as. |
| `anchorPrefix` | `string` | — | Put in front of every anchor this drawing gives a heading or a footnote, so two documents on one page stop colliding. |
| `locale` | [`MawyLocale`](../types/locale) | `'en'` | The language of the few words this library writes itself. |
| `strings` | `Partial<`[`MawyStrings`](../types/locale#mawystrings)`>` | — | The interface's words, some or all of them, over the ones `locale` has. |
| `highlight` | [`MawyHighlighter`](../types/highlighter) | — | What colours a code block. |
| `typography` | `Partial<`[`MawyTypography`](../types/typography)`>` | — | How the document is set, as the same custom properties. Anything left out keeps its default. |
| `fonts` | [`MawyFont`](../types/font)`[]` | `MAWY_SYSTEM_FONTS` | The typefaces those properties may name. |
| `colorScheme` | [`MawyColorScheme`](../types/color-scheme)` \| null` | `null` | Which palette to draw in. `null` writes nothing and leaves it to the page. |
| `className` | `string` | — | Put on the outermost element, after this library's own names. |
| `style` | `CSSProperties` | — | Merged over the custom properties the typography writes. |

## Following the reader's palette

`colorScheme` is `null` by default, which writes no attribute at all. That is what an application setting the `--mawy-*` tokens itself wants: a palette declared here would be one more thing for its own to argue with.

It also means the document is light on a dark screen, because the stylesheet turns a document dark under `prefers-color-scheme` only where the attribute says `system`. A page with no palette of its own says so:

```tsx
<MawyDocument value={post.body} colorScheme="system" />
```

Which is what [`MawyViewer`](./mawy-viewer) does by default. The difference in default is deliberate — a viewer is a surface a reader is looking at, and this is a piece of somebody's page.

## Moving a page from `MawyViewer`

Everything either of them takes about _how_ a document is drawn is the same prop with the same type, so moving a page is deleting the props that were behaviour — `toolbar`, `empty`, `fileDrop`, `accept`, and the controlled and uncontrolled pairs — and rewriting none of the rest.

Two are deliberately not shared, and the compiler names both:

- **`value` is required here.** A viewer with no document is the file picker. A document with no document is nothing.
- **`highlight` takes only a highlighter**, where the viewer also takes a function that fetches one. A promise has no second render to arrive on, so accepting one and ignoring it would be worse than refusing it.

## What is not there, and why

- **No toolbar, find bar or outline.** Each needs JavaScript to work, and there is none here. Use [`MawyViewer`](./mawy-viewer) if you need them.
- **No copy button on a code block**, for the same reason.
- **`html="sanitize"` draws most markup as characters.** Sanitising needs a DOM to parse with, and a server has none. `MawyViewer` does the same on a server, except that there the elements arrive on the next render. Here there is no next render. The exceptions are the few pieces a browser has only one way to read, so no parser is needed for them: a `<br>`, an `<img>` whose attributes are nothing but quoted `src`, `alt`, `width`, `height` and `title`, and a tag like `<u>` around some words. See [safety](../../guide/viewer#safety). `html="raw"` writes the markup out as the author wrote it, with everything [that means](../../guide/viewer#safety).
- **A highlighter is used only if it answers synchronously.** A promise has no second render to arrive on. Pass `mawyHighlighter`, or any other synchronous highlighter, and the colour is in the HTML.
- **No `data-mawy-range` on anything.** Every element `MawyViewer` draws carries the offsets it was drawn from, so that a place on the page can be turned back into a place in the document — see [mapping the page back to the source](../../guide/viewer#mapping-the-page-back-to-the-source). Nothing on a page built this way asks that question, and the attribute is a quarter of the HTML: this repository's own README comes out at 12.2 kB rather than 16.8 kB, and 3.4 kB rather than 4.6 kB gzipped.

:::
