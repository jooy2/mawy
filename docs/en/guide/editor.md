---
title: Editor
order: 2
---

# The editor

Mawy's editor is one component with several surfaces. `plain` edits the Markdown source as text, `preview` shows the rendered document, and `split` shows both at once. They are views of one value rather than several editors, which is the decision the whole design turns on.

<MawyDemo name="editor/basic" />

```tsx
import { MawyEditor } from 'mawy';

export function Page() {
  return <MawyEditor defaultValue="# Hello" onChange={save} />;
}
```

## Two views, one value

The usual arrangement is a WYSIWYG editor with a "source mode" bolted on, where switching serialises out of one model and parses into another. Every round trip through that pair loses whatever the other side could not express — a footnote, an HTML block, the exact spelling of a list marker — and the loss is silent.

Here the document is a string of Markdown and every surface is a way of looking at it. Switching changes which surface is mounted; it does not re-serialise anything, so a document that came in unchanged goes out unchanged.

## Modes

| Mode        | Editable | Shows                           |
| ----------- | -------- | ------------------------------- |
| `'plain'`   | Yes      | The Markdown source             |
| `'preview'` | No       | The rendered document           |
| `'split'`   | Yes      | Both, side by side              |
| `'wysiwyg'` | In part  | The rendered document, in place |

`modes` decides which of them the toolbar offers, and the switch disappears when there is only one:

```tsx
<MawyEditor defaultValue={document} modes={['plain']} />
```

<MawyDemo name="editor/source" />

`mode` / `defaultMode` / `onModeChange` are the usual three: pass `mode` and the application decides, pass `defaultMode` and the editor keeps it, and `onModeChange` is called either way.

In `split`, the preview scrolls with the source **to the block** rather than to the same fraction of the way down the file. Whichever line is at the top of the source decides which block is at the top of the preview, and the positions in between run straight from one block to the next. A fraction cannot do that: sixty lines of source that are sixty lines of page, with prose on either side that is neither, is exactly where the two drift apart.

It goes the other way too. **Click a word in the preview and the caret lands on that word in the source** — on the word, not on the paragraph, so clicking the middle of a bold phrase puts the caret in the middle of it between the asterisks. Neither pane is scrolled to do it: they are already showing the same part of the document, so the word clicked on is a word the source is showing. Links, checkboxes and a code block's copy button are left to do their own jobs, and a click that finished a text selection is a selection rather than a request to go somewhere.

## The source surface

A real `<textarea>`, with a coloured copy of the same text laid exactly underneath it.

That arrangement is the point rather than a trick. The textarea keeps everything that is extremely hard to reimplement and extremely obvious when it is missing: the **IME** — Korean is composed a jamo at a time, and an editor that fights the composition eats characters — the mobile keyboard, autocorrect, spellcheck, and every text-selection gesture the platform has. What a textarea cannot do is colour anything, so its text is made transparent, its caret and selection are left visible, and a layer behind it draws the same characters in colour.

Everything that decides where a character lands — font, size, line height, letter spacing, tab size, wrapping, and the padding that sets the left edge — is declared once in the stylesheet, for both layers. That is what keeps them in step, and it is why the editor's monospace face is `--mawy-font-mono` and not a choice the component makes.

The syntax colouring is Mawy's own parser's vocabulary, but not Mawy's own parser. A line being typed is half-written most of the time, and a highlighter that waited for `**bold` to be closed before admitting anything was happening would flicker on every keystroke — so it reads a line at a time, approximately, and deliberately says nothing about an unfinished marker.

`lineNumbers` turns the gutter off. It is on by default, and the numbers stay lined up with soft-wrapped text because both layers are one grid rather than two stacks of rows.

## The document surface

`wysiwyg` draws the document and lets you edit it where it is drawn. It is **partly built**, and what follows is exactly which part.

<MawyDemo name="editor/document" />

There is no second model behind it. What is on screen is a drawing of the Markdown and the Markdown is what is true: every keystroke is refused, turned into an edit to that string, and the document is drawn again from whatever the string became. Nothing is ever read back out of the tree the browser wanted to change. There is no DOM-to-Markdown serialiser in this package and there is not going to be one — a second implementation is a second opinion about what a document means, and the two disagree the first time anybody writes something unusual.

It is not on `modes` by default. An application asks for it:

```tsx
<MawyEditor defaultValue={document} modes={['wysiwyg', 'plain']} />
```

What works: typing and deleting **anywhere there is text to type in** — a paragraph, a heading, a list item, a quotation, a table cell, a code block — replacing a selection, `Shift`+`Enter` for a hard break, and every command on the toolbar. Those last needed nothing new: they are pure functions of the source and its selection and neither surface is mentioned anywhere in them.

Edits land on the **drawn** character rather than the written one, and that is the difference the whole surface turns on. The caret after `bold` in `**bold**` has an asterisk in front of it in the file and a `d` in front of it on the page. `Backspace` there takes the `d`. An image and a hard break come out in one piece, because each of them is one character to a reader and none at all to a walk over the runs of text.

`Enter` is a different thing in every container it is pressed in, because a blank line means something different in each:

| Where           | What `Enter` does                                                             |
| --------------- | ----------------------------------------------------------------------------- |
| Between blocks  | A blank line                                                                  |
| In a list item  | A new item, marker carried down — and on an item still empty, the marker goes |
| In a quotation  | Ends the paragraph, which takes a _blank quoted line_ rather than a new one   |
| In a code block | A newline and nothing else                                                    |
| In a table      | Nothing: a row is a line, and there is nowhere in the file for a second one   |

`Backspace` at the start of a block joins it to the one before it: two list items run together, a paragraph joins the heading above it. Two things it will not join — a table cell to the cell beside it, which would be eating the pipe between them, and a code block to whatever is above it, which would be eating the fence.

`Enter` at the end of a paragraph is the one place the file cannot say what the screen needs to. Markdown has no empty paragraph: a blank line separates two blocks and a second blank line separates the same two. So the surface draws one anyway, in that one place, for as long as the caret is in it — and the moment anything is typed the blank line is doing the work and the paragraph is real.

An input method is the one thing that **cannot** be refused, and it is handled the other way round. A composition is left completely alone: from `compositionstart` to `compositionend` the browser owns that run of text, nothing is prevented, and nothing is drawn again in between. When it finishes, the run is compared with what it said before and the difference goes into the Markdown at the place that run came from.

Refusing a composition is refusing the composition. Korean is composed a jamo at a time, and an editor that answers each of them with "no" cannot write Korean at all. Pressing `Enter` and composing straight into the empty paragraph works too, because with no run of text to be in yet it is the block itself that is remembered.

What does not work yet, and does nothing at all rather than something half-right:

- **Raw HTML that is being drawn rather than shown.** Under `sanitize` and `raw` the markup reached the page through `dangerouslySetInnerHTML`, which means React does not know what is inside it and could not put it back. Under `escape` — the default — it is text like any other text, and edits like any other.
- **Putting an image in.** One pasted or dropped as part of a web page arrives as an image, because that is markup; one on the clipboard as a _file_ — a screenshot — does not, because there is nowhere for the bytes to go until an application says where.

## Formatting

Every button on the toolbar runs a command that also has a keyboard shortcut, and the order of those two is the design: the commands are the editor, and the buttons are a way of finding them. An editor whose toolbar is the only way to reach a command is an editor that cannot be used without a pointer.

|                         |                                        |
| ----------------------- | -------------------------------------- |
| `Mod` + `B`             | Bold                                   |
| `Mod` + `I`             | Italic                                 |
| `Mod` + `Shift` + `X`   | Strikethrough                          |
| `Mod` + `E`             | Code                                   |
| `Mod` + `K`             | Link                                   |
| `Mod` + `1` / `2` / `3` | Heading 1, 2, 3                        |
| `Mod` + `0`             | Body text                              |
| `Mod` + `Z`             | Undo                                   |
| `Mod` + `Shift` + `Z`   | Redo, and `Ctrl` + `Y` as well         |
| `Enter`                 | Carries a list marker to the next line |

`Mod` is Command or Control, whichever the machine has — both are accepted rather than guessed at.

Every command is a **toggle**: pressing `Mod`+`B` on bold text unbolds it, and the toolbar button shows which are in force. Markers replace each other rather than stacking, so turning a numbered list into a bulleted one gives a bulleted list and not `- 1. item`.

`Enter` at the end of a list item carries the marker down and counts an ordered list on. Pressing it again on the item that is still empty takes the marker away instead of making another — without that, leaving a list means deleting the bullet the editor has just helpfully added.

The edits go in through the browser's own text-insertion command, which leaves the caret, the scroll position and any composition in progress exactly where they were — a controlled write promises none of that. Undo used to be the reason and is not any more; it has a section of its own below.

`toolbar` takes `true`, `false`, or the controls to draw and the order to draw them in:

```tsx
<MawyEditor defaultValue={document} toolbar={['mode', 'separator', 'bold', 'italic', 'link']} />
```

| Item |  |
| --- | --- |
| `'mode'` | The surface switch |
| `'heading'` | A menu of heading 1, 2, 3 and body text |
| `'bold'`, `'italic'`, `'strikethrough'`, `'code'`, `'link'` | Inline formatting |
| `'quote'`, `'bulletList'`, `'orderedList'`, `'taskList'`, `'codeBlock'`, `'rule'` | Blocks |
| `'colorScheme'` | Light, dark, or whatever the system says |
| `'separator'` | A hairline, for grouping |

## Undo

`Mod`+`Z` goes back, `Mod`+`Shift`+`Z` comes forward again, and `Ctrl`+`Y` is the same thing where Windows put it. The history is **one list for the whole editor** rather than one per surface.

It has to be. The source surface could have used the browser's own stack — a `<textarea>` keeps an excellent one — but the drawn document is a `contenteditable` that refuses every input, which is another way of saying it never gets an entry on the browser's stack at all. Two stacks would be worse than one either way: an edit made in `wysiwyg` and taken back in `plain` would step through half of what happened and then stop.

What is stored is the document before each change together with where the caret was, because that is the state undo has to arrive at.

A run of typing is **one step**, not one per keystroke — a `Mod`+`Z` that gives back one character at a time is one nobody presses twice. A change carries on from the one before it while it is the same kind of change, in the same place, within a moment of it. A syllable being composed counts as more of the same typing, because a Korean keyboard rewrites what it wrote on every jamo and none of those are separate thoughts. A line ending closes the run behind it: what is typed after `Enter` is the next thing the writer meant, and undo stops between the two.

## Pasting

**What is on the clipboard as HTML arrives as Markdown.** Copy a section of a web page into either surface and the headings are hashes, the links are links, the list is a list. Copy out of a word processor and the same is true.

A clipboard with nothing but text on it is left to the browser. Its own paste is exactly right, and letting it happen keeps the caret, the scroll and the run of undo where they were.

This is **not** the renderer run backwards, and the difference is the whole reason it is allowed to exist. Markup from somewhere else is read once, for whatever can be made of it; nothing round-trips through it. So it is allowed to be lossy and it is — a `<span style="color: red">` is its text, a `<video>` is nothing, an attribute nobody named is gone. Every URL goes through the same check a Markdown link gets, so a pasted `javascript:` link arrives as the words it was written with rather than as a link that does nothing.

Inside a code block a paste is the plain text and nothing else. Everything in there is the characters it is, and a pasted heading is a line beginning with a hash.

## The status bar

```tsx
<MawyEditor defaultValue={document} status={['position', 'words', 'size']} />
```

`'position'`, `'selection'`, `'lines'`, `'words'`, `'characters'` and `'size'` — or `false` for none.

Two of those count more carefully than they look. **Characters** are code points, so an emoji is one rather than two. **Words** add every Han, hiragana and katakana character to the space-separated count, because those languages are written without spaces and a whitespace split calls a page of them one word — Korean is spaced, so an eojeol is a word and it is counted as one. **Size** is UTF-8 bytes, which is what a file on disk will be and is not the same number as the character count the moment anything is not ASCII.

## Still to come

- Input rules: the Markdown you type turning into what it means as you type it.
- Images.
- The extension point, so a document can carry a construct this package does not know about.

## Accessibility

The editing surface is a labelled `textbox` and everything reachable from the toolbar is reachable from the keyboard first. The toolbar is a real `toolbar`: one tab stop, arrow keys inside. `Tab` is deliberately **not** captured for indentation — a textarea that swallows `Tab` is a keyboard trap, and indentation is not worth one.
