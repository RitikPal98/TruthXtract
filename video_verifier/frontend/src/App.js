import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

// IMPORTANT: Replace with your actual backend URL if different
const BACKEND_URL = 'http://localhost:5001'; 

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [url, setUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showKeyframeModal, setShowKeyframeModal] = useState(false);
  const fileInputRef = useRef(null);
  
  // Initialize dark mode based on user preference
  useEffect(() => {
    // Default to light mode instead of checking system preference
    setDarkMode(false);
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Clear previous media and URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setUrl(''); // Clear URL input
      // Only set preview URL for video files
      if (file.type.startsWith('video/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      setAnalysisResult(null);
      setError(null);
    }
  };
  
  // Handle drag and drop functionality
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // Check if file is image or video
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        // Clear previous media and URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(file);
        setUrl(''); // Clear URL input
        setPreviewUrl(URL.createObjectURL(file));
        setAnalysisResult(null);
        setError(null);
      } else {
        setError('Please drop an image or video file.');
      }
    }
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleMediaUpload = useCallback(async () => {
    if (!selectedFile && !url) {
      setError('Please select a file or enter a URL first.');
      return;
    }

    // Clear previous media if switching from file to URL or vice versa
    if (url && selectedFile) {
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append('media', selectedFile);
    } else if (url) {
      formData.append('url', url);
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAnalysisResult(response.data);
      console.log("Analysis successful:", response.data);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to analyze media.';
      setError(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, url, previewUrl]);

  // Function to generate reverse image search URLs
  const getReverseImageSearchUrl = (imageUrl, engine) => {
    const encodedUrl = encodeURIComponent(imageUrl);
    switch (engine) {
      case 'google':
        return `https://lens.google.com/uploadbyurl?url=${encodedUrl}`;
      case 'tineye':
        return `https://tineye.com/search?url=${encodedUrl}`;
      case 'yandex':
        return `https://yandex.com/images/search?rpt=imageview&url=${encodedUrl}`;
      default:
        return '#';
    }
  };

  // Helper function to determine progress bar color based on verification score
  const getScoreColorClass = (score) => {
    if (score >= 0.7) return 'bg-green-500'; // Likely true
    if (score >= 0.5) return 'bg-yellow-500'; // Uncertain
    return 'bg-red-500'; // Likely false
  };

  // Helper function to determine text color based on verification score
  const getScoreTextColorClass = (score) => {
    if (score >= 0.7) return 'text-green-600'; // Likely true
    if (score >= 0.5) return 'text-yellow-600'; // Uncertain
    return 'text-red-600'; // Likely false
  };

  // Function to handle keyframe selection for Google search
  const handleKeyframeSearch = (imageUrl) => {
    window.open(getReverseImageSearchUrl(imageUrl, 'google'), '_blank');
    setShowKeyframeModal(false);
  };

  return (
    <div className={`min-h-screen p-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div 
        className="container mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-10" 
        style={{
          backgroundColor: darkMode ? '#1e1e1e' : 'white',
          boxShadow: darkMode ? '0 10px 25px rgba(0, 0, 0, 0.3)' : '0 10px 25px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          width: '95%',
          maxWidth: '1400px'
        }}
      >
        <div className="flex justify-end mb-4">
          <button 
            onClick={toggleDarkMode} 
            className={`p-2 rounded-full transition-colors duration-300 ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-blue-100 text-blue-800'}`}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
        
        <h1 className="text-5xl font-bold text-center mb-4">
          <span className="inline-block" style={{ 
            background: 'linear-gradient(to right, #4f46e5, #3b82f6, #0ea5e9, #06b6d4, #10b981)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: darkMode ? '0 0 15px rgba(59, 130, 246, 0.5)' : '0 0 15px rgba(59, 130, 246, 0.3)',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            boxDecorationBreak: 'clone',
          }}>
            Media Verification Tool
          </span>
        </h1>
        
        <p className={`text-center text-2xl mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Upload images, videos, or enter links for media verification</p>

        {/* Media Upload Section */} 
        <div 
          className={`mb-6 p-8 rounded-xl transition-all duration-300 relative ${
            darkMode ? 'bg-gray-800/50' : 'bg-white'
          }`}
          style={{
            border: `${isDragging ? '3px' : '2px'} dashed ${
              isDragging 
                ? (darkMode ? '#3B82F6' : '#3B82F6') 
                : (darkMode ? '#3B82F6' : '#3B82F6')
            }`,
            transform: isDragging ? 'scale(1.02)' : 'scale(1)',
            boxShadow: isDragging 
              ? (darkMode ? '0 8px 30px rgba(59, 130, 246, 0.2)' : '0 8px 30px rgba(59, 130, 246, 0.2)') 
              : (darkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)')
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label htmlFor="media-upload" className={`block text-2xl font-medium mb-6 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Upload Image/Video File or Enter URL
          </label>
          
          <div 
            className={`flex flex-col items-center justify-center p-8 mb-6 rounded-xl cursor-pointer transition-all duration-300 ${
              isDragging ? 'scale-105' : ''
            } ${
              darkMode 
                ? 'bg-gray-900/50 hover:bg-gray-900/70' 
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
            style={{
              border: `2px dashed ${
                isDragging 
                  ? (darkMode ? '#3B82F6' : '#3B82F6') 
                  : (darkMode ? '#3B82F6' : '#3B82F6')
              }`,
              boxShadow: isDragging 
                ? '0 8px 30px rgba(59, 130, 246, 0.2)' 
                : 'none'
            }}
            onClick={() => fileInputRef.current.click()}
          >
            <svg className={`w-16 h-16 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-transform duration-300 transform ${isDragging ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className={`mb-2 text-2xl font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Click to upload or drag and drop
            </p>
            <p className={`text-base ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Supports images and videos
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            id="media-upload"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex items-center my-8">
            <div className={`flex-grow border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}></div>
            <span className={`px-6 text-2xl font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>OR</span>
            <div className={`flex-grow border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}></div>
          </div>
          
          <div className="flex">
          <input
            type="text"
            value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (selectedFile) {
                  setSelectedFile(null);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }
                setAnalysisResult(null);
                setError(null);
              }}
              placeholder="Enter media URL"
              className={`flex-grow p-4 text-2xl rounded-l-xl focus:outline-none transition-all duration-300 ${
                darkMode 
                  ? 'bg-gray-900/50 text-white placeholder-gray-500 focus:bg-gray-900/70' 
                  : 'bg-gray-50 text-gray-700 placeholder-gray-400 focus:bg-white'
              }`}
              style={{
                border: `2px solid ${darkMode ? '#4B5563' : '#E5E7EB'}`,
                borderRight: 'none',
                boxShadow: 'none'
              }}
            />
            <button
              onClick={() => {
                if (url) {
                  setSelectedFile(null);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                  setAnalysisResult(null);
                  setError(null);
                  
                  // Handle YouTube URLs
                  const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
                  const match = url.match(youtubeRegex);
                  
                  if (match && match[1]) {
                    // Create embedded YouTube URL
                    const youtubeEmbedUrl = `https://www.youtube.com/embed/${match[1]}`;
                    setPreviewUrl(youtubeEmbedUrl);
                  } 
                  // Regular image URL handling
                  else if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
                    setPreviewUrl(url);
                  }
                  // For other video formats or URLs
                  else {
                    setPreviewUrl(url);
                  }
                }
              }}
              className={`font-bold py-4 px-8 rounded-r-xl transition-all duration-300 text-2xl ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              style={{
                border: `2px solid ${darkMode ? '#2563EB' : '#3B82F6'}`,
                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.1)'
              }}
            >
              Preview
            </button>
          </div>
          
          {previewUrl && (
            <div className="mt-8">
              {selectedFile && (
                <p className={`text-2xl mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Selected: <span className="font-medium">{selectedFile.name}</span>
                </p>
              )}
              <div className={`rounded-xl overflow-hidden border-2 ${
                darkMode ? 'border-gray-600' : 'border-gray-300'
              }`}>
                {previewUrl.includes('youtube.com/embed/') ? (
                  <div className="relative pt-[56.25%]"> {/* 16:9 aspect ratio */}
                    <iframe 
                      className="absolute top-0 left-0 w-full h-full"
                      src={previewUrl}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : previewUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img src={previewUrl} alt="Preview" className="max-w-full h-auto" />
                ) : (
                  <video controls width="100%" src={previewUrl} className="max-w-full">
                Your browser does not support the video tag.
              </video>
                )}
              </div>
            </div>
          )}
          {selectedFile && !previewUrl && (
            <div className="mt-8">
              <p className={`text-2xl mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Selected: <span className="font-medium">{selectedFile.name}</span>
              </p>
            </div>
          )}
          
          <button
            onClick={handleMediaUpload}
            disabled={isLoading || (!selectedFile && !url)}
            className={`mt-8 w-full py-4 px-8 rounded-xl font-bold text-2xl transition-all duration-300 transform hover:translate-y-[-2px] ${
              isLoading || (!selectedFile && !url)
                ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
            }`}
            style={{
              boxShadow: isLoading || (!selectedFile && !url)
                ? 'none'
                : '0 4px 20px rgba(59, 130, 246, 0.3)'
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </div>
            ) : 'Analyze Media'}
          </button>
        </div>

        {/* Error Display */} 
        {error && (
          <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-2xl ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
          </div>
        )}

        {/* Analysis Results Section */} 
        {analysisResult && (
          <div className="mt-8">
            <h2 className="text-3xl font-semibold text-gray-700 mb-4">Analysis Results ({analysisResult.media_type?.toUpperCase()})</h2>

            {/* Display Uploaded Image Section (Image Only) */}
            {analysisResult.media_type === 'image' && analysisResult.image_url && (
              <div className={`mb-6`}> 
                  <h3 className={`text-2xl font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Uploaded Image</h3>
                  <div className="flex justify-center mb-3"> 
                <img 
                  src={analysisResult.image_url}
                  alt="Uploaded content" 
                        className="max-w-2xl mx-auto h-auto object-contain rounded"
                     />
                  </div>
                  <div className="text-center space-x-3 mt-2">
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reverse Search:</span>
                    <a href={getReverseImageSearchUrl(analysisResult.image_url, 'google')} target="_blank" rel="noopener noreferrer" className={`text-sm hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Google Lens</a>
                    <a href={getReverseImageSearchUrl(analysisResult.image_url, 'tineye')} target="_blank" rel="noopener noreferrer" className={`text-sm hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>TinEye</a>
                    <a href={getReverseImageSearchUrl(analysisResult.image_url, 'yandex')} target="_blank" rel="noopener noreferrer" className={`text-sm hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Yandex</a>
                </div>
              </div>
            )}

            {/* --- START: Unified Sections --- */}

            {/* Metadata Section (Show for Both) */}
            {analysisResult.metadata && (
              <div className={`mb-6 p-4 rounded-lg border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className={`text-2xl font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Media Metadata</h3>
                {analysisResult.metadata && typeof analysisResult.metadata === 'object' && Object.keys(analysisResult.metadata).length > 0 && !analysisResult.metadata.Error ? (
                  <pre className="text-lg bg-white p-3 rounded border border-gray-300 overflow-x-auto">
                     {JSON.stringify(analysisResult.metadata, null, 2)}
                   </pre>
                 ) : (
                  <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {analysisResult.metadata?.Error 
                          ? `Metadata extraction failed: ${analysisResult.metadata.Error}` 
                          : 'No metadata extracted or metadata is empty.'}
                  </p>
                  )}
               </div>
            )}

            {/* Extracted Text Section (Conditional Title and Content) */}
            {(analysisResult.media_type === 'image' && analysisResult.ocr_text) || (analysisResult.media_type === 'video' && analysisResult.transcription) ? (
              <div className={`mb-10 p-4 rounded-lg border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className={`text-2xl font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {analysisResult.media_type === 'image' ? 'Extracted Text (OCR)' : 'Transcription (Google STT)'}
                </h3>
                {analysisResult.media_type === 'image' ? (
                   typeof analysisResult.ocr_text === 'string' && analysisResult.ocr_text.length > 0 && !analysisResult.ocr_text.startsWith('Error:') ? (
                     <p className={`text-xl whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>{analysisResult.ocr_text}</p>
                   ) : (
                     <p className={`text-xl italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{analysisResult.ocr_text || "No text extracted or extraction failed."}</p>
                   )
                 ) : (
                    analysisResult.transcription ? (
                        analysisResult.transcription.transcript ? (
                           <p className={`text-xl whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>{analysisResult.transcription.transcript}</p>
                         ) : (
                           <p className={`text-xl italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{analysisResult.transcription.error || 'No transcript generated.'}</p>
                         )
                     ) : (
                       <p className={`text-xl italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Transcription not available.</p>
                     )
                 )}
              </div>
            ) : null}

            {/* Keyframes Section (Video Only) */}
            {analysisResult.media_type === 'video' && (
                <div className={`bg-gray-50 p-4 rounded-lg border border-gray-200 mb-10 ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className={`text-2xl font-medium text-gray-800 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Extracted Keyframes</h3>
                    {analysisResult.keyframes && analysisResult.keyframes.length > 0 && (
                      <button 
                        onClick={() => setShowKeyframeModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center transition-all duration-300 shadow-md hover:shadow-lg text-xl font-medium"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                        </svg>
                        Google Reverse Image Search
                      </button>
                    )}
                  </div>
                  
                {analysisResult.keyframes && analysisResult.keyframes.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {analysisResult.keyframes.map((keyframePath, index) => {
                      const isCloudinaryUrl = keyframePath.startsWith('http');
                      const imageUrl = isCloudinaryUrl ? keyframePath : `${BACKEND_URL}/${keyframePath.replace(/\\/g, '/')}`;
                      let displayName;
                      if (isCloudinaryUrl) {
                        const urlParts = keyframePath.split('/');
                          displayName = urlParts[urlParts.length - 1].split('.')[0];
                      } else {
                        displayName = keyframePath.split('/').pop().split('\\').pop();
                      }
                      
                      return (
                          <div key={index} className={`border rounded-lg overflow-hidden shadow-sm p-2 text-center ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                          <img 
                              src={imageUrl} 
                              alt={`Keyframe ${index + 1}`} 
                              className="w-full h-auto object-cover mb-2 cursor-pointer hover:opacity-80 transition-opacity" 
                                onClick={() => window.open(imageUrl, '_blank')} 
                          />
                            <p className={`text-lg truncate ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{displayName}</p>
                           <div className="mt-2 space-x-1">
                                 <a href={getReverseImageSearchUrl(imageUrl, 'tineye')} target="_blank" rel="noopener noreferrer" className={`text-lg hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>TinEye</a>
                                 <a href={getReverseImageSearchUrl(imageUrl, 'yandex')} target="_blank" rel="noopener noreferrer" className={`text-lg hover:underline ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>Yandex</a>
                           </div>
                        </div>
                      );
                      })}
                  </div>
                ) : (
                    <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No keyframes extracted or keyframe extraction failed.</p>
                )}
                {(!analysisResult.keyframes || analysisResult.keyframes.length === 0) && analysisResult.metadata?.Error?.includes('ffmpeg') && (
                       <p className="text-lg text-red-600 mt-2">Keyframe extraction failed: Could not run ffmpeg.</p>
                )}
              </div>
            )}

            {/* Keyframe Selection Modal (Video Only) */}
            {analysisResult.media_type === 'video' && showKeyframeModal && analysisResult.keyframes && analysisResult.keyframes.length > 0 && (
               <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowKeyframeModal(false)}>
                 <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">Select Keyframe for Google Search</h3>
                     <button 
                       onClick={() => setShowKeyframeModal(false)}
                       className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                       </svg>
                     </button>
              </div>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                     {analysisResult.keyframes.map((keyframePath, index) => {
                       const isCloudinaryUrl = keyframePath.startsWith('http');
                       const imageUrl = isCloudinaryUrl ? keyframePath : `${BACKEND_URL}/${keyframePath.replace(/\\/g, '/')}`;
                       
                       return (
                         <div 
                           key={index} 
                           className="border rounded-lg overflow-hidden shadow hover:shadow-md transition-all cursor-pointer transform hover:scale-105"
                           onClick={() => handleKeyframeSearch(imageUrl)}
                         >
                           <img src={imageUrl} alt={`Keyframe ${index + 1}`} className="w-full h-auto" />
                           <div className="p-2 bg-blue-50 text-center">
                             <p className="text-blue-600 font-medium">Search frame {index + 1}</p>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
              </div>
            )}

            {/* Unified Fact Checking Analysis Section */}
            {(analysisResult.ocr_analysis || analysisResult.transcript_analysis) && (
              <div className={`p-4 rounded-lg border mb-10 ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className={`text-2xl font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Fact-Checking Analysis</h3>
                
                {(() => {
                   // Determine the correct analysis object based on media type
                  const analysisData = analysisResult.media_type === 'image' 
                                        ? analysisResult.ocr_analysis 
                                        : analysisResult.transcript_analysis;
                   
                   // Exit early if no relevant analysis data
                   if (!analysisData) return <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fact-checking data not available.</p>;
                   
                   const verificationScore = analysisData.verification_score;
                   const confidence = analysisData.confidence;
                   const analysisDetails = analysisData.analysis; // Nested details object

                  return (
                    <>
                        {/* Verification Score */}
                        <div className="mb-4">
                          <h4 className={`text-xl font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Verification Score</h4>
                          {typeof verificationScore === 'number' ? (
                              <>
                                <div className={`mt-2 w-full rounded-full h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                  <div 
                                    className={`h-4 rounded-full ${getScoreColorClass(verificationScore)}`}
                                    style={{ width: `${(verificationScore ?? 0.5) * 100}%` }}
                            ></div>
                          </div>
                                <div className="flex justify-between mt-1 text-xl">
                                  <span className="text-red-500">False</span>
                                  <span className="text-yellow-500">Uncertain</span>
                                  <span className="text-green-500">True</span>
                        </div>
                                <p className={`text-xl mt-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                  <strong>Score:</strong> {`${(verificationScore * 100).toFixed(1)}%`}
                                  {typeof confidence === 'number' && (
                                    <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <strong>Confidence:</strong> {(confidence * 100).toFixed(1)}%
                            </span>
                                  )}
                                </p>
                              </>
                          ) : (
                             <p className={`text-lg italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Score not available</p>
                          )}
                        </div>

                        {/* Analysis Details */}
                        {analysisDetails && (
                          <div className="mt-4">
                            <h4 className={`text-xl font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Analysis Details</h4>
                            
                            {analysisDetails.is_basic_fact && (
                              <div className="p-3 bg-blue-100 text-blue-800 rounded-lg mt-2">
                                <p>
                                  <span className="font-bold">✓ Basic Fact Detected</span> - This statement contains a well-known fact.
                                </p>
                              </div>
                            )}

                            {analysisDetails.error && (
                              <div className="p-3 bg-red-100 text-red-800 rounded-lg mt-2">
                                <p>
                                  <span className="font-bold">⚠ Analysis Error:</span> {analysisDetails.error}
                                </p>
              </div>
            )}
            
                            {!analysisDetails.is_basic_fact && !analysisDetails.error && (
                              <div className="mt-2">
                                <div className="flex items-center mb-3">
                                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-green-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <h4 className={`ml-2 text-xl font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Verification Methods Used</h4>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  {/* Model Analysis Card - Always show structure if analysisDetails exists */}
                                  <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-green-50 border-green-100'}`}>
                                    <div className="flex items-center mb-1">
                                      <p className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Model Analysis</p>
                                      <span className="ml-auto text-xl bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Primary</span>
                                    </div>
                                    {typeof analysisDetails.gemini_score === 'number' ? (
                                       analysisDetails.gemini_claims?.[0]?.verdict ? (
                                         <div>
                                           <p className={`text-xl font-bold ${analysisDetails.gemini_claims[0].verdict === "REAL" ? "text-green-600" : "text-red-600"}`}>
                                             {analysisDetails.gemini_claims[0].verdict}
                                           </p>
                                           <div className="flex items-center mt-1">
                                             <span className={`text-xl mr-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Truth Score:</span>
                                             <span className={`text-xl font-medium ${getScoreTextColorClass(analysisDetails.gemini_score)}`}>
                                               {(analysisDetails.gemini_score * 100).toFixed(0)}%
                                             </span>
                                           </div>
                                         </div>
                                       ) : (
                                         <p className={`text-xl font-bold ${getScoreTextColorClass(analysisDetails.gemini_score)}`}>
                                           {(analysisDetails.gemini_score * 100).toFixed(0)}%
                                         </p>
                                       )
                                    ) : (
                                        <p className={`text-xl italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>N/A</p>
                                    )}
                                    <p className={`text-xl mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI-based fact verification</p>
                                  </div>
                                  
                                  {/* Google Fact Check Card - Always show structure if analysisDetails exists */}
                                  <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-100'}`}>
                                    <div className="flex items-center mb-1">
                                      <p className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Google Fact Check</p>
                                      <span className="ml-auto text-xl bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Secondary</span>
                                    </div>
                                    {typeof analysisDetails.google_fact_check_score === 'number' ? (
                                        <p className={`text-xl font-bold ${getScoreTextColorClass(analysisDetails.google_fact_check_score)}`}>
                                            {(analysisDetails.google_fact_check_score * 100).toFixed(0)}%
                                        </p>
                                    ): (
                                        <p className={`text-xl italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>N/A</p>
                                    )}
                                    <p className={`text-xl mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Database cross-reference</p>
                                  </div>
                                  
                                  {/* News Source Verification Card - Always show structure if analysisDetails exists */}
                                  <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-purple-50 border-purple-100'}`}>
                                    <div className="flex items-center mb-1">
                                      <p className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>News Source Verification</p>
                                      <span className="ml-auto text-xl bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Tertiary</span>
                                    </div>
                                    {typeof analysisDetails.external_verification_score === 'number' ? (
                                        <p className={`text-xl font-bold ${getScoreTextColorClass(analysisDetails.external_verification_score)}`}>
                                            {(analysisDetails.external_verification_score * 100).toFixed(0)}%
                                        </p>
                                    ) : (
                                        <p className={`text-xl italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>N/A</p>
                                    )}
                                    <p className={`text-xl mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reliable source comparison</p>
                                  </div>
                                </div>
                                
                                {/* Source credibility card */}
                                {typeof analysisDetails.source_credibility === 'number' && analysisDetails.source_credibility !== 0.5 && (
                                  <div className={`p-3 rounded-lg mb-2 ${darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-100 border border-gray-200'}`}>
                                    <div className="flex items-center">
                                      <p className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Source Credibility</p>
                                      <span className={`ml-auto text-lg px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-800'}`}>Metadata</span>
                                    </div>
                                    <p className={`text-lg font-bold ${getScoreTextColorClass(analysisDetails.source_credibility)}`}>
                                      {(analysisDetails.source_credibility * 100).toFixed(0)}%
                                    </p>
                                    <p className={`text-lg mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Based on media metadata source information</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Claims Found */}
                            {analysisDetails.claims && analysisDetails.claims.length > 0 && (
                              <div className="mt-4">
                                <h4 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Claims Analysis ({analysisDetails.claims_found || analysisDetails.claims.length})</h4>
                                <div className={`border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                                  {analysisDetails.claims.map((claim, index) => (
                                    <div key={index} className={`p-4 border-b last:border-b-0 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                      {/* Google Fact Check API claim format */}
                                      {claim.source_type === 'google_fact_check' && (
                                        <>
                                          <div className="flex items-center justify-between mb-2">
                                            <p className={`font-semibold text-lg ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{claim.text}</p>
                                            <span className="text-lg bg-blue-100 text-blue-800 px-2 py-1 rounded">Google Fact Check</span>
                                          </div>
                                          {claim.claimReview?.[0] && (
                                              <div className="flex items-center mt-1">
                                                <span className={`text-lg px-2 py-1 rounded mr-2 ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                                  {claim.claimReview[0].publisher?.name || 'Unknown Publisher'}
                                                </span>
                                                {claim.claimReview[0].url && (
                                                  <span className="text-lg text-blue-600">
                                                    <a href={claim.claimReview[0].url} target="_blank" rel="noopener noreferrer">
                                                      View Source
                                                    </a>
                                                  </span>
                                                )}
                                              </div>
                                          )}
                                        </>
                                      )}
                                      
                                      {/* Gemini AI claim format */}
                                      {claim.source_type === 'gemini' && (
                                        <>
                                          <div className="flex items-center justify-between mb-2">
                                            <p className={`font-semibold text-lg ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{claim.text}</p>
                                            {typeof claim.truthfulness === 'number' && (
                                               <span className="text-lg bg-green-100 text-green-800 px-2 py-1 rounded">
                                                 Gemini AI • {(claim.truthfulness * 100).toFixed(0)}% True
                                               </span>
                                            )}
                                          </div>
                                          
                                          {typeof claim.truthfulness === 'number' && (
                                              <div className={`mt-2 w-full rounded-full h-2 mb-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                                                <div 
                                                  className={`h-2 rounded-full ${getScoreColorClass(claim.truthfulness)}`}
                                                  style={{ width: `${claim.truthfulness * 100}%` }}
                                                ></div>
                                              </div>
                                          )}
                                          
                                          {claim.evidence && (
                                            <div className={`mt-2 mb-3 text-lg p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                                              <p><span className="font-semibold">Analysis:</span> {claim.evidence}</p>
                                            </div>
                                          )}
                                          
                                          {claim.sources && claim.sources.length > 0 && (
                                            <div className="mt-2">
                                              <p className={`text-lg font-semibold mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SOURCES:</p>
                                              <div className="flex flex-wrap gap-2">
                                                {claim.sources.map((source, i) => (
                                                   source.url ? (
                                                    <a 
                                                      key={i}
                                                      href={source.url} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer"
                                                      className={`text-lg border px-2 py-1 rounded-full transition-colors ${darkMode ? 'bg-gray-600 border-gray-500 hover:bg-gray-500 text-gray-200' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                                                    >
                                                      {source.name || new URL(source.url).hostname} 
                                                    </a>
                                                    ) : (
                                                        <span key={i} className={`text-lg border px-2 py-1 rounded-full ${darkMode ? 'bg-gray-600 border-gray-500 text-gray-200' : 'bg-white border-gray-300 text-gray-700'}`}>
                                                           {source.name || 'Unknown Source'}
                                                        </span>
                                                    )
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {!claim.source_type && (
                                           <p className={`font-semibold text-lg ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{claim.text || JSON.stringify(claim)}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                   );
                })()}
                  </div>
            )}

            {/* --- END Unified Sections --- */}

          </div>
        )}
      </div>
    </div>
  );
}

export default App;