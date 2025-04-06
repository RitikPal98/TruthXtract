import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uuid
import requests
from bs4 import BeautifulSoup
from utils.video_processing import (
    extract_keyframes, 
    extract_metadata,
    extract_audio,
    extract_text_from_image_azure, 
    transcribe_audio_google,
    check_fact_google,
    analyze_transcript,
    download_content_from_url,
    check_fact_gemini
)
import cloudinary

app = Flask(__name__, static_folder='../keyframes', static_url_path='/keyframes')
CORS(app) # Enable CORS for all routes

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
TEMP_AUDIO_FOLDER = os.path.join(os.path.dirname(__file__), 'temp_audio') # Defined in utils too
KEYFRAMES_FOLDER = os.path.join(os.path.dirname(__file__), '../keyframes')

# Ensure directories exist (redundant with utils but safe)
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(TEMP_AUDIO_FOLDER):
    os.makedirs(TEMP_AUDIO_FOLDER)
if not os.path.exists(KEYFRAMES_FOLDER):
    os.makedirs(KEYFRAMES_FOLDER)

print(f"UPLOAD_FOLDER absolute path: {os.path.abspath(UPLOAD_FOLDER)}") # Add logging

# Route to serve uploaded files
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/analyze', methods=['POST'])
def analyze_media():
    # Check if any media source is provided
    if 'video' not in request.files and 'image' not in request.files and 'url' not in request.form and 'media' not in request.files:
        return jsonify({"error": "No media file or URL provided"}), 400

    video_path = None  # Initialize video_path
    image_path = None  # Initialize image_path
    url = None        # Initialize URL
    audio_path = None  # Initialize audio_path
    results = {} # Initialize results dict for the response
    transcript_data = {"transcript": None, "error": None}
    fact_check_data = {"claims": [], "error": None}
    media_type = "unknown"
    uploaded_video_filename = None # Store filename if video is uploaded
    original_url = None # Initialize original_url

    # Determine input type and get initial file path
    # -------------------------------------------------
    try:
        if 'url' in request.form and request.form['url'].strip():
            url = request.form['url'].strip()
            print(f"Processing content from URL: {url}")
            
            # Download content from URL to UPLOAD_FOLDER
            downloaded_path = download_content_from_url(url, UPLOAD_FOLDER)
            
            if not downloaded_path:
                return jsonify({"error": "Failed to download content from URL."}), 400
            
            # Check downloaded file type
            _, ext = os.path.splitext(downloaded_path)
            ext = ext.lower()
            common_video_exts = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv']
            common_image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']

            if ext in common_video_exts:
                video_path = downloaded_path
                media_type = "video"
                uploaded_video_filename = os.path.basename(video_path) # Mark for serving
                print(f"Downloaded video from URL: {video_path}")
                original_url = url # Set original_url
            elif ext in common_image_exts:
                image_path = downloaded_path
                media_type = "image"
                print(f"Downloaded image from URL: {image_path}")
            else:
                 # Clean up unsupported file
                 if os.path.exists(downloaded_path):
                     os.remove(downloaded_path)
                 return jsonify({"error": f"Unsupported file type downloaded from URL: {ext}"}), 400

        elif 'media' in request.files:
            file = request.files['media']
            if file.filename == '':
                return jsonify({"error": "Empty file provided"}), 400
            
            # Determine file type based on extension
            _, ext = os.path.splitext(file.filename)
            ext = ext.lower()
            temp_filename = str(uuid.uuid4()) + ext
            temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
            file.save(temp_path)
            print(f"Media saved to {temp_path}")
            
            common_video_exts = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'] # Redefine locally
            common_image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'] # Redefine locally

            if ext in common_video_exts:
                video_path = temp_path
                media_type = "video"
                uploaded_video_filename = temp_filename # Store the filename for serving
                original_url = None # Reset original_url
            elif ext in common_image_exts:
                image_path = temp_path
                media_type = "image"
                original_url = None # Reset original_url
            else:
                 # Clean up unsupported file
                 if os.path.exists(temp_path):
                     os.remove(temp_path)
                 return jsonify({"error": f"Unsupported file type uploaded: {ext}"}), 400

        # Legacy support (Treat 'video' and 'image' uploads like 'media')
        elif 'video' in request.files:
            file = request.files['video']
            if file.filename == '': return jsonify({"error": "No selected file"}), 400
            _, ext = os.path.splitext(file.filename)
            temp_filename = str(uuid.uuid4()) + ext
            video_path = os.path.join(UPLOAD_FOLDER, temp_filename)
            file.save(video_path)
            media_type = "video"
            uploaded_video_filename = temp_filename
            print(f"Video saved to {video_path}")
            original_url = None # Reset original_url
        elif 'image' in request.files:
            file = request.files['image']
            if file.filename == '': return jsonify({"error": "No selected image"}), 400
            _, ext = os.path.splitext(file.filename)
            temp_filename = str(uuid.uuid4()) + ext
            image_path = os.path.join(UPLOAD_FOLDER, temp_filename)
            file.save(image_path)
            media_type = "image"
            print(f"Image saved to {image_path}")
            original_url = None # Reset original_url
        
    except Exception as setup_error:
        print(f"Error during file setup/download: {setup_error}")
        return jsonify({"error": f"Failed during setup: {str(setup_error)}"}), 500

    # Process based on determined media type
    # --------------------------------------
    try:
        if media_type == "video":
            print("--- Processing Video --- ")
            if not video_path:
                 return jsonify({"error": "Video processing error: Video path not set."}), 500
                
            # --- Metadata Extraction ---
            print("Extracting metadata...")
            results['metadata'] = extract_metadata(video_path)

            # --- Attempt to get metadata from original URL (if provided) ---
            if original_url: # Check if analysis was triggered by URL
                try:
                    print(f"Attempting to fetch title from original URL: {original_url}")
                    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}
                    response = requests.get(original_url, headers=headers, timeout=10, allow_redirects=True)
                    response.raise_for_status() # Raise an exception for bad status codes

                    if 'text/html' in response.headers.get('Content-Type', '').lower():
                        soup = BeautifulSoup(response.content, 'html.parser')
                        title_tag = soup.find('title')
                        if title_tag and title_tag.string:
                            original_title = title_tag.string.strip()
                            print(f"Found title from URL: {original_title}")
                            if isinstance(results.get('metadata'), dict):
                                results['metadata']['original_url_title'] = original_title
                            else:
                                results['metadata'] = {'original_url_title': original_title}
                        else:
                            print("Could not find title tag in HTML from original URL.")
                    else:
                        print("Original URL content is not HTML, skipping title extraction.")

                except requests.exceptions.RequestException as req_err:
                    print(f"Error fetching original URL {original_url}: {req_err}")
                except Exception as html_err:
                    print(f"Error parsing HTML from {original_url}: {html_err}")

            # --- Keyframe Extraction ---
            print("Extracting keyframes...")
            results['keyframes'] = extract_keyframes(video_path, output_dir=KEYFRAMES_FOLDER)
            
            # --- Audio Extraction & Transcription --- 
            print("Extracting audio...")
            # NOTE: TEMP_AUDIO_FOLDER is defined globally
            audio_path = extract_audio(video_path, output_dir=TEMP_AUDIO_FOLDER)
            transcript_data = {"transcript": None, "error": None} # Reset transcript data
            if audio_path:
                print("Transcribing audio...")
                transcript_data = transcribe_audio_google(audio_path)
                results['transcription'] = transcript_data
                # Audio is cleaned up within transcribe_audio_google
            else:
                print("Audio extraction failed or no audio track.")
                # Generate placeholder transcript using metadata if available
                try:
                    metadata = results.get('metadata', extract_metadata(video_path))
                    title = metadata.get('title', os.path.basename(video_path))
                    duration = metadata.get('duration', "Unknown")
                    placeholder_text = f"Video titled '{title}' with duration {duration}. No audio content could be extracted for transcription."
                    transcript_data = {"transcript": placeholder_text, "error": "Audio extraction failed but proceeding with limited analysis."}
                    results['transcription'] = transcript_data
                    print(f"Generated placeholder analysis for video: {placeholder_text}")
                except Exception as meta_fallback_error:
                    print(f"Failed to get metadata for placeholder: {meta_fallback_error}")
                    results['transcription'] = {"transcript": None, "error": "Audio could not be extracted or video has no audio track."}

            # --- Fact Checking & Analysis --- 
            if transcript_data and transcript_data['transcript']:
                print("Performing transcript analysis...")
                # Call comprehensive analysis function
                transcript_analysis = analyze_transcript(
                    transcript_data['transcript'],
                    results.get('metadata') # Pass metadata if already extracted
                )
                results['transcript_analysis'] = transcript_analysis
                # Optional: Add back basic Google Fact Check if needed
                # fact_check_data = check_fact_google(transcript_data['transcript'])
                # results['fact_checks'] = fact_check_data
            else:
                 print("Skipping fact check/analysis: No transcript available.")
                 # results['fact_checks'] = {"claims": [], "error": "Fact check skipped: No transcript available."}
                 results['transcript_analysis'] = {
                     "verification_score": 0.5,
                     "confidence": 0.0,
                     "analysis": {"error": "Analysis skipped: No transcript available."}
                 }

            # Add video URL if it needs serving (set earlier for uploads/URL downloads)
            if uploaded_video_filename:
                results['video_url'] = f'/uploads/{uploaded_video_filename}'

            # Cleanup - Delete the main video file ONLY if it was downloaded from a URL
            # and we are NOT serving it (uploaded_video_filename is None). 
            # Currently, we serve all downloaded videos, so no cleanup here.
            # Add specific cleanup logic if needed for non-served URL downloads.
            
            results['media_type'] = 'video'

        elif media_type == "image":
            print("--- Processing Image --- ")
            if not image_path:
                 return jsonify({"error": "Image processing error: Image path not set."}), 500
            
            temp_image_path = image_path # Keep track of the temporary local path
            cloudinary_url = None
            ocr_text = ""

            try:
                # 1. Upload the image to Cloudinary FIRST
                print(f"Uploading image {temp_image_path} to Cloudinary...")
                try:
                    upload_result = cloudinary.uploader.upload(
                        temp_image_path,
                        folder="truthxtract_uploads" # Optional: specify a folder in Cloudinary
                    )
                    cloudinary_url = upload_result.get('secure_url')
                    if cloudinary_url:
                        print(f"Image uploaded to Cloudinary: {cloudinary_url}")
                        results['image_url'] = cloudinary_url # Use the public Cloudinary URL
                    else:
                        print("Warning: Cloudinary upload succeeded but no secure_url received.")
                        results['image_url'] = None # Indicate URL is not available
                        cloudinary_url = None # Ensure cloudinary_url is None
                except Exception as upload_error:
                    print(f"Error uploading image to Cloudinary: {upload_error}")
                    results['image_url'] = None # Indicate URL is not available
                    cloudinary_url = None # Ensure cloudinary_url is None
                    # Optionally add this error to the main results error field
                    results['error'] = results.get('error', '') + f" Cloudinary upload failed: {upload_error};" 
                
                # 2. Extract Text using OCR from the Cloudinary URL (if available)
                if cloudinary_url:
                     print(f"Extracting text from Cloudinary URL: {cloudinary_url}")
                     ocr_text = extract_text_from_image_azure(cloudinary_url) # Pass URL
                     results['ocr_text'] = ocr_text if ocr_text else "No text found in image."
                     print(f"OCR Result: {results['ocr_text'][:100]}...")
                else:
                     print("Skipping OCR because Cloudinary upload failed or returned no URL.")
                     ocr_text = "" # Ensure ocr_text is empty if no URL
                     results['ocr_text'] = "OCR skipped: Image upload failed."

                # 3. Perform analysis on the extracted text (if any)
                if ocr_text and len(ocr_text.strip()) >= 10:
                    print(f"Running Gemini check on OCR text ({len(ocr_text)} chars)...")
                    # Store Gemini result under a specific key
                    ocr_analysis_result = check_fact_gemini(ocr_text)
                    results['ocr_analysis'] = ocr_analysis_result 
                else:
                    print("Skipping analysis on OCR text (insufficient text found).")
                    results['ocr_analysis'] = {
                        "verification_score": 0.5, 
                        "confidence": 0.0, 
                        "results": [], 
                        "error": "Analysis skipped: Insufficient text found via OCR."
                    }
                
                results['media_type'] = 'image'

            finally:
                 # 4. Clean up the temporary local image file
                 if temp_image_path and os.path.exists(temp_image_path):
                     try:
                         os.remove(temp_image_path)
                         print(f"Removed temporary image file: {temp_image_path}")
                     except OSError as e:
                         print(f"Warning: Could not remove temporary image file {temp_image_path}: {e}")

        else:
            return jsonify({"error": "Unknown or unsupported media type for processing."}), 500

    except Exception as processing_error:
         print(f"Error during media processing: {processing_error}")
         # Add video/image URL if processing failed mid-way but file exists
         if uploaded_video_filename:
             results['video_url'] = f'/uploads/{uploaded_video_filename}'
         elif media_type == "image" and image_path:
             results['image_url'] = f'/uploads/{os.path.basename(image_path)}'
         results['error'] = f"Processing failed: {str(processing_error)}"
         return jsonify(results), 500

    return jsonify(results)

# Serve keyframe images
# Flask automatically serves files from `static_folder` (`../keyframes`) 
# under the `static_url_path` (`/keyframes`). No extra route needed if configured correctly.

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
