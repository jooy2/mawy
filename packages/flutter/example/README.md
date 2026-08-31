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

```bash
flutter build web --release --base-href /flutter/
```
