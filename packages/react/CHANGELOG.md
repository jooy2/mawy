# Changelog

> This package's history. Each language Mawy ships for keeps its own changelog beside its own manifest, because they version independently.

## Unreleased

### Added

- **`MawyEditor`** — the Markdown source, a live preview, and a switch between them. `plain` edits the source as text, `preview` shows the rendered document, `split` shows both, and `modes` decides which of those the switch offers. Every surface is a view of one string, so nothing is re-serialised on the way between them.
- **A source surface built on a real `<textarea>`**, with a coloured copy of the same text laid exactly underneath it. That keeps the native undo stack, the IME, the mobile keyboard, spellcheck and every platform text gesture — none of which is worth losing for syntax colouring. The two layers share one set of layout properties, and the line-number gutter is the same grid rather than a second stack of rows, so numbers stay level with soft-wrapped text.
- **A syntax highlighter for the source**, which is not the parser and is deliberately approximate: a line being typed is half-written most of the time, and a highlighter that waited for `**bold` to close would flicker on every keystroke.
- **Formatting commands, each with a keyboard shortcut** — bold, italic, strikethrough, code, link, headings, quotations, three kinds of list, code blocks and rules. All of them toggle, markers replace each other rather than stacking, and `Enter` carries a list marker down and takes it away again on an item still empty. Edits go in through the browser's own insertion command so they land on the native undo stack.
- **A status bar** counting position, selection, lines, words, characters and bytes. Words add every Han, hiragana and katakana character to the space-separated count; characters are code points; size is UTF-8 bytes.
- **`MawyViewer`** — a Markdown document, rendered and not editable. The document becomes React elements rather than a string of HTML, so there is no `innerHTML` between the Markdown and the page.
- **The Markdown parser.** CommonMark — headings, paragraphs, fenced and indented code, quotations, nested lists, thematic breaks, HTML blocks, emphasis by the specification's own delimiter-stack rules, links and images including reference definitions resolved from anywhere in the file, autolinks, hard breaks, character references and escapes — plus GitHub's additions: tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs and e-mail addresses, and the five alert kinds. `parse` carries the two options, `gfm` and `breaks`.
- **A toolbar for how the document is set**, not for what it says: typeface, text size, line height, letter spacing, column width, light or dark, an outline of the headings, the source to the clipboard, and a file picker. `toolbar` takes the controls to draw and the order to draw them in, or `false` for none. It is a real `toolbar` — one tab stop, arrow keys inside.
- **A file picker where a document would be.** With no `value`, the viewer is the thing you drop a `.md` file on. `onValueChange` reports the text and the `File` it came from, controlled or not.
- **An outline panel**, built from the same slugs the renderer gives the headings, tracking where the reader is.
- **Light and dark**, through `colorScheme` — `'system'` by default, and following `prefers-color-scheme` only for that value.
- **A typeface list, and web fonts behind a prop.** The toolbar offers whatever `fonts` gives it. The default is three roles the reader's machine already has, and it fetches nothing; `MAWY_WEB_FONTS` is a catalogue of thirteen families under the SIL Open Font License — eight Latin, five Korean — that an application opts into by passing them. Nothing is requested until a font is chosen or the typeface menu is opened, each name in that menu is drawn in its own face, and every stylesheet is fetched once per page.
- Types: `MawyTypography`, `MawyFontFamily`, `MawyFont`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyViewerToolbarItem`, `MawyViewerToolbarOption`, `MawyEditorToolbarItem`, `MawyEditorToolbarOption`, `MawyEditorStatusItem`, `MawyEditorStatusOption`. Values: `MAWY_SYSTEM_FONTS`, `MAWY_WEB_FONTS`.

### Security

- **Every URL a document names is checked against a scheme allowlist**, in Markdown as much as in HTML — `[click](javascript:…)` is refused under every setting of `html`, and is drawn as the words the author wrote rather than as a link that does nothing. `data:` is allowed for images, and only for media types a browser draws.
- **Raw HTML inside a document is inert by default.** `html` chooses: `'escape'` shows the markup as text, `'sanitize'` draws it through an allowlist of elements, attributes and URL schemes parsed with `DOMParser`, and `'raw'` hands the caller the consequences.

### Changed

- `MawyMode` gains **`'split'`**. It is on that list rather than beside it because of what a reader does with the control: the four are one group of buttons, one at a time, and "both" is the fourth answer to the same question.
- The stylesheet declares its tokens on **`.mawy-root`** rather than on `:root`, so a viewer can be dark inside a light page and the library never writes to the document element. Every rule the library ships is scoped under it, which is what keeps a host page's own `article h2` from restyling a document.

### Fixed

- **The line-height and letter-spacing controls moved a number and changed nothing** in a page that declares either property on `p` — which VitePress does, and which is not unusual. Both are inherited, and an inherited value loses to _any_ declaration on the element however specific the container's rule is, so the document's own type is now declared on the elements that carry text as well as on the block around them.

### Dependencies

- Added [`lucide-react`](https://lucide.dev) (ISC), the package's first and only runtime dependency, for the toolbar's icons.
