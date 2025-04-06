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
import concurrent.futures
from functools import lru_cache
import threading

app = Flask(__name__)
CORS(app)

# Initialize NewsAPI
# NEWS_API = os.getenv('NEWS_API_KEY')

# NEWS_API_KEY ="e5de620f7465479ea1d5dd485c998c2f"
NEWS_API_KEY ="533e225761e549e39d4894451aa86fd4"

newsapi = NewsApiClient(api_key=NEWS_API_KEY)

print("Loading FakeNews detection model...")
# Use a verified fake news detection model
MODEL_NAME = "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

# Cache for news articles
NEWS_CACHE = {
    'data': [],
    'last_updated': None,
    'lock': threading.Lock()
}

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

@lru_cache(maxsize=100)
def analyze_with_model_cached(text):
    """Cached version of model analysis"""
    return analyze_with_model(text)

@lru_cache(maxsize=100)
def check_with_fact_checking_sites_cached(text_prefix):
    """Cached version of fact checking"""
    return check_with_fact_checking_sites(text_prefix)

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
        model_scores = analyze_with_model_cached(text)
        traditional_score = model_scores[1]  # Assuming index 1 is for real news
        
        # 2. Fact Checking - use only first 200 chars for caching
        text_prefix = text[:200]
        fact_checked, claims = check_with_fact_checking_sites_cached(text_prefix)
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

def fetch_news_from_source(source_type, domains):
    """Fetch news from a specific source group"""
    try:
        source_news = newsapi.get_everything(
            domains=domains,
            language='en',
            sort_by='publishedAt',
            from_param=(datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d'),
            to=datetime.now().strftime('%Y-%m-%d'),
            page_size=5
        )
        
        articles = []
        if source_news.get('articles'):
            for article in source_news['articles']:
                article['source_type'] = source_type
                articles.append(article)
        
        return articles
    except Exception as e:
        print(f"Error fetching {source_type} news: {str(e)}")
        return []

@lru_cache(maxsize=100)
def process_article(article_title, article_description, source_name, article_url, article_image, article_date):
    """Process a single article with caching based on the title"""
    try:
        if not article_title or not article_description:
            return None
            
        text = f"{article_title} {article_description}"
        
        # Skip full Gemini analysis for very common sources to improve performance
        common_sources = ['The Times of India', 'Hindustan Times', 'NDTV', 'BBC News', 'Reuters']
        is_common_source = any(src.lower() in source_name.lower() for src in common_sources)
        
        # Fast classification without Gemini for common sources
        if is_common_source:
            # Simple category detection based on keywords
            category = 'General'
            tone = 'neutral'
            
            for keyword, categories in {
                'business|economy|market|stock|finance': 'Business',
                'tech|technology|digital|cyber|AI|software': 'Technology',
                'politics|government|minister|election|parliament': 'Politics',
                'sport|cricket|football|tennis|match': 'Sports',
                'health|covid|virus|disease|medical': 'Health',
                'entertainment|movie|film|actor|cinema': 'Entertainment'
            }.items():
                for k in keyword.split('|'):
                    if k.lower() in text.lower():
                        category = categories
                        break
            
            # Simple tone detection
            if any(word in text.lower() for word in ['breaking', 'exclusive', 'shocking', 'urgent']):
                tone = 'sensationalist'
            
            # For common sources, use a simpler model for faster processing
            final_score, confidence, analysis = 0.7, 0.6, {
                'model_score': 0.7,
                'fact_check_score': 0.7,
                'verification_score': 0.7,
                'source_credibility': 0.8
            }
            
            # Calculate priority based on title keywords
            priority_score = 0
            for keyword in ['urgent', 'breaking', 'exclusive', 'alert']:
                if keyword in article_title.lower():
                    priority_score += 1
        else:
            # Only use Gemini for less common sources or more complex analysis
            try:
                # Get lightweight classification for better categorization
                classification = analyze_content_with_gemini(text[:200], "classify")  # Only use first 200 chars
                category = classification.get('category', 'General')
                tone = classification.get('tone', 'neutral')
                
                # Get analysis with standard model
                final_score, confidence, analysis = analyze_text(text, source_name, article_url)
                
                # Calculate priority based on tone and category
                priority_score = 0
                if tone in ['inflammatory', 'sensationalist']:
                    priority_score += 1
                
                # Important topics deserve higher priority
                important_categories = ['Politics', 'Breaking News', 'Crisis']
                if category in important_categories:
                    priority_score += 1
            except Exception as e:
                print(f"Error in Gemini analysis, using fallback: {str(e)}")
                # Fallback values if Gemini fails
                category = 'General'
                tone = 'neutral'
                final_score, confidence = 0.6, 0.5
                analysis = {}
                priority_score = 0
        
        return {
            'title': article_title,
            'description': article_description,
            'url': article_url,
            'image': article_image,
            'source': source_name,
            'publishedAt': article_date,
            'isReal': final_score > 0.5,
            'confidence': float(confidence if confidence is not None else 0.5),
            'score': float(final_score if final_score is not None else 0.5),
            'analysis': analysis,
            'category': category,
            'tone': tone,
            'priorityScore': priority_score,
            'isAlert': priority_score > 1
        }
    except Exception as e:
        print(f"Error processing article: {str(e)}")
        # Return a simplified result in case of error
        return {
            'title': article_title,
            'description': article_description,
            'url': article_url,
            'image': article_image,
            'source': source_name,
            'publishedAt': article_date,
            'isReal': True,
            'confidence': 0.5,
            'score': 0.5,
            'category': 'General',
            'priorityScore': 0,
            'isAlert': False
        }

def refresh_news_cache():
    """Refresh the news cache in the background"""
    try:
        with NEWS_CACHE['lock']:
            if NEWS_CACHE['last_updated'] and (datetime.now() - NEWS_CACHE['last_updated']).total_seconds() < 3600:
                # Cache is still fresh (less than 1 hour old)
                return
        
        all_articles = []
        
        # Fetch from each source group in parallel with larger batch size
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            future_to_source = {
                executor.submit(fetch_news_from_source, source_type, domains): source_type
                for source_type, domains in NEWS_SOURCES.items()
            }
            
            for future in concurrent.futures.as_completed(future_to_source):
                articles = future.result()
                all_articles.extend(articles)

        # Filter out duplicate articles and articles without title/description
        filtered_articles = []
        seen_titles = set()
        
        for article in all_articles:
            title = article.get('title', '').strip()
            if not title or title in seen_titles or not article.get('description'):
                continue
            
            seen_titles.add(title)
            filtered_articles.append(article)
        
        # Process articles with optimized batching
        processed_news = []
        batch_size = 10  # Increase batch size for better performance
        
        # Process in larger batches with more workers
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            for i in range(0, len(filtered_articles), batch_size):
                batch = filtered_articles[i:i+batch_size]
                futures = [executor.submit(process_article, article['title'], article['description'], article['source']['name'], article['url'], article['urlToImage'], article['publishedAt']) for article in batch]
                
                for future in concurrent.futures.as_completed(futures):
                    result = future.result()
                    if result:
                        processed_news.append(result)
                        
                        # Update cache in real-time as articles are processed
                        # This ensures users see some results even if full processing is slow
                        if len(processed_news) % 5 == 0:  # Update every 5 articles
                            with NEWS_CACHE['lock']:
                                # Sort by priority and date
                                temp_news = sorted(
                                    processed_news,
                                    key=lambda x: (x.get('priorityScore', 0), x.get('publishedAt', '')), 
                                    reverse=True
                                )
                                NEWS_CACHE['data'] = temp_news
                                NEWS_CACHE['last_updated'] = datetime.now()

        # Final sort and update
        processed_news.sort(
            key=lambda x: (x.get('priorityScore', 0), x.get('publishedAt', '')), 
            reverse=True
        )

        # Get at least 15 articles
        processed_news = processed_news[:20]
        
        # Update cache with the final result
        with NEWS_CACHE['lock']:
            NEWS_CACHE['data'] = processed_news
            NEWS_CACHE['last_updated'] = datetime.now()
            
    except Exception as e:
        print(f"Error refreshing news cache: {str(e)}")
        # Don't update the cache if there was an error
        # This preserves the old cache data

@app.route('/api/news-gallery', methods=['GET'])
def get_news_gallery():
    try:
        # Get query parameters with defaults if they're missing or invalid
        try:
            page = max(1, int(request.args.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
            
        try:
            per_page = max(1, min(20, int(request.args.get('per_page', 10))))  # Changed default from 5 to 10
        except (ValueError, TypeError):
            per_page = 10  # Changed default from 5 to 10
        
        with NEWS_CACHE['lock']:
            cache_data = NEWS_CACHE['data']
            last_updated = NEWS_CACHE['last_updated']
            is_cache_stale = not last_updated or (datetime.now() - last_updated).total_seconds() > 3600
        
        # Start background refresh if cache is stale or empty, but don't wait for it
        if is_cache_stale:
            # Start a background thread to refresh the cache
            refresh_thread = threading.Thread(target=refresh_news_cache)
            refresh_thread.daemon = True
            refresh_thread.start()
        
        # Use cached data with pagination
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        with NEWS_CACHE['lock']:
            paginated_news = NEWS_CACHE['data'][start_idx:end_idx] if NEWS_CACHE['data'] else []
            total_items = len(NEWS_CACHE['data'])
        
        # If we have no data but cache refresh is in progress, return a special message
        if not paginated_news and is_cache_stale:
            return jsonify({
                'data': [],
                'status': 'loading',
                'message': 'News data is being refreshed, please try again in a moment',
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total_items': 0,
                    'total_pages': 1
                }
            })
        
        # If we have no data at all, force a synchronous refresh
        if not paginated_news and not NEWS_CACHE['data']:
            # Create mock data while full analysis runs
            mock_data = create_mock_news_data(per_page)
            
            # Start the real refresh in background
            refresh_thread = threading.Thread(target=refresh_news_cache)
            refresh_thread.daemon = True
            refresh_thread.start()
            
            return jsonify({
                'data': mock_data,
                'status': 'partial',
                'message': 'Displaying preliminary news while analysis completes',
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total_items': len(mock_data),
                    'total_pages': 1
                }
            })

        return jsonify({
            'data': paginated_news,
            'status': 'success',
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_items': total_items,
                'total_pages': max(1, (total_items + per_page - 1) // per_page)
            },
            'cache_status': {
                'last_updated': last_updated.isoformat() if last_updated else None
            }
        })

    except Exception as e:
        print(f"Error in get_news_gallery: {str(e)}")
        return jsonify({
            'data': [],
            'error': f'Failed to fetch news: {str(e)}',
            'pagination': {
                'page': 1,
                'per_page': 10,  # Changed from 5 to 10
                'total_items': 0,
                'total_pages': 0
            }
        })

def create_mock_news_data(count=10):
    """Create mock news data for fast initial loading"""
    mock_news = []
    
    # Use topics from priority topics for more realistic titles
    topics = []
    for topic_list in PRIORITY_TOPICS.values():
        topics.extend(topic_list)
    
    # Default sources
    sources = ["The Times", "BBC", "Reuters", "The Hindu", "NDTV", "CNN"]
    
    for i in range(count):
        is_real = i % 3 != 0  # Make 2/3 of the mock news "real" for balance
        topic = topics[i % len(topics)]
        
        mock_news.append({
            'title': f"Latest updates on {topic.title()} developments",
            'description': f"This is a placeholder article about {topic} while the system loads real news analysis. Check back in a moment for fully analyzed content.",
            'url': "#",
            'image': "",
            'source': sources[i % len(sources)],
            'publishedAt': datetime.now().isoformat(),
            'isReal': is_real,
            'confidence': 0.7 if is_real else 0.3,
            'category': 'General',
            'isAlert': False
        })
    
    return mock_news

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        text = data.get('newsText', '')
        
        if not text:
            return jsonify({'status': 'error', 'error': 'No text provided'})

        # Get model prediction
        model_scores = analyze_with_model_cached(text)
        is_real = model_scores[1] > model_scores[0]
        confidence = max(model_scores)

        # Check if it's a basic fact
        is_basic_fact, basic_fact_score = check_if_basic_fact(text)
        
        # Get fact checking results
        fact_check_success, fact_check_claims = check_with_fact_checking_sites(text)
        
        # Search for related articles using NewsAPI
        try:
            # Extract key phrases from text (first 100 chars for relevance)
            search_query = text[:100]
            articles = newsapi.get_everything(
                q=search_query,
                language='en',
                sort_by='relevancy',
                page_size=5
            )
            
            similar_articles = []
            if articles['status'] == 'ok':
                similar_articles = articles['articles']
        except Exception as e:
            print(f"NewsAPI error: {str(e)}")
            similar_articles = []

        # Get verification from external sources
        verification_score = verify_with_external_sources(text)
        
        # Get Gemini insights if available
        try:
            gemini_insights = analyze_content_with_gemini(text)
            gemini_score = gemini_insights.get('confidence', None)
        except Exception as e:
            print(f"Gemini analysis error: {str(e)}")
            gemini_insights = None
            gemini_score = None

        # Prepare verification sources
        verification_sources = [
            "Associated Press",
            "Reuters Fact Check",
            "Snopes",
            "FactCheck.org",
            "PolitiFact"
        ]

        # Calculate final scores
        fact_check_score = len(fact_check_claims) / 5 if fact_check_claims else 0.5
        source_credibility = 0.7  # Default credibility score

        # Prepare response
        response = {
            'status': 'success',
            'isReal': is_real,
            'confidence': confidence,
            'analysis': {
                'model_score': model_scores[1],  # Score for real class
                'fact_check_score': fact_check_score,
                'verification_score': verification_score,
                'source_credibility': source_credibility,
                'is_basic_fact': is_basic_fact,
                'gemini_score': gemini_score
            },
            'references': {
                'fact_check_claims': fact_check_claims,
                'similar_articles': similar_articles,
                'verification_sources': verification_sources
            }
        }

        if gemini_insights:
            response['insights'] = gemini_insights

        return jsonify(response)

    except Exception as e:
        print(f"Error in predict endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Error analyzing text',
            'details': str(e)
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000)

