import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

/// How long a document takes against how long it is, on the list the React
/// package is held to.
///
/// A parser that gets slower with the square of its input passes every test
/// that gives it a sentence, and then freezes the thread that draws when it is
/// handed a file somebody else wrote. Thirty-two kilobytes of `[` took ten
/// seconds here before this file existed, and most of what is listed in
/// `tool/slow.json` was a copy of the text made at every character of some kind,
/// which the other package's strings do not make.
///
/// Time is the thing a test should not read, so what is read is a ratio on the
/// one machine: the same document eight times as long takes about eight times
/// as long whatever the machine is, and sixty-four times if it is quadratic.
/// Both suites read the one file, so a shape added for one is a shape the other
/// answers too.
void main() {
  final List<dynamic> slow = jsonDecode(File('tool/slow.json').readAsStringSync()) as List<dynamic>;

  /// How many times longer the long document is.
  const int scale = 8;

  /// What a document that really grows with its length stays under. A little
  /// past twice the honest ratio, because a collector runs on the long one.
  const double allowed = 20;

  /// Below this a clock is measuring itself, so a short document counts as this.
  const int floor = 8000;

  /// The document, at this many times its length in the list.
  String written(List<dynamic> parts, int times) {
    final StringBuffer out = StringBuffer();

    for (final dynamic raw in parts) {
      final List<dynamic> part = raw as List<dynamic>;
      final String text = part[0] as String;
      final int count = part[1] as int;

      if (part.length > 2) {
        final int rising = count * math.sqrt(times).round();

        for (int length = 1; length <= rising; length += 1) {
          out
            ..write(text * length)
            ..write(' ');
        }
      } else {
        final int repeats = count == 1 ? 1 : count * times;

        for (int index = 0; index < repeats; index += 1) {
          out.write(text.replaceAll('{n}', '$index'));
        }
      }
    }

    return out.toString();
  }

  /// The fastest of a few runs, in microseconds, because everything that can
  /// happen to a run makes it slower.
  int best(String source, int runs) {
    int least = 1 << 62;

    for (int run = 0; run < runs; run += 1) {
      final Stopwatch watch = Stopwatch()..start();

      parseMarkdown(source);
      watch.stop();

      if (watch.elapsedMicroseconds < least) {
        least = watch.elapsedMicroseconds;
      }
    }

    return least;
  }

  group('a document costs what it is long', () {
    for (final dynamic raw in slow) {
      final Map<String, dynamic> shape = raw as Map<String, dynamic>;

      test(shape['why'] as String, retry: 2, () {
        final List<dynamic> parts = shape['parts'] as List<dynamic>;
        final String short = written(parts, 1);
        final String long = written(parts, scale);

        // Once for the compiler, which has not seen this shape.
        best(short, 1);

        final int shortest = math.max(best(short, 2), floor);
        final int longest = best(long, 2);

        expect(longest / shortest, lessThan(allowed));
      });
    }
  });
}
