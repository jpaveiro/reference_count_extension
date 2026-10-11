# Change Log

All notable changes to the "peek-file-in-quicknav" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release
## [0.6.0]

- Reference counts are now rendered as a code lens on the line **above** the declaration instead of inline to the side of it.
- Counts read `1 reference` / `N references` instead of `(N)`.
- Clicking a count opens the peek references view for that symbol.
- Counts are resolved lazily, so only the symbols currently on screen trigger a reference lookup.
- Removed the `referenceCounter.decorationPosition` setting, which no longer applies.
