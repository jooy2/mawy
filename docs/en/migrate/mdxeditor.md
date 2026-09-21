---
title: From MDXEditor
order: 2
---

# Moving from MDXEditor

What each MDXEditor plugin and prop becomes in Mawy, and the one case where you should stay where you are.

Written against `@mdxeditor/editor` 4. MDXEditor is a React component like this one, so the move is smaller than it looks from the outside — but the two are built the other way up. MDXEditor holds a [Lexical](https://lexical.dev) editor state and writes Markdown out of it with `mdast-util-to-markdown`; Mawy edits the Markdown string and draws it.

**Stay with MDXEditor if your documents are MDX.** JSX inside a document is what that editor is for, and there is nothing here that reads or draws a component in a document. The rest of this page is for an application that used it to edit plain Markdown.

::: fw flutter

MDXEditor is a React component, so there is nothing to migrate from inside a Flutter application. What carries over is the document: the parser is the same in both packages, and a plain Markdown file written in MDXEditor reads here the way it reads on the web. MDX itself does not, in either package.

:::

## The component

```tsx
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

<MDXEditor
  markdown={document}
  onChange={save}
  plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin()]}
/>;
```

becomes

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor defaultValue={document} onChange={save} />;
```

There is no plugin list because the syntax is not optional: the parser reads CommonMark and GitHub's additions, and the surfaces draw what it read. Nothing has to be switched on for a heading to be a heading.

**`value` is a real controlled prop here.** MDXEditor reads `markdown` once, at mount, and changing the document afterwards means calling `setMarkdown` through a ref. If that is what your code does, pass `value` instead and delete the ref.

## Plugins

| MDXEditor | Mawy |
| --- | --- |
| `headingsPlugin`, `listsPlugin`, `quotePlugin`, `thematicBreakPlugin`, `linkPlugin`, `tablePlugin`, `codeBlockPlugin` | — the parser reads all of it |
| `markdownShortcutPlugin` | — typing `# ` on the drawn document is a heading because the parser reads it as one. [Input rules](../guide/editor#input-rules) |
| `toolbarPlugin` | [`toolbar`](../api/types/editor-toolbar-item), a list of names |
| `diffSourcePlugin` | `modes` and `mode`. `'rich-text'` is `wysiwyg` and `'source'` is `plain`; the diff view has nothing here |
| `linkDialogPlugin` | — the bar beside a link is [how a link is edited](../guide/editor#the-document-surface) |
| `imagePlugin` | [`onUploadImage`](../api/components/mawy-editor#images) for a file, and the picture's own bar for its address and description |
| `codeMirrorPlugin` | [`highlight`](../api/functions/mawy-highlighter) colours a block; the language is picked from the bar over it |
| `frontmatterPlugin` | `frontmatter` in `parse`, on by default. It stays in the document and is not drawn; edit it on the source surface |
| `directivesPlugin` | [`directives`](../guide/viewer#directives). The same `:::name[label]{key=value}` syntax, drawn by a component you register |
| `searchPlugin` | The `find` toolbar item, and `Mod`+`F`. [Finding](../guide/editor#finding) |
| `maxLengthPlugin` | — the document is your state; measure it there |
| `jsxPlugin` | — nothing reads JSX here |

## Props

| MDXEditor | Mawy | Notes |
| --- | --- | --- |
| `markdown` | `defaultValue` | `value` when the application owns the document |
| `onChange` | `onChange` | One argument. Nothing is normalised, so there is no initial change to ignore |
| `readOnly` | `readOnly`, or [`MawyViewer`](../api/components/mawy-viewer) | See below |
| `placeholder` | `placeholder` |  |
| `autoFocus` | — | `handle.focus()` after mounting |
| `onBlur` | — | Listen on the element around the editor |
| `onError` | — | There is no parse that can fail: every document is Markdown, and text that is not syntax is text |
| `toMarkdownOptions` | — | Nothing writes the document out |
| `trim` | — | The document is kept as it was given, whitespace included |
| `suppressHtmlProcessing` | [`html`](../api/types/html-policy) | `escape`, the default, draws HTML as its own characters |
| `translation` | `locale`, `strings` |  |
| `iconComponentFor` | — | The icons are [Lucide](https://lucide.dev), the package's one dependency |
| `contentEditableClassName`, `lexicalTheme` | [`--mawy-*` tokens](../api/theming) | Theming is a redeclared custom property rather than a class |
| `spellCheck` | — | The source surface is a real `<textarea>`, so the platform's spellcheck is on it |
| `overlayContainer` | — | The bars are drawn inside the editor |

## Read-only documents

MDXEditor's own documentation advises against `readOnly` for content people only read, and points you at a renderer of your choice. That renderer is in this package:

```tsx
import { MawyViewer } from 'mawy-react';

<MawyViewer value={document} />;
```

It is the same renderer the editor previews with, so the two cannot disagree about what a document says. On a published page, [`MawyDocument`](../api/components/mawy-document) draws the same thing on a server and ships no JavaScript for it — which is also the answer to MDXEditor not supporting server rendering, and to the `next/dynamic` import with `ssr: false` that its documentation shows.

## Your documents

**MDXEditor rewrites a document as it serialises it**, which is why its `onChange` carries a second argument for the change raised by setting the initial value. Its API documentation gives the causes as "additional whitespace, bullet symbols different than the configured ones". Whatever is in your database is what that serialiser left, and it is valid Markdown; from here on the file is the author's text and stays that way.

Two things to look at with a real document open:

- **Raw HTML.** MDXEditor reads HTML into its own nodes unless `suppressHtmlProcessing` is set. Here the default is `escape`, which draws the markup as the characters it is. Pass `html="sanitize"` for documents that are meant to draw it, and read [safety](../guide/viewer#safety) first.
- **Anything MDX.** A `import` line, an `export`, or a `<Component />` in the document is text to this parser. Search your documents for them before the old editor goes.
