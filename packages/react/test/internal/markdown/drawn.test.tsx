import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyViewer, type MawyImagePolicy, type MawyLinkPolicy } from 'mawy-react';
import drawn from '../../../../flutter/tool/drawn.json';

/**
 * What a drawn document says, against the list the Flutter package is held to.
 *
 * `scripts/parity.mjs` diffs the parse trees and stops there, because what
 * draws is elements on one side and a widget tree on the other and there is
 * nothing to put a diff between. So the two renderers drift without anything
 * saying so, and they did: a directive inside a footnote was drawn as the
 * characters the author typed here and as nothing at all there, for months,
 * because the context a note is drawn from had lost the field that carries the
 * source.
 *
 * `packages/flutter/tool/drawn.json` is the answer, and it is deliberately not
 * a diff. It is a list of documents and, for each, the words the drawn document
 * has to contain and the characters it must not — which is the part of "what a
 * document says" that both packages can be held to in the same words. It lives
 * beside `corpus.json` and for the same reason: one list read by both is the
 * whole point, and two would be two lists that agree until they do not.
 *
 * Only what both packages draw goes in it. There is no raw HTML to draw in the
 * Flutter package and no `wysiwyg` surface, and those differences are written
 * up in `docs/*\/guide/editor.md` rather than tested around. A picture's alt
 * text is not here either while the picture is drawn, and that one is worth
 * naming: a browser draws it from the attribute when the picture will not load,
 * so it is never text on the page, where the Flutter renderer has to draw it as
 * words. Under `images: "text"` both draw it as words, and that is here. Each
 * package checks its own half in its own file.
 */

interface Case {
  why: string;
  markdown: string;
  links?: MawyLinkPolicy;
  images?: MawyImagePolicy;
  says: string[];
  omits?: string[];
}

describe('a drawn document', () => {
  for (const [index, each] of (drawn as Case[]).entries()) {
    it(`${index + 1}. ${each.why}`, async () => {
      // Nothing but the document: the toolbar has words of its own and this is
      // about what the Markdown became.
      const screen = await render(
        <MawyViewer
          value={each.markdown}
          links={each.links}
          images={each.images}
          toolbar={[]}
          directives={{}}
        />
      );
      const said = screen.container.textContent ?? '';

      for (const saying of each.says) {
        expect(said, `should say ${JSON.stringify(saying)}`).toContain(saying);
      }

      for (const saying of each.omits ?? []) {
        expect(said, `should not say ${JSON.stringify(saying)}`).not.toContain(saying);
      }
    });
  }
});
