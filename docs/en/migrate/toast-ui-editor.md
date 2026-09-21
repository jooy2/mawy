---
title: From Toast UI Editor
order: 1
---

# Moving from Toast UI Editor

What each Toast UI Editor option, method and plugin becomes in Mawy, and which of them have nothing here.

Written against `@toast-ui/editor` 3.2.2 and `@toast-ui/react-editor` 3.2.3, which are the last releases of either: the repository was archived with 3.2.2 in February 2023. Of the editors on this site that is the one thing to know before anything else, and it is why this page exists.

The two are closer than they look. Toast UI Editor is also a Markdown editor with a source surface, a WYSIWYG surface and a viewer, and it is also a package rather than a toolkit. What differs is where the document lives: it keeps a ProseMirror document and converts to Markdown, and Mawy edits the Markdown.

::: fw flutter

Toast UI Editor is a web library, so nothing here is a Flutter migration. What carries over is the document: one written in that editor is read here by the same parser as in the React package, and `wysiwyg` is the one surface this package does not have. [The editor](../guide/editor) says why.

:::

## The component

```tsx
import '@toast-ui/editor/dist/toastui-editor.css';
import { Editor } from '@toast-ui/react-editor';

export function Page() {
  const editor = useRef<Editor>(null);

  return (
    <Editor
      initialValue={document}
      initialEditType="markdown"
      previewStyle="vertical"
      height="600px"
      usageStatistics={false}
      onChange={() => save(editor.current?.getInstance().getMarkdown())}
      ref={editor}
    />
  );
}
```

becomes

```tsx
import { MawyEditor } from 'mawy-react';

export function Page() {
  return <MawyEditor defaultValue={document} defaultMode="split" onChange={save} />;
}
```

`onChange` is handed the document, so the ref and `getInstance().getMarkdown()` go. The stylesheet is `mawy-react/styles.css`, imported once at your CSS entry point rather than per component.

**There is no `usageStatistics` here because there is nothing to turn off.** Toast UI Editor reports the page's hostname to Google Analytics unless that option is passed; this package makes no requests of its own.

## Options

| Toast UI Editor | Mawy | Notes |
| --- | --- | --- |
| `el` | — | A React component, so there is no element to hand over |
| `initialValue` | `defaultValue` | `value` instead when the application owns the document |
| `initialEditType: 'markdown'` | `defaultMode="plain"` | Or `"split"`, which is what `previewStyle: 'vertical'` made of it |
| `initialEditType: 'wysiwyg'` | `defaultMode="wysiwyg"` |  |
| `previewStyle: 'vertical'` | `defaultMode="split"` | The bar between the panes drags here |
| `previewStyle: 'tab'` | `modes={['plain', 'preview']}` | The switch is the tabs |
| `hideModeSwitch` | `modes={['plain']}` | One mode and the switch disappears |
| `height`, `minHeight` | — | The editor fills its container; give the container a height |
| `placeholder` | `placeholder` |  |
| `autofocus` | — | [`handle.focus()`](../api/components/mawy-editor#from-outside-the-editor) after mounting |
| `events.change` | `onChange` | Called with the document rather than with nothing |
| `events.focus`, `events.blur` | — | The editor is a DOM subtree; listen on the element around it |
| `hooks.addImageBlobHook` | [`onUploadImage`](../api/components/mawy-editor#images) | Comes back with a URL instead of calling a callback |
| `language` | `locale`, `strings` | English and Korean ship; `strings` is the rest |
| `theme: 'dark'` | `defaultColorScheme="dark"` | `colorScheme` when the application owns it |
| `toolbarItems` | [`toolbar`](../api/types/editor-toolbar-item) | A flat list of names, `'separator'` included |
| `useCommandShortcut` | — | The shortcuts are always on |
| `frontMatter` | `frontmatter` in `parse` | On by default here |
| `referenceDefinition` | — | `[label]: url` definitions are always read |
| `extendedAutolinks` | `autolinkSchemes` in `parse` | Widens autolinking past the web schemes GFM reads |
| `linkAttributes` | `linkTarget`, `linkRel` |  |
| `customHTMLSanitizer` | [`html`](../api/types/html-policy) | A policy rather than a function: `escape`, `sanitize` or `raw` |
| `customHTMLRenderer` | [`directives`](../guide/viewer#directives), `image` |  |
| `widgetRules` | [`directives`](../guide/viewer#directives) | A named shape the parser reads and your component draws |
| `customMarkdownRenderer` | — | Nothing writes Markdown here but the editing commands |
| `usageStatistics` | — | No requests to turn off |
| `viewer: true` | [`MawyViewer`](../api/components/mawy-viewer) | A component of its own |

## Methods

| Toast UI Editor | Mawy |
| --- | --- |
| `getMarkdown()` | The document is your state already |
| `setMarkdown(value)` | Set that state |
| `getHTML()` | [`MawyDocument`](../api/components/mawy-document) on a server, through `renderToStaticMarkup` if you need the string |
| `insertText(text)` | `handle.insert(markdown)` |
| `changeMode(type)` | The `mode` prop |
| `exec(name)` | — the toolbar buttons and their shortcuts, or `handle.insert` for what you would have written |
| `focus()` | `handle.focus()` |
| `destroy()` | Unmount it |
| `on`, `off`, `addHook` | `onChange`, `onModeChange`, `onColorSchemeChange` |

## Plugins

Toast UI Editor's five official plugins have no equivalent as plugins, because there is no plugin system here. Two have an answer anyway:

| Plugin | Here |
| --- | --- |
| `editor-plugin-code-syntax-highlight` | [`highlight`](../api/functions/mawy-highlighter), which ships with the package |
| `editor-plugin-chart`, `editor-plugin-uml` | A [directive](../guide/viewer#directives) and a component of yours. The syntax changes: `:::chart` rather than a fenced block |
| `editor-plugin-color-syntax` | — it writes `<span style>` into the document, which is raw HTML and drawn as characters under the default policy |
| `editor-plugin-table-merged-cell` | — a merged cell is not GFM, so a document using it means one thing in that editor and another everywhere else |

## The viewer

If you built the read-only side with `Viewer`:

```tsx
import { Viewer } from '@toast-ui/react-editor';

<Viewer initialValue={document} />;
```

```tsx
import { MawyViewer } from 'mawy-react';

<MawyViewer value={document} />;
```

The viewer here is the editor's preview pane, so what a reader sees is what the author had in front of them. It comes with a toolbar for the text size, the line height, the theme and the column width, and `toolbar={false}` takes all of it away. On a page that is published rather than browsed, use [`MawyDocument`](../api/components/mawy-document): the same drawing with no JavaScript shipped.

## Your documents

**A document saved by Toast UI Editor's WYSIWYG surface has already been through its Markdown renderer.** Its list markers, its emphasis characters and its line breaks are that renderer's rather than the author's. They are still correct Markdown and they read the same; there is simply nothing to recover, and nothing here will rewrite them again.

Two differences worth opening a document to check:

- **`[label]: url` definitions are always read here.** A document that relied on Toast UI Editor not reading them, because `referenceDefinition` was off, will draw links where it used to draw brackets.
- **Raw HTML is drawn as its own characters by default.** Toast UI Editor renders HTML after sanitising it. If your documents contain markup that is meant to draw, pass `html="sanitize"` and read [safety](../guide/viewer#safety) for what that does and does not draw on a server.
