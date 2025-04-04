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
    const resultDiv = document.getElementById("result");
    const confidencePercent = (result.confidence * 100).toFixed(1);
    const isBasicFact =
      result.analysis && result.analysis.is_basic_fact === true;
    const verdict = result.isReal
      ? isBasicFact
        ? "TRUE FACT"
        : "REAL NEWS"
      : isBasicFact
      ? "FALSE STATEMENT"
      : "FAKE NEWS";

    // Create a comprehensive report layout
    let html = `
      <div class="result-card ${result.isReal ? "real" : "fake"}">
        <div class="result-header">
          <div class="verdict-container">
            <div class="result-stamp ${
              result.isReal ? "real" : "fake"
            }">${verdict}</div>
            <div class="confidence-meter">
              <span class="confidence-label">Confidence: ${confidencePercent}%</span>
              <div class="confidence-bar">
                <div class="confidence-fill ${
                  result.isReal ? "real" : "fake"
                }" style="width: ${confidencePercent}%"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="report-navigation">
          <button class="report-nav-btn active" data-section="summary">Summary</button>
          <button class="report-nav-btn" data-section="analysis">Analysis</button>
          <button class="report-nav-btn" data-section="evidence">Evidence</button>
          <button class="report-nav-btn" data-section="sources">Sources</button>
        </div>
        
        <div class="report-sections">
          <!-- Summary Section -->
          <div class="report-section active" id="summary-section">
            <div class="summary-container">
              <div class="summary-header">
                <h3>Executive Summary</h3>
                <div class="summary-metrics">
                  <div class="summary-score ${result.isReal ? "real" : "fake"}">
                    <div class="score-circle">
                      <span class="score-value">${confidencePercent}</span>
                      <span class="score-unit">%</span>
                    </div>
                    <span class="score-label">Trust Score</span>
                  </div>
                  <div class="verification-date">
                    <span class="date-label">Verified on</span>
                    <span class="date-value">${new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div class="summary-content">
                <p class="summary-text">
                  ${getSummaryText(result, isBasicFact)}
                </p>
                <div class="recommendation ${result.isReal ? "real" : "fake"}">
                  ${getRecommendationText(result, isBasicFact)}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Analysis Section -->
          <div class="report-section" id="analysis-section">
            <h3>Detailed Analysis</h3>
            <div class="analysis-metrics">
              <div class="metrics-row">
                <div class="metric-column">
                  <div class="metric-visualizations">
                    <div class="donut-chart-container">
                      <canvas id="trust-score-chart" width="200" height="200"></canvas>
                    </div>
                    <div class="bar-chart-container">
                      <canvas id="breakdown-chart" width="400" height="200"></canvas>
                    </div>
                  </div>
                </div>
                <div class="metric-column">
                  <div class="score-breakdown">
                    <h4>Analysis Components</h4>
                    <ul class="breakdown-list">
                      <li class="breakdown-item">
                        <span class="breakdown-label">AI Content Analysis</span>
                        <div class="breakdown-bar">
                          <div class="breakdown-fill" style="width: ${(
                            result.analysis.model_score * 100
                          ).toFixed(1)}%"></div>
                        </div>
                        <span class="breakdown-value">${(
                          result.analysis.model_score * 100
                        ).toFixed(1)}%</span>
                      </li>
                      <li class="breakdown-item">
                        <span class="breakdown-label">Fact Verification</span>
                        <div class="breakdown-bar">
                          <div class="breakdown-fill" style="width: ${(
                            result.analysis.fact_check_score * 100
                          ).toFixed(1)}%"></div>
                        </div>
                        <span class="breakdown-value">${(
                          result.analysis.fact_check_score * 100
                        ).toFixed(1)}%</span>
                      </li>
                      <li class="breakdown-item">
                        <span class="breakdown-label">External Verification</span>
                        <div class="breakdown-bar">
                          <div class="breakdown-fill" style="width: ${(
                            result.analysis.verification_score * 100
                          ).toFixed(1)}%"></div>
                        </div>
                        <span class="breakdown-value">${(
                          result.analysis.verification_score * 100
                        ).toFixed(1)}%</span>
                      </li>
                      ${
                        result.analysis.source_credibility
                          ? `
                      <li class="breakdown-item">
                        <span class="breakdown-label">Source Credibility</span>
                        <div class="breakdown-bar">
                          <div class="breakdown-fill" style="width: ${(
                            result.analysis.source_credibility * 100
                          ).toFixed(1)}%"></div>
                        </div>
                        <span class="breakdown-value">${(
                          result.analysis.source_credibility * 100
                        ).toFixed(1)}%</span>
                      </li>
                      `
                          : ""
                      }
                    </ul>
                  </div>
                  
                  <div class="analysis-explanation">
                    <h4>What This Means</h4>
                    <p>${getAnalysisExplanation(result, isBasicFact)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Evidence Section -->
          <div class="report-section" id="evidence-section">
            <h3>Supporting Evidence</h3>
            <div class="evidence-container">
              ${renderEnhancedEvidence(result, isBasicFact)}
            </div>
          </div>
          
          <!-- Sources Section -->
          <div class="report-section" id="sources-section">
            <h3>Sources & References</h3>
            <div class="sources-container">
              ${renderSourcesInfo(result, isBasicFact)}
            </div>
          </div>
        </div>
      </div>
    `;

    resultDiv.innerHTML = html;

    // Initialize the report navigation
    initReportNavigation();

    // Create the charts after the DOM is updated
    createTrustScoreChart(result);
    createBreakdownChart(result);
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

  // Initialize report navigation
  function initReportNavigation() {
    const navButtons = document.querySelectorAll(".report-nav-btn");
    const reportSections = document.querySelectorAll(".report-section");

    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons and sections
        navButtons.forEach((btn) => btn.classList.remove("active"));
        reportSections.forEach((section) => section.classList.remove("active"));

        // Add active class to clicked button
        button.classList.add("active");

        // Show the corresponding section
        const sectionId = button.getAttribute("data-section") + "-section";
        document.getElementById(sectionId).classList.add("active");
      });
    });
  }

  // Generate summary text based on results
  function getSummaryText(result, isBasicFact) {
    if (isBasicFact) {
      return result.isReal
        ? "Our analysis confirms this is a well-established factual statement that aligns with scientific consensus and verified information."
        : "Our analysis indicates this statement contradicts established scientific knowledge and is generally considered incorrect.";
    }

    if (result.isReal) {
      return "After analyzing multiple factors including content, source credibility, and cross-referencing with fact-checking databases, this content appears to be legitimate and trustworthy.";
    } else {
      return "Our comprehensive analysis has identified significant indicators of misinformation in this content. The combination of content analysis, fact-checking, and source verification suggests this information is not reliable.";
    }
  }

  // Generate recommendation text
  function getRecommendationText(result, isBasicFact) {
    if (isBasicFact) {
      return result.isReal
        ? "This is a verified fact supported by established scientific knowledge."
        : "This statement contradicts scientific consensus and should not be considered factual.";
    }

    if (result.isReal) {
      return "This content appears to be reliable and can be shared with confidence.";
    } else {
      return "Exercise caution with this content as it contains misinformation and should not be shared without verification.";
    }
  }

  // Generate analysis explanation
  function getAnalysisExplanation(result, isBasicFact) {
    if (isBasicFact) {
      return result.isReal
        ? "Our system has identified this as a basic factual statement that is consistently supported by authoritative sources and scientific consensus."
        : "Our system has identified this as a common misconception that contradicts established scientific knowledge and reliable information sources.";
    }

    const highScoreThreshold = 0.7;

    // Check which components have high scores
    const highComponents = [];
    if (result.analysis.model_score > highScoreThreshold)
      highComponents.push("AI content analysis");
    if (result.analysis.fact_check_score > highScoreThreshold)
      highComponents.push("fact verification");
    if (result.analysis.verification_score > highScoreThreshold)
      highComponents.push("external verification");
    if (result.analysis.source_credibility > highScoreThreshold)
      highComponents.push("source credibility");

    if (result.isReal) {
      if (highComponents.length > 0) {
        return `This content scored particularly well in ${highComponents.join(
          ", "
        )}, indicating strong reliability. The analysis suggests the information comes from credible sources and aligns with verified facts.`;
      } else {
        return "While this content passed our verification checks, it did so with moderate confidence. Consider consulting additional sources for complete confirmation.";
      }
    } else {
      return "Our analysis detected patterns common in misleading content. The combination of linguistic markers, fact-checking results, and source verification indicates this information lacks credibility.";
    }
  }

  // Create the trust score donut chart
  function createTrustScoreChart(result) {
    const canvas = document.getElementById("trust-score-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const confidencePercent = (result.confidence * 100).toFixed(1);

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up the chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;

    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fill();

    // Draw progress arc
    const startAngle = -Math.PI / 2; // Start at top
    const endAngle = startAngle + Math.PI * 2 * (confidencePercent / 100);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineTo(centerX, centerY);
    ctx.closePath();

    // Use appropriate color based on result
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    if (result.isReal) {
      gradient.addColorStop(0, "#00ff88");
      gradient.addColorStop(1, "#00ccaa");
    } else {
      gradient.addColorStop(0, "#ff3366");
      gradient.addColorStop(1, "#ff6b6b");
    }

    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw inner circle for donut effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = document.body.classList.contains("light-theme")
      ? "#f5f5f5"
      : "#13132f";
    ctx.fill();

    // Draw text
    ctx.fillStyle = document.body.classList.contains("light-theme")
      ? "#333"
      : "#fff";
    ctx.font = "bold 24px Inter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(confidencePercent + "%", centerX, centerY - 10);

    ctx.font = "14px Inter";
    ctx.fillStyle = document.body.classList.contains("light-theme")
      ? "#666"
      : "#aaa";
    ctx.fillText("Trust Score", centerX, centerY + 15);
  }

  // Create the breakdown bar chart
  function createBreakdownChart(result) {
    const canvas = document.getElementById("breakdown-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Prepare data
    const labels = ["AI Analysis", "Fact Check", "Verification"];
    const data = [
      (result.analysis.model_score * 100).toFixed(1),
      (result.analysis.fact_check_score * 100).toFixed(1),
      (result.analysis.verification_score * 100).toFixed(1),
    ];

    if (result.analysis.source_credibility) {
      labels.push("Source Credibility");
      data.push((result.analysis.source_credibility * 100).toFixed(1));
    }

    // Set up chart dimensions
    const chartLeft = 120; // Space for labels
    const chartRight = canvas.width - 50; // Space for values
    const chartTop = 30;
    const chartBottom = canvas.height - 30;
    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;
    const barHeight = Math.min(30, (chartHeight / labels.length) * 0.7);
    const barSpacing = chartHeight / labels.length;

    // Draw title
    ctx.fillStyle = document.body.classList.contains("light-theme")
      ? "#333"
      : "#fff";
    ctx.font = "bold 16px Inter";
    ctx.textAlign = "center";
    ctx.fillText("Analysis Components", canvas.width / 2, 15);

    // Draw bars
    labels.forEach((label, i) => {
      const barY = chartTop + i * barSpacing + barSpacing / 2 - barHeight / 2;

      // Draw label
      ctx.fillStyle = document.body.classList.contains("light-theme")
        ? "#555"
        : "#ddd";
      ctx.font = "14px Inter";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(label, chartLeft - 10, barY + barHeight / 2);

      // Draw background bar
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(chartLeft, barY, chartWidth, barHeight);

      // Draw value bar
      const gradient = ctx.createLinearGradient(chartLeft, 0, chartRight, 0);
      gradient.addColorStop(0, result.isReal ? "#00ff88" : "#ff3366");
      gradient.addColorStop(1, result.isReal ? "#00ccaa" : "#ff6b6b");

      ctx.fillStyle = gradient;
      ctx.fillRect(chartLeft, barY, chartWidth * (data[i] / 100), barHeight);

      // Draw value text
      ctx.fillStyle = document.body.classList.contains("light-theme")
        ? "#333"
        : "#fff";
      ctx.textAlign = "left";
      ctx.fillText(
        data[i] + "%",
        chartLeft + chartWidth * (data[i] / 100) + 5,
        barY + barHeight / 2
      );
    });
  }

  // Render enhanced evidence with context awareness
  function renderEnhancedEvidence(result, isBasicFact) {
    if (isBasicFact) {
      // For basic facts, show educational resources
      return `
        <div class="evidence-explainer">
          <p>For fundamental facts like this, we've compiled educational resources that provide context and background information.</p>
        </div>
        <div class="evidence-grid">
          <div class="evidence-item">
            <div class="evidence-icon"><i class="fas fa-book"></i></div>
            <div class="evidence-content">
              <h4>Scientific Background</h4>
              <p>${getFactExplanation(result)}</p>
              <a href="https://en.wikipedia.org/wiki/Science" target="_blank" class="evidence-link">Learn more</a>
            </div>
          </div>
          <div class="evidence-item">
            <div class="evidence-icon"><i class="fas fa-graduation-cap"></i></div>
            <div class="evidence-content">
              <h4>Educational Resource</h4>
              <p>Explore comprehensive educational content about this topic from trusted academic sources.</p>
              <a href="https://www.khanacademy.org/" target="_blank" class="evidence-link">View resources</a>
            </div>
          </div>
          <div class="evidence-item">
            <div class="evidence-icon"><i class="fas fa-flask"></i></div>
            <div class="evidence-content">
              <h4>Research Foundation</h4>
              <p>Discover the scientific research and consensus behind this factual information.</p>
              <a href="https://www.nature.com/" target="_blank" class="evidence-link">Explore research</a>
            </div>
          </div>
        </div>
      `;
    }

    // For news articles, show fact checks and similar articles
    if (!result.references) {
      return "<p>No supporting evidence could be found for this content.</p>";
    }

    let html = '<div class="evidence-sections">';

    // Fact checks
    if (
      result.references.fact_check_claims &&
      result.references.fact_check_claims.length > 0
    ) {
      html += `
        <div class="evidence-section">
          <h4>Fact Check Results</h4>
          <div class="evidence-grid">
      `;

      result.references.fact_check_claims.forEach((claim) => {
        html += `
          <div class="evidence-item">
            <div class="evidence-header">
              <h5>${claim.title || "Fact Check"}</h5>
            </div>
            <div class="evidence-content">
              <p>${
                claim.text ||
                "This claim has been fact-checked by a verified organization."
              }</p>
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

    // Similar articles
    if (
      result.references.similar_articles &&
      result.references.similar_articles.length > 0
    ) {
      html += `
        <div class="evidence-section">
          <h4>Related News Articles</h4>
          <div class="evidence-grid">
      `;

      result.references.similar_articles.forEach((article) => {
        html += `
          <div class="evidence-item">
            <div class="evidence-header">
              <h5>${article.title || "Related Article"}</h5>
            </div>
            <div class="evidence-content">
              ${
                article.urlToImage
                  ? `<img src="${article.urlToImage}" class="evidence-image" alt="${article.title}">`
                  : ""
              }
              <p>${
                article.description ||
                "This article contains related information that provides context to the claim."
              }</p>
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

  // Generate fact explanation based on the input text
  function getFactExplanation(result) {
    const inputText = document
      .getElementById("newsInput")
      .value.toLowerCase()
      .trim();

    // Map of fact explanations
    const factExplanations = {
      "sun rises in the east":
        "The Sun appears to rise in the east because Earth rotates from west to east. This is a fundamental astronomical observation that has been documented across human history and is consistent with our understanding of planetary motion.",

      "earth is round":
        "The Earth is approximately spherical (technically an oblate spheroid), which has been confirmed through multiple lines of evidence including ship observations, shadow measurements, circumnavigation, and space photography.",

      "water boils at 100 degrees":
        "Water boils at 100 degrees Celsius (212°F) at standard atmospheric pressure (1 atmosphere). This is a fundamental physical property that has been established through repeated scientific measurement.",

      "earth revolves around the sun":
        "Earth orbits the Sun in a slightly elliptical path, completing one revolution approximately every 365.25 days. This heliocentric model replaced the geocentric model and is supported by extensive astronomical observations.",
    };

    // Try to find a matching explanation
    for (const [key, explanation] of Object.entries(factExplanations)) {
      if (inputText.includes(key)) {
        return explanation;
      }
    }

    // Default explanation if no match found
    return "This represents a well-established fact that has been repeatedly confirmed through scientific research, observation, and testing. Scientific facts are based on empirical evidence and are consistently supported by the scientific community.";
  }

  // Render source information
  function renderSourcesInfo(result, isBasicFact) {
    if (isBasicFact) {
      // For basic facts, show authoritative sources
      return `
        <div class="sources-explainer">
          <p>Verification of basic facts relies on established scientific sources and educational institutions.</p>
        </div>
        <div class="authority-sources">
          <div class="authority-source">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Wikipedia-logo-v2-en.svg/225px-Wikipedia-logo-v2-en.svg.png" class="authority-logo" alt="Wikipedia">
            <div class="authority-content">
              <h4>Wikipedia</h4>
              <p>A free online encyclopedia with articles written collaboratively by volunteers around the world.</p>
              <a href="https://www.wikipedia.org/" target="_blank" class="source-link">Visit source</a>
            </div>
          </div>
          <div class="authority-source">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/National_Geographic_logo.svg/1024px-National_Geographic_logo.svg.png" class="authority-logo" alt="National Geographic">
            <div class="authority-content">
              <h4>National Geographic</h4>
              <p>A global nonprofit organization committed to exploring and protecting our planet.</p>
              <a href="https://www.nationalgeographic.com/" target="_blank" class="source-link">Visit source</a>
            </div>
          </div>
          <div class="authority-source">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/2449px-NASA_logo.svg.png" class="authority-logo" alt="NASA">
            <div class="authority-content">
              <h4>NASA</h4>
              <p>The National Aeronautics and Space Administration is the U.S. government agency responsible for space exploration.</p>
              <a href="https://www.nasa.gov/" target="_blank" class="source-link">Visit source</a>
            </div>
          </div>
        </div>
        <div class="methodology-section">
          <h4>Verification Methodology</h4>
          <p>Basic facts are verified using a combination of scientific consensus, educational resources, and authoritative references. Our system maintains a database of well-established facts against which claims are matched.</p>
        </div>
      `;
    }

    // For news articles, show sources and methodology
    let html = `
      <div class="sources-methodology">
        <div class="methodology-section">
          <h4>How We Verify Content</h4>
          <p>Our verification process involves multiple steps to ensure comprehensive analysis:</p>
          <div class="methodology-steps">
            <div class="methodology-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h5>AI Analysis</h5>
                <p>Advanced machine learning models analyze the content's linguistic patterns, structure, and stylistic elements.</p>
              </div>
            </div>
            <div class="methodology-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h5>Fact Database Check</h5>
                <p>Claims are cross-referenced with fact-checking databases from trusted verification organizations.</p>
              </div>
            </div>
            <div class="methodology-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h5>Source Verification</h5>
                <p>We evaluate the credibility of sources based on their track record, transparency, and reputation.</p>
              </div>
            </div>
            <div class="methodology-step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h5>Cross-Reference Analysis</h5>
                <p>Information is compared with reporting from multiple independent and trusted sources.</p>
              </div>
            </div>
          </div>
        </div>
      `;

    // Add trusted sources if available
    if (result.references && result.references.verification_sources) {
      html += `
        <div class="trusted-sources-section">
          <h4>Trusted Sources Used</h4>
          <p>Our verification relies on these established news organizations and fact-checking services:</p>
          <div class="source-tags">
      `;

      result.references.verification_sources.forEach((source) => {
        html += `<span class="source-tag">${source}</span>`;
      });

      html += `
          </div>
        </div>
      `;
    }

    html += "</div>";
    return html;
  }
});
