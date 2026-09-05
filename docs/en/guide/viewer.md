---
title: Viewer
order: 3
---

# The viewer

The viewer renders a Markdown document and does not edit it.

<MawyDemo name="viewer/basic" flutter="viewer/basic" :height="520" />

::: fw react

```tsx
import { MawyViewer } from 'mawy-react';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

:::

That is the whole of it. There is no theme object to fill in, nothing to register before a document renders, and no second library to do the rendering.

## Editor and viewer in one package

When the editor and the viewer use different Markdown implementations, one failure keeps happening: an author writes a document in the editor, it looks right there, and it renders differently for the reader. Every difference between the two implementations causes it, whether that is how a list nests, whether a line break is a break, or what an unclosed emphasis does.

Sharing the parser removes that failure. What the author saw in `preview` is what the viewer draws, because both go through the same code path.

::: fw flutter

That holds across the two packages as well, and it is checked. The Dart parser and the TypeScript one are the same files, the same functions and the same rules, and `packages/flutter/tool/parity.dart` runs both over every Markdown file in the repository and diffs the trees. A document that means one thing in a browser means the same thing in an app.

:::

## Using it without `value`

::: fw flutter

The Flutter package does not do this; `value` is required there. Opening a file needs a file-picker plugin, which this package does not include and an application usually already has. Your application reads the file and Mawy draws it, so this whole section applies to the React package only.

:::

::: fw react

`value` is optional. With no document to show, the viewer becomes a file picker: drop a `.md` file on it, or choose one.

<MawyDemo name="viewer/empty" />

Which half you get follows from which props you pass:

| You pass       | The viewer                       | Dropping a file                            |
| -------------- | -------------------------------- | ------------------------------------------ |
| nothing        | opens whatever it is given       | keeps it, and calls `onValueChange`        |
| `defaultValue` | starts there, then keeps its own | keeps it, and calls `onValueChange`        |
| `value`        | shows what you pass, always      | is off. Pass `fileDrop` to turn it back on |

`onValueChange` is called either way, with the text and the `File` it came from:

```tsx
<MawyViewer
  onValueChange={(markdown, file) => {
    console.log(file?.name, markdown.length);
  }}
/>
```

A file larger than five megabytes is refused rather than read. That is about a million words of Markdown, and the limit prevents a browser tab from freezing because somebody dropped a database dump on it.

**A viewer that cannot be given a document does not offer to open one.** `value` with no `onValueChange` means the application owns the document, so a file chosen here would have nowhere to go. The empty state says there is nothing to show yet, the button under it is not drawn, and the toolbar's `open` is disabled. That avoids a control that does nothing when it is pressed.

:::

::: fw flutter

**A mouse wheel notch is applied over several frames.** By default Flutter moves the offset to where the notch says on the next frame and draws nothing in between, which is why the same document scrolls less smoothly in Flutter than in a browser. Every browser and every native application on these platforms animates it, so this package does too. There is nothing to turn on, and a reader who has asked the platform for less movement gets the immediate jump back, which is what the stylesheet does under `prefers-reduced-motion`.

The source surface keeps the platform's own behaviour. A text field scrolls itself rather than being scrolled by the widget around it, so there is nothing to insert between them.

**A reader can select and copy the document's text.** Drag across it to select, and `Ctrl`/`Cmd`+`C` to copy. This is worth writing down because it had to be built: a document drawn as widgets selects nothing unless it is placed inside a region that allows it. There are no selection handles and no context menu, because both come from Material or Cupertino and this package uses neither. So the shortcuts are written out here, the same as `Enter` and the space bar.

**A document past four hundred blocks is built only where it can be seen.** Under that, every block is built however tall the document is. A selection can only take text that has been built, so the whole document stays selectable at that size. Over it, blocks come and go as the reader scrolls, and the cost of drawing the document, laying it out again when the type changes, and holding it in memory stops growing with its length. A document of two thousand four hundred blocks went from twenty-five thousand render objects to five hundred, and from a second to a tenth of one to lay out again after a change of type.

Four hundred blocks is past a long README, a reference page or a chapter. Past it, a selection reaches the three screens either way that the list keeps, and no further. The toolbar's copy button takes the whole document from the Markdown rather than from the page, so copying all of a long document does not go through a selection. None of this is configurable. Where every block sits is recorded as it is laid out, which lets the outline, the find bar and `anchors` keep working for blocks that are not on the screen.

:::

## Supported syntax

CommonMark, and GitHub's additions on top of it:

|  |  |
| --- | --- |
| **Blocks** | ATX and setext headings, paragraphs, fenced and indented code, block quotations, ordered and bullet lists to any depth, thematic breaks, HTML blocks |
| **Inline** | emphasis, strong, `code`, links, images, autolinks, hard line breaks, character references, backslash escapes |
| **GitHub** | tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs and e-mail addresses, footnotes, and the five [alert](https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts) kinds |
| **References** | `[label]: url "title"` definitions, resolved wherever in the file they are written |
| **And one more** | definition lists, which GitHub does not read |

`parse` is where the options live:

::: fw react

```tsx
<MawyViewer value={document} parse={{ gfm: true, breaks: false, definitionLists: true }} />
```

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  parse: const MawyParseOptions(gfm: true, breaks: false, definitionLists: true),
);
```

:::

- **`gfm`** (default `true`) — GitHub's additions. Off, a `|` is a pipe and `~~` is four tildes.
- **`breaks`** (default `false`) — whether a single newline inside a paragraph is a line break. The CommonMark specification says it is not, while chat clients and issue trackers treat it as one. A reader who has never written Markdown expects the latter, so this is an option rather than a fixed behaviour.
- **`definitionLists`** (default `true`) — whether `: ` under a line of text is a term and what it means. See below.

### CommonMark coverage

**640 of the specification's 652 examples**, run against the parser on every change. CommonMark ships a test suite with the specification, so the coverage can be stated as a number. It is in `packages/react/test/internal/markdown/commonmark.test.ts`, beside the list of the other 12.

Three of those are deliberate rather than missing: every URL is checked against a scheme allowlist, so `<made-up-scheme://foo>` is drawn as the words the author wrote. Five more are the same kind of choice: an empty destination is drawn as the author's words rather than as an `<a href="">` that does nothing. Most of the rest are edge cases, such as a tab inside a list item, a character reference the table does not carry, or a reference definition alone in a list item. Each one is written down with the reason it is there, so the list only gets shorter on purpose.

The Dart parser does not need to be run against the suite. The two parsers' trees are diffed over every awkward case and every Markdown file in the repository, so a tree that is right in one is the tree the other produces.

**Containers nest a hundred deep.** Past that nothing opens: the lines become the paragraphs they would be with no rules applied, and the markers on them stay as characters. Every container reads its own inside, so nesting costs a stack of calls as deep as the document. `> ` written a couple of thousand times is a four-kilobyte file with nothing in it, and anybody can send one to an application that draws documents from elsewhere. A hundred is deeper than anything written by hand and well short of the stack limit.

### Footnotes

A `[^label]` in a sentence becomes a number, and the note it points at is drawn under the document with a link back to where it was mentioned:

```md
Mawy parses its own Markdown.[^why]

[^why]: Only the parser can say where a piece of the document came from, and everything else here is built on that.
```

Three things are worth knowing, and all three are what GitHub does:

- **They are numbered by the order they are first mentioned**, not the order they are written in. The reader meets `1` before `2` whatever the file looks like.
- **A note nobody mentions is not drawn at all.** It is a note to the author, the same way a `[label]: url` nobody links to is.
- **A `[^label]` with nothing to point at stays as the characters it was written with**, rather than becoming a link to nowhere.

A note may be a whole run of blocks, such as a second paragraph, a list or a code block, as long as the lines after the first are indented four spaces. Where it was written does not matter: the parser lifts it out of the flow, so a note in the middle of a section is still drawn at the bottom.

### Definition lists

This is the one syntax here that GitHub does not read. It follows [PHP Markdown Extra](https://michelf.ca/projects/php-markdown/extra/#def-list):

```md
Markdown : A way of writing that reads as what it says.

Mawy : This. : And the editor beside it.
```

A term is a line of text, and what it means is a line opening with a colon **and a space**. Requiring the space is what keeps `:warning:` under a sentence from turning that sentence into a term. Several terms may share a meaning, several meanings may share a term, and a meaning may be a whole run of blocks if the lines after the first are indented. A blank line before a meaning spaces the whole list out, exactly as it does in a bullet list.

Pass `definitionLists: false` in `parse` to turn it off, for a document that has to mean exactly what it would mean on GitHub.

## Colouring a code block

::: fw flutter

Nothing is coloured by default, and that is deliberate. A highlighter is the largest piece a Markdown renderer can carry, and most documents have nothing to colour. So it is an argument, and an application that never references one never carries the grammars behind it, because a Dart build drops unreferenced code:

```dart
MawyViewer(value: document, highlight: mawyHighlighter);
```

`mawyHighlighter` is the React package's highlighter in Dart. `lib/src/highlight.dart` matches `src/highlight.ts` rule for rule, and `tool/parity.dart` diffs every token the two produce over a piece of every language either of them supports. So a code block coloured in a browser is coloured the same way in an app, the same guarantee the parser gives.

The supported languages are the ones a document usually shows: `js`, `ts`, `jsx`, `tsx`, `json`, `html`, `xml`, `css`, `bash`, `python`, `yaml`, `sql`, `dart`, `go`, `rust`, `java`, `c`, `cpp` and the other names each of those answers to. The result is **approximate**, deliberately and permanently. A template literal with a brace in it or a regular expression that reads as division comes out slightly wrong, which does not matter, because colour does not have to be exact.

For anything more than that, `MawyHighlighter` is the whole interface and any grammar behind it is a few lines:

```dart
class MyHighlighter extends MawyHighlighter {
  const MyHighlighter();

  @override
  bool supports(String language) => language == 'dart';

  @override
  List<MawyCodeToken> highlight(String code, String language) => tokensFor(code);
}
```

A highlighter returns **tokens rather than markup**, following the same principle as the rest of the library. It hands back text and names: `keyword`, `string`, `comment` and about ten more. This package decides what each one becomes, so nothing reaches the screen as markup and a highlighter that is wrong cannot add anything to a document.

A highlighter has one requirement: joining its tokens back together **must** reproduce the code. What comes back is joined and checked against what went in, and a block whose tokens do not add up is drawn plain. Losing the colour is better than showing something the document does not say.

The colours themselves are eight fields on `MawyTokens`: `highlightComment`, `highlightString`, `highlightNumber`, `highlightKeyword`, `highlightType`, `highlightFunction`, `highlightVariable` and `highlightPunctuation`. They are the same eight the React package declares as `--mawy-hl-*`, value for value.

:::

::: fw react

Nothing is coloured by default, and that is deliberate. A highlighter is the largest piece a Markdown renderer can carry, and most documents have nothing to colour. So it is a prop, and the prop takes a **function**, so nothing is fetched until a document with a language on a fence is drawn:

```tsx
<MawyViewer
  value={document}
  highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
/>
```

`mawy-react/highlight` is a separate entry point, so an application that never references it never ships it. It holds Mawy's own highlighter, for the languages a document usually shows: `js`, `ts`, `jsx`, `tsx`, `json`, `html`, `xml`, `css`, `bash`, `python`, `yaml`, `sql`, `dart`, `go`, `rust`, `java`, `c`, `cpp` and the other names each of those answers to. The result is **approximate**, deliberately and permanently. A template literal with a brace in it or a regular expression that reads as division comes out slightly wrong, which does not matter, because colour does not have to be exact.

For anything more than that, `MawyHighlighter` is the whole interface and Shiki or Prism behind it is a few lines:

```tsx
const shiki: MawyHighlighter = {
  supports: (language) => languages.includes(language),
  highlight: async (code, language) => toMawyTokens(await codeToTokens(code, { lang: language }))
};
```

A highlighter returns **tokens rather than markup**, following the same principle as the rest of the library. It hands back text and names: `keyword`, `string`, `comment` and about ten more. This package decides which element each one becomes, so nothing reaches the page as a string of HTML and a highlighter that is wrong cannot put a `<script>` in a document. A name that is not on the list is drawn as plain text.

A highlighter has one requirement: joining its tokens back together **must** reproduce the code. What comes back is joined and checked against what went in, and a block whose tokens do not add up is drawn plain. Losing the colour is better than showing something the document does not say.

Each coloured piece carries its source range, like everything else the viewer draws, so a click in the middle of a code block still finds the character it landed on.

The colours themselves are eight custom properties: `--mawy-hl-comment`, `--mawy-hl-string`, `--mawy-hl-number`, `--mawy-hl-keyword`, `--mawy-hl-type`, `--mawy-hl-function`, `--mawy-hl-variable` and `--mawy-hl-punctuation`. They are declared on `.mawy-root` in both palettes, and an application can redeclare them.

:::

## Directives

A viewer draws what Markdown can express, and a document sometimes needs something Markdown has no syntax for: a video, a formula, the house callout every page on your site uses. There are two obvious ways to handle that, and both have problems. Raw HTML is the one thing the library's safety rests on not needing. A library that knows about videos then has to know about everything else too.

A directive is the third way. The parser reads a **shape** and stops there. It does not interpret what `youtube` is, which is what lets a document carry one, and the application decides what the shape means.

There are three kinds, and the number of colons tells them apart:

```md
:::callout[Careful]{kind=warning} Blocks, and they are parsed as blocks: **emphasis**, lists, code. :::

::youtube{id=dQw4w9WgXcQ}

Press :kbd[Ctrl] to go.
```

A container holds blocks and closes on colons of its own length or more, so `::::` can hold a `:::`. A leaf is a single line with nothing under it. A text directive sits inside a sentence.

::: fw react

Which component each name becomes is one prop:

```tsx
const Callout = ({ attributes, label, children }: MawyDirectiveProps) => (
  <aside className={`callout callout-${attributes.kind ?? 'note'}`}>
    {label ? <h3>{label}</h3> : null}
    {children}
  </aside>
);

<MawyViewer value={document} directives={{ callout: Callout, youtube: YouTube }} />;
```

A component is handed the `name`, the `attributes`, the `label` already drawn, a container's `children` already drawn, the `range` it was written at and the `source` it was written with. So it composes React elements and never sees a string of markup. The safety guarantee holds across this extension point: there is still no `innerHTML` between the Markdown and the page, and a directive that draws something dangerous was written by the application.

:::

::: fw flutter

Which widget each name becomes is one argument:

```dart
MawyViewer(
  value: document,
  directives: <String, MawyDirectiveBuilder>{
    'callout': (BuildContext context, MawyDirective directive) => Callout(
      kind: directive.attributes['kind'] ?? 'note',
      title: directive.label,
      children: directive.children!,
    ),
  },
);
```

A builder is handed the `name`, the `attributes`, the `label` already drawn as an `InlineSpan`, a container's `children` already drawn as widgets, the `range` it was written at and the `source` it was written with. So it composes widgets and never sees markup of any kind. A text directive is placed in the sentence as a `WidgetSpan`, so its builder should return something that fits on a line of text.

:::

<MawyDemo name="viewer/directives" flutter="viewer/directives" :height="460" />

`{…}` is written the way it is everywhere else this syntax is used: `key=value`, `key="a value with spaces"`, `#id` and `.a .b`, which arrive as `id` and `class`. A bare `key` arrives with an empty string and is how a flag is written. Every value is a string, because a string is all the document supplied. Reading one as a number, and deciding what a missing one means, is the component's job.

**An unregistered name is drawn as the characters it was written with.** Raw HTML gets the same treatment under the default `html` policy, for the same reason: a viewer that was never told what a construct means should show what the author wrote rather than quietly drop part of a document. It is also the only fallback that loses nothing, since an unhandled `::youtube{id=…}` has no content inside it to fall back _to_.

::: fw react

On the `wysiwyg` surface those characters map to the source one for one, so an unregistered directive is editable exactly where it was typed.

:::

Two rules here are narrower than the [`remark-directive`](https://github.com/remarkjs/remark-directive) extension this syntax comes from, and both are about not changing what a document already said:

- **The colons are followed immediately by the name.** `::: tip` with a space stays the paragraph it was, so every document that already writes containers that way keeps its meaning.
- **An inline directive carries a label or attributes.** `:name` on its own is not one, so `Note:` and `12:30` and `:warning:` in a sentence stay exactly what they are.

This parser reads everything else the extension reads, so a document written for one works with the other.

## Safety

A viewer renders content that the person running it did not write, so the default is the safe one.

::: fw react

**The document becomes React elements, not a string of HTML.** There is no `innerHTML` on the path from Markdown to the page: a node in the parsed document can only become an element the renderer has a `case` for. Rather than escaping carefully, the structure leaves nothing to escape.

:::

::: fw flutter

**The document becomes widgets, never a string.** There is no markup on the path from Markdown to the screen: a node in the parsed document can only become a widget the renderer has a `case` for. Rather than escaping carefully, the structure leaves nothing to escape.

:::

::: fw react

**A link opens in a new tab.** `linkTarget` is `'blank'` by default, which puts `target="_blank"` and `rel="noopener noreferrer"` on it. A viewer is usually a piece of a page rather than the whole page, so a reader who follows a link out and comes back should find the document where they left it, and in an editor there is unsaved work behind that link. `linkTarget="self"` is for an application showing a document _as_ its page. A footnote's number and the arrow back from it point at the same page, so neither is affected.

:::

**Every URL is checked, in Markdown as much as in HTML.** `[click](javascript:…)` is plain Markdown with no HTML anywhere near it, so the scheme allowlist is not part of the HTML option and is not switched off with it. A refused destination is drawn as the words the author wrote, with no link around them, so a reader sees the sentence rather than a link that does nothing.

::: fw flutter

**Raw HTML is shown as the characters it was written with, and there is no option to change that.** Flutter has no HTML to draw it as, which is why the Flutter package has no `html` prop. The rest of this section applies to the React package only.

**Links are not opened either.** A tapped link does nothing until the application defines what opening one means, through `onLinkTap`. Handing a URL to the platform is not a viewer's decision. The scheme allowlist has already run, and the application handles the rest.

:::

::: fw react

**Raw HTML inside a document is inert until you ask for it.** `html` is the one prop that can change that:

| `html` | What a `<div>` in the document becomes |
| --- | --- |
| `'escape'` _(default)_ | the characters it was written with, shown as text |
| `'sanitize'` | a real `<div>`, with everything outside an allowlist of elements, attributes and URL schemes removed |
| `'raw'` | a real `<div>`, exactly as written, **including anything in it that runs** |

`'sanitize'` puts every name the document gives something under `user-content-`. An `id` becomes a global on the page, so `<a id="config">` is `window.config` in every browser, and a `name` does the same to `document`, so `<img name="getElementById">` shadows that method for every script around it. Under the prefix those names collide with nothing the page has. Links the document wrote to its own names move with them. A link to a heading does not, because a heading's anchor is the author's own words rather than markup. The prefix is the one GitHub uses, so a document written for GitHub keeps working.

`'sanitize'` parses with `DOMParser` rather than with a regular expression, on purpose. HTML's error recovery is the attack surface, and the only parser that agrees with a browser about what `<img src=x onerror=alert(1)>` means is a browser's. Where there is no `DOMParser`, such as a server render, it shows the markup rather than guessing.

So the browser's first paint matches the server's output, and the elements arrive on the render after it. That is deliberate: drawing them straight away would have React find elements where the server sent characters, which is a hydration mismatch. An application that never renders on a server never hydrates, so its first render is already the browser's, with nothing deferred and nothing flashing.

`'raw'` removes nothing and checks nothing. A `<script>` in the document runs, an `onerror` on an image runs, and an `<iframe>` loads, all of it in the page's own origin, with the page's own cookies and whatever the signed-in reader can reach. **Anybody who can put characters into the document can do anything the application can do**: read the session, call the API as that reader, and rewrite the page.

Set it only where the document is the application's own, or has already been made safe by something upstream that the application trusts. A report about rendering untrusted Markdown with it set is [out of scope](https://github.com/jooy2/mawy/blob/main/SECURITY.md) as a vulnerability, because that is the documented meaning of the value. Use `'sanitize'` for a document that came from somewhere else.

:::

## The toolbar

The toolbar controls how the document is **set**, not what it says. A reader can turn the text up, widen the line spacing, or switch to a serif, and the document underneath is untouched.

::: fw react

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  toolbar: const <MawyViewerToolbarItem>[
    MawyViewerToolbarItem.fontSize,
    MawyViewerToolbarItem.colorScheme,
  ],
);
```

:::

<MawyDemo name="viewer/minimal" flutter="viewer/minimal" :height="360" />

::: fw react

`toolbar` takes `true` for all of it, `false` for none, or the controls to draw and the order to draw them in:

:::

::: fw flutter

`toolbar` takes a list: `kMawyViewerToolbar` for all of it, `const []` for none, or the controls to draw and the order to draw them in.

:::

| Item              | What it does                                                       |
| ----------------- | ------------------------------------------------------------------ |
| `'fontFamily'`    | whichever typefaces the viewer was given. See [below](#typefaces)  |
| `'fontSize'`      | 13 to 26 pixels                                                    |
| `'lineHeight'`    | 1.3 to 2.4                                                         |
| `'letterSpacing'` | −0.04 to 0.16em                                                    |
| `'measure'`       | how wide the column of text may run                                |
| `'colorScheme'`   | light, dark, or whatever the system says                           |
| `'outline'`       | opens the headings panel                                           |
| `'copy'`          | the Markdown source, to the clipboard                              |
| `'open'`          | the file picker                                                    |
| `'separator'`     | a hairline, for grouping a long list                               |

::: fw flutter

Here they are the values of `MawyViewerToolbarItem`, so the second row is `MawyViewerToolbarItem.fontSize`. The list is the same except for `open`, because this package does not open files.

:::

There is no way to add a control that is not on that list, and that is deliberate. A toolbar that takes arbitrary children is one the library can no longer keep keyboard-operable.

::: fw react

It has the ARIA `toolbar` role rather than being a plain row of buttons. One Tab enters it and one Tab leaves, and the arrow keys, `Home` and `End` move between the controls inside. That way a keyboard-only reader reaches the document in two keystrokes instead of passing through eleven controls.

:::

::: fw flutter

Every control is a named `Semantics` button that exposes its pressed state, so a screen reader reads it as a toolbar. It is one tab stop, like the React package's, and the arrows move between the controls inside it. See [accessibility](#accessibility) below.

:::

## Typefaces

By default the menu offers three, and they are roles rather than font names: `sans`, `serif` and `mono`, drawn with whatever is already on the reader's machine. Nothing is downloaded and nothing can fail.

::: fw flutter

Those three are the whole of it here. `MawyFontFamily` has no fourth value and there is no `fonts` list to add one to. The catalogue of families and the stylesheet fetched on first use, which the React half of this section covers, only apply in a browser. A Flutter application declares the fonts it ships in `pubspec.yaml` long before a viewer is built.

A bundled face needs a name, which is what `fontFamilyName` takes:

```dart
MawyViewer(
  value: document,
  defaultTypography: const MawyTypography(
    fontFamily: MawyFontFamily.serif,
    fontFamilyName: 'Archive',
  ),
);
```

Left out, each of the three roles maps to whatever the platform uses for that role. Set, it maps to the family named. The role still decides what the toolbar calls it and which of the three is selected, and `fontFamilyName` decides what is actually drawn.

The rest of this section applies to the React package only.

:::

::: fw react

Web fonts are one prop away, and they are a prop rather than a default on purpose. A viewer is a component inside somebody else's page, and one that opens a connection to a font CDN on its own decides for that page about privacy, offline behaviour, and a request its content policy may refuse. So the library ships the list and the application opts in:

```tsx
import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy-react';

<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />;
```

Every family in `MAWY_WEB_FONTS` is under the SIL Open Font License, which permits commercial use, embedding and redistribution. Nothing on the list needs a licence bought for it.

|  |  |
| --- | --- |
| **Sans** | Inter, IBM Plex Sans, [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) |
| **Serif** | Source Serif 4, Literata, Lora, EB Garamond |
| **Mono** | JetBrains Mono |
| **Korean** | Pretendard, Noto Sans KR, Noto Serif KR, Nanum Myeongjo, Gowun Dodum |

The Korean families are on the list rather than left to the fallback. A typeface menu with only Latin faces leaves a Korean document set in something nobody chose.

Nothing is fetched until it is needed. The font the document is already set in arrives when the viewer mounts, and the rest arrive when the typeface menu is first opened. They have to arrive then, because every name in that menu is drawn in its own face. A reader who never opens it never requests anything.

Your own list is the same shape:

```tsx
<MawyViewer
  value={document}
  fonts={[
    { id: 'sans' },
    { id: 'house', label: 'Söhne', stack: "'Söhne', system-ui, sans-serif" },
    { id: 'archive', label: 'Archive', stack: "'Archive', serif", href: '/fonts/archive.css' }
  ]}
/>
```

`id` is what `typography.fontFamily` is set to. `stack` defaults to `var(--mawy-font-{id})`, which keeps the three built-in roles in the stylesheet. `href` is a stylesheet fetched once, the first time the font is drawn. Leave it out for a font the page already loads.

:::

## Setting the type

::: fw react

Every typography value reaches the page as a `--mawy-doc-*` custom property, so there are two ways to set one and both end up in the same place.

Through the prop, with the viewer keeping the settings:

```tsx
<MawyViewer
  value={document}
  defaultTypography={{ fontSize: 18, measure: 'wide' }}
  onTypographyChange={(typography) => localStorage.setItem('type', JSON.stringify(typography))}
/>
```

Or through CSS, with the toolbar left off entirely:

```css
.reader .mawy-md {
  --mawy-doc-size: 18px;
  --mawy-doc-line-height: 1.8;
}
```

Anything left out of `typography` keeps its default, so `{ fontSize: 18 }` on its own is enough.

The document's line height and letter spacing are declared on the text itself, not only on the container around it. An inherited value loses to _any_ declaration on the element, so without this, one `article p { line-height: 28px }` in the surrounding page would leave the line-height control changing nothing a reader can see.

**An image can be given a box to arrive into.** Markdown has nowhere to write a picture's width and height, so nothing on the page knows how much room to keep, and everything under it moves when the image loads. The document cannot supply that, but an application that knows the shape of its pictures can:

```css
.my-docs {
  --mawy-doc-image-aspect: 16 / 9;
}
```

The box is reserved before the image arrives, and `--mawy-doc-image-fit` is `contain`, so a picture of a different shape is letter-boxed rather than cut. Unset is the default, and then no box is reserved. Writing the dimensions in the document itself is the other approach, and it is not a syntax this parser reads today.

:::

::: fw flutter

There is one way to set it, and that is the argument. `MawyTypography` has a default for every field, so naming one of them is enough and the rest keeps its value:

```dart
MawyViewer(
  value: document,
  defaultTypography: const MawyTypography(fontSize: 18, measure: MawyMeasure.wide),
  onTypographyChange: (MawyTypography typography) => save(typography),
);
```

`defaultTypography` sets a starting point and leaves the viewer holding its own settings. `typography` moves ownership to the application: the toolbar still reports what the reader chose through `onTypographyChange`, and nothing changes on screen until the application passes the new value back. `onTypographyChange` is called either way, so the code that remembers a reader's choice is the same in both.

To change one field of settings you already have, use `copyWith`:

```dart
setState(() => _type = _type.copyWith(fontSize: 18));
```

The sizes are logical pixels rather than CSS ones, and the measure widths are 560, 704 and 880. They are the same three columns at the same 16-pixel body size.

:::

## The language of the interface

The toolbar's labels, the menus, the panel headings and every sentence a screen reader is given are written by the library. `locale` sets which language they are in:

::: fw react

```tsx
<MawyViewer value={document} locale="ko" />
```

:::

::: fw flutter

```dart
MawyViewer(value: document, locale: MawyLocale.ko)
```

:::

**English and Korean**, and `en` is the default. It says nothing about the document itself: a Korean document in a viewer whose interface is English is a common case, so the two settings are kept separate.

Both packages ship the same set of words under the same names, so a screen that reads one way in a browser reads the same way in an app. Adding a language means writing a table in `src/internal/i18n.ts` and its counterpart in `lib/src/internal/i18n.dart`. Both are required, and a locale that exists in only one package is not one this library offers.

## Theming

::: fw flutter

The palette is [`MawyTokens`](../api/#mawytokens), which holds the stylesheet's custom properties under Dart names, value for value. `accent` corresponds to `--mawy-accent`, and both are `#5b34ea`. The two palettes are `MawyTokens.light` and `MawyTokens.dark`, and the viewer picks between them from `colorScheme` rather than from anything global, so one document can be dark inside a light screen.

To redeclare one, pass `tokens`. It takes a function of the brightness rather than a palette, because a viewer settles on its brightness only after it has been handed everything else, from `colorScheme` or from the platform when that is `system`. A document that follows the platform needs values ready in both palettes, not only the one it opened on. `copyWith` builds a palette without rewriting thirty-one colours:

```dart
MawyViewer(
  value: document,
  tokens: (Brightness brightness) =>
      MawyTokens.of(brightness).copyWith(accent: const Color(0xFFB8005C)),
);
```

`MawyEditor` takes the same argument and passes it to its preview, so an editor and the document it is editing are never in two palettes.

The export is also for an application drawing its own interface beside a document and wanting the same colours in it:

```dart
final MawyTokens tokens = MawyTokens.of(Theme.of(context).brightness);

Container(color: tokens.backgroundSunken, child: /* … */);
```

`MawyRadius` and `MawyMotion` work the same way for the corner radii and for the single duration and curve that everything animated shares.

:::

::: fw react

Every colour the viewer draws with is a `--mawy-*` custom property declared on `.mawy-root`. Theming means redeclaring one:

```css
.mawy-root {
  --mawy-accent: #b8005c;
  --mawy-radius-lg: 4px;
}
```

They are on `.mawy-root` rather than on `:root` on purpose. A component library has no reason to write to the document element, and a viewer that read its palette from `:root` could not be dark inside a light page, which a single embedded document often needs to be.

:::

The light and dark palettes are chosen by `colorScheme`, which is `system` unless you set it. `system` follows the platform setting: `prefers-color-scheme` in a browser, the platform brightness in an app. `light` and `dark` do not follow it, so an application with its own switch can drive the viewer from that, and a reader on a dark machine still gets the light document you asked for.

## Mapping the page back to the source

::: fw flutter

The ranges are in the Dart tree too, with the same offsets: every `MdNode` carries one, text nodes included. What is missing is an element to hang them on, since there is no DOM, so an application reads a range from [`parseMarkdown`](../api/#parsemarkdown) rather than from the screen. The rest of this section, which covers the attribute, applies to the React package only.

:::

::: fw react

Every element the viewer draws carries `data-mawy-range="start,end"`. Those are the offsets, in the Markdown it was given, of that piece's first character and of the one after its last. Blocks, list items, table rows and cells all carry one, as do the inline elements inside them: emphasis, links, code spans and images.

A code block carries two ranges. The box around it covers the whole thing, fences and info string and indent. The `code` element inside covers the code alone, which is the part a caret can be in. That position exists even with nothing between the fences, where the two offsets are the same number.

In a document that reads `# Title`, a blank line, `## Second`, that second heading is drawn as:

```html
<h2 id="second" class="mawy-md-heading" data-mawy-range="9,18">Second</h2>
```

A range is the only way back from a place on the page to the place in the document it was drawn from. The editor's `split` reads it in two places: to scroll the preview to the block the top line of the source is in, and to put the caret on the word a click in the preview landed on. An application can use it the same way, for a comment pinned to a paragraph or an "edit this section" control beside a heading. The offsets index the string you passed, in UTF-16 code units, so `value.slice(start, end)` is the Markdown behind whatever was clicked.

Text nodes are the one thing on the page with no range, having no attributes to put one in. They do not need one. A run of text is bounded by the elements on either side, which is enough to locate it in the source between them: a `<strong>` drawn from `**bold**` contains `bold` at exactly one place inside those eight characters.

:::

## Accessibility

::: fw react

- The toolbar is a `toolbar` with one tab stop and arrow-key movement inside it.
- Every icon button has a name; nothing is announced as "button".
- Menus close on `Escape` and give the focus back to the control that opened them.
- Following an outline entry moves the focus as well as the scroll, so the next `Tab` carries on from the heading rather than from the panel.
- A code block's copy button is invisible until the pointer or the focus is on it, and is never removed from the layout. `Tab` walks past a button that is not in the layout.
- A wide table and a long line of code each scroll sideways inside their own box, and each is a tab stop, so a keyboard reaches the right-hand end of them.
- `Escape` puts the tooltips away, and the next move of the pointer brings them back. Nothing is lost, because every button they name already says the same words to a screen reader.
- The interface declares the language of its own words, and says nothing about the document's. That language is the author's, and this library does not know it.
- Animation is dropped under `prefers-reduced-motion`.

**The two headings this library writes are `h2`, and they stay that way.** They are the outline panel's title and the empty state's. The document's own heading levels belong to the author, so `# ` is an `h1` wherever the viewer is put. Inside a page whose outline makes `h2` wrong, restyle or relabel them from the outside: they are `.mawy-outline-title` and `.mawy-empty-title`. Even a prop for the level would leave the document's own levels where the author put them.

:::

::: fw react

Every surface is run through [axe](https://github.com/dequelabs/axe-core) on every change: the viewer with a document and as the file picker, all four editor modes, the outline open, a menu open, and find and replace open, each in both palettes. What that found is already in the list above. A task list's checkbox is named by the line beside it, the palette's faintest text was raised until it meets AA on both backgrounds, the editing surface is a `div` rather than an `article` because ARIA does not allow a document section to be a `textbox`, and the link back from a footnote is underlined rather than only coloured.

An automated pass is a minimum. What it cannot catch, such as arrow keys inside the toolbar or where the focus lands after an outline entry, is asserted one case at a time in the same suite.

:::

::: fw flutter

- Every control is a `Semantics` button with a name and, where it toggles, a state, so a screen reader reads it as a toolbar.
- The toolbar is one tab stop, and the arrows move between the controls inside it. `Home` and `End` go to the ends of the row, and `Enter` and the space bar press whichever control the focus is on.
- A menu opens with the focus already in it, closes on `Escape`, and gives the focus back to the button it came from. It has to open that way here, unlike in the React package: the panel is put up through the `Overlay`, so it is nowhere near its own button in the order `Tab` walks, and reaching it would mean travelling the whole document.
- The outline's entries are tab stops of their own, one press of `Tab` each, the way the React package's `<button>`s in an `<ol>` are. They do not use the toolbar's single stop with arrow keys, because a short list of headings is not worth a second way of moving through it.
- Headings, links and images carry their own semantics through the document, and following an outline entry moves the focus as well as the scroll, so the next `Tab` carries on from the heading rather than from the panel. The heading itself is not a tab stop. It uses `skipTraversal`, the Dart equivalent of the web's `tabIndex = -1`, so the focus can be put there but `Tab` does not stop on it.
- Text scales with the platform's own text size, because the sizes are logical pixels through `MawyTypography` rather than anything baked in.
- Animation is dropped where the platform's reduce-motion setting asks for it. It reads `MediaQuery.disableAnimationsOf`, which is the same setting the stylesheet reads as `prefers-reduced-motion`, so a reader who turned it on gets the same result from both packages.

:::

## Printing

On paper, only the document is printed. The toolbar, the outline, the status bar and the find box are all controls to press, which paper cannot do, so none of them prints. Neither does a footnote's link back to where it was mentioned.

::: fw react

Three other things change for paper. A viewer given a height scrolls inside it, and a box with a height prints one screenful and loses the rest, so on paper it grows as tall as the document. The palette goes dark-on-light whatever the reader chose, because printing a dark theme fills the page with ink. And a link's destination is written out after it, since "see the docs" on paper points nowhere.

In the editor, the drawn document is what prints. In `split` the source pane is left out. In `plain`, where there is no drawn document, the source prints as text rather than as a `<textarea>`, because a textarea puts only what is inside its own box on the page and loses the rest of the file.

Nothing has to be switched on. It is `@media print` in the stylesheet already imported, so `Ctrl`+`P` on a page with a viewer on it works as it should.

:::

::: fw flutter

Printing is handled by the platform rather than the package. An app prints through a plugin or the operating system's own sheet, and what it hands over is a widget tree rather than a page. This section applies to the React package only.

:::
