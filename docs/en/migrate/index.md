---
title: Migration
order: 3
---

# Moving from another editor

What it takes to replace another Markdown editor with Mawy, and what happens to the documents you already have.

Every editor here stores the same thing in the end: a Markdown string in a column somewhere. Mawy takes that string as `value` and hands it back through `onChange`, so most of a migration is wiring rather than conversion — where the string comes from, where it goes, and which of your old options have a name here.

| Coming from | Package | Page |
| --- | --- | --- |
| Toast UI Editor | `@toast-ui/editor`, `@toast-ui/react-editor` | [From Toast UI Editor](./toast-ui-editor) |
| MDXEditor | `@mdxeditor/editor` | [From MDXEditor](./mdxeditor) |
| Milkdown | `@milkdown/kit`, `@milkdown/crepe` | [From Milkdown](./milkdown) |
| react-md-editor | `@uiw/react-md-editor` | [From react-md-editor](./react-md-editor) |

::: fw flutter

These are all web libraries, so there is nothing to migrate from inside a Flutter application. This section is useful here for one case: an application whose documents are written in a browser and read in an app. The parser is the same in both packages and a check diffs the two on every change, so a document moved off one of these editors reads the same on a phone as it does on the page it was written on.

:::

## The shape of all four

1. **Put `MawyEditor` where the old editor was**, with `value` and `onChange` instead of an instance and a ref. See [the editor](../guide/editor).
2. **Replace whatever renders a finished document** with [`MawyViewer`](../api/components/mawy-viewer), or with [`MawyDocument`](../api/components/mawy-document) on a page that should ship no JavaScript. Most applications have one of these and forget it is there.
3. **Import `mawy-react/styles.css` once** and delete the old editor's stylesheets. Your overrides of its class names go with them; theming here is [redeclaring a `--mawy-*` token](../api/theming).
4. **Translate the options** using the table on your editor's page. Most have a name here; the ones that do not are listed rather than left for you to find.
5. **Open a few real documents and save them unchanged**, then diff. This is where an editor that rewrites documents shows itself, and it is worth doing before the old editor comes out.

## What it does to your documents

**Nothing.** Mawy edits the Markdown string itself, so a document that opens unchanged saves unchanged: the same list markers, the same emphasis characters, the same blank lines. There is no serialiser in the package to normalise anything, and switching between the source and the drawn document mounts a different surface rather than converting the file.

What has already happened to your documents is a different question. An editor that holds a model and writes Markdown out of it rewrote each document as it was saved, and those documents are in your database in the shape that editor left them. They still read the same, and they are still valid Markdown; they simply are not the text their authors typed. Nothing here can undo that, and nothing here will do it again.

## An editor that is not on this list

The five steps above are the whole recipe, and the pages differ only in the mapping tables. Two things are worth checking for an editor that is not here:

- **Whether it stores Markdown at all.** An editor that stores its own JSON — a ProseMirror document, a Lexical state, BlockNote's blocks — has to export Markdown once, for every row, with its own exporter. Do that while the old editor is still installed, because after it goes the only thing that can read those rows is gone.
- **What its export does to a document.** Run a handful of real documents through it and read the output. BlockNote's method is called `blocksToMarkdownLossy` for a reason, and a one-way conversion is worth knowing the cost of before it is the only copy you have.
