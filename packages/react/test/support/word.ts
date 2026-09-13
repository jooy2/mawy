/**
 * A clipboard shaped like the one Microsoft Word writes, for the paste tests.
 *
 * Shaped after what Word 16 for Mac put on a clipboard holding a sentence and a
 * picture, read for its structure alone: `text/html` whose `<img>` is marked
 * with `v:shapes` and has a VML twin pointing at a local file inside a
 * conditional comment, `text/rtf` holding the same picture as a PNG inside
 * `\shppict` and again as a metafile inside `\nonshppict`, and a PNG file that
 * is a picture of the whole selection rather than of the picture. That Mac
 * writes the `<img>` as a `data:` address and Word on Windows as a `file:` one
 * is the report this exists for; the Windows clipboard has not been captured.
 *
 * Nothing here was copied out of a real document. The words, the paths and
 * the picture are placeholders.
 */

/** A one-pixel PNG, as the bytes the RTF writes in hexadecimal. */
export const PIXEL_HEX =
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
  '0000000d4944415478da63fccfc0f01f00050502005fc8f1d20000000049454e44ae426082';

/** The same PNG as a `data:` address. */
export const PIXEL_DATA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

/** One picture in the markup, with its VML twin, at the address given. */
function picture(src: string, index: number): string {
  const shape = `Picture_x0020_${index}`;

  return (
    `<!--[if gte vml 1]><v:shape id="${shape}" o:spid="_x0000_i102${index}" type="#_x0000_t75"` +
    ` style='width:96pt;height:96pt;visibility:visible;mso-wrap-style:square'>` +
    `<v:imagedata src="file:///PATH/clip_image00${index}.png" o:title=""/></v:shape><![endif]-->` +
    `<![if !vml]><img width=128 height=128 src="${src}" v:shapes="${shape}"><![endif]>`
  );
}

/** Word's HTML for a sentence followed by a paragraph of pictures. */
export function wordHtml(...sources: string[]): string {
  return (
    `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"` +
    ` xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta http-equiv=Content-Type content="text/html; charset=utf-8">` +
    `<meta name=ProgId content=Word.Document><meta name=Generator content="Microsoft Word 15">` +
    `<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->` +
    `<style>p.MsoNormal { margin: 0 }</style></head>` +
    `<body lang=EN-US style='word-wrap:break-word'><!--StartFragment--><div class=WordSection1>` +
    `<p class=MsoNormal><span lang=EN-US>Some words.<o:p></o:p></span></p>` +
    `<p class=MsoNormal><span lang=EN-US>${sources.map(picture).join('')}<o:p></o:p></span></p>` +
    `</div><!--EndFragment--></body></html>`
  );
}

/** One picture group, the way Word writes it in RTF. */
export function rtfPicture(blip: string, hex: string, nonShape = false): string {
  const properties =
    '\\picscalex100\\picscaley100\\piccropl0\\piccropr0\\piccropt0\\piccropb0' +
    '\\picw4516\\pich4516\\picwgoal2560\\pichgoal2560';
  const group = `{\\pict{\\*\\picprop\\shplid1025{\\sp{\\sn shapeType}{\\sv 75}}}${properties}\\${blip}\\bliptag255{\\*\\blipuid 00ff00ff}${hex}}`;

  return nonShape ? `{\\nonshppict${group}}` : `{\\*\\shppict${group}}`;
}

/** Word's RTF for the same sentence and pictures, each written twice. */
export function wordRtf(...pictures: string[]): string {
  return (
    '{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\froman Times New Roman;}}' +
    '{\\*\\generator Microsoft Word 16;}\\pard\\plain Some words.\\par\\pard\\plain ' +
    pictures
      .map(
        (hex) => `${rtfPicture('pngblip', hex)}${rtfPicture('wmetafile8', '010009000003', true)}`
      )
      .join('') +
    '\\par}'
  );
}
