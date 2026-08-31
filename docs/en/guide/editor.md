---
title: Editor
order: 2
---

# The editor

Mawy's editor is one component with two surfaces. `wysiwyg` edits the rendered document in place; `plain` edits the Markdown source as text. They are two views of one value rather than two editors, which is the decision the whole design turns on.

::: warning Being built The component described here is not written yet. This page is the shape it is being built to, so that what it does and why is decided before the code rather than after it. Follow the [changelog](../changelog). :::

## Two views, one value

The usual arrangement is a WYSIWYG editor with a "source mode" bolted on, where switching serialises out of one model and parses into another. Every round trip through that pair loses whatever the other side could not express — a footnote, an HTML block, the exact spelling of a list marker — and the loss is silent.

Here the document is Markdown, and both surfaces are ways of editing it:

- **`wysiwyg`** renders the document and edits the rendering, translating each edit back into the source.
- **`plain`** edits the source directly.

Switching changes which surface is mounted. It does not re-serialise the document, so nothing is lost in the move and a document that came in unchanged goes out unchanged.

## Modes

`MawyMode` is the whole set:

| Mode        | Editable | Shows                 |
| ----------- | -------- | --------------------- |
| `'wysiwyg'` | Yes      | The rendered document |
| `'plain'`   | Yes      | The Markdown source   |
| `'preview'` | No       | The rendered document |

`preview` is the [viewer](./viewer) reached through the editor's own prop, for the common case of a toolbar that toggles between writing and reading.

## Planned

What the first release is aiming at, in the order it is being built:

- The controlled and uncontrolled value contract — `value` / `defaultValue` / `onChange`.
- The two editing surfaces and the switch between them.
- The toolbar, and doing without it: every command reachable from the keyboard first.
- Input rules — the Markdown you type turning into what it means as you type it.
- Paste: HTML in, Markdown out.
- The extension point, so a document can carry a construct this package does not know about.

## Accessibility

The editing surface is a labelled `textbox`, keyboard-operable in full, and the toolbar is a real toolbar rather than a row of buttons — arrow keys move along it and one tab stop enters and leaves it. Nothing here is added afterwards; it is why the surface is built on `contenteditable` and `beforeinput` rather than on intercepted key events.
