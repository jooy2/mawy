/// The Mawy gallery.
///
/// Two jobs, and they are the same code seen from two sides:
///
/// - Run it (`flutter run`) and it is a gallery — a document, the toolbar, and
///   a switch between the samples. This is how the viewer is looked at while it
///   is being built.
/// - Build it for the web and the documentation site embeds it, one demo per
///   `<iframe>`, named by `?demo=viewer/basic`. That is what makes the Flutter
///   previews on the site the *real* Flutter build rather than a screenshot.
///
/// Nothing here imports Material or Cupertino, for the same reason the library
/// does not: a gallery that needed a `MaterialApp` around it would not be
/// showing what a consumer of this package actually gets.
library;

import 'package:flutter/widgets.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy_example/samples.dart';

void main() {
  runApp(const GalleryApp());
}

/// The gallery.
class GalleryApp extends StatefulWidget {
  /// Creates the gallery.
  const GalleryApp({super.key});

  @override
  State<GalleryApp> createState() => _GalleryAppState();
}

class _GalleryAppState extends State<GalleryApp> {
  /// Which demo the documentation site asked for, if it asked for one.
  ///
  /// Read once from the page's own query string. An embedded preview shows one
  /// document and no gallery chrome; run as an app there is no query string and
  /// it shows all of them.
  static final String? _wanted = Uri.base.queryParameters['demo'];

  int _at = 0;
  MawyColorScheme _scheme = MawyColorScheme.system;

  Sample get _sample {
    final String? wanted = _wanted;

    if (wanted != null) {
      for (final Sample sample in samples) {
        if (sample.id == wanted) {
          return sample;
        }
      }
    }

    return samples[_at];
  }

  @override
  Widget build(BuildContext context) {
    final bool embedded = _wanted != null;
    final Sample sample = _sample;

    final Widget viewer = MawyViewer(
      // A key on the document, so switching samples starts a fresh viewer
      // rather than one that remembers the last one's scroll position.
      key: ValueKey<String>(sample.id),
      value: sample.value,
      colorScheme: _scheme,
      onColorSchemeChange: (MawyColorScheme next) => setState(() => _scheme = next),
      toolbar: sample.id == 'viewer/minimal' ? const <MawyViewerToolbarItem>[] : kMawyViewerToolbar,
      locale: sample.id == 'viewer/prose' ? MawyLocale.ko : MawyLocale.en,
      onLinkTap: (String url, String? title) {
        debugPrint('link: $url');
      },
    );

    return WidgetsApp(
      title: 'Mawy',
      color: const Color(0xFF5B34EA),
      debugShowCheckedModeBanner: false,
      builder: (BuildContext context, Widget? _) => embedded
          ? viewer
          : Column(
              children: <Widget>[
                _Switch(sample: sample, onChange: _choose),
                Expanded(child: viewer),
              ],
            ),
    );
  }

  void _choose(int index) => setState(() => _at = index);
}

/// The gallery's own switch between documents. Not part of the library.
class _Switch extends StatelessWidget {
  const _Switch({required this.sample, required this.onChange});

  final Sample sample;
  final ValueChanged<int> onChange;

  @override
  Widget build(BuildContext context) {
    final bool dark = MediaQuery.platformBrightnessOf(context) == Brightness.dark;
    final MawyTokens tokens = MawyTokens.of(dark ? Brightness.dark : Brightness.light);

    return Container(
      color: tokens.backgroundSunken,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: <Widget>[
            for (int index = 0; index < samples.length; index += 1)
              GestureDetector(
                onTap: () => onChange(index),
                child: Container(
                  margin: const EdgeInsets.only(right: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: samples[index].id == sample.id ? tokens.accentSoft : null,
                    borderRadius: BorderRadius.circular(MawyRadius.medium),
                    border: Border.all(color: tokens.border),
                  ),
                  child: Text(
                    samples[index].label,
                    style: TextStyle(
                      color: samples[index].id == sample.id
                          ? tokens.accent
                          : tokens.foregroundMuted,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
