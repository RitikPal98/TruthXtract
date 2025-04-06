import React, { useState, useCallback } from 'react';
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
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Create preview URL
      setAnalysisResult(null); // Clear previous results
      setError(null); // Clear previous errors
      setFinalVideoUrl(null); // <-- Clear final video URL on new file selection
    }
  };

  const handleMediaUpload = useCallback(async () => {
    if (!selectedFile && !url) {
      setError('Please select a file or enter a URL first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setFinalVideoUrl(null); // <-- Clear final video URL before analysis

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
      console.log('Received analysis result:', response.data);
      setAnalysisResult(response.data);
      if (response.data?.video_url) {
        setFinalVideoUrl(`${BACKEND_URL}${response.data.video_url}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to analyze media.';
      setError(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, url]);

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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Media Verification Tool</h1>
        <p className="text-center text-gray-600 mb-6">Upload images, videos, or enter links for verification using Google Gemini AI</p>

        {/* Video Player Section (Displays AFTER analysis if URL is available) */}
        {analysisResult && analysisResult.media_type === 'video' && finalVideoUrl && (
          <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
            <h3 className="text-xl font-medium text-gray-800 mb-3">Processed Video</h3>
            <video controls width="100%" src={finalVideoUrl} className="mt-2 rounded border border-gray-300">
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Media Upload Section */} 
        <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <label htmlFor="media-upload" className="block text-lg font-medium text-gray-700 mb-2">
            Upload Image/Video File or Enter URL
          </label>
          <input
            id="media-upload"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <input
            type="text"
            placeholder="Enter URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-2 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {previewUrl && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Selected: {selectedFile?.name}</p>
              <video controls width="300" src={previewUrl} className="mt-2 rounded border border-gray-300">
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          <button
            onClick={handleMediaUpload}
            disabled={isLoading || (!selectedFile && !url)}
            className={`mt-4 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${isLoading || (!selectedFile && !url) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Media'}
          </button>
        </div>

        {/* Error Display */} 
        {error && (
          <div className="mb-6 p-4 border border-red-300 rounded-lg bg-red-50 text-red-700">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Analysis Results Section */} 
        {analysisResult && (
          <div className="mt-8">
            {console.log('Rendering AnalysisResult:', analysisResult)}
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Analysis Results ({analysisResult.media_type?.toUpperCase()})</h2>

            {/* Display Uploaded Image Section */} 
            {analysisResult.media_type === 'image' && analysisResult.image_url && (
              <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
                <h3 className="text-xl font-medium text-gray-800 mb-3">Uploaded Image</h3>
                <img 
                  src={analysisResult.image_url}
                  alt="Uploaded content" 
                  className="max-w-full h-auto mx-auto rounded border border-gray-300 mb-3" 
                />
                {/* Reverse Image Search Links for Uploaded Image */}
                <div className="text-center space-x-2">
                  <span className="text-sm font-medium">Reverse Search:</span>
                  <a href={getReverseImageSearchUrl(analysisResult.image_url, 'google')} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Google</a>
                  <a href={getReverseImageSearchUrl(analysisResult.image_url, 'tineye')} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">TinEye</a>
                  <a href={getReverseImageSearchUrl(analysisResult.image_url, 'yandex')} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Yandex</a>
                </div>
              </div>
            )}

            {/* Metadata Section (Show for both) */} 
            {analysisResult.metadata && (
               <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <h3 className="text-xl font-medium text-gray-800 mb-3">Media Metadata</h3>
                 {analysisResult.metadata && typeof analysisResult.metadata === 'object' && Object.keys(analysisResult.metadata).length > 0 ? (
                   <pre className="text-sm bg-white p-3 rounded border border-gray-300 overflow-x-auto">
                     {JSON.stringify(analysisResult.metadata, null, 2)}
                   </pre>
                 ) : (
                   <p className="text-sm text-gray-500">No metadata extracted or metadata is empty.</p>
                 )}
                  {analysisResult.metadata?.Error && (
                    <p className="text-sm text-red-600 mt-2">Metadata extraction failed: {analysisResult.metadata.Error}</p>
                  )}
               </div>
            )}

            {/* Keyframes Section (Only for Video) */} 
            {analysisResult.media_type === 'video' && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-xl font-medium text-gray-800 mb-3">Extracted Keyframes</h3>
                {analysisResult.keyframes && analysisResult.keyframes.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {analysisResult.keyframes.map((keyframePath, index) => {
                      // Check if the keyframePath is a full URL (Cloudinary) or a relative path
                      const isCloudinaryUrl = keyframePath.startsWith('http');
                      const imageUrl = isCloudinaryUrl ? keyframePath : `${BACKEND_URL}/${keyframePath.replace(/\\/g, '/')}`;
                      
                      // For display name, extract filename or use frame number
                      let displayName;
                      if (isCloudinaryUrl) {
                        // Extract filename from Cloudinary URL
                        const urlParts = keyframePath.split('/');
                        displayName = urlParts[urlParts.length - 1].split('.')[0]; // Get filename without extension
                      } else {
                        displayName = keyframePath.split('/').pop().split('\\').pop();
                      }
                      
                      return (
                        <div key={index} className="border rounded-lg overflow-hidden shadow-sm bg-white p-2 text-center">
                          <img 
                              src={imageUrl} 
                              alt={`Keyframe ${index + 1}`} 
                              className="w-full h-auto object-cover mb-2 cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => window.open(imageUrl, '_blank')} // Open image in new tab
                          />
                          <p className="text-xs text-gray-600 truncate">{displayName}</p>
                           {/* Reverse Image Search Links */} 
                           <div className="mt-2 space-x-1">
                               <a href={getReverseImageSearchUrl(imageUrl, 'google')} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Google</a>
                               <a href={getReverseImageSearchUrl(imageUrl, 'tineye')} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">TinEye</a>
                               <a href={getReverseImageSearchUrl(imageUrl, 'yandex')} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Yandex</a>
                           </div>
                        </div>
                      );
                  })
                  }
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No keyframes extracted or keyframe extraction failed.</p>
                )}
                {/* Display error from keyframe extraction if metadata is also missing (likely ffmpeg issue) */}
                {(!analysisResult.keyframes || analysisResult.keyframes.length === 0) && analysisResult.metadata?.Error?.includes('ffmpeg') && (
                     <p className="text-sm text-red-600 mt-2">Keyframe extraction failed: Could not run ffmpeg.</p>
                )}
              </div>
            )}

            {/* Transcription Section (Only for Video) - Assuming video_ocr_text replaces transcript */}
            {analysisResult.media_type === 'video' && analysisResult.video_ocr_text && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-xl font-medium text-gray-800 mb-3">Extracted Text from Video Frames</h3>
                {typeof analysisResult.video_ocr_text === 'string' && analysisResult.video_ocr_text.length > 0 ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{analysisResult.video_ocr_text}</p>
                ) : (
                  <p className="text-sm text-gray-500">No text extracted from video frames.</p>
                )}
                {/* Display transcription error if any */}
                {analysisResult.transcript_error && (
                   <p className="text-sm text-red-600 mt-2">Transcription error: {analysisResult.transcript_error}</p>
                )}
              </div>
            )}

            {/* OCR Text Section (Only for Image) */} 
            {analysisResult.media_type === 'image' && analysisResult.ocr_text && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <h3 className="text-xl font-medium text-gray-800 mb-3">Extracted Text (OCR)</h3>
                 {typeof analysisResult.ocr_text === 'string' && analysisResult.ocr_text.length > 0 && !analysisResult.ocr_text.startsWith('Error:') ? (
                   <p className="text-sm text-gray-800 whitespace-pre-wrap">{analysisResult.ocr_text}</p>
                 ) : (
                   <p className="text-sm text-gray-500">{analysisResult.ocr_text || "No text extracted."}</p>
                 )}
              </div>
            )}

            {/* Fact-Checking Analysis Section (Show for both, adapt content) */} 
            {(analysisResult.ocr_analysis || analysisResult.video_summary_analysis) && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-xl font-medium text-gray-800 mb-3">Fact-Checking Analysis (Gemini)</h3>
                {(() => { // Wrap logic in IIFE to ensure correct JSX parsing
                  // Determine which analysis object to use
                  const analysisData = analysisResult.media_type === 'image' 
                                        ? analysisResult.ocr_analysis 
                                        : analysisResult.video_summary_analysis;
                  
                  console.log('FactCheck: analysisData:', analysisData);
                  
                  // Guard against missing analysis data
                  if (!analysisData) {
                    console.log('FactCheck: No analysisData object found.');
                    return <p className="text-sm text-gray-500">Analysis data not available.</p>;
                  }

                  // Check if detailed results are available
                  const hasDetailedResults = analysisData.results && Array.isArray(analysisData.results) && analysisData.results.length > 0;
                  const detailedResult = hasDetailedResults ? analysisData.results[0] : null;
                  const overallScore = analysisData.verification_score ?? (detailedResult?.truthfulness ?? 0.5); // Fallback score

                  console.log('FactCheck: hasDetailedResults:', hasDetailedResults);
                  console.log('FactCheck: detailedResult:', detailedResult);

                  return (
                    <>
                      {/* Display Overall Score Bar */} 
                      {typeof overallScore === 'number' && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Overall Verification Score:</p>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${getScoreColorClass(overallScore)}`} 
                              style={{ width: `${Math.max(0, Math.min(100, overallScore * 100))}%` }}
                            ></div>
                          </div>
                          <p className={`text-sm font-semibold mt-1 ${getScoreTextColorClass(overallScore)}`}>
                              {(overallScore * 100).toFixed(0)}% Likely {overallScore >= 0.5 ? 'True' : 'False'}
                          </p>
                        </div>
                      )}

                      {/* Display Detailed Gemini Results if available */} 
                      {hasDetailedResults ? (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Gemini Analysis Details:</p>
                          <p className="text-sm mb-1">
                            <span className="font-medium">Verdict:</span> 
                            <span className={`font-semibold ${detailedResult.verdict === 'REAL' ? 'text-green-600' : detailedResult.verdict === 'FAKE' ? 'text-red-600' : 'text-yellow-600'}`}>
                              {detailedResult.verdict || 'N/A'}
                            </span>
                          </p>
                          <p className="text-sm mb-1">
                            <span className="font-medium">Truth Score:</span> {typeof detailedResult.truthfulness === 'number' ? `${(detailedResult.truthfulness * 100).toFixed(0)}%` : 'N/A'}
                          </p>
                          <p className="text-sm mb-1">
                            <span className="font-medium">Evidence:</span>
                            <span className="block whitespace-pre-wrap mt-1">{detailedResult.evidence || 'No evidence provided.'}</span>
                          </p>
                          <p className="text-sm font-medium mb-1 mt-2">Sources:</p>
                          {detailedResult.sources && detailedResult.sources.length > 0 ? (
                            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                              {detailedResult.sources.map((source, index) => (
                                <li key={index}>
                                  {source.url ? (
                                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                      {source.name || source.url}
                                    </a>
                                  ) : (
                                    <span>{source.name || 'Unnamed source'}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500">No sources provided.</p>
                          )}
                        </div>
                      ) : (
                        <>
                         {console.log('FactCheck: Rendering fallback/error message.')}
                         <p className="text-sm text-red-600 mt-2">
                           {analysisData?.error || "Detailed fact-checking analysis not available."}
                         </p>
                        </>
                      )}
                    </>
                  );
                })()} 
              </div>
            )}
            
            {/* --- ADDED: Google Fact Check API Section --- */}
            {analysisResult?.analysis?.claims && (
              (() => {
                const googleClaims = analysisResult.analysis.claims.filter(claim => claim.source_type === 'google_fact_check');
                if (googleClaims.length === 0) return null; // Don't render section if no relevant Google claims

                console.log("Rendering Google Fact Check Claims:", googleClaims); // Log the filtered claims

                return (
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-xl font-medium text-gray-800 mb-3">Relevant Google Fact Checks</h3>
                    <ul className="space-y-4">
                      {googleClaims.map((claim, index) => {
                        const review = claim.claimReview?.[0]; // Get the first review
                        const rating = review?.textualRating || 'No rating';
                        const publisher = review?.publisher?.name || 'Unknown publisher';
                        const reviewUrl = review?.url;

                        return (
                          <li key={index} className="border-b pb-3 last:border-b-0">
                            <p className="text-sm mb-1">
                              <span className="font-semibold">Claim:</span> {claim.text}
                            </p>
                            <p className="text-xs text-gray-600 mb-1">
                              (Similarity to input: {(claim.similarity_score * 100).toFixed(1)}%)
                            </p>
                            {review && (
                              <div className="text-xs mt-1">
                                <span className="font-medium">Review by {publisher}: </span>
                                <span className={`font-bold ${rating.toLowerCase().includes('false') || rating.toLowerCase().includes('misleading') ? 'text-red-600' : rating.toLowerCase().includes('true') ? 'text-green-600' : 'text-gray-700'}`}>
                                  {rating}
                                </span>
                                {reviewUrl && (
                                  <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-2">[Link]</a>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()
            )}
            {/* --- END ADDED SECTION --- */}

            {/* Add a section for raw response if it exists (for debugging) */}
            {/* ... you might want to add this later if needed ... */}

          </div>
        )}
      </div>
    </div>
  );
}

export default App;
