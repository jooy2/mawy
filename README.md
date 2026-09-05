<img src="docs/public/128x128.png" alt="Mawy" width="96" height="96" />

# Mawy

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jooy2/mawy/blob/main/LICENSE) [![npm latest package](https://img.shields.io/npm/v/mawy-react/latest.svg)](https://www.npmjs.com/package/mawy-react) [![npm downloads](https://img.shields.io/npm/dm/mawy-react.svg)](https://www.npmjs.com/package/mawy-react) [![pub latest package](https://img.shields.io/pub/v/mawy.svg)](https://pub.dev/packages/mawy) [![run-test-react](https://github.com/jooy2/mawy/actions/workflows/run-test-react.yml/badge.svg)](https://github.com/jooy2/mawy/actions/workflows/run-test-react.yml) [![run-test-flutter](https://github.com/jooy2/mawy/actions/workflows/run-test-flutter.yml/badge.svg)](https://github.com/jooy2/mawy/actions/workflows/run-test-flutter.yml)

### [**mawy.cdget.com**](https://mawy.cdget.com)

Guides and the full API, in English and Korean. This README covers the essentials, and each package has a quick start of its own.

---

> **Mawy is a Markdown editor and viewer in one package.** Write with the document in front of you as it will look, or switch to the Markdown source and work on that. When the document is finished, a read-only viewer shows it exactly as it looked while you were writing it.

> [!IMPORTANT]
> **Published at `1.0.0`.** The Markdown parser, `MawyViewer` and `MawyEditor` are written and tested in both packages: [`mawy-react`](https://www.npmjs.com/package/mawy-react) on npm and [`mawy`](https://pub.dev/packages/mawy) on pub.dev. `wysiwyg`, which edits the drawn document in place, is on the React editor's default list of surfaces; the Flutter editor has the other three and says why. From here the exported names are under semantic versioning, so one that goes away or changes shape waits for a major version.

## Why Mawy

- **React and Flutter are the same library.** The Dart parser is a direct translation of the TypeScript one, file for file, and a check in CI diffs both parsers' trees over every Markdown file here. A document that means one thing in a browser means the same thing in an app.
- **Editor and viewer are the same library.** When a viewer renders differently from the editor that produced the document, authors ship documents that look wrong to readers. Here they share the parser and the renderer, so what you typed is what a reader sees.
- **WYSIWYG and source are two views of one value.** Toggling does not round-trip through a second implementation, so nothing is lost that the other view could not express.
- **Close to zero dependencies.** The parser, the document model, the editing surface and the syntax highlighter are all written here. A third-party library is added only where writing it ourselves would be worse, which today means [`lucide-react`](https://lucide.dev) for the toolbar's icons and nothing else. It has to be permissively licensed, and a test in the suite fails the build if a source file imports something undeclared.
- **The document becomes React elements, not a string of HTML.** There is no `innerHTML` between Markdown and the page, so there is nothing to escape.
- **TypeScript declarations included.** They ship with the package, so your editor can complete the prop names and the values they take.

## Packages

| Package                                | Registry                                                      | Requires                               | Ships             | Quick start                          |
| -------------------------------------- | ------------------------------------------------------------- | -------------------------------------- | ----------------- | ------------------------------------ |
| [`packages/react`](packages/react)     | [npm: `mawy-react`](https://www.npmjs.com/package/mawy-react) | React 18 or 19, Node.js 20.19 or later | Viewer and editor | [README](packages/react/README.md)   |
| [`packages/flutter`](packages/flutter) | [pub.dev: `mawy`](https://pub.dev/packages/mawy)              | Flutter 3.32 or later, Dart 3.8        | Viewer and editor | [README](packages/flutter/README.md) |

Each language's package **versions independently and keeps its own changelog** beside its own manifest: [`packages/react/CHANGELOG.md`](packages/react/CHANGELOG.md) and [`packages/flutter/CHANGELOG.md`](packages/flutter/CHANGELOG.md). A release on one side is not a release on the other, so the numbers will not always agree.

## Install

```bash
npm install mawy-react
```

`react` and `react-dom` are peer dependencies, and React 18 or 19 is supported.

```bash
flutter pub add mawy
```

No Flutter dependency beyond the SDK itself, apart from the toolbar's icons.

## Repository layout

| Path               | What it is                                      | How it is run                                                                        |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/react`   | The npm package, `mawy-react`                   | `cd packages/react && npm install`, then `npm test`, `npm run lint`, `npm run build` |
| `packages/flutter` | The pub.dev package, `mawy`                     | `cd packages/flutter && flutter pub get`, then `flutter test`, `dart analyze`        |
| `docs`             | The documentation site, shared by both packages | `cd docs && npm install`, then `npm run dev`                                         |

There is no install at the repository root and no root manifest of any kind. Each folder is entered and run on its own. [CONTRIBUTING.md](CONTRIBUTING.md) has the rest.

## Documentation

| Page                                                                | What you will find                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [**Getting started**](https://mawy.cdget.com/guide/getting-started) | Install and setup, end to end.                                                |
| [**Editor**](https://mawy.cdget.com/guide/editor)                   | The source surface, the preview, and switching between them, with live demos. |
| [**Viewer**](https://mawy.cdget.com/guide/viewer)                   | Rendering a document without editing it, with live demos.                     |
| [**API**](https://mawy.cdget.com/api/)                              | Every component and every option.                                             |
| [**Changelog**](https://mawy.cdget.com/changelog)                   | What changed in each release.                                                 |

The site is also served in Korean at [mawy.cdget.com/ko/](https://mawy.cdget.com/ko/).

## Contributing

Bug reports, feature requests and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) says how, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) is the conduct this project holds itself to. For anything with a security impact, do **not** open an issue; [SECURITY.md](SECURITY.md) has the private route.

## License

[MIT](LICENSE) © [CDGet](https://cdget.com)
