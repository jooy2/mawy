# Changelog

> This package's history. Each language Mawy ships for keeps its own changelog beside its own manifest, because they version independently.

## vNext (2026--)

### Breaking changes

- **`MawyViewerAnchors.keyFor` is gone.** It handed out a `GlobalKey` per block so that `places` could find each block's element and measure it. `places` reads the viewer's own record of how tall every block was laid out now, so nothing asked for a key and the viewer no longer put one on anything. Applications had no reason to call it — it was documented as the viewer's own — and nothing else in the class changed.

### Added

- **The editor's palette can be one the application holds.** `colorScheme` had an `onColorSchemeChange` beside it and no `defaultColorScheme`, so it read as a value the application owned and behaved as a starting value the toolbar then took over — the reader's choice stuck, and handing the same value back did nothing. It is now the pair `mode`/`defaultMode` and `typography`/`defaultTypography` already make: pass `colorScheme` and the toolbar reports what the reader picked and changes nothing until the application says so; pass `defaultColorScheme`, or nothing, and the editor keeps it and still reports every change. An application that was passing `colorScheme` and letting the toolbar win wants `defaultColorScheme` now.

- **A picture can be drawn by the application instead of fetched by the viewer.** Nothing could put a header on the request a picture makes, send it through a client of its own, answer it out of a cache, or refuse it — and which URLs an application is willing to reach for is not a viewer's decision to make. A document from somewhere else has somebody else's URLs in it, and fetching them all without asking tells whoever wrote them which documents are being read. The picture is handed over whole, with the address the allowlist already checked, what the author said it was, and the title. Unset, nothing changes.

### Security

- **A document cannot take the page down by being deeply nested.** Every container reads its own inside, so reading a document is a stack of calls as deep as the document is nested — and `> ` written a couple of thousand times is a four-kilobyte file that ran the stack out. A viewer showing a document from somewhere else could be stopped by one. Containers nest a hundred deep now and no further: past that nothing opens, the lines are the paragraphs they would be with no rules applied, and the markers on them are the characters they are. A hundred is past anything a person writes, and the two packages gave up in different places before this — the Dart one held out longer, which made it a difference between them as well as a crash.

### Changed

- **The status line, the split-pane arithmetic and the viewer's find are diffed against the TypeScript ones**, as part of the parity check. They are three more things this library ships twice, and until now each had only its doc comments promising the two halves agreed — the check reached the parsers, the two highlighters, the editing commands and the find bar, and stopped there.

  Widening it found one: `countWords` adds a spaced half to an unspaced one, every Han and kana character being a word where an English one is a run between two spaces, and **nothing in the corpus had ever been unspaced**. Half that function had never been compared at all — dropping it entirely changed nothing either half printed. `tool/corpus.json` ends with a document of Han and kana now, and dropping it fails the diff.

  Nothing in this package changed, and now none of the three can change in it alone. `tool/scrolls.json` and `tool/finds.json` are the two new fixtures: anchors somebody measured, and the queries the corpus is searched for.

- **Taking the link reference definitions off a paragraph is one pass over it.** Each definition was found by handing the pattern a fresh copy of everything left, so a block of two hundred definitions at the bottom of a README copied the block two hundred times. The scan starts where the last one ended.

- **Whether a toolbar button is pressed costs the size of the answer rather than the size of the selection.** Every button on the toolbar asks whether its command is already in force, each time the caret moves — and each of those questions copied the whole selection out of the document, or cut it into lines and then asked about them. A selection can be the whole file. The wrap is read at the edges of the selection now, and the line markers a line at a time, stopping at the first one that is not.

- **The viewer draws its document again only when the document changed.** It rebuilds for a great many reasons that are not the document — the pointer moving over a code block, the copy button saying it copied, the reader passing a heading with the outline open — and each of those built every block and every span again. The drawing is kept until something it is made of changes, and Flutter does not visit a subtree whose widget is the one already there. Written the way an application writes it: a `directives` map handed over inline is compared by the builders it names rather than by being a new map, and an `onLinkTap` closure written in place is read as "a link does something" rather than as a new answer.

- **Moving the caret stops redrawing the document beside it.** In `split` a caret that only moved is still a rebuild of the editor — the status bar counts the selection and every toolbar button reads it — and the preview was drawn again each time, over a document that had not changed. It is kept as the same widget while nothing it draws from changes, which is a subtree Flutter does not visit at all.

- **The viewer searches when the question changes rather than whenever it draws.** Finding is a walk over every run of text in the document, and a viewer redraws for reasons that have nothing to do with the search — a pointer moving over a code block, a menu opening, the reader passing a heading. Each of those was another walk over the whole document. The answer is kept until the query, the case switch or the document changes.

- **The outline finds where the reader is by halving rather than counting.** Which heading is at the top of the view was worked out by walking down from the first one, asking the render tree where each was — so on a reference page with a few hundred headings, reading near the bottom asked about every heading above the view, on every scroll notification. Headings come down the page in the order they are written, so it is a binary search.

- **Typing with the find bar open costs the same whatever it found.** Every line of the source surface looked through every match to work out which of them were on it, so a common word in a long document turned each keystroke into the length of the document times the number of matches — and the editor went stiff exactly when somebody was reading the results. The matches are cut against the lines once now, in one walk down both, and each line is handed only its own. The same change the React package got, in the same shape.

- **Numbering the footnotes costs what the document has rather than the square of it.** Each new footnote asked every one already numbered whether it had taken the name — so a document of a thousand notes asked half a million questions to number them. Each name is written down as it is given out and the question is asked once.

- **Finding without case sensitivity folds the document in one go.** The copy the search reads was built a character at a time so that a letter which changes length in lower case could be left alone, which is a string made and thrown away for every character in the document — on every keystroke in the find box. A text with nothing in it that needs that treatment is folded in the one call the platform has, and the answer is the same either way.

- **The drawn document is built where it can be seen.** Every block of it was built, laid out and kept, so a five-thousand-line document was tens of thousands of render objects to show a screenful — and changing the type from the toolbar laid all of them out again, which is a long document going still under a slider somebody is dragging. It is a lazy list now: measured against a document of two thousand four hundred blocks, what the viewer holds went from twenty-five thousand render objects to five hundred, and laying it out again after a change of type went from a second to a tenth of one — neither of which now grows with the document.

  It starts at four hundred blocks. Under that every block is built however tall the document is, which is what keeps a selection whole — a selection can only take text that has been built, and four hundred is past a long README, a reference page or a chapter. Over it a selection reaches the three screens either way the list keeps and no further; the toolbar's copy button takes the whole document from the Markdown rather than from the page, so copying all of a long document does not go through a selection.

- **Where a block of the drawn document sits is written down rather than looked up.** The outline's mark, scrolling to a heading, scrolling to a match and `MawyViewerAnchors.places` were four ways of asking the same question, and each answered it by finding the block's element through a `GlobalKey` and walking up the render tree — which works only for a block that is on the screen. Every block reports the height it was laid out at instead, and the running total of those is where each one begins. The outline measures without touching the document, and `places` now answers for every block rather than only the ones the frame happened to draw: a block that has been laid out is exact, and one that has not is worked out from the rest.

- **The source field is coloured where it can be seen rather than end to end.** `MawySourceController` read every line of the document for syntax and handed the field a span for every run it found, on every keystroke: a five-thousand-line file was tens of thousands of spans built to show forty lines. Only the lines near the view are read now, and everything else is handed over as the characters it is written with, in one span. The field still lays the whole document out, so the caret, the selection, the scroll extent and the line numbers beside it are exactly what they were. A document under six hundred lines is coloured the way it always was.

### Fixed

- **A picture no longer paints over the paragraphs around it.** A picture is an inline node, so it arrives on a line of a paragraph — and every line here is held to exactly the height of a line of text, which is what keeps a paragraph of Hangul and a paragraph of Latin from being two different heights. A line held to that height cannot hold a photograph: the picture was centred on the line and painted out of both ends of it, half over the paragraph above and half over the one below, which a reader saw as the next heading written across the picture. A line with a widget on it — a picture, or an inline directive the application drew — grows to fit it now, and every line without one is as even as it was.

- **A picture the document carries itself is drawn.** The URL policy allows a `data:` image on purpose — a document that carries its own illustrations is most of the point of a Markdown file being one file — and the renderer handed it to `Image.network`, which cannot open one anywhere but the web, where it happens to become an `<img>` tag. So an inline picture arrived on one platform and showed its alt text on the others. The bytes are read out of the URL and drawn from memory, once per picture rather than once per build.

- **A picture is decoded at the size it is drawn at.** Nothing said how wide it would be, so a photograph four thousand pixels across was decoded at four thousand to be shown at six hundred — and a decoded bitmap is four bytes a pixel, which is forty-eight megabytes for that one picture. It is decoded at the width the page actually has for it.

- **A hand on a trackpad scrolls as smoothly as it moves.** A mouse wheel turns in steps, and this package animates each step so the eye has a path between here and there. A trackpad is not that: two fingers moving send a stream of small movements, and easing every one of them over a seventh of a second turned one gesture into a run of little starts that never caught up with the hand. On the desktop the two are different events and only the wheel ever arrived here; on the web they are the same event, and the size of the movement now tells them apart.

- **The line numbers keep up with the lines.** Three things about the column beside the source. It repainted only when the text or the type changed, and neither of those is what moves a line: narrowing the pane rewraps every line under the same text in the same style, and the numbers stayed where they were beside them. It found the first number to draw by walking down from the first line of the document, so a five-thousand-line file showing forty of them asked the field where every line above the screen was, on every frame. And it made a `TextPainter` for every number and left it — a laid-out paragraph the engine gave it, leaked once per number per frame. The first line on screen is found by halving now, one painter draws the column, and it repaints whenever the field it reads from might have moved.

- **A copy the platform refuses says so.** The clipboard is a platform service and it can say no — no permission on the web, no channel on a platform without one — and nothing here was listening: the button said nothing, and the refusal went out as an error behind a button that appeared to have worked. It says "could not copy" for the same moment it would have said "copied", which is what the React package's copy button has always done. Both copy buttons, the toolbar's and a code block's.

- **A code block's copy button holds its label for the same moment however often it is pressed.** It counted with a delayed future, which cannot be called off, so a second press was cut short by the first press's timer still running. The toolbar's button was fixed for this a release ago and the one on a code block was not.

- **The editor stops reporting the document it was given as a change.** The field says something whenever the caret moves as well as whenever the text does, so an editor handed a document and then clicked in once called `onChange` with that same document — before anybody had typed a character. It says nothing until the text is actually different now, and nothing at all about a value the application set itself, which was the component telling the application what the application had just told it.

- **The caret stays where it was when the application hands the document back changed.** A controlled editor whose `value` came back a little different — trimmed, normalised, arrived from somewhere else — moved the caret to the end of the document, which in a long file is the writer's place lost on every keystroke. It is kept where it was, clamped into a document that got shorter.

- **A link keeps the recognizer it was given.** One was made for every link on every build — so a document with two hundred links in it allocated two hundred gesture recognizers each time the pointer moved over a code block — and the last build's were disposed at the top of the build replacing them, while the spans still holding them were on the tree. Each link keeps the one it has now, and the ones nothing asks for any more are let go of after the frame, when nothing holds them.

- **Reading the document happens when it changes rather than while the frame is being built.** The parse was lazy and sat inside `build`, and so did everything it threw away when the document turned out to be a new one — including telling the application's own `anchors` object to forget where every block was. A build is not the place to change something that outlives the frame. It is done when the text or the options change now. The keys the viewer keeps per block were the one thing that was never thrown away at all, so a document replaced by a shorter one left keys behind for positions that no longer existed, for as long as the viewer was on screen.

- **A case-insensitive search answers the way it does in the React package.** Both packages leave a letter alone when its lower case is not one character standing in the same place, because every offset a search reports is an offset into the document — and `İ` is that letter, in a language where `'İ'.toLowerCase()` is `i` and a combining dot. Dart drops the dot instead, one character for one, so this package folded it and the other did not: a search for `istanbul` found `İstanbul` here and nothing there. It is left as written on both sides now, which is what the doc comment in each of them had been claiming all along. Folding it properly means a Unicode case folding table, which would also fold `ς` to `σ` and is not something either package ships.

- **Two footnotes can no longer be given the same name.** A label is turned into an anchor by slugging it, and two labels that slug to the same word are told apart by the note's number — except where the document had already written that name out itself: `[^b-2]` took `b-2`, and the second `[^b]` was then called `b-2` as well. Two anchors with one name is a link that lands on whichever came first, which is the exact thing the numbering is there to prevent. A name that is taken is counted past now until one is free.

- **A document somebody has clicked into scrolls with the keyboard.** The arrows and `Page Up`/`Page Down` did nothing: a browser scrolls a focused box without being asked and only a `WidgetsApp` does here, which this package does not require — the same reason `Enter` and the space bar are written out for every button it draws. A reader who asked the platform for less movement gets the jump rather than the glide.

- **The bar between the panes of `split` is something a finger can hit.** It was five pixels, which is a target a hand misses — and the bar is the only way to change the split without a keyboard. Thirteen now, with the same one pixel drawn down the middle of it.

- **A picture the author described is named, and one they did not is skipped.** `![](…)` has no description, which in Markdown means decoration — and it was left in the tree as an image with no name, so a screen reader stopped on it to say "image" and nothing else.

- **A heading in a drawn document is a heading to a screen reader, and says which level.** It was text at a larger size, and text at a larger size is text: moving through a document by its headings — most of how one is read without sight — did not work at all. The React package writes an `<h1>` and gets this for nothing, and the viewer guide has been describing it for both packages.

- **The formatting commands have the keyboard shortcuts the guide said they had.** `Mod`+`B`, `Mod`+`I`, `Mod`+`K`, `Mod`+`E`, `Mod`+`1`/`2`/`3`, `Mod`+`0` and `Mod`+`Shift`+`X` all reach the source surface now. The toolbar was the only way to any of them, which is an editor that cannot be used without a pointer — and the table in the guide has been listing them for both packages while this one answered none.

  The table is `src/components/editor/MawyEditor.tsx`'s, under the same name. `Mod`+`S` is the one line still not answered here, there being nothing to save to; undo is Flutter's own and always was.

- **`Escape` and then `Tab` leaves the source surface.** `Tab` indents there, which is what a source surface is for — and it was the only thing `Tab` did, so somebody who cannot use a pointer had no way out of the editor at all. That is a keyboard trap, and the guide has been describing the way out of it for both packages while this one did not have it.

  One `Escape` arms it and anything else typed disarms it again, which is the rule the React package has and the rule CodeMirror, Monaco and GitHub's own editor all use. The surface is named to a screen reader now as well, and says how to leave — a way out nobody is told about is a way out that does not exist for the person who needed it. `MawyStrings.sourceEscape` is the sentence, in both languages.

- **The copy button says it copied for the same moment however often it is pressed.** The run of time putting the label back could not be called off, so a second press was cut short by the first one finishing — the button went back to saying "Copy" part-way through the press that had just been made, and read as having done nothing.

- **`Enter` stops carrying a definition marker down in an editor that does not read definition lists.** `parse.definitionLists: false` turns the syntax off in the parser, and the line `: like this` is then a paragraph — but `Enter` on it still wrote another `: ` on the next line, so the editor was helping with a construct the document it was editing does not have. `continueList` takes the option now, and defaults to reading them, which is what it did before.

- **The status bar says the column in the same characters as the count beside it.** The column was counted in UTF-16 units and the selection in code points, so a caret moved past an emoji jumped two columns while the selection count said one character. Both are code points now.

- **Finding without case sensitivity reports the match where it is.** A letter whose lower case is more than one character — `İ` is the everyday one — made the folded copy longer than the document, and every match after it was reported one place to the left. Replace then took out the wrong letters. The folding keeps the length now, at the cost of `İ` matching only itself.

- **A heading toggles off over a selection with a paragraph break in it.** Whether the lines were already headings was read from every line including the blank ones, and a blank line is not a heading — so the toggle never turned off, and pressing it again put `#` on the blank line instead. Blank lines are read past now, and left alone, which is what every other line marker already did.

- **Making two paragraphs a list no longer leaves an empty item between them.** The blank line separating them took a bullet of its own, so `- a`, `- `, `- b` came out of what was asked for as two items. A blank line inside a list is left alone now, which is what the ordered list beside it has always done.

  A quotation is the other way round and keeps its marker on the blank line, because a quotation without one there is two quotations rather than one with a paragraph break in it. Both packages, and the parity check diffs them.

## 1.0.0 (2026-09-02)

The entries below are a long list of work, and a long list is a minor version. What makes this a major is the promise that comes with the number: from here the exported API is under semantic versioning, so a name that goes away or changes shape waits for another major. The one break in this release is `MawyTokens`, under Changed.

### Added

- **The viewer can be searched too.** A find button on its toolbar, `Ctrl`+`F` (`Cmd`+`F`) while it has the focus, every match marked as the query is typed and the one being stepped through marked apart — the same bar and the same colours the editor has, without the second row, there being nothing in a viewer to put anything in place of.

  What it searches is the text the document _draws_, which is the whole difference between this and the editor's. `**bold**` puts six characters in the source and four on the page, and a reader looking for `bold` is looking at the page: so `bold` is found inside the bold, and `**` is found nowhere. A fenced code block is not searched — it is drawn as the highlighter's own spans, and cutting a mark into those would mean cutting every one of them — and a match cannot straddle two runs, so `hello` is not found across `he**llo**`.

  The button is the `find` toolbar item and the shortcut comes with it: a viewer whose `toolbar` leaves it out leaves `Ctrl`+`F` to the browser, which is the right answer for a viewer that fills the page. Taking it is worth doing for one inside a pane of its own, which the browser's find scrolls past rather than into.

- **Finding marks every match at once, and marks the one you are on apart from the rest.** Before, the only thing on the page saying where a match was was the selection sitting on it — one match, and only after pressing next. Typing a query told you how many there were and nothing about where.

  Every match is now painted as the query is typed, in a wash of yellow, with the one being stepped through in a stronger orange. Which turns the count beside the field into something you can check against the document rather than take on faith, and makes "next" a thing that visibly moves.

  In the source pane it goes into the spans the controller hands the field rather than into the field's own selection, so a match inside a heading or a link keeps the colour the highlighter gave it and gains a background. `MawyTokens.find` and `MawyTokens.findCurrent` are the two colours, and they are palette entries like every other colour here.

- **A mouse wheel arrives over a few frames rather than all at once.** Flutter answers a notch by putting the offset where the notch says on the next frame and drawing nothing in between, and it is the nothing in between that reads as hard: every browser and every native application on the platforms this is read on animates the same distance. A second notch while the first is still arriving adds to where it was going rather than starting again from where it has got to, which is what keeps a run of them feeling like one movement.

  Nothing to turn on, and a reader who asked the platform for less movement is given the jump back — the same answer the stylesheet gives under `prefers-reduced-motion`. The source surface keeps the platform's own wheel: a text field scrolls itself rather than being scrolled by something around it, and there is nowhere between the two to stand.

- **In `split`, the preview scrolls with the source.** It did not move at all: the two panes were two scrollers with nothing between them, and a writer who scrolled the source was reading one document and looking at another. The React package has lined the two up since it had a `split` at all, and the guide has been describing behaviour this package did not have.

  To the block rather than to the same fraction of the way down the file, which is the same answer and the same arithmetic: `src/editor/scroll.dart` is `src/internal/scroll.ts` in Dart, function for function. A fenced block is twenty lines of source and twenty lines of page, a paragraph is one long line of source and six of page, and the fraction through the file is not the fraction down the page — so the panes are lined up at the places they can agree on and run straight between them.

  The measuring is the half that cannot be shared, because a browser reads a bounding box off an element and this reads a viewport. `MawyViewerAnchors` is the new piece: hand one to a viewer and it keeps a key on every top-level block, ask it where they are and it measures them. It is what the editor uses, and it is public because an application lining any second view up with a drawn document needs exactly this and has no other way to get it.

- **The document is text a reader can select and copy.** Nothing in one was selectable, in the viewer and in the editor's preview alike — dragging across a paragraph took nothing and there was no way to get a sentence out of a document but to retype it. That is the cost of drawing a document as widgets rather than as markup, which is also what makes the safe default free: a page of widgets selects nothing unless it is put inside a region that says so.

  Dragging selects, a double tap takes the word under it, and `Ctrl`/`Cmd`+`C` copies. No handles and no context menu — both of those are Material's or Cupertino's, and a package that draws its own everything else should not pull in a toolbar it did not design — so the copy keys are written out here for the same reason `Enter` and the space bar are.

- **The outline panel is reachable by a keyboard, and following an entry takes the focus with it.** Every entry is its own tab stop and is pressed with `Enter` or the space bar, the way the React package's `<button>`s in an `<ol>` are — not the toolbar's one stop and a set of arrows, because a list of a document's headings is not a row worth learning a second way of moving through.

  It was the one piece of the accessibility work that got left behind: the toolbar, the menus, the sliders and the reset links were all made to take the focus, and the entries stayed a `GestureDetector` — which is a panel a keyboard can open and cannot then use.

  Following an entry now moves the focus as well as the scroll, so the next `Tab` carries on from the heading rather than from the panel. The heading is `skipTraversal`, which is the web's `tabIndex = -1` said the other way round: somewhere the focus can be put, and not somewhere `Tab` stops on the way past. That was the last thing the viewer guide said this package did not do yet, and the sentence is gone.

- **The bar between the two panes of `split` is something to take hold of.** The React package's, said in Flutter's terms and landing in the same commit: drag it, or focus it and use the arrows — `Shift` for a bigger step, `Home` and `End` for the ends, `Enter` or a double tap for half and half again.

  A `Semantics` slider rather than a button, which is what it is, and it says its value as a percentage. It stops well short of either edge, because a pane pushed to nothing is a pane nobody can get back. `MawyStrings.divider` is the only thing added.

- **The source surface answers the pointer.** Dragging across it selects, a double tap takes the word under it, a triple tap takes the line, and a long press on a touch screen raises the handles. None of that worked: an `EditableText` on its own puts the caret where it is tapped and stops there, and everything else a text field does with a pointer is `TextSelectionGestureDetectorBuilder`, which `TextField` builds around its own field and this did not build around its own.

  It costs nothing this package has refused elsewhere — the builder is in `package:flutter/widgets.dart` rather than in Material. `rendererIgnoresPointer` goes with it, because the detector and the renderer both want the gesture and two things reading one drag is a caret that jumps to where a selection was meant to start.

  The force press stays off. What it opens is a magnifier and a toolbar and both of those are Cupertino's, and a gesture that starts something this package cannot finish is worse than one that does nothing.

  Everything the toolbar does to a selection was reachable only from the keyboard until now, which is most of what the toolbar is for.

- **The highlighter knows Dart**, which is the language this package is written in and the one it could not colour. Every Flutter example on the documentation site is a fenced `dart` block and every one of them was drawn plain. Doc comments, annotations, strings written across three quotes, and the six lowercase type names read as types rather than keywords. Both packages in the same commit, and `tool/parity.dart` diffs every token the two produce over a piece of it.

- **One more of CommonMark, and the number moved from 639 to 640.** The React package's parser change, mirrored here in the same commit: a blank line loosens the list it is in when it is past the end of one of the item's blocks and inside none of them, rather than between two of them — which is where an item ending in a reference definition used to fall out.

- **One more of CommonMark, and the number moved from 638 to 639.** The React package's parser change, mirrored here in the same commit: a lazily taken line cannot cut its paragraph short. A container hands one over with its indentation gone, and a bullet four columns in — not a marker where it was written — used to open a list nobody wrote.

- **Three more of CommonMark, and the number moved from 635 to 638.** The React package's parser change, mirrored here in the same commit: all three are the lazy continuation. Only a paragraph is continued across a line that forgot its `>` — a fence the quotation opened, or code it indented, is waiting for nothing — and a line taken that way is the paragraph's next line and not a setext underline.

- **One more of CommonMark, and the number moved from 634 to 635.** The React package's parser change, mirrored here in the same commit: a document that ends in a newline has that many lines and not one more, and the blank line the reader used to invent at the end of one made a fence the document never closed a line taller than its code is.

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

  It is a `MawyTokensBuilder` rather than one palette because a viewer settles on its brightness _after_ it has been handed everything else — from `colorScheme`, or from the platform where that is `system` — and a document that follows the platform has to be able to follow it in both palettes rather than only in the one it opened on. An editor passes what it is given to its preview, so an editor and the document it is editing are never two palettes.

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

- **Directives — a way for a document to carry a construct this package does not know about.** The parser reads a shape and stops there: `:::name[label]{key=value}` … `:::` around blocks, `::name[label]{attrs}` on a line of its own, and `:name[label]{attrs}` inside a sentence. What each one _means_ is the application's, through `directives`:

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

- **The headings panel marks the heading the reader is at.** It marked nothing at all, so a panel open beside a long document was a list with no answer in it — the React package's has had the rule down the leading edge since it had a panel. Measured from the document's scroll, and pinned to whatever was pressed until the reader scrolls somewhere of their own, which is the same rule and for the same reason: following an entry is an animated scroll that passes over every heading between here and there.

- **The source surface numbers its lines**, the way the React package's has since it had a source surface — an editor is a place errors are reported by line, and a line nobody can name is a line nobody can be sent to. `MawyEditor.lineNumbers` turns it off, and is on by default there too.

  A wrapped line is two rows on the screen and one number down the side, which is the awkward half and the reason this took a while: the numbers are painted from the caret rects the laid-out field already reports rather than from a second layout of the same text, so the two cannot drift — there is only one of them.

- **A toolbar button says its name under the pointer.** An icon with no word beside it is a control nobody can name, and until now only a screen reader was told. It is the React package's tooltip in the same palette and the same shape, and it is hung off a pointer entering the button rather than off the focus highlight — those are two different questions, and a finger raises neither.

- **`MawyEditor.onOpen`, and an editor holding nothing offers to be filled.** The `open` button is on the default toolbar now, and where the document is empty the preview stops being a blank rectangle and becomes the way in — the React package's empty state, in the pane the document is going to appear in. Both are drawn only where `onOpen` was given, because a control that cannot do what it says is worse than none.

  It is the button and not the picker. Reading a file is still a plugin and still the application's, which is what this package has said about `open` and `save` from the start; what is new is that the editor draws the control and says when it is worth offering, instead of leaving an application to build its own. `MawyStrings` gains `openFile`, `emptyTitle`, `emptyHint` and `emptyAction`, which the React package already had.

### Changed

- **`MawyTokens` has two more colours, and its constructor asks for them.** `find` and `findCurrent` are what the find bar paints over what it found. Every field on that class is `required` and these are no exception, so an application that builds a palette with `MawyTokens(...)` from nothing has two more arguments to pass; one that starts from `MawyTokens.of(brightness)` or `.copyWith(...)`, which is nearly everybody, has nothing to change. This is the sort of thing a major version is for, and there is not another one due.

- **The editor's theme control is a menu rather than a button that cycles.** Light, dark and the platform's, all three at once with a tick beside the one in use — which is what the viewer's toolbar here already offered and what the React package's editor has always offered. A button that cycles is a button pressed twice to reach the value on the other side of the one you did not want, and the list will be longer than three the first time this library ships a palette that is neither light nor dark.

  `MawyToolbarChoice` is the panel behind it, public now, because there are two toolbars in this package and the list a theme is chosen from should not be two lists that resemble each other.

- **The headings panel is called "Contents".** The React package's change, in the same commit and for the same reason: "Outline" is what the thing is to whoever wrote it rather than what a reader is looking for, and the Korean has always said 목차. `MawyViewerToolbarItem.outline` is unchanged, because that is an application's API.

- **An outline entry says its heading once.** The panel named each entry after the heading it points at and then drew that heading inside it, and a screen reader handed both read the words out and read them out again — `Second, Second, button`. The drawn words are the drawing now, and the name is the name. The React package's entry is a `<button>` with the heading inside it and has always said it once, which is what makes this a difference between the two rather than a preference.

- **`MawyTokens` compares on every colour rather than on six of them.** Six was enough while the only palettes in existence were this package's own two, and became wrong the moment an application could build a third: two palettes differing in nothing but their alert colours called themselves the same palette, and a viewer handed the second one would not have redrawn.

- **The editor's toolbar is the React package's toolbar, control for control and in the same order.** The two had drifted into different arrangements of the same buttons, and the three heading levels were three buttons in a row rather than one menu — which is four answers to one question drawn as four questions. `heading` opens a list now, with body text on it, the way the browser's does.

  The panels are hung from the leading edge of the button that opened them and flip to the trailing edge only where that would run them off, which is the rule the React package's menu already followed. It was not one this package needed while every menu lived at the right of a viewer's toolbar; the first menu on the _left_ of an editor's hung off the window.

- **The source surface's placeholder says where the typing goes**, rather than naming the format the reader is already looking at. The React package's placeholder changed with it, so the two still say the same thing.

### Fixed

- **`Enter` in the find field goes to the next match.** It did nothing at all on the web, and took the focus with it everywhere else — so the second `Enter` was a newline typed into the document, and every keystroke after that was an edit somebody had asked for a search.

  Two things were wrong and the web one is worth writing down. A Flutter view puts a real DOM input under whichever field has the focus, and the browser keeps `Enter` for itself: what arrives in the framework is the field's input _action_, never a key event, so the bar's key handler was listening for something that never came. It listens for the action now — and for `TextInputAction.unspecified`, which is the only one the framework does not read as "finished": every named action gives up the focus and asks the platform for a fresh input, which is the opposite of what pressing `Enter` in a find bar means.

  The selection still moves to the match, and the document still picks up from there the moment the bar is closed. What it no longer does is take the focus while the bar is open, which is what the marking above is for: the match is shown where it is rather than shown by being selected, and the field the query is being typed in keeps the keyboard.

- **A task list's box sits on the middle of its first line.** It was nudged down by a number written by hand, which is right at one line height and above the text at every other — and the default is not that one, so every task list in the package was drawn with its boxes riding high. It is half the difference between the line box and the type in it now, which is where the browser's `vertical-align` puts the React package's.

- **Every menu on both toolbars opens.** They did nothing at all, and in a release build they did nothing loudly: the panels are raised into an [Overlay], `Overlay.of` asserts in debug and throws a null check with asserts stripped, and an application that has neither `MaterialApp` nor routes has no overlay for them to go into. That is not an exotic tree — it is what an application that wanted neither Material nor Cupertino writes, and this package's own gallery is one, which is why every Flutter preview on the documentation site had a toolbar where nothing happened.

  A viewer and an editor bring an overlay when they cannot find one, and use the application's when there is one. The typeface, the three sliders, the column width and the theme are all a menu, and all of them were affected.

- **The editor's toolbar is the width of the editor.** A `Column` centres its children unless it is told otherwise, so the bar was as wide as its buttons and floating in the middle of the window, with the rule under it stopping where the buttons stopped. The viewer's was already full width by accident of what is inside it, and now both say so.

- **A focused control is drawn with a ring and not a block.** The focus indicator was a `BoxShadow` spread two pixels behind the button, and a shadow is a filled shape — behind a button whose own background is nothing, what it draws is a solid rectangle of accent with the glyph lost inside it. Flutter gives the first traversable control the focus when a view takes it, so the first button on a toolbar turned into a purple square the moment anybody clicked anywhere. A foreground border is hollow, takes no pixel off the button, and is the stylesheet's `outline` said in Flutter.

- **Four things about the menus, and all four were the React package doing something else.**

  **A second menu button opens on the first press.** The panel's tap-catcher was a `GestureDetector`, which enters the gesture arena and wins the tap — so pressing another menu button while one was open shut the panel and stopped there, and the button had to be pressed again. It hears the pointer go down and takes nothing now, which is the `mousedown` on the document the React package listens for.

  **A ring is drawn where a keyboard put the focus, and not where a pointer did.** Flutter highlights a focused control whenever the platform's highlight mode is `traditional`, which on a desktop it always is — so a click drew a ring, and a panel handing the focus back to its button drew one on a button nobody had touched. `:focus-visible` is the browser's rule and now it is this package's.

  **A panel opens with the focus on the option that is already true**, rather than on the first of the list. Opening the column-width menu on a document set to normal put the highlight on narrow, which is a panel pointing at an answer nobody gave.

  **Every option has the glyph its counterpart has in the browser.** A list of three themes with no sun, moon or half-and-half on it is a different control rather than the same one in another language.

- **A slider has a thumb, and the way back to the default is always under it.** The track was a bar with no handle on it — a browser draws one on `input[type=range]` and a reader who has moved one is looking for it — and the reset appeared only once a value had moved, so the panel changed height the moment a slider was touched. It is present and inert at the default now, which is the rule the React package's is under.

- **Every line of a paragraph is the same height.** A line box in Flutter is as tall as what is on it, so one line of Hangul and the next line of Latin inside a single paragraph were two different heights — which nothing showed until the document became selectable, and then a selection across a paragraph was a ragged stack of blocks with gaps in it rather than a run of text. A browser does not do that: `line-height` is the line there and a fallback font does not get a vote. A strut says the same thing here.

- **A table is as wide as what holds it, and no wider unless its columns need it.** It was laid out against the width of the _window_ — a number a renderer drawing into a pane has no business reading — so a table in one pane of `split` was half a screen too wide and scrolled sideways whatever was in it. `width: 100%` inside an `overflow-x: auto` is what the stylesheet says, and it is what this says now.

- **Every cell of the status bar sits on the same line.** A line box is as tall as what is on it, so the size — which is never anything but digits and a unit — was drawn a little off the line the rest of the row was on, and further off in Korean, where every other cell has a Hangul word in it. The row is centred and every cell is strutted to one height.

- **A menu shuts when a pointer goes down outside it — including on another menu's button.** A panel put up over a page has to hear a press it did not receive, and the catcher inside the overlay that was doing that only worked some of the time: a `GestureDetector` there takes the press, so the next control needs a second one, and a translucent `Listener` has to survive a hit test that runs through an overlay, a follower and a stack before it reaches the bottom. In a release web build it did not.

  It is a route on the pointer router now, which is the `mousedown` on the document the React package's menu listens for, said in Flutter. Its own button is left out, because that button is about to toggle the panel shut by itself.

- **A link is followed by a click, and not only by a tap.** The selection around the document watches the mouse for a drag, and two pixels of hand movement is a drag — so on a desktop it took the gesture before the link's own recognizer could declare a tap, and clicking a link selected a word instead of going anywhere. The press is read by a `Listener` as well now, which is not in the gesture arena and cannot lose it; the recognizer stays, because it is what makes a link tappable to a screen reader and what answers on a touch screen. Whichever of the two gets there first follows the link, and the other stands down.

- **The mark beside the current heading is a rule and not a bracket.** It was a border on the row, and a border follows that row's corner radius — so two pixels of rule came out bent into the same bracket the stylesheet was changed away from drawing a few entries above this one. Its own box, against the panel's leading edge, straight.

- **The leading is split evenly, which is what a browser does with `line-height`.** Flutter's default divides it in proportion to the font's own ascent and descent, so where a baseline sits inside a line depends on which font drew that line — and a document is two fonts the moment it has Hangul and Latin in it. That is what left the size, the one cell of the status bar with no Hangul in it, sitting off the line the rest of the row was on. It is the browser's half-leading now, in the status bar and in every paragraph.

- **A selection in the source is a run of text and not a row of blocks.** Flutter fits a highlight box to each run's own glyphs by default, so a line of Hangul and a line of Latin were highlighted at two different heights with a gap left between the lines. `BoxHeightStyle.max` is the browser's answer, and it is a knob a text field has. The drawn document has no such knob — Flutter paints a selection there itself, with the tight boxes hardcoded — so the gaps between lines are still there when a _document_ is selected rather than the source.

## 0.1.0 (2026-08-31)

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
