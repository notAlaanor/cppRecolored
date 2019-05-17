# C++ Recolored

Clang highlighter for C++

**Before**

![before](https://raw.githubusercontent.com/notAlaanor/cppRecolored/master/.media/before.png "Without C++ Recolored")

**After**

![after](https://raw.githubusercontent.com/notAlaanor/cppRecolored/master/.media/after.png "With C++ Recolored")

## Requirements

- Python 3
- LLVM

## Setup

After installing, simply go to the settings and change C++ Recolored > Libclang Path (`cppRecolored.libclangPath`) to the path to the LLVM dynamic library on your system (`libclang.dll/so/dylib`). Note on Windows; this should be LLVM 32-bit.

It is also recommended that you change the highlighting color to match your theme (C++ Recolored > Type Color or `cppRecolored.typeColor`).

## Note

Expect this extension to become obsolete when either an API for VSCode semantic highlighting is implemented or when the LSP implements semantic highlighting, both of which give the C/C++ extension an opportunity to seamlessly implement this feature.

## FAQ

_Can I use a compilation database to provide flags?_

Yes, in fact C++ Recolored automatically looks for `compile_commands.json` in the `build` directory of your project (this directory can be changed in the settings).

_Can I manually provide flags?_

Yes, in the case where C++ Recolored cannot find `compile_commands.json` in the specified directory, it will use fallback flags (`cppRecolored.fallbackFlags`) instead, which can be project specific by using the workspace `settings.json`.

_Why aren't header files being highlighted?_

Make sure you're using the latest version of LLVM (which adds the functionality of automatically finding corresponding header file flags in a compilation database).

IF you're using an older version of LLVM; this is usually because the header file is not defined in the `compilation_database.json` and there are no fallback flags specified. More specifically, if the header file ends in `.h` and `cppRecolored.fallbackFlags` does not contain `["-x", "c++"]`, it will be treated as a C header.

_Why isn't it instant?_

To provide true semantic highlighting C++ Recolored utilizes libclang, which parses the file from the perspective of a compiler. So far, to maximize performance, compilation database flags are cached, libclang re-parses, and existing highlights are retained for each file in memory.

_Why do I need to save to see highlighting changes?_

This is so that it is not parsed unnecessarily (for example when a line is incomplete and therefore contains invalid syntax). However, the libclang API does support in-memory (unsaved file buffer) parsing, which may be implemented in the future.

## Roadmap

- Libclang header/source switcher to provide flags for headers using complementing source file
- Unsaved file support
- Move to advanced highlighting API (if it is ever implemented, right now the Decorations API is used, which is rather unsuitable for this sort of use)
