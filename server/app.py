from flask import Flask, request, jsonify
from transformers import pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
import pickle
import numpy as np
from flask_cors import CORS
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.sentiment import SentimentIntensityAnalyzer
from newsapi import NewsApiClient
from datetime import datetime, timedelta
import re

app = Flask(__name__)
CORS(app)

# Download required NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('vader_lexicon')

# Initialize components
stop_words = set(stopwords.words('english'))
sia = SentimentIntensityAnalyzer()

# Initialize NewsAPI
NEWS_API_KEY = 'd141b02ee64b4f13baff644d423e95b5'  # Replace with your NewsAPI key
newsapi = NewsApiClient(api_key=NEWS_API_KEY)

# Load models
try:
    model = pickle.load(open('model/fake_news_model.pkl', 'rb'))
    vectorizer = pickle.load(open('model/vectorizer.pkl', 'rb'))
    # Initialize zero-shot classifier
    classifier = pipeline("zero-shot-classification")
    print("Models loaded successfully!")
except Exception as e:
    print(f"Error loading models: {str(e)}")
    raise

def analyze_with_zero_shot(text):
    try:
        candidate_labels = [
            "factual reporting",
            "opinion piece",
            "clickbait",
            "propaganda",
            "satire"
        ]
        
        result = classifier(text, candidate_labels)
        real_score = result['scores'][result['labels'].index("factual reporting")]
        
        return {
            'probability': real_score,
            'labels': dict(zip(result['labels'], result['scores'])),
            'confidence': max(result['scores'])
        }
    except Exception as e:
        print(f"Zero-shot Analysis Error: {str(e)}")
        return None

def analyze_text_features(text):
    tokens = word_tokenize(text.lower())
    tokens = [t for t in tokens if t not in stop_words]
    
    features = {
        'text_length': len(text),
        'avg_word_length': np.mean([len(t) for t in tokens]),
        'exclamation_count': text.count('!'),
        'question_count': text.count('?'),
        'uppercase_ratio': sum(1 for c in text if c.isupper()) / len(text),
        'number_count': sum(c.isdigit() for c in text),
        'sentiment_scores': sia.polarity_scores(text)
    }
    
    return features

def check_credibility_signals(text):
    # Updated credibility signals with more nuanced checks
    signals = {
        'has_dates': bool(re.search(r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}', text)),
        'has_quotes': text.count('"') > 1 or text.count("'") > 1,
        'has_numbers': bool(re.search(r'\d+', text)),
        'has_named_entities': bool(re.search(r'[A-Z][a-z]+ [A-Z][a-z]+', text)),
        'has_sources': any(word in text.lower() for word in [
            'according to', 'sources say', 'reported by', 'studies show',
            'researchers', 'officials', 'experts', 'announced'
        ]),
        'has_clickbait': any(phrase in text.lower() for phrase in [
            "you won't believe", "shocking", "mind blowing",
            "incredible", "unbelievable", "miracle", "secret",
            "they don't want you to know", "this one trick",
            "gone wrong", "will amaze you", "!!!"
        ]),
        'has_excessive_punctuation': text.count('!') > 3 or text.count('?') > 3,
        'has_all_caps_words': len(re.findall(r'\b[A-Z]{3,}\b', text)) > 2
    }
    
    # Updated scoring weights
    credibility_weights = {
        'has_dates': 0.2,
        'has_quotes': 0.2,
        'has_numbers': 0.15,
        'has_named_entities': 0.2,
        'has_sources': 0.25,
        'has_clickbait': -0.3,
        'has_excessive_punctuation': -0.2,
        'has_all_caps_words': -0.2
    }
    
    # Calculate weighted score
    score = sum(signals[key] * credibility_weights[key] for key in credibility_weights)
    normalized_score = (score + 1) / 2  # Normalize to 0-1 range
    
    return signals, max(0, min(1, normalized_score))

def analyze_text(text):
    # Basic text cleaning
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 1. ML Model Prediction
    text_vectorized = vectorizer.transform([text])
    ml_prediction = model.predict_proba(text_vectorized)[0]
    
    # 2. Credibility Analysis
    credibility_signals, credibility_score = check_credibility_signals(text)
    
    # 3. Sentiment Analysis
    sentiment = sia.polarity_scores(text)
    sentiment_score = (1 + sentiment['compound']) / 2  # Normalize to 0-1
    
    # 4. Calculate final score with adjusted weights
    weights = {
        'ml_model': 0.4,
        'credibility': 0.4,
        'sentiment': 0.2
    }
    
    final_score = (
        ml_prediction[1] * weights['ml_model'] +
        credibility_score * weights['credibility'] +
        sentiment_score * weights['sentiment']
    )
    
    # Adjust confidence calculation
    confidence = (
        np.max(ml_prediction) * 0.5 +
        credibility_score * 0.3 +
        (1 - abs(sentiment['compound'])) * 0.2
    )
    
    # Prepare detailed analysis
    analysis_details = {
        'ml_score': float(ml_prediction[1]),
        'credibility_score': float(credibility_score),
        'sentiment_score': float(sentiment_score),
        'credibility_signals': credibility_signals,
        'sentiment_analysis': sentiment,
        'final_score': float(final_score),
        'confidence': float(confidence)
    }
    
    return final_score, confidence, analysis_details

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        text = data['newsText']
        
        final_score, confidence, analysis_details = analyze_text(text)
        
        # Adjust threshold for more balanced results
        is_real = final_score > 0.45  # Slightly lower threshold
        
        return jsonify({
            'isReal': is_real,
            'confidence': float(confidence),
            'status': 'success',
            'analysis': analysis_details
        })
            
    except Exception as e:
        print(f"Error in predict: {str(e)}")
        return jsonify({'error': str(e), 'status': 'error'})

@app.route('/api/news-gallery', methods=['GET'])
def get_news_gallery():
    try:
        print("Fetching news...")
        yesterday = datetime.now() - timedelta(days=1)
        news_response = newsapi.get_everything(
            q='(technology OR science OR business) AND (announced OR published OR reported)',
            language='en',
            from_param=yesterday.strftime('%Y-%m-%d'),
            to=datetime.now().strftime('%Y-%m-%d'),
            sort_by='publishedAt',
            page_size=12
        )
        
        print(f"Received {len(news_response['articles'])} articles")
        
        processed_news = []
        for article in news_response['articles']:
            try:
                if not article.get('title') or not article.get('description'):
                    continue
                    
                text_to_analyze = f"{article['title']} {article['description']}"
                final_score, confidence, analysis_details = analyze_text(text_to_analyze)
                
                # Convert all boolean values to integers for JSON serialization
                credibility_signals = {
                    k: int(v) if isinstance(v, bool) else v 
                    for k, v in analysis_details['credibility_signals'].items()
                }
                
                analysis_details['credibility_signals'] = credibility_signals
                
                processed_news.append({
                    'title': article['title'],
                    'description': article['description'],
                    'url': article.get('url', ''),
                    'image': article.get('urlToImage', ''),
                    'source': article.get('source', {}).get('name', 'Unknown'),
                    'publishedAt': article.get('publishedAt', ''),
                    'isReal': int(final_score > 0.45),  # Convert boolean to int
                    'confidence': float(confidence),
                    'analysis': analysis_details
                })
                
            except Exception as e:
                print(f"Error processing article: {str(e)}")
                continue

        if not processed_news:
            return jsonify({
                'error': 'No articles could be processed',
                'articles': []
            }), 404

        print(f"Processed {len(processed_news)} articles successfully")
        return jsonify(processed_news)
        
    except Exception as e:
        print(f"Error in get_news_gallery: {str(e)}")
        return jsonify({
            'error': str(e),
            'articles': []
        }), 500

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "Server is running!"})

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status": "success",
        "message": "Fake News Detection API is running!",
        "available_endpoints": {
            "/": "GET - This information",
            "/predict": "POST - Verify news text",
            "/api/news-gallery": "GET - Get analyzed news articles",
            "/test": "GET - Test server status"
        },
        "usage": {
            "verify_news": {
                "endpoint": "/predict",
                "method": "POST",
                "body": {
                    "newsText": "Your news text here"
                }
            },
            "get_news": {
                "endpoint": "/api/news-gallery",
                "method": "GET"
            }
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
