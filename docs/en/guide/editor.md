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

**The preview is read-only, and nothing is edited from it.** A click there does not move the caret in the source, and that is the difference between this pane and `wysiwyg`, which is the one surface that edits the drawn document. If a click in the preview moved the caret, it would be unclear which pane you are writing in. Links, checkboxes and a code block's copy button still work, and everything else can be selected and copied like any other page. It is as wide as its pane, where the viewer keeps to a measure, because it is the document being written rather than a page being read.

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

**It is the first surface the switch offers.** A link's destination and a picture's are edited from a bar beside them, and drawn raw HTML is written out as its own characters when the caret is in it, so there is nothing on this surface that cannot be changed. Until those two worked it was not on the default list. To leave it out, drop it from `modes`:

```tsx
<MawyEditor defaultValue={document} modes={['plain', 'split', 'preview']} />
```

**A code block and an alert have a bar of their own.** With the caret in a fenced code block, a small bar floats over the block's top edge at its far end: a menu that names the block's language, `Plain text` among them for none, and, in red, deleting the block. Picking a language writes it on the opening fence and puts the focus back on the document where the caret was. With the caret in an alert, the bar has the five kinds, the one the alert is drawn pressed, and deleting the alert; a press changes `[!NOTE]` into the kind pressed. A table the caret is in has its own bar instead, nearer the row being written in. The source shows all of this as characters, and has no such bars. The name drawn over an alert, `Note` or `Warning`, is this library's word for the kind rather than anything written in the document, so the caret cannot be put in it and nothing typed lands in it; the bar is where the kind is changed.

**The label a directive is written with is typed where it is drawn.** `Some title` in `:::callout[Some title]{kind=note}` reaches the page through the component the application registered, and it is edited in place like any other line of words. It is one line, so `Enter` there does nothing, a paste into it is joined onto that line, and a bracket typed or pasted into it is written with a backslash, since a bare `[` or `]` would end the label and the line would stop being the directive. `Backspace` at the start of the line under it leaves the directive's first line alone. A label written as `[]` is drawn as an empty place to type into; a directive written with no brackets has no label to type into on this surface.

**A task's checkbox ticks and unticks it.** On the drawn document a press on the box writes `[x]` or `[ ]` into the source, in a task list and on a line of a table cell written as a task, and leaves the caret where it was. The preview and the viewer are a document being read, and their boxes cannot be pressed; neither can the drawn document's with `readOnly`.

**The document is as wide as its pane**, and so is the preview, where the viewer keeps to the measure, because the edges of what can be typed in are the edges of the editor and the preview is that document. `--mawy-doc-edit-measure` gives both a measure of their own, and a press in the room either side of that measure still puts the caret on the line beside it. No ring is drawn around the document while it has the focus, which is the source surface's rule as well: the caret already says where the focus is.

What works: typing and deleting **anywhere there is text to type in**, meaning a paragraph, a heading, a list item, a quotation, a table cell or a code block. So do replacing a selection, `Shift`+`Enter` for a hard break, the shorthands that turn into formatting as they are typed, and every command on the toolbar. The toolbar commands needed no new code, because they are pure functions of the source and its selection and name no surface at all.

Edits land on the **drawn** character rather than the written one, which is the core of this surface. The caret after `bold` in `**bold**` has an asterisk in front of it in the file and a `d` in front of it on the page. `Backspace` there takes the `d`. An image and a hard break come out in one piece, because each is one character to a reader and invisible to a walk over the runs of text. Deleting a selection takes the markers of any formatting whose words it takes all of, so a bold word deleted whole leaves no `****` behind, and a selection of the whole document, however far the browser stretched it, deletes the whole document, the `#` in front of the first word included.

A **wrap runs over the whole of any link or code span the selection only half covers.** A link is drawn as its words and written as `[words](address)`, so a selection that runs from those words into the words after it starts, in the file, between the brackets: bolding it wrote `one [**link](https://example.org) two**`, which is neither a link nor bold. Every inline with markers of its own — a code span, a bold run, a picture — was cut the same way, because every one of them is drawn shorter than it is written. An end that sits between an inline's markers while the other end is outside that inline is moved out to the inline's own edge now. An end inside an inline the other end is inside too is left alone, so bolding a link's words gives `[**link**](url)`, which is what was asked for. On the source the markers are characters you can see and select through on purpose, and nothing is moved.

A **wrap runs over the whole of any link or code span the selection only half covers.** A link is drawn as its words and written as `[words](address)`, so a selection that runs from those words into the words after it starts, in the file, between the brackets: bolding it wrote `one [**link](https://example.org) two**`, which is neither a link nor bold. Every inline with markers of its own — a code span, a bold run, a picture — was cut the same way, because every one of them is drawn shorter than it is written. An end that sits between an inline's markers while the other end is outside that inline is moved out to the inline's own edge now. An end inside an inline the other end is inside too is left alone, so bolding a link's words gives `[**link**](url)`, which is what was asked for. On the source the markers are characters you can see and select through on purpose, and nothing is moved.

A caret in a place the page cannot draw is the same problem. Markdown does not keep the whitespace at the end of a line, so a space typed at the end of a paragraph is in the file and drawn nowhere at all, and the caret can only come back in front of it. Where it was **meant** to be is kept beside the place it settled for, so the next letter goes after the space rather than in front of it. Without that, `One two` could not be typed a word at a time. `Backspace` there takes the space, because there is no drawn character in front of the caret to take.

`Enter` is a different thing in every container it is pressed in, because a blank line means something different in each:

| Where           | What `Enter` does                                                       |
| --------------- | ----------------------------------------------------------------------- |
| Between blocks  | A blank line                                                            |
| In a list item  | A new item, marker carried down. Empty, a level out, or the marker goes |
| In a quotation  | Ends the paragraph. Continuing it takes a _blank quoted line_           |
| In a code block | A newline and nothing else                                              |
| In a table      | A line break inside the cell, written `<br>`                            |

`Backspace` at the start of a block joins it to the one before it: two list items run together, a paragraph joins the heading above it. Two joins are refused. Joining a table cell to the cell beside it would remove the pipe between them, and joining a code block to whatever is above it would remove the fence.

**An empty paragraph is a pair of blank lines.** Markdown has no empty paragraph, but it has blank lines, and those are what this surface draws. The blank line two blocks need between them is nothing on the page. Every second blank line past it is a paragraph with nothing in it, which is exactly what `Enter` at the end of a paragraph writes: a line to type on and a blank line under it. So pressing `Enter` three times draws three empty paragraphs, the source has the six line endings that make them, and they are still there when the caret goes somewhere else. At either end of the document the first blank line counts too, because there is nothing on that side to be separated from. A second blank line left between two sections by hand is not a paragraph, so a document written elsewhere is drawn the way it was.

`Backspace` in an empty paragraph takes that paragraph out and nothing else, and at the start of a block with one above it, it takes the one above. `Delete` does the same from the other side. Giving a list item up leaves the caret on a paragraph of this kind rather than on the line under the list, where the next letter would have been the item's lazy continuation. A marker typed on that paragraph carries the list on: the blank line goes and the line is the list's next item, where CommonMark would have joined it to the list as a loose one, every item a paragraph and a gap away from the next. A letter typed straight after the marker, as in `-1`, puts the blank line back, and the line is a paragraph again. The preview and the viewer draw the same source the way every Markdown renderer does, with the blank lines as the separators they are.

**A list given up in the middle costs nothing until something is typed there.** `Enter` on an empty item between two others takes the marker away and leaves a blank line, and one blank line does not end a list: `- one`, nothing, `- two` is one loose list to CommonMark, every item a paragraph and further from the next. While the caret is on that line the surface draws the two lists and the empty paragraph the first letter typed will make, so there is somewhere to type. Type there and the line stays, as the blank line that parts the paragraph from the list. Move the caret away without typing and the line goes with it, so the list is the one it was rather than a looser one nobody asked for. `Backspace` on that paragraph puts the list back together without waiting, `Delete` does the same from the other side, and so does undo.

**A code block can be left the way a list can.** `Enter` on its last line, when that line is empty, gives the line up and puts the caret on a paragraph under the block, and `Backspace` at the start of a block takes its fences off and leaves what was in it as a paragraph. A code block, a divider or drawn HTML that ends the document has no line after it for a caret to go to, so a press below one opens a paragraph there, and `ArrowDown` on the last line of a code block or the last row of a table that ends the document does the same; `ArrowUp` over one that starts the document opens a paragraph above it. An empty code block is drawn a line tall, so the caret in it can be seen.

**Two such blocks one after the other have a paragraph between them for a press.** Two dividers in a row draw nothing between them but the space their own margins leave, so a press there left the caret on the document itself, where nothing could be typed and neither divider could be taken away. The press opens a paragraph in the gap now, drawn for as long as the caret is in it and written into the document only when something is typed. `Backspace` on that paragraph takes the divider above it away and `Delete` the one below, because a divider draws no characters for either key to take and there was otherwise no way to get rid of one from there.

**Bold, italic, strikethrough and code pressed with nothing selected hold for what is typed next.** A source editor writes the markers with the caret between them, and on this surface that is the wrong answer: `****` on a line of its own is a divider, `~~~~` is a code fence, and anywhere else the four characters are drawn as themselves until something is typed. So nothing is written when the button is pressed. The button is drawn pressed, and the first thing typed or composed is written with the markers around it and the caret inside them, so what comes after is formatted too. Pressed where the caret is already in bold text, the same button turns bold off for what is typed there: after the run at its end, and in the middle by closing the run in front of the new words and opening it again after them. Moving the caret lets go of whatever was held. Italic is written with `*` inside a word, where `_` is not emphasis. The toolbar's buttons for these four are drawn pressed wherever the caret is inside them, not only when the markers are selected.

**`ArrowRight` at the end of a code span or a run of formatting moves the caret past the closing marker.** The end of `` `code` `` is one place on the page and two in the document, in front of the backtick and after it, and a caret put down there was always the first. So a code span at the end of a paragraph could not be typed out of. The caret does not move on the page, the next letter goes after the marker, and the next `ArrowRight` goes on as usual. `ArrowLeft` at the start is the same, read the other way.

An input method is the one thing that **cannot** be refused, so it is handled the other way round. A composition is left completely alone: from `compositionstart` to `compositionend` the browser owns that run of text, nothing is prevented, and nothing is redrawn in between. When it finishes, the run is compared with what it said before and the difference goes into the Markdown at the place that run came from.

Refusing a composition prevents the composition itself. Korean is composed a jamo at a time, and an editor that blocks each one cannot write Korean at all. Pressing `Enter` and composing straight into the empty paragraph works too, because with no run of text to be in yet, the block itself is remembered.

**A link and a picture are edited from a bar beside them.** A drawn `<a>` puts its words on the page and never its `(url)`, and a picture puts nothing on the page but itself, so what they are written with has nowhere on the page to be typed into. With the caret in a link, a bar floats under the line with its address and its words in two fields, one a row and each named by a label in front of it, a button that opens the link, one that takes the link off and leaves its words, and, in red, one that deletes the link and its words. A press on a picture selects it, drawn without the browser's tint over it, and its bar has its address and its description and, in red, deleting it. What is typed into a field is written when `Enter` is pressed or the field is left, and `Escape` puts the field back. Words left as they were keep the formatting they were written with. The link stays a link and the picture a picture while the caret is in them; they used to be written out as their own characters instead, and a picture turned into `![...](...)` under a press at its edge.

**Words typed at either end of a link go beside it rather than into it.** A link is drawn as its words, so the caret at the end of them is in two places in the document at once: after the last letter of the words, and after the `)`. It was always the first of those, and a space typed there went inside the link, where Markdown keeps none of the whitespace at either end of a link's words — the key looked as though it had done nothing, and everything typed after it became part of the link. The same at the other end, where a link that opens a paragraph had no room in front of it to type in. Changing the words themselves is the caret among them, or the bar's own field, which is what that field is for.

**The toolbar's link asks for the address first.** `link` and `Mod`+`K`, and `image` with `Mod`+`Shift`+`K` or its _Link to an image_, open a bar at the caret with the words that were selected and an address that starts `https://`, and write the link or the picture once there is an address and `Enter` is pressed. `Escape`, or going back to the document, gives it up with nothing written. On the source the same button writes `[](url)` as it always has.

**A piece of raw HTML the caret is inside is written out as its own characters**, and drawn back as itself when the caret leaves. This happens only while the editor has the focus. Written out, it is the source one character for one, and every rule this surface already has works on it unchanged.

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

## One space, one blank line

**A second space in a row is refused, and so is a second blank line.** Markdown draws a run of spaces as one space, so a document holding three said one thing where it was drawn and another where it was written: one space in the formatted document and three in the source beside it, with nothing on either to say which the file held. The extra characters are not drawn — that would mean drawing whitespace the parser throws away — so the keystroke that writes them is refused instead, and a short sentence appears under the caret to say which rule it was. It goes on its own after a second and a half. `oneSpace` and `oneBreak` in [`MawyStrings`](../api/types/locale) are the two sentences.

Two line endings in a row are the blank line two blocks are separated by, so that is as long as a run of them may be. A third is a second blank line, which is an empty paragraph neither surface can show the height of. So `Enter` twice is how a new paragraph is made on the source, and once on the formatted document; pressing it again where the caret is already on an empty paragraph writes nothing.

**Three places keep whatever whitespace they are given.** Inside a code block and inside raw HTML every character is the character it is. Inside a table, the spaces that set a cell off from its pipes are written by the editor rather than typed. And the whitespace a line opens with is what nests a list item and what an indented code block is made of, so it is indentation rather than a run of spaces in words.

Only a keystroke is refused. A document pasted in, opened from a file or handed to the editor by the application keeps every space and every blank line it came with, because a document arriving is not somebody typing. And a hard line break has a key of its own: `Shift`+`Enter` writes the two spaces it is made of, on both surfaces.

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
| `Mod` + `Alt` + `F`     | Footnote                               |
| `Mod` + `1` to `6`      | Heading 1 to 6                         |
| `Mod` + `0`             | Body text                              |
| `Mod` + `F`             | Find and replace                       |
| `Mod` + `S`             | Save                                   |
| `Mod` + `Shift` + `U`   | Upload an image                        |
| `Tab` / `Shift` + `Tab` | Indent, outdent                        |
| `Mod` + `Z`             | Undo                                   |
| `Mod` + `Shift` + `Z`   | Redo, and `Ctrl` + `Y` as well         |
| `Enter`                 | Carries a list marker to the next line |
| `Shift` + `Enter`       | A line break inside the block          |
| `Home` / `End`          | The ends of the line                   |

`Mod` is Command or Control, whichever the machine has. Both are accepted rather than guessed at.

The footnote is where Word and Google Docs put it, and it is the one command here reached with `Alt` rather than with `Shift`. The lists and the quotation use the keys GitHub's comment box gives them, and the task list takes the digit after. The image and the code block are the link and the code span with `Shift` added. The divider is on `,` because the key a divider is written with is taken: `Mod`+`Shift`+`-` shrinks the page in Chromium and Firefox. The digits and the punctuation are read by where the key is rather than by what it types, since under `Shift` a `7` types `&` on one keyboard and `/` on another. In Firefox on Windows and Linux, `Ctrl`+`Shift`+`K` and `Ctrl`+`Shift`+`E` open developer tools; they still do everywhere on the page except inside the editor.

::: fw flutter

`Mod`+`S` and `Mod`+`Shift`+`U` are the lines of that table this package does not handle, because there is nothing here to save to and no image upload. [Opening and saving](#opening-and-saving) has the reason. Undo belongs to the platform rather than this package, as [undo](#undo) explains, and everything else is the same keyboard.

:::

**A footnote is written as both of its halves at once.** `footnote` and `Mod`+`Alt`+`F` write `[^1]` where the caret is, `[^1]: ` at the end of the document, and leave the caret in the note. Both halves, because a reference with no note is nothing to the parser: a button that wrote `[^1]` and stopped would leave the document looking exactly as it did. The number is the first one nothing in the document has taken, counted over every `[^…]` written in it rather than over what the parser read, so a note nobody refers to yet still holds its own number. With words selected, the reference goes at the end of them, which is where a footnote's mark belongs.

**`headingLevels` says which headings the menu offers.** All six by default, since that is how many Markdown has, and a menu that stops short of one is a heading the editor cannot write. Narrowing it is for an application whose pages write the title as their own `h1` and whose documents start at `##`: given heading 2, 3 and 4, the menu offers those and body text, and `Mod`+`2`, `Mod`+`3` and `Mod`+`4` toggle them, while `Mod`+`1` is handed on to whatever else answers it. The levels are the document's own depths, the number of `#` written.

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

**Leaving a list leaves it a blank line away.** A line of words straight under a list item is that item's lazy continuation to CommonMark, drawn at the end of it — so a marker given up with one line ending under the list left the caret somewhere the next word would join the item above, and the `Enter` after that carried the marker back down over a line the parser reads as the item's. At the end of a list the blank line goes in as the marker comes out. In the middle of one there is nowhere to put it: one blank line is already between the two items, and a second is the run neither surface will write. So the line waits, and the first letter typed on it writes the blank line and becomes a paragraph of its own.

**`Home` and `End` go to the ends of the line.** On a Mac the platform means the document by them — `End` scrolls to the bottom and leaves the caret where it was, and `Shift`+`End` selects to the end of the whole document — so in an editor neither key did what it says. The line the source means is the one its gutter numbers: a paragraph wrapped over three rows is one line with one number beside it, and every offset in this library is an offset into the document rather than into a row whose length is a property of how wide the pane happens to be. The drawn document numbers nothing and draws rows, so there the line is the row. `Shift` extends the selection rather than moving the caret, and under a modifier the key is the platform's own and is left alone.

**`Shift`+`Enter` is a break inside the block**, on both surfaces: two spaces and a line ending, which is the hard break nearly every Markdown file in the world is written with, however invisible it is. In a table cell it is `<br>`, since a row of a table is one line of the file and a line ending would end the row. Inside a code block it is a line ending and nothing else, because everything in there is the characters it is. The line it starts opens with whatever the containers around the caret write on every line of themselves — a quotation's `>`, the indentation a list item holds its later lines at — so a break inside a quotation stays inside it rather than leaving a line the parser only reads as quoted because it follows one. Inside a code block that prefix is read off where the block's own line begins, since a `> ` among the words in there is code. The source used to hand the key to the field, which wrote a bare line ending — one space to a Markdown parser — so the same key said two different things on the two surfaces.

**No key is answered while an input method is composing.** Korean is composed a jamo at a time and the key that finishes a syllable is an ordinary key: `Enter` commits one, and the browser sends that keystroke on with `isComposing` set rather than keeping it to itself. Answering it would write into a document the composition has not finished changing, and the caret this has to move to write it with ends the composition where it stands — so `Enter` at the end of a Korean list item lost the syllable being composed and left an empty item in its place. The key comes again once the composition is over, which is when it means what it says. `Escape` is the exception, because ending a composition is what it is for.

The edits go in through the browser's own text-insertion command, which leaves the caret, the scroll position and any composition in progress exactly where they were. Writing the value directly guarantees none of that. Undo used to be the reason for this choice and is not any more; it has a section of its own below.

`toolbar` takes `true`, `false`, or the controls to draw and the order to draw them in:

```tsx
<MawyEditor defaultValue={document} toolbar={['mode', 'separator', 'bold', 'italic', 'link']} />
```

| Item |  |
| --- | --- |
| `'mode'` | The surface switch |
| `'undo'`, `'redo'` | A step back through the history and forward again, disabled while there is none |
| `'heading'` | A menu of all six headings and body text, or of the levels in `headingLevels` |
| `'bold'`, `'italic'`, `'strikethrough'`, `'code'`, `'link'`, `'image'` | Inline formatting |
| `'quote'`, `'bulletList'`, `'orderedList'`, `'taskList'`, `'codeBlock'`, `'rule'` | Blocks |
| `'table'` | A grid that inserts an empty table of the size pressed. See [tables](#tables) |
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

**The toolbar's `table` button asks for a size and inserts an empty table of it.** It opens a grid of ten columns and eight rows, lit from the corner to the cell under the pointer, and the header is counted as one of the rows. The arrows move what is lit and `Enter` inserts it, and a screen reader is given each size as a button of its own.

**The rows and columns of a table are changed from a bar beside the caret.** While the caret is in a table and the editor has the focus, a small bar floats a little under the cell the caret is in, starting across from where the caret came into that cell and staying there while the caret or a selection moves about inside it, or over the cell where there is no room under it on the screen: a row above or below, a column before or after, deleting the row or the column the caret is in, aligning that column left, in the middle or right, and, last and in red, deleting the whole table. On the source it floats under the line the caret is on. It follows the caret, so in a table longer than the screen it is beside the row being written in rather than at the table's far end. Because it lies over the row under the caret, a press meant for that row can land on it, so what adds is at the end nearest the caret and what deletes is at the far end; where there is no room for the bar on the far side of the caret, it runs back from the caret with its buttons the other way round, and the delete buttons are still the far end. A press on it does not take the focus, so the next letter still goes into the cell the caret was in. What they write is a GitHub table: the alignment in the delimiter row and whatever is written in the other cells stay exactly as they were, because each command puts in or takes out one cell per line rather than writing the table out again. Each has a shortcut:

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

**A column is aligned from the same bar.** GitHub aligns a column rather than a cell, with a colon on one side of the dashes in the delimiter row or on both for the middle, so the three alignment buttons write those colons into the delimiter cell of the column the caret is in, keeping as many dashes as there were. The one the column already has is drawn pressed, and pressing it again takes the colons back off. With cells selected they align every column the selection covers.

**Cells are selected as cells.** A drag that starts in one cell and reaches another selects the rectangle of cells between them rather than the text the browser would have run across, and the drawn document marks that rectangle. On the source a selection from a place in one cell to a place in another covers the same rectangle. With more than one cell selected, every button on the bar acts on as many rows or columns as the selection covers and says how many, `Delete these 2 rows` or `Add 3 columns after`, and one more empties the cells. `Delete`, `Backspace` and a cut empty them on the drawn document too, leaving the table its shape, and a letter typed over them empties them and starts the first. The keys for the rows and the columns act on the selection the same way. The header is never deleted, and neither is every column.

The shortcuts only act inside a table, and outside one the keys are handed on to whatever else answers them. A table made with `Mod`+`Alt`+`T` has two empty columns, a header and one row, and every new table has a blank line on either side. It has no column names, because those would be in the interface's language and stay in the document. Inside a quotation or a list item the table goes inside it, with that container's prefix on every line, and inside a code block or another table there is nowhere for one to go, so the grid is disabled there. A row cannot go above the header and the last column cannot be removed, so those buttons on the bar are disabled where they would do nothing. With `gfm` turned off in `parse` the parser reads no tables, so none of these do anything.

::: fw react

**A cell holds one line of words, and no block.** A row of a GitHub table is one line of the file, so a cell can hold bold, italic, code, links and pictures, and line breaks written `<br>`, but not a heading, a quotation, a code block or a list: the first line that opens with `- ` is where the table ends. So with the caret in a table, the heading menu and the buttons for those blocks are disabled and their keys do nothing, where they used to write their marker at the front of the row and break the table. Text pasted into a cell stays on the cell's one line: each line ending becomes `<br>` and each `|` is escaped.

**A list in a cell is written as lines of the cell.** A list cannot be put in a cell, but the way one reads can. The list buttons and their keys write an item's marker at the start of the line of the cell the caret is on, between the `<br>`s the cell is written with, and take it off again; with cells selected they number or mark every line of every cell. `Enter` on a line that opens with a marker carries it onto the line it starts, one higher for a number, and on a line with nothing after its marker it gives the marker up, as it does in a list. `Tab` on such a line nests it under the line above by writing two spaces in front of its marker, and `Shift`+`Tab` takes them back off; the first line of a cell has nothing above it to nest under. `Tab` does not go from cell to cell, because a list in a cell needs it. The editor, the preview and the viewer draw each such line with a bullet, a checkbox or its number, nested by the spaces in front of its marker, and `Backspace` straight after a marker takes the marker off. GitHub draws the markers as the characters they are, so `1. one<br>2. two` reads as a numbered list there too, without the indentation. A space typed after the last word of a line, a marker's among them, is drawn while the caret is after it, where Markdown keeps none.

**A table on the drawn document keeps its shape while it is written in.** Every column is the same width, and the table is as wide as the document or as wide as its columns need to be read, scrolling sideways past that. An empty cell is a line of text tall, so the caret put in it has room and typing the first letter does not move anything. A Markdown table has no column widths to say anything else with, and the preview and the viewer still lay a table out by what is in it.

On the drawn document, **`Enter` in a cell starts a new line in that cell**, and so does `Shift`+`Enter`. A row of a table is one line of the file, so the line ending `Enter` writes everywhere else would end the row, and what is written instead is `<br>`, which is how every GitHub table puts two lines in a cell. Inside a table cell a bare `<br>` is drawn as the line break it is under every `html` policy, `escape` included, and by the Flutter package too, because in a cell there is no other way to write one. `Backspace` after it takes it out in one piece. `Mod`+`Enter` is the row under this one. `ArrowUp` and `ArrowDown` go a line of the cell at a time and then to the cell above or below in the same column, where a browser left to itself goes to the next cell of the row, and from the last row `ArrowDown` goes to the line after the table, or opens one where the table ends the document. Typing into an empty cell writes the words between the spaces, so `|  |` becomes `| Name |` rather than `|  Name|`.

:::

::: fw flutter

There is no drawn document here, so `Enter` in a row of the source is a line ending, as it is in the React package's source. With the caret in a table the heading menu and the buttons for a heading, a quotation, a code block and a divider are disabled, because a cell holds no block. The list buttons write an item's marker at the start of the line of the cell the caret is on instead, or on every line of the cells a selection covers, as the React package's do. The commands behind the grid and the bar are the React package's under the same names, and the parity check diffs the two.

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

`highlight` is passed straight through to the viewer inside the preview, so a `split` or `preview` surface colours its code the way [the viewer does](./viewer#colouring-a-code-block), and the drawn document colours the code blocks it draws with the same highlighter. The lazy form works here too, and is the one to use:

```tsx
<MawyEditor
  defaultValue={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

**On the drawn document a code block is coloured as it is written in.** Every coloured token says where in the source it came from, the way every other element on that surface does, so a caret inside one maps back to the same character it would in plain code, and what is typed is coloured again with the next render. The source surface has a highlighter of its own for the Markdown, and a code block there is coloured as Markdown rather than as its language.

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

The bar is offered wherever the document can be edited: `plain`, `split` and `wysiwyg`. In `preview` the document is drawn as elements, and the browser's own find works on it.

**On `wysiwyg` the bar finds what the page draws.** The search is still over the Markdown, which is what a replacement is written into, but a match counts only where every one of its characters is drawn as itself. The `bold` in a link's address is not drawn, so it is not counted, not stepped to and not replaced, and the count is the count a reader can see. A match cannot straddle two runs of formatting, so `hello` is not found across `he**llo**`. Matches are marked with the CSS Custom Highlight API rather than with elements, because the drawn document is React's tree and an element put around a match would be one React did not make. In a browser without that API the bar still counts and steps, and the match is selected when the bar closes. Stepping leaves the focus in the bar, and closing it puts the focus back on the document with the match selected.

:::

::: fw flutter

The bar is only offered where there is a source to search, which is `plain` and `split`. In `preview` there is no field to search, so the button is not drawn.

:::

## Indenting

On the source surface, `Tab` indents and `Shift`+`Tab` takes it back. With nothing selected it puts two spaces in where the caret is. With anything selected it moves the lines that selection touches and leaves them selected, so it can be pressed again. No editor still replaces a selected paragraph with a tab character.

The width is **two spaces**, which Markdown requires. A nested list item has to clear its parent's marker, and under `- ` that is two columns. Four would become an indented code block the moment the list above it ends. Going back takes a tab or up to two spaces off the front of each line, and a line with nothing left to take is not an error. The rest of the block still moves.

**On a list item, `Tab` makes it an item of the one above it**, and `Shift`+`Tab` makes it that item's sibling again. Two spaces is the width of a bullet and not of a number: `1. ` is three columns, and an item indented two under it is still an item of the outer list. So the item goes in to where the words of the item above it start, and back out to where the item it is in starts, and it takes what it holds with it: the lines it runs on over and the items nested in it. A number is counted rather than kept. An item that becomes the first of a list inside another is `1.`, one that joins a list already there takes that list's next number, and one that comes back out takes the number after the item it was in. The first item of a list has no item above it to go into, so `Tab` there does nothing rather than writing two spaces into its words, and an item of the outermost list has nowhere further out to go.

On the drawn document, **an item with nothing in it yet is held a level in rather than written there.** CommonMark does not let an empty item begin a list inside the item above it. A `-` indented under `- one` with nothing after it underlines `one`, which makes it a heading, and a `1.` indented under `1. one` is read as more of its words, `one 1.`. So `Tab` draws the item a level in and writes nothing, `Shift`+`Tab` or `Enter` brings it back out, and the first letter typed or composed into it writes the item where it was moved to along with the letter. An empty item that joins a list already inside the item above is an item the parser reads, and is written straight away.

Capturing `Tab` in a textarea creates a keyboard trap: somebody who cannot use a pointer would have no way to leave the editor. So there is a key that lets you out.

**Press `Escape`, then `Tab`, and the focus moves on.** One `Escape` arms it and anything else typed disarms it again. It is the rule CodeMirror, Monaco and GitHub's own editor all use, so anybody who has met one of those already knows it. The surface also announces it to a screen reader.

The drawn document captures `Tab` only in a list item and on a line of a table cell written as a list item, where it nests the item the way it does on the source. Everywhere else it is one focusable element, and `Tab` moves straight out of it.

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
