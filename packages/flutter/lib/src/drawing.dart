/// How a link and a picture the document wrote are drawn.
///
/// A file of its own, and Flutter is not imported into it, for the reason
/// `code.dart` is one: the find bar searches what these say is drawn, and
/// `tool/parity.dart` runs that search under the plain Dart VM to diff it
/// against the React package's. `types.dart` re-exports both enums, so an
/// application reads them where it reads the rest of the vocabulary.
library;

/// How a link the document wrote is drawn.
///
/// A screen carrying documents its readers wrote is the case this exists for,
/// and which of the four it wants is a question about that screen: [text] keeps
/// the sentence and drops the destination, [source] shows the destination and
/// follows nothing, and [hide] takes the link out of the sentence altogether.
///
/// ```dart
/// MawyViewer(value: comment.body, links: MawyLinkPolicy.text, images: MawyImagePolicy.hide)
/// ```
///
/// Only the links the document wrote. A footnote's number and the way back from
/// a note are this library's own and are drawn whatever this says. A heading's
/// anchor and the outline do not move either: both are made from the words the
/// author wrote, whether or not those words are drawn.
enum MawyLinkPolicy {
  /// A link, which a tap follows through `onLinkTap`. The default.
  show,

  /// Its words, set the way the words around them are, with nothing to tap.
  /// Formatting inside the link stays, and a picture inside it is drawn as
  /// [MawyImagePolicy] says.
  text,

  /// The characters it was written with, `[words](address)`, set the way a
  /// directive nobody claimed is. The address is on the screen and nothing
  /// follows it.
  source,

  /// Nothing, words and all.
  hide,
}

/// How a picture the document asks for is drawn.
///
/// Every value but [show] fetches nothing, and an `imageBuilder` is never
/// asked. See [MawyLinkPolicy], which is the same four answers about a link.
enum MawyImagePolicy {
  /// The picture, fetched. The default.
  show,

  /// Its description, the alt text, as words where the picture would have
  /// been. A picture with no description draws nothing.
  text,

  /// The characters it was written with, `![description](address)`.
  source,

  /// Nothing.
  hide,
}
