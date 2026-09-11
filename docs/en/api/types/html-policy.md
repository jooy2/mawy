---
title: MawyHtmlPolicy
order: 9
---

# `MawyHtmlPolicy`

What becomes of raw HTML written inside a document.

::: fw flutter

This one is the React package's. Raw HTML in a document is shown here as the characters it was written with, and there is no option to change that, because Flutter has no HTML to draw it as. It is the one place the two packages differ about a document, and the difference is in what the screen can do rather than in what the document says.

:::

::: fw react

```ts
type MawyHtmlPolicy = 'escape' | 'sanitize' | 'raw';
```

- `'escape'` — it is shown as the characters it was written with. The default, and the only one that is safe without qualification.
- `'sanitize'` — it is drawn, with everything outside an allowlist of elements, attributes and URL schemes removed first.
- `'raw'` — it is drawn as written. Nothing is removed and nothing is checked: a `<script>` in the document runs, an `onerror` on an image runs, and an `<iframe>` loads — in the page's own origin, with the page's own cookies. **Anybody who can put characters into the document can do anything the application can do.** Set it for documents the application wrote or has already made safe itself.

None of the three affects links. `[click](javascript:…)` is refused under every policy, because it is Markdown rather than HTML and switching the HTML policy was never a statement about it. See [safety](../../guide/viewer#safety).

:::
