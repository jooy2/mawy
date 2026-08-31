---
title: Viewer
order: 3
---

# The viewer

The viewer renders a Markdown document and does not edit it. It is the same parser and the same renderer the editor uses, which is the point of it being in this package rather than being somebody else's library.

<MawyDemo name="viewer/basic" />

```tsx
import { MawyViewer } from 'mawy';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

That is the whole of it. There is no theme object to fill in, no plugin to register and no second library to do the rendering.

## Why it is in this package

A written-with-one-thing, displayed-with-another setup has a failure mode that is hard to argue with after the fact: an author writes a document in the editor, it looks right, and it renders differently for the reader. Every difference between two Markdown implementations — how a list nests, whether a line break is a break, what an unclosed emphasis does — is a chance for that.

Sharing the parser and the renderer removes the category. What the author saw in `preview` is what the viewer draws, because they are the same code path.

## A document is optional

`value` is a prop rather than a requirement, and that is the shape of the component rather than a convenience. With no document the viewer **is** the file picker: drop a `.md` file on it, or choose one.

<MawyDemo name="viewer/empty" />

Which half you get follows from which props you pass:

| You pass       | The viewer                       | Dropping a file                            |
| -------------- | -------------------------------- | ------------------------------------------ |
| nothing        | opens whatever it is given       | keeps it, and calls `onValueChange`        |
| `defaultValue` | starts there, then keeps its own | keeps it, and calls `onValueChange`        |
| `value`        | shows what you pass, always      | is off — say `fileDrop` to turn it back on |

`onValueChange` is called either way, with the text and the `File` it came from:

```tsx
<MawyViewer
  onValueChange={(markdown, file) => {
    console.log(file?.name, markdown.length);
  }}
/>
```

A file larger than five megabytes is refused rather than read. That is about a million words of Markdown, and the failure it prevents is a browser tab that stops answering because somebody dropped a database dump on it.

## What it reads

CommonMark, and GitHub's additions on top of it:

|  |  |
| --- | --- |
| **Blocks** | ATX and setext headings, paragraphs, fenced and indented code, block quotations, ordered and bullet lists to any depth, thematic breaks, HTML blocks |
| **Inline** | emphasis, strong, `code`, links, images, autolinks, hard line breaks, character references, backslash escapes |
| **GitHub** | tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs and e-mail addresses, and the five [alert](https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts) kinds |
| **References** | `[label]: url "title"` definitions, resolved wherever in the file they are written |

`parse` is where the two options live:

```tsx
<MawyViewer value={document} parse={{ gfm: true, breaks: false }} />
```

- **`gfm`** (default `true`) — GitHub's additions. Off, a `|` is a pipe and `~~` is four tildes.
- **`breaks`** (default `false`) — whether a single newline inside a paragraph is a line break. Markdown says it is not. Chat clients and issue trackers say it is, which is what a reader who has never written Markdown expects, and the reason this is an option rather than a decision.

Syntax highlighting is not here yet. It is the standing example of a place a third-party library is worth a dependency, and it will arrive behind an interface so an application that does not want it does not pay for it.

## Safety

A viewer renders content that the person running it did not write, so the default is the safe one.

**The document becomes React elements, not a string of HTML.** There is no `innerHTML` on the path from Markdown to the page: a node in the parsed document can only become an element the renderer has a `case` for. That is not escaping done carefully — it is escaping that has nothing to do, which is a stronger thing to be able to say.

**Every URL is checked, in Markdown as much as in HTML.** `[click](javascript:…)` is plain Markdown with no HTML anywhere near it, so the scheme allowlist is not part of the HTML option and is not switched off with it. A refused destination is drawn as the words the author wrote, with no link around them — a reader sees the sentence rather than a control that does nothing.

**Raw HTML inside a document is inert until you ask for it.** `html` is the one prop that can change that:

| `html` | What a `<div>` in the document becomes |
| --- | --- |
| `'escape'` _(default)_ | the characters it was written with, shown as text |
| `'sanitize'` | a real `<div>`, with everything outside an allowlist of elements, attributes and URL schemes removed |
| `'raw'` | a real `<div>`, exactly as written |

`'sanitize'` parses with `DOMParser` rather than with a regular expression, on purpose: HTML's error recovery is the attack surface, and the only parser that agrees with a browser about what `<img src=x onerror=alert(1)>` means is a browser's. Where there is no `DOMParser` — a server render — it falls back to showing the markup rather than guessing.

`'raw'` makes the caller responsible for the content. A report about rendering untrusted Markdown with it set is [out of scope](https://github.com/jooy2/mawy/blob/main/SECURITY.md) as a vulnerability, because it is the documented meaning of the value.

## The toolbar

The toolbar is about how the document is **set**, not about what it says. A reader turns the text up, gives it more room to breathe, or moves it to a serif — and the document underneath is untouched.

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

<MawyDemo name="viewer/minimal" />

`toolbar` takes `true` for all of it, `false` for none, or the controls to draw and the order to draw them in:

| Item              | What it does                                                       |
| ----------------- | ------------------------------------------------------------------ |
| `'fontFamily'`    | whichever typefaces the viewer was given — see [below](#typefaces) |
| `'fontSize'`      | 13 to 26 pixels                                                    |
| `'lineHeight'`    | 1.3 to 2.4                                                         |
| `'letterSpacing'` | −0.04 to 0.16em                                                    |
| `'measure'`       | how wide the column of text may run                                |
| `'colorScheme'`   | light, dark, or whatever the system says                           |
| `'outline'`       | opens the headings panel                                           |
| `'copy'`          | the Markdown source, to the clipboard                              |
| `'open'`          | the file picker                                                    |
| `'separator'`     | a hairline, for grouping a long list                               |

There is no way to put a control on it that is not on that list, and that is deliberate: a toolbar that takes arbitrary children is a toolbar the library can no longer make keyboard-operable.

It is a real `toolbar` rather than a row of buttons. One Tab enters it and one Tab leaves; the arrow keys, `Home` and `End` move between the controls inside. A reader who is keyboard-only should reach the document in two keystrokes rather than in eleven.

## Typefaces

By default the menu offers three, and they are roles rather than font names: `sans`, `serif` and `mono`, drawn with whatever is already on the reader's machine. Nothing is downloaded and nothing can fail.

Real web fonts are one prop away, and they are a prop rather than a default on purpose. A viewer is a component inside somebody else's page, and a component that opens a connection to a font CDN on its own has made a decision — about privacy, about working offline, about a request the page's own content policy may refuse — that was never its to make. So the library ships the list and the application says yes:

```tsx
import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy';

<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />;
```

Every family in `MAWY_WEB_FONTS` is under the SIL Open Font License, which permits commercial use, embedding and redistribution — there is nothing on the list to buy a licence for.

|  |  |
| --- | --- |
| **Sans** | Inter, IBM Plex Sans, [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) |
| **Serif** | Source Serif 4, Literata, Lora, EB Garamond |
| **Mono** | JetBrains Mono |
| **Korean** | Pretendard, Noto Sans KR, Noto Serif KR, Nanum Myeongjo, Gowun Dodum |

The Korean families are on the list rather than left to the fallback, because "the typeface menu is Latin only" is exactly how a Korean document ends up set in something nobody chose.

Nothing is fetched until it is needed. The font the document is already set in arrives when the viewer mounts; the rest arrive when the typeface menu is first opened — which is also when they have to, because every name in that menu is drawn in its own face. A reader who never opens it never asks for anything.

Your own list is the same shape:

```tsx
<MawyViewer
  value={document}
  fonts={[
    { id: 'sans' },
    { id: 'house', label: 'Söhne', stack: "'Söhne', system-ui, sans-serif" },
    { id: 'archive', label: 'Archive', stack: "'Archive', serif", href: '/fonts/archive.css' }
  ]}
/>
```

`id` is what `typography.fontFamily` is set to. `stack` defaults to `var(--mawy-font-{id})`, which is how the three built-in roles stay a stylesheet's business. `href` is a stylesheet fetched once, the first time the font is drawn — leave it out for a font the page already loads.

## Type, and who owns it

Every typography value reaches the page as a `--mawy-doc-*` custom property, so there are two ways in and they are the same way.

Through the prop, and the viewer keeps it:

```tsx
<MawyViewer
  value={document}
  defaultTypography={{ fontSize: 18, measure: 'wide' }}
  onTypographyChange={(typography) => localStorage.setItem('type', JSON.stringify(typography))}
/>
```

Or through CSS, with the toolbar left off entirely:

```css
.reader .mawy-md {
  --mawy-doc-size: 18px;
  --mawy-doc-line-height: 1.8;
}
```

Anything left out of `typography` keeps its default, so `{ fontSize: 18 }` is a whole answer rather than a partial one.

The document's line height and letter spacing are declared on the text itself, not only on the container around it. That sounds like a detail and it is the difference between the controls working and not: an inherited value loses to _any_ declaration on the element, so one `article p { line-height: 28px }` in the surrounding page is enough to make the line-height control move a number that changes nothing a reader can see.

## Theming

Every colour the viewer draws with is a `--mawy-*` custom property declared on `.mawy-root`, and redeclaring one is the whole theming story:

```css
.mawy-root {
  --mawy-accent: #b8005c;
  --mawy-radius-lg: 4px;
}
```

They are on `.mawy-root` rather than on `:root` on purpose. A component library has no business writing to the document element — and a viewer that read its palette from `:root` could not be dark inside a light page, which is exactly what a single embedded document often wants to be.

The light and dark palettes are chosen by `colorScheme`, which is `'system'` unless you say otherwise. `'system'` follows `prefers-color-scheme`; `'light'` and `'dark'` do not, so an application with its own switch drives the viewer from it and a reader on a dark machine still gets the light document you asked for.

## Where a piece of the page came from

Every element the viewer draws carries `data-mawy-range="start,end"` — the offsets, in the Markdown it was given, of that piece's first character and of the one after its last. Blocks, list items, table rows and cells, and the inline elements inside them: emphasis, links, code spans, images.

A code block says it twice. The box around it stands for the whole thing, fences and info string and indent; the `code` element inside stands for the code alone, which is the part a caret can be in — and it is a place even with nothing between the fences, where the two offsets are the same number.

In a document that reads `# Title`, a blank line, `## Second`, that second heading is drawn as:

```html
<h2 id="second" class="mawy-md-heading" data-mawy-range="9,18">Second</h2>
```

A range is the only way back: from a place on the page to the place in the document it was drawn from. The editor's `split` reads it twice over — to scroll the preview to the block the top line of the source is in, and to put the caret on the word a click in the preview landed on. An application can read it for the same kind of thing: a comment pinned to a paragraph, an "edit this section" control beside a heading. The offsets index the string you passed directly, in UTF-16 code units, so `value.slice(start, end)` is the Markdown behind whatever was clicked.

Text is the one thing with no range on it, having no attributes to put one in. It does not need one: a run of text is bounded by the elements on either side of it, which is enough to find it in the source between them — a `<strong>` drawn from `**bold**` contains `bold` at exactly one place inside those eight characters.

## Accessibility

- The toolbar is a `toolbar` with one tab stop and arrow-key movement inside it.
- Every icon button has a name; nothing is announced as "button".
- Menus close on `Escape` and give the focus back to the control that opened them.
- Following an outline entry moves the focus as well as the scroll, so the next `Tab` carries on from the heading rather than from the panel.
- A code block's copy button is invisible until the pointer or the focus is on it, and is never removed from the layout — a button that is not in the layout is a button `Tab` walks past.
- Animation is dropped under `prefers-reduced-motion`.

## Still to come

- Syntax-highlighted code blocks, behind an interface.
- Footnotes, and the definition list syntax.
- An extension point, so a document can carry a construct this package does not know about.
