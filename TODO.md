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

Every line has been read in the code. `?` marks the seven that are a decision
before they are a change: a render structure, an anchor's name, the size of a
public API. Those are last, and they are not to be started without an answer.

### packages/react

- Performance — `?R1` block-level memo boundaries, `?R2` a windowed source pane,
  `R3` line splitting is linear per piece, `R4` `domAt` walks the whole document,
  `R5` `runs(root)` on every backspace, `R6` listeners re-bound per keystroke,
  `R7` `read()` builds a line a character at a time, `R8` the history has no byte
  ceiling, `R9` a lowercased copy per search, `R10` the highlighter effect re-runs
  per render, `R11` footnote slugs collide in quadratic time, `R12` definitions
  re-slice the paragraph, `R13` a span per code token.
- SEO and accessibility — `R14` no `lang`, `R15` scrollers no keyboard reaches,
  `?R16` heading `id`s collide between two viewers, `R17` a `dialog` that does not
  take focus, `R18` a `radiogroup` without arrows, `R19` a tooltip that cannot be
  dismissed, `R20` an `aria-label` on a `p`, `R21` a hard-coded `h2`, `R22` a 5px
  target, `R23` images without dimensions, `R24` sanitised HTML hydrates
  differently, `?R25` no server-only render path.
- Security — `R26` `:::constructor` reaches `Object.prototype` and throws mid
  render, `R27` `supports()` answers for `toString`, `R28` attributes carry a
  prototype, `R29` the sanitiser round-trips through a string, `R30` `id` and
  `name` survive into the host page, `R31` `raw` needs a louder warning, `R32` a
  font link with no referrer policy.
- Optimisation — `R33` overflowed groups render twice, `R34` separators are not
  measured, `R35` line splitting is written twice and parity does not see it,
  `R36` five drag handlers in two components, `R37` two identical file inputs,
  `R38` an effect that allocates per render.
- Bugs — `R39` the divider's pointer listeners are never removed, `R40` cut does
  not delete, `R41` word deletion does nothing, `R42` list markers land on blank
  lines, `R43` heading toggle reads blank lines, `R44` `toLowerCase` moves the
  offsets, `R45` the status bar mixes two units, `R46` `domAt` uses the global
  `document`, `R47` the outline writes `tabIndex` into the DOM, `R48` `Enter`
  continues a definition list that is off, `R49` `svg` is compared uppercase,
  `R50` `fileDrop` reads anything as text.
- Tests — `R51` the divider under a pointer, `R52` a table over `beforeinput`
  types, `R53` blank lines inside a multi-paragraph selection, `R54` a document
  full of prototype names, `R55` a large document, `R56` the history's ceiling,
  `R57` the sanitiser as a fixed point, `R58` server render and hydration.

### packages/flutter

- Performance — `?F1` the source field repaints the whole document, `F2` quadratic
  piece matching, `F3` line numbers count from the first line, `F4` `TextPainter`
  is never disposed, `?F5` the viewer builds every block at once, `F6` a caret move
  rebuilds the preview, `F7` matches recomputed per build, `F8` recognizers rebuilt
  per build, `F9` every heading measured per scroll, `F10` images decode at full
  size, `F11` `commandActive` per button, `F12` `_blocks` is never cleared.
- SEO and accessibility — `F13` `Tab` is a keyboard trap, `F14` no formatting
  shortcuts, `F15` the toolbar scrolls sideways instead of folding, `F16` the
  status bar has no semantics, `F17` the document may merge into one node,
  `F18` no keyboard scrolling, `F19` a 5px target, `F20` an empty `alt` is not
  decorative.
- Security — `F21` no hook for the image request, `F22` a `data:` image the
  sanitiser allows and the renderer cannot draw, `F23` no size ceiling.
- Optimisation — `F24` a comment written twice, `F25` shared toolbar widgets live
  in the viewer's file, `?F26` the AST is public API, `F27` three maps for one
  enum, `F28` controlled and uncontrolled by hand.
- Bugs — `F29` the copy timer is not cancelled, `F30` `build` mutates state,
  `F31` recognizers disposed while mounted, `F32` the caret jumps to the end,
  `F33` a trackpad scrolls in steps, `F34` the placeholder ignores direction,
  `F35` `shouldRepaint` compares too little, `F36` a clipboard failure reads as
  success.
- Tests — `F37` leaving the source field, `F38` the shortcut table, `F39` a large
  document, `F40` the copy button pressed twice, `F41` a `data:` image per
  platform, `F42` the image failure path, `F43` a run of scroll events, `F44` the
  document's semantics tree.

## Confirmed

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
