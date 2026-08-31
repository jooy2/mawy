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
- **Every node knows where it came from.** A parsed node carries the range of the source it was read out of — through however many containers it was nested in, past the `>` a quotation puts on each line, the indent of a list item and the pipes around a table cell — and a child's range always sits inside its parent's. Offsets are counted in the document as it was handed over rather than as the parser tidied it, so a file with Windows line endings, a byte order mark or a tab where an indent should be answers in its own characters. Nothing draws them yet: they are what a preview scrolling in step with the source, and an edit made in the rendered document and written back to the Markdown, will both be built on.
- **Every element says where it came from.** The viewer draws each one with `data-mawy-range="start,end"` — the offsets in the Markdown it was given of that piece's first character and of the one after its last. Blocks, list items, table rows and cells, and the inline elements inside them: emphasis, links, code spans, images. The offsets index the string that was passed, so `value.slice(start, end)` is the Markdown behind whatever was clicked. Text carries none, having no attributes to carry one in, and needs none: a run of text is bounded by the elements on either side of it, which is enough to find it in the source between them.
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

- **A click in the preview puts the caret on the same word in the source.** On the word, not on the paragraph: clicking the middle of a bold phrase puts the caret in the middle of it, between the asterisks. Neither pane is scrolled to do it, since in `split` the two are already showing the same part of the document. Links, checkboxes and a code block's copy button keep their own click, and a click that ended a text selection is left as a selection.
- **The preview in `split` scrolls to the block rather than to the fraction.** Whichever line is at the top of the source decides which block is at the top of the preview, and the positions in between run straight from one block to the next. The fraction of the way through a file is not the fraction down the page — a fenced code block is sixty lines of source and sixty lines of page, an image is one line of source and half a screen — and the further those two get apart the further the preview is from whatever is being typed.
- `MawyMode` gains **`'split'`**. It is on that list rather than beside it because of what a reader does with the control: the four are one group of buttons, one at a time, and "both" is the fourth answer to the same question.
- The stylesheet declares its tokens on **`.mawy-root`** rather than on `:root`, so a viewer can be dark inside a light page and the library never writes to the document element. Every rule the library ships is scoped under it, which is what keeps a host page's own `article h2` from restyling a document.

### Fixed

- **The two panes of `split` never scrolled together at all.** The handler was on the pane around the textarea rather than on the textarea, and a `scroll` event does not bubble — so nothing was ever heard and the preview never moved.
- **The line-height and letter-spacing controls moved a number and changed nothing** in a page that declares either property on `p` — which VitePress does, and which is not unusual. Both are inherited, and an inherited value loses to _any_ declaration on the element however specific the container's rule is, so the document's own type is now declared on the elements that carry text as well as on the block around them.

### Dependencies

- Added [`lucide-react`](https://lucide.dev) (ISC), the package's first and only runtime dependency, for the toolbar's icons.
