import sys
import os

where_am_i = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, where_am_i + "/Lib/site-packages")

import socketio
from clang import cindex
from enum import Enum
import collections
import json

sio = socketio.Client()


cindex.Config.set_library_file(sys.argv[3])


class LimitedSizeDict(collections.OrderedDict):
    def __init__(self, *args, **kwds):
        self.size_limit = kwds.pop("size_limit", None)
        collections.OrderedDict.__init__(self, *args, **kwds)
        self._check_size_limit()

    def __setitem__(self, key, value):
        collections.OrderedDict.__setitem__(self, key, value)
        self._check_size_limit()

    def _check_size_limit(self):
        if self.size_limit is not None:
            while len(self) > self.size_limit:
                self.popitem(last=False)


CDB_CACHE_SIZE = int(sys.argv[2])  # cache the flags of the last N files
use_cache_if_possible = True

file = None


class CompilationDatabase():
    comp_db = None
    cached = LimitedSizeDict(size_limit=CDB_CACHE_SIZE)
    path = None

    def __init__(self, path):
        self.comp_db = cindex.CompilationDatabase.fromDirectory(path)
        self.path = path

    def get_flags(self, source_file):
        if use_cache_if_possible and source_file in self.cached:
            return self.cached[source_file]

        flags = []
        commands = self.comp_db.getCompileCommands(source_file)

        # this is almost always a branch of execution for header files, but LLVM 8.0.0 seems to have the ability to implicitly find corresponding flags for header files??
        # thanks LLVM :)
        if commands == None:
            global file
            return file.fallback_flags

        for command in commands:
            wd = command.directory
            args = command.arguments
            for arg in args:
                str_arg = str(arg)

                if str_arg.startswith("-I"):
                    # if it's an include flag, normalize to working directory.
                    # e.g. normalize -I../xyz -> -IC:/Project/src/../xyz -> -IC:/Project/xyz
                    str_arg = wd + "/" + str_arg[2:]
                    str_arg = "-I" + os.path.abspath(str_arg)

                flags.append(str_arg)

        # skip first & last as they are compiler executable and filename, respectively
        flags = flags[1:]
        flags.pop()

        # as mentioned above, LLVM seems to be able to find flags automatically, but header files ending in .h are still considered C files, so just pass these two flags to make sure
        flags.append("-x")
        flags.append("c++")

        self.cached[source_file] = flags

        return flags


cdb = None


class TranslationUnit():
    index = cindex.Index.create()
    tu = None
    filename = ""
    flags = []

    def __init__(self, filename, use_cdb, cdb_path, fallback_flags, use_fallback_flags):
        global cdb
        if use_cdb:
            if cdb == None:
                cdb = CompilationDatabase(cdb_path)
            self.flags = cdb.get_flags(filename)
        elif use_fallback_flags:
            self.flags = fallback_flags

        try:
            self.tu = self.index.parse(
                filename, args=self.flags, options=cindex.TranslationUnit.PARSE_PRECOMPILED_PREAMBLE)
        except:
            print("Failed to parse")

        self.filename = filename

    def reparse(self):
        if self.tu != None:
            self.tu.reparse()

    def get_types(self):
        if self.tu != None:
            return self.__tokenize__()
        else:
            return []

    def __tokenize__(self):
        tokens = self.tu.cursor.get_tokens()
        result = []
        for token in tokens:
            if token.kind.name == "IDENTIFIER":
                if token.cursor.kind == cindex.CursorKind.TYPE_REF or token.cursor.kind == cindex.CursorKind.TEMPLATE_REF:
                    token_range = token.cursor.extent
                    result.append({"startLine": token_range.start.line, "startColumn": token_range.start.column,
                                   "endLine": token_range.end.line, "endColumn": token_range.end.column})

        return result


class ClangFile:
    filename = ""
    cdb_path = ""
    tu = None
    has_cdb = False
    use_fallback_flags = False
    fallback_flags = []

    def parse(self):
        if self.tu == None:
            self.reset()
        else:
            self.tu.reparse()

    def reset(self):
        self.tu = TranslationUnit(
            self.filename, self.has_cdb, self.cdb_path, self.fallback_flags if self.use_fallback_flags else [], self.use_fallback_flags)

    def types(self):
        types = self.tu.get_types()
        return {"file": self.filename, "ranges": types}

    def init(self, filename, use_cdb, cdb_path, ignore_cache, fallback_flags):
        self.filename = filename
        self.has_cdb = use_cdb
        self.cdb_path = cdb_path
        self.fallback_flags = fallback_flags
        self.use_fallback_flags = not use_cdb
        global use_cache_if_possible
        use_cache_if_possible = not ignore_cache
        self.reset()


file = ClangFile()


@sio.on("resetCache")
def on_reset_cache():
    global cdb
    cdb = None


requested_parse = False


@sio.on("parse")
def on_parse(data):
    global requested_parse
    if not requested_parse:
        requested_parse = True
        filename = data["filename"]
        use_cdb = data["hasCdb"]
        cdb_path = data["cdbPath"]
        ignore_cache = data["ignoreCache"]
        fallback_flags = data["fallbackFlags"]
        if file.filename == filename and file.has_cdb == use_cdb and file.cdb_path == cdb_path and file.fallback_flags == fallback_flags:
            global use_cache_if_possible
            use_cache_if_possible = not ignore_cache
            file.parse()
            types = file.types()
            sio.emit("ranges", json.dumps(types))
            requested_parse = False
        else:
            file.init(filename, use_cdb, cdb_path,
                      ignore_cache, fallback_flags)
            types = file.types()
            sio.emit("ranges", json.dumps(types))
            requested_parse = False
    else:
        return


sio.connect("http://localhost:" + sys.argv[1])
sio.wait()
