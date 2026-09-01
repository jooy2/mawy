---
title: Editor
order: 2
---

# The editor

::: fw flutter

**Three surfaces here rather than four**, and the missing one is worth saying out loud. `wysiwyg` draws the document and edits it where it is drawn, which rests entirely on `contenteditable`: a browser telling a component what somebody tried to do to a tree, so the component can refuse it and change the Markdown instead. Flutter has no such thing — an `EditableText` owns a string — and drawing a document that is also a text field would mean a second model of what the document is. A second model is a second opinion about what a document means, and the two disagree the first time anybody writes something unusual.

So `plain`, `split` and `preview`, and the drawn surface stays a viewer. Nearly everything else on this page is here, and provably so: the commands, the colouring of the source, the counts along the bottom and finding text are the same functions under the same names, and the parity check diffs all four against the React package's on every change. Opening and saving are the exception, and that section says why.

```dart
MawyEditor(
  defaultValue: '# Hello',
  onChange: save,
);
```

:::

Mawy's editor is one component with several surfaces. `plain` edits the Markdown source as text, `preview` shows the rendered document, and `split` shows both at once. They are views of one value rather than several editors, which is the decision the whole design turns on.

<MawyDemo name="editor/basic" flutter="editor/basic" :height="520" />

```tsx
import { MawyEditor } from 'mawy-react';

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

**The bar between the two panes is something to take hold of.** Half and half is a guess about what somebody is doing and it is wrong as often as it is right: a wide window wants more preview while reading over a draft and more source while writing one. Drag it, or focus it and use the arrows — `Shift` for a bigger step, `Home` and `End` for the ends, `Enter` or a double-click for half and half again. It stops well short of either edge, because a pane pushed to nothing is a pane nobody can get back.

That is the reader's, for as long as they are looking at it, and there is no prop for it. Where a pane's edge sits is the same kind of thing as where a scrollbar sits; an application with a reason to store it already has `value` and `onChange` for the thing worth storing.

Below the width at which the two panes stop being side by side and stack, there is no bar and nothing for it to be between.

It goes the other way too. **Click a word in the preview and the caret lands on that word in the source** — on the word, not on the paragraph, so clicking the middle of a bold phrase puts the caret in the middle of it between the asterisks. Neither pane is scrolled to do it: they are already showing the same part of the document, so the word clicked on is a word the source is showing. Links, checkboxes and a code block's copy button are left to do their own jobs, and a click that finished a text selection is a selection rather than a request to go somewhere.

## The source surface

::: fw react

A real `<textarea>`, with a coloured copy of the same text laid exactly underneath it.

That arrangement is the point rather than a trick. The textarea keeps everything that is extremely hard to reimplement and extremely obvious when it is missing: the **IME** — Korean is composed a jamo at a time, and an editor that fights the composition eats characters — the mobile keyboard, autocorrect, spellcheck, and every text-selection gesture the platform has. What a textarea cannot do is colour anything, so its text is made transparent, its caret and selection are left visible, and a layer behind it draws the same characters in colour.

Everything that decides where a character lands — font, size, line height, letter spacing, tab size, wrapping, and the padding that sets the left edge — is declared once in the stylesheet, for both layers. That is what keeps them in step, and it is why the editor's monospace face is `--mawy-font-mono` and not a choice the component makes.

:::

::: fw flutter

One `EditableText`, coloured where it stands.

This is the one place this package has the easier job. A browser gives no way to colour what is inside a text field, so the React package draws two layers and keeps them in step; a `TextEditingController` is simply asked for the spans it wants drawn, and `MawySourceController` answers with them. One layer, no grid to keep aligned, and the caret and the selection are the platform's own because the field is the platform's own.

What that field does not come with is the pointer. A bare `EditableText` puts the caret where it is tapped and stops there — dragging across it selects nothing, a double tap takes no word, and a long press raises no handles. All of that is `TextSelectionGestureDetectorBuilder`, which `TextField` builds around its own field and this builds around its own. It lives in `package:flutter/widgets.dart` rather than in Material, so having it costs this package nothing it has refused elsewhere.

Two things are still the platform's rather than this package's, and both are Cupertino's rather than Flutter's: the magnifier that opens under a hard press on iOS, and the selection toolbar. A gesture that starts something this package cannot finish is worse than one that does nothing, so the force press is off.

There is no `lineNumbers` here. The gutter is a second column that has to stay level with soft-wrapped text, and one text field is not two grids.

:::

The syntax colouring is Mawy's own parser's vocabulary, but not Mawy's own parser. A line being typed is half-written most of the time, and a highlighter that waited for `**bold` to be closed before admitting anything was happening would flicker on every keystroke — so it reads a line at a time, approximately, and deliberately says nothing about an unfinished marker.

::: fw react

`lineNumbers` turns the gutter off. It is on by default, and the numbers stay lined up with soft-wrapped text because both layers are one grid rather than two stacks of rows.

:::

## The document surface

`wysiwyg` draws the document and lets you edit it where it is drawn. What follows is exactly what that means, because it is the surface with the most in it that could be assumed and is not.

<MawyDemo name="editor/document" />

There is no second model behind it. What is on screen is a drawing of the Markdown and the Markdown is what is true: every keystroke is refused, turned into an edit to that string, and the document is drawn again from whatever the string became. Nothing is ever read back out of the tree the browser wanted to change. There is no DOM-to-Markdown serialiser in this package and there is not going to be one — a second implementation is a second opinion about what a document means, and the two disagree the first time anybody writes something unusual.

**It is the first surface the switch offers**, and it was not on the default list at all until the two things it could not do stopped being true — a link's destination and raw HTML being drawn are both written out as their own characters when the caret is in them, so there is nowhere on it a caret cannot go. An application that would rather not offer it says so the way it says anything else about the switch:

```tsx
<MawyEditor defaultValue={document} modes={['plain', 'split', 'preview']} />
```

What works: typing and deleting **anywhere there is text to type in** — a paragraph, a heading, a list item, a quotation, a table cell, a code block — replacing a selection, `Shift`+`Enter` for a hard break, the shorthands that turn into formatting as they are typed, and every command on the toolbar. Those last needed nothing new: they are pure functions of the source and its selection and neither surface is mentioned anywhere in them.

Edits land on the **drawn** character rather than the written one, and that is the difference the whole surface turns on. The caret after `bold` in `**bold**` has an asterisk in front of it in the file and a `d` in front of it on the page. `Backspace` there takes the `d`. An image and a hard break come out in one piece, because each of them is one character to a reader and none at all to a walk over the runs of text.

The other half of that is a caret in a place the page cannot draw. Markdown does not keep the whitespace at the end of a line, so a space typed at the end of a paragraph is in the file and drawn nowhere at all, and the caret can only come back in front of it. Where it was **meant** to be is kept beside the place it settled for, so the next letter goes after the space rather than in front of it — without which `One two` could not be typed a word at a time. `Backspace` there takes the space, for the same reason: there is no drawn character in front of the caret to take.

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

**A link, an image or a piece of raw HTML the caret is inside is written out as its own characters**, destination and all, and drawn back as itself when the caret leaves — and only while the editor has the focus, so a document that opens with a link is not showing its brackets to somebody who has not touched it. That is not a flourish: a drawn `<a>` puts its words on the page and never its `(url)`, so before this there was nowhere on the page for a destination to be and nothing for a keystroke to land on — `[](url)` from the toolbar arrived with a placeholder nobody could type over. Written out, it is the source one character for one, and every rule this surface already has works on it unchanged. What is under the caret is marked rather than disguised, because text that has stopped being a link and started being the text that makes one is a difference worth seeing.

**A block written so far as its marker and nothing else is written out the same way**, and for the same reason said about a whole line. `#` on its own is an empty heading to CommonMark — the specification is right about that, and the parser agrees with it — but an empty heading draws no characters at all, so the `#` somebody typed disappeared as they typed it, and somebody who wanted a `#` in a sentence had a heading to undo. Written out it is the `#` again, and the space that would make it a heading is one keystroke away. `-`, `>`, `1.` and `- [ ]` are the same, with a bullet, a bar, a number or a box left where the text went. It is the outermost such block that is written out, so a list holding one empty item is the list rather than the item — a bullet drawn beside the `-` that is a drawing of it is not an improvement.

**Raw HTML being drawn rather than shown is written out the same way**, under `sanitize` and `raw` alike. It has to be: markup that reached the page through `dangerouslySetInnerHTML` is markup React does not know the inside of and could not put back, so there is nothing in the drawn form for a caret to be inside. Written out, there is. Under `escape` — the default — it was always text like any other text and edited like any other.

## Input rules

On the drawn document the shorthand you type becomes the formatting it is shorthand for, where you typed it. `# ` is a heading, `- ` and `* ` a bullet, `1. ` a number, `> ` a quotation, `- [ ] ` a task box.

**Most of that is not a feature.** The document is drawn again from the Markdown after every keystroke, so `# ` at the start of a paragraph _is_ a heading the moment the space lands — the parser had already said so and the drawing only caught up. There is nothing to configure and nothing to turn off, because there is nothing there.

The moment the space lands, and not before: `#` on its own is drawn as the character it is until there is something in the heading it would make. That is [the document surface](#the-document-surface) writing out a block with nothing in it rather than a rule of any kind, and it is why a `#` in a sentence can be typed at all.

Two are written down, and they are the two where the marker changes the meaning of text nobody is typing:

- **Three backticks open a fence, and a fence runs until one closes it.** Typed halfway down a document they would put everything under them inside a code block and leave it there until the closing fence was typed. So a fence is opened _closed_: the caret goes between the two and whatever was on the line goes inside, which is the same thing the code-block button does. Inside a list item or a quotation the two lines it adds carry that container's own prefix, or the fence would close outside the item it opened in.
- **A thematic break has no text in it.** `---` on its own line is a break the moment the third dash lands, and the caret is then in a block that draws no characters at all, with nowhere on the page to be. So a break is given a blank line under it to carry on typing on. `***`, `___` and `- - -` are the same. `---` under a line that is still going is left alone: there it is that paragraph's underline — a setext heading — and the parser is right about that.

Inside a code block none of it happens, because everything in there is the characters it is.

A rule that writes a line ending is its own step on the undo stack, so `Mod`+`Z` straight after one gives back the characters that set it off rather than the whole run of typing around it.

The source surface has no input rules, and nothing is missing there: the characters typed are the document, and `# ` at the start of a line is already a heading in the only sense that surface has.

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
| `Mod` + `F`             | Find and replace                       |
| `Mod` + `S`             | Save                                   |
| `Tab` / `Shift` + `Tab` | Indent, outdent                        |
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
| `'bold'`, `'italic'`, `'strikethrough'`, `'code'`, `'link'`, `'image'` | Inline formatting |
| `'quote'`, `'bulletList'`, `'orderedList'`, `'taskList'`, `'codeBlock'`, `'rule'` | Blocks |
| `'find'` | Opens the find bar — see [finding](#finding) |
| `'open'`, `'save'` | A Markdown file in, and out — see [opening and saving](#opening-and-saving) |
| `'colorScheme'` | Light, dark, or whatever the system says |
| `'separator'` | A hairline, for grouping |

::: fw react

**A bar too narrow for its buttons keeps what fits and puts the rest in a menu at the end of it.** Whole groups at a time, and from the end — the separators are the grouping, so an application that reorders `toolbar` reorders what goes first. The surface switch never leaves: it is the control a writer reaches for most, and one hidden behind a menu at every width should not have been on the list.

That is a decision the toolbar makes by measuring itself, not one to configure. What it replaced was a second row, and a second row is one the layout above the toolbar made no room for — the buttons went on and the bar did not grow, so the lower row left the bar.

:::

::: fw flutter

**A bar too narrow for its buttons scrolls sideways.** No menu and nothing hidden: the row is inside a `SingleChildScrollView`, so what does not fit is a drag away, and the arrows that move the focus along the row scroll it into view as they go.

The React package answers the same question with a menu at the end of the bar, and the difference is the platforms rather than a preference. A row that scrolls under a finger is what a toolbar does on a touch screen; a menu is what one does on a page with a pointer and no obvious way to drag a bar sideways.

:::

## Images

Three ways in, and they are three because an image can arrive already having a URL, or not having one yet.

**The toolbar's image button** writes `![](url)` with the destination selected, ready to be typed over — the link button with a `!` in front of it, and the same rules: select a URL first and it becomes the destination, select anything else and it becomes the description a reader who is not seeing the image is given. It needs nothing from the application and is always there.

**An image pasted or dropped as part of a web page** arrives as the URL it already had. That is not an image feature at all — it is markup, and [pasting](#pasting) reads markup. Nothing is uploaded, because there is nothing to upload: the picture is already on the web.

**A file** — a screenshot on the clipboard, an image dragged in from the desktop — needs somewhere for its bytes to go, and that is the one thing this library cannot decide. Whether an image belongs in an object store, behind an upload endpoint, or inline as a `data:` URI is a question with a bill attached, and a text editor should not answer it on somebody else's behalf. So it is a prop:

```tsx
<MawyEditor
  defaultValue={document}
  onUploadImage={async (file) => {
    const { url } = await save(file);

    return url;
  }}
/>
```

Answer with the URL to write, or with `{ url, alt, title }` to say what goes around it — the file's own name, without its extension, is the description otherwise. Throw, or answer with nothing, and the editor says the image could not be added and writes nothing at all.

**Without `onUploadImage`, a dropped file does nothing.** Not refused, not half-inserted: the drop is simply not one the editor is taking. That is the honest default rather than a gap — the alternative is quietly turning a two-megabyte screenshot into a `data:` URI inside somebody's document.

Where the image lands is where it was put: a drop goes to the point the pointer let go of it, and a paste goes to the caret. Several files dropped together are one upload after another and then **one** edit, so `Mod`+`Z` takes back the thing you did rather than the last file of it.

## Colour in the preview

`highlight` is passed straight through to the viewer inside the preview, so a `split` or `preview` surface colours its code the way [the viewer does](./viewer#colouring-a-code-block) — including the lazy form, which is the one to use:

```tsx
<MawyEditor
  defaultValue={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

The **drawn document is not coloured**, and will not be. The source surface has a highlighter of its own for the Markdown; the drawn one is a place where every caret has to find its way back into the source, and a second opinion about what the characters inside a code block are is not worth what it would cost there.

## Opening and saving

`open` reads a Markdown file into the editor. `save` writes the document back out — `Mod`+`S` as well, because the browser's own `Mod`+`S` saves the page and that is never what somebody writing in an editor meant by it.

```tsx
<MawyEditor
  defaultValue={document}
  onSave={(value, name) => api.put(`/documents/${name}`, value)}
/>
```

Without `onSave` the text is handed to the browser as a download. An anchor with a `download` on it rather than the File System Access API, which only Chromium has: a save that works in one browser and silently does nothing in another is worse than one that always does the same thing. With `onSave`, nothing is downloaded and the application is given the document and the name it would have been saved as.

The name is the file's own, when one was opened. Otherwise it is **the document's first heading** — that is what the document calls itself and what somebody looking through a folder of these would want to read — with the characters no filesystem will take dropped, and `document.md` when there is no heading to take it from.

`open` has no shortcut on purpose. The browser's own `Mod`+`O` is a reasonable thing to leave alone, and opening a file is a rare and deliberate act rather than one done mid-flow.

**A file dropped on the editor is an image, never a document.** The drop is already the way an image gets in, and that is the smaller half of it: replacing a document somebody has been writing because a file landed on it is how work is lost. The viewer opens what is dropped on it because a viewer has nothing to lose; an editor asks to be asked.

::: fw flutter

This section is the React package's. Opening a file and writing one back are the application's here: a file picker is a plugin rather than a widget, and which one an app has already chosen is not a decision a Markdown editor should make on its behalf. `MawyEditorToolbarItem` has no `open` or `save` for the same reason — `onChange` hands over the document, and where it goes is yours.

:::

## Finding

`Mod`+`F` opens the find bar over the source, and the toolbar's `find` button does the same thing. `Enter` goes to the next match, `Shift`+`Enter` to the one before, and `Escape` closes the bar and gives the focus back to the document.

::: fw react

It exists because the browser's own find cannot reach here: **no browser searches the text inside a `<textarea>`**, and the source surface is one. That is the whole justification. Everywhere else in this library a thing the platform already does is left to the platform, and this is the place the platform does not.

:::

::: fw flutter

It exists for the same reason said in Flutter's terms: **a platform's own find reaches a page of text and not the inside of a text field**, and the source surface is one. That is the whole justification. Everywhere else in this library a thing the platform already does is left to the platform, and this is the place the platform does not.

The arithmetic under it is the React package's, function for function — `findMatches`, `matchFrom`, `replaceMatch` and `replaceAll` — and `tool/parity.dart` diffs the two over `tool/searches.json` on every change. Whether `aa` in `aaaa` is two matches or three is a decision, and it is the same decision in both.

:::

Whatever was selected is already in the box when it opens, as long as it was on one line — that is nearly always what somebody is about to look for.

**Plain text, never a regular expression.** A Markdown document is full of `*`, `[`, `.` and `+`, and a find box that quietly compiled `(` into a syntax error is one a writer cannot trust with a document. The switch that is there instead is case sensitivity, which is the one people reach for.

Replace and replace all are on the second row. Replace all is one pass over the document as it was, so replacing `a` with `aa` replaces each `a` once rather than finding its own replacement for ever.

::: fw react

The bar is only offered where there is a source to search — `plain` and `split`. In `preview` and `wysiwyg` the document is drawn as elements, and the browser's own find works on it.

:::

::: fw flutter

The bar is only offered where there is a source to search — `plain` and `split`. In `preview` there is no field to search and the button is not drawn.

:::

## Indenting

`Tab` indents and `Shift`+`Tab` takes it back, on the source surface. With nothing selected it puts the indentation in where the caret is, the way typing two spaces would. With anything selected it moves the lines that selection touches and leaves them selected, so it can be pressed again — a `Tab` that replaced the paragraph somebody had selected is the behaviour every editor gave up.

**Two spaces**, and that is a Markdown fact rather than a taste. A nested list item has to clear its parent's marker, which under `- ` is two columns; four would be an indented code block the moment the list above it ends. Going back takes a tab or up to two spaces off the front of each line, and a line with nothing left to take is not an error — the rest of the block still moves.

`Tab` in a textarea is a keyboard trap, and that is not a style opinion: somebody who cannot use a pointer would have no way to leave the editor at all. So the trap is opened rather than avoided.

**Press `Escape`, then `Tab`, and the focus moves on.** One `Escape` arms it and anything else typed disarms it again. It is the rule CodeMirror, Monaco and GitHub's own editor all use, which is the point of matching them — anybody who has met one of those already knows it — and the surface says so to a screen reader, because a way out nobody is told about is a way out that does not exist for the person who needed it.

The drawn document does not capture `Tab` at all. There is no trap there to open: it is one focusable thing, and `Tab` leaves it.

## Undo

`Mod`+`Z` goes back, `Mod`+`Shift`+`Z` comes forward again, and `Ctrl`+`Y` is the same thing where Windows put it. The history is **one list for the whole editor** rather than one per surface.

It has to be. The source surface could have used the browser's own stack — a `<textarea>` keeps an excellent one — but the drawn document is a `contenteditable` that refuses every input, which is another way of saying it never gets an entry on the browser's stack at all. Two stacks would be worse than one either way: an edit made in `wysiwyg` and taken back in `plain` would step through half of what happened and then stop.

What is stored is the document before each change together with where the caret was, because that is the state undo has to arrive at.

A run of typing is **one step**, not one per keystroke — a `Mod`+`Z` that gives back one character at a time is one nobody presses twice. A change carries on from the one before it while it is the same kind of change, in the same place, within a moment of it. A syllable being composed counts as more of the same typing, because a Korean keyboard rewrites what it wrote on every jamo and none of those are separate thoughts. A line ending closes the run behind it: what is typed after `Enter` is the next thing the writer meant, and undo stops between the two.

::: fw flutter

**This section is the React package's, and this package has no history of its own.** The reason that one has one does not arise here: there are two surfaces over there and the drawn one gets no entry on the browser's stack, so a single list is the only way an edit made on one can be taken back on the other. Here there is one editable surface, it is an `EditableText`, and an `EditableText` keeps its own undo stack.

So undo is Flutter's rather than this package's, and it behaves the way it does in every other text field in your application — which is the answer somebody typing already expects. What that means for a change a toolbar button made rather than a keystroke is Flutter's answer to give, not this package's, and it is the same answer any `TextEditingController` written to from outside gets.

:::

## Pasting

**What is on the clipboard as HTML arrives as Markdown.** Copy a section of a web page into either surface and the headings are hashes, the links are links, the list is a list. Copy out of a word processor and the same is true.

A clipboard with nothing but text on it is left to the browser. Its own paste is exactly right, and letting it happen keeps the caret, the scroll and the run of undo where they were.

This is **not** the renderer run backwards, and the difference is the whole reason it is allowed to exist. Markup from somewhere else is read once, for whatever can be made of it; nothing round-trips through it. So it is allowed to be lossy and it is — a `<span style="color: red">` is its text, a `<video>` is nothing, an attribute nobody named is gone. Every URL goes through the same check a Markdown link gets, so a pasted `javascript:` link arrives as the words it was written with rather than as a link that does nothing.

Inside a code block a paste is the plain text and nothing else. Everything in there is the characters it is, and a pasted heading is a line beginning with a hash.

::: fw flutter

This section is the React package's. A clipboard here holds what the platform says it holds, and reaching past plain text to the HTML flavour of it — or to an image — is a plugin rather than a widget. So a paste is the platform's paste, and turning a page of HTML into Markdown is a thing an application can do to the string before it hands it over.

:::

## The status bar

```tsx
<MawyEditor defaultValue={document} status={['position', 'words', 'size']} />
```

`'position'`, `'selection'`, `'lines'`, `'words'`, `'characters'` and `'size'` — or `false` for none.

Two of those count more carefully than they look. **Characters** are code points, so an emoji is one rather than two. **Words** add every Han, hiragana and katakana character to the space-separated count, because those languages are written without spaces and a whitespace split calls a page of them one word — Korean is spaced, so an eojeol is a word and it is counted as one. **Size** is UTF-8 bytes, which is what a file on disk will be and is not the same number as the character count the moment anything is not ASCII.

## Accessibility

The editing surface is a labelled `textbox` and everything reachable from the toolbar is reachable from the keyboard first. The toolbar is a real `toolbar`: one tab stop, arrow keys inside. `Tab` indents the source rather than moving the focus, so `Escape` and then `Tab` is the way out — see [indenting](#indenting), which has why.
