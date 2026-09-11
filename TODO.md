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

- **A paragraph that is one long line of emphasis is still read in the square of its own length**, in both packages. `*a*` repeated is 1.5 seconds at a hundred and twenty-five kilobytes in the React package and forty in the Flutter one, down from over a minute in both. What is left is not a search any more: the chunks a paragraph is read into live in an array, and every pair that closes removes two of them from near the front of it, which moves everything after them. A list is the wrong shape for that and a linked list is the right one; the cheaper version is to leave a hole where a chunk was and close the holes once at the end, which keeps the array but makes every index in `processEmphasis` a walk past the holes. Either is a rewrite of the inline parser's own storage, in both languages at once, and the parity corpus is what would make it safe. `processEmphasis` and the `]` branch, in `inline.ts` and `inline.dart`.

- **The parity check does not reach the renderer.** It diffs the parse trees, the highlighter, the commands, the status line, the scroll arithmetic and the viewer's find — everything that is a function of a string. What draws is a widget tree on one side and elements on the other, so there is nothing to diff, and the two renderers drift silently: a quotation and a footnote in the Flutter package were drawn from a rendering context that had lost four of its fields, and no check could have said so. What would catch it is not a tree diff but a list, written once and read by both suites, of what a derived context has to carry and what each node type has to draw.

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
