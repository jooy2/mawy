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
- **A typeface list, and web fonts behind a prop.** The toolbar offers whatever `fonts` gives it. The default is three roles the reader's machine already has, and it fetches nothing; `MAWY_WEB_FONTS` is a catalogue of thirteen families under the SIL Open Font License — eight Latin, five Korean — that an application opts into by passing them. Nothing is requested until a font is chosen or the typeface menu is opened, each name in that menu is drawn in its own face, and every stylesheet is fetched once per page.
- Types: `MawyTypography`, `MawyFontFamily`, `MawyFont`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyViewerToolbarItem`, `MawyViewerToolbarOption`. Values: `MAWY_SYSTEM_FONTS`, `MAWY_WEB_FONTS`.

### Security

- **Every URL a document names is checked against a scheme allowlist**, in Markdown as much as in HTML — `[click](javascript:…)` is refused under every setting of `html`, and is drawn as the words the author wrote rather than as a link that does nothing. `data:` is allowed for images, and only for media types a browser draws.
- **Raw HTML inside a document is inert by default.** `html` chooses: `'escape'` shows the markup as text, `'sanitize'` draws it through an allowlist of elements, attributes and URL schemes parsed with `DOMParser`, and `'raw'` hands the caller the consequences.

### Changed

- The stylesheet declares its tokens on **`.mawy-root`** rather than on `:root`, so a viewer can be dark inside a light page and the library never writes to the document element. Every rule the library ships is scoped under it, which is what keeps a host page's own `article h2` from restyling a document.

### Fixed

- **The line-height and letter-spacing controls moved a number and changed nothing** in a page that declares either property on `p` — which VitePress does, and which is not unusual. Both are inherited, and an inherited value loses to _any_ declaration on the element however specific the container's rule is, so the document's own type is now declared on the elements that carry text as well as on the block around them.

### Dependencies

- Added [`lucide-react`](https://lucide.dev) (ISC), the package's first and only runtime dependency, for the toolbar's icons.
