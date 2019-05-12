"use strict";

import { File } from "./file";
import { ClangServer } from "./clang_server";
import * as vscode from "vscode";
import * as fs from "fs";

export class Manager {
  public server: ClangServer;
  public file: File;
  public decoration: vscode.TextEditorDecorationType;

  constructor(filename: string, scriptPath: string) {
    var config = vscode.workspace.getConfiguration("cppRecolored");

    this.server = new ClangServer(
      scriptPath,
      config.get<string>("pythonExecutable")!,
      config.get<number>("port")!,
      config.get<number>("maxCacheSize")!,
      config.get<string>("libclangPath")!,
      this.rangesCallback.bind(this)
    );

    this.server.fallbackFlags = config.get<string[]>("fallbackFlags")!;

    this.file = new File();

    this.decoration = this.decorationType();
  }

  rangesCallback(
    ranges: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    }[],
    file: string
  ) {
    if (vscode.window.activeTextEditor) {
      if (file === vscode.window.activeTextEditor.document.fileName) {
        // somewhat unorthodox way to compare paths, but the python client just stores the path we send it, so it should be the same format
        this.file.highlight(ranges, this.decoration);
      }
    }
  }

  // had to split these 2 functions because of dumb typescript uninitialized variable function side effect stuff
  decorationType() {
    return vscode.window.createTextEditorDecorationType({
      color: vscode.workspace.getConfiguration("cppRecolored").get("typeColor"),
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });
  }

  updateDecorationType() {
    this.file.clearHighlights(this.decoration);
    this.decoration = this.decorationType();
  }

  update(ignoreCache: boolean) {
    if (
      vscode.window.activeTextEditor !== undefined &&
      vscode.workspace.rootPath !== undefined &&
      this.file.correctLanguageId()
    ) {
      var possibleCdbPath =
        vscode.workspace.rootPath +
        "/" +
        vscode.workspace
          .getConfiguration("cppRecolored")
          .get("compilationDatabaseDirectory");
      this.server.request(
        vscode.window.activeTextEditor.document.fileName,
        ignoreCache,
        fs.existsSync(possibleCdbPath + "/compile_commands.json")
          ? possibleCdbPath
          : undefined
      );
    }
  }

  removeFileFromCache(file: vscode.TextDocument) {
    this.file.removeCache(file);
  }
}
