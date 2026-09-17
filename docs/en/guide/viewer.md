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

| Group | What is read |
| --- | --- |
| **Blocks** | ATX and setext headings, paragraphs, fenced and indented code, block quotations, ordered and bullet lists to any depth, thematic breaks, HTML blocks |
| **Inline** | emphasis, strong, `code`, links, images, autolinks, hard line breaks, character references, backslash escapes |
| **GitHub** | tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs and e-mail addresses, footnotes, and the five [alert](https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts) kinds |
| **References** | `[label]: url "title"` definitions, resolved wherever in the file they are written |
| **And two more** | definition lists, and a heading's own `{#id}`, neither of which GitHub reads |

`parse` is where the options live:

::: fw react

```tsx
<MawyViewer
  value={document}
  parse={{ gfm: true, breaks: false, definitionLists: true, headingIds: true, frontmatter: true }}
/>
```

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  parse: const MawyParseOptions(
    gfm: true,
    breaks: false,
    definitionLists: true,
    headingIds: true,
    frontmatter: true,
  ),
);
```

:::

- **`gfm`** (default `true`) — GitHub's additions. Off, a `|` is a pipe and `~~` is four tildes.
- **`breaks`** (default `false`) — whether a single newline inside a paragraph is a line break. The CommonMark specification says it is not, while chat clients and issue trackers treat it as one. A reader who has never written Markdown expects the latter, so this is an option rather than a fixed behaviour.
- **`definitionLists`** (default `true`) — whether `: ` under a line of text is a term and what it means. See below.
- **`headingIds`** (default `true`) — whether a trailing `{#id}` on a heading is the name that heading is drawn under. See below.
- **`frontmatter`** (default `true`) — whether a run fenced by `---` at the very top of the document is the metadata it looks like. See below.

**A line of a table cell written as a list item is drawn as one.** A cell of a GitHub table holds no block, so `- dig<br>  - deeper<br>- [x] water` is words to every parser, this one included, and GitHub draws the dashes. This package draws each such line with the marker the list it reads as would have: a bullet for `-`, `*` or `+`, a checkbox for a task, the number for a numbered item, and each two spaces in front of the marker one step further in. The words are the same words either way; only the markers are drawn differently. A line that is a marker and nothing else, such as the `-` many tables put in an empty cell, stays a dash.

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

One of the two syntaxes here that GitHub does not read. It follows [PHP Markdown Extra](https://michelf.ca/projects/php-markdown/extra/#def-list):

```md
Markdown : A way of writing that reads as what it says.

Mawy : This. : And the editor beside it.
```

A term is a line of text, and what it means is a line opening with a colon **and a space**. Requiring the space is what keeps `:warning:` under a sentence from turning that sentence into a term. Several terms may share a meaning, several meanings may share a term, and a meaning may be a whole run of blocks if the lines after the first are indented. A blank line before a meaning spaces the whole list out, exactly as it does in a bullet list.

Pass `definitionLists: false` in `parse` to turn it off, for a document that has to mean exactly what it would mean on GitHub.

### Frontmatter

A run fenced by `---` at the very top of a document is metadata rather than something the document says. It is how every static site generator carries a title, a date and whatever else beside a document, and a reader is shown none of it.

```md
---
title: Reading a document
date: 2026-09-18
---

# The body starts here
```

Drawn as Markdown that is a rule with a heading underlined by another, which is what it used to come out as. It is read as metadata now and kept out of the document, so the page opens with the body.

The fence has to be the first line and the run has to be closed, by `---` or by `...`. A `---` at the top with nothing closing it is the rule it has always been, and so is one further down the page. Where the two readings collide — a `---`, a line of words, another `---` — this reads the metadata, which is what every reader of the notation does; pass `frontmatter: false` in `parse` for a document whose `---` at the top is a rule and means to be one.

Nothing is thrown away. [`MdDocument`](../api/types/md-document) carries the range it was written at, so an application that wants the title reads it out of the source it already has.

### Heading anchors

A heading's `id` is its own words, in the spelling GitHub uses, so a link written by hand against `#getting-started` lands where it would there. A heading that wants a different name says so at the end of the line:

```md
## What to try first {#what-to-try}
```

That is drawn as the words alone, under `id="what-to-try"`, and the outline links to the same name. The braces are markup and nothing draws them, the same way nothing draws the closing hashes of `## A heading ##`. Both heading syntaxes read one, the underlined form included.

This is the other syntax GitHub does not read, and it draws the braces instead. The difference is worth it: an anchor is written by hand _because_ something already links to it, and a heading whose words change later keeps the name those links use.

What is not an anchor stays the characters it was written with. `{.warning}` and `{key=value}` are a [directive](#directives)'s attributes and mean nothing on a heading. `## A {#b} c` is a heading about `{#b}`. And `\{#id}` is there for a heading that has to say the braces.

Two headings asking for the same anchor are told apart the way two headings with the same words are: the second is `id-1`. [`slugify`](../api/functions/slugify) is what a heading is called when it does not ask.

Pass `headingIds: false` in `parse` to turn it off, for a document that has to mean exactly what it would mean on GitHub. The braces are words in the heading then, and the anchor comes out of them along with everything else.

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

**A page can ask for links and pictures to be drawn some other way.** A page carrying documents its readers wrote may not want to send a reader wherever a comment points, or fetch whatever picture it names. `links` and `images` draw them as their words, as the characters they were written with, or not at all, and nothing is followed or fetched under any of the three:

::: fw react

```tsx
<MawyViewer value={comment.body} links="text" images="hide" />
```

:::

::: fw flutter

```dart
MawyViewer(value: comment.body, links: MawyLinkPolicy.text, images: MawyImagePolicy.hide)
```

:::

A footnote's number and the way back from a note are this library's own and stay, and the find bar searches only what is drawn. See [link and image policy](../api/types/drawing-policy) for what each value draws.

::: fw flutter

**Raw HTML is shown as the characters it was written with, and there is no option to change that.** Flutter has no HTML to draw it as, which is why the Flutter package has no `html` prop. The one exception is a bare `<br>` inside a table cell, which is drawn as a line break because a cell has no other way to hold one. The rest of this section applies to the React package only.

**Links are not opened either.** A tapped link does nothing until the application defines what opening one means, through `onLinkTap`. Handing a URL to the platform is not a viewer's decision. The scheme allowlist has already run, and the application handles the rest.

:::

::: fw react

**Raw HTML inside a document is inert until you ask for it.** `html` is the one prop that can change that:

| `html` | What a `<div>` in the document becomes |
| --- | --- |
| `'escape'` _(default)_ | the characters it was written with, shown as text. A bare `<br>` inside a table cell is drawn as a line break under every policy, since a cell has no other way to hold one |
| `'sanitize'` | a real `<div>`, with everything outside an allowlist of elements, attributes and URL schemes removed |
| `'raw'` | a real `<div>`, exactly as written, **including anything in it that runs** |

`'sanitize'` puts every name the document gives something under `user-content-`. An `id` becomes a global on the page, so `<a id="config">` is `window.config` in every browser, and a `name` does the same to `document`, so `<img name="getElementById">` shadows that method for every script around it. Under the prefix those names collide with nothing the page has. Links the document wrote to its own names move with them. A link to a heading does not, because a heading's anchor is the author's own words rather than markup. The prefix is the one GitHub uses, so a document written for GitHub keeps working.

A start tag and its end tag with Markdown between them, such as `An <u>underline</u>`, are two pieces of raw HTML to the parser, and are drawn as one element around the words between them under `sanitize` and `raw`. That holds for `b`, `del`, `em`, `i`, `ins`, `kbd`, `mark`, `s`, `small`, `strong`, `sub`, `sup` and `u`, written with no attributes and nested the way a browser would read them. Anything else is drawn a piece at a time, as the rest of this section describes.

`'sanitize'` parses with `DOMParser` rather than with a regular expression, on purpose. HTML's error recovery is the attack surface, and the only parser that agrees with a browser about what `<img src=x onerror=alert(1)>` means is a browser's. Where there is no `DOMParser`, such as a server render, it shows the markup rather than guessing.

**A few pieces of markup need no parser, and are drawn as elements everywhere.** They are the ones a browser has only one way to read. A `<br>` is one. An `<img>` is another, provided its attributes are nothing but `src`, `alt`, `width`, `height` and `title`, every value is quoted, and every `&` in a value either starts `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;` or `&#39;` or begins no reference at all. An `&` begins none when the value ends after it, when the next character is not a letter, a digit or `#`, or when letters and digits and then `=` follow it, which is how `?w=800&h=600` is written. `&utm_source=` is left out, because whether a browser decodes a name with any other character after it depends on the table of reference names. The third is a tag like `<u>` around some words. These are what an editor that wrote HTML for underline, a line break and a resized picture leaves in its documents, so `MawyDocument` draws them on a server and `MawyViewer` draws them in the HTML it sends, and the page does not move when it hydrates. The picture's address goes through the same check a Markdown image's does. Markup outside that set, even one attribute more or one value unquoted, is drawn the way the rest of this section describes, because accepting more would mean reading HTML differently from a browser.

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

| Item              | What it does                                                      |
| ----------------- | ----------------------------------------------------------------- |
| `'fontFamily'`    | whichever typefaces the viewer was given. See [below](#typefaces) |
| `'fontSize'`      | 13 to 26 pixels                                                   |
| `'lineHeight'`    | 1.3 to 2.4                                                        |
| `'letterSpacing'` | −0.04 to 0.16em                                                   |
| `'measure'`       | how wide the column of text may run                               |
| `'colorScheme'`   | light, dark, or whatever the system says                          |
| `'outline'`       | opens the headings panel                                          |
| `'find'`          | a bar that searches the drawn document                            |
| `'copy'`          | the Markdown source, to the clipboard                             |
| `'open'`          | the file picker                                                   |
| `'separator'`     | a hairline, for grouping a long list                              |

::: fw flutter

Here they are the values of `MawyViewerToolbarItem`, so the second row is `MawyViewerToolbarItem.fontSize`. The list is the same except for `open`, because this package does not open files.

:::

<Fw react="toolbar={false}" flutter="toolbar: const []" code /> is the whole of it gone — no text size, no palette, no outline, no find bar, no copy button, and nothing at all above the document.

<MawyDemo name="viewer/bare" flutter="viewer/bare" :height="300" />

There is no way to add a control that is not on that list, and that is deliberate. A toolbar that takes arbitrary children is one the library can no longer keep keyboard-operable.

::: fw react

It has the ARIA `toolbar` role rather than being a plain row of buttons. One Tab enters it and one Tab leaves, and the arrow keys, `Home` and `End` move between the controls inside. That way a keyboard-only reader reaches the document in two keystrokes instead of passing through eleven controls.

:::

::: fw flutter

Every control is a named `Semantics` button that exposes its pressed state, so a screen reader reads it as a toolbar. It is one tab stop, like the React package's, and the arrows move between the controls inside it. See [accessibility](#accessibility) below.

:::

## The frame

::: fw react

A viewer is either a surface with a frame around it or a document with the page around it, and `frame` is which.

`box`, the default, is the surface: a background of its own, a toolbar barred across one end with a line under it, and room around the prose so the first line does not sit on the edge. A reader can see where the viewer starts and the page stops, which is what a document being looked at _inside_ a larger page wants.

`floating` is the other one. Nothing wraps the document: no border, no bar across the end, the toolbar becomes a rounded group hovering over the text the way a phone puts its controls over what they act on, and [`--mawy-doc-padding`](../api/theming) goes to nothing so the page's own gutters are the only ones. This is for a document that _is_ the page — an article, a post, a README — where a box around the prose is a box around the whole screen and says nothing.

The ground under the document stays. A palette that reaches the text and not what it sits on is half a palette: a reader who picks dark in the toolbar would get light grey on the page's white. A page that means to have the document sit on its own ground says so with the token it already has, `--mawy-bg: transparent`.

`toolbarPlacement` is which end that toolbar is at, `top` or `bottom`. The find bar goes with it, because a find bar at one end with its toolbar at the other is a bar belonging to nothing, and both are drawn in the order they are read so a keyboard walks the page the way the page looks.

<MawyDemo name="viewer/floating" flutter="viewer/floating" :height="420" />

The document's padding is the one thing `floating` changes that is not chrome, and it is a custom property rather than a prop so a page can put some back:

```tsx
<MawyViewer
  value={post.body}
  frame="floating"
  toolbarPlacement="bottom"
  style={{ '--mawy-doc-padding': '28px 24px 96px' }}
/>
```

The outline stays a column beside the document rather than a card over it, because a card over the document covers the headings it points at — but with no surface to be divided from it grows a card of its own, so it still reads as a panel rather than as the first two inches of the prose. The toolbar keeps off it: a bar over a list of headings is a bar over something it has nothing to do with, so a floating group hangs from the document's own column.

The editor's status line is not a toolbar and is the bottom edge of the editor either way.

:::

::: fw flutter

The same two, `frame` and `toolbarPlacement`, with the same values. `MawyFrame.box` is a surface with the toolbar barred across one end, and `MawyFrame.floating` draws the document with no surface under it and the toolbar as a rounded bar over the text.

```dart
MawyViewer(
  value: document,
  frame: MawyFrame.floating,
  toolbarPlacement: MawyToolbarPlacement.bottom,
  padding: EdgeInsets.zero,
);
```

`padding` is where the room around the prose comes from here, and it is already a prop rather than a token — under `floating` it defaults to nothing, the same as the React package's.

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

| Role | Families |
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

The box is reserved before the image arrives, and `--mawy-doc-image-fit` is `contain`, so a picture of a different shape is letter-boxed rather than cut. Unset is the default, and then no box is reserved. Writing the dimensions in the document itself is the other approach. The way that means the same thing wherever the file is read is HTML, `<img src="…" width="800" height="600">`, which is drawn under `sanitize` in the browser and on a server, and which GitHub draws as well. A Markdown syntax for it, such as `![alt](url =800x600)`, is not something this parser reads: CommonMark and GitHub both read that run as text rather than as a picture, so a document written that way would lose its pictures everywhere but here.

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

::: fw react

**An application with translations of its own passes them as `strings`** rather than waiting for a locale: some or all of the words, by name, over the ones `locale` has. Give `lang` with them when they are in another language, so the `lang` attribute on the interface says so. See [`MawyStrings`](../api/types/locale#mawystrings) for the names and for the placeholders a few of them carry.

```tsx
<MawyViewer value={document} strings={{ lang: 'de', outline: t('viewer.outline') }} />
```

:::

::: fw flutter

**An application with translations of its own passes them as `strings`** rather than waiting for a locale. A set is a locale's words with the ones that differ changed, and once it is given `locale` says nothing. See [`MawyStrings`](../api/types/locale#mawystrings) for the names and for the placeholders a few of them carry.

```dart
MawyViewer(
  value: document,
  strings: MawyStrings.of(MawyLocale.en).copyWith(outline: t.contents),
)
```

:::

## Theming

::: fw flutter

The palette is [`MawyTokens`](../api/theming), which holds the stylesheet's custom properties under Dart names, value for value. `accent` corresponds to `--mawy-accent`, and both are `#5b34ea`. The two palettes are `MawyTokens.light` and `MawyTokens.dark`, and the viewer picks between them from `colorScheme` rather than from anything global, so one document can be dark inside a light screen.

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

## Heading levels

::: fw react

A `#` is an `h1`, a `##` is an `h2`, and so on down. That is right when the document _is_ the page, and wrong as soon as it is not: a blog post whose page writes the title as its own `h1` and then draws a document that opens with one has two, and a page with two `h1` elements has said it is about two things.

`headingBase` is which of `h1` to `h6` the document's own `#` is drawn as.

```tsx
<article>
  <h1>{post.title}</h1>
  <MawyDocument value={post.body} headingBase={2} />
</article>
```

Every heading moves by the same amount, so the hierarchy the author wrote survives: under `2` a `#` is an `h2` and a `##` is an `h3`. Nothing goes past `h6`, so `######` under a base of `3` is an `h6` rather than an element that does not exist — two headings that were different levels can come out the same one, which is the cost of a base that high.

The anchors do not move. A heading's `id` is its own words either way, so a link written by hand against `#getting-started` still lands, and so does the outline.

The two headings this library writes itself — the outline's title and the empty state's — are `h2` and stay there. See [Accessibility](#accessibility).

### The mark that links to a heading

A heading carries its own `id`, and a reader who wants to send somebody to one section of a long document has no way to read it off the page. So each heading is drawn with a `#` in the margin beside it, which appears while the pointer is over the heading and puts the heading's name in the address when it is followed.

```tsx
<MawyViewer value={value} headingAnchors={false} />
```

Turn it off where the page's address is not somewhere a reader can go back to — a document in a dialog, or a route whose fragment the application is already using for something of its own.

The mark is the pointer's way to a heading and nothing else's. It is out of the accessibility tree and takes no focus, because everything inside a heading is part of that heading's name, and `Link to this heading` read out after the words of every heading is the whole of what it would add. A keyboard reaches a heading through the outline panel, which says where it is going. The `#` itself is drawn by the stylesheet rather than written into the document, so a heading's characters stay the author's: `textContent` answers its words, and a copy of it takes nothing extra.

`headingAnchors` covers the address, not only the mark. Following an entry in the outline puts the heading's name there too, and leaves the history entry that takes the reader back where they were — so what a reader copies out of the address bar after using the outline is a link to that section. And an address that names a heading of this document is gone to, when the viewer opens and whenever the address changes afterwards. That last part is the viewer's own work rather than the browser's: the document is drawn once the component has mounted, which is after the browser has looked for what the address names and found nothing.

Turned off, the outline still goes to the heading. It just says nothing about it in the address, and an address the application wrote is left alone.

There is no mark on the editor's drawn document. A press beside a heading there puts the caret there, and a link that took the press instead would be a word of the document nobody could get a caret into. The editor's preview has them, and `MawyEditor` takes the same `headingAnchors`.

:::

::: fw flutter

A heading is a run of text at a size, and there is no `h1` to be. The depth is on the node, and [`MawyViewerAnchors`](../api/types/viewer-anchors) is how an application reads the structure back.

There is no mark beside a heading either. What it would do is write the heading's name into the page's address, and an app has no address bar to write it into — [`MawyViewerAnchors`](../api/types/viewer-anchors) is what an application scrolls to a heading with.

:::

## Mapping the page back to the source

::: fw flutter

The ranges are in the Dart tree too, with the same offsets: every `MdNode` carries one, text nodes included. What is missing is an element to hang them on, since there is no DOM, so an application reads a range from [`parseMarkdown`](../api/functions/parse-markdown) rather than from the screen. The rest of this section, which covers the attribute, applies to the React package only.

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

A document drawn by [`MawyDocument`](../api/components/mawy-document) carries none of them. Nothing on such a page reads a range — there is no component on it to ask — and the attribute is a quarter of the HTML that page sends.

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
