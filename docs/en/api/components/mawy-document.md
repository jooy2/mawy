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

## Props

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The Markdown. |
| `parse` | [`MawyParseOptions`](../types/parse-options) | `{ gfm: true, breaks: false, definitionLists: true }` | How it is read. |
| `html` | [`MawyHtmlPolicy`](../types/html-policy) | `'escape'` | What becomes of raw HTML written inside it. |
| `linkTarget` | [`MawyLinkTarget`](../types/link-target) | `'blank'` | Where a link the document wrote opens. |
| `linkRel` | [`MawyLinkRel`](../types/link-target#mawylinkrel) | — | What such a link declares about where it goes. Added to what it already declares. |
| `directives` | [`MawyDirectives`](../types/directives) | — | What draws the constructs this package does not know about. |
| `resolveUrl` | [`MawyUrlResolver`](../types/url-resolver) | — | Where a relative URL in the document points. |
| `headingBase` | `number` | `1` | Which of `h1` to `h6` the document's own `#` is drawn as. |
| `locale` | [`MawyLocale`](../types/locale) | `'en'` | The language of the few words this library writes itself. |
| `highlight` | [`MawyHighlighter`](../types/highlighter) | — | What colours a code block. |
| `typography` | [`MawyTypography`](../types/typography) | — | How the document is set, as the same custom properties. |
| `fonts` | [`MawyFont`](../types/font)`[]` | `MAWY_SYSTEM_FONTS` | The typefaces those properties may name. |
| `colorScheme` | `'light' \| 'dark' \| null` | `null` | Which palette to draw in. `null` leaves it to the page. |
| `className` | `string` | — | Put on the outermost element, after this library's own names. |
| `style` | `CSSProperties` | — | Merged over the custom properties the typography writes. |

## What is not there, and why

- **No toolbar, find bar or outline.** Each needs JavaScript to work, and there is none here. Use [`MawyViewer`](./mawy-viewer) if you need them.
- **No copy button on a code block**, for the same reason.
- **`html="sanitize"` draws the markup as characters.** Sanitising needs a DOM to parse with, and a server has none. `MawyViewer` does the same on a server, except that there the elements arrive on the next render. Here there is no next render. `html="raw"` writes the markup out as the author wrote it, with everything [that means](../../guide/viewer#safety).
- **A highlighter is used only if it answers synchronously.** A promise has no second render to arrive on. Pass `mawyHighlighter`, or any other synchronous highlighter, and the colour is in the HTML.
- **No `data-mawy-range` on anything.** Every element `MawyViewer` draws carries the offsets it was drawn from, so that a place on the page can be turned back into a place in the document — see [mapping the page back to the source](../../guide/viewer#mapping-the-page-back-to-the-source). Nothing on a page built this way asks that question, and the attribute is a quarter of the HTML: this repository's own README comes out at 12.2 kB rather than 16.8 kB, and 3.4 kB rather than 4.6 kB gzipped.

:::
