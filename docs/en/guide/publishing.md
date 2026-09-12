---
title: Publishing
order: 4
---

# Publishing

What a page needs around a Mawy document when people are going to find that page through a search engine.

::: fw react

## Draw it on the server

A search engine reads the HTML a page sends. `MawyViewer` does render on a server and then hydrate, so what it draws is in that HTML — but everything the viewer adds is behaviour, and a blog post needs none of it. [`MawyDocument`](../api/components/mawy-document) is the same drawing with no JavaScript behind it.

```tsx
import { MawyDocument } from 'mawy-react/server';
import 'mawy-react/styles.css';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <MawyDocument value={post.body} headingBase={2} />
    </article>
  );
}
```

A React Server Component in a framework that has them. In one that does not, it is an ordinary component and `renderToStaticMarkup` turns it into the string a template writes out:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';

const html = renderToStaticMarkup(<MawyDocument value={post.body} headingBase={2} />);
```

Nothing in this package depends on a framework, and nothing here needs a bundler entry for the client. What reaches the browser is the markup and `styles.css`.

## The heading the page already has

A `#` is an `h1`, which is right when the document is the page and wrong as soon as the page writes its own title. `headingBase={2}` draws the document's `#` as an `h2` and moves every heading under it by the same amount. See [heading levels](./viewer#heading-levels).

## What the page says about itself

A `<title>`, a description and a canonical URL are the page's own, and none of them can be read off a drawn document. [`parseMarkdown`](../api/functions/parse-markdown) is the same parser without a component around it, so the page can ask the document directly:

```ts
import { parseMarkdown, type MdInline } from 'mawy-react/markdown';

const plain = (nodes: MdInline[]): string =>
  nodes
    .map((node) => ('value' in node ? node.value : 'children' in node ? plain(node.children) : ''))
    .join('');

export async function generateMetadata({ params }) {
  const post = await getPost((await params).slug);
  const { root, outline } = parseMarkdown(post.body);
  const opening = root.children.find((block) => block.type === 'paragraph');

  return {
    title: post.title || outline[0]?.text,
    description: opening ? plain(opening.children).slice(0, 160) : undefined,
    alternates: { canonical: `https://example.com/posts/${post.slug}` }
  };
}
```

`outline` is every heading with the anchor it was given, which is also what a table of contents beside the page is built from. The anchors match the ones in the drawn document, so a link into the middle of a post lands.

## Links a reader wrote

A document somebody else wrote has somebody else's links in it. [`linkRel`](../api/types/link-target#mawylinkrel) is what the page declares about them:

```tsx
<MawyDocument
  value={post.body}
  linkRel={(href) => (href.startsWith('/') ? null : 'nofollow ugc')}
/>
```

What it answers is added to what the link already declares, so a link opening in a new tab keeps its `noopener noreferrer`.

## Pictures

The renderer writes an `<img>` with `loading="lazy"` on every picture but the first, which is written `loading="eager"` with `fetchpriority="high"` — a page whose document opens with a picture is usually measured on that picture. See [the first picture](../api/types/image#the-first-picture).

Two things this library cannot answer for you:

- **A picture's size.** Markdown does not carry one, so the `<img>` has no `width` and `height` and the page reflows when the bytes arrive. `--mawy-doc-image-aspect` reserves a box where an application knows the shape of its pictures, and `image` is where a framework's own image component goes:

  ```tsx
  <MawyDocument
    value={post.body}
    image={({ src, alt, title, first }) => (
      <Image
        src={src}
        alt={alt}
        title={title ?? undefined}
        width={1200}
        height={630}
        priority={first}
      />
    )}
  />
  ```

- **Where a relative address points.** A URL in a document is relative to the document and the page is somewhere else, so `![](./diagram.png)` is a picture the browser looks for beside the application. [`resolveUrl`](../api/types/url-resolver) is the answer.

## What is not this library's to write

`robots.txt`, `sitemap.xml`, the canonical host and the structured data are the site's, and a Markdown renderer has no opinion about any of them. What it owes the page is markup a crawler can read without running anything, which is what the rest of this page is about.

:::

::: fw flutter

A Flutter web build draws the document onto a canvas rather than into elements, so there is no heading, paragraph or link in the page for a crawler to read — however well the widgets describe themselves to a screen reader, and this package's do. A page that has to be found through a search engine is drawn as HTML.

That is a decision about where each half of an application goes rather than a gap in this package. The viewer is for the document inside the app; a post that has to be indexed is served as a page, and the React package is the half that draws it.

:::
