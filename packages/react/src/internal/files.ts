/**
 * A document, read off the disk and written back to it.
 *
 * Here rather than in either component because the viewer and the editor both
 * open a file and have to agree about what one is: two lists of extensions
 * drift, and a `.mdown` the viewer opens and the editor refuses is a bug nobody
 * would think to look for.
 */

/** What a file picker offers, and what a drop is checked against. */
export const MAWY_ACCEPT = '.md,.markdown,.mdown,.mkd,.mdx,.txt,text/markdown,text/plain';

/**
 * Five megabytes of Markdown is about a million words.
 *
 * The failure this prevents is a tab that stops answering because somebody
 * dropped a database dump on it — which is not a file anybody meant to open,
 * and refusing it out loud is better than reading it for ten seconds.
 */
export const MAWY_MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Whether a file is one the picker would have offered.
 *
 * The picker has `accept` and a drop had nothing, so a `.zip` let go of over an
 * editor was read as text and became the document — five megabytes of mojibake,
 * recoverable only by undo. This is that same list, applied to the other way in.
 *
 * Read generously, because a platform is not reliable about what it says a file
 * is: an extension on the list is enough, a media type on the list is enough,
 * anything the platform called text is enough, and a file it said nothing at
 * all about — no extension and no type, which is what a `README` is — is taken
 * rather than refused. What this stops is the file that positively says it is
 * something else.
 */
export function acceptsFile(file: File, accept: string): boolean {
  const wanted = accept
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const type = file.type.toLowerCase();
  const dot = file.name.lastIndexOf('.');
  const extension = dot > 0 ? file.name.slice(dot).toLowerCase() : '';

  if (extension && wanted.includes(extension)) {
    return true;
  }

  if (type && (wanted.includes(type) || type.startsWith('text/'))) {
    return true;
  }

  return !extension && !type;
}

/** What went wrong, or `null` when nothing did. */
export type MawyReadFailure = 'tooLarge' | 'unreadable';

/** A file's text, or why there is none. */
export async function readTextFile(
  file: File
): Promise<{ text: string } | { failed: MawyReadFailure }> {
  if (file.size > MAWY_MAX_FILE_SIZE) {
    return { failed: 'tooLarge' };
  }

  try {
    return { text: await file.text() };
  } catch {
    return { failed: 'unreadable' };
  }
}

/**
 * A document, handed to the browser to save.
 *
 * An anchor with a `download` on it rather than the File System Access API,
 * which only Chromium has: a save that works in one browser and silently does
 * nothing in another is worse than one that always does the same thing. An
 * application that wants to write somewhere else — a server, a file handle it
 * is holding — says so with `onSave` and this is never reached.
 *
 * The object URL is revoked on the next turn rather than immediately. Firefox
 * has not started reading it when the click returns.
 */
export function saveTextFile(text: string, name: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Windows refuses a name that ends in a space or a dot. */
const TRAILING = /[\s.]+$/;
/** Everything a file name may not have in it, on the strictest of the platforms. */
const UNUSABLE = /[\\/:*?"<>|\u0000-\u001f]/g;

/**
 * What a document is saved as when nobody has said.
 *
 * The first heading, because that is what the document calls itself and what
 * somebody looking through a folder of these would want to read. `document.md`
 * when there is no heading to take it from — a name is needed either way, and
 * an empty one is a browser refusing to save at all.
 */
export function fileNameFor(value: string): string {
  const heading = /^[ \t]{0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/m.exec(value)?.[1] ?? '';
  const name = heading.replace(UNUSABLE, '').replace(TRAILING, '').slice(0, 80).trim();

  return `${name || 'document'}.md`;
}
