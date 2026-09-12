# Working in this repository

What a reader has to know before changing anything here, and where to find the rest. [CONTRIBUTING.md](CONTRIBUTING.md) has the full procedure and every command; this file is the map and the invariants. [TODO.md](TODO.md) is the work that outlived a session, and it is where a finding that is not a commit belongs. What this library leaves undone on purpose is here instead, under "Decided, and not to be quietly fixed".

## What this is

Mawy is a Markdown editor and viewer, shipped twice: `mawy-react` on npm and `mawy` on pub.dev. One parser, one document model, one renderer, one palette, written in TypeScript and translated into Dart. A document that means one thing in a browser has to mean the same thing in an app, and most of the decisions below exist to keep that true.

The library writes its own everything: the CommonMark parser, the syntax highlighter, the editing surface, the toolbar. The only third-party runtime dependency in either package is the icon set.

## Layout

| Path               | What it is                         | Entered with                                                    |
| ------------------ | ---------------------------------- | --------------------------------------------------------------- |
| `packages/react`   | The npm package, `mawy-react`      | `npm install`, then `npm test`, `npm run lint`, `npm run build` |
| `packages/flutter` | The pub.dev package, `mawy`        | `flutter pub get`, then `flutter test`, `dart analyze`          |
| `docs`             | The VitePress site, shared by both | `npm install`, then `npm run dev`                               |

**There is no root manifest and no workspace.** Each folder installs and runs on its own, and a command run from the repository root does nothing. Check which folder a command belongs to before running it.

## The parity rule

This is the invariant everything else hangs off. These files are the same file twice:

| TypeScript                          | Dart                                   |
| ----------------------------------- | -------------------------------------- |
| `react/src/internal/markdown/*.ts`  | `flutter/lib/src/markdown/*.dart`      |
| `react/src/internal/commands.ts`    | `flutter/lib/src/editor/commands.dart` |
| `react/src/internal/search.ts`      | `flutter/lib/src/editor/search.dart`   |
| `react/src/internal/status.ts`      | `flutter/lib/src/editor/status.dart`   |
| `react/src/internal/scroll.ts`      | `flutter/lib/src/editor/scroll.dart`   |
| `react/src/highlight.ts`            | `flutter/lib/src/highlight.dart`       |
| `react/src/styles.css` (the tokens) | `flutter/lib/src/theme/tokens.dart`    |

Same function names, same rules, same order. **Changing one means changing the other in the same commit.** The check is two programs that print their trees as JSON and a diff between them:

```bash
cd packages/react && node scripts/parity.mjs > /tmp/react.json
```

```bash
cd packages/flutter && dart run tool/parity.dart > /tmp/flutter.json && diff /tmp/react.json /tmp/flutter.json
```

The corpus is `packages/flutter/tool/corpus.json` — the awkward cases, written down — plus every Markdown file in the repository, so adding a document here adds a test. CI runs this on every push that touches either package.

**The check stops at the parse trees, and a second list carries the drawing.** What draws is elements on one side and a widget tree on the other, so there is nothing to diff — and the two renderers drifted for months without anything saying so. `packages/flutter/tool/drawn.json` is a list of documents and, for each, the words the drawn document has to contain and the characters it must not. Both suites read that one file — `test/internal/markdown/drawn.test.tsx` and `test/markdown/drawn_test.dart` — so a case added for one is a case the other answers too. Only what both packages draw belongs in it.

Where the two packages genuinely differ, it is because the platform differs, and the difference is written down rather than left to be discovered: no `wysiwyg` surface in Flutter (`contenteditable` has no equivalent), no raw HTML policy (there is no HTML to draw), no file picker or font list (both are a plugin's job, not a widget's), and a picture's alt text drawn by the browser from an attribute on one side and by the renderer as words on the other.

## Things that surprise

- **The React suite runs in a real browser**, through Playwright, not jsdom. Selection ranges, `contenteditable` and `beforeinput` are what the library is built on and jsdom implements none of them faithfully. `test/environment.test.tsx` fails first if the harness is wrong. The first run needs `npx playwright install --with-deps chromium`.
- **`npm run size` is a gate.** `packages/react/size-budget.json` records gzipped bytes per entry point and CI fails a change more than two per cent over. `npm run size -- --update` writes new numbers, and they go in the same commit. The getting-started page quotes these figures, so moving them moves that page.
- **`src/styles.css` is minified into `dist/`** by `scripts/build-styles.mjs`, which also checks that every `--mawy-*` property survived. Two fifths of the source is prose explaining the rules; edit the source, read the source, ship the rules.
- **`--mawy-*` is the entire theming surface**, declared on `.mawy-root` rather than `:root` so a viewer can be dark inside a light page. `.mawy-md-*` class names are supported too. Anything else is internal.
- **`docs/*/changelog.md` is generated** from both packages' `CHANGELOG.md` and git-ignored. Never edit it; edit the package's changelog. One page with a `::: fw` half each, because a page per package would need a sidebar row that hides per framework and this theme has none. `scripts/copy-changelog.mjs` writes a framework into every version's anchor, since both packages have a `## 1.2.0`.
- **`docs/public/flutter/` is the built Flutter gallery**, also git-ignored, produced by `npm run flutter` in `docs/` and needing a Flutter SDK. Without it the site's Flutter previews say so and show the React half, which is the expected state on a machine with no SDK.
- **The docs site renders the React package from `packages/react/src`** through a Vite alias, never from `dist/`. An edit to a component is on the page when it is saved.
- **`.github/media/editor-split.png`** is the picture the three READMEs open with. It is generated: `npm run screenshot` in `docs/`, with `npm run dev` running. The root README points at it by relative path and the two package READMEs by `raw.githubusercontent.com`, because npm and pub.dev render a README outside the repository.

## The documentation site

- **Two locales, `docs/en` and `docs/ko`, that mirror each other page for page.** A page added to one is added to the other. Korean is written, not translated from the English, and the heading anchors in Korean pages are the Korean words.
- **One page says both packages' halves.** `::: fw react` and `::: fw flutter` blocks are both in the document and CSS shows one, which is what keeps the search index complete and the two halves from drifting into two pages. `<Fw react="…" flutter="…" />` is the inline form for a phrase.
- **The sidebar is generated from the folder tree** by `vitepress-sidebar` and then reshaped in `.vitepress/config.ts`. Frontmatter `title` names a page and `order` places it. A folder's `index.md` names and fills the group.
- **A page's `<meta name="description">` is its own first paragraph**, read out of the source. So open every page with one sentence that says what it is about.
- **`robots.txt` and `llms.txt` are written at build time**, in `buildEnd`, from `package.json`'s host and the pages that are actually there. Neither is committed, because a hand-written link list goes stale and a second copy of the host is one more place to forget. `robots.txt` refuses the crawlers that collect training data and allows the ones that fetch a page for a reader or index it for an assistant's search.
- **Live demos are React islands.** `.vitepress/demos/**/*.tsx` are real components mounted by `MawyDemo.vue`; the Flutter half of the same demo is the gallery in an `<iframe>`.

## Decided, and not to be quietly fixed

Each of these reads as a gap and is a decision. The reason is written where the code or the page it belongs to can be read beside it, so changing one means changing that too rather than only the code.

- **CommonMark's remaining twelve**, with a reason each in `DEVIATIONS` in `packages/react/test/internal/markdown/commonmark.test.ts`. The suite fails if that list goes stale, which is why it is there and not here. Two of the twelve are tabs: expanding one puts spaces in the document the author did not write, and every offset in this library is an offset into the document, which is what the editor's click-to-caret stands on. A third wants a Unicode case folding table.
- **`wysiwyg` in the Flutter package**, and with it the file open, the separate undo history and the image paste. An `EditableText` owns its string, so drawing a document that is also a text field would need a second model of the document, and two models read anything unusual differently. The reasons are in `docs/*/guide/editor.md` and in the changelog, in both languages.
- **The two headings this library writes being `h2`** — the outline panel's title and the empty state's. The document's own heading levels are the author's and cannot be moved anyway, and these two are restyled or relabelled from outside through `.mawy-outline-title` and `.mawy-empty-title`. Written down in `docs/*/guide/viewer.md` under Accessibility.
- **Writing an image's dimensions in the document.** `--mawy-doc-image-aspect` is the answer for now: an application that knows what shape its pictures are reserves the box, and nothing is reserved otherwise. A syntax the parser reads, `![alt](url =800x600)`, may come later and would want the same syntax in both parsers and a line in the parity corpus.
- **The Flutter toolbar scrolling sideways rather than folding into a menu.** A row that scrolls under a finger is what a toolbar does on a touch screen, and a menu is what one does on a page with a pointer. `docs/*/guide/editor.md` gives the reason under the toolbar.
- **One `<span>` per coloured token in a code block.** Measured against the highlighter this package ships, a sample of TypeScript came out as forty-four tokens with no two of the same kind next to each other, so merging the adjacent ones is code written for a highlighter somebody else might write. Tokens with no kind are already drawn as the characters they are rather than wrapped.
- **A selection in the Flutter viewer stopping at four hundred blocks.** Under `kMawyViewerLazyFrom` every block is built and a selection takes all of them; over it the document is a lazy list and a selection reaches the three screens either way that the list keeps. Closing the gap means assembling the text of blocks nobody built — the bullet of a list item, the `Note` on an alert, a code block's language, the heading over the footnotes — which is a second renderer that has to agree with the first, and when two drift what a reader copies stops matching what they can see. The toolbar's copy button takes the whole document from the Markdown, which is the case this would be for. Written down in `docs/*/guide/viewer.md`, in both languages.
- **The Flutter source field's placeholder and the direction it is in.** Measured in both directions, its box is exactly the field's box, and both it and the field take their alignment from the same `Directionality`, so the words start where the caret does either way.
- **What a picture is allowed to cost.** What fills a phone's memory is the decoded bitmap rather than the file, and that is bounded by the width the page has for it; the bytes behind a `data:` picture are bounded by the document they are written in. A remote picture's download is left unbounded, as it is in every Markdown renderer and in the browser the React package draws in, and `imageBuilder` and `image` are where an application that minds puts a ceiling: on the request it makes rather than on the one the viewer makes for it.
- **What the viewer's find bar does not search**, in `find.ts` and `find.dart`. A match cannot straddle two drawn runs, so `hello` is not found across `he**llo**`, and a fenced code block is not searched at all. The first refuses to report a match nothing can point at, the second refuses to cut a mark into every span the highlighter produced. Both are in the doc comment at the top of each file and on the API page.
- **The way back from a footnote being an icon rather than `↩`**, in the Flutter package. The character is in none of a web build's fonts and has an emoji form besides, so what arrived on the page was a coloured box. It costs a copy: selecting a note takes the glyph with it, where the React package's takes an arrow, and Flutter has no way to leave one span out of a selection. The reason is in `_note`, in `lib/src/markdown/render.dart`.
- **The playground's two pictures living only in `docs/public/sample`.** They are asked for from the site's root, so they arrive in the framed preview and not in the gallery run on its own, where the viewer draws their alt text as it does for any picture it cannot fetch. Copying them into `example/web` would put the same bytes in the published package for the sake of a preview. The reason is in `example/lib/samples.dart`.

## Conventions

- **Prose is plain and explains why.** Comments and documentation in this repository say what a decision costs and what the alternative was, in complete sentences, with no emoji and no decoration. Match that when writing anything here — it is the house voice and it is consistent across both languages.
- **Everything in the repository is English**: code, identifiers, comments, commit messages, UI copy. The Korean documentation pages are the exception, and the changelog stays English even on the Korean page.
- **Formatters are gates.** `npx prettier . --check` in `docs` and `packages/react`, `dart format --set-exit-if-changed` in `packages/flutter`. CI fails on either.
- **Commits are `tag: message` in English**, with identifiers in backticks and one logical change each. The tags are in [CONTRIBUTING.md](CONTRIBUTING.md#write-a-commit-message).
- **A library change gets a changelog entry** under `## vNext` in the package it landed in, unless nothing a consumer can see changed. The two packages version independently.
- **The two locales and the two packages both have to be updated together.** A prop added to React and not documented in Korean is an unfinished change.
