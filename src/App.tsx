import React, { useState, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Upload, 
  AlertTriangle, 
  ShieldCheck, 
  BarChart3, 
  Zap,
  Info,
  RefreshCw,
  Camera,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeChart, AnalysisResult } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  
  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video has valid dimensions and is ready
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (e) {
      console.error("Canvas capture failed", e);
      return null;
    }
  };

  const startLiveStream = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false
      });
      
      setStream(displayStream);
      setIsLive(true);
      setError(null);
      setIsQuotaExceeded(false);
      setCountdown(30);

      // Start analysis loop
      analysisIntervalRef.current = setInterval(async () => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Trigger capture when countdown hits 0
            const frame = captureFrame();
            if (frame && !isAnalyzing && !isQuotaExceeded) {
              setIsAnalyzing(true);
              const localTime = new Date().toLocaleTimeString();
              analyzeChart(frame, localTime, true)
                .then(data => {
                  setResult(data);
                  setIsQuotaExceeded(false);
                })
                .catch(err => {
                  console.error("Live analysis error:", err);
                  if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
                    setIsQuotaExceeded(true);
                    setError("API Quota Exceeded. Live updates paused.");
                  }
                })
                .finally(() => setIsAnalyzing(false));
            }
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

      displayStream.getVideoTracks()[0].onended = () => {
        stopLiveStream();
      };

    } catch (err) {
      setError("Failed to start screen sharing. Please grant permissions.");
      console.error(err);
    }
  };

  const stopLiveStream = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsLive(false);
    setResult(null);
    setCountdown(0);
    setIsQuotaExceeded(false);
  };

  // Ensure video stream is attached when component re-renders
  React.useEffect(() => {
    if (isLive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Video play failed", e));
    }
  }, [isLive, stream]);

  const runAnalysis = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const localTime = new Date().toLocaleTimeString();
      const data = await analyzeChart(image, localTime);
      setResult(data);
    } catch (err) {
      setError("Analysis failed. Please ensure the image is a clear trading chart.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 1), 5));
  };

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-brand-green/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-black fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight">TradeVision <span className="text-brand-green">AI</span></span>
          </div>
          
          {/* Market Ticker */}
          <div className="hidden lg:flex items-center gap-8 overflow-hidden max-w-md border-x border-white/5 px-8">
            <div className="flex gap-6 animate-marquee whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase">BTC/USDT</span>
                <span className="text-xs font-mono text-brand-green">$68,432.12</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase">ETH/USDT</span>
                <span className="text-xs font-mono text-brand-red">$3,842.50</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase">SOL/USDT</span>
                <span className="text-xs font-mono text-brand-green">$145.22</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
            <a href="#" className="hover:text-white transition-colors">Dashboard</a>
            <a href="#" className="hover:text-white transition-colors">Signals</a>
            <a href="#" className="hover:text-white transition-colors">History</a>
          </div>
          <button className="px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-white/90 transition-all active:scale-95">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload & Preview */}
          <div className="lg:col-span-7 space-y-6">
            <section className="glass-card p-8 text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Chart Analysis</h2>
                <p className="text-white/50 text-sm">Upload a screenshot from po.trade or any exchange for instant AI insights.</p>
              </div>

              <div 
                onClick={() => !isLive && fileInputRef.current?.click()}
                className={cn(
                  "relative aspect-video rounded-xl border-2 border-dashed transition-all overflow-hidden flex flex-center items-center justify-center bg-black",
                  (image || isLive) ? "border-brand-green/50" : "border-white/10 hover:border-white/20 hover:bg-white/5",
                  !isLive && "cursor-pointer"
                )}
              >
                {isLive ? (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-brand-red rounded-full animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Live Analysis</span>
                    </div>
                  </>
                ) : image ? (
                  <div className="relative w-full h-full group">
                    <motion.div
                      drag={zoom > 1}
                      dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
                      animate={{ scale: zoom, x: position.x, y: position.y }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                    >
                      <img 
                        src={image} 
                        alt="Chart Preview" 
                        className="w-full h-full object-contain pointer-events-none" 
                        onWheel={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            handleZoom(e.deltaY > 0 ? -0.2 : 0.2);
                          }
                        }}
                      />
                    </motion.div>
                    
                    {/* Zoom Controls Overlay */}
                    <div className="absolute bottom-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleZoom(0.5); }}
                        className="w-8 h-8 bg-black/80 backdrop-blur border border-white/10 rounded-lg flex items-center justify-center hover:bg-brand-green hover:text-black transition-all"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleZoom(-0.5); }}
                        className="w-8 h-8 bg-black/80 backdrop-blur border border-white/10 rounded-lg flex items-center justify-center hover:bg-brand-green hover:text-black transition-all"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                        className="w-8 h-8 bg-black/80 backdrop-blur border border-white/10 rounded-lg flex items-center justify-center hover:bg-brand-red hover:text-white transition-all"
                        title="Reset View"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 backdrop-blur rounded text-[10px] font-bold text-white/60 pointer-events-none">
                      {zoom.toFixed(1)}x Zoom • Drag to Pan
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white/40" />
                    </div>
                    <p className="text-sm text-white/40 font-medium">Click to upload or start live stream</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-3">
                {isLive ? (
                  <button 
                    onClick={stopLiveStream}
                    className="flex-1 h-12 bg-brand-red text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                  >
                    <TrendingDown className="w-5 h-5" />
                    Stop Live Stream
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={startLiveStream}
                      className="flex-1 h-12 glass-card text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      Start Live Stream
                    </button>
                    <button 
                      onClick={runAnalysis}
                      disabled={!image || isAnalyzing}
                      className="flex-1 h-12 bg-brand-green text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                    >
                      {isAnalyzing ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-5 h-5 fill-current" />
                          Analyze Market
                        </>
                      )}
                    </button>
                  </>
                )}
                <button 
                  onClick={() => { setImage(null); setResult(null); stopLiveStream(); }}
                  className="w-12 h-12 glass-card flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </section>

            {/* Security Audit Section */}
            <section className="glass-card p-6 border-brand-red/20 bg-brand-red/5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-brand-red/20 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-brand-red" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-brand-red">Security & Risk Audit</h3>
                  <p className="text-xs text-brand-red/80 leading-relaxed">
                    1. <strong>No Custody:</strong> This bot does not execute trades directly. You maintain full control of your capital.<br/>
                    2. <strong>Data Privacy:</strong> Screenshots are processed via encrypted API calls. No personal data is stored.<br/>
                    3. <strong>Risk Warning:</strong> Trading involves significant risk. AI suggestions are based on probability, not certainty. Never trade more than you can afford to lose.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-card p-8 flex flex-col items-center justify-center space-y-4 min-h-[400px]"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                    <BarChart3 className="w-6 h-6 text-brand-green absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">Scanning Patterns...</p>
                    <p className="text-sm text-white/40">Gemini is analyzing candlestick structures</p>
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* Signal Card */}
                  <div className={cn(
                    "glass-card p-8 border-2 overflow-hidden relative",
                    result.direction === 'BUY' ? "border-brand-green/30" : 
                    result.direction === 'SELL' ? "border-brand-red/30" : "border-white/10"
                  )}>
                    <div className="absolute top-0 right-0 p-4">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        result.direction === 'BUY' ? "bg-brand-green text-black" : 
                        result.direction === 'SELL' ? "bg-brand-red text-white" : "bg-white/10 text-white"
                      )}>
                        {result.confidence}% Confidence
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center relative",
                          result.direction === 'BUY' ? "bg-brand-green/20" : 
                          result.direction === 'SELL' ? "bg-brand-red/20" : "bg-white/5"
                        )}>
                          {result.direction === 'BUY' ? (
                            <TrendingUp className="w-8 h-8 text-brand-green" />
                          ) : result.direction === 'SELL' ? (
                            <TrendingDown className="w-8 h-8 text-brand-red" />
                          ) : (
                            <RefreshCw className="w-8 h-8 text-white/40" />
                          )}
                          {isLive && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-green rounded-full border-2 border-black animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-white/40 font-medium uppercase tracking-wider">Suggested Action</p>
                            {isLive && (
                              <span className="text-[8px] font-black bg-brand-green/20 text-brand-green px-1.5 py-0.5 rounded border border-brand-green/30 uppercase tracking-tighter">Live</span>
                            )}
                          </div>
                          <h3 className={cn(
                            "text-3xl font-black",
                            result.direction === 'BUY' ? "text-brand-green" : 
                            result.direction === 'SELL' ? "text-brand-red" : "text-white/60"
                          )}>
                            {result.direction}
                          </h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Resistance</p>
                          <p className="font-mono text-sm">{result.keyLevels.resistance}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Support</p>
                          <p className="font-mono text-sm">{result.keyLevels.support}</p>
                        </div>
                      </div>

                      {result.suggestedDuration && (
                        <div className="p-4 bg-brand-green/10 rounded-xl border border-brand-green/20">
                          <p className="text-[10px] text-brand-green uppercase font-bold mb-1 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Suggested Duration
                          </p>
                          <p className="font-bold text-lg">{result.suggestedDuration}</p>
                        </div>
                      )}

                      {result.timestamp && (
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] text-white/30 uppercase font-bold">Last Updated</p>
                          <p className="text-[10px] font-mono text-white/40">{result.timestamp}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <p className="text-xs font-bold text-white/60 uppercase flex items-center gap-2">
                          <Info className="w-3 h-3" /> Analysis Reasoning
                        </p>
                        <ul className="space-y-2">
                          {result.reasoning.map((reason, i) => (
                            <li key={i} className="text-sm text-white/70 flex gap-2">
                              <span className="text-brand-green">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Indicator Summary */}
                  <div className="glass-card p-6">
                    <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-white/40" /> Indicator Summary
                    </h4>
                    <p className="text-sm text-white/60 leading-relaxed italic">
                      "{result.indicators}"
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="glass-card p-8 flex flex-col items-center justify-center space-y-4 min-h-[400px] text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white/20" />
                  </div>
                  <div className="max-w-[240px]">
                    <p className="font-bold text-lg">Awaiting Input</p>
                    <p className="text-sm text-white/40">Upload a chart screenshot to generate real-time AI trading signals.</p>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {isLive && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "glass-card p-4 border-brand-green/20 bg-brand-green/5",
                  isQuotaExceeded && "border-brand-red/20 bg-brand-red/5"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      isQuotaExceeded ? "bg-brand-red" : "bg-brand-green"
                    )} />
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      isQuotaExceeded ? "text-brand-red" : "text-brand-green"
                    )}>
                      {isQuotaExceeded ? "Quota Exceeded" : "Live Engine Active"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    {isQuotaExceeded ? "Paused" : `Next scan in ${countdown}s`}
                  </span>
                </div>
                {!isQuotaExceeded ? (
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand-green"
                      initial={{ width: "100%" }}
                      animate={{ width: `${(countdown / 30) * 100}%` }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </div>
                ) : (
                  <button 
                    onClick={() => { setIsQuotaExceeded(false); setCountdown(5); setError(null); }}
                    className="w-full py-2 bg-brand-red/20 hover:bg-brand-red/30 text-brand-red text-[10px] font-bold uppercase rounded transition-colors"
                  >
                    Try Reconnecting Now
                  </button>
                )}
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-xl flex flex-col gap-2 text-brand-red text-sm"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span className="font-bold">{error}</span>
                </div>
                {error.includes("permissions policy") && (
                  <p className="text-xs opacity-80 pl-8">
                    Screen sharing is often blocked in embedded windows. Try opening this app in a <strong>New Tab</strong> using the button in the top right of the editor.
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Zap className="w-4 h-4 text-brand-green fill-current" />
            <span className="text-sm font-bold">TradeVision AI Engine v1.0</span>
          </div>
          <p className="text-xs text-white/30 text-center max-w-md">
            Trading binary options and forex involves high risk. This tool is an AI assistant and should not be used as the sole basis for financial decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}
