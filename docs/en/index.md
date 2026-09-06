---
layout: home

title: Mawy
titleTemplate: A Markdown editor and viewer in one package
description: A light, fast Markdown viewer and editor in one package, made to embed in a web page or an app. React and Flutter read the document with the same parser.

hero:
  name: Mawy
  text: A Markdown viewer and editor in one, made to embed
  tagline: A light, fast graphical viewer and editor, so reading or writing a Markdown document takes nothing else. Put it in a code editor, a documentation page or an AI application. It embeds in more than one language and environment.
  image:
    src: /512x512.png
    alt: Mawy
    width: 280
    height: 280
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
  - title: It goes wherever Markdown is shown
    details: A code editor, a documentation page, an AI application. It draws inside a page that already has styles of its own without mixing with them, and the same library goes into React and into Flutter.
  - title: The viewer and the editor are one
    details: The surface that writes a document and the surface that reads it share a parser and a renderer. What a reader sees is what the author had in front of them, down to the line breaks.
    link: /guide/editor
    linkText: The editor
  - title: Reading only? Take the viewer alone
    details: A screen with nothing to edit gets the viewer on its own. The toolbar, the theme and the font settings come with it, and the document is drawn exactly as the editor drew it.
    link: /guide/viewer
    linkText: The viewer
  - title: Nothing to assemble first
    details: One package and one line of CSS. There is no theme file to fill in, no build-side plugin, and no second library to render what you wrote.
    link: /guide/getting-started
    linkText: Getting started
---

## Key features

<ul class="mawy-keys">
  <li>Viewer and editor in one package</li>
  <li>WYSIWYG and Markdown source, either way round</li>
  <li>React and Flutter on the same parser</li>
  <li>CommonMark and GitHub's extensions</li>
  <li>Dark mode and typography built in</li>
  <li>English and Korean interface included</li>
  <li>Rendering that stays out of your page's styles</li>
  <li>Directives for syntax it does not know</li>
</ul>

## Try it now

Edit a Markdown file the way that suits the screen: the editor on its own, the viewer on its own, or the two together. The demo below shows what each of them is like.

<div class="mawy-cta">
  <a href="/guide/playground">Try the full demo</a>
</div>

<MawyDemo name="playground/editor" :flutter="false" :height="460" />
