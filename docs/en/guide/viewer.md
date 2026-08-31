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

| Item              | What it does                             |
| ----------------- | ---------------------------------------- |
| `'fontFamily'`    | sans, serif or monospace                 |
| `'fontSize'`      | 13 to 26 pixels                          |
| `'lineHeight'`    | 1.3 to 2.4                               |
| `'letterSpacing'` | −0.04 to 0.16em                          |
| `'measure'`       | how wide the column of text may run      |
| `'colorScheme'`   | light, dark, or whatever the system says |
| `'outline'`       | opens the headings panel                 |
| `'copy'`          | the Markdown source, to the clipboard    |
| `'open'`          | the file picker                          |
| `'separator'`     | a hairline, for grouping a long list     |

There is no way to put a control on it that is not on that list, and that is deliberate: a toolbar that takes arbitrary children is a toolbar the library can no longer make keyboard-operable.

It is a real `toolbar` rather than a row of buttons. One Tab enters it and one Tab leaves; the arrow keys, `Home` and `End` move between the controls inside. A reader who is keyboard-only should reach the document in two keystrokes rather than in eleven.

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
