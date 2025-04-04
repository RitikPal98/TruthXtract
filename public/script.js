document.addEventListener("DOMContentLoaded", () => {
  const verifyBtn = document.getElementById("verifyBtn");
  const newsInput = document.getElementById("newsInput");
  const resultDiv = document.getElementById("result");
  const newsGallery = document.getElementById("newsGallery");
  const refreshGalleryBtn = document.getElementById("refreshGallery");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const verifyLink = document.getElementById("verifyLink");
  const galleryLink = document.getElementById("galleryLink");

  // Add theme toggle button to the header
  const header = document.querySelector("header");
  const themeToggle = document.createElement("button");
  themeToggle.id = "themeToggle";
  themeToggle.className = "theme-toggle";
  themeToggle.innerHTML = `
    <span class="theme-icon light-icon">☀️</span>
    <span class="theme-icon dark-icon">🌙</span>
  `;
  header.appendChild(themeToggle);

  // Theme handling
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = localStorage.getItem("theme");

  // Set initial theme
  if (currentTheme === "light") {
    document.body.classList.add("light-theme");
  } else if (currentTheme === "dark" || prefersDarkScheme.matches) {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.add("dark-theme"); // Default to dark theme
  }

  // Update theme toggle button appearance
  updateThemeToggle();

  // Theme toggle event handler
  themeToggle.addEventListener("click", () => {
    if (document.body.classList.contains("light-theme")) {
      document.body.classList.replace("light-theme", "dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.replace("dark-theme", "light-theme");
      localStorage.setItem("theme", "light");
    }
    updateThemeToggle();
  });

  function updateThemeToggle() {
    if (document.body.classList.contains("light-theme")) {
      themeToggle.classList.add("light-active");
      themeToggle.classList.remove("dark-active");
    } else {
      themeToggle.classList.add("dark-active");
      themeToggle.classList.remove("light-active");
    }
  }

  // Set active nav link based on scroll position
  function setActiveNavLink() {
    const scrollPosition = window.scrollY;
    const gallerySection = document.getElementById("gallery");
    const galleryPosition = gallerySection.offsetTop - 100;

    if (scrollPosition < galleryPosition) {
      verifyLink.classList.add("active");
      galleryLink.classList.remove("active");
    } else {
      verifyLink.classList.remove("active");
      galleryLink.classList.add("active");
    }
  }

  // Initialize active nav link and add scroll listener
  setActiveNavLink();
  window.addEventListener("scroll", setActiveNavLink);

  // Add smooth scrolling to nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetElement = document.querySelector(targetId);

      window.scrollTo({
        top: targetElement.offsetTop - 20,
        behavior: "smooth",
      });
    });
  });

  // Verify news
  verifyBtn.addEventListener("click", async () => {
    const newsText = newsInput.value.trim();
    if (!newsText) {
      showError("Please enter some news text to verify");
      return;
    }

    try {
      // Show loading state
      verifyBtn.disabled = true;
      resultDiv.innerHTML =
        '<div class="loading-spinner">Analyzing news...</div>';

      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newsText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === "error") {
        throw new Error(result.error);
      }

      displayResult(result);
    } catch (error) {
      console.error("Error:", error);
      showError("Failed to verify news. Please try again.");
    } finally {
      verifyBtn.disabled = false;
    }
  });

  // Display verification result
  function displayResult(result) {
    const confidencePercent = (result.confidence * 100).toFixed(1);
    const scorePercent = (result.score * 100).toFixed(1);

    let html = `
      <div class="result-card ${result.isReal ? "real" : "fake"}">
        <div class="result-header">
          <div class="result-stamp ${result.isReal ? "real" : "fake"}">
            ${result.isReal ? "REAL" : "FAKE"}
          </div>
          <div class="confidence-text">
            Confidence: ${confidencePercent}%
          </div>
        </div>

        <div class="analysis-details">
          <div class="score-breakdown">
            <h4>Analysis Breakdown:</h4>
            <ul>
              <li>
                <span class="score-label">AI Model Analysis:</span>
                <div class="score-bar">
                  <div class="score-fill" style="width: ${(
                    result.analysis.model_score * 100
                  ).toFixed(1)}%"></div>
                </div>
                <span class="score-value">${(
                  result.analysis.model_score * 100
                ).toFixed(1)}%</span>
              </li>
              <li>
                <span class="score-label">Fact Check Verification:</span>
                <div class="score-bar">
                  <div class="score-fill" style="width: ${(
                    result.analysis.fact_check_score * 100
                  ).toFixed(1)}%"></div>
                </div>
                <span class="score-value">${(
                  result.analysis.fact_check_score * 100
                ).toFixed(1)}%</span>
              </li>
              <li>
                <span class="score-label">Source Credibility:</span>
                <div class="score-bar">
                  <div class="score-fill" style="width: ${(
                    result.analysis.source_credibility * 100
                  ).toFixed(1)}%"></div>
                </div>
                <span class="score-value">${(
                  result.analysis.source_credibility * 100
                ).toFixed(1)}%</span>
              </li>
            </ul>
          </div>

          <div class="references-section">
            <h4>Supporting Evidence:</h4>
            ${renderReferences(result.references)}
          </div>
        </div>
      </div>
    `;

    resultDiv.innerHTML = html;
  }

  function renderReferences(references) {
    let html = '<div class="references-container">';

    // Render fact-check claims
    if (references.fact_check_claims.length > 0) {
      html += '<div class="fact-checks">';
      html += "<h5>Fact Check Results:</h5>";
      html += "<ul>";
      references.fact_check_claims.forEach((claim) => {
        html += `<li><a href="${claim.url}" target="_blank">${claim.title}</a></li>`;
      });
      html += "</ul></div>";
    }

    // Render similar articles
    if (references.similar_articles.length > 0) {
      html += '<div class="similar-articles">';
      html += "<h5>Similar Articles:</h5>";
      html += "<ul>";
      references.similar_articles.forEach((article) => {
        html += `<li><a href="${article.url}" target="_blank">${article.title}</a></li>`;
      });
      html += "</ul></div>";
    }

    html += "</div>";
    return html;
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

    if (news.error) {
      showError(news.error);
      return;
    }

    if (!Array.isArray(news) || news.length === 0) {
      showError("No news articles available");
      return;
    }

    news.forEach((article) => {
      if (!article.title || !article.description) return;

      const card = document.createElement("div");
      card.className = "news-card";

      const confidencePercent = (article.confidence * 100).toFixed(1);
      const sourceType = article.category
        ? `<span class="source-type">${article.category}</span>`
        : "";

      card.innerHTML = `
        <div class="news-image-container">
          <img src="${article.image || "placeholder.jpg"}" 
               alt="${article.title}" 
               class="news-image"
               onerror="this.src='placeholder.jpg'">
          <div class="news-stamp ${article.isReal ? "real" : "fake"}">
            ${article.isReal ? "REAL" : "FAKE"}
          </div>
                ${
                  article.isAlert
                    ? '<div class="alert-badge">PRIORITY</div>'
                    : ""
                }
        </div>
        <div class="news-content">
          <h3 class="news-title">${article.title}</h3>
          <p class="news-description">${article.description}</p>
          <div class="news-meta">
                    ${sourceType}
            <span class="news-source">${article.source}</span>
            <span class="news-date">${new Date(
              article.publishedAt
            ).toLocaleDateString()}</span>
          </div>
          <div class="confidence-bar">
                    <div class="confidence-level ${
                      article.isReal ? "real" : "fake"
                    }" 
                 style="width: ${confidencePercent}%">
            </div>
          </div>
          <div class="confidence-text">
            Confidence: ${confidencePercent}%
          </div>
        </div>
      `;

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
    errorDiv.innerHTML = `
        <div class="error-icon">⚠️</div>
        <div class="error-text">${message}</div>
    `;
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

  // Add type animation to news input placeholder
  const typeEffect = (element, text, speed) => {
    let i = 0;
    element.placeholder = "";

    const typeWriter = () => {
      if (i < text.length) {
        element.placeholder += text.charAt(i);
        i++;
        setTimeout(typeWriter, speed);
      }
    };

    typeWriter();
  };

  // Start typing effect with delay
  setTimeout(() => {
    typeEffect(
      newsInput,
      "Paste your news article here to verify its authenticity...",
      50
    );
  }, 1000);
});
