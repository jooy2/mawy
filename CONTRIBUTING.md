# Contributing to Mawy

Thank you for contributing. Bug reports, fixes, tests and documentation changes are all welcome.

This project adheres to the [Contributor Covenant code of conduct](CODE_OF_CONDUCT.md). Contributing means you have read and agree to it. The maintainers will warn or restrict any behaviour that breaks it.

## Issues

Issues can be created on the following page: https://github.com/jooy2/mawy/issues

Alternatively, you can email the package maintainer. However, we prefer to track progress via GitHub Issues.

When creating an issue, keep the following in mind:

- Please specify the correct category selection based on the format of the issue (e.g., bug report, feature request).
- Check to see if there are duplicate issues.
- Describe in detail what is happening and what needs to be fixed. You may need additional materials such as images or video.
- Use appropriate keyword titles to make it easy for others to search and understand.
- Please use English in all content.
- You may need to describe the environment in which the issue occurs.

**Do not open an issue for a security problem.** [SECURITY.md](SECURITY.md) has the private route, which keeps a vulnerability out of public view until there is a version to upgrade to.

## Where things live

The repository holds one library, shipped per language, and one documentation site shared by all of them:

| Path               | What it is                                        | How it is run                                                                        |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/react`   | The npm package, `mawy-react`                     | `cd packages/react && npm install`, then `npm test`, `npm run lint`, `npm run build` |
| `packages/flutter` | The pub.dev package, `mawy`                       | `cd packages/flutter && flutter pub get`, then `flutter test`, `dart analyze`        |
| `docs`             | The documentation site, shared by every framework | `cd docs && npm install`, then `npm run dev`                                         |

There is no install at the repository root, and no root manifest of any kind. Each folder is entered and run on its own.

## One library, shipped twice

The two packages are one library. The Dart parser is a direct translation of the TypeScript one, file for file and function for function, and the palette copies `styles.css`'s custom properties value for value.

That is checked rather than assumed. `packages/flutter/tool/parity.dart` and `packages/react/scripts/parity.mjs` print both parsers' trees in one shape, over the awkward cases written down in `tool/corpus.json` plus **every Markdown file in the repository**, and the two are diffed:

```bash
cd packages/react && npm run parity > /tmp/react.json
cd ../flutter && dart run tool/parity.dart > /tmp/flutter.json
diff /tmp/react.json /tmp/flutter.json
```

Seven more things go through the same check in the same run. Each is written twice and drifts for the same reason the parsers do:

- **The code highlighter.** `src/highlight.ts` and `lib/src/highlight.dart`, over `tool/code.json`, which holds a piece of every language either of them supports plus two neither does.
- **The source highlighter**, which marks up Markdown for the editor to colour: `src/internal/markdown/highlight.ts` and `lib/src/markdown/highlight.dart`, over the same documents the parsers are compared on. It is allowed to be approximate where the parser is not, so the check asserts only that both halves are approximate in the same way.
- **The editing commands.** `src/internal/commands.ts` and `lib/src/editor/commands.dart`, over `tool/edits.json`: every command, every case, and `continueList` and `indent` with them. They are pure functions of a string and two offsets, which makes them easy to compare and easy to let drift. Nothing about them shows until somebody presses a button, and then it shows in one package and not the other.
- **Finding text, and replacing it.** `src/internal/search.ts` and `lib/src/editor/search.dart`, over `tool/searches.json`: every match, which one `next` goes to from where the caret is, and what `replace all` does to a document. It is the same kind of arithmetic as the commands, and just as invisible until somebody types in the find box. Whether `aa` in `aaaa` is two matches or three is a choice both packages have to make the same way.
- **The status line.** `src/internal/status.ts` and `lib/src/editor/status.dart`, over every document in the corpus. A word is not a run between two spaces in every language, so the count adds two halves: every Han or kana character is a word, and what is left over is split on spaces. The corpus has to contain both halves or only one of them is compared. Half of the documentation is Korean, which *is* spaced, and the last entry of `tool/corpus.json` is Han and kana, which is not.
- **Lining the two panes of `split` up.** `src/internal/scroll.ts` and `lib/src/editor/scroll.dart`: which line an offset is on, over the corpus, and where a position between two anchors lands, over `tool/scrolls.json`. The measuring cannot be shared, since a browser reads a bounding box and Flutter reads a viewport, but the arithmetic on what was measured is shared. When it is wrong, a preview half a screen away from what is being typed looks like a pane that scrolls badly rather than like two packages disagreeing.
- **Finding text in a *drawn* document.** `src/internal/markdown/find.ts` and `lib/src/markdown/find.dart`, over the corpus and the queries in `tool/finds.json`. This is not the find bar above: what is searched here is what the document *draws*, so the question is which nodes count. An alert's children do, a code block does not, and an image's alt text does not. Two traversals that disagree report different match counts for the same page, and that count is the one part of a find bar a reader can check.

CI runs it on every change to either parser. Two implementations of CommonMark drift as soon as nobody compares them, and a document that means one thing in a browser and another in an app is the failure this library is built to prevent. **A change to one parser is a change to both**, and the diff is what catches a missed one.

**The specification is run against the parser as well.** `packages/react/test/internal/markdown/commonmark.test.ts` runs all 652 of CommonMark's own examples, passes 640, and writes down the other 12 with the reason each one is there. A change that fixes one deletes a line from that list. A change that breaks one adds a line, which the test will tell you to do and you should not. The suite runs against the TypeScript parser alone, because the parity check already shows the Dart one produces the same tree.

The examples come from `commonmark-spec`, the specification document itself, which is a devDependency of `packages/react`. It is CC-BY-SA. The rule on [third-party dependencies](#third-party-dependencies) refuses that licence for a *runtime* dependency, but nothing in it reaches a consumer or a build.

A few notes that are easy to trip over:

- **Each package keeps its own `CHANGELOG.md`,** beside its manifest, where npm and a reader browsing that package expect to find it. The documentation site's copy is generated from it by `docs/scripts/copy-changelog.mjs` and is git-ignored, so edit the package's file and never the one under `docs/`.
- **A change usually means a change to the docs in _both_ languages.** `docs/en` and `docs/ko` mirror each other page for page. If you cannot write the Korean, write the English and say so in the pull request, and a maintainer will follow up rather than let the two drift.
- **And, where the two packages differ, in _both_ frameworks.** The site keeps one page per subject and marks the parts that differ with `::: fw react` and `::: fw flutter`, rather than keeping two folders that drift apart. `docs/.vitepress/data/frameworks.ts` is the whole list, and the switch is above the sidebar menu. A block both packages want is `::: fw react flutter`, and a phrase in the middle of a sentence is `<Fw react="…" flutter="…" />`.
- **The Flutter previews are the real Flutter build.** The gallery under `packages/flutter/example` is compiled into `docs/public/flutter` by `npm run flutter --prefix docs`, and the previews frame it. Without that build they say so and show the React half, so only somebody who wants to look at the Flutter half needs a Flutter SDK.

  The demo and the language travel in the frame's query string, because neither changes without the page navigating. The palette does not. It is posted into the frame instead, since a `src` that changed on every flip of the site's dark switch would reload a Flutter engine to change one colour. The frame sends the first message, because the engine arrives over the network and loads lazily, so the page cannot pick the right moment on its own. `packages/flutter/example/lib/host.dart` is the other half of that exchange.
- **A `:::` block needs a blank line on each side of its body.** Prettier runs with `proseWrap: "never"` and does not know VitePress's custom containers, so a `::: warning` written tight against its text is joined into one line. That stops it being a container and spills the rest of the page into the box. The blank lines are what keep the two apart.
- **The editing surfaces are tested in a real browser.** Selection, ranges, `beforeinput` and `contenteditable` are what this library is made of, and a DOM emulator does not implement them faithfully enough for a passing test to mean anything. See below.
- **Every rule in `src/styles.css` is scoped under `.mawy-root`.** A viewer is dropped into somebody else's page, and that page has an `article h2` or a `table { display: block }` of its own. Both are (0,1,1), which beats a single class. The `:where()` resets at the top of the file are the deliberate exception, because a reset must have the lowest specificity on the page.
- **The documentation site is where components are looked at.** `docs/.vitepress/theme/components/MawyDemo.vue` mounts a React root inside a Vue page, and `docs/.vitepress/demos/**/*.tsx` are real, runnable components rendered straight from `packages/react/src` through a Vite alias. Nothing on the site reads `dist/`, so an edit to a component appears on the page as soon as it is saved. There is no separate demo application.
- **The site has to be told where the library's own imports live**, in both `docs/.vitepress/config.ts` and `docs/tsconfig.json`. See [Third-party dependencies](#third-party-dependencies). This is the one thing in the repository that passes locally and fails in CI, so it is worth knowing in advance.

## Running the checks

Everything CI runs, you can run:

```bash
cd packages/react
npm ci
npm run lint         # ESLint
npx prettier . --check
npm run typecheck    # tsc, source and tests
npm test             # Vitest, in a real browser
npm run build        # what `npm publish` would compile
npm run size         # a real bundle of `dist/`, against `size-budget.json`
```

`npm run size` needs `npm run build` to have run, since it bundles what would be published rather than what is in `src/`. It fails a change that puts a scenario more than two per cent over the number recorded in `size-budget.json`. If that is the change you meant, `npm run size -- --update` writes the new numbers back, and they go in the same commit. The site's [getting started](https://mawy.cdget.com/guide/getting-started) page quotes these figures, so a change that moves them moves those too.

For the Flutter package:

```bash
cd packages/flutter
flutter pub get
dart analyze
dart format --set-exit-if-changed lib test tool example/lib
flutter test
dart pub publish --dry-run   # pub.dev scores against this
```

`npm test` drives [Playwright](https://playwright.dev). The first run needs a browser installed:

```bash
npx playwright install --with-deps chromium
```

Locally the suite runs in Chromium alone, so one browser is enough. CI runs the same suite across Chromium, Firefox and WebKit on Linux, Windows and macOS. Set `VITEST_BROWSER` to run another engine yourself (`VITEST_BROWSER=webkit npm test`, or a comma-separated list).

For the documentation site:

```bash
cd docs
npm ci
npm run dev          # local preview, and the develop-and-eyeball loop
npm run build        # what the deploy workflow runs
npm run lint
npm run typecheck
```

The site pins `vite` to the version VitePress itself runs. Two copies of Vite in `docs/node_modules` are not just a larger install: `@vitejs/plugin-react` ends up compiled against a Vite that is not the one loading it.

**Build the site with `packages/react/node_modules` moved aside**, at least once, before opening a pull request that touches either. The site renders the library from source through an alias. A demo that imports a specifier the alias no longer answers builds fine on a machine with the package installed beside it, and fails in CI, where it is not:

```bash
mv packages/react/node_modules packages/react/node_modules.aside
cd docs && npm run typecheck && npm run build
cd .. && mv packages/react/node_modules.aside packages/react/node_modules
```

### Writing a page that says two things

The site serves both packages, and `::: fw react` and `::: fw flutter` mark the parts that differ. `docs/.vitepress/data/frameworks.ts` is the whole list. Both halves are in the document and CSS shows one, which makes the switch instant and keeps the two from drifting into separate pages.

**Never put a heading inside a `::: fw` block.** The blocks are hidden with `display: none`, and VitePress builds its outline from the DOM, so a heading in the half a reader is not looking at sits in their sidebar pointing at nothing visible. Keep the heading shared and mark the content under it. Where a section belongs to one package alone, put a line in the other's block saying so.

## Third-party dependencies

Mawy aims at close to zero runtime dependencies. A Markdown editor is a component inside somebody else's application, and every package it installs is one they did not choose.

Each package has **one**, and it is the same one twice: the toolbar's icons. [`lucide-react`](https://lucide.dev) (ISC) for React and [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter) (MIT) for Flutter. It is the same icon set, so both toolbars show the same icons.

`lucide-react` installs nothing else and tree-shakes to the glyphs actually drawn. `packages/react/test/package/dependencies.test.ts` fails the build if a source file imports anything that is not declared as a dependency or a peer, so the count cannot creep up by accident. `lucide_icons_flutter` is the one large item in either package: it ships its variable faces whole, and Flutter's icon tree-shaking removes very little from a variable font, so it adds about 3 MB to a build. That is ordinary in an app bundle and worth checking on the web.

**A runtime dependency has to be added in two places.** The documentation site renders the library from `packages/react/src` through an alias and installs only its own `node_modules`. So a package the library imports also has to be a devDependency of `docs`, listed in `resolve.dedupe` in `docs/.vitepress/config.ts` and in `paths` in `docs/tsconfig.json`. Miss any of that and the site still builds on your machine, because `packages/react/node_modules` is sitting there. CI installs one folder at a time and does not have it. To check the way CI sees it, move the package's `node_modules` out of the way and build the site:

```bash
mv packages/react/node_modules packages/react/node_modules.bak
cd docs && npm run typecheck && npm run build
mv ../packages/react/node_modules.bak ../packages/react/node_modules
```

A pull request that adds a runtime dependency should say, in the description:

- **What it does that we would otherwise write.** Syntax highlighting is the standing example: a correct highlighter for dozens of languages is not worth reimplementing.
- **Its licence.** MIT, ISC, BSD and Apache-2.0 are fine. Copyleft licences (GPL, LGPL, AGPL) are not, because they would reach into the applications that embed this one.
- **Its own dependency tree and its size.** A small package that brings twelve more is not a small package.

Development dependencies are held to a much looser standard, because they never reach a consumer.

## How to contribute (Pull Requests)

### Write the code you want to change

1. Clone the project, or rebase onto the latest commit on the main branch.
2. Install the dependencies of the folder you are working in.
3. Set up the linter and formatter in your IDE and install the matching plugins. The commands are listed under [Running the checks](#running-the-checks).
4. Write the code.
5. Update the documentation, or add a page where none exists. The site is published in both English and Korean, so update both. Write the content in your own language rather than leaving it out; a maintainer will follow up on the translation.
6. Add or change tests as the change warrants, and confirm that the existing tests pass.
7. Add an entry under `## vNext` in the changelog of the package you changed, unless the change is invisible to a consumer.

### Write a commit message

There are no strict rules for commit messages, but follow these where you can:

- Write in English.
- Wrap function, variable, folder and file names in backticks.
- Use the format `tag: message (fixes #1)`. The part in parentheses is optional.
- Summarize what was modified.
- Split unrelated modifications into separate commits.

Start the message with a tag, followed by `: ` and the summary.

The tags follow the [Udacity Git Commit Message Style Guide](https://udacity.github.io/git-styleguide). You may use a tag outside this list where none of them fits.

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Changes to documentation
- `style`: Formatting, missing semicolons, etc.; no code change
- `refactor`: Refactoring production code
- `test`: Adding tests, refactoring test; no production code change
- `chore`: Updating build tasks, package manager configs, etc.; no production code change

Informal tags:

- `package`: Modifications to package settings, modules, or GitHub projects
- `typo`: Fix typos

### Create a pull request

When creating a pull request, keep the following in mind:

- Describe what the modification is, why it is needed, and how it works.
- Check to see if there are duplicate pull requests.
- Please use English in all content.

A maintainer reviews and tests the code before merging it. That can take some time, and they may ask for further edits or for clarification in the comments.
