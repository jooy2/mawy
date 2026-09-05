/// The page the gallery is embedded in, where it is embedded in one.
///
/// The documentation site frames this build, one demo per `<iframe>`, and hands
/// it `demo` and `locale` in the frame's query string. Those two are fixed for
/// the life of the frame — which demo it is showing and which language the page
/// around it is written in do not change without the page navigating anyway.
///
/// The palette is not fixed. A reader flips the site's own light/dark switch
/// whenever they like, and a query string that carried the answer would mean a
/// new `src` on every flip, which is a Flutter engine loaded again from nothing
/// to change one colour. So the palette does not ride in the URL: the page
/// posts it into the frame, the gallery listens, and the engine keeps running.
///
/// Off the web there is no page around anything and no `dart:js_interop` to
/// listen with, so the other half of this is a function that returns null.
library;

export 'host_none.dart' if (dart.library.js_interop) 'host_web.dart';
