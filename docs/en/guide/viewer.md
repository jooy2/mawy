---
title: Viewer
order: 3
---

# The viewer

The viewer renders a Markdown document and does not edit it.

<MawyDemo name="viewer/basic" flutter="viewer/basic" :height="520" />

::: fw react

```tsx
import { MawyViewer } from 'mawy-react';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

:::

That is the whole of it. There is no theme object to fill in, no plugin to register and no second library to do the rendering.

## Why it is in this package

A written-with-one-thing, displayed-with-another setup has a failure mode that is hard to argue with after the fact: an author writes a document in the editor, it looks right, and it renders differently for the reader. Every difference between two Markdown implementations — how a list nests, whether a line break is a break, what an unclosed emphasis does — is a chance for that.

Sharing the parser removes the category. What the author saw in `preview` is what the viewer draws, because they are the same code path.

::: fw flutter

That holds across the two packages as well, and it is checked rather than claimed. The Dart parser is the TypeScript one — the same files, the same functions, the same rules — and `packages/flutter/tool/parity.dart` runs both over every Markdown file in the repository and diffs the trees. A document that means one thing in a browser means the same thing in an app.

:::

## A document is optional

::: fw flutter

`value` is required in the Flutter package. Opening a file means a file picker, which means a plugin — a dependency this package does not have and an application usually already does. So reading the file is yours and drawing it is Mawy's.

:::

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
| **GitHub** | tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs and e-mail addresses, footnotes, and the five [alert](https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts) kinds |
| **References** | `[label]: url "title"` definitions, resolved wherever in the file they are written |
| **And one more** | definition lists, which GitHub does not read |

`parse` is where the options live:

```tsx
<MawyViewer value={document} parse={{ gfm: true, breaks: false, definitionLists: true }} />
```

- **`gfm`** (default `true`) — GitHub's additions. Off, a `|` is a pipe and `~~` is four tildes.
- **`breaks`** (default `false`) — whether a single newline inside a paragraph is a line break. Markdown says it is not. Chat clients and issue trackers say it is, which is what a reader who has never written Markdown expects, and the reason this is an option rather than a decision.
- **`definitionLists`** (default `true`) — whether `: ` under a line of text is a term and what it means. See below.

### Footnotes

A `[^label]` in a sentence is a number, and the note it points at is drawn under the document with a link back to where it was mentioned:

```md
Mawy parses its own Markdown.[^why]

[^why]: A parser is the only thing that can say where a piece of the document came from, and that is what everything else here is built on.
```

Three things are worth knowing, and all three are what GitHub does:

- **They are numbered by the order they are first mentioned**, not the order they are written in — the reader meets `1` before `2` whatever the file looks like.
- **A note nobody mentions is not drawn at all.** It is a note to the author, the same way a `[label]: url` nobody links to is.
- **A `[^label]` with nothing to point at stays as the characters it was written with**, rather than becoming a link to nowhere.

A note may be a whole run of blocks — a second paragraph, a list, a code block — as long as the lines after the first are indented four spaces. Where it was written does not matter: the parser lifts it out of the flow, so a note in the middle of a section is still read at the bottom.

### Definition lists

The one thing here that GitHub does not read. The syntax is [PHP Markdown Extra](https://michelf.ca/projects/php-markdown/extra/#def-list)'s, which is the one everybody who writes these uses:

```md
Markdown : A way of writing that reads as what it says.

Mawy : This. : And the editor beside it.
```

A term is a line of text; what it means is a line opening with a colon **and a space** — the space is what keeps `:warning:` under a sentence from turning that sentence into a term, which it would do in a great many documents otherwise. Several terms may share a meaning, several meanings may share a term, and a meaning may be a whole run of blocks if the lines after the first are indented. A blank line before a meaning spaces the whole list out, exactly as it does in a bullet list.

Pass `definitionLists: false` in `parse` to turn it off, for a document that has to mean exactly what it would mean on GitHub.

## Colouring a code block

::: fw flutter

The Flutter package draws code blocks plain for now. `MawyHighlighter` is a React type, and the Dart side will want a shape of its own rather than the same one translated.

:::

Nothing is coloured by default, and that is not an omission. A highlighter is the largest thing a Markdown renderer can be made to carry, and most documents have nothing in them to colour — so it is a prop, and the prop takes a **function** so that nothing is even fetched until a document with a language on a fence is drawn:

```tsx
<MawyViewer
  value={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

`mawy/highlight` is a separate entry point, so an application that never mentions it never ships it. What is in it is Mawy's own highlighter, for the languages a document usually shows — `js`, `ts`, `jsx`, `tsx`, `json`, `html`, `xml`, `css`, `bash`, `python`, `yaml`, `sql`, `go`, `rust`, `java`, `c`, `cpp` and the names each of those also answers to. It is **approximate**, deliberately and permanently: a template literal with a brace in it or a regular expression that reads as division comes out slightly wrong, and none of that matters, because colour is not the kind of answer that has to be right.

For anything more than that, `MawyHighlighter` is the whole interface and Shiki or Prism behind it is a few lines:

```tsx
const shiki: MawyHighlighter = {
  supports: (language) => languages.includes(language),
  highlight: async (code, language) => toMawyTokens(await codeToTokens(code, { lang: language }))
};
```

It is **tokens rather than markup**, and that is the same decision the rest of the library rests on. What a highlighter hands back is text and names — `keyword`, `string`, `comment`, and ten more — and this package decides what element each becomes, so nothing reaches the page as a string of HTML and a highlighter cannot put a `<script>` in a document by being wrong. A name the list does not have is drawn as plain text.

The one thing a highlighter has to promise is that its tokens **are** the code. What comes back is joined together and checked against what went in, and a block whose tokens do not add up is drawn plain — colour is not worth a page that says something the document does not.

Each coloured piece says where it came from, like everything else the viewer draws, so a click in the middle of a code block still finds the character it landed on.

The colours themselves are eight custom properties — `--mawy-hl-comment`, `--mawy-hl-string`, `--mawy-hl-number`, `--mawy-hl-keyword`, `--mawy-hl-type`, `--mawy-hl-function`, `--mawy-hl-variable`, `--mawy-hl-punctuation` — declared on `.mawy-root` in both palettes and yours to redeclare.

## Safety

A viewer renders content that the person running it did not write, so the default is the safe one.

**The document becomes React elements, not a string of HTML.** There is no `innerHTML` on the path from Markdown to the page: a node in the parsed document can only become an element the renderer has a `case` for. That is not escaping done carefully — it is escaping that has nothing to do, which is a stronger thing to be able to say.

**Every URL is checked, in Markdown as much as in HTML.** `[click](javascript:…)` is plain Markdown with no HTML anywhere near it, so the scheme allowlist is not part of the HTML option and is not switched off with it. A refused destination is drawn as the words the author wrote, with no link around them — a reader sees the sentence rather than a control that does nothing.

::: fw flutter

**Raw HTML is shown as the characters it was written with, and there is no option to make it otherwise.** Flutter has no HTML to draw it as, so there is nothing else it could be — which is why the Flutter package has no `html` prop to choose between. The rest of this section is the React package's.

**And nothing is opened.** A tapped link does nothing at all until an application says what opening one means, through `onLinkTap`. Handing a URL to the platform is not a viewer's decision to make; the scheme allowlist has already run, and the rest is yours.

:::

::: fw react

**Raw HTML inside a document is inert until you ask for it.** `html` is the one prop that can change that:

| `html` | What a `<div>` in the document becomes |
| --- | --- |
| `'escape'` _(default)_ | the characters it was written with, shown as text |
| `'sanitize'` | a real `<div>`, with everything outside an allowlist of elements, attributes and URL schemes removed |
| `'raw'` | a real `<div>`, exactly as written |

`'sanitize'` parses with `DOMParser` rather than with a regular expression, on purpose: HTML's error recovery is the attack surface, and the only parser that agrees with a browser about what `<img src=x onerror=alert(1)>` means is a browser's. Where there is no `DOMParser` — a server render — it falls back to showing the markup rather than guessing.

`'raw'` makes the caller responsible for the content. A report about rendering untrusted Markdown with it set is [out of scope](https://github.com/jooy2/mawy/blob/main/SECURITY.md) as a vulnerability, because it is the documented meaning of the value.

:::

## The toolbar

The toolbar is about how the document is **set**, not about what it says. A reader turns the text up, gives it more room to breathe, or moves it to a serif — and the document underneath is untouched.

::: fw react

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  toolbar: const <MawyViewerToolbarItem>[
    MawyViewerToolbarItem.fontSize,
    MawyViewerToolbarItem.colorScheme,
  ],
);
```

:::

<MawyDemo name="viewer/minimal" flutter="viewer/minimal" :height="360" />

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
import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy-react';

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

::: fw flutter

The ranges are in the Dart tree too — every `MdNode` carries one, and they are the same offsets. What is not there is an element to put them on: there is no DOM, so a range is something an application reads off `parseMarkdown` rather than off the screen.

:::

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

- An extension point, so a document can carry a construct this package does not know about.
