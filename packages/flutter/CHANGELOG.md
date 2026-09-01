# Changelog

> This package's history. Each language Mawy ships for keeps its own changelog beside its own manifest, because they version independently.

## Unreleased

### Added

- **The outline panel is reachable by a keyboard, and following an entry takes the focus with it.** Every entry is its own tab stop and is pressed with `Enter` or the space bar, the way the React package's `<button>`s in an `<ol>` are — not the toolbar's one stop and a set of arrows, because a list of a document's headings is not a row worth learning a second way of moving through.

  It was the one piece of the accessibility work that got left behind: the toolbar, the menus, the sliders and the reset links were all made to take the focus, and the entries stayed a `GestureDetector` — which is a panel a keyboard can open and cannot then use.

  Following an entry now moves the focus as well as the scroll, so the next `Tab` carries on from the heading rather than from the panel. The heading is `skipTraversal`, which is the web's `tabIndex = -1` said the other way round: somewhere the focus can be put, and not somewhere `Tab` stops on the way past. That was the last thing the viewer guide said this package did not do yet, and the sentence is gone.

- **Finding text, and replacing it.** `Mod`+`F` opens a find bar over the source, and the toolbar has a `find` button that does the same thing. `Enter` goes to the next match, `Shift`+`Enter` to the one before, `Escape` closes the bar and gives the focus back to the document, and whatever was selected on one line is already in the box when it opens.

  It is there because a platform's own find reaches a page of text and not the inside of a text field, and the source surface is one — the same justification the React package's has, which is the only one either of them needs.

  The arithmetic is `src/internal/search.ts` in Dart, function for function, and `tool/parity.dart` diffs the two over `tool/searches.json`: whether `aa` in `aaaa` is two matches or three, which one `next` goes to from where the caret is, and what `replace all` does to a document are decisions, and they are the same decisions in both. Plain text and never a regular expression, for the reason written down over there — a Markdown document is full of `*`, `[`, `.` and `+`.

  `findMatches`, `matchFrom`, `replaceMatch`, `replaceAll` and `MawyMatch` are exported, like the commands are, for an application that would rather drive them from its own chrome.

- **`MawyEditorToolbarItem.find`**, which is on the default toolbar. `open` and `save` are still the application's: a file picker is a plugin rather than a widget, and which one an app has already chosen is not a decision a Markdown editor should make on its behalf.

- **The whole Latin-1 block of character references**, which is four more of CommonMark and takes the number from 630 to 634. The React package's table change, mirrored here in the same commit: ninety-seven names — `&ouml;`, `&eacute;`, `&szlig;`, `&frac12;` and the rest — read everywhere the specification asks for a reference.

- **One more of CommonMark, and the number moved from 629 to 630.** The React package's parser change, mirrored here in the same commit: a numeric character reference is at most seven digits, or six in hexadecimal, so `&#87654321;` is text rather than a reference to a code point that does not exist.

- **Two more of CommonMark, and the number moved from 627 to 629.** The React package's parser change, mirrored here in the same commit: a no-break space is not one of the five characters the specification calls whitespace, so it does not separate a destination from a title; and a thematic break wins over a list item inside a list as much as outside one.

- **Two more of CommonMark, and the number moved from 625 to 627.** The React package's parser change, mirrored here in the same commit: closing a link deactivates the `[` openers to its left and no longer the `![` ones, so `![foo [bar](/url)](/url2)` is an image whose alt text is `foo bar` rather than a sentence with a link in it.

- **Four more of CommonMark, and the number moved from 621 to 625.** The React package's parser change, mirrored here in the same commit: a link reference definition's label may run over more than one line, may not hold an unescaped bracket, and may not be nothing but whitespace — and a setext underline over a paragraph that was nothing but definitions is a line of text rather than an underline.

- **Three more of CommonMark, and the number moved from 618 to 621.** The React package's parser change, mirrored here in the same commit: an attribute name is the specification's rule rather than "anything that is not a space or a quote", so `<a h*#ref="hi">` is a sentence about a tag rather than a tag; and `<!-->` and `<!--->` are comments in their own right rather than the start of one that runs to the next `-->`.

- **A viewer takes a palette of its own.** `MawyViewer.tokens` and `MawyEditor.tokens` are the React package's `--mawy-*` custom properties said in Dart, and the whole of what theming is here:

  ```dart
  MawyViewer(
    value: document,
    tokens: (Brightness brightness) =>
        MawyTokens.of(brightness).copyWith(accent: const Color(0xFFB8005C)),
  );
  ```

  It is a `MawyTokensBuilder` rather than one palette because a viewer settles on its brightness *after* it has been handed everything else — from `colorScheme`, or from the platform where that is `system` — and a document that follows the platform has to be able to follow it in both palettes rather than only in the one it opened on. An editor passes what it is given to its preview, so an editor and the document it is editing are never two palettes.

- **`MawyTokens.copyWith`**, which is how one of those is written: start from `MawyTokens.of(brightness)` and name what differs. Thirty-one arguments to change one colour is not a palette anybody writes twice.

- **The three pieces of accessibility this package was missing**, and they were the three the React package had:

  **The toolbar is one tab stop.** A keyboard enters it once, leaves it once, and moves between the controls inside it with the arrows — `Home` and `End` for the ends of the row, `Enter` and the space bar for whichever control the focus is on. Eleven buttons above a document used to be eleven things to step over on the way to reading it, and now they are one. It is `src/internal/roving.ts` in Dart, in `src/internal/roving.dart`, because there are two toolbars here and two copies of a focus model drift into two different keyboards.

  **A menu closes on `Escape`** and gives the focus back to the button it came from. It also opens with the focus already in it, which is the one place this differs from the React package and is not a preference: a panel there is the next element after its own button, and a panel here is put up through the `Overlay`, which is nowhere near that button in the order `Tab` walks.

  **Animation is dropped where the platform asks for less of it** — `MediaQuery.disableAnimationsOf`, which is the same setting the stylesheet reads as `prefers-reduced-motion`. The toolbar's and the outline's transitions become instant, and following an outline entry puts the reader at the heading rather than travelling there.

- **An editor.** The Markdown source with its syntax coloured, a live preview beside it, a formatting toolbar and a status bar that counts:

  ```dart
  MawyEditor(defaultValue: '# Hello', onChange: save);
  ```

  **Three surfaces rather than the React package's four**, and the missing one is worth saying out loud. `wysiwyg` there draws the document and edits it where it is drawn, which rests entirely on `contenteditable`: a browser telling a component what somebody tried to do to a tree, so the component can refuse it and change the Markdown instead. Flutter has no such thing — an `EditableText` owns a string — and drawing a document that is also a text field would mean a second model of what the document is. A second model is a second opinion about what a document means, and the two disagree the first time anybody writes something unusual. So `plain`, `split` and `preview`, and the drawn surface stays a viewer.

  Everything else is the React package's, and provably: the formatting commands, the colouring of the source and the counts along the bottom are the same functions under the same names, and `tool/parity.dart` diffs all three on every change. `Enter` on a list item carries the marker down and gives it up on an item still empty; `Tab` and `Shift`+`Tab` indent by the two spaces a nested item needs.

  Colouring the source is the one place this package has the easier job. The React editor lays a transparent `<textarea>` over a coloured copy of the same text and keeps the two in step, because a browser gives no way to colour what is inside a text field; a `TextEditingController` is simply asked for the spans it wants drawn.

- **`MawyEditor`, `MawyEditorMode`, `MawyEditorToolbarItem` and `MawyEditorStatusItem`**, along with `kMawyEditorModes`, `kMawyEditorToolbar` and `kMawyEditorStatus` — and the commands themselves as `runCommand`, `commandActive`, `continueList`, `indent` and `EditState`, for an application that would rather drive them from its own chrome.

- **Six more of CommonMark, and the number moved from 612 to 618.** The React package's parser change, mirrored here in the same commit: all six are about which lists are loose — an empty item does not loosen its list, an item may begin with at most one blank line, and a blank line loosens the list it is in rather than every list around it.

- **A syntax highlighter, and a code block that uses it.** `mawyHighlighter` is the React package's `src/highlight.ts` in Dart — the same grammars, the same rules, the same approximations — and `tool/parity.dart` now diffs every token the two produce over a piece of every language either of them claims. A code block coloured in a browser is coloured the same way in an app, which is the promise the parser already made and the one this makes now.

  ```dart
  MawyViewer(value: document, highlight: mawyHighlighter);
  ```

  Nothing is coloured without being asked. A highlighter is the largest thing a Markdown renderer can be made to carry and most documents have nothing to colour, so an application that never names one never carries the tables: a Dart build drops what nothing references, which is what this package has instead of the React package's separate entry point.

  It is **tokens rather than markup**, like everything else here — what a highlighter hands back is text and names, and this package decides what each becomes, so nothing reaches the screen as markup of any kind. The tokens are joined together and checked against the code they claim to be, and a block that does not add up is drawn plain.

- **`MawyHighlighter`, `MawyCodeToken` and `MawyCodeTokenKind`**, exported from `package:mawy/mawy.dart` like the rest of the vocabulary. They live in `src/code.dart` rather than `src/types.dart` and import nothing: the parity check runs the highlighter under the plain Dart VM, and a library that reaches `package:flutter/widgets.dart` cannot be compiled by one.

- **Eight more colours on `MawyTokens`** — `highlightComment`, `highlightString`, `highlightNumber`, `highlightKeyword`, `highlightType`, `highlightFunction`, `highlightVariable` and `highlightPunctuation` — which are the React package's `--mawy-hl-*` custom properties, value for value.

- **Seven more of CommonMark, and the number moved from 605 to 612.** The React package's parser change, mirrored here in the same commit: a destination, a title and a fence's info string read their escapes and character references; a backtick fence whose info string holds a backtick is not a fence; and an escaped bracket is a bracket a shortcut reference's label may hold. `tool/parity.dart` says the two trees are still identical, which is the only thing that makes "one parser shipped twice" true rather than intended.

- **The palette's faintest text now meets WCAG AA.** `foregroundSubtle` was `#8B8B96` in the light tokens and `#77778A` in the dark, which is 3.4:1 and 4.1:1 against the backgrounds it is drawn on — under the 4.5:1 that body text needs. It is `#70707B` and `#87879A` now. This is the React package's change, mirrored: the two palettes are one palette, value for value, and a colour that moved there had to move here.

- **How much CommonMark, as a number.** The React package's parser answers 605 of the specification's 652 examples, and this parser is that parser: `tool/parity.dart` diffs the two trees over every awkward case and every Markdown file in the repository, so the suite is run once rather than twice. What the remaining 47 are, and why, is written down beside the test over there.

- **Directives — a way for a document to carry a construct this package does not know about.** The parser reads a shape and stops there: `:::name[label]{key=value}` … `:::` around blocks, `::name[label]{attrs}` on a line of its own, and `:name[label]{attrs}` inside a sentence. What each one *means* is the application's, through `directives`:

  ```dart
  MawyViewer(
    value: document,
    directives: <String, MawyDirectiveBuilder>{
      'callout': (BuildContext context, MawyDirective directive) =>
          Callout(kind: directive.attributes['kind'], children: directive.children!),
    },
  );
  ```

  A builder is handed the name, whatever was written in `{…}` — with `{#id}` arriving as `id`, `{.a .b}` as `class` and a bare name as a flag — the `[label]` already drawn as an `InlineSpan`, a container's blocks already drawn as widgets, the range it was written at and the characters it was written with. Which keeps the safety story exactly where it was: the application composes widgets, and there is no markup on the path from the document to the screen. An inline directive is placed in the sentence as a `WidgetSpan`. **A name nobody registered is drawn as the characters it was written with**, the same answer raw HTML gets, because a screen that was never told what a construct means should show what the author wrote rather than quietly lose it.

  This is the React package's parser change, in Dart: the same syntax, the same tree, and `tool/parity.dart` diffs the two over the awkward cases and every Markdown file in the repository. Two rules are narrower than the `remark-directive` extension's, and both are about not changing what an existing document already said: the colons must be followed immediately by the name, so `::: tip` with a space is the paragraph it always was; and an inline directive must carry a label or attributes, so `Note:` and `12:30` and `:warning:` stay what they are.

- **`MawyDirective`, `MawyDirectiveBuilder` and `MawyDirectiveKind`**, exported from `package:mawy/mawy.dart` like the rest of the vocabulary.

### Changed

- **`MawyTokens` compares on every colour rather than on six of them.** Six was enough while the only palettes in existence were this package's own two, and became wrong the moment an application could build a third: two palettes differing in nothing but their alert colours called themselves the same palette, and a viewer handed the second one would not have redrawn.

## 0.1.0 — 2026-08-31

The first release. Everything in it is new, so each entry says what a thing is rather than what it became.

### Added

- **`MawyViewer`** — a Markdown document, drawn and not editable. The document becomes widgets rather than a string of anything, so there is no markup on the path from Markdown to the screen: nothing to escape, and nowhere for an injection to arrive. Every widget is built on `package:flutter/widgets.dart` alone, so a document sits inside a Material app, a Cupertino app or a bare `WidgetsApp` without dragging a second design system in behind it.
- **The Markdown parser, which is the React package's parser.** Not a port in spirit — `ast.dart`, `source.dart`, `block.dart`, `inline.dart` and `parse.dart` are `ast.ts`, `source.ts`, `block.ts`, `inline.ts` and `parse.ts`, function for function and rule for rule. CommonMark, with emphasis resolved by the specification's own delimiter-stack rules; GitHub's additions — tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs and e-mail addresses, footnotes, and the five alert kinds; and definition lists, which GitHub does not read.
- **A check that the two parsers agree.** `tool/parity.dart` and the React package's `scripts/parity.mjs` print the same trees in the same shape, over every awkward case anybody has written down plus every Markdown file in the repository, and the two are diffed. Two implementations of CommonMark drift the moment nobody is comparing them, and a document that means one thing in a browser and another in an app is the bug this library exists to not have.
- **Every node knows where it came from.** A parsed node carries the range of the source it was read out of — through however many containers it was nested in, past the `>` a quotation puts on each line, the indent of a list item and the pipes around a table cell. Offsets are counted in the document as it was handed over rather than as the parser tidied it, so a file with Windows line endings, a byte order mark or a tab where an indent should be answers in its own characters.
- **A toolbar for how the document is set**, not for what it says: typeface, text size, line height, letter spacing, column width, light or dark, an outline of the headings, and the source to the clipboard. The glyphs are Lucide's, which is what the React package draws too — the two are the same toolbar rather than two toolbars that resemble each other. `toolbar` takes the controls to draw and the order to draw them in, or `const []` for none.
- **The palette is the React package's `styles.css`, value for value.** A colour that is `#5b34ea` in a browser is `#5b34ea` in an app. `MawyTokens.light` and `MawyTokens.dark` are the two, and `colorScheme` chooses between them or follows the platform.
- **An outline panel**, built from the same slugs the parser gives the headings, which scrolls the document to whichever one is chosen.
- **Korean and English chrome**, through `locale`.

### Security

- **Every URL a document names is checked against a scheme allowlist**, in the same list the React package uses. A `[click](javascript:…)` is drawn as the words the author wrote rather than as a link that does nothing. `data:` is allowed for images, and only for media types anything draws.
- **Nothing is opened.** A link does nothing at all until an application says what opening one means, through `onLinkTap`. Opening a URL means handing it to the platform, and which URLs an application is willing to hand over is not a viewer's decision.
- **Raw HTML is shown as the characters it was written with**, and there is no option to make it otherwise. Flutter has no HTML to draw it as, so there is nothing else it could be — which is why this package has no `html` policy to choose between.

### Dependencies

- [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter) (MIT), for the toolbar's icons. It is the same icon set `lucide-react` draws, which is what makes the two toolbars the same toolbar, and it brings nothing else with it. It is also the one thing here that is not small: it ships its variable faces whole and Flutter's icon tree-shaking barely dents a variable font, so it is about 3 MB in a build. Ordinary in an app bundle; worth knowing about on the web.
