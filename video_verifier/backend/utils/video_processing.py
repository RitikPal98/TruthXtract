import subprocess
import os
import cv2 # Using OpenCV for frame extraction
import json
import math
import uuid
import re
import requests
from urllib.parse import urlparse
import mimetypes

# Using Hachoir for metadata extraction
from hachoir.parser import createParser
from hachoir.metadata import extractMetadata
from hachoir.core import config as HachoirConfig

# For audio extraction
import moviepy
from moviepy import VideoFileClip

# For Google Cloud Speech-to-Text
from google.cloud import speech
import wave

# For Google Fact Check API
from googleapiclient.discovery import build
from google.auth import default
from google.auth.exceptions import DefaultCredentialsError
from dotenv import load_dotenv
import re
import spacy
import cloudinary
import cloudinary.uploader
import cloudinary.api
import numpy as np
import requests

# For Google Gemini API
import google.generativeai as genai
import json

# Load spaCy model
nlp = spacy.load('en_core_web_sm')

# Load environment variables for API keys
load_dotenv()
FACT_CHECK_API_KEY = os.getenv("GOOGLE_FACT_CHECK_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Configure Gemini API
GEMINI_API_KEY_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'projecttx-8c3a581eb089.json')
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") # Read from environment first

try:
    gemini_key_source = None
    # Initialize Gemini API
    if GEMINI_API_KEY:
        # Use API key from environment variable if available
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_key_source = "environment variable"
    else:
        # Try to load credentials from service account file as a fallback
        print(f"GEMINI_API_KEY environment variable not set. Trying file: {GEMINI_API_KEY_FILE}")
        try:
            # Read the service account JSON file
            with open(GEMINI_API_KEY_FILE, 'r') as f:
                creds_data = json.load(f)
            
            if 'api_key' in creds_data and creds_data['api_key']:
                genai.configure(api_key=creds_data['api_key'])
                gemini_key_source = "service account file"
            else:
                print("Service account file exists but does not contain a valid 'api_key' field.")
        except FileNotFoundError:
             print(f"Warning: Service account file not found at {GEMINI_API_KEY_FILE}. Cannot configure Gemini from file.")
        except json.JSONDecodeError:
             print(f"Error: Failed to parse JSON from service account file: {GEMINI_API_KEY_FILE}")
        except Exception as file_error:
            print(f"Error reading service account file: {file_error}")

    # Check if configuration was successful from either source
    if gemini_key_source:
        print(f"Gemini API configured successfully using key from: {gemini_key_source}")
        # Set up model configuration
        generation_config = {
            "temperature": 0.2,  # More factual/deterministic outputs
            "top_p": 0.95,
            "top_k": 64,
            "max_output_tokens": 2048,
        }
        
        # Use Gemini Pro as the default model for fact-checking
        gemini_model = genai.GenerativeModel('gemini-pro', generation_config=generation_config)
        print("Gemini model initialized successfully (gemini-pro).")
    else:
        print("Failed to configure Gemini API key from environment or file. Gemini features will be unavailable.")
        gemini_model = None # Explicitly set model to None if configuration failed

except Exception as e:
    print(f"Error during Gemini configuration or model initialization: {e}")
    gemini_model = None


# Configure Hachoir to avoid charset probe warnings if needed
# HachoirConfig.quiet = True 

# Ensure temp/output directories exist
TEMP_DIR = os.path.join(os.path.dirname(__file__), '../temp_audio')
KEYFRAMES_DIR = os.path.join(os.path.dirname(__file__), '../keyframes')
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)
if not os.path.exists(KEYFRAMES_DIR):
    os.makedirs(KEYFRAMES_DIR)

def extract_keyframes(video_path, output_dir=KEYFRAMES_DIR, frames_per_second=1):
    """Extracts keyframes from a video using OpenCV and uploads to Cloudinary."""
    keyframes = []
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Could not open video file {video_path}")
            return []

        fps = cap.get(cv2.CAP_PROP_FPS) # Get video FPS
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        print(f"Video Info: FPS={fps}, Frames={total_frames}, Duration={duration:.2f}s")

        # Calculate frame interval
        frame_interval = int(fps / frames_per_second) if frames_per_second > 0 and fps > 0 else int(fps) # Default to 1 frame per sec if calculation fails
        if frame_interval <= 0: frame_interval = 1 # Ensure at least 1

        base_filename = os.path.splitext(os.path.basename(video_path))[0]
        count = 0
        frame_number = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break # End of video

            # Extract frame at specified interval
            if frame_number % frame_interval == 0:
                keyframe_filename = f'{base_filename}_frame_{count:04d}.png' # Save as PNG
                keyframe_path = os.path.join(output_dir, keyframe_filename)
                
                # Check if frame is valid before writing
                if frame is not None and frame.size > 0:
                    # First save locally
                    success = cv2.imwrite(keyframe_path, frame)
                    if success:
                        # Upload to Cloudinary
                        try:
                            upload_result = cloudinary.uploader.upload(
                                keyframe_path,
                                folder="truthxtract_keyframes",
                                public_id=f"{base_filename}_frame_{count:04d}"
                            )
                            # Get the secure URL for the uploaded image
                            secure_url = upload_result.get('secure_url')
                            if secure_url:
                                keyframes.append(secure_url)
                                print(f"Uploaded keyframe to Cloudinary: {secure_url}")
                            else:
                                print(f"Warning: Failed to get secure URL from Cloudinary upload")
                                # Fallback to local path
                                relative_path = os.path.join('keyframes', keyframe_filename)
                                keyframes.append(relative_path)
                        except Exception as upload_error:
                            print(f"Cloudinary upload error: {upload_error}")
                            # Fallback to local path
                            relative_path = os.path.join('keyframes', keyframe_filename)
                            keyframes.append(relative_path)
                    else:
                         print(f"Warning: Failed to write keyframe {keyframe_path}")
                else:
                    print(f"Warning: Skipping invalid frame at number {frame_number}")
                
                count += 1
            
            frame_number += 1

        cap.release()
        print(f"Extracted and uploaded {len(keyframes)} keyframes.")
        return keyframes

    except cv2.error as e:
        print(f"OpenCV error during keyframe extraction: {e}")
        if 'cap' in locals() and cap.isOpened():
            cap.release()
        return []
    except Exception as e:
        print(f"An unexpected error occurred during keyframe extraction: {e}")
        if 'cap' in locals() and cap.isOpened():
            cap.release()
        return []


def extract_metadata(video_path):
    """Extracts metadata from a video using Hachoir."""
    metadata_dict = {}
    parser = None
    try:
        print(f"Extracting metadata for {video_path} using Hachoir...")
        parser = createParser(video_path)
        if not parser:
            print(f"Hachoir: Unable to parse file {video_path}")
            return {"Error": "Hachoir: Unable to parse file."}
        
        with parser:
            metadata = extractMetadata(parser)
        
        if not metadata:
             print(f"Hachoir: No metadata found in {video_path}")
             return {"Info": "Hachoir: No metadata found."}

        # Convert Hachoir metadata object to a dictionary
        for line in metadata.exportPlaintext():
            # Process lines like "- Duration: 1 min 2 sec 123 ms (62.12 sec)"
            # Or "- Image width: 1920 pixels"
            if ':' in line:
                key_part, value_part = line.split(':', 1)
                key = key_part.strip().lstrip('- ').strip().replace(' ','_').lower()
                value = value_part.strip()
                # You might want to further process the value (e.g., extract numeric part)
                metadata_dict[key] = value

        # Add basic file info if not extracted
        if 'filename' not in metadata_dict:
             metadata_dict['filename'] = os.path.basename(video_path)
        if 'file_size' not in metadata_dict:
             try:
                 metadata_dict['file_size'] = f"{os.path.getsize(video_path)} bytes"
             except OSError:
                 pass # Ignore if file size cannot be read

        print(f"Successfully extracted metadata for {video_path} using Hachoir")
        return metadata_dict

    except ImportError as e:
        print(f"Hachoir Error: Missing dependency? {e}")
        return {"Error": f"Hachoir import error: {e}. Please ensure hachoir and dependencies are installed."}
    except Exception as e:
        error_type = type(e).__name__
        print(f"An unexpected error occurred during Hachoir metadata extraction: {error_type}: {e}")
        # Ensure parser is closed if opened
        if parser and not parser.stream.closed:
             try:
                 parser.stream.close()
             except Exception as close_err:
                 print(f"Error closing Hachoir parser stream: {close_err}")
        return {"Error": f"An unexpected error occurred during metadata extraction: {error_type}: {e}"}

def extract_audio(video_path, output_dir=TEMP_DIR):
    """Extracts audio from video using moviepy and saves as mono wav."""
    try:
        print(f"Extracting audio from {video_path}...")
        # Verify the video file exists
        if not os.path.exists(video_path):
            print(f"Video file doesn't exist: {video_path}")
            return None

        # Create video clip object
        video_clip = VideoFileClip(video_path)
        
        # Check if video has audio track
        if video_clip.audio is None:
            print("Video does not contain an audio track.")
            video_clip.close()
            print(true)
            return None
        
        # Generate output filename
        base_filename = os.path.splitext(os.path.basename(video_path))[0]
        # Remove any problematic characters
        safe_filename = re.sub(r'[^\w\-_.]', '_', base_filename)
        audio_filename = f"{safe_filename}_{uuid.uuid4().hex[:8]}.wav"
        audio_path = os.path.join(output_dir, audio_filename)
        
        # Ensure output directory exists
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Write audio file as mono
        video_clip.audio.write_audiofile(audio_path, codec='pcm_s16le', ffmpeg_params=['-ac', '1'])
        video_clip.close() # Close the video clip
        print(f"Audio extracted successfully to {audio_path}")
        return audio_path
        
    except Exception as e:
        print(f"Error during audio extraction: {e}")
        if 'video_clip' in locals() and video_clip is not None: 
            try:
                video_clip.close()
            except:
                pass
        return None

def transcribe_audio_google(audio_path):
    """Transcribes audio using Google Cloud Speech-to-Text."""
    if not audio_path:
        return {"transcript": None, "error": "No audio path provided."}

    try:
        print(f"Transcribing audio file {audio_path} using Google Cloud STT...")
        client = speech.SpeechClient()
        
        with open(audio_path, "rb") as audio_file:
            content = audio_file.read()

        # Use wave module to get the actual sample rate
        with wave.open(audio_path, 'rb') as wave_file:
            actual_sample_rate = wave_file.getframerate()

        audio = speech.RecognitionAudio(content=content)
        # Configure for WAV - adjust if using a different format
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16, # Change to match WAV format
            sample_rate_hertz=actual_sample_rate, # Use actual sample rate from the file
            language_code="en-US", # Change to target language
            enable_automatic_punctuation=True,
            model="video", # Use the video model for better accuracy on video audio
            use_enhanced=True # Use enhanced model if available
        )

        response = client.recognize(config=config, audio=audio)

        transcript = "".join(result.alternatives[0].transcript for result in response.results)
        
        print(f"Transcription successful. Length: {len(transcript)} chars")
        return {"transcript": transcript, "error": None}

    except DefaultCredentialsError:
        error_msg = "Google Cloud authentication failed. Set GOOGLE_APPLICATION_CREDENTIALS env variable."
        print(f"Error: {error_msg}")
        return {"transcript": None, "error": error_msg}
    except ImportError:
         error_msg = "Google Cloud Speech library not found. Please install google-cloud-speech."
         print(f"Error: {error_msg}")
         return {"transcript": None, "error": error_msg}
    except Exception as e:
        error_msg = f"An error occurred during Google Cloud STT: {e}"
        print(f"Error: {error_msg}")
        return {"transcript": None, "error": error_msg}
    finally:
        # Clean up the temporary audio file
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                print(f"Removed temporary audio file: {audio_path}")
            except OSError as e:
                 print(f"Warning: Could not remove temporary audio file {audio_path}: {e}")

# Define reliable news and fact-checking sources
RELIABLE_SOURCES = {
    'snopes.com': 0.85,
    'politifact.com': 0.85,
    'factcheck.org': 0.85,
    'reuters.com': 0.90,
    'apnews.com': 0.90,
    'bbc.com': 0.85,
    'npr.org': 0.80,
    'nytimes.com': 0.80,
    'washingtonpost.com': 0.80,
    'theguardian.com': 0.80,
    'thehindu.com': 0.80,
    'hindustantimes.com': 0.80,
    'ndtv.com': 0.80,
    'timesofindia.indiatimes.com': 0.80
}

def check_fact_google(query):
    """Checks facts using Google Fact Check Tools API."""
    if not FACT_CHECK_API_KEY:
        return {"claims": [], "error": "FACT_CHECK_API_KEY not found in environment variables."}
    if not query:
         return {"claims": [], "error": "No query provided for fact-checking."}

    try:
        print(f"Checking facts for query (length {len(query)} chars) using Google Fact Check API...")
        service = build("factchecktools", "v1alpha1", developerKey=FACT_CHECK_API_KEY)

        # Use spaCy to extract key phrases
        doc = nlp(query)
        potential_claims = set()

        # Extract named entities and noun chunks
        for ent in doc.ents:
            potential_claims.add(ent.text)
        for chunk in doc.noun_chunks:
            potential_claims.add(chunk.text)

        # Also add sentences for more complete fact checking
        sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 10]
        potential_claims.update(sentences)

        claims = []

        for claim in potential_claims:
            claim = claim.strip()
            if not claim:
                continue

            # Limit query length
            if len(claim) > 500:
                claim = claim[:500]

            request = service.claims().search(query=claim)
            response = request.execute()

            # Collect claims from each segment
            claims.extend(response.get('claims', []))

        print(f"Found {len(claims)} potential fact checks.")
        return {"claims": claims, "error": None}

    except DefaultCredentialsError as e:
         error_msg = f"Google Cloud Auth Error (Fact Check API usually uses API Key): {e}"
         print(f"Error: {error_msg}")
         return {"claims": [], "error": error_msg}
    except ImportError:
         error_msg = "Google API Client library not found. Please install google-api-python-client."
         print(f"Error: {error_msg}")
         return {"claims": [], "error": error_msg}
    except Exception as e:
        error_msg = f"An error occurred during Google Fact Check API call: {e}"
        print(f"Error: {error_msg}")
        return {"claims": [], "error": error_msg}

def check_if_basic_fact(text):
    """Check if text contains basic, well-known facts"""
    # Normalize text for matching
    text_lower = text.lower().strip().replace(".", "").replace("!", "").replace("?", "")
    
    # Dictionary of well-known facts
    BASIC_FACTS = {
        "sun rises in the east": 1.0,
        "the sun rises in the east": 1.0,
        "earth revolves around the sun": 1.0,
        "the earth revolves around the sun": 1.0,
        "water boils at 100 degrees": 1.0,
        "water freezes at 0 degrees": 1.0,
        "earth is round": 1.0,
        "the earth is round": 1.0,
        "humans need oxygen to survive": 1.0,
        "earth is flat": 0.0,  # This is a false statement
        "the earth is flat": 0.0,
        "vaccines cause autism": 0.0,  # This is a false statement
    }
    
    # Check for exact match
    if text_lower in BASIC_FACTS:
        return True, BASIC_FACTS[text_lower]
    
    # Check if the text contains a basic fact
    for fact, verdict in BASIC_FACTS.items():
        if fact in text_lower or text_lower in fact:
            # If there's significant overlap, consider it a match
            return True, verdict
    
    # Not a recognized basic fact
    return False, 0.5

def verify_with_external_sources(text):
    """Verify text content with reliable external sources"""
    if not text or not NEWS_API_KEY:
        return 0.5  # Neutral score if no text or API key
    
    try:
        # Clean text for better search results
        search_query = text[:200]  # Use first 200 chars for search
        
        # Search for verification in reliable sources
        url = "https://newsapi.org/v2/everything"
        params = {
            "apiKey": NEWS_API_KEY,
            "q": search_query,
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": 5
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if data.get("status") != "ok" or data.get("totalResults", 0) == 0:
            return 0.5  # Neutral if no results
            
        articles = data.get("articles", [])
        total_checks = 0
        verified_count = 0
        
        for article in articles:
            source_domain = article.get("source", {}).get("name", "")
            if not source_domain:
                continue
                
            # Check if the article is from a reliable source
            reliability = 0
            for domain, score in RELIABLE_SOURCES.items():
                if domain in source_domain.lower():
                    reliability = score
                    break
            
            if reliability > 0:
                total_checks += 1
                verified_count += reliability
        
        return verified_count / total_checks if total_checks > 0 else 0.5
    
    except Exception as e:
        print(f"Error during external verification: {e}")
        return 0.5  # Neutral score on error

def check_fact_gemini(text):
    """Fact-check statements using Google's Gemini model with source attribution"""
    if not gemini_model:
        print("Gemini API not properly configured. Skipping Gemini fact-check.")
        return {
            "verification_score": 0.5,  # Neutral
            "confidence": 0.0,
            "results": [],
            "error": "Gemini API not properly configured"
        }
    
    if not text or len(text.strip()) < 10:
        return {
            "verification_score": 0.5,  # Neutral
            "confidence": 0.0,
            "results": [],
            "error": "Insufficient text to analyze"
        }
    
    try:
        print(f"Performing advanced fact-checking with Gemini AI on text ({len(text)} chars)...")
        
        # Prepare prompt for fact-checking
        prompt = f"""You are an expert fact-checker with a specialty in verifying information and providing reliable sources.
        
Task: Carefully analyze the following statement and determine if it is REAL or FAKE news.

STATEMENT TO VERIFY: "{text}"

Analysis Instructions:
- Evaluate the entire statement as a single claim
- Determine if the news/claim is REAL or FAKE
- Provide specific evidence supporting your assessment
- List at least 2 specific, reliable sources that verify or contradict the claim (include names of publications, research papers, or official sources)
- Include direct URLs to sources where possible

Please format your response as a JSON object with this structure:
{{
  "verdict": string, // "REAL" or "FAKE"
  "confidence": float, // 0.0 to 1.0
  "evidence": string, // Explanation of your assessment
  "truth_score": float, // 0.0 (completely false) to 1.0 (completely true)
  "sources": [
    {{
      "name": string, // Name of publication or organization
      "url": string // Direct link to source
    }}
  ]
}}

Additional guidelines:
- Express the verdict clearly as either "REAL" or "FAKE"
- Truth score should be from 0.0 (completely false) to 1.0 (completely true)
- Provide clear, concise evidence for your assessment
- Ensure sources are credible (academic, major news outlets, government agencies, etc.)
- Express confidence level based on quality/quantity of available sources

Your response must ONLY contain the JSON object with no other text."""
        
        # Get response from Gemini
        response = gemini_model.generate_content(prompt)
        
        # Process the response
        try:
            # Extract JSON content from response
            content = response.text
            # Parse the JSON
            result = json.loads(content)
            
            # Structure and format the result
            verdict = result.get("verdict", "UNKNOWN")
            truth_score = result.get("truth_score", 0.5)  # Default to neutral
            confidence = result.get("confidence", 0.3)  # Lower default confidence
            evidence = result.get("evidence", "")
            sources = result.get("sources", [])
            
            # Format result for display
            formatted_result = {
                "claim_text": text[:150] + "..." if len(text) > 150 else text,
                "truthfulness": truth_score,
                "verdict": verdict,
                "evidence": evidence,
                "sources": sources
            }
            
            print(f"Gemini fact check complete: verdict={verdict}, score={truth_score:.2f}, sources={len(sources)}")
            
            return {
                "verification_score": truth_score,
                "confidence": confidence,
                "results": [formatted_result],  # Wrap in list for backward compatibility
                "error": None
            }
            
        except json.JSONDecodeError as e:
            print(f"Error parsing Gemini response as JSON: {e}")
            print(f"Raw response: {response.text}")
            
            # Attempt to extract valuable information even if JSON parsing failed
            default_result = {
                "claim_text": text[:150] + "..." if len(text) > 150 else text,
                "truthfulness": 0.5,
                "verdict": "UNKNOWN",
                "evidence": "Failed to process through AI verification",
                "sources": []
            }
            
            return {
                "verification_score": 0.5,
                "confidence": 0.1,
                "results": [default_result],
                "raw_response": response.text[:1000],  # Include truncated raw response
                "error": "Failed to parse Gemini response as JSON"
            }
    
    except Exception as e:
        print(f"Error during Gemini fact check: {e}")
        default_result = {
            "claim_text": text[:150] + "..." if len(text) > 150 else text,
            "truthfulness": 0.5,
            "verdict": "UNKNOWN",
            "evidence": "Failed to verify through AI",
            "sources": []
        }
        
        return {
            "verification_score": 0.5,  # Neutral score on error
            "confidence": 0.0,
            "results": [default_result],
            "error": f"Gemini fact check failed: {str(e)}"
        }

def analyze_transcript(transcript, video_metadata=None):
    """Comprehensive analysis of video transcript combining multiple verification methods"""
    if not transcript:
        return {
            "verification_score": 0.5,  # Neutral score
            "confidence": 0.0,
            "analysis": {
                "error": "No transcript provided for analysis"
            }
        }
    
    try:
        print(f"Starting comprehensive analysis of transcript ({len(transcript)} chars)...")
        
        # 1. Check if this is a basic, well-known fact
        is_basic_fact, fact_verdict = check_if_basic_fact(transcript)
        if is_basic_fact:
            print(f"Identified as basic fact with verdict: {fact_verdict}")
            return {
                "verification_score": fact_verdict,
                "confidence": 0.95,
                "analysis": {
                    "fact_check_score": fact_verdict,
                    "verification_score": fact_verdict,
                    "source_credibility": 0.9,
                    "is_basic_fact": True,
                    "claims": []
                }
            }
        
        # 2. Use Gemini for comprehensive fact-checking (primary method)
        gemini_results = check_fact_gemini(transcript)
        gemini_score = gemini_results.get("verification_score", 0.5)
        gemini_confidence = gemini_results.get("confidence", 0.0)
        gemini_claims = gemini_results.get("results", [])
        
        # 3. Check with Google Fact Check API (secondary method, lower weight)
        fact_check_result = check_fact_google(transcript)
        google_claims = fact_check_result.get("claims", [])
        fact_check_score = 0.8 if google_claims and len(google_claims) > 0 else 0.5
        
        # 4. Verify with external news sources (tertiary method, lowest weight)
        verification_score = verify_with_external_sources(transcript)
        
        # 5. Calculate combined score with weights favoring Gemini
        # Gemini has highest weight, Google Fact Check and external sources have lower weights
        final_score = (gemini_score * 0.6 + fact_check_score * 0.25 + verification_score * 0.15)
        
        # 6. Calculate confidence based on Gemini confidence and agreement between methods
        scores = [gemini_score, fact_check_score, verification_score]
        method_agreement = 1.0 - np.std(scores)  # Higher agreement = higher confidence
        confidence = (gemini_confidence * 0.7 + method_agreement * 0.3)  # Weighted confidence
        
        # 7. Add source credibility if video metadata is available
        source_credibility = 0.5  # Default neutral
        if video_metadata and isinstance(video_metadata, dict):
            # Extract possible source information from metadata
            source = ""
            for key in ['producer', 'artist', 'author', 'copyright']:
                if key in video_metadata and video_metadata[key]:
                    source = video_metadata[key]
                    break
            
            # Check if source is in reliable sources
            if source:
                for domain, score in RELIABLE_SOURCES.items():
                    if domain.lower() in source.lower():
                        source_credibility = score
                        break
        
        # Adjust final score with source credibility if applicable
        if source_credibility != 0.5:  # If not neutral
            final_score = (final_score * 0.9 + source_credibility * 0.1)
        
        # Combine claims from both Gemini and Google Fact Check API
        all_claims = []
        
        # Add Gemini claims with source information (priority)
        for claim in gemini_claims:
            all_claims.append({
                "text": claim.get("claim_text", ""),
                "truthfulness": claim.get("truthfulness", 0.5),
                "evidence": claim.get("evidence", ""),
                "sources": claim.get("sources", []),
                "source_type": "gemini"  # Mark source as Gemini
            })
        
        # Add Google claims (if Gemini didn't provide enough details)
        if len(all_claims) < 3 and google_claims:
            for claim in google_claims[:3]:
                all_claims.append({
                    "text": claim.get("text", ""),
                    "claimReview": claim.get("claimReview", []),
                    "source_type": "google_fact_check"  # Mark source as Google Fact Check API
                })
        
        print(f"Analysis complete: score={final_score:.2f}, confidence={confidence:.2f}")
        # Create a separate section for Gemini claims to make it easier for the frontend to access
        gemini_claims_formatted = []
        for claim in gemini_claims:
            gemini_claims_formatted.append({
                "claim_text": claim.get("claim_text", ""),
                "truthfulness": claim.get("truthfulness", 0.5),
                "verdict": claim.get("verdict", "UNKNOWN"),
                "evidence": claim.get("evidence", ""),
                "sources": claim.get("sources", [])
            })
            
        return {
            "verification_score": final_score,
            "confidence": confidence,
            "analysis": {
                "fact_check_score": final_score,  # Keep for backward compatibility
                "gemini_score": gemini_score,
                "google_fact_check_score": fact_check_score,
                "external_verification_score": verification_score,
                "source_credibility": source_credibility,
                "is_basic_fact": False,
                "claims_found": len(all_claims),
                "claims": all_claims,  # Combined claims from both sources
                "gemini_claims": gemini_claims_formatted  # Add the Gemini claims with verdict for frontend access
            }
        }
    
    except Exception as e:
        print(f"Error during transcript analysis: {e}")
        return {
            "verification_score": 0.5,  # Neutral score on error
            "confidence": 0.0,
            "analysis": {
                "error": f"Analysis failed: {str(e)}"
            }
        }

# For OCR
import pytesseract
from PIL import Image

# For handling URLs
from urllib.parse import urlparse

# Function to extract text from images using pytesseract
def extract_text_from_image(image_path):
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        print(tex)
        return text
    except Exception as e:
        print(f"Error extracting text from image: {e}")
        return ""

# Function to fetch image and description from social media links
def fetch_social_media_data(url):
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        # Placeholder logic for fetching data, to be replaced with actual API calls or scraping
        if "youtube.com" in domain:
            return {
                "image": "youtube_thumbnail.jpg",
                "description": "Sample YouTube description"
            }
        elif "instagram.com" in domain:
            return {
                "image": "instagram_post.jpg",
                "description": "Sample Instagram caption"
            }
        elif "twitter.com" in domain or "x.com" in domain:
            return {
                "image": "twitter_post.jpg",
                "description": "Sample Tweet text"
            }
        else:
            print("Unsupported social media link")
            return None
    except Exception as e:
        print(f"Error fetching social media data: {e}")
        return None

# Function to prepare data for Gemini Pro Vision fact-checking
def prepare_fact_check_data(image_path=None, url=None):
    if image_path:
        text = extract_text_from_image(image_path)
        return {
            "image": image_path,
            "caption": text,
            "prompt": f"[image, {text}, 'Fact check this.']"
        }
    elif url:
        social_data = fetch_social_media_data(url)
        if social_data:
            return {
                "image": social_data["image"],
                "caption": social_data["description"],
                "prompt": f"[image, {social_data['description']}, 'Fact check this.']"
            }
    return None

# Import pytube for video downloading
from pytube import YouTube
from pytube.exceptions import PytubeError # Import specific exception

# Import yt-dlp
import yt_dlp

# Function to download content from URL
def download_content_from_url(url, download_path):
    """
    Download content from a URL, handling both images and videos.
    Uses yt-dlp for YouTube videos, requests for images and other videos.
    Returns the path where the content is saved.
    """
    try:
        # Validate URL
        if not url.startswith(('http://', 'https://')):
            print(f"Invalid URL format: {url}")
            return None

        # Determine if URL is likely an image or video
        lower_url = url.lower()
        is_youtube_url = "youtube.com/watch?v=" in lower_url or "youtu.be/" in lower_url

        if is_youtube_url:
            # Handle YouTube video with yt-dlp
            print(f"Attempting YouTube download with yt-dlp: {url}")
            try:
                # Define filename template and output path
                # Use %(title)s and %(id)s for safe filename, limit length
                # Ensure the output template includes the file extension via .%(ext)s
                output_template = os.path.join(download_path, f"%(title).100s_%(id)s.%(ext)s")
                
                ydl_opts = {
                    # Request specific progressive MP4 format codes (video+audio)
                    # 22 = 720p, 18 = 360p. Fallback to best generic mp4.
                    'format': '22/18/best[ext=mp4]/best',
                    'outtmpl': output_template,
                    'noplaylist': True, # Only download single video
                    'verbose': True, # Enable verbose output for debugging
                    'restrictfilenames': True, # Ensure filenames are ASCII
                }

                print(f"yt-dlp options: {ydl_opts}") # Log options
                downloaded_file = None # Initialize
                try:
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        print("Running ydl.extract_info...")
                        info_dict = ydl.extract_info(url, download=True)
                        # Get the downloaded filename from info_dict
                        downloaded_file = ydl.prepare_filename(info_dict)
                        print(f"yt-dlp finished. Expected filename: {downloaded_file}")
                except Exception as ydl_exec_err:
                     print(f"Error during yt-dlp execution: {ydl_exec_err}")
                     # Potentially re-raise or return None depending on desired handling
                     raise # Re-raise the error for now to see it clearly
                
                # Check if download actually happened and file exists
                if downloaded_file and os.path.exists(downloaded_file):
                    print(f"Confirmed: YouTube video downloaded via yt-dlp to {downloaded_file}")
                    return downloaded_file
                else:
                    # This might happen if simulate=True or download failed silently
                    print(f"yt-dlp finished, but expected file NOT found at: {downloaded_file}")
                    # Attempt to find the file if the extension was different (less likely with specific format codes)
                    if downloaded_file:
                        base_name = os.path.splitext(downloaded_file)[0]
                        for ext in ['.mp4', '.mkv', '.webm']: # Common video extensions
                            potential_file = base_name + ext
                            print(f"Checking alternative path: {potential_file}")
                            if os.path.exists(potential_file):
                                print(f"Found downloaded file with different extension: {potential_file}")
                                return potential_file
                    print("Could not confirm downloaded file location.")
                    return None

            except yt_dlp.utils.DownloadError as dl_err:
                # Handle specific yt-dlp download errors
                print(f"yt-dlp download error for {url}: {dl_err}")
                return None
            except Exception as e:
                print(f"Unexpected error during yt-dlp download for {url}: {type(e).__name__}: {e}")
                return None

        elif any(ext in lower_url for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']):
            # Handle image download with requests
            print(f"Attempting image download: {url}")
            try:
                response = requests.get(url, stream=True, timeout=10)
                response.raise_for_status()

                parsed_url = urlparse(url)
                _, ext = os.path.splitext(parsed_url.path)
                if not ext or ext.lower() not in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                    # Guess extension from Content-Type if path extension is missing/unreliable
                    content_type = response.headers.get('content-type')
                    guessed_ext = mimetypes.guess_extension(content_type.split(';')[0].strip()) if content_type else None
                    ext = guessed_ext if guessed_ext and guessed_ext.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.bmp'] else '.png'

                image_filename = f"temp_image_{uuid.uuid4().hex[:12]}{ext}"
                image_path = os.path.join(download_path, image_filename)

                with open(image_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)

                print(f"Image downloaded and saved to {image_path}")
                return image_path
            except requests.exceptions.RequestException as req_e:
                print(f"Error downloading image: {req_e}")
                return None
            except Exception as e:
                print(f"Unexpected error downloading image: {e}")
                return None
        else:
            # Handle direct video download (non-YouTube) with requests
            print(f"Attempting direct download for non-YouTube video: {url}")
            # ... (existing direct download logic remains largely the same) ...
            try:
                # (Keep the existing logic for deriving base_filename, sanitizing, guessing extension)
                parsed_url = urlparse(url)
                if parsed_url.path and len(parsed_url.path) > 1:
                    base_filename = os.path.basename(parsed_url.path)
                else:
                    fallback_name = (parsed_url.netloc + parsed_url.path + parsed_url.query).replace('/', '_').replace('?', '_').replace('=', '_')
                    base_filename = fallback_name[:100] if fallback_name else f"temp_video_{uuid.uuid4().hex[:8]}"
                
                safe_base_filename = re.sub(r'[^\\w\\-_\\.]', '_', base_filename)
                if not safe_base_filename or safe_base_filename == '_':
                    safe_base_filename = f"temp_video_{uuid.uuid4().hex[:8]}"

                name_part, ext = os.path.splitext(safe_base_filename)
                common_video_exts = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv']
                if not ext or ext.lower() not in common_video_exts:
                    try:
                        head_response = requests.head(url, timeout=10, allow_redirects=True)
                        content_type = head_response.headers.get('content-type')
                        if content_type:
                            guessed_ext = mimetypes.guess_extension(content_type.split(';')[0].strip())
                            if guessed_ext and guessed_ext.lower() in common_video_exts:
                                ext = guessed_ext
                            else:
                                ext = ".mp4"
                        else:
                            ext = ".mp4"
                    except requests.exceptions.RequestException:
                        ext = ".mp4"
                
                if not name_part:
                    name_part = safe_base_filename

                video_filename = f"{name_part}_{uuid.uuid4().hex[:8]}{ext}"
                video_path = os.path.join(download_path, video_filename)
                print(f"Saving downloaded video to: {video_path}")

                # Actual download using requests
                response = requests.get(url, stream=True, timeout=30)
                response.raise_for_status()
                with open(video_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"Video downloaded directly to {video_path}")
                return video_path
            except requests.exceptions.RequestException as req_e:
                print(f"Error downloading non-YouTube video: {req_e}")
                return None
            except Exception as direct_e:
                print(f"Unexpected error during direct video download: {type(direct_e).__name__}: {direct_e}")
                return None

    except Exception as e:
        print(f"General error processing URL {url}: {type(e).__name__}: {e}")
        return None

# Remove PytubeError import if pytube is no longer used
# (Commented out for now, can be deleted later if stable)
# from pytube.exceptions import PytubeError 

# For backward compatibility
def download_video_from_url(url, download_path):
    return download_content_from_url(url, download_path)

# Function to handle image uploads and social media links for fact-checking
def process_media_for_fact_checking(image_path=None, url=None, download_path=TEMP_DIR):
    """
    Process media (image or URL) for fact-checking.
    Handles both images and videos from various sources.
    Saves downloaded content to the specified download_path.
    Returns analysis results and the final path of the downloaded media if applicable.
    """
    final_media_path = None # Keep track of the final downloaded file path
    is_video = False      # Keep track if downloaded content is a video
    results = {}          # Initialize results dict

    try:
        # Handle URL first
        if url:
            print(f"Processing URL: {url}")
            # Pass the specified download_path to the download function
            downloaded_path = download_content_from_url(url, download_path)
            
            if not downloaded_path:
                results = {"error": "Failed to download content from URL."}
                results["downloaded_media_path"] = None
                results["is_video"] = False # Ensure flag is set even on download failure
                return results
            
            final_media_path = downloaded_path # Store the path

            # Determine if the downloaded content is an image or video based on file extension
            if downloaded_path.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp')):
                # Process as image
                extracted_text = extract_text_from_image(downloaded_path)
                if not extracted_text or len(extracted_text.strip()) < 10:
                    extracted_text = "Image contains insufficient text for analysis."
                
                print(f"Extracted text from image: {extracted_text[:100]}...")
                # Use Gemini for fact-checking
                results = check_fact_gemini(extracted_text)
                is_video = False # It's an image

            else:
                # Process as video
                is_video = True # Mark as video
                try:
                    # First, try to get video metadata for source credibility
                    metadata = {}
                    try:
                        metadata = extract_metadata(downloaded_path)
                        print(f"Metadata extracted: {metadata}")
                    except Exception as meta_error:
                        print(f"Metadata extraction error: {meta_error}")
                    
                    # Extract audio and transcribe
                    audio_path = extract_audio(downloaded_path, output_dir=TEMP_DIR)
                    
                    # If audio extraction fails, try using the video title or description as text to analyze
                    if not audio_path:
                        print("Audio extraction failed, attempting alternative analysis...")
                        
                        # Try to get title from metadata or filename
                        video_text = ""
                        if metadata and isinstance(metadata, dict):
                            if 'title' in metadata:
                                video_text += metadata['title'] + ". "
                            if 'description' in metadata:
                                video_text += metadata['description'] + ". "
                        
                        # If we have a URL, try to get the page title/description
                        if url and not video_text:
                            try:
                                # Extract domain name from URL for context
                                domain = urlparse(url).netloc
                                video_text = f"Content from {domain}: {os.path.basename(downloaded_path)}"
                            except:
                                video_text = os.path.basename(downloaded_path)
                        
                        # If still no text, use the filename
                        if not video_text:
                            video_text = os.path.basename(downloaded_path)
                            
                        print(f"Using extracted text for analysis: {video_text[:100]}...")
                        # Use Gemini for fact-checking on the title/description
                        if len(video_text) > 10:
                            results = check_fact_gemini(video_text)
                        else:
                            results = {"error": "Could not extract audio or meaningful text from video."}
                    
                    # Normal path - we have audio
                    else:
                        transcript_data = transcribe_audio_google(audio_path)
                        print(transcript_data)
                        if not transcript_data or not transcript_data.get('transcript'):
                            results = {"error": "Could not extract meaningful transcript from video."}
                        else:
                            # Return transcript analysis with metadata
                            results = analyze_transcript(transcript_data['transcript'], metadata)
                    
                except Exception as e:
                    print(f"Error processing video: {e}")
                    results = {"error": f"Error processing video content: {str(e)}"}
        
        # Handle image path (uploaded image)
        elif image_path:
            final_media_path = image_path # Path is already known
            is_video = False # It's an image
            extracted_text = extract_text_from_image(image_path)
            if not extracted_text or len(extracted_text.strip()) < 10:
                extracted_text = "Image contains insufficient text for analysis."
            
            print(f"Extracted text from image: {extracted_text[:100]}...")
            # Use Gemini for fact-checking
            results = check_fact_gemini(extracted_text)
        
        else:
            results = {"error": "No image or URL provided."}
            results["downloaded_media_path"] = None
            results["is_video"] = False
            return results

        # Add the final path and type to the results dictionary before returning
        # Ensure these keys exist even if analysis (like Gemini) failed
        if "error" not in results: results["error"] = None # Add error key if missing
        results["downloaded_media_path"] = final_media_path
        results["is_video"] = is_video # Indicate if the downloaded content was a video
        return results
    
    except Exception as e:
        print(f"Error in process_media_for_fact_checking: {e}")
        # Ensure keys exist even on top-level error
        results = {
            "error": f"Failed to process media: {str(e)}",
            "downloaded_media_path": final_media_path, 
            "is_video": is_video
        }
        return results
