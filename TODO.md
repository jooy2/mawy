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

A read of both packages end to end, turned into a list to work through. It is
here because it is longer than a session, and it comes back out of this file
once the list is empty — what survives it belongs in the sections below.

What has come off it so far is every bug the read found in the React package,
the three prototype-lookup holes, the whole accessibility run in both — the
keyboard trap on the Flutter source surface, the formatting shortcuts it did
not have, headings that were not headings to a screen reader, and the several
smaller things a keyboard or a screen reader could not reach on either side —
and the React performance work down to the ones that are a decision: the two
walks over the whole document on every keystroke, the listeners that came off
the element and went back on for each of them, the reader that built a line a
character at a time, the folding that did the same, the undo history that had a
depth and no size, the highlighter asked for once per render, and the two places
where reading a document cost the square of what was in it. Each is a commit
with the test that fails without it, and each has a line in the changelog of the
package it landed in.

Four lines came off it for the other reason — the read was wrong about them, or
measuring said the change would not pay — and they are written down under
"Deliberate" below rather than left looking undone. Two more were closed by a
decision rather than by a change and are there as well.

Every line still here has been read in the code. `?` marks the ones that are a
decision before they are a change: a render structure, an anchor's name, the
size of a public API. Those are last, and they are not to be started without an
answer.

### packages/react

- Performance — `?R1` block-level memo boundaries, `?R2` a windowed source pane.
- SEO and accessibility — `?R16` heading `id`s collide between two viewers,
  `?R25` no server-only render path.
- Security — `R29` the sanitiser round-trips through a string, `R30` `id` and
  `name` survive into the host page, `R31` `raw` needs a louder warning, `R32` a
  font link with no referrer policy.
- Optimisation — `R33` overflowed groups render twice, `R34` separators are not
  measured, `R35` line splitting is written twice and parity does not see it,
  `R36` five drag handlers in two components, `R37` two identical file inputs,
  `R38` an effect that allocates per render.
- Bugs — `R59` text dragged from one place in the drawn document to another is
  copied rather than moved.
- Tests — `R55` a large document, `R57` the sanitiser as a fixed point.

### packages/flutter

- Performance — `?F1` the source field repaints the whole document, `F2` quadratic
  piece matching, `F3` line numbers count from the first line, `F4` `TextPainter`
  is never disposed, `?F5` the viewer builds every block at once, `F6` a caret move
  rebuilds the preview, `F7` matches recomputed per build, `F8` recognizers rebuilt
  per build, `F9` every heading measured per scroll, `F10` images decode at full
  size, `F11` `commandActive` per button, `F12` `_blocks` is never cleared.
- Security — `F21` no hook for the image request, `F22` a `data:` image the
  sanitiser allows and the renderer cannot draw, `F23` no size ceiling.
- Optimisation — `F25` shared toolbar widgets live in the viewer's file, `?F26`
  the AST is public API, `F27` three maps for one enum, `F28` controlled and
  uncontrolled by hand.
- Bugs — `F30` `build` mutates state, `F31` recognizers disposed while mounted,
  `F32` the caret jumps to the end, `F33` a trackpad scrolls in steps, `F34` the
  placeholder ignores direction, `F35` `shouldRepaint` compares too little,
  `F36` a clipboard failure reads as success, `F45` `onChange` reports the
  document it started with the first time the controller says anything.
- Tests — `F39` a large document, `F41` a `data:` image per platform, `F42` the
  image failure path, `F43` a run of scroll events.

## Confirmed

- **The two packages disagree about `İ` in a case-insensitive search.** Folding
  keeps a character that would change length, and `İ` is that character in
  JavaScript — `'İ'.toLowerCase()` is `i` and a combining dot, two characters —
  so React leaves it alone and a search for `istanbul` does not find
  `İstanbul`. Dart's `toLowerCase` drops the dot instead, one character for one,
  so Flutter folds it to `i` and does find it. Both files say in their own doc
  comment that `İ` matches only itself, and one of them is wrong about its own
  code. `search.dart` is not covered by the parity diff, which is the parsers
  only, and there is no Dart test over the pure functions in it at all — a twin
  of `test/internal/search.test.ts` is what would have caught this.

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
