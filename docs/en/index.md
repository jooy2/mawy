---
layout: home

title: Mawy
titleTemplate: A Markdown editor and viewer in one package
description: A Markdown editor and viewer in one package. Write in WYSIWYG or in the source, switch between them freely, and show the finished document through a read-only viewer.

hero:
  name: Mawy
  text: One document, three ways of looking at it
  tagline: A Markdown editor and viewer in one package. Write with the document in front of you as it will look, or switch to the Markdown source and work on that. When the document is finished, a read-only viewer shows it exactly as it looked while you were writing it.
  image:
    src: /256x256.png
    alt: Mawy
    width: 200
    height: 200
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Try it
      link: /guide/playground
    - theme: alt
      text: API
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/jooy2/mawy

features:
  - title: Write it as it will look
    details: The WYSIWYG surface shows the finished document while you are still writing it, with headings at the size they will be, the table laid out and the image in place. There is no separate preview step.
    link: /guide/editor
    linkText: The editor
  - title: Or write the Markdown
    details: Switch to the source whenever the rendered view is in the way, such as a table that will not lay out or a block you want to paste in whole. Both surfaces edit the same document, so nothing is lost in the move.
    link: /guide/editor
    linkText: The editor
  - title: Then hand it to a reader
    details: When the writing is done, the viewer shows the same document and nothing else. What a reader sees is what the author had in front of them, down to the line breaks.
    link: /guide/viewer
    linkText: The viewer
  - title: Nothing to assemble first
    details: One package and one line of CSS. There is no theme file to fill in, no build-side plugin, and no second library to render what you wrote.
    link: /guide/getting-started
    linkText: Getting started
---

## Where it stands

Mawy is at `1.0.0`. Its own parser reads CommonMark and GitHub's additions, `MawyViewer` draws the result, and `MawyEditor` puts the Markdown source, a live preview and a formatting toolbar around the same string. The demos on [the editor](./guide/editor) and [the viewer](./guide/viewer) pages run those components.

It is published as two packages: [`mawy-react`](https://www.npmjs.com/package/mawy-react) on npm and [`mawy`](https://pub.dev/packages/mawy) on pub.dev. They are one library. The Dart parser and the TypeScript parser implement the same rules in the same functions, and a check in the repository diffs both parsers' trees over every document in it. Both have the viewer and the editor. The Flutter editor has three surfaces where the React one has four, and the editor page says why. Pick yours in the sidebar; it changes what every page here says.

The `wysiwyg` surface, which edits the drawn document in place, is on the React editor's default list of surfaces. Both packages are published at `1.0.0`. From here the exported API is under semantic versioning, so a name only goes away or changes shape in a major version.

[Getting started](./guide/getting-started) has what exists today, and the [changelog](./changelog) records each release.
