---
title: MawyEditor
order: 2
---

# `MawyEditor`

A Markdown editor with the viewer beside it. See [the editor](../../guide/editor).

::: fw react

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor defaultValue="# Hello" onChange={save} />;
```

Every prop of `<div>` is accepted and forwarded, apart from `children` and `onChange`. A `ref` reaches the outermost element.

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyEditor(defaultValue: '# Hello', onChange: save);
```

Built on `package:flutter/widgets.dart` alone, like the viewer, and holding its own document unless it is handed one.

:::

## The document

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The document, when the application owns it. |
| `defaultValue` | `string` | `''` | The document to start with, when the editor is to keep it. |
| `onChange` | `(value: string) => void` | — | Every change, controlled or not. |
| `readOnly` | `boolean` | `false` | The document can still be read, selected and copied. |
| `placeholder` | `string` | a localised prompt | Shown while the document is empty. |

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `String?` | — | The document, when the application owns it. |
| `defaultValue` | `String` | `''` | The document to start with, when the editor is to keep it. |
| `onChange` | `ValueChanged<String>?` | — | Every change, held or handed over. |
| `readOnly` | `bool` | `false` | The document can still be read, selected and copied. |
| `placeholder` | `String?` | a localised prompt | Shown while the document is empty. |

The two arrangements are the ones every text field in Flutter offers, and they are the React package's as well.

:::

## Surfaces

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `mode` | [`MawyMode`](../types/editor-mode) | — | Which surface, when the application owns it. |
| `defaultMode` | `MawyMode` | the first of `modes` | Which surface to start on. |
| `onModeChange` | `(mode: MawyMode) => void` | — | Called whenever it changes. |
| `modes` | `readonly MawyMode[]` | `['wysiwyg', 'plain', 'split', 'preview']` | Which surfaces the switch offers. Give it one and the switch disappears. |

`'wysiwyg'` draws the document and edits it in place. It is the first of the default list; leave it out of `modes` to not offer it.

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `mode` | [`MawyEditorMode?`](../types/editor-mode) | — | Which surface, when the application owns it. |
| `defaultMode` | `MawyEditorMode` | `MawyEditorMode.split` | Which surface to open on. |
| `onModeChange` | `ValueChanged<MawyEditorMode>?` | — | Called when the reader picks a different one. |
| `modes` | `List<MawyEditorMode>` | `kMawyEditorModes` | Which surfaces the switch offers. Give it one and the switch disappears. |

**This package has three surfaces**, and the React package's `wysiwyg` is the one it does not have. Editing a document where it is drawn rests entirely on `contenteditable`: the browser tells the component what somebody tried to do to the tree, and the component refuses it and changes the Markdown instead. Flutter has no equivalent, because an `EditableText` owns its string. Drawing a document that is also a text field would need a second model of the document, and two models read anything unusual differently.

:::

## The interface

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `toolbar` | [`MawyEditorToolbarOption`](../types/editor-toolbar-item) | `true` | Which controls the toolbar has, and in what order. |
| `frame` | [`MawyFrame`](../types/frame) | `'box'` | Whether the editor has a frame around it, or floats in the page. |
| `toolbarPlacement` | [`MawyToolbarPlacement`](../types/frame#mawytoolbarplacement) | `'top'` | Which end the toolbar and the find bar are at. The status bar does not move. |
| `status` | [`MawyEditorStatusOption`](../types/editor-status-item) | `true` | What the status bar counts. |
| `lineNumbers` | `boolean` | `true` | The gutter down the left of the source. |
| `locale` | [`MawyLocale`](../types/locale) | `'en'` | The language of the editor's own interface — toolbar labels, menu entries, the words along the status bar, the text a screen reader is given. Handed to the preview as well. Nothing to do with the document. |
| `strings` | `Partial<`[`MawyStrings`](../types/locale#mawystrings)`>` | — | The interface's words, some or all of them, over the ones `locale` has. |

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `toolbar` | `List<`[`MawyEditorToolbarItem`](../types/editor-toolbar-item)`>` | `kMawyEditorToolbar` | Which controls the toolbar has, and in what order. `const []` for none. |
| `frame` | [`MawyFrame`](../types/frame) | `MawyFrame.box` | Whether the editor has a frame around it, or floats on the screen. |
| `toolbarPlacement` | [`MawyToolbarPlacement`](../types/frame#mawytoolbarplacement) | `MawyToolbarPlacement.top` | Which end the toolbar and the find bar are at. The status bar does not move. |
| `status` | `List<`[`MawyEditorStatusItem`](../types/editor-status-item)`>` | `kMawyEditorStatus` | What the status bar counts. `const []` for none. |
| `lineNumbers` | `bool` | `true` | The gutter down the leading edge of the source. |
| `locale` | [`MawyLocale`](../types/locale) | `MawyLocale.en` | The language of the editor's own interface — toolbar labels, menu entries, the words along the status bar, the text a screen reader is given. Handed to the preview as well. Nothing to do with the document. |

A list rather than a `true`, for the same reason the viewer's `toolbar` is one.

:::

## Images

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onUploadImage` | [`MawyImageUpload`](../types/image) | — | Where a dropped, pasted or chosen picture goes, and what URL to write for it. |
| `onUploadingChange` | `(count: number) => void` | — | How many images are still on their way into the document, whenever that changes. |

With it, the toolbar's `image` button is a menu that also uploads a picture chosen from the device, and `Mod`+`Shift`+`U` opens the same picker. Without it a dropped file does nothing, because storing a picture is not a decision a text editor makes on its own. An image already on the web, pasted as part of a page, still arrives as the URL it already had. See [images](../../guide/editor#images).

:::

::: fw flutter

There is no image upload here. The editor writes the Markdown an application hands it a URL for, and choosing a file is a plugin's job rather than a widget's.

:::

## Opening and saving

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onSave` | `(value: string, name: string) => void` | — | Where a saved document goes. Without it the browser is handed a download. |
| `accept` | `string` | every Markdown and text extension | What the file picker offers. |
| `fileDrop` | `boolean` | `false` | Whether a Markdown file dropped on the editor opens as the document. |

The name is the file's own when one was opened, and the document's first heading otherwise. A file dropped on the editor is treated as an image rather than a document unless `fileDrop` says otherwise. See [opening and saving](../../guide/editor#opening-and-saving) for why, and for what turning it on changes.

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `onOpen` | `VoidCallback?` | — | What opening a document means. Without one there is no `open` button and no empty state offering to fill the editor. |

**No `onSave`, no `accept`, and no `save`.** A file picker is a plugin rather than a widget, and which one an application has already chosen is not a decision a Markdown editor should make on its behalf. `value` and `onChange` are the whole of the seam: read the file, hand over the string, take the string back.

`onOpen` is the button, not the picker. The editor draws the control on the toolbar and in the pane of an empty editor, and the application decides what a press of it opens.

:::

## Finding

::: fw react

`Mod`+`F` opens the find bar over whichever surface is showing. See [finding](../../guide/editor#finding).

:::

::: fw flutter

`Mod`+`F` opens a find bar over the source, and [`MawyEditorToolbarItem.find`](../types/editor-toolbar-item) is the button that does the same thing. `Enter` is the next match, `Shift`+`Enter` the one before, `Escape` closes it and gives the focus back to the document.

It is there because a platform's own find reaches a page of text and not the inside of a text field, and the source surface is a text field. The arithmetic is exported as well — see [finding text](../functions/find) — for an application that wants to drive it from its own interface.

:::

## The preview, and the palette

::: fw react

`parse`, `html`, `linkTarget`, `linkRel`, `highlight`, `fonts`, `directives`, `image`, `resolveUrl`, `anchorPrefix`, `typography`, `defaultTypography`, `colorScheme`, `defaultColorScheme` and `onColorSchemeChange` mean exactly what they mean on [`MawyViewer`](./mawy-viewer), and everything that describes a document is passed straight through to the preview. `directives` and `anchorPrefix` reach the drawn document as well.

`anchorPrefix` is what keeps two editors on one page apart. Both documents opening with `# Introduction` give two headings `id="introduction"`, and a footnote reference in the second editor lands on the first editor's note, until each editor is given a prefix of its own. Unset, the editor makes none up: which editors share a page is the application's knowledge, and a generated name is one the application could not link to.

:::

::: fw flutter

`parse`, `directives`, `highlight`, `onLinkTap`, `resolveUrl`, `typography`, `defaultTypography` and `tokens` mean exactly what they mean on [`MawyViewer`](./mawy-viewer), and are passed straight through to the preview.

The colour scheme is the controlled pair here rather than the viewer's single argument: `colorScheme` when the application owns it, `defaultColorScheme` (`MawyColorScheme.system`) when the editor keeps it itself, and `onColorSchemeChange` either way.

`tokens` reaches further than the preview: the editor's own toolbar, status bar and find bar are drawn from the palette it returns, so an editor and the document it is editing are never two palettes.

:::
