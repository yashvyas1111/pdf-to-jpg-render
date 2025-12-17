import express from "express";
import { createCanvas } from "canvas";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";


import fetch from "node-fetch";
pdfjsLib.GlobalWorkerOptions.workerSrc =
new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();


const app = express();
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("PDF → JPG service running");
});

app.post("/convert", async (req, res) => {
  try {
    const { pdfUrl } = req.body;
    if (!pdfUrl) {
      return res.status(400).json({ error: "pdfUrl is required" });
    }

    // Download PDF
    const pdfBuffer = await fetch(pdfUrl).then(r => r.arrayBuffer());

    // Load PDF
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;

    const images = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d");

      await page.render({ canvasContext: ctx, viewport }).promise;

      const jpgBuffer = canvas.toBuffer("image/jpeg", { quality: 0.9 });
      images.push(jpgBuffer.toString("base64"));
    }

    res.json({
      success: true,
      pages: images.length,
      images
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
