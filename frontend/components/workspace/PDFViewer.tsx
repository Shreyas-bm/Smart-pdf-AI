'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Search, 
  Download, 
  UploadCloud, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  FileText
} from 'lucide-react';

interface PDFViewerProps {
  documentId: string;
  filename: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onFileReplace?: (file: File) => void;
}

export default function PDFViewer({
  documentId,
  filename,
  currentPage,
  onPageChange,
  onFileReplace
}: PDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState<boolean>(false);
  const [fileUrl, setFileUrl] = useState<string>('');

  // Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [pagesText, setPagesText] = useState<string[]>([]);
  const [indexingText, setIndexingText] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<any>(null);

  // 1. Dynamic PDF.js library loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scriptId = 'pdfjs-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initPdfjs = () => {
      try {
        const pdfjs = (window as any)['pdfjs-dist/build/pdf'];
        if (pdfjs) {
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          setPdfjsLoaded(true);
        } else {
          setError('Failed to initialize PDF renderer.');
        }
      } catch (err) {
        setError('Error setting up PDF worker.');
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.async = true;
      script.onload = () => {
        initPdfjs();
      };
      script.onerror = () => {
        setError('Failed to load PDF rendering engine. Please refresh.');
      };
      document.body.appendChild(script);
    } else if ((window as any)['pdfjs-dist/build/pdf']) {
      initPdfjs();
    }
  }, []);

  // 2. Fetch PDF URL
  useEffect(() => {
    if (!documentId) return;
    const url = `/api/documents/${documentId}/download`;
    setFileUrl(url);
  }, [documentId]);

  // 3. Extract text from all pages for search in background
  const indexPDFText = useCallback(async (doc: any) => {
    setIndexingText(true);
    try {
      const texts: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        texts.push(pageText.toLowerCase());
      }
      setPagesText(texts);
    } catch (err) {
      console.error('Failed to extract PDF text content for search:', err);
    } finally {
      setIndexingText(false);
    }
  }, []);

  // 4. Load PDF document
  useEffect(() => {
    if (!pdfjsLoaded || !fileUrl) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setPagesText([]);
    setSearchMatches([]);
    setCurrentMatchIndex(-1);

    const token = localStorage.getItem('smart_pdf_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const pdfjs = (window as any)['pdfjs-dist/build/pdf'];

    // Load PDF using fetch to supply auth headers if required
    fetch(fileUrl, { headers })
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const loadingTask = pdfjs.getDocument(objectUrl);

        return loadingTask.promise.then((pdf: any) => {
          if (!isMounted) return;
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setLoading(false);
          indexPDFText(pdf);
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('PDF load error:', err);
        setError('Failed to load PDF. The file may be corrupted, missing, or unauthorized.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pdfjsLoaded, fileUrl, indexPDFText]);

  // 5. Render Page Canvas
  const renderPage = useCallback((pageNum: number, scale: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel pending render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    pdfDoc.getPage(pageNum)
      .then((page: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        renderTask.promise
          .then(() => {
            renderTaskRef.current = null;
          })
          .catch((err: any) => {
            if (err.name !== 'RenderingCancelledException') {
              console.error('Render error:', err);
            }
          });
      })
      .catch((err: any) => {
        console.error('Failed to get page:', err);
      });
  }, [pdfDoc]);

  // Trigger render when current page, zoom, or pdf changes
  useEffect(() => {
    if (pdfDoc && currentPage > 0 && currentPage <= numPages) {
      renderPage(currentPage, zoom);
    }
  }, [pdfDoc, currentPage, zoom, numPages, renderPage]);

  // 6. Handle Search Input
  useEffect(() => {
    if (!searchQuery.trim() || pagesText.length === 0) {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches: number[] = [];
    pagesText.forEach((text, idx) => {
      if (text.includes(query)) {
        matches.push(idx + 1);
      }
    });

    setSearchMatches(matches);

    if (matches.length > 0) {
      // Find closest match starting from current page
      const nextMatch = matches.find(p => p >= currentPage) || matches[0];
      setCurrentMatchIndex(matches.indexOf(nextMatch));
      onPageChange(nextMatch);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [searchQuery, pagesText]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    onPageChange(searchMatches[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    onPageChange(searchMatches[prevIdx]);
  };

  // 7. Zoom Handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleZoomFit = () => {
    if (!containerRef.current || !canvasRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 40; // padding
    pdfDoc.getPage(currentPage).then((page: any) => {
      const viewport = page.getViewport({ scale: 1.0 });
      const fitScale = containerWidth / viewport.width;
      setZoom(Math.max(0.5, Math.min(fitScale, 2.0)));
    });
  };

  // 8. File replacement
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileReplace) {
      onFileReplace(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0B0F] border border-[#1E1E2A] rounded-3xl overflow-hidden shadow-2xl relative">
      {/* 1. Sticky PDF Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#12121A]/95 border-b border-[#1E1E2A] z-10 backdrop-blur-md">
        
        {/* Left Side: Page Navigator */}
        <div className="flex items-center gap-1.5 bg-[#0B0B0F] border border-[#1E1E2A] rounded-xl p-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E1E2A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center text-xs font-bold text-gray-300 px-2 min-w-[70px] justify-center">
            {loading ? (
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Loading</span>
            ) : (
              <span>Page {currentPage} / {numPages}</span>
            )}
          </div>

          <button
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages || loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E1E2A] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Search & Zoom Controls */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#0B0B0F] border border-[#1E1E2A] rounded-xl p-1">
            <button
              onClick={handleZoomOut}
              disabled={loading || zoom <= 0.5}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E1E2A] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-gray-300 w-12 text-center select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={loading || zoom >= 3.0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E1E2A] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomFit}
              disabled={loading}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E1E2A] border-l border-[#1E1E2A] pl-2 transition-colors"
              title="Fit Width"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Search controls */}
          <div className="relative flex items-center bg-[#0B0B0F] border border-[#1E1E2A] rounded-xl px-2.5 py-1">
            <Search className="w-3.5 h-3.5 text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search PDF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading || indexingText}
              className="w-24 sm:w-32 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
            />
            {searchMatches.length > 0 && (
              <span className="text-[10px] text-emerald-400 font-bold ml-1.5 select-none whitespace-nowrap bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {currentMatchIndex + 1}/{searchMatches.length}
              </span>
            )}
            {searchMatches.length > 0 && (
              <div className="flex items-center gap-0.5 ml-2 border-l border-[#1E1E2A] pl-2">
                <button
                  onClick={handlePrevMatch}
                  className="p-0.5 text-gray-400 hover:text-white"
                  title="Previous Match"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextMatch}
                  className="p-0.5 text-gray-400 hover:text-white"
                  title="Next Match"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {indexingText && (
              <Loader2 className="w-3 h-3 text-[#00D4FF] animate-spin ml-2" />
            )}
          </div>
        </div>

        {/* Right Side: Actions (Download & Replace) */}
        <div className="flex items-center gap-2">
          {onFileReplace && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-[#1E1E2A] border border-white/5 hover:border-[#7C5CFF]/30 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all"
                title="Replace PDF Document"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#00D4FF]" /> Replace
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                className="hidden"
              />
            </>
          )}

          <a
            href={fileUrl}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-[#0B0B0F] border border-[#1E1E2A] text-gray-400 hover:text-white hover:border-[#7C5CFF]/40 transition-all flex items-center justify-center"
            title="Download Original PDF"
          >
            <Download className="w-4 h-4 text-[#7C5CFF]" />
          </a>
        </div>
      </div>

      {/* 2. PDF Scrollable Viewing Pane */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-6 flex justify-center items-start bg-[#0E0E12] select-text relative min-h-[400px]"
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0B0F]/90 z-20 gap-4 animate-fade-in">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-[#7C5CFF]/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-[#00D4FF] rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white tracking-wide">Rendering Document Pages</p>
              <p className="text-xs text-gray-500 mt-1">Initializing Canvas & Text Layers...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-[#0B0B0F] z-20">
            <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-red-500/30 text-center space-y-4">
              <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Document Loading Failed</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{error}</p>
              <div className="flex justify-center gap-3 pt-2">
                {onFileReplace && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-gradient px-5 py-2 rounded-xl text-xs font-bold"
                  >
                    Select Another File
                  </button>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2 bg-[#1E1E2A] text-gray-300 rounded-xl text-xs font-bold border border-white/5 hover:text-white"
                >
                  Retry Loading
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas container for scaling */}
        <div className="relative shadow-2xl rounded-lg border border-[#1E1E2A]/50 bg-white overflow-hidden transition-all duration-200">
          <canvas 
            ref={canvasRef} 
            className="block max-w-full"
            style={{ 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)' 
            }}
          />
        </div>
      </div>

      {/* Page Indexing Progress Indicator */}
      {indexingText && (
        <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] text-gray-400 font-bold z-20">
          <div className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full animate-ping"></div>
          Indexing page text for fast search...
        </div>
      )}
    </div>
  );
}
