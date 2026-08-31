---
title: Viewer
order: 3
---

# The viewer

The viewer renders a Markdown document and does not edit it. It is the same parser and the same renderer the editor uses, which is the point of it being in this package rather than being somebody else's library.

::: warning Being built

The component described here is not written yet. This page is the shape it is being built to. Follow the [changelog](../changelog).

:::

## Why it is in this package

A written-with-one-thing, displayed-with-another setup has a failure mode that is hard to argue with after the fact: an author writes a document in the editor, it looks right, and it renders differently for the reader. Every difference between two Markdown implementations — how a list nests, whether a line break is a break, what an unclosed emphasis does — is a chance for that.

Sharing the parser and the renderer removes the category. What the author saw in `preview` is what the viewer draws, because they are the same code path.

## Safety

A viewer renders content that the person running it did not write, so the default is the safe one: **the output is sanitised**, and a document cannot introduce script, event handlers or `javascript:` and `data:` URLs into the page around it.

That default can be turned off, for the case where the document is the application's own and it needs raw HTML through. Turning it off makes the caller responsible for the content — a report about rendering untrusted Markdown with sanitisation deliberately disabled is [out of scope](https://github.com/jooy2/mawy/blob/main/SECURITY.md) as a vulnerability, because it is the documented meaning of the option.

## Planned

- Rendering a document to DOM, with the sanitiser on by default.
- Syntax-highlighted code blocks. This is the standing example of a place a third-party library is worth the dependency: a correct highlighter for dozens of languages is not something to reimplement, and it will be brought in permissively licensed and behind an interface, so an application that does not want it does not pay for it.
- A rendered table of contents, from the same headings the outline is built from.
