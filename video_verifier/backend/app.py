import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uuid
from utils.video_processing import (
    extract_keyframes, 
    extract_metadata,
    extract_audio, 
    transcribe_audio_google,
    check_fact_google,
    analyze_transcript,
    download_content_from_url,
    process_media_for_fact_checking
)

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

@app.route('/analyze', methods=['POST'])
def analyze_media():
    # Check if any media source is provided
    if 'video' not in request.files and 'image' not in request.files and 'url' not in request.form and 'media' not in request.files:
        return jsonify({"error": "No media file or URL provided"}), 400

    video_path = None  # Initialize video_path
    image_path = None  # Initialize image_path
    url = None        # Initialize URL
    audio_path = None  # Initialize audio_path
    results = {}
    transcript_data = {"transcript": None, "error": None}
    fact_check_data = {"claims": [], "error": None}
    media_type = "unknown"

    # Case 1: URL was provided
    if 'url' in request.form and request.form['url'].strip():
        url = request.form['url'].strip()
        print(f"Processing content from URL: {url}")
        
        # Use the enhanced process_media_for_fact_checking function which handles both images and videos
        media_result = process_media_for_fact_checking(url=url)
        
        # If there was an error processing the URL
        if 'error' in media_result:
            return jsonify({"error": media_result['error']}), 400
            
        # Add the URL processing result to our response
        results['url_analysis'] = media_result
        results['media_type'] = 'url'
        return jsonify(results)

    # Case 2: Media file (video or image) was uploaded
    elif 'media' in request.files:
        file = request.files['media']
        if file.filename == '':
            return jsonify({"error": "Empty file provided"}), 400
            
        # Determine file type based on extension
        _, ext = os.path.splitext(file.filename)
        ext = ext.lower()
        
        # Save the uploaded file temporarily
        temp_filename = str(uuid.uuid4()) + ext
        temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
        
        try:
            file.save(temp_path)
            print(f"Media saved to {temp_path}")
            
            # Handle based on file type
            if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                # Process as image
                image_path = temp_path
                media_type = "image"
                media_result = process_media_for_fact_checking(image_path=image_path)
                results['image_analysis'] = media_result
                results['media_type'] = 'image'
                return jsonify(results)
            else:
                # Process as video
                video_path = temp_path
                media_type = "video"
                
                # Metadata Extraction
                results['metadata'] = extract_metadata(video_path)
                
                # Keyframe Extraction
                results['keyframes'] = extract_keyframes(video_path, output_dir=KEYFRAMES_FOLDER)
                
        except Exception as e:
            print(f"Error processing media file: {e}")
            return jsonify({"error": f"Failed to process media: {str(e)}"}), 500
            
    # Case 3: Specific video file was uploaded (legacy support)
    elif 'video' in request.files:
        file = request.files['video']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Save the uploaded video temporarily
        _, ext = os.path.splitext(file.filename)
        temp_filename = str(uuid.uuid4()) + ext
        video_path = os.path.join(UPLOAD_FOLDER, temp_filename)
        media_type = "video"

        try:
            file.save(video_path)
            print(f"Video saved to {video_path}")

            # --- Metadata Extraction ---
            print("Extracting metadata...")
            results['metadata'] = extract_metadata(video_path)

            # --- Keyframe Extraction ---
            print("Extracting keyframes...")
            results['keyframes'] = extract_keyframes(video_path, output_dir=KEYFRAMES_FOLDER)

        except Exception as e:
            print(f"Error processing video: {e}")
            return jsonify({"error": f"Failed to process video: {str(e)}"}), 500
            
    # Case 4: Specific image file was uploaded
    elif 'image' in request.files:
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No selected image"}), 400
            
        # Save the uploaded image temporarily
        _, ext = os.path.splitext(file.filename)
        temp_filename = str(uuid.uuid4()) + ext
        image_path = os.path.join(UPLOAD_FOLDER, temp_filename)
        media_type = "image"
        
        try:
            file.save(image_path)
            print(f"Image saved to {image_path}")
            
            # Process the image with the enhanced function
            media_result = process_media_for_fact_checking(image_path=image_path)
            results['image_analysis'] = media_result
            results['media_type'] = 'image'
            return jsonify(results)
            
        except Exception as e:
            print(f"Error processing image: {e}")
            return jsonify({"error": f"Failed to process image: {str(e)}"}), 500

    # Process Video: Only run this section for videos
    if media_type == "video":
        # --- Audio Extraction --- 
        print("Extracting audio...")
        audio_path = extract_audio(video_path, output_dir=TEMP_AUDIO_FOLDER)
        
        # --- Transcription --- 
        if audio_path:
            print("Transcribing audio...")
            transcript_data = transcribe_audio_google(audio_path)
            results['transcription'] = transcript_data
        else:
            print("Audio extraction failed, trying alternative approach for video analysis...")
            # Try to get metadata as a fallback
            try:
                metadata = extract_metadata(video_path)
                title = metadata.get('title', os.path.basename(video_path))
                duration = metadata.get('duration', "Unknown")
                results['metadata'] = metadata
                
                # Generate a placeholder transcript for analysis
                placeholder_text = f"Video titled '{title}' with duration {duration}. No audio content could be extracted for transcription."
                transcript_data = {"transcript": placeholder_text, "error": "Audio extraction failed but proceeding with limited analysis."}
                results['transcription'] = transcript_data
                print(f"Generated placeholder analysis for video: {placeholder_text}")
            except Exception as meta_error:
                print(f"Failed to extract metadata as fallback: {meta_error}")
                results['transcription'] = {"transcript": None, "error": "Audio could not be extracted or video has no audio track."}

        # --- Fact Checking --- 
        if transcript_data['transcript']:
            print("Performing fact check...")
            # Basic fact checking (original method)
            fact_check_data = check_fact_google(transcript_data['transcript'])
            results['fact_checks'] = fact_check_data
            
            # Comprehensive transcript analysis with multiple verification methods
            print("Performing comprehensive transcript analysis...")
            transcript_analysis = analyze_transcript(
                transcript_data['transcript'],
                results['metadata'] if 'metadata' in results else None
            )
            results['transcript_analysis'] = transcript_analysis
        else:
             results['fact_checks'] = {"claims": [], "error": "Fact check skipped: No transcript available."}
             results['transcript_analysis'] = {
                 "verification_score": 0.5,
                 "confidence": 0.0,
                 "analysis": {"error": "Analysis skipped: No transcript available."}
             }

        # Clean up uploaded video (optional: keep for debugging)
        if video_path and os.path.exists(video_path):
            try:
                os.remove(video_path)
                print(f"Removed temporary video file: {video_path}")
            except OSError as e:
                print(f"Warning: Could not remove temporary video file {video_path}: {e}")
        # Audio is cleaned up within transcribe_audio_google
        
        results['media_type'] = 'video'

    return jsonify(results)

# Serve keyframe images
# Flask automatically serves files from `static_folder` (`../keyframes`) 
# under the `static_url_path` (`/keyframes`). No extra route needed if configured correctly.

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
