<img src="docs/public/128x128.png" alt="Mawy" width="96" height="96" />

# Mawy

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jooy2/mawy/blob/main/LICENSE) [![npm latest package](https://img.shields.io/npm/v/mawy/latest.svg)](https://www.npmjs.com/package/mawy) [![npm downloads](https://img.shields.io/npm/dm/mawy.svg)](https://www.npmjs.com/package/mawy) [![run-test-react](https://github.com/jooy2/mawy/actions/workflows/run-test-react.yml/badge.svg)](https://github.com/jooy2/mawy/actions/workflows/run-test-react.yml)

### 📘 [**mawy.cdget.com**](https://mawy.cdget.com)

Guides and the full API, in English and Korean. This README is the map; each package has a quick start of its own.

---

> **Mawy is a Markdown editor that also does the reading.** Write with the document in front of you as it will look, or drop into the Markdown source and work on that — the two are one click apart. When it is finished, the same document goes out through a read-only viewer, looking exactly as it looked while you were writing it.

> [!IMPORTANT]
> **Mawy is in early development, and most of it works.** The Markdown parser, `MawyViewer` and `MawyEditor` are written and tested. The `wysiwyg` surface — editing the drawn document in place — is partly built: anywhere there is text to type in can be typed in, and raw HTML being drawn rather than shown is refused rather than half-done. Nothing is published to npm yet, and the API is not stable.

## Why Mawy

- **Editor and viewer are the same library.** A viewer that renders differently from the editor that produced the document is the bug every "editor plus separate renderer" setup eventually ships. Here they share the parser and the renderer, so what you typed is what a reader sees.
- **WYSIWYG and source are two views, not two editors.** Toggling does not round-trip through a second implementation and does not lose what the other view could not express.
- **Close to zero dependencies.** The parser, the document model and the editing surface are ours. A third-party library is brought in only where writing it ourselves would be worse than depending on it: today that is [`lucide-react`](https://lucide.dev) for the toolbar's icons, and syntax highlighting will be the next one. Only under a permissive licence, and a test in the suite fails the build if a source file imports something undeclared.
- **The document becomes React elements, not a string of HTML.** There is no `innerHTML` between Markdown and the page, which is what makes the viewer's safe default free rather than careful.
- **Types in the box.** TypeScript declarations ship with the package, so your editor knows the prop names and the values they take before you do.

## Packages

| Package                            | Registry                                        | Requires                               | Quick start                        |
| ---------------------------------- | ----------------------------------------------- | -------------------------------------- | ---------------------------------- |
| [`packages/react`](packages/react) | [npm: `mawy`](https://www.npmjs.com/package/mawy) | React 18 or 19, Node.js 20.19 or later | [README](packages/react/README.md) |

Flutter support is planned and will land as `packages/flutter`. Each language's package **versions independently and keeps its own changelog** beside its own manifest — [`packages/react/CHANGELOG.md`](packages/react/CHANGELOG.md) is the React package's — so a release on one side is not a release on the other and the numbers will not always agree.

## Install

```bash
npm install mawy
```

`react` and `react-dom` are peer dependencies — React 18 or 19.

## Repository layout

| Path             | What it is                                | How it is run                                                                    |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| `packages/react` | The npm package, `mawy`                   | `cd packages/react && npm install`, then `npm test`, `npm run lint`, `npm run build` |
| `docs`           | The documentation site, shared by every language | `cd docs && npm install`, then `npm run dev`                                  |

There is no install at the repository root and no root `package.json` — each folder is entered and run on its own. [CONTRIBUTING.md](CONTRIBUTING.md) has the rest.

## Documentation

| Page                                                            | What you will find                                     |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| [**Getting started**](https://mawy.cdget.com/guide/getting-started) | Install and setup, end to end.                     |
| [**Editor**](https://mawy.cdget.com/guide/editor)               | The source surface, the preview, and switching between them — with live demos. |
| [**Viewer**](https://mawy.cdget.com/guide/viewer)               | Rendering a document without editing it — with live demos. |
| [**API**](https://mawy.cdget.com/api/)                          | Every component and every option.                      |
| [**Changelog**](https://mawy.cdget.com/changelog)               | What changed in each release.                          |

The site is also served in Korean at [mawy.cdget.com/ko/](https://mawy.cdget.com/ko/).

## Contributing

Bug reports, feature requests and pull requests are welcome — [CONTRIBUTING.md](CONTRIBUTING.md) says how, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) is the conduct this project holds itself to. For anything with a security impact, do **not** open an issue; [SECURITY.md](SECURITY.md) has the private route.

## License

[MIT](LICENSE) © [CDGet](https://cdget.com)
