# The Mawy gallery

The viewer, running, with a few documents to point it at.

```bash
cd packages/flutter/example
flutter run
```

The same code serves two purposes. Run it and it is a gallery: a document, the
toolbar, and a switch between the samples. Build it for the web and the
documentation site embeds it, one demo per `<iframe>`, named by
`?demo=viewer/basic`. That is what makes the Flutter previews on the site the
*real* Flutter build rather than a screenshot.

The demo and the page's language travel in that query string. The palette does
not. A reader can flip the site's own light/dark switch at any time, and a `src`
that carried the palette would reload a Flutter engine to change one colour, so
the page posts it into the frame instead and `lib/host.dart` listens. When the
gallery runs as an app there is no host page to listen to, and that file is a
function returning null.

```bash
flutter build web --release --base-href /flutter/
```
