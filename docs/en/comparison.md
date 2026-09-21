---
title: Comparison
order: 2
---

# Compared with other editors

What Mawy does differently from the Markdown editors a web application usually reaches for, and what those editors do that it does not.

This page was written against Toast UI Editor 3.2.2, MDXEditor 4, Milkdown 7, `@uiw/react-md-editor` 4, Tiptap 3 and BlockNote 0.54. They are moving projects and this is not their documentation, so check whatever you are about to decide on against their own. Where a difference below is a decision rather than a gap, the reason for it is written beside the code it belongs to, in [the editor](./guide/editor) and [the viewer](./guide/viewer).

## The editors on this page

| Editor | What it is | Built on | Declared dependencies |
| --- | --- | --- | --- |
| **Mawy**<br>`mawy-react` | A viewer and an editor over one Markdown string | Its own parser and renderer | 1 |
| **Toast UI Editor**<br>`@toast-ui/editor` | A WYSIWYG surface, a Markdown surface and a separate viewer | ProseMirror | 8 |
| **MDXEditor**<br>`@mdxeditor/editor` | A WYSIWYG editor for Markdown and MDX | Lexical, CodeMirror, mdast | 57 |
| **Milkdown**<br>`@milkdown/kit`, `@milkdown/crepe` | A plugin-driven WYSIWYG editor, assembled for you as Crepe | ProseMirror, remark | 21 and 17 |
| **react-md-editor**<br>`@uiw/react-md-editor` | A textarea with a preview beside it | remark, rehype | 4 |
| **Tiptap**<br>`@tiptap/react`, `@tiptap/markdown` | A headless rich-text editor, with Markdown read and written at its edges | ProseMirror | 3 |
| **BlockNote**<br>`@blocknote/react` | A block editor of the kind Notion has | ProseMirror, through Tiptap | 9 |

Every one of them is MIT, except BlockNote, which is MPL-2.0.

The count is what each package declares rather than what ends up installed — `@tiptap/react` declares three and takes ProseMirror as a peer. It is on the table because it is the one figure here nobody has to agree with a benchmark to read, and because every package that installs alongside an editor is one the application did not choose.

Toast UI Editor is the odd entry: its repository is archived and its last release, 3.2.2, is from February 2023. It is here anyway, because an editor with nothing upstream left is the one an application has a reason to move off, and this one is still downloaded hundreds of thousands of times a month. What it does is not wrong for having stopped moving.

## Where the document lives

This is the one difference the rest follow from.

**In Mawy the Markdown string is the document.** `plain`, `split`, `preview` and `wysiwyg` are four ways of looking at that string, and switching between them mounts a different surface rather than converting anything. There is no serialiser in the package and no second model behind the drawn document: a keystroke on the WYSIWYG surface is refused, turned into an edit to the Markdown, and the document is drawn again from whatever the Markdown became. A file that comes in unchanged goes out unchanged, down to which marker its lists were written with.

**In the others the model is the document and Markdown is what it converts to and from.** Each of them says so in its own API:

- Toast UI Editor has a `beforeConvertWysiwygToMarkdown` hook and a `customMarkdownRenderer` option, because leaving the WYSIWYG surface converts the document.
- MDXEditor calls `onChange` with a second argument named `initialMarkdownNormalize`, for the change raised when the Markdown it was handed comes back different. Its own API documentation gives the reasons as "additional whitespace, bullet symbols different than the configured ones". `toMarkdownOptions` is where that output is configured.
- Milkdown's `getMarkdown()` serialises the ProseMirror document through remark.
- BlockNote names its method `blocksToMarkdownLossy`.

`@uiw/react-md-editor` is the exception. It is a `textarea`, so its value is the Markdown as well, and it differs from Mawy elsewhere: its preview is a second rendering of the same string by remark and rehype rather than the surface the editor writes on.

**A model buys what a string cannot.** Nodes that Markdown has no syntax for, a block that can be dragged by a handle, a slash menu that inserts one, and collaborative editing, which needs a shared document to merge rather than a shared string. Milkdown, Tiptap and BlockNote all do that last one over [Yjs](https://yjs.dev). Mawy has none of it, and each absence is a consequence of the decision above rather than something nobody got to.

## Reading a document

An application that shows documents to people who are not editing them needs a renderer as well, and the two have to agree about what the document says.

| Editor | What draws a finished document |
| --- | --- |
| **Mawy** | [`MawyViewer`](./api/components/mawy-viewer), the same renderer the editor previews with, and [`MawyDocument`](./api/components/mawy-document) for a page that ships no JavaScript |
| **Toast UI Editor** | `Viewer`, a separate build of the same package |
| **MDXEditor** | `readOnly`, which its own documentation advises against for content people only read, pointing you at a renderer of your choice |
| **Milkdown** | `setReadonly(true)` on the editor |
| **react-md-editor** | `MDEditor.Markdown`, which is `@uiw/react-markdown-preview` |
| **Tiptap**, **BlockNote** | The editor with editing turned off, or a static renderer |

In Mawy the two are one library on purpose. The viewer and the editor's preview are the same code reading the same parse tree, so a document cannot say one thing while it is being written and another once it is published.

## On a server

`MawyDocument` from `mawy-react/server` draws the document to HTML and ships no JavaScript for it, which is what a blog post or a documentation page wants. See [publishing](./guide/publishing).

MDXEditor documents that it does not support server rendering and shows the `next/dynamic` import with `ssr: false` that a Next.js page needs. `@uiw/react-md-editor` documents the same import. Toast UI Editor and Milkdown are constructed against an element, so they need a browser to exist first.

## Raw HTML written inside a document

A Markdown document that came from somewhere else may have HTML in it, and what an editor does with that HTML is a safety decision rather than a rendering one.

| Editor | What it does with raw HTML |
| --- | --- |
| **Mawy** | [`html`](./api/types/html-policy) decides: `escape` draws it as the characters it is and is the default, `sanitize` draws what it can prove is safe, `raw` draws all of it |
| **Toast UI Editor** | Renders it, sanitised with DOMPurify, which it installs. `customHTMLSanitizer` replaces that |
| **MDXEditor** | Reads HTML into its own nodes. `suppressHtmlProcessing` turns that off |
| **Milkdown** | Follows its preset and the plugins you added |
| **react-md-editor** | Renders it. Its README says to add `rehype-sanitize` yourself if the authors are not completely trusted |

Mawy defaults to `escape` because a viewer usually shows a document somebody else wrote, and because the safe default is the one nobody has to remember to pass. What `sanitize` draws without a DOM, and why the list is as short as it is, is under [safety](./guide/viewer#safety).

## Styling and the words of the interface

Everything Mawy draws goes through `--mawy-*` custom properties declared on `.mawy-root`, so a theme is a redeclared token rather than a selector fight, and one editor can be dark inside a light page. [Theming](./api/theming) is the whole surface.

The others are a stylesheet you import and override: Toast UI Editor ships a dark theme file and a `theme` option, `@uiw/react-md-editor` switches on a `data-color-mode` attribute on an ancestor, and Milkdown's Crepe ships several theme files to pick between.

The interface's own words are `locale` and `strings` here, and the two languages that ship are English and Korean. **Toast UI Editor is ahead of Mawy on this one**: it ships around twenty languages and takes more through `Editor.setLanguage`. MDXEditor takes a `translation` function, and `@uiw/react-md-editor` ships a second set of commands for Chinese.

## A browser and an app

Mawy is two packages: `mawy-react` on npm and [`mawy`](https://pub.dev/packages/mawy) on pub.dev. They are one parser, one document model and one palette, and a check diffs the two parsers' trees over every Markdown file in the repository on every change. Every other editor on this page is a web library.

That matters when the same documents are read in a web application and in a phone application. It is worth nothing at all when they are not.

## Size

::: fw react

| What you import         | Gzipped |
| ----------------------- | ------- |
| `MawyViewer`            | 33.6 kB |
| `MawyEditor`            | 79.4 kB |
| `mawy-react/markdown`   | 12.5 kB |
| `mawy-react/highlight`  | 2.8 kB  |
| `mawy-react/styles.css` | 7.6 kB  |

Measured from a real bundle of the published files, with React external and `lucide-react` counted, and recorded in `packages/react/size-budget.json` so that CI fails a change that goes over. A page that only reads documents does not ship the editor.

There is no table of the others' figures here. Every one of these editors is assembled differently — Milkdown by which plugins you used, MDXEditor by which plugins you passed, Tiptap by which extensions you registered — so a single number for any of them would be a number for one arrangement of it. Measure the one you are actually going to ship.

:::

::: fw flutter

An app bundle is not measured the way a page is, and the editors on this page are web libraries. The React package's figures are under the React switch, and the one number to check in this package is the icon font's 3 MB, which [getting started](./guide/getting-started#bundle-size) explains.

:::

## What Mawy does not do

Worth reading before a migration rather than after one.

- **No MDX and no JSX.** MDXEditor is the editor for a document with components in it.
- **No collaborative editing.** There is no shared document to merge, only a string.
- **No block handles and no slash menu.** Crepe and BlockNote are built around those.
- **No mathematics and no diagrams.** Crepe has a LaTeX feature, and `@uiw/react-md-editor` documents recipes for KaTeX and Mermaid.
- **No plugin system for new syntax.** [Directives](./guide/viewer#directives) are the extension point: the parser reads the shape and the application draws it. Syntax the parser does not read cannot be added from outside.
- **Two interface languages**, English and Korean, plus `strings` for the rest.
- **No image upload in the Flutter package**, where choosing a file is a plugin's job. The React package has [`onUploadImage`](./api/components/mawy-editor#images).

## Moving from one of these

[Migration](./migrate/) has a page for each of Toast UI Editor, MDXEditor, Milkdown and `@uiw/react-md-editor`: what each option becomes, what happens to the documents already in your database, and what has no equivalent here.
