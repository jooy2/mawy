# Contributing to Mawy

Thank you for contributing to the project. Your contributions will help us take the project to the next level.

This project adheres to the [Contributor Covenant code of conduct](CODE_OF_CONDUCT.md). Your contribution implies that you have read and agree to this policy. Any behavior that undermines the quality of the project community, including this policy, will be warned or restricted by the maintainers.

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

**Do not open an issue for a security problem.** [SECURITY.md](SECURITY.md) has the private route, and it exists so a vulnerability is not public before there is a version to upgrade to.

## Where things live

The repository holds one library, shipped per language, and one documentation site shared by all of them:

| Path               | What it is                                          | How it is run                                                                        |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/react`   | The npm package, `mawy-react`                       | `cd packages/react && npm install`, then `npm test`, `npm run lint`, `npm run build` |
| `packages/flutter` | The pub.dev package, `mawy`                         | `cd packages/flutter && flutter pub get`, then `flutter test`, `dart analyze`        |
| `docs`             | The documentation site, shared by every framework   | `cd docs && npm install`, then `npm run dev`                                          |

There is no install at the repository root, and no root manifest of any kind — each folder is entered and run on its own.

## One library, shipped twice

The two packages are one library. Not "similar", not "ported in spirit": the Dart parser is the TypeScript parser, file for file and function for function, and the palette is `styles.css`'s custom properties value for value.

That is a claim, so it is checked. `packages/flutter/tool/parity.dart` and `packages/react/scripts/parity.mjs` print both parsers' trees in one shape, over the awkward cases written down in `tool/corpus.json` plus **every Markdown file in the repository**, and the two are diffed:

```bash
cd packages/react && npm run parity > /tmp/react.json
cd ../flutter && dart run tool/parity.dart > /tmp/flutter.json
diff /tmp/react.json /tmp/flutter.json
```

Seven more things go through the same check in the same run, because each of them is one thing written twice and each of them drifts for the reason the parsers do:

- **The code highlighter.** `src/highlight.ts` and `lib/src/highlight.dart`, over `tool/code.json` — a piece of every language either of them claims to know, plus two nobody does.
- **The source highlighter**, which marks up Markdown for the editor to colour: `src/internal/markdown/highlight.ts` and `lib/src/markdown/highlight.dart`, over the same documents the parsers are compared on. It is allowed to be *wrong* in ways the parser must not be, which makes "wrong the same way in both" the only statement worth making about it.
- **The editing commands.** `src/internal/commands.ts` and `lib/src/editor/commands.dart`, over `tool/edits.json` — every command, every case, and `continueList` and `indent` with them. They are pure functions of a string and two offsets, which makes them the easiest half of this to compare and the easiest to let drift: nothing about them is visible until somebody presses a button, and then it is visible in one package and not the other.
- **Finding text, and replacing it.** `src/internal/search.ts` and `lib/src/editor/search.dart`, over `tool/searches.json` — every match, which one `next` goes to from where the caret is, and what `replace all` does to a document. The same kind of arithmetic as the commands and the same kind of invisible: nothing about it shows until somebody types in the find box, and `aa` in `aaaa` being two matches rather than three is a decision both packages have to make the same way.
- **The status line.** `src/internal/status.ts` and `lib/src/editor/status.dart`, over every document in the corpus. A word is not a run between two spaces in every language, so the count adds two halves — every Han or kana character is a word, and what is left over is split on spaces — and the corpus has to contain both halves or only one of them is being compared. The documentation is half of it Korean, which *is* spaced; the last entry of `tool/corpus.json` is Han and kana, which is not, and it is there for this.
- **Lining the two panes of `split` up.** `src/internal/scroll.ts` and `lib/src/editor/scroll.dart` — which line an offset is on, over the corpus, and where a position between two anchors lands, over `tool/scrolls.json`. The measuring is not shared and cannot be, since a browser reads a bounding box and Flutter reads a viewport; the arithmetic on what was measured is, and it is arithmetic nobody sees being wrong. A preview half a screen from what is being typed reads as a pane that scrolls badly rather than as two packages disagreeing.
- **Finding text in a *drawn* document.** `src/internal/markdown/find.ts` and `lib/src/markdown/find.dart`, over the corpus and the queries in `tool/finds.json`. Not the same question as the find bar above it: what is searched here is what the document *draws*, so which nodes count is the whole of it — an alert's children yes, a code block no, an image's alt text no. Two traversals that disagree about that report different numbers of matches for the same page, and that number is the one part of a find bar a reader can check.

CI runs it on every change to either parser. Two implementations of CommonMark drift the moment nobody is comparing them, and a document that means one thing in a browser and another in an app is the bug this whole library exists to not have. **A change to one parser is a change to both**, and the diff is how you find out you forgot.

**And the specification is run at the parser as well.** `packages/react/test/internal/markdown/commonmark.test.ts` runs all 652 of CommonMark's own examples, answers 640 of them, and writes down the other 12 with the reason each one is there. A change that fixes one is a line deleted from that list; a change that breaks one is a line the test tells you to add and you should not. The suite is run against the TypeScript parser alone, because parity above already says the Dart one produces the same tree.

The examples come from `commonmark-spec`, which is the specification document itself and is a devDependency of `packages/react`. It is CC-BY-SA, which the rule on [third-party dependencies](#third-party-dependencies) refuses for a *runtime* dependency and has no reason to refuse here: nothing in it reaches a consumer, or a build.

A few notes that are easy to trip over:

- **Each package keeps its own `CHANGELOG.md`,** beside its manifest, where npm and a reader browsing that package expect to find it. The documentation site's copy is generated from it by `docs/scripts/copy-changelog.mjs` and is git-ignored — edit the package's file, never the one under `docs/`.
- **A change usually means a change to the docs in _both_ languages.** `docs/en` and `docs/ko` mirror each other page for page. If you cannot write the Korean, write the English and say so in the pull request; a maintainer will follow up rather than let the two drift.
- **And, where the two packages differ, in _both_ frameworks.** The site is one page per subject with the parts that differ marked up — `::: fw react` and `::: fw flutter` — rather than two folders that agree until they do not. `docs/.vitepress/data/frameworks.ts` is the whole list; the switch is above the sidebar menu. A block that both want and nobody else does is `::: fw react flutter`, and a phrase in the middle of a sentence is `<Fw react="…" flutter="…" />`.
- **The Flutter previews are the real Flutter build.** The gallery under `packages/flutter/example` is compiled into `docs/public/flutter` by `npm run flutter --prefix docs`, and the previews frame it. Without that build they say so and show the React half, so a Flutter SDK is only needed by somebody who wants to look at the Flutter half.

  Which demo and which language ride in the frame's query string, because neither changes without the page navigating. The palette does not: it is posted through the frame instead, since a `src` that changed on every flip of the site's dark switch would be a Flutter engine loaded again from nothing to change one colour. The frame speaks first — an engine arrives over the network and loads lazily, so no moment the page could pick on its own would be the right one — and `packages/flutter/example/lib/host.dart` is that half.
- **A `:::` block needs a blank line on each side of its body.** Prettier runs with `proseWrap: "never"` and has never heard of VitePress's custom containers, so a `::: warning` written tight against its text is joined into one line — which stops it being a container at all and spills the rest of the page into the box. The blank lines are what keep the two apart.
- **The editing surfaces are tested in a real browser.** Selection, ranges, `beforeinput` and `contenteditable` are what this library is made of, and a DOM emulator does not implement them faithfully enough for a passing test to mean anything. See below.
- **Every rule in `src/styles.css` is scoped under `.mawy-root`.** A viewer is dropped into somebody else's page, and that page has an `article h2` or a `table { display: block }` of its own — both (0,1,1), both enough to beat a single class. The `:where()` resets at the top of the file are the deliberate exception: a reset should be the weakest thing in the room.
- **The documentation site is where components are looked at.** `docs/.vitepress/theme/components/MawyDemo.vue` mounts a React root inside a Vue page, and `docs/.vitepress/demos/**/*.tsx` are real, runnable components rendered straight from `packages/react/src` through a Vite alias. Nothing on the site reads `dist/`, so an edit to a component is on the page as soon as it is saved. There is no separate demo application.
- **The site has to be told where the library's own imports live**, in both `docs/.vitepress/config.ts` and `docs/tsconfig.json` — see [Third-party dependencies](#third-party-dependencies). This is the one thing in the repository that passes locally and fails in CI, so it is worth knowing before it happens rather than after.

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

`npm run size` needs `npm run build` to have run, since it bundles what would be published rather than what is in `src/`. It fails a change that puts a scenario more than two per cent over the number recorded in `size-budget.json`; if that is the change you meant, `npm run size -- --update` writes the new numbers back and they go in the same commit. The figures on the site's [getting started](https://mawy.cdget.com/guide/getting-started) page are these, so a change that moves them moves those too.

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

Locally the suite runs in Chromium alone, so one browser is enough. CI fans the same suite out across Chromium, Firefox and WebKit on Linux, Windows and macOS — set `VITEST_BROWSER` to run another engine yourself (`VITEST_BROWSER=webkit npm test`, or a comma-separated list).

For the documentation site:

```bash
cd docs
npm ci
npm run dev          # local preview, and the develop-and-eyeball loop
npm run build        # what the deploy workflow runs
npm run lint
npm run typecheck
```

The site pins `vite` to the version VitePress itself runs. Two copies of Vite in `docs/node_modules` is not a bigger install, it is a `@vitejs/plugin-react` compiled against a Vite that is not the one loading it.

**Build the site with `packages/react/node_modules` moved aside**, at least once, before opening a pull request that touches either. The site renders the library from source through an alias, and a demo importing a specifier the alias no longer answers to builds on a machine that has the package installed beside it and fails in CI, where nothing does:

```bash
mv packages/react/node_modules packages/react/node_modules.aside
cd docs && npm run typecheck && npm run build
cd .. && mv packages/react/node_modules.aside packages/react/node_modules
```

### Writing a page that says two things

The site is one site for both packages, and `::: fw react` / `::: fw flutter` marks the parts that differ — `docs/.vitepress/data/frameworks.ts` is the whole list of them. Both halves are in the document and CSS displays one, which is what makes the switch instant and keeps the two from drifting into two pages.

**Never put a heading inside a `::: fw` block.** The blocks are hidden with `display: none` and VitePress builds its outline from the DOM, so a heading in the half a reader is not looking at sits in their sidebar pointing at nothing they can see. Keep the heading shared and mark the content under it — including, where a section belongs to one package alone, a line in the other's fold saying so.

## Third-party dependencies

Mawy aims at close to zero runtime dependencies, and that is a design goal rather than a slogan: a Markdown editor is a component inside somebody else's application, and every package it drags in is one they did not choose.

Each package has **one**, and it is the same one twice: the toolbar's icons. [`lucide-react`](https://lucide.dev) (ISC) for React and [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter) (MIT) for Flutter — the same icon set, which is what makes the two toolbars the same toolbar rather than two that resemble each other.

`lucide-react` brings nothing else with it and tree-shakes to the glyphs actually drawn; `packages/react/test/package/dependencies.test.ts` fails the build if a source file imports anything that is not declared as a dependency or a peer, so the count cannot creep up by accident. `lucide_icons_flutter` is the one thing in either package that is not small — it ships its variable faces whole and Flutter's icon tree-shaking barely dents a variable font, so it is about 3 MB in a build. Ordinary in an app bundle; worth knowing about on the web.

**A runtime dependency has to be added in two places.** The documentation site renders the library from `packages/react/src` through an alias, and it installs only its own `node_modules` — so a package the library imports has to be a devDependency of `docs` as well, listed in `resolve.dedupe` in `docs/.vitepress/config.ts` and in `paths` in `docs/tsconfig.json`. Miss any of that and the site still builds on your machine, because `packages/react/node_modules` is sitting there; CI installs one folder at a time and does not have it. To check the way CI sees it, move the package's `node_modules` out of the way and build the site:

```bash
mv packages/react/node_modules packages/react/node_modules.bak
cd docs && npm run typecheck && npm run build
mv ../packages/react/node_modules.bak ../packages/react/node_modules
```

A pull request that adds a runtime dependency should say, in the description:

- **What it does that we would otherwise write.** Syntax highlighting is the standing example of a fair one — a correct highlighter for dozens of languages is not something to reimplement.
- **Its licence.** MIT, ISC, BSD and Apache-2.0 are fine. Copyleft licences (GPL, LGPL, AGPL) are not, because they would reach into the applications that embed this one.
- **Its own dependency tree and its size.** A small package that brings twelve more is not a small package.

Development dependencies are held to a much looser standard — they never reach a consumer.

## How to contribute (Pull Requests)

### Write the code you want to change

Here's the process for contributing to the project:

1. Clone the project (or rebase to the latest commit in the main branch)
2. Install the package (if the package manager exists)
3. Setting up lint or code formatter in the IDE (if your project includes a linter) and installing the relevant plugins. Some projects may use specific commands to check rules and perform formatting after module installation and before committing.
4. Write the code that needs to be fixed
5. Update the documentation (if it exists) or create a new one. If your project supports multilingual documentation, update the documentation for all languages. You can fill in the content in your own language and not translate it.
6. Add or modify tests as needed (if test code exists). You should also verify that existing tests pass.
7. Add an entry under `## Unreleased` in the changelog of the package you changed, unless the change is invisible to a consumer.

### Write a commit message

While we don't have strict restrictions on commit messages, we recommend that you follow the recommendations below whenever possible:

- Write in English.
- Use the ` symbol to name functions, variables, or folders and files.
- Use a format like `xxx: message (fixes #1)`. The content in parentheses is optional.
- The message includes a summary of what was modified.
- It's a good idea to separate multiple modifications into their own commit messages.

It is recommended that you include a tag at the beginning of the commit message. Between the tag and the message, use `: ` between the tag and the message.

tags conform to the ["Udacity Git Commit Message Style Guide"](https://udacity.github.io/git-styleguide). However, you are welcome to use tags not listed here for additional situations.

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

- Include a specific description of what the modification is, why it needs to be made, and how it works.
- Check to see if there are duplicate pull requests.
- Please use English in all content.

Typically, a project maintainer will review and test your code before merging it into the project. This process can take some time, and they may ask you for further edits or clarifications in the comments.
