const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

let targetUrl =
  process.argv[2] || "https://usekreaton.com/client/setup/";
const outputDir = path.join(process.cwd(), "output", "playwright");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function startLocalStaticServer(port = 8146) {
  const root = process.cwd();
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
    let filePath = path.resolve(root, pathname.replace(/^\/+/, "") || "index.html");
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "cache-control": "no-store",
      "content-type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function snapshotPage(page, label) {
  await page.screenshot({
    path: path.join(outputDir, `${label}.png`),
    fullPage: true,
  });

  return page.evaluate(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const visibleText = document.body.innerText.replace(/\s+/g, " ").trim();
    const buttons = Array.from(document.querySelectorAll("button"))
      .filter(isVisible)
      .map((button) => button.innerText.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 20);
    const inputs = Array.from(document.querySelectorAll("input, textarea"))
      .filter(isVisible)
      .map((input) => ({
        tag: input.tagName.toLowerCase(),
        id: input.id || "",
        placeholder: input.getAttribute("placeholder") || "",
        type: input.getAttribute("type") || "",
        disabled: input.disabled,
      }));

    return {
      title: document.title,
      url: window.location.href,
      bodyTextStart: visibleText.slice(0, 800),
      bodyTextLength: visibleText.length,
      buttons,
      inputs,
      hasLyra: /lyra/i.test(visibleText),
      hasGenerateButton: buttons.some((text) => /generate|generar/i.test(text)),
      horizontalOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 4,
      lyraDebug: (() => {
        try {
          return {
            forcedTemplateSelection,
            aiStudioPlan: guidedState?.aiStudioPlan || null,
            designDiagnosis: guidedState?.designStrategy?.diagnosis || null,
            liveSelection: typeof livePreviewTemplateSelection === "function" ? livePreviewTemplateSelection() : null,
            contextText: typeof guidedTemplateContextText === "function" ? guidedTemplateContextText() : "",
            servicesProducts: guidedState?.servicesProducts || [],
          };
        } catch (error) {
          return { error: error.message };
        }
      })(),
    };
  });
}

async function runViewport(browser, label, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const networkEvents = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("requestfailed", (request) => {
    networkEvents.push({
      type: "requestfailed",
      url: request.url(),
      error: request.failure()?.errorText || "",
    });
  });
  page.on("response", async (response) => {
    if (!/intake-session|luma\/chat|website-builder|auth\/me/.test(response.url())) return;
    let body = "";
    try {
      body = (await response.text()).slice(0, 500);
    } catch {
      body = "";
    }
    networkEvents.push({
      type: "response",
      url: response.url(),
      status: response.status(),
      body,
    });
  });

  await page.goto(`${targetUrl}${targetUrl.includes("?") ? "&" : "?"}cb=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForTimeout(3500);

  const state = {
    gate: await snapshotPage(page, `${label}-gate`),
  };

  const emailInput = page.locator("#studioAuthEmail");
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    const email = `pwtest-${Date.now()}@gmail.com`;
    await emailInput.fill(email);
    await Promise.allSettled([
      page.waitForResponse((response) => response.url().includes("/api/client/intake-session"), {
        timeout: 30000,
      }),
      page.locator("#studioEmailAuthForm button[type='submit']").click(),
    ]);
    await page.waitForFunction(
      () => !document.body.classList.contains("client-auth-required"),
      { timeout: 15000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);
    state.afterLogin = await snapshotPage(page, `${label}-after-login`);

    const guidedReply = page.locator("#guidedReply");
    if (await guidedReply.isVisible({ timeout: 5000 }).catch(() => false)) {
      await guidedReply.fill(
        "Quiero una tienda online tipo marketplace para bisuteria artesanal, accesorios hechos a mano y regalos personalizados. Necesito vender online y aceptar pedidos."
      );
      await page.locator("#guidedSendButton").click();
      await page.waitForTimeout(5000);
      state.afterFirstAnswer = await snapshotPage(page, `${label}-after-first-answer`);
    }
  }

  state.consoleErrors = consoleErrors.slice(0, 20);
  state.networkEvents = networkEvents.slice(0, 30);
  await page.close();
  return state;
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  let localServer = null;
  if (targetUrl === "--local" || targetUrl === "local") {
    const port = Number(process.env.SMOKE_PORT || 8146);
    localServer = await startLocalStaticServer(port);
    targetUrl = `http://127.0.0.1:${port}/client/setup/`;
  }

  const browser = await chromium.launch({ headless: true });
  const results = {
    targetUrl,
    checkedAt: new Date().toISOString(),
    desktop: await runViewport(browser, "live-client-setup-desktop", {
      width: 1440,
      height: 1000,
    }),
    mobile: await runViewport(browser, "live-client-setup-mobile", {
      width: 390,
      height: 844,
    }),
  };

  await browser.close();
  if (localServer) await new Promise((resolve) => localServer.close(resolve));

  const reportPath = path.join(outputDir, "live-client-setup-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
