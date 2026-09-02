---
layout: home

title: Mawy
titleTemplate: A Markdown editor and viewer in one package
description: A Markdown editor that also does the reading — write in WYSIWYG or in the source, switch freely, and show the finished document through a read-only viewer.

hero:
  name: Mawy
  text: One document, three ways of looking at it
  tagline: A Markdown editor that also does the reading. Write with the document in front of you as it will look, or drop into the Markdown source and work on that — the two are one click apart. When it is finished, the same document goes out through a read-only viewer, looking exactly as it looked while you were writing it.
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
    details: The WYSIWYG surface shows the finished document while you are still writing it — headings at the size they will be, the table laid out, the image in place. Nothing to picture in your head, and nothing to preview first.
    link: /guide/editor
    linkText: The editor
  - title: Or write the Markdown
    details: Step into the source whenever the rendered view is in the way — a table that will not behave, a block you want to paste in whole — and step back out. It is the same document either way, so nothing is lost in the move.
    link: /guide/editor
    linkText: The editor
  - title: Then hand it to a reader
    details: When the writing is done, the viewer takes the same document and only shows it. What a reader sees is what the author had in front of them, down to the last line break.
    link: /guide/viewer
    linkText: The viewer
  - title: Nothing to assemble first
    details: One package and one line of CSS. No theme file to fill in before the first screen looks like something, no build-side plugin, and no second library to render what you wrote.
    link: /guide/getting-started
    linkText: Getting started
---

## Where this is

Mawy is at `1.0.0`. A parser of ours reads CommonMark and GitHub's additions; `MawyViewer` draws the result; and `MawyEditor` puts the Markdown source, a live preview and a formatting toolbar around the same string. The demos on [the editor](./guide/editor) and [the viewer](./guide/viewer) pages are those components, running.

It ships twice: [`mawy-react`](https://www.npmjs.com/package/mawy-react) on npm and [`mawy`](https://pub.dev/packages/mawy) on pub.dev. They are one library rather than two — the Dart parser _is_ the TypeScript parser, and a check in the repository diffs both parsers' trees over every document it can find. Both have the viewer and the editor; the Flutter editor has three surfaces where the React one has four, and says why. Pick yours in the sidebar; it changes what every page here says.

The `wysiwyg` surface — editing the drawn document in place — is on the React editor's default list of surfaces. Both packages are published at `1.0.0`, which is a promise as well as a number: from here the exported API is under semantic versioning, so a name that goes away or changes shape waits for a major version.

[Getting started](./guide/getting-started) has what exists today. The [changelog](./changelog) is where each release is written down.
