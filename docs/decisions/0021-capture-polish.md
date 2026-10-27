# 0021. Capture form polish: the keyboard bar and the price field

## Context

On a phone, the bar with the main buttons was fixed at the bottom of four screens. With the on
screen keyboard open it sat on top of the keyboard and took a large part of the small visible area,
and fields were hidden behind it. The price field showed what was typed ("80000") and only the saved
price was written with separators, so it was hard to read a long number.

## Decision

- One `BottomBar` component replaces the four fixed bars. It stays at the bottom, but while the
  keyboard is open (the visible part of the page is at least 120 px shorter than the full height, from
  the visual viewport) it moves into the page. Turning the phone resets the measure.
- The price field groups the digits as they are typed ("80000" becomes "80.000"), with a dollar sign
  next to it and a numeric keyboard. The grouping comes from the language's number format, not from a
  hand-built string. Text with letters, such as "80 mil", is left as typed because the price parser
  understands it. A value above the database maximum is cut digit by digit until it fits.
- The text sent to the server is the grouped one; the price parser already accepts "80.000" and "80,000".

## Consequences

- The bar's position was checked with tests and a stubbed visual viewport, not on a real keyboard.
- The caret may jump to the end when a digit is typed in the middle of the number.
