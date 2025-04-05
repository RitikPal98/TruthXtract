// Initialize Express
const express = require("express");
const app = express();
const path = require("path");

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoint for news verification
app.post("/api/verify", async (req, res) => {
  try {
    const { newsText } = req.body;

    // Call Flask backend
    const response = await fetch("http://localhost:5000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newsText }),
    });

    const result = await response.json();

    if (result.status === "success") {
      res.json({
        isReal: result.isReal,
        confidence: result.confidence,
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    res.status(500).json({ error: "Error analyzing news" });
  }
});

// API endpoint for news gallery
app.get("/api/news-gallery", async (req, res) => {
  try {
    // TODO: Implement news scraping
    const news = await scrapeNews();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: "Error fetching news" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
