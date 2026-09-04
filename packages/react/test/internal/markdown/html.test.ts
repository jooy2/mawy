import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../../../src/internal/markdown/html.js';

/**
 * The sanitiser, asked the question its shape makes unavoidable.
 *
 * What leaves it is a *string*, and the browser parses that string again to put
 * it on the page. So walking a tree and finding it safe is not the whole claim:
 * the claim is that the characters written out of that tree come back as the
 * same tree. Markup that does not is where mutation XSS lives, and the answer
 * here is to read it again and hand nothing over until the two readings agree.
 *
 * The list below is the awkward corner of HTML rather than a list of exploits:
 * elements whose contents are raw text, attributes holding what looks like a
 * tag, and comments that end somewhere other than where they appear to.
 */
const AWKWARD = [
  '<p>ordinary</p>',
  '<p>unclosed',
  '<b><i>crossed</b></i>',
  '<listing><img src=x onerror=alert(1)></listing>',
  '<noembed><img src=x onerror=alert(1)></noembed>',
  '<xmp><img src=x onerror=alert(1)></xmp>',
  '<plaintext><img src=x onerror=alert(1)>',
  '<p title="</p><img src=x onerror=alert(1)>">a</p>',
  '<div title="<!--"></div>--><img src=x onerror=alert(1)>',
  '<a href="x">&lt;img src=x onerror=alert(1)&gt;</a>',
  '<i>&lt;/i&gt;&lt;img src=x onerror=alert(1)&gt;</i>',
  '<select><option><style></option></select><img src=x onerror=alert(1)></style>',
  '<table><td><nope><script>alert(1)</script></nope>',
  '<svg><style><a title="</style><img src=x onerror=alert(1)>">',
  '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>'
];

describe('sanitising raw HTML', () => {
  it('hands back only markup that reading again would not change', () => {
    for (const source of AWKWARD) {
      const once = sanitizeHtml(source);

      // `null` is the refusal, and it is an answer of its own: the caller draws
      // the characters the author wrote instead of any markup at all.
      expect(once === null || sanitizeHtml(once) === once).toBe(true);
    }
  });

  it('leaves nothing in any of them that the browser would run', () => {
    // Asked of the tree the browser makes of the answer rather than of the
    // characters in it: an `onerror` that came back escaped is seven letters
    // and not a handler, and that difference is the whole point.
    for (const source of AWKWARD) {
      const drawn = new DOMParser().parseFromString(
        `<body>${sanitizeHtml(source) ?? ''}`,
        'text/html'
      );

      for (const element of drawn.body.querySelectorAll('*')) {
        for (const attribute of element.attributes) {
          expect([source, attribute.name]).toEqual([source, expect.not.stringMatching(/^on/i)]);
        }
      }

      expect(drawn.body.querySelector('script, style, iframe, svg, math')).toBeNull();
    }
  });

  it('keeps the prose out of an element whose contents are text rather than markup', () => {
    // `<xmp>` is not on the list, so it is unwrapped — and what the parser read
    // inside it was never markup, so it comes back out as the characters it is.
    expect(sanitizeHtml('<xmp><img src=x onerror=alert(1)></xmp>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
  });

  it('closes what the author left open, and says so the same way twice', () => {
    expect(sanitizeHtml('<p>unclosed')).toBe('<p>unclosed</p>');
    expect(sanitizeHtml('<b><i>crossed</b></i>')).toBe('<b><i>crossed</i></b>');
  });
});
