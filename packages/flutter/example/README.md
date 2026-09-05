# The Mawy gallery

The viewer, running, with a few documents to point it at.

```bash
cd packages/flutter/example
flutter run
```

It has two jobs, and they are the same code seen from two sides. Run it and it
is a gallery — a document, the toolbar, and a switch between the samples. Build
it for the web and the documentation site embeds it, one demo per `<iframe>`,
named by `?demo=viewer/basic`. That is what makes the Flutter previews on the
site the *real* Flutter build rather than a screenshot.

The demo and the page's language ride in that query string; the palette does
not. A reader flips the site's own light/dark switch whenever they like, and a
`src` that carried the answer would reload a Flutter engine to change one
colour — so the page posts it into the frame instead and `lib/host.dart`
listens. Run as an app there is no page to hear from, and that file is a
function returning null.

```bash
flutter build web --release --base-href /flutter/
```
