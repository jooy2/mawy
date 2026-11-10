/**
 * What a host page's stylesheet does to a Mawy document, measured.
 *
 * Shared by `test/package/host.test.tsx`, which asks it of `styles.css`, and
 * `test/package/isolated.test.tsx`, which asks it of the isolated sheet.
 */

/**
 * A documentation theme, roughly. Bare element names under one class, which is
 * how a sheet that styles prose is written and is exactly the shape that
 * reaches past a library writing `.mawy-root .mawy-md p`.
 */
export const HOST = `
  .host h1, .host h2, .host h3, .host h4, .host h5, .host h6 {
    margin: 48px 0 16px;
    padding-top: 24px;
    border-top: 1px solid #f00;
    font-size: 41px;
    font-weight: 300;
    line-height: 1.1;
    letter-spacing: 0.3em;
    color: #f00;
  }
  .host p, .host li, .host dt, .host dd {
    margin: 16px 0;
    padding: 4px 8px;
    font-size: 15px;
    line-height: 2.4;
    letter-spacing: 0.2em;
    color: #f00;
  }
  .host ul, .host ol, .host dl {
    margin: 16px 0;
    padding-left: 1.25rem;
    list-style-position: inside;
  }
  .host ul { list-style-type: square; }
  .host ol { list-style-type: upper-roman; }
  .host blockquote {
    margin: 16px 0;
    padding: 12px 16px;
    border-left: 6px solid #f00;
    background-color: #ff0;
    color: #f00;
    font-style: italic;
  }
  .host pre, .host code {
    margin: 16px 0;
    padding: 20px;
    border: 2px solid #f00;
    border-radius: 0;
    background-color: #ff0;
    color: #f00;
    font-size: 19px;
    line-height: 2.2;
    font-family: Georgia, serif;
  }
  .host table { margin: 16px 0; border-collapse: separate; border-spacing: 7px; width: 100%; }
  .host th, .host td { padding: 20px; border: 2px solid #f00; text-align: right; color: #f00; }
  .host tr { background-color: #ff0; }
  .host hr { margin: 48px 0; border: none; border-top: 4px dashed #f00; }
  .host a { color: #f00; text-decoration-line: overline; text-underline-offset: 9px; }
  .host img { margin: 16px 0; border: 3px solid #f00; border-radius: 0; }
  .host sup { font-size: 19px; vertical-align: sub; }
  .host strong { font-weight: 400; color: #f00; }
  .host em { font-style: normal; color: #f00; }
  .host del { text-decoration-line: overline; color: #f00; }
  .host section { margin: 48px 0; padding: 20px; border: 2px solid #f00; }
  .host input { accent-color: #f00; margin: 12px; width: 24px; height: 24px; }
  .host mark { background-color: #ff0; color: #f00; }
`;

/** What a host sheet sets, and so what has to be measured. */
export const PROPERTIES = [
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-left-style',
  'border-top-color',
  'border-left-color',
  'border-top-left-radius',
  'border-collapse',
  'border-spacing',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'color',
  'background-color',
  'text-align',
  'text-decoration-line',
  'text-underline-offset',
  'vertical-align',
  'list-style-type',
  'list-style-position',
  'accent-color'
];

/** Every element inside [root], and what it is drawn like right now. */
export function measure(root: Element) {
  const taken = new Map<string, Record<string, string>>();
  const seen = new Map<string, number>();

  for (const element of root.querySelectorAll('.mawy-md, .mawy-md *')) {
    const tag = element.tagName.toLowerCase();
    const count = (seen.get(tag) ?? 0) + 1;

    seen.set(tag, count);

    const style = getComputedStyle(element);
    const values: Record<string, string> = {};

    for (const property of PROPERTIES) {
      values[property] = style.getPropertyValue(property);
    }

    taken.set(`${tag}:${count}`, values);
  }

  return taken;
}

/** What the host's sheet moved, as `element property: before -> after`. */
export function moved(before: ReturnType<typeof measure>, after: ReturnType<typeof measure>) {
  const changes: string[] = [];

  for (const [key, values] of before) {
    const now = after.get(key);

    if (!now) {
      continue;
    }

    for (const [property, value] of Object.entries(values)) {
      if (now[property] !== value) {
        changes.push(`${key} ${property}: ${value} -> ${now[property]}`);
      }
    }
  }

  return changes;
}

/**
 * The document measured with the host's sheet off and then on, without
 * rendering it twice: a second render is a second element tree, and a property
 * that is a fraction of a measured width would differ for that reason alone.
 */
export async function withHost(container: Element, css = HOST) {
  const before = measure(container);
  const sheet = document.createElement('style');

  sheet.textContent = css;
  document.head.append(sheet);

  try {
    // A reflow, so that what is measured is the page with the sheet applied.
    void (container as HTMLElement).offsetHeight;

    return moved(before, measure(container));
  } finally {
    sheet.remove();
  }
}
