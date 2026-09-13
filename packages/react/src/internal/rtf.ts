/**
 * The pictures inside RTF, which is where a word processor's clipboard keeps
 * the bytes of a picture its markup cannot point at.
 *
 * Word writes an `<img>` into the HTML it puts on the clipboard, and on some
 * machines that `<img>` points at a file in a folder of the machine that copied
 * it — an address no page can open. The same document goes on the clipboard as
 * RTF too, and there every picture is written out whole, in hexadecimal, inside
 * a `\pict` group. So a paste that has somewhere to upload a picture can read it
 * back from there instead of losing it.
 *
 * This is not a reader of RTF. It walks the groups to find the pictures and
 * reads nothing else, which is all a paste needs and a small enough job to
 * trust: braces open and close groups, a backslash starts a control word or
 * escapes a character, and the hexadecimal is whatever else is written directly
 * inside a `\pict` group.
 */

/** The formats a picture can be turned into a file in, by the word RTF names them with. */
const FORMATS: Readonly<Record<string, string>> = {
  pngblip: 'image/png',
  jpegblip: 'image/jpeg'
};

/** Every other word that names what format a picture is in. */
const OTHER_FORMATS = new Set([
  'emfblip',
  'macpict',
  'pmmetafile',
  'wmetafile',
  'dibitmap',
  'wbitmap'
]);

interface Group {
  /** Whether a control word has been read in it yet, which is what says what it is. */
  named: boolean;
  /** Whether it is, or is inside, a copy of a picture written for older readers. */
  fallback: boolean;
  /** The picture it is, where it is a `\pict` group. */
  picture: { type: string | null; hex: string[]; broken: boolean } | null;
}

/**
 * Every picture RTF shows, in the order it writes them, as a `data:` address,
 * or as `null` for one there is no file format for.
 *
 * A picture written a second time inside `\nonshppict` is left out. Word writes
 * each picture as a PNG or a JPEG and then again as a metafile for a reader that
 * cannot draw those, so the second one is the same picture, and counting it
 * would put every picture after it one place out.
 */
export function picturesInRtf(rtf: string): (string | null)[] {
  const pictures: (string | null)[] = [];
  const groups: Group[] = [{ named: true, fallback: false, picture: null }];
  let at = 0;

  while (at < rtf.length) {
    const character = rtf[at];
    const group = groups[groups.length - 1];

    if (character === '{') {
      groups.push({ named: false, fallback: group.fallback, picture: null });
      at += 1;
      continue;
    }

    if (character === '}') {
      if (groups.length > 1) {
        groups.pop();

        if (group.picture && !group.fallback) {
          pictures.push(addressOf(group.picture));
        }
      }

      at += 1;
      continue;
    }

    if (character === '\\') {
      const word = /^[a-z]+/i.exec(rtf.slice(at + 1, at + 33))?.[0];

      if (!word) {
        // An escaped character, or `\*`, which marks a group a reader may skip
        // and says nothing about which group it is. `\'hh` is one character
        // written as two digits, and those digits are not a picture's.
        at += rtf[at + 1] === "'" ? 4 : 2;
        continue;
      }

      const parameter = /^-?\d+/.exec(rtf.slice(at + 1 + word.length, at + 13 + word.length))?.[0];
      let next = at + 1 + word.length + (parameter?.length ?? 0);

      if (rtf[next] === ' ') {
        next += 1;
      }

      if (!group.named) {
        group.named = true;

        if (word === 'pict') {
          group.picture = { type: null, hex: [], broken: false };
        } else if (word === 'nonshppict') {
          group.fallback = true;
        }
      } else if (group.picture) {
        if (word in FORMATS) {
          group.picture.type = FORMATS[word];
        } else if (OTHER_FORMATS.has(word.replace(/\d+$/, ''))) {
          group.picture.type = null;
        } else if (word === 'bin') {
          // Raw bytes rather than hexadecimal, as many as the parameter says.
          // Rare on a clipboard, and not something to guess at.
          group.picture.broken = true;
          next += Math.max(0, Number(parameter ?? 0));
        }
      }

      at = next;
      continue;
    }

    // Plain text: in a picture group it is the picture, and anywhere else it is
    // a document's words, which this has no use for.
    let end = at;

    while (end < rtf.length && rtf[end] !== '\\' && rtf[end] !== '{' && rtf[end] !== '}') {
      end += 1;
    }

    group.picture?.hex.push(rtf.slice(at, end));
    at = end;
  }

  return pictures;
}

/** A picture's hexadecimal as a `data:` address, where it is one there can be. */
function addressOf(picture: {
  type: string | null;
  hex: string[];
  broken: boolean;
}): string | null {
  const hex = picture.hex.join('').replace(/\s+/g, '');

  if (!picture.type || picture.broken || !hex || hex.length % 2 || /[^\da-f]/i.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  // A chunk at a time, because a picture is megabytes and an argument list is
  // not allowed to be.
  let binary = '';

  for (let from = 0; from < bytes.length; from += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(from, from + 0x8000));
  }

  return `data:${picture.type};base64,${btoa(binary)}`;
}
