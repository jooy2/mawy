# What is not done yet

The repository has no issue tracker in use, and a session that ends takes its
notes with it. This file is where the work that outlived a session lives, so
that "what is left" is a file somebody can read rather than a thing somebody
remembers.

Two rules keep it honest:

- **Nothing goes here that a check already enforces.** The twelve CommonMark
  examples the parser does not answer are in `DEVIATIONS` in
  `packages/react/test/internal/markdown/commonmark.test.ts`, with the reason
  for each, and the suite fails if that list goes stale. This file points at it
  rather than copying it.
- **Confirmed and unconfirmed are marked apart.** A line that says where the
  code is has been read; a line that says "reported" has not been reproduced
  yet, and saying so is the difference between a list and a rumour.

## The audit

A read of both packages end to end, turned into a list to work through. **It is
done**, except for one thing that is a project rather than a line: drawing only
the part of a long document that anybody can see, which has a section of its own
below. Everything else the read found is a commit with the test that fails
without it, and a line in the changelog of the package it landed in.

Nine things came out of working through it that the read had not seen, and all
nine were worse than what it had. A document could be given two footnotes with
the same anchor. A document nested a couple of thousand containers deep took the
page down with it, at a different depth in each of the two packages. The two
packages folded `İ` differently in a case-insensitive search. A picture a
document carried inside itself drew on the web and nowhere else. A code block's
copy button never got the fix the toolbar's had. The column of line numbers
leaked a laid-out paragraph for every number it drew, every frame. The editor
reported the document it was handed as a change nobody made, and a controlled
one sent the caret to the end of the file whenever the application normalised
what was typed. And the Flutter editor's `colorScheme` read as controlled and
behaved as a default.

Three of those are why `test/editor/search_test.dart` and
`test/editor/commands_test.dart` exist. `tool/parity.dart` compares the two
_parsers_, and everything else this library ships twice had only its doc
comments promising the two agreed.

Six lines came off the list for the other reason — the read was wrong about
them, or measuring said the change would not pay — and they are under
"Deliberate" below rather than left looking undone. Two more were closed by a
decision rather than by a change and are there as well.

## Drawing only what can be seen

The one thing left, and three shapes of the same idea.

**The source pane draws every line**, in both packages. The React surface is a
`<textarea>` with a coloured copy of the same text laid exactly underneath it,
and that copy is every line of the document; the Flutter one hands its
controller a span for every line on every keystroke. A five-thousand-line file
is five thousand rows built to show forty.

What makes it hard is what the two layers have to agree about. Every line has to
sit exactly where the field puts it, so a window has to know the height of
everything above it before it can leave any of it out — and a wrapped line is
not one row. The browser's own find, the caret, the selection and the length of
the scrollbar are all read off a layer that would no longer hold the whole
document. This wants a design before it wants an afternoon.

**The Flutter viewer builds every block at once.** Half of this is done: the
viewer keeps the widgets it built and hands the same ones back until something
they are drawn from changes, so a rebuild for anything that is not the document
now costs nothing. What is _not_ done is a lazy list, and it is not done because
four things the viewer offers stand on every block being built:

- Selecting across the whole document and copying it. A `SelectableRegion` over
  a lazy list can only select what has been built.
- Scrolling to a match. `_showMatch` finds the block by its `GlobalKey`, and an
  unbuilt block has no context to find.
- Scrolling to a heading, and the outline's mark on whichever one is at the top.
  Both measure a heading through its key, and the binary search in
  `_measureActive` reads an unmeasurable heading as "wherever the search is
  looking".
- `MawyViewerAnchors.places()`, which is half of what lines the editor's two
  panes up in `split`.

Every one of those wants an index-to-offset answer that Flutter does not give
you without either fixed extents or a package, and this repository has one
dependency and guards it. Whoever picks this up should start there — decide how
a block's offset is known before the block is built — and the other four fall
out of it.

## Confirmed

- **`status`, `scroll` and `find` are still tested once.** `tool/parity.dart`
  diffs the two _parsers_, so everything else this library ships twice has only
  its doc comments promising the two agree. `search` and `commands` have twins
  now — `test/editor/search_test.dart` and `test/editor/commands_test.dart` —
  and the first was written because they did not agree: `İ` folded one way in
  Dart and another in TypeScript. The other three want the same treatment, or
  the parity script wants widening to run them.

- **The Flutter preview does not follow the site's own light/dark switch.** The
  React demos take `colorScheme` as a prop and the site drives it; the framed
  gallery is handed `demo` and `locale` in its query string and nothing else, so
  it draws in `MawyColorScheme.system` — the platform's brightness, which is not
  the same answer as the switch above the menu the moment a reader disagrees
  with their OS. Reading it out of the query string would reload a Flutter
  engine on every toggle, which is why it was not done that way; `postMessage`
  into the frame is the shape that would work, and it wants `dart:js_interop` in
  `packages/flutter/example`.

## Deliberate, and not to be quietly fixed

- **CommonMark's remaining twelve**, in `DEVIATIONS`. Nine are decisions with
  their reasons written beside them: the scheme allowlist, the empty
  destination, the size of the character reference table. Of the other three,
  two are tabs — a container that consumes part of one has to expand it into
  spaces that are not in the document, and every offset in this library is an
  offset into the document, which is what the editor's click-to-caret stands on
  — and the third wants a Unicode case folding table.
- **`wysiwyg` in the Flutter package**, and its file open, its own undo history
  and its image paste. The reasons are in `docs/*/guide/editor.md` and in the
  changelog, in both languages.
- **The two headings this library writes being `h2`.** The read of both
  packages had this down as something to make configurable. The document's own
  headings are the author's and cannot be moved anyway, and these two are the
  outline panel's title and the empty state's — restyled or relabelled from
  outside through `.mawy-outline-title` and `.mawy-empty-title`. Written down
  in `docs/*/guide/viewer.md` under Accessibility.
- **Writing an image's dimensions in the document.** `--mawy-doc-image-aspect`
  is the answer for now: an application that knows what shape its pictures are
  reserves the box, and nothing is reserved otherwise. A syntax the parser reads
  — `![alt](url =800x600)` — is the other answer and may come later; it would
  want the same syntax in both parsers and a line in the parity corpus.
- **The Flutter toolbar scrolling sideways rather than folding into a menu.**
  The read of both packages had this down as a difference to close; it is a
  decision, and `docs/*/guide/editor.md` gives the reason under the toolbar —
  a row that scrolls under a finger is what a toolbar does on a touch screen,
  and a menu is what one does on a page with a pointer.
- **One `<span>` per coloured token in a code block.** The read of both packages
  had merging the adjacent ones of the same kind down as a way to draw fewer
  elements. Measured against the highlighter this package ships, a sample of
  TypeScript came out as forty-four tokens with no two of the same kind next to
  each other, so there is nothing to merge and the change would be code written
  for a highlighter somebody else might write. Unkinded tokens are already drawn
  as the characters they are rather than wrapped.

- **The Flutter source field's placeholder and the direction it is in.** The read of both packages had this down as a placeholder that ignores which way the text runs. Measured in both directions, its box is exactly the field's box — right of the gutter in one, left of it in the other — and both it and the field take their alignment from the same `Directionality`, so the words start where the caret does either way.
- **What a picture is allowed to cost.** The read had a size ceiling down as missing. What fills a phone's memory is the decoded bitmap rather than the file, and that is now bounded by the width the page has for it; the bytes behind a `data:` picture are bounded by the document they are written in. What is left unbounded is a remote picture's download, which is the same in every Markdown renderer and in the browser the React package draws in — and an application that minds now has `imageBuilder` and `image`, which is where a ceiling belongs: on the request the application makes rather than on the one the viewer makes for it.
- **What the viewer's find bar does not search**, in `find.ts` and `find.dart`.
  A match cannot straddle two drawn runs, so `hello` is not found across
  `he**llo**`; a fenced code block is not searched at all. Both are written down
  in the doc comment at the top of each file and on the API page. The first is a
  refusal to report a match nothing can point at, and the second is a refusal to
  cut a mark into every span the highlighter produced.

## Release

`1.0.0` is the current number for both packages, dated in each changelog. The
number is a promise as well as a version: from here the exported API is under
semantic versioning, so a name that goes away or changes shape waits for a major.

The steps are bumping the version in `packages/react/package.json` and
`packages/flutter/pubspec.yaml`, retitling `## Unreleased` with the number and
the date, `npm run size -- --update` if a change moved the bundle — the figures
on the site's getting-started page are those numbers and move with them —
tagging, and `--provenance` for npm, which wants a workflow with an id token.
Publishing is a person with credentials rather than anything here.
