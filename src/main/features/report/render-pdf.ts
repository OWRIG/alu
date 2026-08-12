import { BrowserWindow } from "electron";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function renderReportPdf(input: {
  html: string;
  title: string;
  footerText: string;
}): Promise<Uint8Array> {
  const window = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());

  try {
    const source = input.html.replace(
      "</head>",
      `<meta name="title" content="${escapeHtml(input.title)}" /></head>`,
    );
    await window.loadURL(`data:text/html;base64,${Buffer.from(source).toString("base64")}`);
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    await window.webContents.executeJavaScript("document.fonts.ready.then(() => true)", true);
    return await window.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="box-sizing:border-box;width:100%;padding:0 13mm;color:#71818e;font:8px -apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:space-between"><span>${escapeHtml(input.footerText)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true,
    });
  } finally {
    window.destroy();
  }
}
