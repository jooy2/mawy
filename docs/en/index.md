---
layout: home

title: Mawy
titleTemplate: A Markdown editor and viewer in one package
description: A Markdown editor and viewer in one package — a WYSIWYG surface, a plain source surface and a read-only viewer over the same document, sharing one parser and one renderer. React first, ESM only, types included.

hero:
  name: Mawy
  text: One document, three ways of looking at it
  tagline: A WYSIWYG editor, a plain Markdown editor and a viewer, in one package and behind one value. Switching between them is a change of view, not a change of document.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: API
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/jooy2/mawy

features:
  - title: Editor and viewer, one library
    details: A viewer that renders differently from the editor that produced the document is the bug every editor-plus-separate-renderer setup eventually ships. Here they share the parser and the renderer.
    link: /guide/viewer
    linkText: The viewer
  - title: WYSIWYG and source, one value
    details: Two views of the same document rather than two editors. Toggling does not round-trip through a second implementation and does not lose what the other view could not express.
    link: /guide/editor
    linkText: The editor
  - title: Close to zero dependencies
    details: The package declares none, and a test fails the build if a source file imports something undeclared. A third-party library is brought in only where writing it ourselves would be worse — and only under a permissive licence.
  - title: Tested where it runs
    details: Selection, ranges, contenteditable and beforeinput are what an editor is made of, and a DOM emulator implements none of them faithfully. The suite runs in Chromium, Firefox and WebKit, on three operating systems.
---

## Where this is

Mawy is in early development. The repository scaffolding is in place — packaging, linting, tests in three real browsers, CI and this site — and the editor is being built on top of it. Nothing is published to npm yet, and the API is not stable.

[Getting started](./guide/getting-started) has what exists today. The [changelog](./changelog) is where each release will be written down.
