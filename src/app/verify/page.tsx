"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileCheck,
  XCircle,
  ExternalLink,
  ArrowLeft,
  FileText
} from "lucide-react";
import Link from "next/link";
import { useSuiClient } from "@mysten/dapp-kit";

interface NotarizedDocument {
  name: string;
  size: string;
  hash: string;
  txHash: string;
  blobId: string;
  timestamp: string;
}

interface MatchedDocument {
  name: string;
  size: string;
  hash: string;
  txHash: string;
  blobId: string;
  timestamp: string;
  ownerAddress: string;
}

export default function Verify() {
  const suiClient = useSuiClient();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchedDocument | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateSHA256 = async (targetFile: File): Promise<string> => {
    const arrayBuffer = await targetFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsHashing(true);
    setHasChecked(false);
    setMatchResult(null);

    try {
      const hash = await calculateSHA256(selectedFile);
      setCalculatedHash(hash);
      
      let foundDoc: MatchedDocument | null = null;

      const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
      const registryId = process.env.NEXT_PUBLIC_REGISTRY_ID;

      console.log("[VeriDocs Verify] Package ID:", packageId || "(NOT SET)");
      console.log("[VeriDocs Verify] Registry ID:", registryId || "(NOT SET)");
      console.log("[VeriDocs Verify] File hash:", hash);

      // 1. Try to verify via Sui Blockchain Smart Contract first
      if (packageId && registryId && packageId !== "your-package-id-here" && registryId !== "your-registry-object-id-here") {
        try {
          console.log("[VeriDocs Verify] Querying Sui blockchain for hash:", hash);
          // Query the dynamic field from the shared Registry object directly
          const dfResponse = await suiClient.getDynamicFieldObject({
            parentId: registryId,
            name: {
              type: "0x1::string::String",
              value: hash
            }
          });

          if (dfResponse.data && dfResponse.data.content) {
            const content = dfResponse.data.content;
            if (content.dataType === "moveObject") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const fields = (content.fields as any).value?.fields;
              if (fields) {
                const nameVal = fields.name;
                const blobIdVal = fields.blob_id;
                const authorVal = fields.author;
                const timestampVal = Number(fields.timestamp);
                const txDigest = dfResponse.data.previousTransaction || "";

                foundDoc = {
                  name: nameVal || selectedFile.name,
                  size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
                  hash: hash,
                  txHash: txDigest,
                  blobId: blobIdVal || "",
                  timestamp: new Date(timestampVal).toISOString().replace('T', ' ').slice(0, 19),
                  ownerAddress: authorVal || ""
                };
              }
            }
          }
        } catch (chainErr) {
          console.error("Blockchain verification lookup failed, trying local storage:", chainErr);
        }
      }

      // 2. Fallback: Scan all localStorage keys for matching hashes (compatibility with offline/local runs)
      if (!foundDoc && typeof window !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("veridocs_history_")) {
            const list = JSON.parse(localStorage.getItem(key) || "[]") as NotarizedDocument[];
            const match = list.find((doc: NotarizedDocument) => doc.hash === hash);
            if (match) {
              foundDoc = {
                ...match,
                ownerAddress: key.replace("veridocs_history_", "")
              };
              break;
            }
          }
        }
      }

      if (foundDoc) {
        setMatchResult(foundDoc);
      }
      
      setHasChecked(true);
    } catch (err) {
      console.error("Error hashing file", err);
      alert("Failed to process and calculate file hash.");
    } finally {
      setIsHashing(false);
    }
  };

  const resetVerifier = () => {
    setFile(null);
    setCalculatedHash(null);
    setMatchResult(null);
    setHasChecked(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section className="relative min-h-screen pt-32 pb-24 px-6 md:px-12 bg-slate-950/20">
      <div className="max-w-4xl mx-auto z-10 relative">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-sky-400 hover:text-sky-300 mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Public Document Audit Tool
          </h1>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            Drag-and-drop any document to check its tamper-proof authenticity and verify if it matches an anchored proof on SUI Mainnet (via Tatum RPC) &amp; Walrus Protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Hashing & Drag and drop Panel */}
          <div className="glass-panel rounded-3xl border-white/10 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <AnimatePresence mode="wait">
              {!file ? (
                /* Drag and drop input state */
                <motion.div
                  key="drag-drop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full"
                >
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                      dragActive
                        ? "border-sky-400 bg-sky-500/5 text-sky-400"
                        : "border-white/10 bg-slate-950/40 text-slate-400 hover:border-white/20 hover:text-slate-300"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-5 shadow-sm">
                      <Upload className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-white mb-1">Drag and drop file here</p>
                    <p className="text-xs text-slate-400 mb-6">Or click to select a file from your computer</p>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                      PDF, Images, Keys, or Docs up to 50MB
                    </span>
                  </div>
                </motion.div>
              ) : (
                /* Processing or Verification Result state */
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {/* File Info */}
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white max-w-[250px] md:max-w-md truncate">{file.name}</h4>
                        <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={resetVerifier}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer bg-transparent border-0"
                    >
                      Choose Another
                    </button>
                  </div>

                  {isHashing ? (
                    <div className="py-12 text-center space-y-4">
                      <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-slate-400 font-mono">Calculating cryptographic SHA-256 hash...</p>
                    </div>
                  ) : (
                    hasChecked && (
                      <div className="space-y-6">
                        {/* Status Card */}
                        {matchResult ? (
                          /* VERIFIED SUCCESS CARD */
                          <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
                                <FileCheck className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white">Document Authenticated</h3>
                                <p className="text-xs text-emerald-400">Match found in Sui Notary registry</p>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-5 space-y-3.5 text-xs md:text-sm">
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-slate-400">Calculated SHA-256</span>
                                <span className="text-white font-mono text-[11px] truncate max-w-[200px] md:max-w-none">{calculatedHash}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-slate-400">Notary Owner Address</span>
                                <span className="text-white font-mono text-[11px] truncate max-w-[200px] md:max-w-none" title={matchResult.ownerAddress}>
                                  {matchResult.ownerAddress.slice(0, 12)}...{matchResult.ownerAddress.slice(-8)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-slate-400">Date Registered</span>
                                <span className="text-white font-mono text-xs">{matchResult.timestamp} UTC</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-slate-400">Sui Anchor Block TX</span>
                                <a
                                  href={`https://suiscan.xyz/mainnet/tx/${matchResult.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-400 hover:text-sky-300 font-mono text-[11px] flex items-center gap-1 hover:underline"
                                >
                                  {matchResult.txHash.slice(0, 10)}...{matchResult.txHash.slice(-6)}
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-slate-400">Walrus Storage Blob</span>
                                <a
                                  href={`/api/view/${matchResult.blobId}?name=${matchResult.name}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-400 hover:text-sky-300 font-mono text-[11px] flex items-center gap-1 hover:underline"
                                >
                                  {matchResult.blobId.slice(0, 10)}...{matchResult.blobId.slice(-6)}
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>

                            {/* View Action */}
                            <div className="mt-6 flex justify-end">
                              <a
                                href={`/api/view/${matchResult.blobId}?name=${matchResult.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glow-btn inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer"
                              >
                                View File From Walrus
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </motion.div>
                        ) : (
                          /* UNVERIFIED WARNING CARD */
                          <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center text-slate-950 shadow-md">
                                <XCircle className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white">Unverified Document</h3>
                                <p className="text-xs text-rose-400">No matching registry signature found</p>
                              </div>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed mb-6">
                              This file fingerprint (SHA-256 hash) does not match any notarized documents recorded on the Sui Blockchain registry. The file may have been modified, edited, corrupted, or it was never notarized through Sui-VeriDocs.
                            </p>

                            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-5 text-xs md:text-sm flex justify-between items-center">
                              <span className="text-slate-400 font-medium">Calculated SHA-256 Hash</span>
                              <span className="text-white font-mono text-[11px] truncate max-w-[220px] md:max-w-none" title={calculatedHash || ""}>
                                {calculatedHash}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
