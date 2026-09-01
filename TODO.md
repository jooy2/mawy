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

- **The Flutter source field has no drag selection.**
  `packages/flutter/lib/src/editor/source_field.dart` builds on a bare
  `EditableText`, which places a caret on a tap and does nothing with a drag.
  Selecting by dragging, double-tap-for-a-word and the mobile selection handles
  all come from `TextSelectionGestureDetectorBuilder`, which `TextField` has and
  this does not — the package takes neither Material nor Cupertino, so the
  gestures have to be wired here. Everything the toolbar does to a selection is
  reachable only by keyboard until they are.

- **Neither highlighter knows Dart.** `packages/react/src/highlight.ts` and
  `packages/flutter/lib/src/highlight.dart` answer to 48 names between
  JavaScript and C#, and `dart` is not one of them — so the Flutter gallery's own
  editor sample, which is a fenced `dart` block, is drawn plain. A language is a
  grammar in both files and a case in `packages/flutter/tool/code.json`, and the
  parity check diffs every token the two produce.

- **The editor's toolbar wraps to a second row and spills out of it.**
  `.mawy-toolbar-editor` in `packages/react/src/styles.css` is `flex-wrap: wrap`
  inside a `.mawy-toolbar` that is laid out as one row, so a narrow editor gets
  two rows of buttons and the lower one leaves the bar. What is wanted is
  grouping by what the buttons are for and an overflow menu for whatever does
  not fit, rather than a wrap. The Flutter toolbar has not been looked at for
  the same thing.

- **`wysiwyg` draws a block from a marker that is not finished yet.** Typing `#`
  alone makes an empty heading before the space that would have meant one is
  typed, and somebody who wanted a `#` in a sentence has to undo a heading. The
  parser is right — CommonMark says a line of nothing but `#` is an empty ATX
  heading — so this belongs to the drawn surface, which already expands a link
  the caret is inside back to its source and can defer a block the same way.
  `packages/react/src/internal/rules.ts` is where the two shorthands that are
  handled early are written down, and its comment is where the reasoning for
  this one goes. Other markers want the same look at them.

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
  document changed — so this is either the missing selection above, the focus
  moving to the button, or something about the gallery inside its frame. It has
  to be watched happening before it is guessed at.

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
