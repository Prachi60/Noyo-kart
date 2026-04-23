import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudUpload,
  FileText,
  Settings,
  ShieldCheck,
  CheckCircle,
  X,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Info,
  Clock,
  Printer,
  ChevronDown,
  AlertTriangle,
  MapPinOff
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { toast } from "sonner";
import Button from "@shared/components/ui/Button";
import Card from "@shared/components/ui/Card";
import Badge from "@shared/components/ui/Badge";
import { useLocation } from "../context/LocationContext";
import { useNavigate } from "react-router-dom";

const PrintStore = () => {
  const navigate = useNavigate();
  const { currentLocation } = useLocation();
  const [step, setStep] = useState(1); // 1: Upload, 2: Configure, 3: Summary
  const [files, setFiles] = useState([]); // Array of { id, file, publicId, pageCount, status: 'uploading' | 'ready' | 'error', config: { isColor, isDoubleSided, copies } }
  const [quote, setQuote] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null); // { type: 'NO_SELLERS', message: string }
  const fileInputRef = useRef(null);

  // Sync quote whenever files or configs change
  useEffect(() => {
    if (files.length > 0 && files.every(f => f.status === 'ready')) {
      setError(null);
      calculateLiveQuote();
    }
  }, [files]);

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    // Filter by size (e.g. 25MB total per project is safe, but model says 50MB total)
    const validFiles = selectedFiles.filter(f => f.size <= 25 * 1024 * 1024);
    if (validFiles.length < selectedFiles.length) {
      toast.error("Some files are too large (Max 25MB per file)");
    }

    const newFiles = validFiles.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      file: f,
      status: 'uploading',
      config: { isColor: false, isDoubleSided: false, copies: 1, orientation: 'portrait', printType: 'document', photoSize: 'passport' }
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Process uploads
    for (const fileObj of newFiles) {
      const formData = new FormData();
      formData.append("file", fileObj.file);
      
      try {
        const response = await customerApi.uploadPrintFile(formData);
        const { publicId, pageCount, secureUrl, fileName, fileMetaId } = response.data.result;
        
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id 
            ? { ...f, status: 'ready', publicId, pageCount, secureUrl, fileMetaId, name: fileName || f.name }
            : f
        ));
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message;
        toast.error(`Failed to upload ${fileObj.name}: ${errorMsg}`);
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'error' } : f
        ));
      }
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileConfig = (id, newConfig) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, config: { ...f.config, ...newConfig } } : f
    ));
  };

  const calculateLiveQuote = async () => {
    if (!currentLocation?.latitude) {
      return;
    }
    setIsCalculating(true);
    try {
      const items = files.map(f => ({
        publicId: f.publicId,
        pageCount: f.pageCount,
        copies: f.config.copies,
        isColor: f.config.isColor,
        isDoubleSided: f.config.isDoubleSided,
        orientation: f.config.orientation,
        printType: f.config.printType,
        photoSize: f.config.printType === 'photo' ? f.config.photoSize : undefined,
      }));

      const res = await customerApi.calculatePrintQuote({
        items,
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      });
      setQuote(res.data.result);
      setError(null);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        setError({
          type: 'NO_SELLERS',
          message: 'No print shops found near your current location.'
        });
      } else {
        toast.error("Failed to calculate quote. Please try again.");
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!quote || !quote.seller) return;
    
    // Pass everything to the CheckoutPage
    // The CheckoutPage needs to be modified to handle Print Items
    // For now, we'll store order draft in session and navigate
    const printOrderDraft = {
      type: 'print',
      items: files.map(f => ({
        type: 'print',
        name: f.name,
        fileMetaId: f.fileMetaId,
        publicId: f.publicId,
        fileUrl: f.secureUrl,
        pageCount: f.pageCount,
        isColor: f.config.isColor,
        isDoubleSided: f.config.isDoubleSided,
        copies: f.config.copies,
        orientation: f.config.orientation,
        printType: f.config.printType,
        photoSize: f.config.printType === 'photo' ? f.config.photoSize : undefined,
        price: 0 // Will be recalculated by checkout preview
      })),
      sellerId: quote.seller._id,
      pricing: quote.pricing
    };
    
    sessionStorage.setItem('print_order_draft', JSON.stringify(printOrderDraft));
    navigate('/checkout?type=print');
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate("/");
    }
  };

  const isNextDisabled = files.length === 0 || files.some((f) => f.status !== "ready");

  const renderProgressDashes = () => (
    <div className="flex justify-center gap-2 my-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-1.5 w-8 rounded-full transition-all duration-700 ${
            step >= i ? "bg-primary" : "bg-slate-200"
          } ${step === i ? "shadow-[0_0_10px_rgba(0,0,0,0.15)]" : ""}`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-slate-50 pb-24 font-['Outfit'] selection:bg-indigo-100">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-[0_1px_20px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-primary hover:text-white rounded-xl transition-all active:scale-95 group"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Printer size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  Instant Print
                </h1>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                  <ShieldCheck size={10} className="text-primary" /> Secure Documents
                </p>
              </div>
            </div>
          </div>


        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 pt-8">
        <AnimatePresence mode="wait">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 20 }}
              className="space-y-8"
            >
              <div
                onClick={() => fileInputRef.current.click()}
                className="group relative h-80 border-2 border-dashed border-indigo-200/50 rounded-[40px] bg-white/50 backdrop-blur-sm hover:bg-white hover:border-indigo-400/50 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden shadow-2xl shadow-indigo-50/30"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="w-20 h-20 bg-white rounded-[24px] shadow-xl shadow-indigo-100 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-500 mb-6"
                  >
                    <CloudUpload size={40} />
                  </motion.div>
                  <h3 className="text-2xl font-black text-slate-900">Upload Documents</h3>
                  <p className="text-sm font-bold text-slate-500 mt-2 bg-indigo-50 px-4 py-1.5 rounded-full">
                    Support PDF & Images (Up to 25MB)
                  </p>
                </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
              </div>

              {files.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[3px]">
                      Files to Print ({files.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {files.map((f, idx) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        key={f.id}
                        className="bg-white/80 border border-white p-5 rounded-3xl shadow-xl shadow-slate-200/50 flex items-center justify-between group backdrop-blur-sm"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                            {f.status === "uploading" ? (
                              <Clock size={24} className="animate-spin" />
                            ) : (
                              <FileText size={24} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-slate-800 break-words pr-4">
                              {f.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {f.status === "ready" && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-wider">
                                    <CheckCircle size={12} />
                                    {f.pageCount} {f.pageCount === 1 ? "Page" : "Pages"}
                                  </span>
                                  {(f.name.toLowerCase().endsWith('.doc') || f.name.toLowerCase().endsWith('.docx')) && (
                                    <span className="flex items-center gap-1 text-[8px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                      <AlertTriangle size={8} />
                                      Word Doc: Manual Page Check Recommended
                                    </span>
                                  )}
                                </div>
                              )}
                              {f.status === "error" && (
                                <Badge variant="error" className="text-[9px] px-1.5 py-0">
                                  Failed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(f.id)}
                          className="p-2.5 text-slate-300 hover:text-white hover:bg-rose-500 rounded-2xl transition-all shadow-hover"
                        >
                          <Trash2 size={20} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-5">
                <Button
                  onClick={() => setStep(2)}
                  disabled={isNextDisabled}
                  className="w-full py-6 rounded-[32px] bg-primary hover:brightness-90 text-white font-black tracking-widest text-xs flex items-center justify-center gap-4 group shadow-2xl shadow-primary/30 relative overflow-hidden"
                >
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-30" />
                  <Settings
                    className="group-hover:rotate-180 transition-transform duration-700"
                    size={20}
                  />
                  CONFIGURE PRINT OPTIONS
                  <ChevronRight size={20} />
                </Button>

                {renderProgressDashes()}

                <div className="flex items-start gap-4 p-6 bg-white/40 border border-white/60 backdrop-blur-md rounded-[32px]">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                    <Info size={20} />
                  </div>
                  <p className="text-[13px] font-bold text-slate-600 leading-relaxed pt-1">
                    Your documents are strictly encrypted. They are automatically assigned to the
                    nearest professional printing shop for instant processing and hand-delivery to
                    your door.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CONFIGURE */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-2xl font-black text-slate-900">Set Options</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="bg-white border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black tracking-widest py-3 px-6 hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  ADD FILES
                </Button>
              </div>

              <div className="space-y-6">
                {files.map(f => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={f.id}
                  >
                    <Card className="p-8 border-none shadow-2xl shadow-slate-200/60 rounded-[40px] bg-white/90 backdrop-blur-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[100px] -z-10 group-hover:bg-indigo-100/50 transition-colors" />
                      <div className="flex items-start gap-4 mb-8">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0 flex-1 pr-2">
                          <h4 className="text-sm font-black text-slate-900 break-words">{f.name}</h4>
                          <div className="flex flex-col gap-1 mt-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] truncate">
                              {f.pageCount} Pages • Document Ready
                            </p>
                            {(f.name.toLowerCase().endsWith('.doc') || f.name.toLowerCase().endsWith('.docx')) && (
                              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                <AlertTriangle size={10} />
                                Word docs default to 1 page. Use PDF for accurate pricing.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Print Type */}
                        <div className="space-y-3 col-span-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">Print Type</p>
                          <div className="flex p-1 bg-slate-100/70 rounded-xl gap-1">
                            {[{ label: '📄 Document', value: 'document' }, { label: '📷 Photograph', value: 'photo' }].map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => updateFileConfig(f.id, { printType: opt.value })}
                                className={`flex-1 py-2.5 px-2 rounded-lg transition-all text-[10px] sm:text-[11px] font-black tracking-wider ${
                                  f.config.printType === opt.value
                                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Photo Size — only when printType is photo */}
                        {f.config.printType === 'photo' && (
                          <div className="space-y-3 col-span-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">Photo Size</p>
                            <div className="flex p-1 bg-slate-100/70 rounded-xl gap-1">
                              {[
                                { label: 'Passport Size', sublabel: '3.5×4.5 cm', value: 'passport' },
                                { label: '4×6 Print', sublabel: '10×15 cm', value: '4x6' },
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => updateFileConfig(f.id, { photoSize: opt.value })}
                                  className={`flex-1 py-2.5 px-2 rounded-lg transition-all text-center ${
                                    f.config.photoSize === opt.value
                                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                                      : 'text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  <p className="text-[10px] sm:text-[11px] font-black tracking-wider">{opt.label}</p>
                                  <p className={`text-[8px] font-bold mt-0.5 ${f.config.photoSize === opt.value ? 'text-white/70' : 'text-slate-400'}`}>{opt.sublabel}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Color */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">Color</p>
                          <div className="flex p-1 bg-slate-100/70 rounded-xl gap-1">
                            {[{ label: 'B&W', value: false }, { label: 'Color', value: true }].map(opt => (
                              <button
                                key={opt.label}
                                onClick={() => updateFileConfig(f.id, { isColor: opt.value })}
                                className={`flex-1 py-2.5 px-1 rounded-lg transition-all text-[10px] sm:text-[11px] font-black tracking-wider ${
                                  f.config.isColor === opt.value
                                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Orientation */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">Orientation</p>
                          <div className="flex p-1 bg-slate-100/70 rounded-xl gap-1">
                            {[{ label: 'Portrait', value: 'portrait' }, { label: 'Landscape', value: 'landscape' }].map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => updateFileConfig(f.id, { orientation: opt.value })}
                                className={`flex-1 py-2.5 px-1 rounded-lg transition-all text-[10px] sm:text-[11px] font-black tracking-wider truncate ${
                                  f.config.orientation === opt.value
                                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sides — only for document */}
                        {f.config.printType === 'document' && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">Sides</p>
                            <div className="flex p-1 bg-slate-100/70 rounded-xl gap-1">
                              {[{ label: 'Single', value: false }, { label: 'Double', value: true }].map(opt => (
                                <button
                                  key={opt.label}
                                  onClick={() => updateFileConfig(f.id, { isDoubleSided: opt.value })}
                                  className={`flex-1 py-2.5 px-1 rounded-lg transition-all text-[10px] sm:text-[11px] font-black tracking-wider ${
                                    f.config.isDoubleSided === opt.value
                                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                                      : 'text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Copies */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-1">Copies</p>
                          <div className="flex items-center gap-2 bg-slate-100/70 p-1.5 rounded-xl">
                            <button
                              onClick={() => updateFileConfig(f.id, { copies: Math.max(1, f.config.copies - 1) })}
                              className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-900 active:scale-90 transition-all font-black hover:bg-primary hover:text-white"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center font-black text-slate-900 text-sm">{f.config.copies}</span>
                            <button
                              onClick={() => updateFileConfig(f.id, { copies: f.config.copies + 1 })}
                              className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-900 active:scale-90 transition-all font-black hover:bg-primary hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="pt-8 sticky bottom-4">
                <Button 
                  onClick={() => setStep(3)}
                  className="w-full py-6 rounded-[32px] bg-primary text-white font-black tracking-widest text-xs flex items-center justify-between group shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
                >
                  <div className="flex items-center gap-4 ml-4">
                    <CheckCircle className="text-emerald-400 group-hover:scale-110 transition-transform" size={20} />
                    GENERATE SECURE QUOTE
                  </div>
                  <div className="flex items-center gap-3 mr-4">
                    <div className="w-px h-6 bg-white/20" />
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>
                <div className="pt-4 pb-2">
                  {renderProgressDashes()}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SUMMARY */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-1 flex bg-primary rounded-full" />
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Order Summary</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-[4px] mt-1 pr-1">Review & Confirm</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Item List */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Print Preview</h4>
                    {files.map(f => (
                      <div key={f.id} className="bg-white p-5 rounded-[24px] border border-dashed border-slate-200 flex flex-col gap-4">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div className="min-w-0 flex-1 pr-2">
                                    <h4 className="text-sm font-black text-slate-900 break-words">{f.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{f.pageCount} Pages × {f.config.copies} Copies</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[8px] px-2 py-0 font-bold uppercase tracking-widest">
                                    {f.config.isColor ? "Color" : "B&W"}
                                </Badge>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                    {f.config.printType === 'photo'
                                      ? f.config.photoSize === 'passport' ? 'Passport Size' : '4×6 Print'
                                      : f.config.isDoubleSided ? "Double Sided" : "Single Sided"}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                    {f.config.orientation === 'landscape' ? '↔ Landscape' : '↕ Portrait'}
                                </span>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>

                  {/* Nearest Seller Info */}
                  {quote && quote.seller && (
                    <div className="bg-primary p-8 rounded-[40px] text-white shadow-2xl shadow-primary/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <Printer size={120} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[4px] text-white/40 mb-4">Assigned Professional</h4>
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                    <span className="text-2xl font-black">{quote.seller.shopName?.charAt(0)}</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">{quote.seller.shopName}</h3>
                                    <p className="text-[11px] font-bold text-white/50 flex items-center gap-1.5 mt-0.5">
                                        <Clock size={12} className="text-emerald-400" /> 
                                        {quote.pricing.estimatedPreparationTime || "Ready in 15 mins"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}
                </div>

                {/* Price Breakdown Sidebar */}
                <div className="lg:col-span-1">
                  <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-slate-200/50 sticky top-24 border border-slate-50">
                    <h4 className="text-[10px] font-black uppercase tracking-[4px] text-slate-400 mb-8">Price Details</h4>
                    
                    <div className="space-y-6">
                      {isCalculating ? (
                        <div className="animate-pulse space-y-4">
                          {[1,2,3,4].map(i => <div key={i} className="h-4 bg-slate-50 rounded" />)}
                        </div>
                      ) : quote ? (
                        <>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-500">Printing Charges</span>
                              <span className="font-black text-slate-900 tracking-tight">₹{quote.pricing.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-500">Handling Fee</span>
                              <span className="font-black text-slate-900 tracking-tight">₹{quote.pricing.platformFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-500">Delivery Fee</span>
                              <span className="font-black text-primary tracking-tight">₹{quote.pricing.deliveryFee.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-slate-50 my-6" />
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-black text-slate-900">Total Amount</span>
                              <span className="text-xl font-black text-slate-900 tracking-tighter">₹{quote.pricing.total.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="pt-2">
                             <Button 
                              onClick={handlePlaceOrder}
                              className="w-full py-4 rounded-2xl bg-primary hover:brightness-90 text-white font-black tracking-[2px] text-xs shadow-xl shadow-primary/30 active:scale-95 transition-all"
                             >
                               CONTINUE TO PAYMENT
                             </Button>
                             <div className="mt-6 mb-2">
                               {renderProgressDashes()}
                             </div>
                             <p className="text-[10px] text-center font-bold text-slate-400 mt-4 leading-relaxed">
                                Files are deleted automatically 24 hours after delivery.
                             </p>
                          </div>
                        </>
                      ) : error ? (
                        <div className="text-center py-6">
                          <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-6 shadow-xl shadow-rose-100/50">
                            <MapPinOff size={24} />
                          </div>
                          <h3 className="text-sm font-black text-slate-900 mb-2">Service Unavailable</h3>
                          <p className="text-[10px] font-bold text-slate-400 leading-relaxed mb-8">
                            We couldn't find any print-enabled shops in your current area. Try another address or check back later.
                          </p>
                          <div className="space-y-3">
                            <Button 
                              onClick={() => navigate("/")}
                              variant="outline"
                              className="w-full py-3.5 rounded-xl border-slate-200 text-slate-600 font-black tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all"
                            >
                              BACK TO HOME
                            </Button>
                            <Button 
                              onClick={() => setStep(1)}
                              className="w-full py-3.5 rounded-xl bg-primary text-white font-black tracking-widest text-[10px] shadow-lg shadow-primary/20"
                            >
                              MODIFY FILES
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-xs font-bold text-slate-400">Calculating your best quote...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PrintStore;
