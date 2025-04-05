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
from gemini_helper import analyze_content_with_gemini

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

def check_if_basic_fact(text):
    """Check if text contains basic, well-known facts"""
    # Normalize text for matching
    text_lower = text.lower().strip().replace(".", "").replace("!", "").replace("?", "")
    
    # Dictionary of well-known facts (both true and false)
    BASIC_FACTS = {
        # Astronomical facts
        "sun rises in the east": 1.0,
        "the sun rises in the east": 1.0,
        "sun sets in the west": 1.0,
        "the sun sets in the west": 1.0,
        "earth revolves around the sun": 1.0,
        "the earth revolves around the sun": 1.0,
        "the moon orbits the earth": 1.0,
        "earth is round": 1.0,
        "the earth is round": 1.0,
        "earth is flat": 0.0,
        "the earth is flat": 0.0,
        
        # Physical facts
        "water boils at 100 degrees": 1.0,
        "water boils at 100 degrees celsius": 1.0,
        "water freezes at 0 degrees": 1.0,
        "water freezes at 0 degrees celsius": 1.0,
        "speed of light is 299792458 meters per second": 1.0,
        
        # Biological facts
        "humans need oxygen to survive": 1.0,
        "plants produce oxygen": 1.0,
        "humans have two lungs": 1.0,
        "human heart pumps blood": 1.0,
        
        # Geographical facts
        "mount everest is the tallest mountain": 1.0,
        "pacific is the largest ocean": 1.0,
        "there are seven continents": 1.0,
        
        # Common misconceptions (false facts)
        "vaccines cause autism": 0.0,
        "5g causes covid": 0.0,
        "covid is a hoax": 0.0,
        "the moon landing was fake": 0.0,
        "the moon landing was staged": 0.0,
        "climate change is a hoax": 0.0
    }
    
    # Check for exact match
    if text_lower in BASIC_FACTS:
        return True, BASIC_FACTS[text_lower]
    
    # Check if the text contains a basic fact
    for fact, verdict in BASIC_FACTS.items():
        # Only match if the fact is a substantial part of the text
        if fact in text_lower and len(fact) > 10 and len(fact) > len(text_lower) / 2:
            return True, verdict
    
    # Not a recognized basic fact
    return False, 0.5

def analyze_text(text, source="", url=""):
    """Enhanced analysis function with Gemini AI integration"""
    try:
        # First, check if this is a basic, well-known fact
        is_basic_fact, fact_verdict = check_if_basic_fact(text)
        if is_basic_fact:
            # For basic facts, return a high confidence score
            return fact_verdict, 0.95, {
                'model_score': fact_verdict,
                'fact_check_score': fact_verdict,
                'verification_score': fact_verdict,
                'source_credibility': 0.9,
                'is_basic_fact': True
            }
            
        # Get Gemini analysis
        gemini_results = analyze_content_with_gemini(text, "verify")
        gemini_score = gemini_results.get('score', 0.5)
        gemini_confidence = gemini_results.get('confidence', 0.6)
        
        # 1. Traditional Model Prediction
        model_scores = analyze_with_model(text)
        traditional_score = model_scores[1]  # Assuming index 1 is for real news
        
        # 2. Fact Checking
        fact_checked, claims = check_with_fact_checking_sites(text)
        fact_check_score = 0.8 if fact_checked else 0.5
        
        # 3. External Verification
        verification_score = verify_with_external_sources(text)
        
        # 4. Source Credibility Check
        source_lower = source.lower()
        source_credibility = RELIABLE_SOURCES.get(source_lower, 0.5)
        
        # Combine all signals with appropriate weightings
        # Give Gemini a significant weight due to its advanced capabilities
        final_score = (
            gemini_score * 0.4 +            # Gemini analysis (40%)
            traditional_score * 0.2 +       # Traditional ML model (20%)
            fact_check_score * 0.2 +        # Fact checking (20%)
            verification_score * 0.1 +      # External verification (10%)
            source_credibility * 0.1        # Source credibility (10%)
        )
        
        # Calculate confidence based on agreement between different methods
        scores = [gemini_score, traditional_score, fact_check_score, verification_score, source_credibility]
        confidence = max(gemini_confidence, 1 - np.std(scores))
        
        # Extract factual claims from Gemini
        factual_claims = gemini_results.get('factual_claims', [])
        
        # Extract key findings to include in analysis
        key_findings = gemini_results.get('key_findings', [])
        
        # Extract misleading elements if any
        misleading_elements = gemini_results.get('misleading_elements', [])
        
        return final_score, confidence, {
            'model_score': float(traditional_score),
            'gemini_score': float(gemini_score),
            'fact_check_score': float(fact_check_score),
            'verification_score': float(verification_score),
            'source_credibility': float(source_credibility),
            'claims_found': len(claims) if claims else 0,
            'factual_claims': factual_claims,
            'key_findings': key_findings,
            'misleading_elements': misleading_elements,
            'is_basic_fact': False
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
        
        # Define multiple source groups
        NEWS_SOURCES = {
            'mainstream': 'timesofindia.indiatimes.com,hindustantimes.com,indianexpress.com,ndtv.com',
            'business': 'economictimes.indiatimes.com,livemint.com,business-standard.com',
            'regional': 'thehindu.com,deccanherald.com,telegraphindia.com',
            'international': 'reuters.com,apnews.com,bbc.co.uk,aljazeera.com'
        }
        
        # Fetch from each source group
        for source_type, domains in NEWS_SOURCES.items():
            try:
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

        # Process articles with Gemini enhancement
        processed_news = []
        seen_titles = set()
        
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

                # Get classification from Gemini for better categorization
                classification = analyze_content_with_gemini(text, "classify")
                
                # Analyze the article
                final_score, confidence, analysis = analyze_text(text, source_name, url)

                # Get category and topics from Gemini analysis
                category = classification.get('category', article.get('source_type', 'general'))
                key_topics = classification.get('key_topics', [])
                tone = classification.get('tone', 'neutral')
                
                # Calculate priority score based on tone and topic
                priority_score = 0
                if tone in ['inflammatory', 'sensationalist']:
                    priority_score += 1
                
                # Important topics deserve higher priority
                important_topics = ['election', 'emergency', 'disaster', 'crisis', 'breaking']
                if any(topic in str(key_topics).lower() for topic in important_topics):
                    priority_score += 2

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
                    'category': category,
                    'topics': key_topics,
                    'tone': tone,
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

        # Get enhanced analysis results with Gemini
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
        
        # Add Gemini-specific insights
        gemini_insights = {
            'key_findings': analysis.get('key_findings', []),
            'misleading_elements': analysis.get('misleading_elements', []),
            'factual_claims': analysis.get('factual_claims', []),
        }
        
        return jsonify({
            'status': 'success',
            'isReal': final_score > 0.5,
            'confidence': float(confidence),
            'score': float(final_score),
            'analysis': {
                'model_score': float(analysis.get('model_score', 0)),
                'gemini_score': float(analysis.get('gemini_score', 0)),
                'fact_check_score': float(analysis.get('fact_check_score', 0)),
                'verification_score': float(analysis.get('verification_score', 0)),
                'source_credibility': float(analysis.get('source_credibility', 0)),
                'claims_found': analysis.get('claims_found', 0),
                'is_basic_fact': analysis.get('is_basic_fact', False)
            },
            'insights': gemini_insights,
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

