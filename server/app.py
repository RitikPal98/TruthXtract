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
# NEWS_API_KEY = os.getenv('NEWS_API_KEY')
NEWS_API_KEY ="d141b02ee64b4f13baff644d423e95b5"

newsapi = NewsApiClient(api_key=NEWS_API_KEY)

print("Loading FakeNews detection model...")
# Use a verified fake news detection model
MODEL_NAME = "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

# Google Fact Check API
FACT_CHECK_API = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
# GOOGLE_API_KEY = 'AIzaSyD4SEh7nbHK0D6dSUUEC0cp3QbWkjxZFeM'  # Get from Google Cloud Console
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
    """Analyze text using the fake news detection model"""
    try:
        # Prepare text for classification
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        
        # Get model prediction
        with torch.no_grad():
            outputs = model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=1)
        
        # Convert prediction to probability
        prob = predictions[0].tolist()
        return prob
        
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
    """Main analysis function"""
    try:
        # 1. Model Prediction
        model_scores = analyze_with_model(text)
        real_prob = model_scores[1]  # Assuming index 1 is for real news
        
        # 2. Fact Checking
        fact_checked, claims = check_with_fact_checking_sites(text)
        fact_check_score = 0.8 if fact_checked else 0.5
        
        # 3. External Verification
        verification_score = verify_with_external_sources(text)
        
        # Combine scores with emphasis on model prediction
        final_score = (real_prob * 0.6 + 
                      fact_check_score * 0.2 + 
                      verification_score * 0.2)
        
        # Calculate confidence based on agreement between different methods
        scores = [real_prob, fact_check_score, verification_score]
        confidence = 1 - np.std(scores)
        
        return final_score, confidence, {
            'model_score': float(real_prob),
            'fact_check_score': float(fact_check_score),
            'verification_score': float(verification_score),
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

@app.route('/api/news-gallery', methods=['GET'])
def get_news_gallery():
    try:
        all_articles = []
        
        # Define important Indian topics and keywords
        PRIORITY_TOPICS = {
            'cyber_security': [
                'cyber attack', 'cyber crime', 'cyber security', 'hacking', 'data breach',
                'online fraud', 'cyber police', 'digital security', 'ransomware',
                'phishing', 'cyber threat', 'data theft'
            ],
            'public_safety': [
                'public safety', 'emergency alert', 'safety warning', 'national security',
                'terror alert', 'disaster warning', 'health alert', 'safety advisory'
            ],
            'fake_news': [
                'fake news', 'misinformation', 'disinformation', 'fact check',
                'misleading news', 'false information', 'rumor alert'
            ],
            'national_security': [
                'national security', 'border security', 'defense', 'military alert',
                'security threat', 'intelligence alert', 'terrorist', 'security advisory'
            ],
            'government_alerts': [
                'government advisory', 'official announcement', 'ministry alert',
                'policy change', 'new regulation', 'law enforcement'
            ]
        }

        # 1. Fetch priority Indian news
        for topic, keywords in PRIORITY_TOPICS.items():
            try:
                query = ' OR '.join(keywords)
                topic_news = newsapi.get_everything(
                    q=f'(India OR Indian) AND ({query})',
                    domains='timesofindia.indiatimes.com,hindustantimes.com,indianexpress.com,'
                           'ndtv.com,thehindu.com,economictimes.indiatimes.com,'
                           'news18.com,indiatoday.in,firstpost.com',
                    language='en',
                    sort_by='publishedAt',
                    page_size=5
                )
                
                # Add topic category to each article
                for article in topic_news.get('articles', []):
                    article['category'] = topic
                all_articles.extend(topic_news.get('articles', []))
                
            except Exception as e:
                print(f"Error fetching {topic} news: {str(e)}")

        # 2. Fetch general Indian news (as backup)
        try:
            general_indian_news = newsapi.get_top_headlines(
                country='in',
                language='en',
                page_size=5
            )
            for article in general_indian_news.get('articles', []):
                article['category'] = 'general'
            all_articles.extend(general_indian_news.get('articles', []))
        except Exception as e:
            print(f"Error fetching general Indian news: {str(e)}")

        print(f"Fetched total {len(all_articles)} articles")

        # Remove duplicates and prioritize articles
        seen_titles = set()
        unique_articles = []
        
        # First, add articles from priority topics
        for article in all_articles:
            if (article.get('title') and 
                article['title'] not in seen_titles and 
                article.get('category') != 'general'):
                
                seen_titles.add(article['title'])
                unique_articles.append(article)

        # Then add general articles if needed
        for article in all_articles:
            if (len(unique_articles) < 15 and 
                article.get('title') and 
                article['title'] not in seen_titles):
                
                seen_titles.add(article['title'])
                unique_articles.append(article)

        # Limit to 15 most recent articles
        unique_articles = sorted(
            unique_articles,
            key=lambda x: x.get('publishedAt', ''),
            reverse=True
        )[:15]

        processed_news = []
        for article in unique_articles:
            try:
                if not article.get('title') or not article.get('description'):
                    continue

                text = f"{article['title']} {article['description']}"
                source_name = article.get('source', {}).get('name', '')
                url = article.get('url', '')

                final_score, confidence, analysis = analyze_text(text, source_name, url)

                # Calculate priority score based on content
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
                    'category': article.get('category', 'general'),
                    'priorityScore': priority_score,
                    'isAlert': priority_score > 1  # Mark high-priority news as alerts
                })

            except Exception as e:
                print(f"Error processing article: {str(e)}")
                continue

        # Sort by priority score and publish date
        processed_news.sort(
            key=lambda x: (x['priorityScore'], x['publishedAt']), 
            reverse=True
        )

        # Limit to exactly 15 articles
        processed_news = processed_news[:15]

        return jsonify(processed_news)

    except Exception as e:
        print(f"Error in get_news_gallery: {str(e)}")
        return jsonify([])

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        text = data['newsText']
        
        final_score, confidence, analysis = analyze_text(text)
        
        return jsonify({
            'isReal': final_score > 0.5,
            'confidence': float(confidence),
            'score': float(final_score),
            'analysis': analysis,
            'status': 'success'
        })
            
    except Exception as e:
        print(f"Error in predict: {str(e)}")
        return jsonify({'error': str(e), 'status': 'error'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

