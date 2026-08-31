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

| Mode        | Editable | Shows                                |
| ----------- | -------- | ------------------------------------ |
| `'plain'`   | Yes      | The Markdown source                  |
| `'preview'` | No       | The rendered document                |
| `'split'`   | Yes      | Both, side by side                   |
| `'wysiwyg'` | —        | Not built yet; falls back to `plain` |

`modes` decides which of them the toolbar offers, and the switch disappears when there is only one:

```tsx
<MawyEditor defaultValue={document} modes={['plain']} />
```

<MawyDemo name="editor/source" />

`mode` / `defaultMode` / `onModeChange` are the usual three: pass `mode` and the application decides, pass `defaultMode` and the editor keeps it, and `onModeChange` is called either way.

In `split`, the preview scrolls with the source **proportionally** rather than line for line, so the two agree closely over a long document and visibly less so over a short one. Matching a source line to the block it became needs the parser to remember where every node came from, which it now does — the preview is the half that has yet to be taught to ask.

## The source surface

A real `<textarea>`, with a coloured copy of the same text laid exactly underneath it.

That arrangement is the point rather than a trick. The textarea keeps everything that is extremely hard to reimplement and extremely obvious when it is missing: the **native undo stack**, the **IME** — Korean is composed a jamo at a time, and an editor that fights the composition eats characters — the mobile keyboard, autocorrect, spellcheck, and every text-selection gesture the platform has. What a textarea cannot do is colour anything, so its text is made transparent, its caret and selection are left visible, and a layer behind it draws the same characters in colour.

Everything that decides where a character lands — font, size, line height, letter spacing, tab size, wrapping, and the padding that sets the left edge — is declared once in the stylesheet, for both layers. That is what keeps them in step, and it is why the editor's monospace face is `--mawy-font-mono` and not a choice the component makes.

The syntax colouring is Mawy's own parser's vocabulary, but not Mawy's own parser. A line being typed is half-written most of the time, and a highlighter that waited for `**bold` to be closed before admitting anything was happening would flicker on every keystroke — so it reads a line at a time, approximately, and deliberately says nothing about an unfinished marker.

`lineNumbers` turns the gutter off. It is on by default, and the numbers stay lined up with soft-wrapped text because both layers are one grid rather than two stacks of rows.

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
| `Enter`                 | Carries a list marker to the next line |

`Mod` is Command or Control, whichever the machine has — both are accepted rather than guessed at.

Every command is a **toggle**: pressing `Mod`+`B` on bold text unbolds it, and the toolbar button shows which are in force. Markers replace each other rather than stacking, so turning a numbered list into a bulleted one gives a bulleted list and not `- 1. item`.

`Enter` at the end of a list item carries the marker down and counts an ordered list on. Pressing it again on the item that is still empty takes the marker away instead of making another — without that, leaving a list means deleting the bullet the editor has just helpfully added.

The edits go in through the browser's own text-insertion command, which is what keeps them on the **native undo stack**. Writing the value through React instead would work and would quietly break `Mod`+`Z`, which for a text editor is not a small loss.

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

## The status bar

```tsx
<MawyEditor defaultValue={document} status={['position', 'words', 'size']} />
```

`'position'`, `'selection'`, `'lines'`, `'words'`, `'characters'` and `'size'` — or `false` for none.

Two of those count more carefully than they look. **Characters** are code points, so an emoji is one rather than two. **Words** add every Han, hiragana and katakana character to the space-separated count, because those languages are written without spaces and a whitespace split calls a page of them one word — Korean is spaced, so an eojeol is a word and it is counted as one. **Size** is UTF-8 bytes, which is what a file on disk will be and is not the same number as the character count the moment anything is not ASCII.

## Still to come

- The `wysiwyg` surface — editing the rendered document in place.
- Input rules: the Markdown you type turning into what it means as you type it.
- Paste: HTML in, Markdown out.
- Images.
- The extension point, so a document can carry a construct this package does not know about.

## Accessibility

The editing surface is a labelled `textbox` and everything reachable from the toolbar is reachable from the keyboard first. The toolbar is a real `toolbar`: one tab stop, arrow keys inside. `Tab` is deliberately **not** captured for indentation — a textarea that swallows `Tab` is a keyboard trap, and indentation is not worth one.
