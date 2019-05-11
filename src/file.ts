"use strict";

import * as vscode from "vscode";

export class File {
  public cachedHighlights: {
    [s: string]: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    }[];
  } = {};

  removeCache(file: vscode.TextDocument) {
    if (file.fileName in this.cachedHighlights) {
      delete this.cachedHighlights[file.fileName];
    }
  }

  highlightFromCache(decoration: vscode.TextEditorDecorationType) {
    if (vscode.window.activeTextEditor !== undefined) {
      if (
        vscode.window.activeTextEditor.document.fileName in
        this.cachedHighlights
      ) {
        this.highlight(
          this.cachedHighlights[
            vscode.window.activeTextEditor.document.fileName
          ],
          decoration
        );
      }
    }
  }

  highlight(
    ranges: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    }[],
    decoration: vscode.TextEditorDecorationType
  ) {
    var vscodeRanges: vscode.Range[] = [];
    ranges.forEach(function(this: File, range) {
      vscodeRanges.push(
        new vscode.Range(
          range.startLine - 1,
          range.startColumn - 1,
          range.endLine - 1,
          range.endColumn - 1
        )
      );
    });

    if (vscode.window.activeTextEditor) {
      this.cachedHighlights[
        vscode.window.activeTextEditor.document.fileName
      ] = ranges;
      vscode.window.activeTextEditor.setDecorations(decoration, vscodeRanges);
    }
  }

  clearHighlights(decoration: vscode.TextEditorDecorationType) {
    if (vscode.window.activeTextEditor) {
      vscode.window.activeTextEditor.setDecorations(decoration, []);
    }
  }

  correctLanguageId(languageId?: string): boolean {
    if (vscode.window.activeTextEditor !== undefined) {
      var id: string;

      if (languageId !== undefined) {
        id = languageId;
      } else {
        id = vscode.window.activeTextEditor.document.languageId;
      }

      return (
        id === "c" ||
        id === "cpp" ||
        id === "objective-c" ||
        id === "objective-cpp"
      );
    } else {
      return false;
    }
  }

  fullPath(): string {
    if (vscode.window.activeTextEditor !== undefined) {
      return vscode.window.activeTextEditor.document.fileName;
    } else {
      console.error("Invalid text editor");
      return "";
    }
  }
}

export var activeFile: File;
