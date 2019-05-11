"use strict";

import * as vscode from "vscode";
import { Manager } from "./manager";

export var mgr: Manager;
export var delay: NodeJS.Timer;

export async function activate(context: vscode.ExtensionContext) {
  mgr = new Manager(
    vscode.window.activeTextEditor!.document.fileName,
    context.asAbsolutePath("python/recolored/clang.py")
  );

  setTimeout(function() {
    mgr.update(false);
  }, 5000);

  context.subscriptions.push(
    vscode.commands.registerCommand("cppRecolored.update", function() {
      if (mgr.file.correctLanguageId()) {
        mgr.update(false);
      } else {
        vscode.window.showErrorMessage(
          "Can only update highlighting if within C-family file (C, C++, Obj-C, Obj-C++)"
        );
      }
    })
  );

  vscode.workspace.onDidChangeConfiguration(
    function(e) {
      if (e.affectsConfiguration("cppRecolored.typeColor")) {
        mgr.updateDecorationType();
        mgr.update(false);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onWillSaveTextDocument(
    function(e) {
      if (mgr.file.correctLanguageId(e.document.languageId)) {
        mgr.file.clearHighlights(mgr.decoration);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidSaveTextDocument(
    function(e) {
      if (mgr.file.correctLanguageId(e.languageId)) {
        delay = setTimeout(function() {
          mgr.update(false);
        }, 1000);
      }
    },
    null,
    context.subscriptions
  );

  vscode.window.onDidChangeActiveTextEditor(
    function(e) {
      if (vscode.window.activeTextEditor !== undefined) {
        if (mgr.file.correctLanguageId()) {
          mgr.file.highlightFromCache(mgr.decoration);
          mgr.update(false);
        } else {
          mgr.file.clearHighlights(mgr.decoration);
        }
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidCloseTextDocument(
    function(e) {
      if (mgr.file.correctLanguageId(e.languageId)) {
        mgr.removeFileFromCache(e);
      }
    },
    null,
    context.subscriptions
  );
}
