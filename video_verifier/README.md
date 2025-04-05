# Video Verifier Tool Prototype

This project is a basic prototype for an AI-powered video verification tool, similar in concept to InVID/WeVerify.

## Features

*   **Video Upload:** Upload video files via a web interface.
*   **Keyframe Extraction:** Automatically extracts keyframes using OpenCV.
*   **Metadata Analysis:** Extracts video metadata using Hachoir.
*   **Web Dashboard:** Displays extracted metadata and keyframes.
*   **Reverse Image Search Links:** Provides quick links to search keyframes on Google Lens, TinEye, and Yandex.

## Project Structure

```
video_verifier/
├── backend/
│   ├── uploads/          # Temporary storage for uploaded videos
│   ├── utils/
│   │   └── video_processing.py # Handles OpenCV & Hachoir logic
│   ├── app.py            # Flask API server
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── public/
│   │   └── index.html    # Main HTML file
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   └── index.js      # React entry point
│   └── package.json      # Node.js dependencies
├── keyframes/            # Storage for extracted keyframes (shared)
└── README.md             # This file
```

## Prerequisites

1.  **Python 3.x:** Ensure Python is installed.
2.  **Node.js and npm/yarn:** For running the React frontend.
3.  **Python Libraries:** All required backend libraries (`Flask`, `opencv-python`, `hachoir`, etc.) are listed in `requirements.txt` and installed via `pip`. No external tools like FFmpeg/ExifTool need to be installed separately.

## Setup and Running

**1. Backend Setup (Flask):**

   ```bash
   # Navigate to the backend directory
   cd backend

   # Create a virtual environment (optional but recommended)
   python -m venv venv
   # Activate the virtual environment
   # Windows
   .\venv\Scripts\activate
   # macOS/Linux
   # source venv/bin/activate

   # Install Python dependencies
   pip install -r requirements.txt

   # Run the Flask server
   python app.py
   ```

   The backend server will start (usually on `http://localhost:5001`).

**2. Frontend Setup (React):**

   Open a *new terminal* or command prompt.

   ```bash
   # Navigate to the frontend directory
   cd frontend

   # Install Node.js dependencies
   npm install
   # or: yarn install

   # Start the React development server
   npm start
   # or: yarn start
   ```

   The frontend application will open in your browser (usually at `http://localhost:3000`).

**3. Usage:**

*   Open the web application in your browser (`http://localhost:3000`).
*   Click the "Browse" or "Choose File" button to select a video file.
*   Click "Analyze Video".
*   Wait for the analysis to complete. Results (metadata and keyframes) will be displayed.
*   Click on keyframe images to view them larger or use the reverse image search links.

## Important Notes

*   **Error Handling:** The current error handling is basic. Check the console logs in both the backend terminal and the browser's developer tools for more details if issues occur.
*   **Python Dependencies:** Ensure all Python libraries listed in `requirements.txt` are installed correctly using `pip install -r requirements.txt`. Installation issues with `opencv-python` or `hachoir` might arise depending on your system configuration (they may require specific build tools or compatible C++ libraries).
*   **Scalability:** This is a prototype. For production, consider more robust error handling, task queues (like Celery) for long-running video processing, proper security measures, and a more scalable way to store/serve files.
*   **Reverse Image Search:** The links directly open the search engine results. Full automation (scraping results) is more complex and may violate terms of service.
*   **AI Scene Detection:** This prototype uses fixed-interval frame extraction. Integrating AI scene detection (like SBDNet) or more advanced OpenCV techniques would require additional code.
