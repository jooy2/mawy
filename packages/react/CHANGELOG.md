# Changelog

> This package's history. Each language Mawy ships for keeps its own changelog beside its own manifest, because they version independently.

## Unreleased

### Added

- **The viewer can be searched too.** A find button on its toolbar, `Ctrl`+`F` (`Cmd`+`F`) while it has the focus, every match marked as the query is typed and the one being stepped through marked apart — the same bar and the same colours the editor has, without the second row, there being nothing in a viewer to put anything in place of.

  What it searches is the text the document _draws_, which is the whole difference between this and the editor's. `**bold**` puts six characters in the source and four on the page, and a reader looking for `bold` is looking at the page: so `bold` is found inside the bold, and `**` is found nowhere. A fenced code block is not searched — it is drawn as the highlighter's own spans, and cutting a mark into those would mean cutting every one of them — and a match cannot straddle two runs, so `hello` is not found across `he**llo**`.

  The button is the `find` toolbar item and the shortcut comes with it: a viewer whose `toolbar` leaves it out leaves `Ctrl`+`F` to the browser, which is the right answer for a viewer that fills the page. Taking it is worth doing for one inside a pane of its own, which the browser's find scrolls past rather than into.

- **Finding marks every match at once, and marks the one you are on apart from the rest.** Before, the only thing on the page saying where a match was was the selection sitting on it — one match, and only after pressing next. Typing a query told you how many there were and nothing about where.

  Every match is now painted as the query is typed, in a wash of yellow, with the one being stepped through in a stronger orange. Which turns the count beside the field into something you can check against the document rather than take on faith, and makes "next" a thing that visibly moves.

  In the source pane it goes in the coloured layer under the textarea rather than into the textarea's own selection, so a match inside a heading or a link keeps the colour the highlighter gave it and gains a background. `--mawy-find` and `--mawy-find-current` are the two colours, and they are palette variables like every other colour here.

- **The bar between the two panes of `split` is something to take hold of.** Half and half is a guess about what somebody is doing, and it is wrong as often as it is right: a wide window wants more preview while reading over a draft and more source while writing one.

  Drag it, or focus it and use the arrows — `Shift` for a bigger step, `Home` and `End` for the ends, `Enter` or a double-click for half and half again. It is a `separator` with a value, which is what it is, and a bar nobody can move without a pointer is a bar half the readers of an editor cannot move at all. It stops well short of either edge, because a pane pushed to nothing is a pane nobody can get back.

  No prop for it, and `strings.divider` is the only thing added. Where a pane's edge sits is the same kind of thing as where a scrollbar sits — the reader's, for as long as they are looking at it — and an application with a reason to store it already has `value` and `onChange` for the thing worth storing. Below the width at which the panes stack there is no bar and nothing for it to be between. 0.5 kB gzipped on the editor and 0.1 kB on the stylesheet.

- **A toolbar too narrow for its buttons keeps what fits and puts the rest in a menu at the end of it.** What happened before was a wrap: the buttons went on to a second row and the bar did not grow, because the layout above it had made room for one. The lower row left the bar.

  Whole groups at a time and from the end. The separators an application already writes are the grouping — the surface switch, then what marks up a run of text, then what makes a block of one, then the file and the palette — so reordering `toolbar` reorders what goes first, and there is no second list here saying what belongs with what. The first group never leaves.

  The measuring is one layout effect and a `ResizeObserver`: every group is shown, measured and put back before the browser paints, because a group that has been taken out of the row has no width to read. Hiding a child does not change the width of the row that holds it, so the observer cannot set itself off.

  `strings.more` is new, and the menu is a `dialog` with the groups inside it in the order they left. 0.6 kB gzipped on the editor, and the viewer's 0.1 kB is the stylesheet it shares.

- **`wysiwyg` keeps a marker on the page until it is the block it looks like.** Typing `#` used to make an empty heading, and an empty heading draws no characters at all — so the character somebody had just typed disappeared as they typed it, and somebody who wanted a `#` in a sentence had a heading to undo.

  The parser is not what changed and is not what was wrong: `#` on a line of its own is an empty ATX heading, CommonMark says so in as many words, and the viewer should go on drawing one. What changed is the surface that is being typed into, which already writes a link, an image and a piece of raw HTML out as their own characters when the caret is inside them, for exactly this reason — there is nothing of the document on the page for a caret to sit in. A block written so far as its marker and nothing else is the same thing said about a whole line.

  `-`, `>`, `1.` and `- [ ]` too, with a bullet, a bar, a number or a box left where the text went. The outermost such block is the one written out, so a list holding one empty item is the list rather than the item — a bullet drawn beside the `-` that is a drawing of it is not an improvement.

- **The highlighter knows Dart.** It is the one language this library is written in that the highlighter it ships could not colour, which showed on the documentation site: every Flutter example on it is a fenced `dart` block, and every one of them was drawn plain.

  Doc comments, annotations, strings written across three quotes, and `void`, `dynamic`, `bool`, `int`, `double` and `num` as types rather than keywords — the same decision TypeScript's `void` already gets here. Every other type is caught by the capital letter, which Dart's own style guide asks for.

  It is a grammar in both packages and a case in `tool/code.json`, so the parity check diffs every token the two produce over it. The entry point goes from 2.6 kB gzipped to 2.8 kB, and the viewer and the editor do not move — nothing in either reaches the highlighter unless an application names it.

- **One more of CommonMark, and the number moved from 639 to 640.** The last one about looseness, which is the question of whether a list's items are paragraphs or lines. A blank line loosens the list it is in, and the test for which blank lines count was "between two of the item's own blocks" — which a reference definition falls outside of, being taken off the paragraph above it before anything counts what is left. An item ending in one had a blank line with a block above it and nothing below, and the list stayed tight.

  It is "past the end of one of them and inside none of them" now. Inside is what the old test was really for: a blank line in the middle of a nested list belongs to that list and loosens it there, and one in the middle of a fenced block is code. Neither says anything about the item holding it.

- **One more of CommonMark, and the number moved from 638 to 639.** The last of the lazy continuation, and the same rule from the other side: a lazily taken line cannot cut its paragraph short any more than it can underline it. It is there _because_ the paragraph is open, so whatever it looks like once it arrives, it is that paragraph's next line.

  What it looks like is the point. A container hands a lazy line over with its indentation gone, and `    - e` under a list item four columns in is not a marker where it was written — three spaces is as far in as one goes — and is a marker by the time the item's paragraph sees it. It used to open a list nobody wrote.

- **Three more of CommonMark, and the number moved from 635 to 638.** All three are the lazy continuation — the line under `> foo` that forgot its own `>` and is part of the quotation anyway.

  **Only a paragraph is continued that way.** A line belongs to the quotation above it because there is a paragraph up there still waiting for its next line, and for no other reason: a fence the quotation opened, or code it indented four columns, is waiting for nothing, and the line below it belongs to whatever is beside the quotation rather than inside it. A quotation whose one line opens a fence, followed by an unquoted line, is an unclosed code block and then a paragraph; it used to be a code block with that line inside it.

  **And a line taken that way is the paragraph's next line and nothing else** — in particular it is not a setext underline. `> foo`, `bar`, `===` is a quoted paragraph of three lines rather than a heading.

  It costs 0.2 kB gzipped, in both the viewer and the editor, which is what reading a quotation's lines twice comes to.

  What the quotation has open is now read as it takes its lines, a line at a time, rather than guessed from whether the last one was blank. It stops reading at the first line that opens a container of its own, because what is open inside a list inside a quotation is a question about the list and answering it there would be the block scanner written twice — so a lazy line under one of those runs the way it always has.

- **One more of CommonMark, and the number moved from 634 to 635.** A document that ends in a newline has that many lines and not one more. The reader ran once past the last character on purpose — a source of nothing at all is still one empty line — and kept the line it made there even when the newline before it had already ended a line that was written. Nowhere did that show except inside a fence the document ended before closing, where the code came out a line taller than it is.

  What it cost was a blank line at the end of a _closed_ code block, and it cost it in the test suite rather than in the parser: the writer that turns the tree back into HTML wrote the final newline only where the value did not already end in one, which is a rule that cannot tell a real trailing blank line from an invented one. Both halves are gone, and a fenced block inside a list item whose last two lines are blank is three lines of code again rather than two.

- **The whole Latin-1 block of character references**, which is four more of CommonMark and takes the number from 630 to 634. `&ouml;`, `&eacute;`, `&szlig;`, `&frac12;` — what a document written in a European language reaches for, and what an author who typed `Fr&ouml;hlich` meant a word by. Ninety-seven names, read everywhere the specification asks for a reference: in a destination, a title, a reference definition's label and a fence's info string.

  It costs 0.6 kB gzipped, and the viewer was 22.8 kB when this landed. The table is still the names documents actually use rather than all 2,231 of HTML5's, which would be a hundred kilobytes on every page for `&DifferentialD;`.

- **One more of CommonMark, and the number moved from 629 to 630.** A numeric character reference is at most seven digits, or six in hexadecimal, which is the specification's own limit. `&#87654321;` was being read as a reference to a code point that does not exist and drawn as U+FFFD; it is not a reference at all, and is the eleven characters somebody typed.

- **Two more of CommonMark, and the number moved from 627 to 629.**

  **A no-break space is not whitespace**, as the specification counts it — the five characters it means by the word are space, tab, newline, form feed and carriage return, and a regular expression's `\s` is every Unicode space there is. So `[link](/url\u00a0"title")` has a destination of `/url\u00a0"title"` and no title, because nothing separated the two. The emphasis rules still use `\s`, and correctly: those are written in terms of Unicode whitespace.

  **A thematic break wins over a list item** inside a list as much as outside one. `* * *` on the second line of a list of `*` items was an item with two more bullets in it, and is a rule that ends the list.

  The viewer is 0.1 kB larger for the two, at 22.3 kB gzipped.

- **Two more of CommonMark, and the number moved from 625 to 627** — both about a link inside an image's description. Closing a link deactivates the `[` openers to its left, which is what stops a link nesting inside a link; it was deactivating the `![` openers as well, so `![foo [bar](/url)](/url2)` was a sentence with a link in it rather than an image whose alt text is `foo bar`. An image's description is allowed to hold a link, and only the link openers are switched off now.

- **Four more of CommonMark, and the number moved from 621 to 625** — all four about what a link reference definition's label may be written as.

  A **label may run over more than one line**, which is what `[Foo\n  bar]: /url` is, and it is found by `[Baz][Foo bar]` because a label is folded to one space before it is looked up. A label **may not hold an unescaped bracket** of either kind, so `[ref[]: /uri` is a paragraph rather than a definition that nothing can refer to. A label of **nothing but whitespace** is not a label, and the line it is on stays the paragraph it was rather than being taken off and dropped.

  And an **underline over nothing but definitions is not an underline**. `[foo]: /url` followed by a line of `=` was losing that line entirely; a definition is not something a setext heading can be made out of, so the `=` is the first line of the paragraph that follows.

- **Three more of CommonMark, and the number moved from 618 to 621** — all three about reading a tag more carefully than the parser was reading one.

  An **attribute name** is now the specification's own rule — a letter, `_` or `:` and then letters, digits, `_`, `.`, `:` and `-` — rather than "anything that is not a space or a quote". A line reading `<a h*#ref="hi">` is a sentence about a tag, and was being drawn as one; so was a tag whose second line began `bim!bop`, since the name that could not be a name was being taken for one.

  And **`<!-->` and `<!--->` are comments in their own right**, tried before the general form. Without that, `foo <!--> foo -->` was one comment running to the closing `-->` rather than a comment followed by text.

- **`wysiwyg` is on the default `modes` list**, and first on it. It was left off at 0.1.0 because two things on that surface did not work — a link's destination could not be typed and raw HTML being drawn could not be edited — and both are gone: whatever the caret is inside is written out as the characters it was written with. An application that would rather not offer the surface leaves it out of `modes`, the way it says anything else about the switch.

- **The status bar's counts are their own module**, `src/internal/status.ts`, rather than functions inside the component that draws them — which is what lets the parity check diff them against the Dart ones. Nothing about the numbers changed; a count written twice is a count that reports two different answers for the same document the first time nobody is comparing them.

- **Raw HTML is editable on the `wysiwyg` surface**, under `sanitize` and `raw` as well as under `escape`, and it is editable the same way a link's destination is: markup the caret is inside is written out as the characters it was written with, and drawn back as markup when the caret leaves. That was the last thing the surface could not do — what `dangerouslySetInnerHTML` puts on the page is markup React does not know the inside of, so there was nothing in the drawn form for a caret to be inside. Written out, there is, and every rule the surface already has applies to it unchanged.

  The writing-out now happens only while the editor has the focus. A document that opens with a link would otherwise show its brackets to a reader who has not touched it, and "the thing the caret is inside" is not a question an editor nobody is typing in has an answer to. The editor rather than the drawn surface, because pressing a button on the toolbar takes the focus out of the document and the caret it is about to act on is still the caret.

- **Six more of CommonMark, and the number moved from 612 to 618** — all six about which lists are _loose_, which is the difference between an item's text sitting on the line and sitting in a paragraph of its own with space around it.

  - **An item with nothing in it does not make its list loose.** `- foo`, `-`, `- bar` is three tight items; the middle one being empty was being read as a blank line after it.
  - **An item may begin with at most one blank line.** `-` followed by a blank line and then an indented paragraph is an empty item and a paragraph beside the list, rather than an item holding the paragraph.
  - **A blank line loosens the list it is in rather than every list around it.** A blank line between two blocks inside a nested item was making the item's grandparent loose too, which put a `<p>` around every item at every level above it.

  Both parsers, and the parity trees are identical.

- **The highlighter is diffed against the Dart one**, over `packages/flutter/tool/code.json`, as part of the parity check. `src/highlight.ts` and `lib/src/highlight.dart` are one grammar written twice and they drift for exactly the reason the two parsers do; nothing in this package changed, and now nothing can change in it alone.

- **Seven more of CommonMark, and the number moved from 605 to 612.** Four kinds of thing the parser was reading as the characters they were written with rather than as what they say:

  - **A destination and a title read their escapes and their character references**, inline and in a reference definition alike — `[a](/bar\*)` is `/bar*`, and `[a]: /u "ti\*tle"` is `ti*tle`. The inline scan already took the backslashes off; the definition kept them, so the same link meant two things depending on where it was written.
  - **So does a fence's info string.** ` ```foo\+bar ` is `language-foo+bar`.
  - **A backtick fence whose info string holds a backtick is not a fence.** ` ``` ``` ` on a line of its own is a code span with a space in it, and reading it as an empty code block swallowed the rest of the document until something closed the fence.
  - **An escaped bracket is a bracket a shortcut reference's label may hold.** `[Foo*bar\]]` is one label rather than a failed reference.

  The label a reference is _looked up_ by is deliberately not unescaped, which is the specification and not an oversight: `[foo\!]` and `[foo!]` are two labels, and both sides of the lookup fold the characters as written so the two cannot disagree.

  Five deviations were reclassified rather than fixed. An empty destination is a decision: `<a href="">` is a control that does nothing, and this library's answer for a destination it will not follow is to draw the words the author wrote. Four more are `&ouml;` and `&auml;`, which are outside the character reference table this package carries.

- **A link or an image the caret is inside is written out as its own characters** on the `wysiwyg` surface, destination and all, and drawn back as itself when the caret leaves.

  This is the destination becoming editable, which it was not. A drawn `<a>` puts its words on the page and never its `(url)`, so there was nowhere on the page for an address to be and nothing for a keystroke to land on — the toolbar's `[](url)` arrived with a placeholder that could not be typed over, and an existing link's destination could only be changed on the source surface. Written out it is the source one character for one, and every rule the surface already has applies to it unchanged: there is no link editor, no popover and no second way to type.

  It follows the caret rather than a mode, and only where the whole selection sits inside one link — a range dragged across half a document turns nothing into markup under the pointer. What is revealed is marked rather than disguised, because text that has stopped being a link and started being the text that makes one is a difference worth being able to see.

- **A print stylesheet.** A viewer on paper is the document and nothing else — the toolbar, the outline, the status bar, the find box and a footnote's link back to where it was mentioned are all things to press, and paper cannot be pressed. Three more things change because a page is not a screen: a viewer given a height is as tall as its document instead of printing one boxful, the palette goes dark-on-light whatever the reader chose, and a link's destination is written out after it. In the editor the drawn document prints — `split` drops the source pane, and `plain` prints the source as text rather than as a `<textarea>`, which would put only its own boxful on the page. Nothing to switch on: it is `@media print` in the stylesheet that was already imported.

- **An accessibility pass, run by [axe](https://github.com/dequelabs/axe-core) rather than by opinion**, over every surface in both palettes — the viewer with a document and as the file picker, all four editor modes, the outline open, a menu open, find and replace open. Four things it found, all fixed:

  - **A task list's checkbox had no name.** It was announced as "checked, checkbox" and nothing else, with the one thing worth knowing — what is done — sitting beside it as text. The item's first line is now the name.
  - **The editing surface was an `<article role="textbox">`.** ARIA does not let a document section be a textbox, so it is a `<div>` now. The viewer's drawn document is still an `<article>`, where it is one.
  - **The link back from a footnote was a colour and nothing else**, inside running text. It is underlined.
  - **`--mawy-fg-subtle` did not meet WCAG AA** against either background: `#8b8b96` is 3.4:1 on white and 3.1:1 on the sunken grey. It is `#70707b` in the light palette and `#87879a` in the dark, both over 4.5:1 everywhere they are used — and the Dart palette moved with it, because the two are one palette.

- **A size budget, and a stylesheet with its prose taken out.** `npm run size` bundles the published files for real and compares the result to `size-budget.json`, which CI now fails a change for going over. What it measures is what a consumer's bundler produces: React external because an application already has it, `lucide-react` counted because it arrives with this, and gzip because every server on the path compresses.

  Gzipped, that is **22.2 kB for `MawyViewer`, 38.0 kB for `MawyEditor`**, 2.6 kB for the highlighter and 5.5 kB for the stylesheet. The fifteen kilobytes between the first two are the editor falling out of a page that only reads documents — the toolbar, the undo history, the paste pipeline, every `contenteditable` surface — which is the number the package is shaped around and the one nothing but a real bundle can see.

  The stylesheet is now minified on its way into `dist/`. Two fifths of `styles.css` is prose written for somebody reading the source, and a reader of a page was paying 3.7 kB gzipped for comments they cannot see; `src/styles.css` is still the file to read and to edit, and what ships is the same rules in the same order. The build checks the two things that would make that a bad trade: every `--mawy-*` custom property still declared, and every `:where()` still a `:where()`, because those are the resets and a reset that gained specificity is one that starts beating the page it was dropped into.

  Also checked there, because it is the failure a bundler hides: Node's own resolver, on every entry point the package claims to have. A bundler forgives a specifier that a server render does not.

- **How much CommonMark, as a number.** The specification's own 652 examples are run at the parser on every change, and it answers 605 of them. The other 47 are written down in `test/internal/markdown/commonmark.test.ts`, one line each with the reason it is there, so the list can only get shorter deliberately — and a fix that is not recorded fails the same test.

  Three of them are a decision rather than a shortfall: every URL is checked against a scheme allowlist, so `<made-up-scheme://foo>` is drawn as the words the author wrote rather than as a link. The rest are edges — a tab inside a list item, a character reference in a link destination, a list counted loose where the specification counts it tight, a fence whose info string holds a backtick.

  The library renders to React elements and has no HTML serialiser to measure, so the test has one of its own in `test/support/commonmark.ts`. It is a test file rather than something shipped, and the safety story is unchanged: there is still nothing between a document and the page that is a string of markup.

- **Directives — a way for a document to carry a construct this package does not know about.** The parser reads a shape and stops there: `:::name[label]{key=value}` … `:::` around blocks, `::name[label]{attrs}` on a line of its own, and `:name[label]{attrs}` inside a sentence. What each one _means_ is the application's, through `directives`:

  ```tsx
  <MawyViewer value={document} directives={{ callout: Callout, youtube: YouTube }} />
  ```

  A component is handed the name, whatever was written in `{…}` — with `{#id}` arriving as `id`, `{.a .b}` as `class` and a bare name as a flag — the `[label]` already drawn, a container's blocks already drawn, the range it was written at and the characters it was written with. Which keeps the safety story exactly where it was: the application composes React elements, and no markup string is on the path from the document to the page. **A name nobody registered is drawn as the characters it was written with**, the same answer raw HTML gets under the default `html` policy, because a viewer that was never told what a construct means should show what the author wrote rather than quietly lose it — and on the `wysiwyg` surface those characters _are_ the source, one for one, so an unhandled directive is editable exactly where it was typed.

  The syntax is the generic directives proposal's, which is what `remark-directive` reads, so a document written for one is read by the other. Two rules here are narrower than that extension's, and both are about not changing what an existing document already said: the colons must be followed immediately by the name, so `::: tip` with a space is the paragraph it always was; and an inline directive must carry a label or attributes, so `Note:` and `12:30` and `:warning:` stay what they are.

  The Dart parser reads the same syntax into the same tree, and `tool/parity.dart` diffs the two over the awkward cases and every Markdown file in the repository, as it does for everything else the parser reads.

- **`MawyDirectives`, `MawyDirectiveProps`, `MawyDirectiveKind` and `MawyRange`**, exported from `mawy-react` and `mawy-react/types` like the rest of the vocabulary.
- **A Markdown file in, and out.** `open` reads one into the editor and `save` writes the document back — `Mod`+`S` as well, because the browser's own `Mod`+`S` saves the page and that is never what somebody writing in an editor meant by it. Both are on the toolbar, before `colorScheme`.

  Without `onSave` the text is handed to the browser as a download: an anchor with a `download` on it rather than the File System Access API, which only Chromium has — a save that works in one browser and silently does nothing in another is worse than one that always does the same thing. `onSave(value, name)` takes it over entirely, which is what an application saving to a server wants instead.

  The name is the opened file's, or **the document's first heading** with the characters no filesystem will take dropped, or `document.md`. `open` has no shortcut on purpose: the browser's own `Mod`+`O` is a reasonable thing to leave alone, and opening a file is a rare and deliberate act.

  **A file dropped on the editor is still an image, never a document.** The drop is already how an image gets in, and replacing a document somebody has been writing because a file landed on it is how work is lost.

- **`'open'` and `'save'` on the editor's toolbar**, and `accept` beside them for what the picker offers.
- **Find and replace, on the source surface.** `Mod`+`F` opens a bar over the source and the toolbar's new `find` button does the same; `Enter` and `Shift`+`Enter` walk the matches, `Escape` closes it and gives the focus back to the document. Whatever was selected is already in the box when it opens, as long as it was on one line. Replace and replace all are on the second row, and replace all is one pass over the document as it was, so replacing `a` with `aa` does not find its own replacement for ever.

  It exists because the browser's own find cannot reach here: **no browser searches the text inside a `<textarea>`**, and the source surface is one. Everywhere else in this library a thing the platform already does is left to the platform, and this is the place the platform does not.

  **Plain text, never a regular expression.** A Markdown document is full of `*`, `[`, `.` and `+`, and a find box that quietly compiled `(` into a syntax error is one a writer cannot trust with a document. Case sensitivity is the switch that is there instead, which is the one people reach for.

- **`'find'` is on the editor's toolbar**, before `colorScheme`, and so is on the list `toolbar={true}` draws. It is the first control there that is not a formatting command; its shortcut works whether or not the button is drawn, like every other one.
- **`Tab` indents the source, and `Escape` is the way out.** `Tab` puts two spaces in where the caret is and `Shift`+`Tab` takes them back; anything _selected_ moves the lines it touches and stays selected, so it can be pressed again. Two spaces rather than four because that is a Markdown fact — a nested item has to clear its parent's marker, which under `- ` is two columns, and four would be an indented code block the moment the list above it ends.

  A textarea that swallows `Tab` is a keyboard trap, so the trap is opened rather than avoided: **press `Escape`, then `Tab`, and the focus moves on.** Anything else typed arms indentation again. It is the rule CodeMirror, Monaco and GitHub's editor all use, and the surface says so through `aria-describedby`, because a way out nobody is told about is a way out that does not exist for the person who needed it. The drawn document does not capture `Tab` at all — there is no trap there to open.

- **`linkTarget`, and a link opens in a new tab by default.** `'blank'` puts `target="_blank"` and `rel="noopener noreferrer"` on every link the document wrote; `'self'` is for an application showing a document _as_ its page.

  A new tab is the default because of where this component usually is: a viewer is a piece of a page rather than the page, so a reader who follows a link out and comes back should find the document where they left it — and in an editor, what is behind that link is unsaved work. A footnote's number and the arrow back from it point at the same page and are unaffected either way. `MawyEditor` takes it too, for the preview and the drawn surface.

  The Flutter package has no counterpart and will not: what opening a link means is `onLinkTap`'s whole subject there, and where it opens is part of what an application answers with.

- **`fileDrop` on the editor: a Markdown file dropped on it opens as the document.** Off by default, because replacing a document somebody has been writing because a file landed on it is how work is lost and `open` is the control that does it on purpose. On, for an editor that starts empty and is a place to bring a file _to_ — the playground on this site is one, and has it on.

  With it on, an empty preview stops saying there is nothing here and offers the picker instead: the viewer's own empty state, in the pane the document is going to appear in. A dropped image is still an image wherever `onUploadImage` is given, and the drop is still the editor's whichever pane it lands in — one answer for the whole component rather than two that have to agree.

### Changed

- **A click in the preview no longer moves the caret in the source.** It was the other direction of the question the scrolling asks — a place on the page, read back as a place in the document — and as a piece of arithmetic it worked. As a behaviour it was one answer too many: `wysiwyg` is the surface that edits the drawn document, and a `split` whose right-hand pane also edits is two answers to where the writing happens. A preview is a preview, and now behaves like the page it is.

  The machinery it was built on is untouched and still in use — `caretFromPoint` and `sourceAt` are what put a dropped image where the pointer let go of it, and what the drawn surface reads every keystroke through.

- **The headings panel is called "Contents".** "Outline" is what the thing is to whoever wrote it and not what a reader is looking for: a list of a document's headings, in order, to jump from. The Korean has always said 목차, which is this word. `'outline'` is still the name of the toolbar item and the class on the panel, because those are an application's API and renaming them would cost every consumer a line to save this package a word.

- **The status bar is the height the Flutter package's is.** It was two pixels taller, and for a reason worth writing down: `.mawy-root` sets a line height of 1.5 because a document is prose, and a strip of counts under an editor is not prose. The number is written down on the bar now rather than inherited, and it is the number the other package's row is drawn at.

- **Two of the library's own sentences say what they mean.** The veil over the editor while a file is being dragged said "Drop to add", which is an instruction with the object left out; it says what will be added now. And the source surface's placeholder said "Write in Markdown" — a reader looking at an empty editor knows what it takes, and what they want to know is that this is where the typing goes.

- **A button says its name in this library's own tooltip rather than the browser's.** `title` waits about a second before it appears, so the name of an icon was a thing a reader had to decide to wait for; and it is drawn by the operating system, so a toolbar in a dark theme grew a light chip in a system font. This one appears the moment the pointer is on the button and is drawn in the same palette as everything else. It is a pseudo-element on the control, so there is nothing to mount and nothing to leave behind, and `aria-label` is still what names the button.

  A `title` written by the _document_ — `[words](url "a title")` — is untouched. That is the author's text and not the library's chrome.

### Fixed

- **The document is focusable by a click, so a keystroke has somewhere to land.** It is not a `Tab` stop and does not draw a focus ring; the whole of what it changes is that `Ctrl`+`F` in a viewer somebody has just clicked into reaches that viewer.

- **`Enter` in the find field goes to the next match instead of handing the document the focus.** It went to the next match too — but it took the focus with it, so the second `Enter` was a newline typed into the document, and every keystroke after that was an edit somebody had asked for a search.

  The selection still moves to the match, and the document still picks up from there the moment the bar is closed. What it no longer does is take the focus while the bar is open, which is what the marking above is for: the match is shown where it is rather than shown by being selected, and the field the query is being typed into keeps the keyboard.

- **A file dropped on the editor no longer takes the page away.** A dropped file is an image and never a document, which is the rule and stays the rule — but a file the editor would not take was left to the browser, and a browser given a file it was not stopped from taking opens it as a page. The document, the undo history and the caret went with the tab, which is the exact loss the rule exists to prevent.

  Any file dragged over the editor is the editor's now. An image lands where the pointer let go of it and everything else is refused with a line under the document saying so, and saying that `open` is the control that does what was being asked for. A run of text dragged in from another window is not a file, is not claimed, and is still the surface's own business.

- **A viewer that cannot be given a document does not offer to open one.** `value` with no `onValueChange` is an application saying the document is its own, and a file chosen there has nothing to become — so the picker was a button that did nothing, and it was the one the editor's preview drew over an empty document: an "Open a Markdown file" panel inside an editor, with a file picker that could not open a file.

  The empty state says there is nothing here yet, the button under it is not drawn, the toolbar's `open` is disabled, and a drop is not claimed. `strings.emptyNothing` is new, and so is `strings.dropNotDocument` for the line the editor writes.

- **The entry pressed in the headings panel is the one that stays marked.** Following an entry is a smooth scroll and a smooth scroll passes over every heading between here and there, so the mark walked down the panel with it and settled on whichever heading was at the top when it stopped. That is not always the one that was pressed: the last heading of a document cannot reach the top of a box taller than what is under it, and a short section under a long one is passed straight through.

  What was pressed is not in doubt, so it is no longer measured. The measuring starts again at the next wheel, touch, key or press inside the document — the reader saying they have gone somewhere of their own — and a wheel over the panel is not one of those, because reading the list of headings is not leaving the one you chose.

- **The mark beside the current heading is a rule and not a bracket.** It was an inset shadow, which follows the corner radius the focus ring needs and turns two pixels of rule into three sides of a box. Its own element now, so the radius stays where it is useful.

- **The toolbar is the same height in every mode.** A component given a height is a column of flex items and a flex item shrinks, so in the surfaces whose body wants more room than there is — the drawn document, `split`, `preview` — the bar was being squeezed onto its `min-height` and springing back in `plain`, which does not. Three pixels, and they moved every time the surface switch was pressed, which is the control immediately under them.

  The find bar and the status bar were the same shape of thing and are fixed with it. Chrome is not what a layout should take its room from.

- **A menu shuts when a value is picked in it.** The theme, the typeface and the column width all changed the document and left the panel standing over it — a menu still open on top of the thing it has just changed is a menu hiding the answer to the question it was asked. The focus goes back to the button it came from, the way it already did on Escape.

  A slider is not a value being picked and does not shut: a size is arrived at by moving it, and a panel that closed on the first step would have to be reopened for the second. That is the split the Flutter package already made, and now both make it.

- **`preview` is the same width as every other surface.** The rule down the preview's leading edge is there to separate it from the source beside it, and in `preview` there is no source beside it — so the pane was a pixel narrower than the others and the box read as shifting when the surface switch was pressed. The rule belongs to `split`, and now says so.

## 0.1.0 (2026-08-31)

The first release. Everything in it is new, so each entry says what a thing is rather than what it became.

### Added

- **`MawyEditor`** — the Markdown source, a live preview, and a switch between them. `plain` edits the source as text, `preview` shows the rendered document, `split` shows both, and `modes` decides which of those the switch offers. Every surface is a view of one string, so nothing is re-serialised on the way between them.
- **The `wysiwyg` surface, in part.** The document is drawn and edited where it is drawn: typing and deleting anywhere there is text to type in — a paragraph, a heading, a list item, a quotation, a table cell, a code block — splitting a block with `Enter`, joining two with `Backspace` at the start of the second, a hard break on `Shift`+`Enter`, replacing a selection, and every command on the toolbar. There is no second model behind it and there is no DOM-to-Markdown serialiser — every keystroke is refused, turned into an edit to the Markdown, and the document is drawn again from what the Markdown became. Edits land on the drawn character rather than the written one: the caret after `bold` in `**bold**` has an asterisk in front of it in the file and a `d` in front of it on the page, and `Backspace` there takes the `d`. An input method is the one thing that cannot be refused, and is handled the other way round: a composition is left entirely alone, and when it ends the run of text it changed is compared with what it said before and the difference goes into the Markdown at the place that run came from — because refusing a composition is refusing the composition, and Korean is composed a jamo at a time. `Enter` is a different thing in every container it is pressed in — a new list item with the marker carried down, another `: ` under a definition for the same reason, a blank quoted line to end a quoted paragraph, one newline inside a code block, and nothing at all in a table, where a row is a line and there is nowhere in the file for a second one. `Backspace` at the start of a block joins it to the one before, except across a table cell or a code fence, which would be eating the pipe or the fence. An image and a hard break come out in one piece. A caret the page has nowhere to draw is remembered where it meant to be — the whitespace at the end of a line is in the file and drawn nowhere, and without that `One two` could not be typed a word at a time. Raw HTML being _drawn_ rather than shown is the one place an edit is refused — it reached the page through `dangerouslySetInnerHTML` and React could not put it back — and the surface is not on the default `modes` list — an application asks for it by name while it is this new.
- **The shorthand typed at the start of a line becomes the formatting it is shorthand for**, on the drawn document, where it was typed. Most of that is not a feature and is worth saying so: the document is drawn again from the Markdown after every keystroke, so `# ` at the start of a paragraph _is_ a heading the moment the space lands, and `- `, `1. `, `> ` and `- [ ] ` are the same story. Two are written down, and they are the two where the marker changes the meaning of text nobody is typing. Three backticks open a fence and a fence runs until one closes it — so a fence is opened _closed_, the caret between the two and whatever was on the line inside, carrying a list item's or a quotation's own prefix onto the lines it adds. A thematic break has no text in it and a caret left on one has nowhere on the page to be — so `---` is given a blank line under it to carry on typing on, and is left alone under a line that is still going, where it is that paragraph's underline rather than a break. Inside a code block none of it happens, because everything in there is the characters it is.
- **Images, three ways in.** The toolbar's image button writes `![](url)` with the destination ready to type over — the link command with a `!` in front of it, and the same rules about which half a selection becomes. An image pasted or dropped as part of a web page arrives as the URL it already had, which is not an image feature at all but markup being read as markup. And a _file_ — a screenshot on the clipboard, an image dragged in from the desktop — goes wherever `onUploadImage` says: it is called once per file and answered with the URL to write, or with `{ url, alt, title }`; the file's own name, without its extension, is the description otherwise. Without that prop a dropped file does nothing and is not even refused, because there is nowhere for the bytes to go and quietly turning a two-megabyte screenshot into a `data:` URI inside somebody's document is not a decision a text editor should make. A drop lands where the pointer let go of it and a paste lands at the caret; several files at once are one upload after another and then one edit, so undo takes back the thing that was done rather than the last file of it.
- **The preview in `split` scrolls to the block rather than to the fraction.** Whichever line is at the top of the source decides which block is at the top of the preview, and the positions in between run straight from one block to the next. The fraction of the way through a file is not the fraction down the page — a fenced code block is sixty lines of source and sixty lines of page, an image is one line of source and half a screen — and the further those two get apart the further the preview is from whatever is being typed.
- **A click in the preview puts the caret on the same word in the source.** On the word, not on the paragraph: clicking the middle of a bold phrase puts the caret in the middle of it, between the asterisks. Neither pane is scrolled to do it, since in `split` the two are already showing the same part of the document. Links, checkboxes and a code block's copy button keep their own click, and a click that ended a text selection is left as a selection.
- **A source surface built on a real `<textarea>`**, with a coloured copy of the same text laid exactly underneath it. That keeps the IME, the mobile keyboard, spellcheck and every platform text gesture — none of which is worth losing for syntax colouring. The two layers share one set of layout properties, and the line-number gutter is the same grid rather than a second stack of rows, so numbers stay level with soft-wrapped text.
- **A syntax highlighter for the source**, which is not the parser and is deliberately approximate: a line being typed is half-written most of the time, and a highlighter that waited for `**bold` to close would flicker on every keystroke.
- **Formatting commands, each with a keyboard shortcut** — bold, italic, strikethrough, code, link, images, headings, quotations, three kinds of list, code blocks and rules. All of them toggle, markers replace each other rather than stacking, and `Enter` carries a list marker down and takes it away again on an item still empty. Edits go in through the browser's own insertion command, which leaves the caret, the scroll and any composition in progress where they were.
- **What is on the clipboard as HTML arrives as Markdown**, on both surfaces: a section of a web page pasted into either one has its headings as hashes, its links as links and its list as a list. A clipboard with nothing but text on it is left to the browser, whose own paste is right and keeps the caret, the scroll and the run of undo where they were. This is not the renderer run backwards — markup from somewhere else is read once for what can be made of it and nothing round-trips through it, so it is allowed to be lossy and is. Every URL goes through the same check a Markdown link gets. Inside a code block a paste is the plain text and nothing else.
- **Undo, over the document rather than over a surface.** `Mod`+`Z` goes back, `Mod`+`Shift`+`Z` and `Ctrl`+`Y` come forward, and there is one history for the whole editor: a change made on the drawn document can be taken back on the source, and the other way round. A `contenteditable` that refuses every input never gets an entry on the browser's own stack, so both surfaces put their changes on Mawy's instead. A run of typing is one step rather than one per keystroke — a change carries on from the one before it while it is the same kind, in the same place, within a moment of it, and a syllable being composed counts as more of the same typing because a Korean keyboard rewrites what it wrote on every jamo. A line ending closes the run behind it.
- **A status bar** counting position, selection, lines, words, characters and bytes. Words add every Han, hiragana and katakana character to the space-separated count; characters are code points; size is UTF-8 bytes.
- **Code blocks are coloured by whatever `highlight` is given**, and by nothing at all by default. A highlighter is the largest thing a Markdown renderer can be made to carry and most documents have nothing in them to colour, so the prop takes a _function_ as readily as a highlighter: `() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)` fetches one the first time a document with a language on a fence is actually drawn, and never otherwise. What comes back is **tokens rather than markup** — text and a name from a closed list of thirteen — and this package decides what element each becomes, so nothing reaches the page as a string of HTML and a highlighter cannot put a `<script>` in a document by being wrong. The tokens are checked against the code they claim to be and a block that does not add up is drawn plain. Each coloured piece says where it came from, like everything else the renderer draws.
- **`mawy-react/highlight`**, a highlighter of our own in an entry point of its own, so an application that never mentions it never ships it. It knows the languages a document usually shows — `js`, `ts`, `jsx`, `tsx`, `json`, `html`, `xml`, `css`, `bash`, `python`, `yaml`, `sql`, `go`, `rust`, `java`, `c`, `cpp` and the other names each answers to — and it is approximate on purpose, in the same way and for the same reasons as the one that colours the source surface.
- **`MawyViewer`** — a Markdown document, rendered and not editable. The document becomes React elements rather than a string of HTML, so there is no `innerHTML` between the Markdown and the page.
- **The Markdown parser.** CommonMark — headings, paragraphs, fenced and indented code, quotations, nested lists, thematic breaks, HTML blocks, emphasis by the specification's own delimiter-stack rules, links and images including reference definitions resolved from anywhere in the file, autolinks, hard breaks, character references and escapes — plus GitHub's additions: tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs and e-mail addresses, footnotes, and the five alert kinds. `parse` carries `gfm`, `breaks` and `definitionLists`.
- **Footnotes.** A `[^label]` in a sentence is a number, and the note it points at is drawn under the document with a link back to where it was mentioned. Numbered by the order they are first mentioned rather than the order they are written in, because that is the order a reader meets them; a note nobody mentions is not drawn at all, the way a link reference definition nobody used is nowhere either; and a `[^label]` with nothing to point at stays as the characters it was written with. A note may be a whole run of blocks, and where in the file it was written makes no difference — the parser lifts it out of the flow, so `MdDocument` hands the footnotes back separately and whatever draws a document draws them after it.
- **Definition lists**, which is the one thing here GitHub does not read. PHP Markdown Extra's syntax, which is the one everybody who writes these uses: a line of text, then a line opening with a colon and a space. The space is not decoration — `:warning:` under a sentence is an emoji shortcode in a great many documents, and without it every one of them would turn the sentence above into a term. Several terms may share a meaning, several meanings may share a term, a meaning may be a whole run of blocks, and a blank line spaces the list out the way it does a bullet list. `parse` gains `definitionLists` to turn it off for a document that has to mean exactly what it would mean on GitHub.
- **Every node knows where it came from.** A parsed node carries the range of the source it was read out of — through however many containers it was nested in, past the `>` a quotation puts on each line, the indent of a list item and the pipes around a table cell — and a child's range always sits inside its parent's. Offsets are counted in the document as it was handed over rather than as the parser tidied it, so a file with Windows line endings, a byte order mark or a tab where an indent should be answers in its own characters. They are what the preview scrolling in step with the source is built on, and what an edit made in the drawn document and written back to the Markdown is built on.
- **Every element says where it came from.** The viewer draws each one with `data-mawy-range="start,end"` — the offsets in the Markdown it was given of that piece's first character and of the one after its last. Blocks, list items, table rows and cells, the inline elements inside them — emphasis, links, code spans, images — and each coloured piece of a highlighted code block. A code block says it twice — the box around it for the fences, the info string and the indent, and the `code` element inside for the code itself, which is the part a caret can be in and is a place even when there is nothing between the fences at all. The offsets index the string that was passed, so `value.slice(start, end)` is the Markdown behind whatever was clicked. Text carries none, having no attributes to carry one in, and needs none: a run of text is bounded by the elements on either side of it, which is enough to find it in the source between them.
- **A toolbar for how the document is set**, not for what it says: typeface, text size, line height, letter spacing, column width, light or dark, an outline of the headings, the source to the clipboard, and a file picker. `toolbar` takes the controls to draw and the order to draw them in, or `false` for none. It is a real `toolbar` — one tab stop, arrow keys inside.
- **A file picker where a document would be.** With no `value`, the viewer is the thing you drop a `.md` file on. `onValueChange` reports the text and the `File` it came from, controlled or not.
- **An outline panel**, built from the same slugs the renderer gives the headings, tracking where the reader is.
- **Light and dark**, through `colorScheme` — `'system'` by default, and following `prefers-color-scheme` only for that value.
- **A typeface list, and web fonts behind a prop.** The toolbar offers whatever `fonts` gives it. The default is three roles the reader's machine already has, and it fetches nothing; `MAWY_WEB_FONTS` is a catalogue of thirteen families under the SIL Open Font License — eight Latin, five Korean — that an application opts into by passing them. Nothing is requested until a font is chosen or the typeface menu is opened, each name in that menu is drawn in its own face, and every stylesheet is fetched once per page.
- **The stylesheet declares its tokens on `.mawy-root`** rather than on `:root`, so a viewer can be dark inside a light page and the library never writes to the document element. Every rule the library ships is scoped under it, which is what keeps a host page's own `article h2` from restyling a document.
- Types: `MawyTypography`, `MawyFontFamily`, `MawyFont`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyImageUpload`, `MawyImageSource`, `MawyHighlight`, `MawyHighlighter`, `MawyCodeToken`, `MawyCodeTokenKind`, `MawyViewerToolbarItem`, `MawyViewerToolbarOption`, `MawyEditorToolbarItem`, `MawyEditorToolbarOption`, `MawyEditorStatusItem`, `MawyEditorStatusOption`. Values: `MAWY_SYSTEM_FONTS`, `MAWY_WEB_FONTS`.

### Security

- **Every URL a document names is checked against a scheme allowlist**, in Markdown as much as in HTML — `[click](javascript:…)` is refused under every setting of `html`, and is drawn as the words the author wrote rather than as a link that does nothing. `data:` is allowed for images, and only for media types a browser draws.
- **Raw HTML inside a document is inert by default.** `html` chooses: `'escape'` shows the markup as text, `'sanitize'` draws it through an allowlist of elements, attributes and URL schemes parsed with `DOMParser`, and `'raw'` hands the caller the consequences.

### Dependencies

- Added [`lucide-react`](https://lucide.dev) (ISC), the package's first and only runtime dependency, for the toolbar's icons.
