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

- **The editor's toolbar wraps to a second row and spills out of it.**
  `.mawy-toolbar-editor` in `packages/react/src/styles.css` is `flex-wrap: wrap`
  inside a `.mawy-toolbar` that is laid out as one row, so a narrow editor gets
  two rows of buttons and the lower one leaves the bar. What is wanted is
  grouping by what the buttons are for and an overflow menu for whatever does
  not fit, rather than a wrap. The Flutter toolbar has not been looked at for
  the same thing.

- **Nothing in the documentation lets a reader type into either package.** A
  demo page, one per framework, with the editor and the viewer live and most of
  what they do switched on — enough to find the next four items on this list by
  using them rather than by reading them. Uploading an image can be mimed; there
  is no server to put one on.

- **The split view's divider does not move.** The source and the preview are
  half and half, and a reader who wants more of one has no way to say so. Both
  packages.

## Reported, not reproduced

- **Most of the Flutter editor's toolbar buttons do nothing in the documentation
  gallery.** The commands are wired — `_commands` in
  `packages/flutter/lib/src/editor/mawy_editor.dart` maps every button to a
  `MawyCommand`, and `mawy_editor_test.dart` presses `Bold` and asserts the
  document changed. The likeliest cause has since been fixed: the source surface
  had no pointer selection at all, so every command that acts on one had nothing
  to act on. Watch it again on the next documentation build before looking
  further.

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
