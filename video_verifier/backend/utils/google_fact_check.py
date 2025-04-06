import os
from googleapiclient.discovery import build
from google.auth import default # Keep this import
from google.auth.exceptions import DefaultCredentialsError # Keep this exception
from dotenv import load_dotenv
import spacy
import re # Keep re if used within spaCy steps, otherwise remove

# Load environment variables
load_dotenv()
FACT_CHECK_API_KEY = os.getenv("GOOGLE_FACT_CHECK_API_KEY")

# --- IMPORTANT: Use a spaCy model with word vectors for similarity ---
# Suggesting 'en_core_web_md'. User might need to run:
# python -m spacy download en_core_web_md
try:
    nlp = spacy.load('en_core_web_md') 
    print("Loaded spaCy model: en_core_web_md (for similarity)")
except OSError:
    print("spaCy 'en_core_web_md' model not found. Trying 'en_core_web_sm'. Similarity might be less accurate.")
    print("Please run: python -m spacy download en_core_web_md")
    try:
        nlp = spacy.load('en_core_web_sm')
    except OSError:
         print("Error: spaCy 'en_core_web_sm' model not found either. spaCy features disabled.")
         print("Please run: python -m spacy download en_core_web_sm")
         nlp = None # Disable spaCy features if models are missing

# Similarity Threshold
SIMILARITY_THRESHOLD = 0.50

def check_fact_google(query):
    """
    Checks facts using Google Fact Check Tools API and filters by NLP similarity.
    Returns only claims highly similar to the input query.
    """
    if not nlp:
         return {"relevant_claims": [], "error": "spaCy model not loaded. Cannot perform similarity check."}
         
    if not FACT_CHECK_API_KEY:
        return {"relevant_claims": [], "error": "FACT_CHECK_API_KEY not found."}
    if not query:
         return {"relevant_claims": [], "error": "No query provided."}

    try:
        print(f"Checking facts for query (length {len(query)} chars) using Google Fact Check API...")
        service = build("factchecktools", "v1alpha1", developerKey=FACT_CHECK_API_KEY)

        # Process the input query once for similarity comparison
        query_doc = nlp(query) 

        # Use spaCy to extract key phrases/sentences for API query if needed
        # (Keeping the previous logic for generating potential API queries)
        potential_api_queries = set()
        for ent in query_doc.ents:
            potential_api_queries.add(ent.text)
        for chunk in query_doc.noun_chunks:
            potential_api_queries.add(chunk.text)
        # Add full sentences too
        sentences = [sent.text.strip() for sent in query_doc.sents if len(sent.text.strip()) > 10]
        potential_api_queries.update(sentences)
        # Add original query as well
        potential_api_queries.add(query)

        all_api_claims = []
        processed_claim_texts = set() # Avoid processing duplicate claim texts from API

        for api_query in potential_api_queries:
            api_query = api_query.strip()
            if not api_query: continue
            if len(api_query) > 500: api_query = api_query[:500] # Limit API query length

            print(f"  - Querying API with: '{api_query[:50]}...'")
            request = service.claims().search(query=api_query)
            response = request.execute()
            
            # Collect unique claims based on text
            for claim in response.get('claims', []):
                 claim_text = claim.get('text')
                 if claim_text and claim_text not in processed_claim_texts:
                      all_api_claims.append(claim)
                      processed_claim_texts.add(claim_text)

        print(f"API returned {len(all_api_claims)} unique potential claims across all queries.")

        # --- Filter claims based on similarity to the original input query ---
        relevant_claims = []
        if not query_doc.has_vector:
             print("Warning: Input query doc has no vector. Cannot calculate similarity accurately (using sm model?).")
             # Fallback: Return all claims if vectors are missing? Or return error?
             # For now, let's return the error message as per the initial check.
             return {"relevant_claims": [], "error": "Input query has no vector (likely using 'sm' spaCy model). Cannot calculate similarity."}

        for claim in all_api_claims:
            claim_text = claim.get('text')
            if not claim_text: 
                continue

            claim_doc = nlp(claim_text)
            if not claim_doc.has_vector:
                 print(f"Warning: Claim text '{claim_text[:30]}...' has no vector. Skipping similarity check for this claim.")
                 continue # Skip claims without vectors

            similarity_score = query_doc.similarity(claim_doc)
            
            if similarity_score >= SIMILARITY_THRESHOLD:
                print(f"  - Relevant claim found (Similarity: {similarity_score:.2f}): '{claim_text[:60]}...'")
                relevant_claims.append({
                    "claim_data": claim, # The original claim object from Google API
                    "similarity_score": similarity_score
                })
        
        print(f"Found {len(relevant_claims)} claims relevant to the input query (Similarity >= {SIMILARITY_THRESHOLD}).")
        return {"relevant_claims": relevant_claims, "error": None}

    except DefaultCredentialsError as e:
         error_msg = f"Google Cloud Auth Error (Fact Check API): {e}"
         print(f"Error: {error_msg}")
         return {"relevant_claims": [], "error": error_msg}
    except ImportError: # Should not happen if google-api-python-client installed
         error_msg = "Google API Client library not found."
         print(f"Error: {error_msg}")
         return {"relevant_claims": [], "error": error_msg}
    except Exception as e:
        error_msg = f"An error occurred during Google Fact Check API call or similarity processing: {type(e).__name__}: {e}"
        print(f"Error: {error_msg}")
        return {"relevant_claims": [], "error": error_msg} 