---
title: Editor
order: 2
---

# The editor

::: fw flutter

**This package has three surfaces**, and the React package's `wysiwyg` is the one it does not have. `wysiwyg` draws the document and edits it where it is drawn, which rests entirely on `contenteditable`: the browser tells the component what somebody tried to do to the tree, and the component refuses it and changes the Markdown instead. Flutter has no equivalent, because an `EditableText` owns its string. Drawing a document that is also a text field would need a second model of the document, and two models read anything unusual differently.

So the surfaces are `plain`, `split` and `preview`, and the drawn surface stays a viewer. Nearly everything else on this page applies here as well. The commands, the colouring of the source, the counts along the bottom and finding text are the same functions under the same names, and the parity check diffs all four against the React package's on every change. Opening and saving are the exception, and that section says why.

```dart
MawyEditor(
  defaultValue: '# Hello',
  onChange: save,
);
```

:::

Mawy's editor is one component with several surfaces. `plain` edits the Markdown source as text, `preview` shows the rendered document, and `split` shows both at once. All three show the same value, which is where the design starts.

<MawyDemo name="editor/basic" flutter="editor/basic" :height="520" />

```tsx
import { MawyEditor } from 'mawy-react';

export function Page() {
  return <MawyEditor defaultValue="# Hello" onChange={save} />;
}
```

## Several surfaces, one value

The usual arrangement is a WYSIWYG editor with a "source mode" bolted on, where switching serialises out of one model and parses into another. Every round trip through that pair loses whatever the other side could not express: a footnote, an HTML block, the exact spelling of a list marker. Nothing reports the loss.

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

In `split`, the preview scrolls with the source **to the block** rather than to the same fraction of the way down the file. Whichever line is at the top of the source decides which block is at the top of the preview, and the positions in between run straight from one block to the next. A fraction cannot do that. A code block takes the same number of lines in both panes, but the prose around it does not, so the two drift apart as soon as they are mixed.

**The bar between the two panes can be dragged.** An even split is not always the right one: a wide window wants more preview while you read over a draft and more source while you write one. Drag it, or focus it and use the arrows. `Shift` takes a bigger step, `Home` and `End` go to the ends, and `Enter` or a double-click restores the even split. It stops well short of either edge, because a pane pushed to nothing cannot be dragged back.

The bar's position lasts as long as the reader is on the page, and there is no prop for it. A pane's edge is the same kind of value as a scroll position. The value worth storing is the document, and `value` and `onChange` handle that.

Below the width at which the two panes stack instead of sitting side by side, the bar is not drawn.

**The preview is read-only, and nothing is edited from it.** A click there does not move the caret in the source, and that is the difference between this pane and `wysiwyg`, which is the one surface that edits the drawn document. If a click in the preview moved the caret, it would be unclear which pane you are writing in. Links, checkboxes and a code block's copy button still work, and everything else can be selected and copied like any other page.

## The source surface

::: fw react

A real `<textarea>`, with a coloured copy of the same text laid exactly underneath it.

That arrangement is deliberate. The textarea keeps everything that is hard to reimplement and obvious when it is missing: the **IME** (Korean is composed a jamo at a time, and an editor that intercepts the composition loses characters), the mobile keyboard, autocorrect, spellcheck, and every text-selection gesture the platform has. What a textarea cannot do is colour anything, so its text is made transparent, its caret and selection are left visible, and a layer behind it draws the same characters in colour.

Everything that decides where a character lands is declared once in the stylesheet, for both layers: font, size, line height, letter spacing, tab size, wrapping, and the padding that sets the left edge. That declaration keeps the two layers in step, and it is why the editor reads its monospace face from `--mawy-font-mono` instead of choosing one.

A document past about six hundred lines is not drawn a row per line. The copy underneath is cut into chunks, and only the chunks near the view are rows with the syntax coloured in. The rest hold the same characters as one run of text, at the same height and a fraction of the elements. Nothing is left out, so the browser's own find still reaches the whole document, printing still puts all of it on the paper, and the copy is still exactly as tall as the field. A scroll fast enough to outrun the colouring shows plain text in the right place for a frame, never a gap.

:::

::: fw flutter

One `EditableText`, coloured in place.

This is the one place this package has the easier job. A browser gives no way to colour what is inside a text field, so the React package draws two layers and keeps them in step. A `TextEditingController` takes the spans to draw directly, and `MawySourceController` supplies them. One layer, no grid to keep aligned, and the caret and the selection behave as the platform's own because the field is the platform's own.

What that field does not come with is pointer handling. A bare `EditableText` puts the caret where it is tapped and stops there: dragging across it selects nothing, a double tap takes no word, and a long press raises no handles. All of that is `TextSelectionGestureDetectorBuilder`, which `TextField` builds around its own field and this widget builds around its own. It lives in `package:flutter/widgets.dart` rather than in Material, so using it does not pull Material in.

Two things come from the platform rather than this package, and both live in Cupertino rather than Flutter: the magnifier that opens under a hard press on iOS, and the selection toolbar. Rather than start a gesture this package cannot finish, the force press is off.

`lineNumbers` turns the gutter off here too. It is on by default, and the numbers are painted from the field's own laid-out lines rather than from a second layout of the same text. A line that wrapped is two rows on the screen and one number down the side, and with only one layout the two cannot drift.

A document past about six hundred lines is coloured where it can be seen and handed over as plain characters everywhere else. The field lays the whole document out either way. A single layer cannot avoid that, and it is also what keeps the caret, the selection and every measurement exactly what they were. What is saved is reading every line on every keystroke. The window is worked out after a frame rather than during one, so a scroll fast enough to outrun it shows plain text in the right place until the next frame.

:::

The syntax colouring uses the token names of Mawy's parser, but not the parser itself. A line being typed is half-written most of the time, and a highlighter that waited for `**bold` to close before reacting would flicker on every keystroke. So it reads a line at a time, approximately, and leaves an unfinished marker alone.

::: fw react

`lineNumbers` turns the gutter off. It is on by default, and the numbers stay lined up with soft-wrapped text because both layers share one grid.

:::

## The document surface

`wysiwyg` draws the document and lets you edit it where it is drawn. Its behaviour is easy to assume, so the rest of this section spells it out.

<MawyDemo name="editor/document" />

There is no second model behind it. What is on screen is a drawing of the Markdown, and the Markdown string is the source of truth. Every keystroke is refused, turned into an edit to that string, and the document is drawn again from whatever the string became. Nothing is ever read back out of the tree the browser wanted to change. There is no DOM-to-Markdown serialiser in this package and there is not going to be one, because two implementations read anything unusual differently.

**It is the first surface the switch offers.** A link's destination and drawn raw HTML are both written out as their own characters when the caret is in them, so there is nowhere on this surface a caret cannot go. Until those two worked it was not on the default list. To leave it out, drop it from `modes`:

```tsx
<MawyEditor defaultValue={document} modes={['plain', 'split', 'preview']} />
```

What works: typing and deleting **anywhere there is text to type in**, meaning a paragraph, a heading, a list item, a quotation, a table cell or a code block. So do replacing a selection, `Shift`+`Enter` for a hard break, the shorthands that turn into formatting as they are typed, and every command on the toolbar. The toolbar commands needed no new code, because they are pure functions of the source and its selection and name no surface at all.

Edits land on the **drawn** character rather than the written one, which is the core of this surface. The caret after `bold` in `**bold**` has an asterisk in front of it in the file and a `d` in front of it on the page. `Backspace` there takes the `d`. An image and a hard break come out in one piece, because each is one character to a reader and invisible to a walk over the runs of text.

A caret in a place the page cannot draw is the same problem. Markdown does not keep the whitespace at the end of a line, so a space typed at the end of a paragraph is in the file and drawn nowhere at all, and the caret can only come back in front of it. Where it was **meant** to be is kept beside the place it settled for, so the next letter goes after the space rather than in front of it. Without that, `One two` could not be typed a word at a time. `Backspace` there takes the space, because there is no drawn character in front of the caret to take.

`Enter` is a different thing in every container it is pressed in, because a blank line means something different in each:

| Where           | What `Enter` does                                                           |
| --------------- | --------------------------------------------------------------------------- |
| Between blocks  | A blank line                                                                |
| In a list item  | A new item, marker carried down. On an item still empty, the marker goes    |
| In a quotation  | Ends the paragraph. Continuing it takes a _blank quoted line_               |
| In a code block | A newline and nothing else                                                  |
| In a table      | Nothing: a row is a line, and there is nowhere in the file for a second one |

`Backspace` at the start of a block joins it to the one before it: two list items run together, a paragraph joins the heading above it. Two joins are refused. Joining a table cell to the cell beside it would remove the pipe between them, and joining a code block to whatever is above it would remove the fence.

`Enter` at the end of a paragraph is the one place the file cannot express what the screen needs. Markdown has no empty paragraph: a blank line separates two blocks and a second blank line separates the same two. So the surface draws one anyway, in that one place, for as long as the caret is in it. The moment anything is typed, the paragraph is a real one.

An input method is the one thing that **cannot** be refused, so it is handled the other way round. A composition is left completely alone: from `compositionstart` to `compositionend` the browser owns that run of text, nothing is prevented, and nothing is redrawn in between. When it finishes, the run is compared with what it said before and the difference goes into the Markdown at the place that run came from.

Refusing a composition prevents the composition itself. Korean is composed a jamo at a time, and an editor that blocks each one cannot write Korean at all. Pressing `Enter` and composing straight into the empty paragraph works too, because with no run of text to be in yet, the block itself is remembered.

**A link, an image or a piece of raw HTML the caret is inside is written out as its own characters**, destination and all, and drawn back as itself when the caret leaves. This happens only while the editor has the focus, so a document that opens with a link does not show its brackets to somebody who has not touched it. A drawn `<a>` puts its words on the page and never its `(url)`, so before this there was nowhere on the page to edit a destination, and the toolbar's `[](url)` arrived as a placeholder nobody could type over. Written out, it is the source one character for one, and every rule this surface already has works on it unchanged. What is under the caret is shown rather than hidden, because text that has stopped being a link and become the text that makes one is worth seeing.

**A block written so far as its marker and nothing else is written out the same way.** `#` on its own is an empty heading to CommonMark, and the parser reads it that way, but an empty heading draws no characters at all. The `#` somebody typed disappeared as they typed it, and somebody who wanted a `#` in a sentence had a heading to undo. Written out, the `#` stays on screen, and the space that would make it a heading is one keystroke away. `-`, `>`, `1.` and `- [ ]` are the same, with a bullet, a bar, a number or a box left where the text went. The outermost such block is the one written out, so a list holding one empty item writes out the list rather than the item. Drawing a bullet beside the `-` that stands for it is no improvement.

**Raw HTML drawn as elements rather than shown as characters is written out the same way**, under `sanitize` and `raw` alike. Markup that reached the page through `dangerouslySetInnerHTML` is markup React does not know the inside of and could not put back, so the drawn form has nowhere for a caret to be. Written out, it does. Under the default `escape`, it was always plain text and is edited like any other text.

## Input rules

On the drawn document the shorthand you type becomes the formatting it is shorthand for, where you typed it. `# ` is a heading, `- ` and `* ` a bullet, `1. ` a number, `> ` a quotation, `- [ ] ` a task box.

**Most of that is not code we wrote.** The document is drawn again from the Markdown after every keystroke, so `# ` at the start of a paragraph _is_ a heading the moment the space lands. The parser reads it that way and the drawing follows. There is nothing to configure and nothing to turn off.

The moment the space lands, and not before. `#` on its own is drawn as the character it is until there is something in the heading it would make. That is [the document surface](#the-document-surface) writing out a block with nothing in it, not an input rule, and it is why a `#` in a sentence can be typed at all.

Two rules are written down, and they are the two where a marker changes the meaning of text nobody is typing:

- **Three backticks open a fence, and a fence runs until one closes it.** Typed halfway down a document they would put everything under them inside a code block and leave it there until the closing fence was typed. So a fence is opened _closed_: the caret goes between the two and whatever was on the line goes inside, which is the same thing the code-block button does. Inside a list item or a quotation the two lines it adds carry that container's own prefix, or the fence would close outside the item it opened in.
- **A thematic break has no text in it.** `---` on its own line is a break the moment the third dash lands, and the caret is then in a block that draws no characters at all, with nowhere on the page to be. So a break is given a blank line under it to carry on typing on. `***`, `___` and `- - -` are the same. `---` under a line that is still going is left alone: there it is that paragraph's underline, a setext heading, and the parser reads it correctly.

Inside a code block none of it happens, because everything in there is the characters it is.

A rule that writes a line ending is its own step on the undo stack, so `Mod`+`Z` straight after one gives back the characters that set it off rather than the whole run of typing around it.

The source surface has no input rules. The characters typed are the document, and `# ` at the start of a line is already a heading.

## Formatting

Every button on the toolbar runs a command that also has a keyboard shortcut. No command is reachable only from the toolbar, because that would make the editor unusable without a pointer.

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

`Mod` is Command or Control, whichever the machine has. Both are accepted rather than guessed at.

::: fw flutter

`Mod`+`S` is the one line of that table this package does not handle, because there is nothing here to save to. [Opening and saving](#opening-and-saving) has the reason. Undo belongs to the platform rather than this package, as [undo](#undo) explains, and everything else is the same keyboard.

:::

Every command is a **toggle**: pressing `Mod`+`B` on bold text unbolds it, and the toolbar button shows which are in force. Markers replace each other rather than stacking, so turning a numbered list into a bulleted one gives a bulleted list and not `- 1. item`.

`Enter` at the end of a list item carries the marker down and counts an ordered list on. Pressing it again on the item that is still empty takes the marker away instead of making another. Without that, leaving a list would mean deleting the bullet the editor had just added.

The edits go in through the browser's own text-insertion command, which leaves the caret, the scroll position and any composition in progress exactly where they were. Writing the value directly guarantees none of that. Undo used to be the reason for this choice and is not any more; it has a section of its own below.

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
| `'find'` | Opens the find bar. See [finding](#finding) |
| `'open'`, `'save'` | Reads a Markdown file in and writes one out. See [opening and saving](#opening-and-saving) |
| `'colorScheme'` | Light, dark, or whatever the system says |
| `'separator'` | A hairline, for grouping |

::: fw react

**A bar too narrow for its buttons keeps what fits and puts the rest in a menu at the end of it.** It moves whole groups at a time, from the end, and the separators are what mark the groups. So reordering `toolbar` also reorders what moves first. The surface switch never moves into the menu, because it is the control a writer reaches for most.

The toolbar decides this by measuring itself; it is not configurable. It replaced a second row, which the layout above the toolbar had no room for: the buttons kept coming, the bar did not grow, and the lower row spilled outside it.

:::

::: fw flutter

**A bar too narrow for its buttons scrolls sideways.** Nothing is hidden in a menu. The row is inside a `SingleChildScrollView`, so what does not fit is a drag away, and the arrows that move the focus along the row scroll it into view as they go.

The React package solves the same problem with a menu at the end of the bar, and the difference comes from the platform. A row that scrolls under a finger suits a touch screen; a menu suits a page with a pointer and no obvious way to drag a bar sideways.

:::

## Images

There are three ways in, because an image can arrive with a URL already or without one.

**The toolbar's image button** writes `![](url)` with the destination selected, ready to be typed over. It is the link button with a `!` in front of it and follows the same rules: select a URL first and it becomes the destination, select anything else and it becomes the description for a reader who is not seeing the image. It needs nothing from the application and is always available.

**An image pasted or dropped as part of a web page** arrives as the URL it already had. That is not an image feature but markup, which [pasting](#pasting) reads. Nothing is uploaded, because the picture is already on the web.

**A file** is different. A screenshot on the clipboard or an image dragged in from the desktop needs somewhere for its bytes to go, and that is the one thing this library cannot decide. Whether an image belongs in an object store, behind an upload endpoint, or inline as a `data:` URI carries cost and policy, so the application decides. It is a prop:

```tsx
<MawyEditor
  defaultValue={document}
  onUploadImage={async (file) => {
    const { url } = await save(file);

    return url;
  }}
/>
```

Answer with the URL to write, or with `{ url, alt, title }` to say what goes around it. Otherwise the file's own name, without its extension, becomes the description. Throw, or answer with nothing, and the editor says the image could not be added and writes nothing at all.

**Without `onUploadImage`, a dropped file is refused.** It is not half-inserted, and not handed back to the browser either: the editor takes the drop, writes nothing, and says so on the line under the document. That is the intended default. The only alternative is turning a two-megabyte screenshot into a `data:` URI inside somebody's document.

The image lands where it was put: a drop goes to the point the pointer let go of it, and a paste goes to the caret. Several files dropped together are uploaded one after another and then written as **one** edit, so a single `Mod`+`Z` takes back the whole drop.

## Colour in the preview

`highlight` is passed straight through to the viewer inside the preview, so a `split` or `preview` surface colours its code the way [the viewer does](./viewer#colouring-a-code-block). The lazy form works here too, and is the one to use:

```tsx
<MawyEditor
  defaultValue={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

The **drawn document is not coloured**, and will not be. The source surface has a highlighter of its own for the Markdown. On the drawn surface every caret has to map back into the source, and a second reading of the characters inside a code block would break that mapping.

## Opening and saving

`open` reads a Markdown file into the editor, and `save` writes the document back out. `Mod`+`S` saves as well, because the browser's own `Mod`+`S` saves the page and that is not what somebody writing in an editor expects.

```tsx
<MawyEditor
  defaultValue={document}
  onSave={(value, name) => api.put(`/documents/${name}`, value)}
/>
```

Without `onSave` the text is handed to the browser as a download. It uses an anchor with a `download` attribute rather than the File System Access API, which only Chromium has, because a save that works in one browser and does nothing in another is worse than one that behaves the same everywhere. With `onSave`, nothing is downloaded and the application is given the document and the name it would have been saved as.

The name is the file's own, when one was opened. Otherwise it is **the document's first heading**, which is what somebody looking through a folder of these would want to read. Characters no filesystem will take are dropped, and the name is `document.md` when there is no heading to take it from.

`open` has no shortcut on purpose. The browser's own `Mod`+`O` is worth leaving alone, and opening a file is not something done in the middle of writing.

**A file dropped on the editor is treated as an image, never as a document.** The drop is already the way an image gets in, and there is a larger reason as well: replacing a document somebody has been writing because a file landed on it loses their work. The viewer opens what is dropped on it because a viewer has nothing to lose. The editor does not.

The editor still handles the drop. **A file it will not take is refused rather than left to the browser**, which would open it as a page and take the document, the undo history and the caret with the tab. The line under the document says what happened and which control does what was being asked for.

**`fileDrop` turns that rule off**, for an editor that starts empty and is a place to bring a file _to_ rather than one a document already lives in. With it on, a dropped `.md` opens as the document, and the empty preview shows the viewer's empty state with its file picker in the pane where the document will appear. A dropped image is still an image wherever `onUploadImage` is given, and only the files that were being refused are read as documents.

::: fw flutter

This section applies to the React package only. Here the application opens files and writes them back: a file picker is a plugin rather than a widget, and which one an app has already chosen is not a Markdown editor's decision. `MawyEditorToolbarItem` has no `open` or `save` for the same reason. `onChange` hands over the document, and the application decides where it goes.

:::

## Finding

`Mod`+`F` opens the find bar over the source, and the toolbar's `find` button does the same thing. `Enter` goes to the next match, `Shift`+`Enter` to the one before, and `Escape` closes the bar and gives the focus back to the document.

::: fw react

It exists because the browser's own find cannot reach here. **No browser searches the text inside a `<textarea>`**, and the source surface is one. Everywhere else in this library a thing the platform already does is left to the platform, and this is the one exception.

:::

::: fw flutter

It exists for the same reason as in the React package. **A platform's own find reaches a page of text and not the inside of a text field**, and the source surface is a text field. Everywhere else in this library a thing the platform already does is left to the platform, and this is the one exception.

The arithmetic under it matches the React package function for function: `findMatches`, `matchFrom`, `replaceMatch` and `replaceAll`. `tool/parity.dart` diffs the two over `tool/searches.json` on every change. Whether `aa` in `aaaa` is two matches or three is a choice, and both packages make it the same way.

:::

Whatever was selected is already in the box when it opens, as long as it was on one line. That is nearly always what somebody is about to look for.

**Plain text, never a regular expression.** A Markdown document is full of `*`, `[`, `.` and `+`, and reading those as a pattern turns a single `(` into a syntax error. There is a case-sensitivity switch instead, which is the one people reach for.

Replace and replace all are on the second row. Replace all is one pass over the document as it was, so replacing `a` with `aa` replaces each `a` once and never finds its own replacement.

::: fw react

The bar is only offered where there is a source to search, which is `plain` and `split`. In `preview` and `wysiwyg` the document is drawn as elements, and the browser's own find works on it.

:::

::: fw flutter

The bar is only offered where there is a source to search, which is `plain` and `split`. In `preview` there is no field to search, so the button is not drawn.

:::

## Indenting

On the source surface, `Tab` indents and `Shift`+`Tab` takes it back. With nothing selected it puts two spaces in where the caret is. With anything selected it moves the lines that selection touches and leaves them selected, so it can be pressed again. No editor still replaces a selected paragraph with a tab character.

The width is **two spaces**, which Markdown requires. A nested list item has to clear its parent's marker, and under `- ` that is two columns. Four would become an indented code block the moment the list above it ends. Going back takes a tab or up to two spaces off the front of each line, and a line with nothing left to take is not an error. The rest of the block still moves.

Capturing `Tab` in a textarea creates a keyboard trap: somebody who cannot use a pointer would have no way to leave the editor. So there is a key that lets you out.

**Press `Escape`, then `Tab`, and the focus moves on.** One `Escape` arms it and anything else typed disarms it again. It is the rule CodeMirror, Monaco and GitHub's own editor all use, so anybody who has met one of those already knows it. The surface also announces it to a screen reader.

The drawn document does not capture `Tab` at all. It is one focusable element, so `Tab` moves straight out of it.

## Undo

`Mod`+`Z` goes back, `Mod`+`Shift`+`Z` comes forward again, and `Ctrl`+`Y` is the Windows spelling of the same command. The history is **one list for the whole editor** rather than one per surface.

On its own, the source surface could have used the browser's own stack, which a `<textarea>` keeps well. But the drawn document is a `contenteditable` that refuses every input, so nothing is ever recorded on the browser's stack. With two stacks, an edit made in `wysiwyg` and taken back in `plain` would step through half of what happened and then stop.

What is stored is the document before each change together with where the caret was, because that is the state undo has to arrive at.

A run of typing is **one step**, not one per keystroke, because an undo that gives back one character at a time is not worth pressing. A change carries on from the one before it while it is the same kind of change, in the same place, within a moment of it. A syllable being composed counts as more of the same typing, because a Korean keyboard rewrites what it wrote on every jamo and none of those are separate edits. A line ending closes the run behind it: what is typed after `Enter` is a new thought, so undo stops between the two.

::: fw flutter

**This section applies to the React package only, and this package keeps no history of its own.** The reason that one needs a history does not arise here. There are two editable surfaces over there and the drawn one gets no entry on the browser's stack, so a single list is the only way an edit made on one can be taken back on the other. Here there is one editable surface, an `EditableText`, and it keeps its own undo stack.

So undo is Flutter's rather than this package's, and it behaves the way it does in every other text field in your application, which is what somebody typing expects. How it treats a change made by a toolbar button rather than a keystroke is also Flutter's to decide, and it matches any other `TextEditingController` written to from outside.

:::

## Pasting

**What is on the clipboard as HTML arrives as Markdown.** Copy a section of a web page into either surface and the headings are hashes, the links are links, the list is a list. Copy out of a word processor and the same is true.

A clipboard with nothing but text on it is left to the browser. Its own paste is already correct, and letting it happen keeps the caret, the scroll and the run of undo where they were.

This is **not** the renderer run backwards. Markup from somewhere else is read once, for whatever can be made of it, and no document round-trips through it. So it is lossy: a `<span style="color: red">` becomes its text, a `<video>` becomes nothing, and an attribute that is not on the list is dropped. Every URL goes through the same check a Markdown link gets, so a pasted `javascript:` link arrives as the words it was written with.

Inside a code block a paste is plain text and nothing else. Everything in there is the characters it is, so a pasted heading is a line beginning with a hash.

::: fw flutter

This section applies to the React package only. A clipboard here holds what the platform says it holds, and reaching past plain text to the HTML flavour of it, or to an image, needs a plugin rather than a widget. So a paste is the platform's paste, and an application can turn a page of HTML into Markdown before handing the string over.

:::

## The status bar

```tsx
<MawyEditor defaultValue={document} status={['position', 'words', 'size']} />
```

Pick from `'position'`, `'selection'`, `'lines'`, `'words'`, `'characters'` and `'size'`, or pass `false` for none.

Two of those are worth explaining. **Characters** are code points, so an emoji counts as one. **Words** add every Han, hiragana and katakana character to the space-separated count, because those languages are written without spaces and a whitespace split would call a page of them one word. Korean is spaced, so an eojeol counts as one word. **Size** is UTF-8 bytes, which is the size of the file on disk and differs from the character count as soon as anything is not ASCII.

## The language of the interface

The toolbar's labels and tooltips, the surface switch, the words in the status bar, the find bar, the text an empty editor shows and everything said to a screen reader are written by the library. `locale` sets which language they are in.

::: fw react

```tsx
<MawyEditor defaultValue={document} locale="ko" />
```

:::

::: fw flutter

```dart
MawyEditor(defaultValue: document, locale: MawyLocale.ko);
```

:::

**English and Korean**, and `en` is the default. It is the same prop the viewer takes and means the same thing here. [The language of the interface](./viewer#the-language-of-the-interface) has the rest, including what adding a language involves.

The editor passes it to the viewer inside the preview, so the source surface and the drawn one are never in two languages. It says nothing about the document itself: an English-interface editor with a Korean document in it is a common case, so the two settings are kept separate.

## Accessibility

The editing surface is a labelled `textbox`, and everything the toolbar can do is reachable from the keyboard. The toolbar has the ARIA `toolbar` role: one tab stop, arrow keys inside. `Tab` indents the source rather than moving the focus, so `Escape` and then `Tab` is the way out. See [indenting](#indenting) for why.
