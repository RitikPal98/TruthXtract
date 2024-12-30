document.addEventListener("DOMContentLoaded", () => {
  const verifyBtn = document.getElementById("verifyBtn");
  const newsInput = document.getElementById("newsInput");
  const resultDiv = document.getElementById("result");
  const newsGallery = document.getElementById("newsGallery");
  const refreshGalleryBtn = document.getElementById("refreshGallery");
  const loadingIndicator = document.getElementById("loadingIndicator");

  // Verify news
  verifyBtn.addEventListener("click", async () => {
    const newsText = newsInput.value;
    if (!newsText) return;

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newsText }),
      });

      const result = await response.json();
      displayResult(result);
    } catch (error) {
      console.error("Error:", error);
      showError("Failed to verify news");
    }
  });

  // Display verification result
  function displayResult(result) {
    resultDiv.innerHTML = "";

    // Create stamp
    const stamp = document.createElement("div");
    stamp.className = `result-stamp ${result.isReal ? "real" : "fake"}`;
    stamp.textContent = result.isReal ? "REAL" : "FAKE";

    // Create confidence text
    const confidenceText = document.createElement("div");
    confidenceText.className = "result-confidence";
    confidenceText.textContent = `Confidence Level`;

    // Create confidence bar
    const barContainer = document.createElement("div");
    barContainer.className = "result-bar";

    const barFill = document.createElement("div");
    barFill.className = `result-bar-fill ${result.isReal ? "real" : "fake"}`;
    barFill.style.width = "0%";

    barContainer.appendChild(barFill);

    // Create confidence percentage
    const confidencePercent = document.createElement("div");
    confidencePercent.className = "result-confidence";
    confidencePercent.textContent = `${(result.confidence * 100).toFixed(1)}%`;

    // Append all elements
    resultDiv.appendChild(stamp);
    resultDiv.appendChild(confidenceText);
    resultDiv.appendChild(barContainer);
    resultDiv.appendChild(confidencePercent);

    // Animate the confidence bar
    setTimeout(() => {
      barFill.style.width = `${result.confidence * 100}%`;
    }, 100);
  }

  // Load news gallery with cache busting
  async function loadGallery() {
    try {
      loadingIndicator.classList.remove("hidden");
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(
        `http://127.0.0.1:5000/api/news-gallery?t=${timestamp}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const news = await response.json();

      if (news.error) {
        throw new Error(news.error);
      }

      displayGallery(news);
    } catch (error) {
      console.error("Error:", error);
      showError("Failed to load news gallery");
    } finally {
      loadingIndicator.classList.add("hidden");
    }
  }

  // Display gallery
  function displayGallery(news) {
    newsGallery.innerHTML = "";

    if (!Array.isArray(news) || news.length === 0) {
      showError("No news articles available");
      return;
    }

    news.forEach((article) => {
      const card = document.createElement("div");
      card.className = "news-card";

      const confidencePercent = (article.confidence * 100).toFixed(1);

      card.innerHTML = `
        <div class="news-image-container">
          <img src="${article.image || "placeholder.jpg"}" 
               alt="${article.title}" 
               class="news-image"
               onerror="this.src='placeholder.jpg'">
          <div class="news-stamp ${article.isReal ? "real" : "fake"}">
            ${article.isReal ? "REAL" : "FAKE"}
          </div>
        </div>
        <div class="news-content">
          <h3 class="news-title">${article.title}</h3>
          <p class="news-description">${article.description}</p>
          <div class="news-meta">
            <span class="news-source">${article.source}</span>
            <span class="news-date">${new Date(
              article.publishedAt
            ).toLocaleDateString()}</span>
          </div>
          <div class="confidence-bar">
            <div class="confidence-level ${article.isReal ? "real" : "fake"}" 
                 style="width: ${confidencePercent}%">
            </div>
          </div>
          <div class="confidence-text">
            Confidence: ${confidencePercent}%
          </div>
        </div>
      `;

      // Make the entire card clickable
      card.addEventListener("click", () => {
        window.open(article.url, "_blank");
      });

      newsGallery.appendChild(card);
    });
  }

  // Show error message
  function showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    newsGallery.innerHTML = "";
    newsGallery.appendChild(errorDiv);
  }

  // Refresh gallery button with debounce
  let isRefreshing = false;
  refreshGalleryBtn.addEventListener("click", async () => {
    if (isRefreshing) return;
    isRefreshing = true;
    refreshGalleryBtn.disabled = true;

    try {
      await loadGallery();
    } finally {
      isRefreshing = false;
      refreshGalleryBtn.disabled = false;
    }
  });

  // Load gallery on page load
  loadGallery();

  // Auto refresh every 5 minutes
  setInterval(loadGallery, 300000);
});
