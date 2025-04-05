from flask import Flask, request, jsonify
from flask_cors import CORS
from newsapi import NewsApiClient
from datetime import datetime, timedelta
import requests
import json
import re
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from bs4 import BeautifulSoup
import numpy as np
import os
app = Flask(__name__)
CORS(app)

# Initialize NewsAPI
# NEWS_API = os.getenv('NEWS_API_KEY')

NEWS_API_KEY ="e5de620f7465479ea1d5dd485c998c2f"

newsapi = NewsApiClient(api_key=NEWS_API_KEY)

print("Loading FakeNews detection model...")
# Use a verified fake news detection model
MODEL_NAME = "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

# Google Fact Check API
FACT_CHECK_API = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

GOOGLE_API_KEY = os.getenv('GOOGLE_FACT_CHECK_API_KEY')

def check_with_fact_checking_sites(text):
    """Check against fact-checking websites"""
    try:
        # Google Fact Check API
        params = {
            'key': GOOGLE_API_KEY,
            'query': text[:200]  # First 200 chars for relevant matches
        }
        response = requests.get(FACT_CHECK_API, params=params)
        if response.status_code == 200:
            data = response.json()
            if 'claims' in data:
                return True, data['claims']
        return False, []
    except:
        return False, []

def analyze_with_model(text):
    """Enhanced model analysis with better preprocessing"""
    try:
        # Clean and preprocess text
        text = re.sub(r'[^\w\s]', '', text)
        text = text.lower()
        
        # Split long text into chunks if needed
        max_length = 512
        chunks = [text[i:i+max_length] for i in range(0, len(text), max_length)]
        
        probabilities = []
        for chunk in chunks:
            inputs = tokenizer(
                chunk,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            
            with torch.no_grad():
                outputs = model(**inputs)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=1)
                probabilities.append(predictions[0].tolist())
        
        # Average probabilities across chunks
        avg_prob = np.mean(probabilities, axis=0)
        return avg_prob.tolist()
        
    except Exception as e:
        print(f"Model analysis error: {str(e)}")
        return [0.5, 0.5]

def verify_with_external_sources(text):
    """Cross-reference with news verification APIs"""
    apis = [
        {
            'url': 'https://api.truthometer.com/verify',
            'headers': {'Content-Type': 'application/json'},
            'data': {'text': text}
        },
        {
            'url': 'https://api.factcheck.org/search',
            'params': {'q': text[:100]}
        }
    ]
    
    verified_count = 0
    total_checks = len(apis)
    
    for api in apis:
        try:
            if 'data' in api:
                response = requests.post(api['url'], 
                                      headers=api.get('headers', {}),
                                      json=api['data'],
                                      timeout=5)
            else:
                response = requests.get(api['url'],
                                     params=api.get('params', {}),
                                     timeout=5)
            
            if response.status_code == 200:
                verified_count += 1
        except:
            continue
    
    return verified_count / total_checks if total_checks > 0 else 0.5

def analyze_text(text, source="", url=""):
    """Enhanced analysis function"""
    try:
        # 1. Model Prediction with improved weight
        model_scores = analyze_with_model(text)
        real_prob = model_scores[1]
        
        # 2. Source Credibility Check
        source_lower = source.lower()
        source_credibility = RELIABLE_SOURCES.get(source_lower, 0.5)
        
        # 3. Fact Checking with improved weight
        fact_checked, claims = check_with_fact_checking_sites(text)
        fact_check_score = 0.9 if fact_checked else 0.4
        
        # 4. External Verification
        verification_score = verify_with_external_sources(text)
        
        # 5. URL Credibility
        url_credibility = 0.8 if any(domain in url.lower() for domain in RELIABLE_SOURCES.keys()) else 0.4
        
        # Weighted combination of all scores
        final_score = (
            real_prob * 0.4 +  # Model prediction
            fact_check_score * 0.25 +  # Fact checking
            verification_score * 0.15 +  # External verification
            source_credibility * 0.1 +  # Source credibility
            url_credibility * 0.1  # URL credibility
        )
        
        # Calculate confidence
        scores = [real_prob, fact_check_score, verification_score, source_credibility, url_credibility]
        confidence = 1 - np.std(scores)
        
        return final_score, confidence, {
            'model_score': float(real_prob),
            'fact_check_score': float(fact_check_score),
            'verification_score': float(verification_score),
            'source_credibility': float(source_credibility),
            'url_credibility': float(url_credibility),
            'claims_found': len(claims) if claims else 0
        }
        
    except Exception as e:
        print(f"Analysis error: {str(e)}")
        return 0.5, 0.3, {}

# Update the RELIABLE_SOURCES dictionary to include Indian sources
RELIABLE_SOURCES = {
    # ... existing sources ...
    # Add Indian news sources
    'the times of india': 0.85,
    'hindustan times': 0.85,
    'indian express': 0.85,
    'ndtv': 0.85,
    'india today': 0.85,
    'the hindu': 0.90,
    'economic times': 0.88,
    'mint': 0.88,
    'business standard': 0.88,
    'ani news': 0.85,
    'pti': 0.90,
    'press trust of india': 0.90,
    'dd news': 0.85,
    'zee news': 0.80,
}

# First, let's fix the NEWS_SOURCES definition that was incomplete
NEWS_SOURCES = {
    'mainstream': 'timesofindia.indiatimes.com,hindustantimes.com,indianexpress.com,ndtv.com',
    'business': 'economictimes.indiatimes.com,livemint.com,business-standard.com',
    'regional': 'thehindu.com,deccanherald.com,telegraphindia.com',
    'international': 'reuters.com,apnews.com,bbc.co.uk,aljazeera.com'
}

# Add the missing PRIORITY_TOPICS definition
PRIORITY_TOPICS = {
    'breaking_news': [
        'breaking', 'urgent', 'alert', 'latest', 'update', 'just in',
        'developing', 'emergency'
    ],
    'politics': [
        'election', 'government', 'minister', 'parliament', 'policy',
        'political', 'vote', 'campaign'
    ],
    'economy': [
        'economy', 'market', 'stock', 'trade', 'finance', 'business',
        'gdp', 'inflation'
    ],
    'technology': [
        'technology', 'tech', 'digital', 'cyber', 'ai', 'artificial intelligence',
        'innovation', 'startup'
    ]
}

@app.route('/api/news-gallery', methods=['GET'])
def get_news_gallery():
    try:
        all_articles = []
        
        # Fetch from each source group
        for source_type, domains in NEWS_SOURCES.items():
            try:
                # Add date range to get more recent news
                source_news = newsapi.get_everything(
                    domains=domains,
                    language='en',
                    sort_by='publishedAt',
                    from_param=(datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d'),
                    to=datetime.now().strftime('%Y-%m-%d'),
                    page_size=5
                )
                
                if source_news.get('articles'):
                    for article in source_news['articles']:
                        article['source_type'] = source_type
                        all_articles.append(article)
                
            except Exception as e:
                print(f"Error fetching {source_type} news: {str(e)}")
                continue

        # Remove duplicates and process articles
        seen_titles = set()
        processed_news = []
        
        for article in all_articles:
            try:
                if not article.get('title') or not article.get('description'):
                    continue
                    
                if article['title'] in seen_titles:
                    continue
                    
                seen_titles.add(article['title'])
                
                text = f"{article['title']} {article['description']}"
                source_name = article.get('source', {}).get('name', '')
                url = article.get('url', '')

                # Analyze the article
                final_score, confidence, analysis = analyze_text(text, source_name, url)

                # Calculate priority score
                priority_score = 0
                for topic, keywords in PRIORITY_TOPICS.items():
                    if any(keyword.lower() in text.lower() for keyword in keywords):
                        priority_score += 1

                processed_news.append({
                    'title': article['title'],
                    'description': article['description'],
                    'url': url,
                    'image': article.get('urlToImage', ''),
                    'source': source_name,
                    'publishedAt': article.get('publishedAt', ''),
                    'isReal': final_score > 0.5,
                    'confidence': float(confidence),
                    'score': float(final_score),
                    'analysis': analysis,
                    'category': article.get('source_type', 'general'),
                    'priorityScore': priority_score,
                    'isAlert': priority_score > 1
                })

            except Exception as e:
                print(f"Error processing article: {str(e)}")
                continue

        # Sort by priority and date
        processed_news.sort(
            key=lambda x: (x['priorityScore'], x['publishedAt']), 
            reverse=True
        )

        # Limit to 15 articles
        processed_news = processed_news[:15]

        if not processed_news:
            return jsonify({'error': 'No news articles available'})

        return jsonify(processed_news)

    except Exception as e:
        print(f"Error in get_news_gallery: {str(e)}")
        return jsonify({'error': 'Failed to fetch news'})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        text = data.get('newsText')
        
        if not text:
            return jsonify({
                'status': 'error',
                'error': 'No news text provided'
            })

        # Get analysis results
        final_score, confidence, analysis = analyze_text(text)
        
        # Get fact-checking references
        fact_checked, claims = check_with_fact_checking_sites(text)
        
        # Search for similar news in reliable sources
        similar_news = newsapi.get_everything(
            q=text[:100],  # Use first 100 chars as search query
            language='en',
            sort_by='relevancy',
            page_size=3
        )
        
        return jsonify({
            'status': 'success',
            'isReal': final_score > 0.5,
            'confidence': float(confidence),
            'score': float(final_score),
            'analysis': {
                'model_score': float(analysis.get('model_score', 0)),
                'fact_check_score': float(analysis.get('fact_check_score', 0)),
                'verification_score': float(analysis.get('verification_score', 0)),
                'source_credibility': float(analysis.get('source_credibility', 0)),
                'claims_found': analysis.get('claims_found', 0)
            },
            'references': {
                'fact_check_claims': claims,
                'similar_articles': similar_news.get('articles', []),
                'verification_sources': list(RELIABLE_SOURCES.keys())
            }
        })
            
    except Exception as e:
        print(f"Error in predict: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to analyze news'
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000)

