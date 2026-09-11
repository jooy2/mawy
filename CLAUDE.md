# Working in this repository

What a reader has to know before changing anything here, and where to find the rest. [CONTRIBUTING.md](CONTRIBUTING.md) has the full procedure and every command; this file is the map and the invariants. [TODO.md](TODO.md) is the work that outlived a session, and it is where a finding that is not a commit belongs.

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

Where the two packages genuinely differ, it is because the platform differs, and the difference is written down rather than left to be discovered: no `wysiwyg` surface in Flutter (`contenteditable` has no equivalent), no raw HTML policy (there is no HTML to draw), no file picker or font list (both are a plugin's job, not a widget's).

## Things that surprise

- **The React suite runs in a real browser**, through Playwright, not jsdom. Selection ranges, `contenteditable` and `beforeinput` are what the library is built on and jsdom implements none of them faithfully. `test/environment.test.tsx` fails first if the harness is wrong. The first run needs `npx playwright install --with-deps chromium`.
- **`npm run size` is a gate.** `packages/react/size-budget.json` records gzipped bytes per entry point and CI fails a change more than two per cent over. `npm run size -- --update` writes new numbers, and they go in the same commit. The getting-started page quotes these figures, so moving them moves that page.
- **`src/styles.css` is minified into `dist/`** by `scripts/build-styles.mjs`, which also checks that every `--mawy-*` property survived. Two fifths of the source is prose explaining the rules; edit the source, read the source, ship the rules.
- **`--mawy-*` is the entire theming surface**, declared on `.mawy-root` rather than `:root` so a viewer can be dark inside a light page. `.mawy-md-*` class names are supported too. Anything else is internal.
- **`docs/*/changelog.md` is generated** from `packages/react/CHANGELOG.md` and git-ignored. Never edit it; edit the package's changelog.
- **`docs/public/flutter/` is the built Flutter gallery**, also git-ignored, produced by `npm run flutter` in `docs/` and needing a Flutter SDK. Without it the site's Flutter previews say so and show the React half, which is the expected state on a machine with no SDK.
- **The docs site renders the React package from `packages/react/src`** through a Vite alias, never from `dist/`. An edit to a component is on the page when it is saved.
- **`.github/media/editor-split.png`** is the picture the three READMEs open with. It is generated: `npm run screenshot` in `docs/`, with `npm run dev` running. The root README points at it by relative path and the two package READMEs by `raw.githubusercontent.com`, because npm and pub.dev render a README outside the repository.

## The documentation site

- **Two locales, `docs/en` and `docs/ko`, that mirror each other page for page.** A page added to one is added to the other. Korean is written, not translated from the English, and the heading anchors in Korean pages are the Korean words.
- **One page says both packages' halves.** `::: fw react` and `::: fw flutter` blocks are both in the document and CSS shows one, which is what keeps the search index complete and the two halves from drifting into two pages. `<Fw react="…" flutter="…" />` is the inline form for a phrase.
- **The sidebar is generated from the folder tree** by `vitepress-sidebar` and then reshaped in `.vitepress/config.ts`. Frontmatter `title` names a page and `order` places it. A folder's `index.md` names and fills the group.
- **A page's `<meta name="description">` is its own first paragraph**, read out of the source. So open every page with one sentence that says what it is about.
- **Live demos are React islands.** `.vitepress/demos/**/*.tsx` are real components mounted by `MawyDemo.vue`; the Flutter half of the same demo is the gallery in an `<iframe>`.

## Conventions

- **Prose is plain and explains why.** Comments and documentation in this repository say what a decision costs and what the alternative was, in complete sentences, with no emoji and no decoration. Match that when writing anything here — it is the house voice and it is consistent across both languages.
- **Everything in the repository is English**: code, identifiers, comments, commit messages, UI copy. The Korean documentation pages are the exception, and the changelog stays English even on the Korean page.
- **Formatters are gates.** `npx prettier . --check` in `docs` and `packages/react`, `dart format --set-exit-if-changed` in `packages/flutter`. CI fails on either.
- **Commits are `tag: message` in English**, with identifiers in backticks and one logical change each. The tags are in [CONTRIBUTING.md](CONTRIBUTING.md#write-a-commit-message).
- **A library change gets a changelog entry** under `## vNext` in the package it landed in, unless nothing a consumer can see changed. The two packages version independently.
- **The two locales and the two packages both have to be updated together.** A prop added to React and not documented in Korean is an unfinished change.
