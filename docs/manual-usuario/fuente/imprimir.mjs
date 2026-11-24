import fs from "node:fs"; import { launch, sleep } from "./capturar/cdp.mjs"; const [,, src, out] = process.argv; const P = await launch(9401);
await P.send("Emulation.clearDeviceMetricsOverride"); await P.send("Page.navigate", { url: "file://" + process.cwd() + "/" + src }); await sleep(1500);
await P.ev(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => console.log("sin imagen", i.src)))); });
const bad = await P.ev(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src)); if (bad.length) console.log("FALTAN", bad);
const r = await P.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, generateDocumentOutline: true, generateTaggedPDF: true, transferMode: "ReturnAsBase64" });
fs.writeFileSync(out, Buffer.from(r.data, "base64")); P.close(); process.exit(0);
