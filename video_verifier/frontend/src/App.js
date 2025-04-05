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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Create preview URL
      setAnalysisResult(null); // Clear previous results
      setError(null); // Clear previous errors
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
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Analysis Results</h2>

            {/* Metadata Section */} 
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

            {/* Keyframes Section */} 
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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

            {/* Transcription Section */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-xl font-medium text-gray-800 mb-3">Transcription (Google STT)</h3>
              {analysisResult.transcription ? (
                <> 
                  {analysisResult.transcription.transcript ? (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{analysisResult.transcription.transcript}</p>
                  ) : (
                    <p className="text-gray-500 italic">{analysisResult.transcription.error || 'No transcript generated.'}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-500 italic">Transcription not available.</p>
              )}
            </div>

            {/* Fact Checking Analysis Section */}
            {analysisResult.transcript_analysis && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <h3 className="text-xl font-medium text-gray-800 mb-3">Fact-Checking Analysis</h3>
                
                {/* Verification Score */}
                <div className="mb-4">
                  <h4 className="text-lg font-medium text-gray-700">Verification Score</h4>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full ${getScoreColorClass(analysisResult.transcript_analysis.verification_score)}`}
                      style={{ width: `${analysisResult.transcript_analysis.verification_score * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-sm">
                    <span className="text-red-500">False</span>
                    <span className="text-yellow-500">Uncertain</span>
                    <span className="text-green-500">True</span>
                  </div>
                  <p className="text-sm mt-2">
                    <strong>Score:</strong> {(analysisResult.transcript_analysis.verification_score * 100).toFixed(1)}%
                    <span className="ml-2 text-gray-500">
                      <strong>Confidence:</strong> {(analysisResult.transcript_analysis.confidence * 100).toFixed(1)}%
                    </span>
                  </p>
                </div>

                {/* Analysis Details */}
                {analysisResult.transcript_analysis.analysis && (
                  <div className="mt-4">
                    <h4 className="text-lg font-medium text-gray-700">Analysis Details</h4>
                    
                    {analysisResult.transcript_analysis.analysis.is_basic_fact && (
                      <div className="p-3 bg-blue-50 rounded-lg mt-2">
                        <p className="text-blue-700">
                          <span className="font-bold">✓ Basic Fact Detected</span> - This statement contains a well-known fact.
                        </p>
                      </div>
                    )}

                    {analysisResult.transcript_analysis.analysis.error && (
                      <div className="p-3 bg-red-50 rounded-lg mt-2">
                        <p className="text-red-700">
                          <span className="font-bold">⚠ Analysis Error:</span> {analysisResult.transcript_analysis.analysis.error}
                        </p>
                      </div>
                    )}

                    {!analysisResult.transcript_analysis.analysis.is_basic_fact && !analysisResult.transcript_analysis.analysis.error && (
                      <div className="mt-2">
                        <div className="flex items-center mb-3">
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-green-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h4 className="ml-2 text-md font-medium">Verification Methods Used</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                            <div className="flex items-center mb-1">
                              <p className="text-sm font-semibold">Gemini AI Analysis</p>
                              <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Primary</span>
                            </div>
                            
                            {analysisResult.transcript_analysis.analysis.gemini_claims && 
                             analysisResult.transcript_analysis.analysis.gemini_claims.length > 0 && 
                             analysisResult.transcript_analysis.analysis.gemini_claims[0].verdict ? (
                              <div>
                                <p className={`text-lg font-bold ${analysisResult.transcript_analysis.analysis.gemini_claims[0].verdict === "REAL" ? "text-green-600" : "text-red-600"}`}>
                                  {analysisResult.transcript_analysis.analysis.gemini_claims[0].verdict}
                                </p>
                                <div className="flex items-center mt-1">
                                  <span className="text-sm mr-2">Truth Score:</span>
                                  <span className={`text-sm font-medium ${getScoreTextColorClass(analysisResult.transcript_analysis.analysis.gemini_score)}`}>
                                    {(analysisResult.transcript_analysis.analysis.gemini_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className={`text-lg font-bold ${getScoreTextColorClass(analysisResult.transcript_analysis.analysis.gemini_score)}`}>
                                {(analysisResult.transcript_analysis.analysis.gemini_score * 100).toFixed(0)}%
                              </p>
                            )}
                            
                            <p className="text-xs text-gray-500 mt-1">Advanced AI-based fact verification with source attribution</p>
                          </div>
                          
                          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <div className="flex items-center mb-1">
                              <p className="text-sm font-semibold">Google Fact Check</p>
                              <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Secondary</span>
                            </div>
                            <p className={`text-lg font-bold ${getScoreTextColorClass(analysisResult.transcript_analysis.analysis.google_fact_check_score)}`}>
                              {(analysisResult.transcript_analysis.analysis.google_fact_check_score * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Cross-referenced with fact-checking databases</p>
                          </div>
                          
                          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                            <div className="flex items-center mb-1">
                              <p className="text-sm font-semibold">News Source Verification</p>
                              <span className="ml-auto text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Tertiary</span>
                            </div>
                            <p className={`text-lg font-bold ${getScoreTextColorClass(analysisResult.transcript_analysis.analysis.external_verification_score)}`}>
                              {(analysisResult.transcript_analysis.analysis.external_verification_score * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Cross-checked with reliable news sources</p>
                          </div>
                        </div>
                        
                        {/* Source credibility card */}
                        {analysisResult.transcript_analysis.analysis.source_credibility !== 0.5 && (
                          <div className="p-3 bg-gray-100 rounded-lg mb-2">
                            <div className="flex items-center">
                              <p className="text-sm font-semibold">Source Credibility</p>
                              <span className="ml-auto text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">Metadata</span>
                            </div>
                            <p className={`text-lg font-bold ${getScoreTextColorClass(analysisResult.transcript_analysis.analysis.source_credibility)}`}>
                              {(analysisResult.transcript_analysis.analysis.source_credibility * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Based on media metadata source information</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Claims Found */}
                    {analysisResult.transcript_analysis.analysis.claims && analysisResult.transcript_analysis.analysis.claims.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-md font-medium text-gray-700 mb-2">Claims Analysis ({analysisResult.transcript_analysis.analysis.claims_found})</h4>
                        <div className="border rounded-lg bg-white">
                          {analysisResult.transcript_analysis.analysis.claims.map((claim, index) => (
                            <div key={index} className="p-4 border-b last:border-b-0">
                              {/* Google Fact Check API claim format */}
                              {claim.source_type === 'google_fact_check' && (
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold text-sm">{claim.text}</p>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Google Fact Check</span>
                                  </div>
                                  <div className="flex items-center mt-1">
                                    {claim.claimReview && claim.claimReview[0] && (
                                      <>
                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded mr-2">
                                          {claim.claimReview[0].publisher?.name || 'Unknown Publisher'}
                                        </span>
                                        <span className="text-xs text-blue-600">
                                          <a href={claim.claimReview[0].url} target="_blank" rel="noopener noreferrer">
                                            View Source
                                          </a>
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                              
                              {/* Gemini AI claim format */}
                              {claim.source_type === 'gemini' && (
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold">{claim.text}</p>
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                      Gemini AI • {(claim.truthfulness * 100).toFixed(0)}% True
                                    </span>
                                  </div>
                                  
                                  {/* Truth score bar */}
                                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2 mb-3">
                                    <div 
                                      className={`h-2 rounded-full ${getScoreColorClass(claim.truthfulness)}`}
                                      style={{ width: `${claim.truthfulness * 100}%` }}
                                    ></div>
                                  </div>
                                  
                                  {/* Evidence section */}
                                  {claim.evidence && (
                                    <div className="mt-2 mb-3 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                      <p><span className="font-semibold">Analysis:</span> {claim.evidence}</p>
                                    </div>
                                  )}
                                  
                                  {/* Sources section */}
                                  {claim.sources && claim.sources.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-semibold text-gray-500 mb-1">SOURCES:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {claim.sources.map((source, i) => (
                                          <a 
                                            key={i}
                                            href={source.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-2 py-1 rounded-full transition-colors"
                                          >
                                            {source.name}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fact Check Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-xl font-medium text-gray-800 mb-3">Fact Check Results (Google API)</h3>
              {analysisResult.fact_checks ? (
                <> 
                  {analysisResult.fact_checks.error ? (
                    <p className="text-red-500 italic">Error: {analysisResult.fact_checks.error}</p>
                  ) : analysisResult.fact_checks.claims && analysisResult.fact_checks.claims.length > 0 ? (
                    <ul className="space-y-3">
                      {analysisResult.fact_checks.claims.map((claim, index) => (
                        <li key={index} className="border-b pb-2 last:border-b-0">
                          <p className="text-sm font-medium text-gray-800">Claim: <span className="font-normal">{claim.text}</span></p>
                          {claim.claimReview && claim.claimReview.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs font-semibold text-gray-600">Review by: {claim.claimReview[0].publisher.name}</p>
                              <p className="text-xs font-semibold text-gray-600">Rating: <span className={`font-bold ${claim.claimReview[0].textualRating.toLowerCase().includes('false') || claim.claimReview[0].textualRating.toLowerCase().includes('misleading') ? 'text-red-600' : 'text-green-600'}`}>{claim.claimReview[0].textualRating}</span></p>
                              <a href={claim.claimReview[0].url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Read more</a>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">No relevant fact checks found for the transcript.</p>
                  )}
                </>
              ) : (
                <p className="text-gray-500 italic">Fact check results not available.</p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default App;
