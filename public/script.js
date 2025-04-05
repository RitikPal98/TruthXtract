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
    const verdict = result.isReal ? "REAL" : "FAKE";

    // Create a more detailed analysis report
    let html = `
      <div class="result-card ${result.isReal ? "real" : "fake"}">
        <div class="result-header">
          <div class="result-summary">
            <div class="result-stamp ${result.isReal ? "real" : "fake"}">
              ${verdict}
            </div>
            <div class="confidence-meter">
              <div class="meter-label">Confidence: ${confidencePercent}%</div>
              <div class="meter-bar">
                <div class="meter-fill ${
                  result.isReal ? "real" : "fake"
                }" style="width: ${confidencePercent}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="report-tabs">
          <button class="tab-btn active" data-tab="analysis">Analysis</button>
          <button class="tab-btn" data-tab="evidence">Evidence</button>
          <button class="tab-btn" data-tab="sources">Sources</button>
        </div>

        <div class="report-content">
          <div class="tab-panel active" id="analysis-panel">
            <div class="score-visualization">
              <div class="donut-chart-container">
                <canvas id="scoreChart" width="200" height="200"></canvas>
              </div>
              <div class="score-details">
                <h4>Detailed Analysis</h4>
                <ul class="score-breakdown-list">
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
                  ${
                    result.analysis.verification_score
                      ? `
                  <li>
                    <span class="score-label">External Verification:</span>
                    <div class="score-bar">
                      <div class="score-fill" style="width: ${(
                        result.analysis.verification_score * 100
                      ).toFixed(1)}%"></div>
                    </div>
                    <span class="score-value">${(
                      result.analysis.verification_score * 100
                    ).toFixed(1)}%</span>
                  </li>`
                      : ""
                  }
                </ul>
              </div>
            </div>
            
            <div class="analysis-summary">
              <h4>Summary</h4>
              <p>This content has been analyzed and found to be <strong>${verdict}</strong> with ${confidencePercent}% confidence based on multiple verification methods including AI analysis, fact checking, and source credibility assessment.</p>
              ${
                result.isReal
                  ? `<div class="recommendation real">This content appears to be credible and can be trusted.</div>`
                  : `<div class="recommendation fake">This content contains misinformation and should not be trusted or shared.</div>`
              }
            </div>
          </div>

          <div class="tab-panel" id="evidence-panel">
            <div class="evidence-container">
              ${renderEnhancedEvidence(result.references, newsInput.value)}
            </div>
          </div>

          <div class="tab-panel" id="sources-panel">
            <div class="sources-container">
              ${renderSourcesInfo(result.references)}
            </div>
          </div>
        </div>
      </div>
    `;

    resultDiv.innerHTML = html;

    // Initialize tabs functionality
    initTabs();

    // Create chart after DOM is updated
    createScoreChart(result.analysis);
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

  // Add tab functionality
  function initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Remove active class from all buttons and panels
        tabBtns.forEach((b) => b.classList.remove("active"));
        tabPanels.forEach((p) => p.classList.remove("active"));

        // Add active class to clicked button
        btn.classList.add("active");

        // Show the corresponding panel
        const tabName = btn.getAttribute("data-tab");
        document.getElementById(`${tabName}-panel`).classList.add("active");
      });
    });
  }

  // Create a donut chart for score visualization
  function createScoreChart(analysis) {
    // Create canvas context
    const canvas = document.getElementById("scoreChart");
    const ctx = canvas.getContext("2d");

    // Define data for the chart
    const data = [
      {
        label: "AI Model",
        value: analysis.model_score,
        color: "#4CAF50",
      },
      {
        label: "Fact Check",
        value: analysis.fact_check_score,
        color: "#2196F3",
      },
      {
        label: "Source Credibility",
        value: analysis.source_credibility,
        color: "#9C27B0",
      },
    ];

    if (analysis.verification_score) {
      data.push({
        label: "External Verification",
        value: analysis.verification_score,
        color: "#FF9800",
      });
    }

    // Calculate total for average
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const average = total / data.length;

    // Draw chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.6;

    // Draw segments
    let startAngle = -0.5 * Math.PI; // Start at top

    data.forEach((segment) => {
      const segmentValue = segment.value;
      const endAngle = startAngle + 2 * Math.PI * segmentValue;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = segment.color;
      ctx.fill();

      startAngle = endAngle;
    });

    // Draw center circle with average
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    // Draw text in center
    ctx.fillStyle = "#333333";
    ctx.font = "bold 24px Inter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${(average * 100).toFixed(0)}%`, centerX, centerY);

    // Draw legend
    const legendY = canvas.height - 40;
    const legendSpacing = canvas.width / (data.length + 1);

    data.forEach((segment, index) => {
      const x = (index + 1) * legendSpacing;

      // Draw color box
      ctx.fillStyle = segment.color;
      ctx.fillRect(x - 30, legendY, 10, 10);

      // Draw label
      ctx.fillStyle = "#666666";
      ctx.font = "10px Inter";
      ctx.textAlign = "left";
      ctx.fillText(segment.label, x - 15, legendY + 8);
    });
  }

  // Render enhanced evidence with context matching
  function renderEnhancedEvidence(references, userInput) {
    if (!references) return "<p>No evidence found related to this content.</p>";

    // Extract key phrases from user input
    const userKeywords = extractKeywords(userInput);

    let html = '<div class="evidence-sections">';

    // Render fact check claims with relevance indicators
    if (
      references.fact_check_claims &&
      references.fact_check_claims.length > 0
    ) {
      html += `
        <div class="evidence-section">
          <h4>Fact Check Results</h4>
          <div class="evidence-items">
      `;

      references.fact_check_claims.forEach((claim) => {
        const relevance = calculateRelevance(
          claim.title + (claim.text || ""),
          userKeywords
        );
        const relevanceClass =
          relevance > 0.7
            ? "high-relevance"
            : relevance > 0.4
            ? "medium-relevance"
            : "low-relevance";

        html += `
          <div class="evidence-item ${relevanceClass}">
            <div class="evidence-header">
              <h5>${claim.title}</h5>
              <span class="relevance-badge">${
                relevance > 0.7
                  ? "Highly Relevant"
                  : relevance > 0.4
                  ? "Relevant"
                  : "Somewhat Relevant"
              }</span>
            </div>
            <div class="evidence-body">
              <p>${claim.text || "No detailed information available."}</p>
              <div class="evidence-meta">
                ${
                  claim.publisher
                    ? `<span class="evidence-source">Source: ${claim.publisher.name}</span>`
                    : ""
                }
                ${
                  claim.claimDate
                    ? `<span class="evidence-date">Date: ${new Date(
                        claim.claimDate
                      ).toLocaleDateString()}</span>`
                    : ""
                }
              </div>
              <a href="${
                claim.url
              }" target="_blank" class="evidence-link">View Full Fact Check</a>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // Render similar articles with relevance indicators
    if (references.similar_articles && references.similar_articles.length > 0) {
      html += `
        <div class="evidence-section">
          <h4>Similar News Articles</h4>
          <div class="evidence-items">
      `;

      references.similar_articles.forEach((article) => {
        const articleText = article.title + " " + (article.description || "");
        const relevance = calculateRelevance(articleText, userKeywords);
        const relevanceClass =
          relevance > 0.7
            ? "high-relevance"
            : relevance > 0.4
            ? "medium-relevance"
            : "low-relevance";

        html += `
          <div class="evidence-item ${relevanceClass}">
            <div class="evidence-header">
              <h5>${article.title}</h5>
              <span class="relevance-badge">${
                relevance > 0.7
                  ? "Highly Relevant"
                  : relevance > 0.4
                  ? "Relevant"
                  : "Somewhat Relevant"
              }</span>
            </div>
            <div class="evidence-body">
              ${
                article.urlToImage
                  ? `<img src="${article.urlToImage}" class="evidence-image" alt="${article.title}">`
                  : ""
              }
              <p>${article.description || "No description available."}</p>
              <div class="evidence-meta">
                ${
                  article.source
                    ? `<span class="evidence-source">Source: ${article.source.name}</span>`
                    : ""
                }
                ${
                  article.publishedAt
                    ? `<span class="evidence-date">Date: ${new Date(
                        article.publishedAt
                      ).toLocaleDateString()}</span>`
                    : ""
                }
              </div>
              <a href="${
                article.url
              }" target="_blank" class="evidence-link">Read Full Article</a>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    html += "</div>";
    return html;
  }

  // Render sources information
  function renderSourcesInfo(references) {
    if (!references || !references.verification_sources) {
      return "<p>No source information available.</p>";
    }

    const sources = references.verification_sources;
    let html = `
      <div class="sources-overview">
        <h4>Reliable Sources Used for Verification</h4>
        <p>The analysis is based on data from ${sources.length} trusted news sources and fact-checking organizations.</p>
        
        <div class="sources-grid">
    `;

    // Group sources by category
    const categories = {
      mainstream: [],
      "fact-checkers": [],
      international: [],
      specialized: [],
    };

    // Sort sources into categories (mockup categorization)
    sources.forEach((source) => {
      if (
        source.includes("fact") ||
        source.includes("check") ||
        source.includes("truth")
      ) {
        categories["fact-checkers"].push(source);
      } else if (
        source.includes("times") ||
        source.includes("post") ||
        source.includes("news")
      ) {
        categories["mainstream"].push(source);
      } else if (
        source.includes("bbc") ||
        source.includes("reuters") ||
        source.includes("associated")
      ) {
        categories["international"].push(source);
      } else {
        categories["specialized"].push(source);
      }
    });

    // Render each category
    Object.keys(categories).forEach((category) => {
      if (categories[category].length > 0) {
        html += `
          <div class="source-category">
            <h5>${category.charAt(0).toUpperCase() + category.slice(1)}</h5>
            <div class="source-tags">
              ${categories[category]
                .map(
                  (source) => `
                <div class="source-tag">${source}</div>
              `
                )
                .join("")}
            </div>
          </div>
        `;
      }
    });

    html += `
        </div>
      </div>
      
      <div class="source-methodology">
        <h4>Verification Methodology</h4>
        <p>Our system evaluates news by comparing it against verified reports from trusted sources, checking for consistency with known facts, and analyzing linguistic patterns associated with misinformation.</p>
        
        <div class="methodology-steps">
          <div class="methodology-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h5>Content Analysis</h5>
              <p>AI models analyze text for patterns common in fake news</p>
            </div>
          </div>
          <div class="methodology-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h5>Fact Checking</h5>
              <p>Claims are cross-referenced with fact-checking databases</p>
            </div>
          </div>
          <div class="methodology-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h5>Source Verification</h5>
              <p>Credibility of sources is evaluated based on track record</p>
            </div>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  // Extract keywords from text
  function extractKeywords(text) {
    if (!text) return [];

    // Simple keyword extraction - remove common words and punctuation
    const commonWords = [
      "the",
      "and",
      "a",
      "an",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "is",
      "are",
      "was",
      "were",
    ];
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !commonWords.includes(word));

    // Count word frequency
    const wordCounts = {};
    words.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Sort by frequency and take top keywords
    return Object.keys(wordCounts)
      .sort((a, b) => wordCounts[b] - wordCounts[a])
      .slice(0, 15);
  }

  // Calculate relevance between a text and keywords
  function calculateRelevance(text, keywords) {
    if (!text || !keywords || keywords.length === 0) return 0;

    text = text.toLowerCase();
    let matches = 0;

    keywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        matches++;
      }
    });

    return matches / keywords.length;
  }
});
