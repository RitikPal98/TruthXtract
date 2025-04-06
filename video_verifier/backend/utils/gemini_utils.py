import os
import google.generativeai as genai
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API using only environment variable
GEMINI_API_KEY = "AIzaSyD3DiCmNhedup1mSU9QUOw8LVuUIgByOlA"
# Read from environment

gemini_model = None # Initialize as None

try:
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        print(f"Gemini API configured successfully using key from environment variable.")
        
        # Set up model configuration
        generation_config = {
            "temperature": 0.2,  # More factual/deterministic outputs
            "top_p": 0.95,
            "top_k": 64,
            "max_output_tokens": 8192, # Increased for potentially longer responses from 1.5 Pro
        }
        
        # Use Gemini 1.5 Pro
        gemini_model = genai.GenerativeModel(model_name='gemini-2.5-pro-exp-03-25', generation_config=generation_config)
        print("Gemini model initialized successfully (gemini-2.5-pro-latest).")
    else:
        print("Error: GEMINI_API_KEY environment variable not set. Gemini features will be unavailable.")

except Exception as e:
    print(f"Error during Gemini configuration or model initialization: {e}")
    gemini_model = None


def check_fact_gemini(text):
    print(text)
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
        print(response.text)
        
        # Process the response
        try:
            # Extract JSON content from response
            content = response.text
            
            # --- ADDED: Clean up potential Markdown fences --- 
            if content.strip().startswith("```json"): # Check for starting fence
                content = content.strip()[7:] # Remove ```json
            if content.strip().endswith("```"): # Check for ending fence
                content = content.strip()[:-3] # Remove ```
            content = content.strip() # Remove any leading/trailing whitespace
            # --- END ADDED --- 
            
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
                "results": [formatted_result],  # Wrap in list for compatibility
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
