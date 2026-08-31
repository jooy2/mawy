/**
 * An image that arrived as a file, on its way into the Markdown.
 *
 * The bytes are not this library's problem and are deliberately not made into
 * one: `MawyImageUpload` is a prop, the application answers it with a URL, and
 * what is written here is the four characters of Markdown around whatever came
 * back. An editor that quietly turned a two-megabyte screenshot into a
 * `data:` URI inside somebody's document would be making a decision with a bill
 * attached on their behalf.
 *
 * What is left is the part that is easy to get wrong: a file called `a (1).png`
 * has a bracket in its name and a parenthesis in its URL, and both of them mean
 * something in the sentence they are about to be written into.
 */

import type { MawyImageSource } from '../types.js';

/** The image files on a transfer, in the order it lists them. */
export function imageFilesIn(transfer: DataTransfer | null): File[] {
  return [...(transfer?.files ?? [])].filter((file) => file.type.startsWith('image/'));
}

/**
 * The image files a clipboard is carrying *instead of* markup.
 *
 * Markup wins, and that is not a tie-break so much as the whole rule: an image
 * copied out of a web page comes with an `<img>` that already says where it
 * lives, and re-uploading a picture that is already on the web is work nobody
 * asked for. A screenshot has no markup at all, which is exactly what makes it
 * the case this is here for.
 */
export function pastedImagesIn(clipboard: DataTransfer | null): File[] {
  return clipboard && !clipboard.getData('text/html') ? imageFilesIn(clipboard) : [];
}

/** What a file is called, without the extension it is stored under. */
export function altFor(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').trim();
}

/** `[` and `]` inside the description, which would end it early. */
function escapeAlt(text: string): string {
  return text.replace(/[\\[\]]/g, '\\$&');
}

/**
 * A destination, written so that it is the destination.
 *
 * A URL with a space or a bracket in it ends the link early where it stands,
 * so it goes inside angle brackets — which is the form Markdown has for exactly
 * this, and which then has two characters of its own to escape.
 */
function destination(url: string): string {
  return /[\s()]/.test(url) ? `<${url.replace(/[\\<>]/g, '\\$&')}>` : url.replace(/[\\]/g, '\\$&');
}

/** The Markdown for an image, from whatever the upload answered with. */
export function markdownForImage(source: MawyImageSource, file: File): string {
  const image = typeof source === 'string' ? { url: source } : source;
  const alt = escapeAlt(image.alt ?? altFor(file));
  const title = image.title ? ` "${image.title.replace(/["\\]/g, '\\$&')}"` : '';

  return `![${alt}](${destination(image.url)}${title})`;
}
