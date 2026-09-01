---
title: Playground
order: 4
---

# Playground

Every other demo on this site is narrowed to the one thing its section is about — one surface, or two, or a toolbar with a single button on it. This page is the opposite, and that is the whole of what it is for: both components with nothing switched off, in whichever package the switch above the menu is set to.

Nothing on it is a mock. <Fw react="The editor below is the component from the package, mounted in this page as a React island and drawn from the same source you install." flutter="The editor below is a real Flutter build in a frame, compiled from the gallery in the package's own repository." /> What you type is Markdown, read by the parser that reads everything else here.

## The editor

<MawyDemo name="playground/editor" flutter="playground/editor" :height="640" />

::: fw react

The document it opens with is a list of things to try, written in the language of the page you are on. The short version:

- **Switch surfaces** with the control at the left of the toolbar. Four of them: `wysiwyg` edits the drawn document in place, `plain` is the source, `preview` is the reading, and `split` is both.
- **Drag the bar** between the two panes of `split`, or give it the focus and press the arrows.
- **Narrow the window.** The toolbar keeps the groups that fit and puts the rest in a menu at its end, from the end and a whole group at a time.
- **Press `Mod` + `F`** for the find bar over the source, with replace beside it.
- **Drop an image on it**, or paste a screenshot. `onUploadImage` decides where the bytes go, and this page answers with a `data:` URI — the one thing here a real application would not do, and what there is when a documentation site has no server behind it.
- **`Mod` + `S` downloads the document**, and the folder button reads one off your disk. Both are real: with no `onSave` the editor hands the text to the browser, which is what a browser is for.

:::

::: fw flutter

The document it opens with is a list of things to try, written in the language of the page you are on. The short version:

- **Switch surfaces** with the control at the left of the toolbar. Three of them: `plain` is the source, `preview` is the reading, and `split` is both. The [editor page](./editor) says why there is no `wysiwyg` here, and it is a reason rather than a gap.
- **Drag the bar** between the two panes of `split`, or give it the focus and press the arrows.
- **Narrow the window.** The toolbar scrolls sideways rather than folding into a menu, which is the one place the two packages answer this differently — a row that slides is what a finger already knows to do.
- **Press `Mod` + `F`** for the find bar over the source, with replace beside it.
- **Select with the pointer** — drag across the source, double tap for a word, triple tap for a line — and then press a button. Every command on the toolbar acts on the selection.
- **Opening and saving are the application's**, and there is no image upload. A file picker is a plugin rather than a widget, and which one an app has already chosen is not a decision a Markdown editor should make on its behalf.

:::

## The viewer

<MawyDemo name="playground/viewer" flutter="viewer/basic" :height="560" />

The document is the one the rest of the site uses as its specimen: a table with three alignments, a task list, an alert, a fenced block, a definition list, a footnote mentioned twice, and a reference link defined at the bottom. It is the same document in both languages, because what a footnote looks like does not depend on who is reading it — only the editor above is translated, since a list of things to try in a language nobody picked is a list nobody follows.

The toolbar is every control there is.

::: fw react

- **The typography is the reader's, not the document's** — typeface, size, line height, letter spacing, and how wide the column runs. This demo passes `fonts` with the web families on, which is opt-in everywhere else: a request to a font CDN is the embedding page's decision rather than the component's.
- **The outline** is every heading in the document, and following one takes the focus with it rather than only the scroll.
- **Open a `.md` file of your own**, from the toolbar or by dropping one anywhere on the viewer.
- **`callout`, `progress` and `kbd`** are drawn by components this site declares, not by the library. The [viewer page](./viewer#directives) has the whole of how that works.

:::

::: fw flutter

- **The typography is the reader's, not the document's** — typeface, size, line height, letter spacing, and how wide the column runs. `fontFamily` offers the three roles the platform already has; the list of web families to fetch is the React package's, for the reason a font request is the embedding page's decision rather than the component's.
- **The outline** is every heading in the document, and following one takes the focus with it rather than only the scroll.
- **There is no `open`** on this toolbar. Reading a file off a disk is a plugin here rather than a widget, which is the same answer the editor gives above.
- **`callout`, `progress` and `kbd`** are drawn by builders the gallery declares, not by the library. The [viewer page](./viewer#directives) has the whole of how that works.

:::
