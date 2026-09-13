# What is not done yet

The repository has no issue tracker in use, and notes from a finished session
are otherwise lost. This file holds the work that outlived a session, so that
what is left is written down rather than remembered.

Three rules keep it accurate:

- **Nothing goes here that a check already enforces.** The twelve CommonMark
  examples the parser does not answer are in `DEVIATIONS` in
  `packages/react/test/internal/markdown/commonmark.test.ts`, with the reason
  for each, and the suite fails if that list goes stale. This file points at it
  rather than copying it.
- **Confirmed and unconfirmed are marked apart.** A line that says where the
  code is has been read. A line that says "reported" has not been reproduced
  yet, and it is marked as such.
- **What was decided against is not work.** The gaps this library keeps on
  purpose are under "Decided, and not to be quietly fixed" in
  [CLAUDE.md](CLAUDE.md), where whoever is about to close one reads them before
  they start rather than after.

## The audit

A read of both packages end to end, worked through to the end, and with it the
one project that outlived it: drawing only the part of a long document that is
on screen. Everything either of them found is a commit with the test that fails
without it and a line in the changelog of the package it landed in, so what was
a list here is history now and is not repeated.

Working the list, and then writing one document for the playground to open in
both packages and reading what the two of them drew, turned up more than the
read itself had. Three of those are why `test/editor/search_test.dart` and
`test/editor/commands_test.dart` exist. One came out of widening
`tool/parity.dart` to the status line, the scroll arithmetic and the viewer's
find: the word count adds a spaced half and an unspaced one, and nothing in the
corpus had ever been unspaced, so half of that function had never been compared
at all. The corpus ends with a document of Han and kana for that reason, and the
parity check now reaches everything this library ships twice.

Some lines came off the list without a change, because the read was wrong about
them, because measuring showed the change would not pay, or because a decision
closed them. Those are in `CLAUDE.md` rather than here, because a decision is
something to read before starting rather than a job waiting for somebody.

## Confirmed

Nothing, at the moment. The last of it was what the React editor gained for an
application moving from MDXEditor and the Flutter editor did not, and the seven
toolbar commands that had no key, and both packages have all of it now. What
the Flutter editor still does not do on purpose, uploading a picture, is under
"Decided" in [CLAUDE.md](CLAUDE.md). The next finding goes under this heading
with where the code is.

## Reported

- **A paste from a word processor with words and a picture in it.** Word and
  Outlook are said to put `<img src="file:///…">` in the HTML beside a picture
  of the copied selection. The words are pasted and the picture becomes its
  description, because `pastedImagesIn` in `packages/react/src/internal/images.ts`
  only takes the file when the markup has no words at all; taking it otherwise
  could upload a picture of the whole selection. Not reproduced: which
  applications do this, and what a browser exposes as files for it, are
  unconfirmed. Chromium's own copy of an image, which puts nothing but the
  `<img>` beside the file, is confirmed and handled.

## Release

Each package carries a number of its own, dated in its own changelog. The number
is a promise as well as a version: the exported API is under semantic
versioning, so a name that goes away or changes shape waits for a major.

The steps are bumping the version in `packages/react/package.json` and
`packages/flutter/pubspec.yaml`, retitling `## vNext` with the number and
the date, `npm run size -- --update` if a change moved the bundle — the figures
on the site's getting-started page are those numbers and move with them —
tagging, and `--provenance` for npm, which wants a workflow with an id token.
Publishing is a person with credentials rather than anything here.
