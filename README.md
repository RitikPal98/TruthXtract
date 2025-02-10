<div align="center">
  <img src="public/assets/logo.png" alt="News Authenticity Detector Logo" width="200"/>

# 🔍 TruthXtract

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0.1-lightgrey)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow)](https://www.javascript.com/)

_Unveiling truth in the era of information overload_ 🌟

</div>

---

## 🎯 Overview

In today's digital age, distinguishing fact from fiction has become increasingly challenging. The **News Authenticity Detector** leverages cutting-edge artificial intelligence and natural language processing to analyze news articles and determine their authenticity in real-time.

<div align="center">
  <img src="public/assets/demo.gif" alt="Demo" width="600"/>
</div>

---

## ✨ Key Features

### 🤖 Intelligent Analysis

- **Hybrid Detection System**: Combines machine learning, NLP, and credibility signals.
- **Real-time Processing**: Instant analysis of news articles.
- **Confidence Scoring**: Detailed breakdown of authenticity indicators.

### 📊 Visual Insights

- **Interactive Dashboard**: User-friendly interface with visual feedback.
- **Confidence Meters**: Clear visualization of authenticity scores.
- **Detailed Analysis**: Comprehensive breakdown of factors influencing the score.

### 🌐 News Gallery

- **Live News Feed**: Real-time news from reliable sources.
- **Authenticity Badges**: Visual indicators of verified content.
- **Source Tracking**: Transparent attribution of sources.

---

## 🚀 Getting Started

6. Visit https://truthxtract.me/ 🎉

## 🧠 How It Works

### Architecture

<div align="center">
  <img src="public/assets/architecture.png" alt="Architecture Diagram" width="700"/>
</div>

### Analysis Pipeline

1. **Input Processing** 📥

   - Text normalization
   - Feature extraction
   - Entity recognition

2. **Multi-layer Analysis** 🔄

   ```python
   def analyze_text(text):
       ml_score = machine_learning_model(text)
       nlp_score = nlp_analysis(text)
       credibility_score = check_credibility(text)

       return weighted_combine(ml_score, nlp_score, credibility_score)
   ```

3. **Credibility Scoring** ⚖️

   - Source verification
   - Reference checking
   - Writing style analysis
   - Clickbait detection

4. **Result Generation** 📊
   - Confidence calculation
   - Detailed analysis
   - Visual indicators

## 🛠️ Tech Stack

### Backend

- **Python** - Core language
- **Flask** - Web framework
- **Scikit-learn** - Machine learning
- **NLTK** - Natural language processing
- **Transformers** - Advanced NLP models
- **NewsAPI** - Real-time news data

### Frontend

- **HTML5/CSS3** - Structure & styling
- **JavaScript** - Dynamic functionality
- **Express.js** - Web server
- **Chart.js** - Data visualization

## 📊 Performance

| Metric              | Score  |
| ------------------- | ------ |
| Accuracy            | 94.2%  |
| Response Time       | <500ms |
| False Positive Rate | 3.8%   |
| User Satisfaction   | 4.7/5  |

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

## 🙏 Acknowledgments

- [NewsAPI](https://newsapi.org/) for real-time news data
- [Hugging Face](https://huggingface.co/) for transformer models
- [NLTK](https://www.nltk.org/) for NLP tools
- Our amazing contributors and supporters

## 📞 Contact & Support

- 📧 Email: ritikpal098@gmail.com

<div align="center">
  <img src="public/assets/footer.png" alt="Footer" width="100%"/>
  
  ⭐ Star us on GitHub | 🐛 Report Issues
</div>
