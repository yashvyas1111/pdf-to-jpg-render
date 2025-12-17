import express from "express";
import { createCanvas } from "canvas";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import fetch from "node-fetch";

// 🔥 CRITICAL FIX: disable pdfjs worker completely for Node
pdfjsLib.GlobalWorkerOptions.workerSrc = null;

const app = express();
app.use(express.json({ limit: "50mb" }));

// Health check
app.get("/", (req, res) => {
  res.send("PDF → JPG service running");
});

app.post("/convert", async (req, res) => {
  try {
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({ error: "pdfUrl is required" });
    }

    // 1️⃣ Download PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch PDF");
    }

    const pdfBuffer = await response.arrayBuffer();

    // 2️⃣ Load PDF (NODE MODE)
    const pdf = await pdfjsLib.getDocument({
      data: pdfBuffer,
      disableWorker: true // 🔥 MUST
    }).promise;

    const images = [];

    // 3️⃣ Convert each page to JPG
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      const viewport = page.getViewport({ scale: 2 }); // DPI control here
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d");

      await page.render({
        canvasContext: ctx,
        viewport
      }).promise;

      const jpgBuffer = canvas.toBuffer("image/jpeg", { quality: 0.9 });

      images.push({
        page: pageNum,
        base64: jpgBuffer.toString("base64")
      });
    }

    res.json({
      success: true,
      totalPages: pdf.numPages,
      images
    });

  } catch (err) {
    console.error("PDF CONVERT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
