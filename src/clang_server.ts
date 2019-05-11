"use strict";

import * as io from "socket.io";
import * as http from "http";
import * as child_process from "child_process";
import { EventEmitter } from "events";

export class ClangServer extends EventEmitter {
  public server: http.Server = http.createServer();
  public io: SocketIO.Server;
  public fallbackFlags: string[] = [];
  // @ts-ignore
  private client: child_process.ChildProcess;

  public callback: (
    ranges: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    }[],
    file: string
  ) => void;

  constructor(
    pythonScript: string,
    python3Executable: string,
    port: number,
    maxCacheSize: number,
    libclangPath: string,
    callback: (
      ranges: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      }[],
      file: string
    ) => void
  ) {
    super();

    this.callback = callback;

    this.io = io(this.server, {
      path: "",
      serveClient: false
    });

    this.server.listen(port);

    this.io.on("connection", function(socket) {
      socket.on("ranges", function(this: ClangServer, ranges: string) {
        var jsonRanges = JSON.parse(ranges);
        callback(jsonRanges.ranges, jsonRanges.file);
      });
    });

    this.client = child_process.spawn(python3Executable, [
      pythonScript,
      port.toString(),
      maxCacheSize.toString(),
      libclangPath
    ]);
  }

  resetCache() {
    this.io.emit("resetCache");
  }

  request(file: string, ignoreCache: boolean, cdbPath?: string) {
    this.io.emit("parse", {
      filename: file,
      hasCdb: cdbPath !== undefined,
      cdbPath: cdbPath !== undefined ? cdbPath : "",
      ignoreCache: ignoreCache,
      fallbackFlags: this.fallbackFlags
    });
  }
}
