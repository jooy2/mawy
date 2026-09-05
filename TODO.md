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
done**, and so is the one thing that outlived it — drawing only the part of a
long document that anybody can see, which had a section of its own here and is
now three commits and the note under "Deliberate" about what it cost. Everything
the read found is a commit with the test that fails without it, and a line in
the changelog of the package it landed in.

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
`test/editor/commands_test.dart` exist. A tenth came out of widening
`tool/parity.dart` to reach the status line, the scroll arithmetic and the
viewer's find: the word count adds a spaced half and an unspaced one, and
nothing in the corpus had ever been unspaced, so half of that function had never
been compared at all. The corpus ends with a document of Han and kana now, and
the check catches the mutation that proves it.

The two lines that outlived the audit are done as well — the parity check
reaches everything this library ships twice, and the framed Flutter preview
follows the site's own light/dark switch rather than the reader's OS.

Writing one document for the playground to open in both packages, and then
reading what the two of them drew of it, turned up four more the audit had not
seen. A picture painted over the paragraphs around it in the Flutter viewer,
because every line is held to the height of a line of text and a photograph is
not that. An alert in the React one was drawn with a quotation's padding, a
quotation's grey and a grey rule down its side whatever kind it said it was: it
is a `blockquote`, and the rule for a quotation outranks the class on its own.
A quotation's last paragraph left a strip of empty box under the words. And a
pointer capture the browser refused ended the drag on the bar between the panes
rather than costing it the capture. The Flutter footnotes had no way down to a
note or back either, which is a feature rather than a fix and is one now.

The suite had been failing in Firefox and WebKit for five pushes before that,
and neither failure was the library: Firefox refuses `setPointerCapture` for a
pointer id it does not know, where the other two take anything, and WebKit's
`InputEvent` constructor throws away the `dataTransfer` it is handed. The first
is the drag above; the second is three tests that were watching the editor be
handed nothing and correctly do nothing with it.

Six lines came off the list for the other reason — the read was wrong about
them, or measuring said the change would not pay — and they are under
"Deliberate" below rather than left looking undone. Two more were closed by a
decision rather than by a change and are there as well, and so is the one thing
drawing less of a long document cost.

## Confirmed

- **Two footnote definitions on adjacent lines are read as one.** `[^a]: …` with `[^b]: …` on the line under it comes back as a single note whose text ends with the characters of the second, and the reference that pointed at it is left as the characters `[^b]` in the sentence. The definition's paragraph takes the next line as a lazy continuation; GitHub starts a new definition there, which is what `POST /markdown` with `mode: gfm` answers — it numbers them one and two. Both parsers do it and both would change, so the case belongs in `tool/corpus.json` first. A blank line between definitions is the way round it, and `demos/playground/document.ts` has one for that reason.

- **A note is drawn with less of the context than the document is**, in the Flutter package. `renderFootnotes` builds a second context for what is inside a note, because the body text is smaller there, and four of the fields it does not carry over are ones a note can want: a code block in a note is not coloured (`highlighter`), a directive is not handed to the builder that draws it (`directives`), one nobody claimed is drawn as nothing at all rather than as the characters it was written with (`source`), and a picture is fetched by the viewer even where the application said it would draw that itself (`imageBuilder`) — which is the one that matters, because it is a promise the viewer makes everywhere else. What the find bar found is left out on purpose: it does not search a note. The React package hands the document's own context down and has none of this. `lib/src/markdown/render.dart`, in `renderFootnotes`.

- **A host page's rules reach whatever the stylesheet leaves unset**, in the React package. Every rule is written under `.mawy-root`, which settles who wins a property both of them set and says nothing about a property only the host sets. The footnotes' heading was one: it set neither a border nor a padding, so a documentation page's `.vp-doc h2` drew a rule through the section and left a gap above it. That heading is gone, and nothing has read the rest of `styles.css` looking for the same shape.

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

- **A selection in the Flutter viewer stops at four hundred blocks.** Under
  `kMawyViewerLazyFrom` every block is built and a selection takes all of them;
  over it the document is a lazy list and a selection reaches the three screens
  either way that the list keeps. Measured: a select-all over a hundred and
  fifty paragraphs takes all of it, and over four hundred takes a tenth.

  Closing that last gap means telling the selection about blocks nobody built,
  and the text to tell it is not in the parse tree — the renderer writes words
  the document does not contain, the bullet of a list item, the `Note` on an
  alert, a code block's language, the heading over the footnotes. Assembling it
  a second time means a second renderer that has to agree with the first, and
  when the two drift what a reader copies stops matching what they can see,
  quietly. The toolbar's copy button already takes the whole document from the
  Markdown, which is the case this would be for. Written down in
  `docs/*/guide/viewer.md`, in both languages.

- **The Flutter source field's placeholder and the direction it is in.** The read of both packages had this down as a placeholder that ignores which way the text runs. Measured in both directions, its box is exactly the field's box — right of the gutter in one, left of it in the other — and both it and the field take their alignment from the same `Directionality`, so the words start where the caret does either way.
- **What a picture is allowed to cost.** The read had a size ceiling down as missing. What fills a phone's memory is the decoded bitmap rather than the file, and that is now bounded by the width the page has for it; the bytes behind a `data:` picture are bounded by the document they are written in. What is left unbounded is a remote picture's download, which is the same in every Markdown renderer and in the browser the React package draws in — and an application that minds now has `imageBuilder` and `image`, which is where a ceiling belongs: on the request the application makes rather than on the one the viewer makes for it.
- **What the viewer's find bar does not search**, in `find.ts` and `find.dart`.
  A match cannot straddle two drawn runs, so `hello` is not found across
  `he**llo**`; a fenced code block is not searched at all. Both are written down
  in the doc comment at the top of each file and on the API page. The first is a
  refusal to report a match nothing can point at, and the second is a refusal to
  cut a mark into every span the highlighter produced.

- **The way back from a footnote being an icon rather than `↩`**, in the Flutter package. The character is in none of a web build's fonts and has an emoji form besides, so what arrived on the page was a coloured box; the arrow is drawn from the icon font this package already ships instead. It costs a copy: selecting a note takes the glyph with it, where the React package's takes an arrow, and Flutter has no way to leave one span out of a selection. The reason is in `_note`, in `lib/src/markdown/render.dart`.

- **The playground's two pictures living only in `docs/public/sample`.** They are asked for from the site's root, so they arrive in the framed preview and not in the gallery run on its own — where the viewer draws their alt text, which is what it draws for any picture it cannot fetch. Copying them into `example/web` would put the same bytes in the published package for the sake of a preview. The reason is in `example/lib/samples.dart`.

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
