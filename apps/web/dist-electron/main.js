import { ipcMain as a, app as n, BrowserWindow as s, globalShortcut as d, shell as f } from "electron";
import l from "path";
import { fileURLToPath as h } from "url";
const p = h(import.meta.url), r = l.dirname(p);
let t = null, e = null;
const c = process.env.NODE_ENV === "development";
function i() {
  t = new s({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      preload: l.join(r, "preload.js")
    }
  }), t.webContents.setWindowOpenHandler(({ url: o }) => (f.openExternal(o), { action: "deny" })), c ? (t.loadURL("http://localhost:5173"), t.webContents.openDevTools()) : t.loadFile(l.join(r, "../dist/index.html")), t.on("closed", () => {
    t = null;
  });
}
function m() {
  if (e) {
    e.focus();
    return;
  }
  e = new s({
    width: 800,
    height: 160,
    frame: !1,
    resizable: !1,
    alwaysOnTop: !0,
    skipTaskbar: !0,
    transparent: !1,
    backgroundColor: "#1f2937",
    titleBarStyle: "hidden",
    show: !1,
    // Don't show until ready
    webPreferences: {
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0,
      preload: l.join(r, "preload.js")
    }
  }), e.center();
  const o = c ? "http://localhost:5173/#/quick-capture" : `file://${l.join(r, "../dist/index.html")}#/quick-capture`;
  e.loadURL(o), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.focus();
  }), e.on("blur", () => {
    e == null || e.close();
  }), e.on("closed", () => {
    e = null, process.platform === "darwin" && n.hide();
  });
}
function u() {
  const o = process.platform === "darwin" ? "Cmd+Shift+C" : "Ctrl+Shift+C";
  d.register(o, () => {
    m();
  }) || console.error("Failed to register global shortcut:", o);
}
a.handle("close-quick-capture", () => {
  e == null || e.close();
});
a.handle("get-platform", () => process.platform);
n.whenReady().then(() => {
  i(), u(), n.on("activate", () => {
    s.getAllWindows().length === 0 && i();
  });
});
n.on("window-all-closed", () => {
  process.platform !== "darwin" && n.quit();
});
n.on("will-quit", () => {
  d.unregisterAll();
});
