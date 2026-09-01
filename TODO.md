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

## Reported, not reproduced

- **Most of the Flutter editor's toolbar buttons do nothing in the documentation
  gallery.** The commands are wired — `_commands` in
  `packages/flutter/lib/src/editor/mawy_editor.dart` maps every button to a
  `MawyCommand`, and `mawy_editor_test.dart` presses `Bold` and asserts the
  document changed. The likeliest cause has since been fixed: the source surface
  had no pointer selection at all, so every command that acts on one had nothing
  to act on.

  The gallery has been rebuilt since, with the pointer fix in it and a
  playground page to try it on, but a Flutter web build does not paint in the
  environment these sessions run in — the engine loads and the scene stays
  empty — so it has still not actually been watched. Somebody with a browser
  should open `/guide/playground` with the switch set to Flutter, select a word
  and press **Bold**.

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

## Release

`0.1.0` is out for both packages and `Unreleased` has a great deal on it.
Bumping the version, dating the section, tagging, and `--provenance` for npm
(which wants a workflow with an id token) are the steps; publishing is a person
with credentials rather than anything here.
