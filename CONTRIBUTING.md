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

| Path             | What it is                                       | How it is run                                                                        |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `packages/react` | The npm package, `mawy`                          | `cd packages/react && npm install`, then `npm test`, `npm run lint`, `npm run build` |
| `docs`           | The documentation site, shared by every language | `cd docs && npm install`, then `npm run dev`                                          |

There is no install at the repository root, and no root `package.json` — each folder is entered and run on its own.

A Flutter package is planned and will arrive as `packages/flutter`, with a changelog of its own beside its own manifest. Until then, "the package" means the React one.

A few notes that are easy to trip over:

- **Each package keeps its own `CHANGELOG.md`,** beside its manifest, where npm and a reader browsing that package expect to find it. The documentation site's copy is generated from it by `docs/scripts/copy-changelog.mjs` and is git-ignored — edit the package's file, never the one under `docs/`.
- **A change usually means a change to the docs in _both_ languages.** `docs/en` and `docs/ko` mirror each other page for page. If you cannot write the Korean, write the English and say so in the pull request; a maintainer will follow up rather than let the two drift.
- **A `:::` block needs a blank line on each side of its body.** Prettier runs with `proseWrap: "never"` and has never heard of VitePress's custom containers, so a `::: warning` written tight against its text is joined into one line — which stops it being a container at all and spills the rest of the page into the box. The blank lines are what keep the two apart.
- **The editing surfaces are tested in a real browser.** Selection, ranges, `beforeinput` and `contenteditable` are what this library is made of, and a DOM emulator does not implement them faithfully enough for a passing test to mean anything. See below.

## Running the checks

Everything CI runs, you can run:

```bash
cd packages/react
npm ci
npm run lint         # ESLint
npx prettier . --check
npm run typecheck    # tsc, source and tests
npm test             # Vitest, in a real browser
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
npm run dev          # local preview
npm run build        # what the deploy workflow runs
npm run lint
npm run typecheck
```

## Third-party dependencies

Mawy aims at close to zero runtime dependencies, and that is a design goal rather than a slogan: a Markdown editor is a component inside somebody else's application, and every package it drags in is one they did not choose. A pull request that adds a runtime dependency should say, in the description:

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
