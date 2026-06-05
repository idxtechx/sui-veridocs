"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ExternalLink,
  Lock,
  Wallet,
  Database,
  Search,
  Copy,
  CheckCircle,
  Coins,
  Archive
} from "lucide-react";
import { useCurrentAccount, useDisconnectWallet, ConnectModal } from "@mysten/dapp-kit";

interface NotarizedDocument {
  name: string;
  size: string;
  hash: string;
  txHash: string;
  blobId: string;
  timestamp: string;
}

export default function Dashboard() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedHashType, setCopiedHashType] = useState<"sha" | "blob" | null>(null);
  
  const walletConnected = !!currentAccount;
  const walletAddress = currentAccount?.address || null;

  const [documents, setDocuments] = useState<NotarizedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      if (walletConnected && walletAddress) {
        const storageKey = `veridocs_history_${walletAddress}`;
        const history = localStorage.getItem(storageKey);
        if (history) {
          try {
            setDocuments(JSON.parse(history));
          } catch (e) {
            console.error("Failed to parse history", e);
          }
        } else {
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
      setIsLoading(false);
    };

    const timer = setTimeout(() => {
      setIsLoading(true);
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [walletConnected, walletAddress]);

  const handleCopy = (text: string, index: number, type: "sha" | "blob") => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setCopiedHashType(type);
    setTimeout(() => {
      setCopiedIndex(null);
      setCopiedHashType(null);
    }, 2000);
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.blobId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics calculation
  const totalFiles = documents.length;
  const totalSizeMB = documents.reduce((acc, doc) => {
    const size = parseFloat(doc.size) || 0;
    return acc + size;
  }, 0).toFixed(2);
  const totalGasSpentSUI = (totalFiles * 0.0032).toFixed(4); // average gas per notary run

  return (
    <section className="relative min-h-screen pt-32 pb-24 px-6 md:px-12 bg-slate-950/20">
      <div className="max-w-7xl mx-auto z-10 relative">
        <AnimatePresence mode="wait">
          {!walletConnected ? (
            /* Locked Screen Overlay */
            <motion.div
              key="locked"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="max-w-xl mx-auto mt-12 text-center"
            >
              <div className="glass-panel rounded-3xl border-white/10 p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-sky-400 mb-6 shadow-md">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-3">Dashboard Locked</h3>
                <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                  Please connect your Sui Wallet to view, manage, and verify your notarized documents. History is kept private and isolated per wallet address.
                </p>
                <ConnectModal
                  trigger={
                    <button
                      onClick={() => setShowModal(true)}
                      className="glow-btn inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-102 cursor-pointer border-0"
                    >
                      <Wallet className="w-5 h-5" />
                      Connect Wallet
                    </button>
                  }
                  open={showModal}
                  onOpenChange={(open) => setShowModal(open)}
                />
              </div>
            </motion.div>
          ) : (
            /* Dashboard Main content */
            <motion.div
              key="active-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              {/* Header Title */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Notary Dashboard</h1>
                  <p className="text-sm text-slate-400 mt-2">
                    Private records on SUI Mainnet via Tatum RPC &amp; Walrus Protocol.
                  </p>
                </div>

                {/* Account Details Badge */}
                <div className="glass-panel border-sky-500/20 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-xl shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Connected Wallet</p>
                    <p className="text-sm font-bold text-white mt-1 font-mono">
                      {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 ml-6 hover:underline cursor-pointer bg-transparent border-0"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stat 1 */}
                <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 shadow-inner">
                      <Archive className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Documents Notarized</p>
                      <h3 className="text-2xl font-bold text-white mt-1">{totalFiles} Files</h3>
                    </div>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 shadow-inner">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Walrus Size Volume</p>
                      <h3 className="text-2xl font-bold text-white mt-1">{totalSizeMB} MB</h3>
                    </div>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 shadow-inner">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Est. Gas Fees Spent</p>
                      <h3 className="text-2xl font-bold text-white mt-1 font-mono">{totalGasSpentSUI} SUI</h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Control */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search file name, SHA-256 hash or Walrus Blob ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Document Registry Table */}
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Loading your notarization records...</p>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="glass-panel rounded-3xl border-white/10 p-16 text-center max-w-xl mx-auto">
                  <p className="text-slate-400 text-sm">
                    {searchQuery ? "No matching files found." : "No documents notarized on this account yet."}
                  </p>
                </div>
              ) : (
                <div className="glass-panel rounded-3xl border-white/10 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
                          <th className="py-5 px-6">Document Name</th>
                          <th className="py-5 px-6">Size</th>
                          <th className="py-5 px-6">SHA-256 Checksum</th>
                          <th className="py-5 px-6">Walrus Blob ID</th>
                          <th className="py-5 px-6">Sui Tx Anchor</th>
                          <th className="py-5 px-6">Date Notarized</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {filteredDocs.map((doc, idx) => (
                          <tr key={idx} className="hover:bg-white/2 transition-colors">
                            {/* File Name */}
                            <td className="py-4.5 px-6 font-semibold text-white flex items-center gap-2.5">
                              <FileText className="w-5 h-5 text-sky-400 shrink-0" />
                              <span className="truncate max-w-[200px] md:max-w-[300px]" title={doc.name}>
                                {doc.name}
                              </span>
                            </td>

                            {/* File Size */}
                            <td className="py-4.5 px-6 text-slate-300">{doc.size}</td>

                            {/* SHA256 */}
                            <td className="py-4.5 px-6 font-mono text-xs text-slate-400">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[100px]" title={doc.hash}>
                                  {doc.hash.slice(0, 10)}...{doc.hash.slice(-6)}
                                </span>
                                <button
                                  onClick={() => handleCopy(doc.hash, idx, "sha")}
                                  className="text-slate-500 hover:text-sky-400 p-1 rounded hover:bg-white/5 transition-colors"
                                  title="Copy hash"
                                >
                                  {copiedIndex === idx && copiedHashType === "sha" ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Walrus Blob ID */}
                            <td className="py-4.5 px-6 font-mono text-xs text-slate-400">
                              {doc.blobId ? (
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`/api/view/${doc.blobId}?name=${doc.name}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 w-fit"
                                    title={doc.blobId}
                                  >
                                    {doc.blobId.slice(0, 10)}...{doc.blobId.slice(-6)}
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  </a>
                                  <button
                                    onClick={() => handleCopy(doc.blobId, idx, "blob")}
                                    className="text-slate-500 hover:text-sky-400 p-1 rounded hover:bg-white/5 transition-colors"
                                    title="Copy Blob ID"
                                  >
                                    {copiedIndex === idx && copiedHashType === "blob" ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500">N/A</span>
                              )}
                            </td>

                            {/* Sui Tx */}
                            <td className="py-4.5 px-6 font-mono text-xs">
                              <a
                                href={doc.txHash && doc.txHash.length > 20 ? `https://suiscan.xyz/mainnet/tx/${doc.txHash}` : "#"}
                                target={doc.txHash && doc.txHash.length > 20 ? "_blank" : undefined}
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 w-fit"
                              >
                                {doc.txHash.slice(0, 10)}...{doc.txHash.slice(-6)}
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            </td>

                            {/* Timestamp */}
                            <td className="py-4.5 px-6 text-slate-400 text-xs font-mono">{doc.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
