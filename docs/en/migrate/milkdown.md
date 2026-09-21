---
title: From Milkdown
order: 3
---

# Moving from Milkdown

What the editor built out of Milkdown plugins, or assembled for you as Crepe, becomes in Mawy.

Written against Milkdown 7, both `@milkdown/kit` and `@milkdown/crepe`. This is the largest change of the four migrations, because Milkdown is a toolkit and this is a component: there is a plugin list on one side and props on the other, and the document is a ProseMirror document there and a Markdown string here.

**Stay with Milkdown if you are using its collaborative editing.** `@milkdown/plugin-collab` binds the ProseMirror document to a Yjs document, and merging edits needs a shared document rather than a shared string. Nothing here does that.

::: fw flutter

Milkdown is a web library, so there is nothing to migrate from inside a Flutter application. The documents carry over unchanged: the parser is the same in both packages and is diffed on every change, and the one surface this package does not have is `wysiwyg`, which [the editor](../guide/editor) explains.

:::

## The component

```tsx
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';

function Editable() {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, document);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => save(markdown));
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
  );

  return <Milkdown />;
}

<MilkdownProvider>
  <Editable />
</MilkdownProvider>;
```

becomes

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor defaultValue={document} onChange={save} />;
```

The provider, the hook and the context go with it. CommonMark and GitHub's additions are what the parser reads, so there are no presets to `use`, and `listenerCtx.markdownUpdated` is `onChange`.

Coming from Crepe, the shape is the same:

```tsx
const crepe = new Crepe({ root, defaultValue: document });
crepe.on((listener) => listener.markdownUpdated((_, markdown) => save(markdown)));
await crepe.create();
```

`create` and `destroy` belong to mounting, which React already does, and `crepe.getMarkdown()` is a state you are already holding.

## Plugins and features

| Milkdown | Mawy |
| --- | --- |
| `commonmark`, `gfm` presets | — what the parser reads, always |
| `listener` | `onChange`, `onModeChange`, `onColorSchemeChange` |
| `history` | — undo is built in. [Undo](../guide/editor#undo) |
| `clipboard` | — [pasting](../guide/editor#pasting) is built in |
| `indent` | — `Tab` indents the line or the selection. [Indenting](../guide/editor#indenting) |
| `upload` | [`onUploadImage`](../api/components/mawy-editor#images) |
| `prism`, `Crepe.Feature.CodeMirror` | [`highlight`](../api/functions/mawy-highlighter), and the bar over a block for its language |
| `tooltip`, `Crepe.Feature.Toolbar` | — the toolbar is one bar at the top or the bottom, not a tooltip over the selection |
| `slash`, `block`, `Crepe.Feature.BlockEdit` | — no slash menu and no block handle |
| `Crepe.Feature.LinkTooltip` | — [the bar beside a link](../guide/editor#the-document-surface), which does the same job |
| `Crepe.Feature.ImageBlock` | — a picture is `![alt](url)`, with a bar for its address and description |
| `Crepe.Feature.Table` | — tables are read and drawn, with a bar in the row being written |
| `Crepe.Feature.Placeholder` | `placeholder` |
| `Crepe.Feature.Latex` | — no mathematics |
| `Crepe.Feature.AI`, `Crepe.Feature.TopBar` | — nothing |
| `emoji` | — `:smile:` is the characters it is |
| `collab` | — no collaborative editing |
| `trailing` | — the drawn surface opens a paragraph where a caret has nowhere else to go |

## Configuration

| Milkdown | Mawy |
| --- | --- |
| `ctx.set(rootCtx, element)` | — a React component |
| `ctx.set(defaultValueCtx, md)` | `defaultValue`, or `value` when the application owns the document |
| `listenerCtx.markdownUpdated` | `onChange` |
| `editor.action(getMarkdown())` | The document is your state already |
| `crepe.setReadonly(true)` | `readOnly` |
| `editorViewOptionsCtx` | — the editing surface is not a ProseMirror view |
| `@milkdown/theme-nord`, Crepe's theme files | [`--mawy-*` tokens](../api/theming) and `mawy-react/styles.css` |
| A custom `$node`, `$mark` or `$view` | [`directives`](../guide/viewer#directives), for syntax written as `:::name[label]{key=value}` |

Crepe's `theme/common/style.css` and its `frame`, `classic` or `nord` file come out, and one line goes in:

```css
@import 'mawy-react/styles.css';
```

## What you gain

Milkdown draws the document and that is the only way to write in it. Here the same document has four surfaces — the drawn document, the Markdown source, the two side by side, and a preview — and switching between them converts nothing, because all four are views of the same string. [The editor](../guide/editor) is the whole of it.

A finished document also has a component of its own, [`MawyViewer`](../api/components/mawy-viewer), rather than an editor with editing turned off, and [`MawyDocument`](../api/components/mawy-document) draws it on a server with no JavaScript shipped.

## Your documents

Milkdown writes your document back out through remark every time it is saved, so what is in your database is remark's spelling of it rather than the author's. That is done and cannot be undone; nothing here rewrites a document again.

Three to check with a real document open:

- **A node you added yourself.** A custom `$node` wrote something into the Markdown, and here that syntax is either a directive the application draws or text. Find those documents before the old editor goes.
- **Mathematics**, if Crepe's Latex feature was on. `$...$` is the characters it is here.
- **Raw HTML**, which is drawn as its own characters under the default `escape` policy. Pass `html="sanitize"` for documents meant to draw it, and read [safety](../guide/viewer#safety) for what that draws without a browser.
