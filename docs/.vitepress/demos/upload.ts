/**
 * Where an image goes, for a documentation page with nothing behind it.
 *
 * A `data:` URI is exactly what `onUploadImage` exists to avoid doing on
 * anyone's behalf — it puts the whole file inside the document — and it is the
 * right answer here, where there is nowhere else for it to go and nothing to
 * keep. A real application answers with wherever it put the bytes.
 */
export const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(new Error('unreadable')));
    reader.readAsDataURL(file);
  });
