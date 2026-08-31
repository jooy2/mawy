# Changelog

> This package's history. Each language Mawy ships for keeps its own changelog beside its own manifest, because they version independently.

## Unreleased

### Added

- **`MawyViewer`** — a Markdown document, rendered and not editable. The document becomes React elements rather than a string of HTML, so there is no `innerHTML` between the Markdown and the page.
- **The Markdown parser.** CommonMark — headings, paragraphs, fenced and indented code, quotations, nested lists, thematic breaks, HTML blocks, emphasis by the specification's own delimiter-stack rules, links and images including reference definitions resolved from anywhere in the file, autolinks, hard breaks, character references and escapes — plus GitHub's additions: tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs and e-mail addresses, and the five alert kinds. `parse` carries the two options, `gfm` and `breaks`.
- **A toolbar for how the document is set**, not for what it says: typeface, text size, line height, letter spacing, column width, light or dark, an outline of the headings, the source to the clipboard, and a file picker. `toolbar` takes the controls to draw and the order to draw them in, or `false` for none. It is a real `toolbar` — one tab stop, arrow keys inside.
- **A file picker where a document would be.** With no `value`, the viewer is the thing you drop a `.md` file on. `onValueChange` reports the text and the `File` it came from, controlled or not.
- **An outline panel**, built from the same slugs the renderer gives the headings, tracking where the reader is.
- **Light and dark**, through `colorScheme` — `'system'` by default, and following `prefers-color-scheme` only for that value.
- Types: `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyViewerToolbarItem`, `MawyViewerToolbarOption`.

### Security

- **Every URL a document names is checked against a scheme allowlist**, in Markdown as much as in HTML — `[click](javascript:…)` is refused under every setting of `html`, and is drawn as the words the author wrote rather than as a link that does nothing. `data:` is allowed for images, and only for media types a browser draws.
- **Raw HTML inside a document is inert by default.** `html` chooses: `'escape'` shows the markup as text, `'sanitize'` draws it through an allowlist of elements, attributes and URL schemes parsed with `DOMParser`, and `'raw'` hands the caller the consequences.

### Changed

- The stylesheet declares its tokens on **`.mawy-root`** rather than on `:root`, so a viewer can be dark inside a light page and the library never writes to the document element. Every rule the library ships is scoped under it, which is what keeps a host page's own `article h2` from restyling a document.

### Dependencies

- Added [`lucide-react`](https://lucide.dev) (ISC), the package's first and only runtime dependency, for the toolbar's icons.
