import { app, BrowserWindow } from "electron";
import * as path from "path";

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // 수정된 부분
  const indexPath = path.join(__dirname, "..", "src", "index.html");
  console.log("Loading index.html from:", indexPath);
  win.loadFile(indexPath);

  // 개발 도구를 열어서 문제를 더 쉽게 디버그할 수 있습니다.
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
