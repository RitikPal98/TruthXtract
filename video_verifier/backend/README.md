# Video Verification Tool - Backend

This backend service powers the Video Verification Tool, providing advanced fact-checking capabilities through multiple verification sources including Google's Gemini AI.

## Features

- **Video Processing**: Extract frames, audio, and metadata from uploaded videos
- **Speech-to-Text Transcription**: Convert audio to text for analysis
- **Multi-source Fact Verification**:
  - **Gemini AI**: Advanced semantic analysis with source attribution
  - **Google Fact Check API**: Verification against established fact-checking databases 
  - **News Verification API**: Cross-checking against reputable news sources
- **Comprehensive Analysis**: Combined scoring system with weighting to prioritize more reliable sources

## Setup Instructions

### Prerequisites

- Python 3.8+ 
- Google Cloud account with activated Gemini API access
- API keys for:
  - Google Fact Check API
  - Google Gemini API (from Google AI Studio)
  - News API (optional)
  - Cloudinary (for media hosting)

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
# API Keys
NEWS_API_KEY=your_news_api_key
GOOGLE_FACT_CHECK_API_KEY=your_fact_check_api_key
GEMINI_API_KEY=your_gemini_api_key

# Cloudinary credentials
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Google Cloud credentials (optional, only if using service account authentication)
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account_file.json
```

### Installation

1. Install required dependencies:

```bash
pip install -r requirement.txt
```

2. If you haven't already, download the spaCy model:

```bash
python -m spacy download en_core_web_sm
```

3. Start the server:

```bash
python app.py
```

The server will start on http://localhost:5001 by default.

## API Endpoints

### POST /api/analyze-video

Analyzes a video for factual accuracy.

**Request Body:**
- Form data with `file` field containing the video file

**Response:**
```json
{
  "video_info": {
    "filename": "example.mp4",
    "duration": "00:05:23",
    "resolution": "1920x1080"
  },
  "transcript": "Full text transcription...",
  "transcript_analysis": {
    "analysis": {
      "fact_check_score": 0.78,
      "gemini_score": 0.85,
      "google_fact_check_score": 0.70,
      "external_verification_score": 0.75,
      "source_credibility": 0.82,
      "claims": [
        {
          "claim": "Example claim from video",
          "truth_score": 0.65,
          "sources": [
            {"url": "https://example.com/source", "title": "Source Title"}
          ]
        }
      ]
    }
  },
  "keyframes_urls": ["https://cloudinary.com/image1.jpg"]
}
```

## Gemini API Integration

The system uses Google's Gemini AI for advanced fact-checking capabilities. The integration analyzes the transcript and:

1. Identifies factual claims in the content
2. Verifies each claim against reliable sources
3. Provides truth scores with confidence ratings
4. Returns source attributions for verification

To optimize Gemini's fact-checking abilities, we:
- Use a lower temperature (0.2) for more deterministic/factual responses
- Structure prompts to encourage source citations
- Format responses as structured JSON for consistency
- Weight Gemini results more heavily than Google Fact Check API

## Troubleshooting

**"Error configuring Gemini API" message:**
- Verify your API key is correct in the `.env` file
- Ensure you have proper permissions and API quota available
- Check that you're using the correct API version

**Missing spaCy model error:**
- Run `python -m spacy download en_core_web_sm` to install the required model
