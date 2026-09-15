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

**The document is as wide as its pane**, where the preview and the viewer keep to the measure, because the edges of what can be typed in are the edges of the editor. `--mawy-doc-edit-measure` gives it a measure of its own, and a press in the room either side of that measure still puts the caret on the line beside it. No ring is drawn around the document while it has the focus, which is the source surface's rule as well: the caret already says where the focus is.

What works: typing and deleting **anywhere there is text to type in**, meaning a paragraph, a heading, a list item, a quotation, a table cell or a code block. So do replacing a selection, `Shift`+`Enter` for a hard break, the shorthands that turn into formatting as they are typed, and every command on the toolbar. The toolbar commands needed no new code, because they are pure functions of the source and its selection and name no surface at all.

Edits land on the **drawn** character rather than the written one, which is the core of this surface. The caret after `bold` in `**bold**` has an asterisk in front of it in the file and a `d` in front of it on the page. `Backspace` there takes the `d`. An image and a hard break come out in one piece, because each is one character to a reader and invisible to a walk over the runs of text.

A caret in a place the page cannot draw is the same problem. Markdown does not keep the whitespace at the end of a line, so a space typed at the end of a paragraph is in the file and drawn nowhere at all, and the caret can only come back in front of it. Where it was **meant** to be is kept beside the place it settled for, so the next letter goes after the space rather than in front of it. Without that, `One two` could not be typed a word at a time. `Backspace` there takes the space, because there is no drawn character in front of the caret to take.

`Enter` is a different thing in every container it is pressed in, because a blank line means something different in each:

| Where | What `Enter` does |
| --- | --- |
| Between blocks | A blank line |
| In a list item | A new item, marker carried down. On an item still empty, the marker goes |
| In a quotation | Ends the paragraph. Continuing it takes a _blank quoted line_ |
| In a code block | A newline and nothing else |
| In a table | A new row under this one. On a row still empty, the row goes and the caret leaves the table |

`Backspace` at the start of a block joins it to the one before it: two list items run together, a paragraph joins the heading above it. Two joins are refused. Joining a table cell to the cell beside it would remove the pipe between them, and joining a code block to whatever is above it would remove the fence.

**The first words written into an empty document are its heading.** A document is nearly always begun with its title, so the first character typed or composed into a document with nothing in it goes after `# `, or after the marker of the first level `headingLevels` offers. A marker typed first is left alone, so a document can still open with `-` for a list or `>` for a quotation, and `Mod`+`0` turns the heading back into body text. `startWithHeading={false}` turns this off, for an editor that is a comment box rather than a page.

**An empty paragraph is a pair of blank lines.** Markdown has no empty paragraph, but it has blank lines, and those are what this surface draws. The blank line two blocks need between them is nothing on the page. Every second blank line past it is a paragraph with nothing in it, which is exactly what `Enter` at the end of a paragraph writes: a line to type on and a blank line under it. So pressing `Enter` three times draws three empty paragraphs, the source has the six line endings that make them, and they are still there when the caret goes somewhere else. At either end of the document the first blank line counts too, because there is nothing on that side to be separated from. A second blank line left between two sections by hand is not a paragraph, so a document written elsewhere is drawn the way it was.

`Backspace` in an empty paragraph takes that paragraph out and nothing else, and at the start of a block with one above it, it takes the one above. `Delete` does the same from the other side. Giving a list item up leaves the caret on a paragraph of this kind rather than on the line under the list, where the next letter would have been the item's lazy continuation. The preview and the viewer draw the same source the way every Markdown renderer does, with the blank lines as the separators they are.

**A code block can be left the way a list can.** `Enter` on its last line, when that line is empty, gives the line up and puts the caret on a paragraph under the block, and `Backspace` at the start of a block takes its fences off and leaves what was in it as a paragraph. A code block, a divider or drawn HTML that ends the document has no line after it for a caret to go to, so a press below one opens a paragraph there, and `ArrowDown` on the last line of a code block or the last row of a table that ends the document does the same; `ArrowUp` over one that starts the document opens a paragraph above it. An empty code block is drawn a line tall, so the caret in it can be seen.

**`ArrowRight` at the end of a code span or a run of formatting moves the caret past the closing marker.** The end of `` `code` `` is one place on the page and two in the document, in front of the backtick and after it, and a caret put down there was always the first. So a code span at the end of a paragraph could not be typed out of. The caret does not move on the page, the next letter goes after the marker, and the next `ArrowRight` goes on as usual. `ArrowLeft` at the start is the same, read the other way.

An input method is the one thing that **cannot** be refused, so it is handled the other way round. A composition is left completely alone: from `compositionstart` to `compositionend` the browser owns that run of text, nothing is prevented, and nothing is redrawn in between. When it finishes, the run is compared with what it said before and the difference goes into the Markdown at the place that run came from.

Refusing a composition prevents the composition itself. Korean is composed a jamo at a time, and an editor that blocks each one cannot write Korean at all. Pressing `Enter` and composing straight into the empty paragraph works too, because with no run of text to be in yet, the block itself is remembered.

**A link, an image or a piece of raw HTML the caret is inside is written out as its own characters**, destination and all, and drawn back as itself when the caret leaves. This happens only while the editor has the focus, so a document that opens with a link does not show its brackets to somebody who has not touched it. A drawn `<a>` puts its words on the page and never its `(url)`, so before this there was nowhere on the page to edit a destination, and the toolbar's `[](url)` arrived as a placeholder nobody could type over. Written out, it is the source one character for one, and every rule this surface already has works on it unchanged. What is under the caret is shown rather than hidden, because text that has stopped being a link and become the text that makes one is worth seeing.

**A block written so far as its marker and nothing else is written out the same way.** `#` on its own is an empty heading to CommonMark, and the parser reads it that way, but an empty heading draws no characters at all. The `#` somebody typed disappeared as they typed it, and somebody who wanted a `#` in a sentence had a heading to undo. Written out, the `#` stays on screen, and the space that would make it a heading is one keystroke away. `-`, `>`, `1.` and `- [ ]` are the same, with a bullet, a bar, a number or a box left where the text went. The outermost such block is the one written out, so a list holding one empty item writes out the list rather than the item. Drawing a bullet beside the `-` that stands for it is no improvement. It is drawn in the paragraph's own type, as the characters somebody is typing past, rather than in the grey box a link written out is given.

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
| `Mod` + `Shift` + `K`   | Image                                  |
| `Mod` + `Shift` + `.`   | Quotation                              |
| `Mod` + `Shift` + `8`   | Bulleted list                          |
| `Mod` + `Shift` + `7`   | Numbered list                          |
| `Mod` + `Shift` + `9`   | Task list                              |
| `Mod` + `Shift` + `E`   | Code block                             |
| `Mod` + `Shift` + `,`   | Divider                                |
| `Mod` + `1` / `2` / `3` | Heading 1, 2, 3                        |
| `Mod` + `0`             | Body text                              |
| `Mod` + `F`             | Find and replace                       |
| `Mod` + `S`             | Save                                   |
| `Mod` + `Shift` + `U`   | Upload an image                        |
| `Tab` / `Shift` + `Tab` | Indent, outdent                        |
| `Mod` + `Z`             | Undo                                   |
| `Mod` + `Shift` + `Z`   | Redo, and `Ctrl` + `Y` as well         |
| `Enter`                 | Carries a list marker to the next line |

`Mod` is Command or Control, whichever the machine has. Both are accepted rather than guessed at.

The lists and the quotation use the keys GitHub's comment box gives them, and the task list takes the digit after. The image and the code block are the link and the code span with `Shift` added. The divider is on `,` because the key a divider is written with is taken: `Mod`+`Shift`+`-` shrinks the page in Chromium and Firefox. The digits and the punctuation are read by where the key is rather than by what it types, since under `Shift` a `7` types `&` on one keyboard and `/` on another. In Firefox on Windows and Linux, `Ctrl`+`Shift`+`K` and `Ctrl`+`Shift`+`E` open developer tools; they still do everywhere on the page except inside the editor.

::: fw flutter

`Mod`+`S` and `Mod`+`Shift`+`U` are the lines of that table this package does not handle, because there is nothing here to save to and no image upload. [Opening and saving](#opening-and-saving) has the reason. Undo belongs to the platform rather than this package, as [undo](#undo) explains, and everything else is the same keyboard.

:::

**`headingLevels` says which headings the menu offers**, for an application whose pages write the title as their own `h1` and whose documents start at `##`. Given heading 2, 3 and 4, the menu offers those and body text, and `Mod`+`2`, `Mod`+`3` and `Mod`+`4` toggle them, while `Mod`+`1` is handed on to whatever else answers it. The levels are the document's own depths, the number of `#` written.

::: fw react

```tsx
<MawyEditor value={post.body} onChange={setBody} headingLevels={[2, 3, 4]} />
```

`headingBase` is the other half and moves nothing in the document: it is what the drawn document and the preview draw a `#` as, with the same meaning it has on [the viewer](./viewer#heading-levels), so an editor beside such a page draws what the page will.

:::

::: fw flutter

```dart
MawyEditor(value: post.body, onChange: setBody, headingLevels: const [2, 3, 4]);
```

A number outside one to six is left out.

:::

**There is no underline.** Markdown has no way to write one, and the only way a document can is `<u>`, which is raw HTML: drawn as its characters under the default `html="escape"`, and in the Flutter package, which has no HTML to draw at all. A button that wrote it would make documents that read one way in a viewer set to `sanitize` and another everywhere else the same file is read. A `<u>` already in a document is drawn as an underline under `sanitize` and `raw`.

Every command is a **toggle**: pressing `Mod`+`B` on bold text unbolds it, and the toolbar button shows which are in force. Markers replace each other rather than stacking, so turning a numbered list into a bulleted one gives a bulleted list and not `- 1. item`. The code block is taken off from anywhere inside it, since a caret in a code block asking for one is asking for it to stop being one. On a line with nothing on it yet, the lists, the quotation and the headings write their marker for the words still to come, and a caret stays among the words it was among rather than coming out selected around the line.

`Enter` at the end of a list item carries the marker down and counts an ordered list on, from the line an item runs on over as well as from its first. Pressing it again on the item that is still empty takes the marker away instead of making another. Without that, leaving a list would mean deleting the bullet the editor had just added.

The edits go in through the browser's own text-insertion command, which leaves the caret, the scroll position and any composition in progress exactly where they were. Writing the value directly guarantees none of that. Undo used to be the reason for this choice and is not any more; it has a section of its own below.

`toolbar` takes `true`, `false`, or the controls to draw and the order to draw them in:

```tsx
<MawyEditor defaultValue={document} toolbar={['mode', 'separator', 'bold', 'italic', 'link']} />
```

| Item |  |
| --- | --- |
| `'mode'` | The surface switch |
| `'undo'`, `'redo'` | A step back through the history and forward again, disabled while there is none |
| `'heading'` | A menu of heading 1, 2, 3 and body text, or of the levels in `headingLevels` |
| `'bold'`, `'italic'`, `'strikethrough'`, `'code'`, `'link'`, `'image'` | Inline formatting |
| `'quote'`, `'bulletList'`, `'orderedList'`, `'taskList'`, `'codeBlock'`, `'rule'` | Blocks |
| `'table'` | A menu that inserts a table and adds or removes its rows and columns. See [tables](#tables) |
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

## Tables

The toolbar's `table` button is a menu of everything that makes a table or changes its shape, and each entry has a shortcut. What they write is a GitHub table: the alignment in the delimiter row and whatever is written in the other cells stay exactly as they were, because each command puts in or takes out one cell per line rather than writing the table out again.

|                                       |                     |
| ------------------------------------- | ------------------- |
| `Mod` + `Alt` + `T`                   | Insert a table      |
| `Mod` + `Enter`                       | Add a row below     |
| `Mod` + `Shift` + `Enter`             | Add a row above     |
| `Mod` + `Alt` + `Enter`               | Add a column after  |
| `Mod` + `Alt` + `Shift` + `Enter`     | Add a column before |
| `Mod` + `Shift` + `Backspace`         | Delete this row     |
| `Mod` + `Alt` + `Shift` + `Backspace` | Delete this column  |

`Enter` adds a row and `Backspace` takes one away, with `Alt` meaning the column rather than the row and `Shift` the one above or the one the caret is in. A letter would be easier to remember, and nearly every letter is already taken: `Mod`+`Alt`+`I` opens a browser's developer tools, `Mod`+`Shift`+`T` reopens a tab, and on Windows `Ctrl`+`Alt` is `AltGr`, which types `€` and `@` on many European keyboards. `T` for a new table is one of the few letters `AltGr` leaves alone.

The shortcuts only act inside a table, and outside one the keys are handed on to whatever else answers them. A new table has two empty columns, a header and one row, with a blank line on either side. It has no column names, because those would be in the interface's language and stay in the document. Inside a quotation or a list item the table goes inside it, with that container's prefix on every line, and inside a code block there is nowhere for one to go, so _Insert a table_ is disabled there. A row cannot go above the header and the last column cannot be removed, so those entries are disabled where they would do nothing. With `gfm` turned off in `parse` the parser reads no tables, so none of these do anything.

::: fw react

On the drawn document, **`Enter` in a cell follows the rule it has in a list.** It adds a row under this one with the caret in the same column, and on a row that is still empty, the row goes and the caret moves to a line of its own after the table, still inside the quotation or list item the table is in. That is the way out of a table at the end of a document, which otherwise has nowhere after it for a caret to go. Typing into an empty cell writes the words between the spaces, so `|  |` becomes `| Name |` rather than `|  Name|`.

:::

::: fw flutter

There is no drawn document here, so `Enter` in a row of the source is a line ending, as it is in the React package's source. The commands behind the menu are the React package's under the same names, and the parity check diffs the two.

:::

## Images

**The toolbar's image button** writes `![](url)` with the destination selected, ready to be typed over. It is the link button with a `!` in front of it and follows the same rules: select a URL first and it becomes the destination, select anything else and it becomes the description for a reader who is not seeing the image. It needs nothing from the application and is always available.

::: fw react

There are two more ways in, because an image can arrive with a URL already or without one.

**Where `onUploadImage` is given, the button is a menu of two**: _Upload an image_, which opens the device's own picker, and _Link to an image_, which is the `![](url)` above. On a phone or a tablet the picker is the only way in, because nothing is dragged there and a picture in the photo library is not on the clipboard, so it asks for `image/*` and the platform offers the library and the camera. Several pictures can be chosen at once. `Mod`+`Shift`+`U` opens the same picker. The pictures go where the caret was before the menu opened, and follow every rule a drop does, which the rest of this section describes.

**An image pasted or dropped as part of a web page** arrives as the URL it already had. That is not an image feature but markup, which [pasting](#pasting) reads. Nothing is uploaded, because the picture is already on the web.

Markup wins only where it has something to say. A browser copying an image puts the file on the clipboard along with an `<img>` pointing at the address the image was drawn from, and when that is a `blob:`, `file:` or `cid:` address, nobody else can reach it. Markup with no words in it and no picture at a reachable address is set aside, and the file beside it is uploaded instead.

**A picture at a `data:` address is uploaded too**, when there is somewhere to upload it. A `data:` address is not somewhere on the web but the picture's own bytes, and whether those belong in the document is the question `onUploadImage` answers. The words pasted with it go in at once and the picture is written where it stood once the upload answers. Without `onUploadImage`, it is written as the `data:` address it arrived as, because that is what the page it came from said.

**A picture copied out of a word processor is read out of the RTF beside the markup**, when there is somewhere to upload it. Word writes each picture into the markup it puts on the clipboard, and it is reported to write some of them as an `<img>` pointing at a file in a folder of the machine that copied it, which no page can open. The same clipboard carries the document as RTF with every picture's bytes in it, so a picture whose address nobody can reach is taken from there and uploaded the way a `data:` one is. Which picture in the RTF belongs to which `<img>` is only known by counting them in order, so a clipboard where the two counts differ gives those pictures up rather than put one in the wrong place. The PNG file that comes with it is a picture of the whole selection, words and all, and is not uploaded, because the markup has words in it.

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

**Answer with `{ reason }` to say why.** The note under the document says the reason as it was given, so it should be in the interface's language. Answer `{ reason: null }` when the application has already told the reader in its own way, and the editor says nothing about that file, so the reader does not get the same message twice. What was thrown is never shown: it is as likely to be a network error written for a developer as anything a reader should see.

```tsx
<MawyEditor
  onUploadImage={async (file) => {
    if (file.size > LIMIT) {
      return { reason: t('upload.tooLarge') };
    }

    return (await save(file)).url;
  }}
/>
```

Several files at once get one note. The ones that went in are on the page and are not mentioned. The note gives the reasons for the ones that did not, each once and in the order the files came, and then how many of the batch failed with no reason: _1 of 3 images could not be added._ That stays on the line under the document until the next upload starts, however many others finish in the meantime.

**Without `onUploadImage`, a dropped file is refused.** It is not half-inserted, and not handed back to the browser either: the editor takes the drop, writes nothing, and says so on the line under the document. That is the intended default. The only alternative is turning a two-megabyte screenshot into a `data:` URI inside somebody's document.

The image lands where it was put: a drop goes to the point the pointer let go of it, and a paste goes to the caret, in place of whatever was selected. What is selected is replaced when the upload answers rather than when the file is pasted, so an upload that fails leaves those words where they were. Several files dropped together are uploaded one after another and then written as **one** edit, so a single `Mod`+`Z` takes back the whole drop.

**Writing goes on while an image uploads.** The place it was put is carried along by every change made in the meantime, so an image pasted at the end of a sentence is still written at the end of that sentence after somebody has gone back and added a word at its start, and it is written whichever surface is showing when the URL comes back. Nothing takes the focus when it arrives: a reader who went on to another field on the page stays there, and a caret the image went in front of is moved along by it.

**A read-only document is not changed by an upload that finishes while it is one.** `readOnly` is what an application sets while it saves, and an image written in the middle of a save would be on the screen and missing from what was saved. So the image waits, the note under the document still says it is being added, and it is written where it was put as soon as `readOnly` is lifted.

**`onUploadingChange` says how many images are still on their way in**, each time that changes, so an application can hold its save button until the count is zero. A document saved before then is saved without those images. An image that finished uploading while the editor was read-only still counts until it is written, and an editor taken off the page reports zero as it goes, because nothing it was waiting for will be written anywhere.

```tsx
const [uploading, setUploading] = useState(0);

<>
  <MawyEditor onUploadImage={upload} onUploadingChange={setUploading} />
  <button disabled={uploading > 0} onClick={save}>
    Save
  </button>
</>;
```

:::

::: fw flutter

**There is no upload here.** A picture on the clipboard and a file on the device are both out of a widget's reach without a plugin, and which plugin an application has chosen is not a Markdown editor's decision, which is the same reason `open` is a button the application gives a meaning to. An application with a picker picks the file, stores it wherever its pictures go, and writes the picture where the caret is with [`MawyEditorHandle`](../api/components/mawy-editor#from-outside-the-editor):

```dart
final MawyEditorHandle editor = MawyEditorHandle();

Future<void> addPicture() async {
  final Picture? picked = await pickPicture(); // the application's own picker
  if (picked == null) return;

  editor.insert('![${picked.name}](${await store(picked)})');
}
```

The picture goes where the caret is when `insert` is called, which after a slow upload is wherever the writer has got to by then, and nothing is written while the editor is read only.

:::

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

This section applies to the React package only. Here the application opens files and writes them back: a file picker is a plugin rather than a widget, and which one an app has already chosen is not a Markdown editor's decision. For the same reason `open` is a button the application gives a meaning with `onOpen`, and it is not drawn without one, and there is no `save`. `onChange` hands over the document, and the application decides where it goes.

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

**On a list item, `Tab` makes it an item of the one above it**, and `Shift`+`Tab` makes it that item's sibling again. Two spaces is the width of a bullet and not of a number: `1. ` is three columns, and an item indented two under it is still an item of the outer list. So the item goes in to where the words of the item above it start, and back out to where the item it is in starts, and it takes what it holds with it: the lines it runs on over and the items nested in it. A number is counted rather than kept. An item that becomes the first of a list inside another is `1.`, one that joins a list already there takes that list's next number, and one that comes back out takes the number after the item it was in. The first item of a list has no item above it to go into, so `Tab` there does nothing rather than writing two spaces into its words, and an item of the outermost list has nowhere further out to go.

Capturing `Tab` in a textarea creates a keyboard trap: somebody who cannot use a pointer would have no way to leave the editor. So there is a key that lets you out.

**Press `Escape`, then `Tab`, and the focus moves on.** One `Escape` arms it and anything else typed disarms it again. It is the rule CodeMirror, Monaco and GitHub's own editor all use, so anybody who has met one of those already knows it. The surface also announces it to a screen reader.

The drawn document captures `Tab` only in a list item, where it nests the item the way it does on the source. Everywhere else it is one focusable element, and `Tab` moves straight out of it.

## Undo

`Mod`+`Z` goes back, `Mod`+`Shift`+`Z` comes forward again, and `Ctrl`+`Y` is the Windows spelling of the same command. The history is **one list for the whole editor** rather than one per surface.

The toolbar's `undo` and `redo` buttons do the same, and are on the default toolbar right after the surface switch, which is the end of the bar that stays in view on a narrow screen. On a phone they are the only undo there is. Each is disabled while there is no step to take back or put back.

On its own, the source surface could have used the browser's own stack, which a `<textarea>` keeps well. But the drawn document is a `contenteditable` that refuses every input, so nothing is ever recorded on the browser's stack. With two stacks, an edit made in `wysiwyg` and taken back in `plain` would step through half of what happened and then stop.

What is stored is the document before each change together with where the caret was, because that is the state undo has to arrive at.

A run of typing is **one step**, not one per keystroke, because an undo that gives back one character at a time is not worth pressing. A change carries on from the one before it while it is the same kind of change, in the same place, within a moment of it. A syllable being composed counts as more of the same typing, because a Korean keyboard rewrites what it wrote on every jamo and none of those are separate edits. A line ending closes the run behind it: what is typed after `Enter` is a new thought, so undo stops between the two.

::: fw flutter

**This section applies to the React package only, and this package keeps no history of its own.** The reason that one needs a history does not arise here. There are two editable surfaces over there and the drawn one gets no entry on the browser's stack, so a single list is the only way an edit made on one can be taken back on the other. Here there is one editable surface, an `EditableText`, and it keeps its own undo stack.

So undo is Flutter's rather than this package's, and it behaves the way it does in every other text field in your application, which is what somebody typing expects. How it treats a change made by a toolbar button rather than a keystroke is also Flutter's to decide, and it matches any other `TextEditingController` written to from outside. Flutter gathers the changes made within half a second of each other into one step, so the `undo` button can take a moment after a change to have something to take back.

The toolbar's two buttons walk that same history. In `preview` there is no source, so both are disabled.

The keys are bound on the source itself as well as by a `WidgetsApp`. This package does not require one, and a text field outside one has a history and no key to walk it with.

:::

## Pasting

**What is on the clipboard as HTML arrives as Markdown.** Copy a section of a web page into either surface and the headings are hashes, the links are links, the list is a list. Copy out of a word processor and the same is true.

A clipboard with nothing but text on it is left to the browser. Its own paste is already correct, and letting it happen keeps the caret, the scroll and the run of undo where they were.

This is **not** the renderer run backwards. Markup from somewhere else is read once, for whatever can be made of it, and no document round-trips through it. So it is lossy: a `<span style="color: red">` becomes its text, a `<video>` becomes nothing, and an attribute that is not on the list is dropped. Every URL goes through the same check a Markdown link gets, so a pasted `javascript:` link arrives as the words it was written with.

Inside a code block a paste is plain text and nothing else. Everything in there is the characters it is, so a pasted heading is a line beginning with a hash.

::: fw flutter

This section applies to the React package only. A clipboard here holds what the platform says it holds, and reaching past plain text to the HTML flavour of it, or to an image, needs a plugin rather than a widget. So a paste is the platform's paste, and an application can turn a page of HTML into Markdown before handing the string over.

:::

## The frame

The editor takes the same `frame` and `toolbarPlacement` the viewer does, and they mean the same thing — see [the frame](./viewer#the-frame).

`box`, the default, is a surface with a background of its own and the toolbar barred across one end. That is what an editor usually wants: somebody typing can see where the thing they are typing into starts and the page stops. `floating` gives that up, for a writing surface that _is_ the page.

<MawyDemo name="editor/floating" flutter="editor/floating" :height="460" />

One thing does not move. The status line is the bottom edge of the editor either way, because a count of words is not a control and nothing is decided by it. A floating toolbar at the bottom hangs from the document rather than from the editor, so the two do not sit on top of each other.

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
