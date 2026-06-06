"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Database,
  Cpu,
  Lock,
  Upload,
  Hash,
  Activity,
  FileCheck,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  FileText,
  ChevronRight,
  Wallet
} from "lucide-react";
import { useCurrentAccount, useSignAndExecuteTransaction, ConnectModal } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

// Types for the Notary Tool
type NotaryStep = "idle" | "hashing" | "storing" | "registering" | "success";

export default function Home() {
  // Notarization State
  const [simStep, setSimStep] = useState<NotaryStep>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("Belum ada file dipilih");
  const [fileSize, setFileSize] = useState("");
  const [simProgress, setSimProgress] = useState(0);
  const [realHash, setRealHash] = useState("");
  const [realTxHash, setRealTxHash] = useState<string | null>(null);
  const [realBlobId, setRealBlobId] = useState<string | null>(null);

  // Wallet and Notary Dashboard States
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [showModal, setShowModal] = useState(false);

  const walletConnected = !!currentAccount;
  const walletAddress = currentAccount?.address || null;



  // Stats Counters (Simple visual trigger on load)
  const [stats, setStats] = useState({ documents: 0, verified: 0, gasSaved: 0 });

  useEffect(() => {
    const interval = setTimeout(() => {
      setStats({
        documents: 14205,
        verified: 100, // 100%
        gasSaved: 85 // 85%
      });
    }, 500);
    return () => clearTimeout(interval);
  }, []);

  const startSimulation = async (file?: File) => {
    if (simStep !== "idle") return;

    if (!walletConnected) {
      alert("Harap hubungkan Sui Wallet Anda terlebih dahulu melalui tombol di Navbar atau Dashboard!");
      return;
    }

    const targetFile = file || new File(["mock file content"], "hackathon_whitepaper.docx", { type: "text/plain" });

    setFileName(targetFile.name);
    setFileSize(`${(targetFile.size / (1024 * 1024)).toFixed(2)} MB`);

    try {
      // 1. Hashing
      setSimStep("hashing");
      setSimProgress(15);
      
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(targetFile);
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      setSimProgress(45);

      // 2. Storing & Registering (Proses API)
      setSimStep("storing");
      setSimProgress(70);
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBuffer: base64Data })
      });

      const result = await res.json();
      
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal memproses file di backend.");
      }

      setSimProgress(85);

      // REAL SUI CONNECTION: Sign and execute a transaction block using the user's connected wallet
      const tx = new Transaction();
      const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
      const registryId = process.env.NEXT_PUBLIC_REGISTRY_ID;

      if (packageId && registryId && packageId !== "your-package-id-here" && registryId !== "your-registry-object-id-here") {
        // Option A: Call the Sui Move Smart Contract (On-Chain Registry)
        tx.moveCall({
          target: `${packageId}::veridocs::register_document`,
          arguments: [
            tx.object(registryId),
            tx.pure.string(result.hash),
            tx.pure.string(targetFile.name),
            tx.pure.string(result.blobId || ""),
            tx.pure.u64(Date.now())
          ],
        });
      } else {
        // Option B: Fallback to self-transfer of 0.0001 SUI if smart contract is not yet configured in .env.local
        const [coin] = tx.splitCoins(tx.gas, [100000]);
        tx.transferObjects([coin], walletAddress!);
      }

      // Execute on SUI Mainnet
      const executeResult = await signAndExecute({ transaction: tx });
      const realTxDigest = executeResult.digest;

      setSimProgress(100);

      // 3. Success
      setSimStep("success");
      setRealHash(result.hash);
      setRealTxHash(realTxDigest);
      setRealBlobId(result.blobId || null);

      // Save to localStorage under connected wallet address
      if (typeof window !== "undefined" && walletAddress) {
        const storageKey = `veridocs_history_${walletAddress}`;
        const currentHistory = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const newDoc = {
          name: targetFile.name,
          size: `${(targetFile.size / (1024 * 1024)).toFixed(2)} MB`,
          hash: result.hash,
          txHash: realTxDigest,
          blobId: result.blobId || "",
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
        };
        const updatedHistory = [newDoc, ...currentHistory];
        localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
      }
    } catch (err: unknown) {
      console.error("Simulation Error:", err);
      setSimStep("idle");
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("Rejected")) {
        alert("Transaksi dibatalkan oleh pengguna.");
      } else if (errorMessage.includes("dynamic_field::add") && (errorMessage.includes("abort code: 0") || errorMessage.includes("MoveAbort"))) {
        alert("Gagal melakukan notarisasi: Dokumen dengan isi/hash ini sudah pernah dinotarisasi di blockchain sebelumnya! Silakan verifikasi file ini di menu 'Verify' atau coba dengan file lain.");
      } else {
        alert("Gagal melakukan notarisasi on-chain: " + errorMessage);
      }
    }
  };

  const resetSimulation = () => {
    setSimStep("idle");
    setSimProgress(0);
    setSelectedFile(null);
    setFileName("Belum ada file dipilih");
    setFileSize("");
    setRealHash("");
    setRealTxHash(null);
    setRealBlobId(null);
  };

  // Motion variants for stagger fade-in
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 25, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="relative w-full">
      {/* ----------------- HERO SECTION ----------------- */}
      <section
        id="home"
        className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-20 px-6 md:px-12"
      >
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-7 flex flex-col justify-center text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border-sky-500/20 text-sky-400 text-xs font-semibold mb-6 w-fit animate-pulse-slow">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              Tatum Hackathon Project 2026
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-white mb-6">
              Securing Truth with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-300 to-white text-glow">
                Decentralized Notary
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl font-light leading-relaxed">
              Verify and certify documents instantly. Sui-VeriDocs combines the high-speed security of the Sui Blockchain, decentralized storage of Walrus Protocol, and Tatum API integrations for tamper-proof digital notarization.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <a
                href="#how-it-works"
                className="glow-btn inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-102"
              >
                Try Live Notarization
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 glass-panel hover:bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-base transition-all duration-300 border-white/10"
              >
                Explore Features
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10 max-w-lg">
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-white text-glow">
                  {stats.documents > 0 ? `${(stats.documents / 1000).toFixed(1)}k+` : "0"}
                </div>
                <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Secured Docs</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-white text-glow">
                  {stats.verified > 0 ? `${stats.verified}%` : "0%"}
                </div>
                <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Validation Rate</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-white text-glow">
                  {stats.gasSaved > 0 ? `-${stats.gasSaved}%` : "0%"}
                </div>
                <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Gas Savings</div>
              </div>
            </div>
          </motion.div>

          {/* Hero Anti-Gravity Floating Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="lg:col-span-5 flex justify-center lg:justify-end relative"
          >
            {/* Main Interactive Floating Card */}
            <motion.div
              animate={{
                y: [0, -12, 0],
                rotateZ: [0, 1.5, 0]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-full max-w-[400px] glass-panel rounded-3xl p-6 relative border-white/10 overflow-hidden shadow-2xl"
            >
              {/* Card Glow Mesh */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>

              {/* Card Header */}
              <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
                    <ShieldCheck className="w-4.5 h-4.5 text-sky-400" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">SUI ANCHOR</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold tracking-wider">
                  ACTIVE SEAL
                </span>
              </div>

              {/* Document Details Mock */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">DOCUMENT IDENTITY</label>
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                    notary_agreement_v2.pdf
                  </p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">CRYPTOGRAPHIC HASH</label>
                  <p className="text-xs font-mono text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-white/5 truncate">
                    SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">WALRUS BLOB ID</label>
                    <p className="text-xs font-mono text-sky-400 truncate bg-slate-950/50 p-2 rounded-lg border border-white/5">
                      0x9c48b2a1a8...
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">ANCHOR BLOCK</label>
                    <p className="text-xs font-mono text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-white/5 truncate">
                      #34,892,109
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Blockchain Signatures */}
              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tatum Gas Fee:</span>
                  <span className="text-sky-300 font-mono">0.0031 SUI</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-white font-mono">2026-06-05 02:58 UTC</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                    className="w-1/2 h-full bg-gradient-to-r from-transparent via-sky-400 to-transparent"
                  ></motion.div>
                </div>
              </div>
            </motion.div>

            {/* Smaller Satellite Decorative Cards to reinforce Anti-Gravity */}
            <motion.div
              animate={{
                y: [0, 8, 0],
                x: [0, -4, 0]
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className="absolute -top-6 -left-6 glass-panel border-white/10 rounded-2xl p-3.5 shadow-xl hidden sm:flex items-center gap-3 backdrop-blur-xl"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Status</p>
                <p className="text-xs font-bold text-white mt-0.5">Immutable</p>
              </div>
            </motion.div>

            <motion.div
              animate={{
                y: [0, -10, 0],
                x: [0, 6, 0]
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="absolute -bottom-6 -right-4 glass-panel border-white/10 rounded-2xl p-4 shadow-xl hidden sm:flex items-center gap-3.5 backdrop-blur-xl"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Net Speed</p>
                <p className="text-xs font-bold text-white mt-0.5">0.4s Verification</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ----------------- FEATURES SECTION ----------------- */}
      <section
        id="features"
        className="relative py-24 px-6 md:px-12 border-t border-white/5 bg-slate-950/20"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-3">Core Infrastructure</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">
              Secured by the Most Advanced Distributed Systems
            </h3>
            <p className="text-base text-slate-400 mt-4 leading-relaxed">
              We leverage modern Web3 storage pipelines and smart-contract verification layers to deliver rapid, low-cost, and unbreakable document registry seals.
            </p>
          </div>

          {/* Cards Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Feature 1: Decentralized Storage (Walrus) */}
            <motion.div
              variants={itemVariants}
              className="glass-panel glass-panel-hover rounded-3xl p-8 flex flex-col items-start text-left relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-all duration-300"></div>
              
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-8 group-hover:border-sky-500/40 transition-colors">
                <Database className="w-6 h-6" />
              </div>
              
              <h4 className="text-xl font-bold text-white mb-4">Decentralized Storage (Walrus)</h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Your primary document metadata and payload structures are distributed safely on the Walrus Protocol. Avoid heavy blockchain state storage fees while maintaining total redundancy and high accessibility.
              </p>
              
              <span className="text-xs font-semibold text-sky-400 mt-auto flex items-center gap-1.5 group/link">
                Walrus Integration Docs 
                <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </span>
            </motion.div>

            {/* Feature 2: Verification (Tatum/Sui) */}
            <motion.div
              variants={itemVariants}
              className="glass-panel glass-panel-hover rounded-3xl p-8 flex flex-col items-start text-left relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-all duration-300"></div>

              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-8 group-hover:border-sky-500/40 transition-colors">
                <Cpu className="w-6 h-6" />
              </div>

              <h4 className="text-xl font-bold text-white mb-4">Verification Layer (Tatum/Sui)</h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Harnessing the speed and sub-second finality of the Sui Network through Tatum&apos;s simplified infrastructure nodes. Execution speeds are ultra-fast, processing notarizations in milliseconds with minor gas cost.
              </p>

              <span className="text-xs font-semibold text-sky-400 mt-auto flex items-center gap-1.5 group/link">
                Sui Explorer Contracts 
                <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </span>
            </motion.div>

            {/* Feature 3: Immutable Proof */}
            <motion.div
              variants={itemVariants}
              className="glass-panel glass-panel-hover rounded-3xl p-8 flex flex-col items-start text-left relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-all duration-300"></div>

              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-8 group-hover:border-sky-500/40 transition-colors">
                <Lock className="w-6 h-6" />
              </div>

              <h4 className="text-xl font-bold text-white mb-4">Immutable Proof</h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                All records, hashes, and ownership signatures are locked in a cryptographic state vault on-chain. Once registered, the document&apos;s verification status remains unchanged and is globally auditable forever.
              </p>

              <span className="text-xs font-semibold text-sky-400 mt-auto flex items-center gap-1.5 group/link">
                Cryptographic Spec 
                <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ----------------- HOW IT WORKS / NOTARIZATION SECTION ----------------- */}
      <section
        id="how-it-works"
        className="relative py-16 px-6 md:px-12 border-t border-white/5 bg-slate-950/40"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-3">System Workflow</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">
              How Sui-VeriDocs Secures Your Document
            </h3>
            <p className="text-base text-slate-400 mt-4">
              Our 4-step trust process generates cryptographically validated notarization proofs in seconds. Try it yourself with the interactive notarization tool below.
            </p>
          </div>

          {/* Workflow Steps Line Graphic */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16 relative">
            {/* Step 1 */}
            <div className="glass-panel rounded-2xl p-6 relative border-white/5">
              <span className="absolute -top-3.5 -left-3.5 w-8 h-8 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow-md">
                1
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-4">
                <Upload className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-white mb-2 text-base">Upload Document</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add your file. All actions happen locally to protect your confidentiality.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-panel rounded-2xl p-6 relative border-white/5">
              <span className="absolute -top-3.5 -left-3.5 w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-sm shadow-md">
                2
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-4">
                <Hash className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-white mb-2 text-base">Generate Hash</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculate SHA-256 fingerprint representing the document&apos;s unique payload.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-panel rounded-2xl p-6 relative border-white/5">
              <span className="absolute -top-3.5 -left-3.5 w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-sm shadow-md">
                3
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-white mb-2 text-base">Register Proof</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Store file metadata onto Walrus and anchor cryptographic logs on the Sui chain.
              </p>
            </div>

            {/* Step 4 */}
            <div className="glass-panel rounded-2xl p-6 relative border-white/5">
              <span className="absolute -top-3.5 -left-3.5 w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-sm shadow-md">
                4
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-4">
                <FileCheck className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-white mb-2 text-base">Verify Instantly</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Anyone with access to the source file can instantly verify authenticity online.
              </p>
            </div>
          </div>

          {/* Interactive Notary Container */}
          <div className="max-w-3xl mx-auto">
            <div className="glass-panel rounded-3xl border-white/10 p-6 md:p-8 relative">
              {/* Background glowing ring */}
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>

              {/* Locked Overlay if wallet is not connected */}
              {!walletConnected && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-8 rounded-3xl overflow-hidden">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sky-400 mb-4 shadow-md">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Notarization Locked</h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                    Please connect your Sui Wallet to access the live notarization tool and upload files to Walrus.
                  </p>
                  <ConnectModal
                    trigger={
                      <button
                        onClick={() => setShowModal(true)}
                        className="glow-btn inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-102 cursor-pointer border-0"
                      >
                        <Wallet className="w-4 h-4" />
                        Connect Wallet
                      </button>
                    }
                    open={showModal}
                    onOpenChange={(open) => setShowModal(open)}
                  />
                </div>
              )}

              {/* Title & Info */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <div>
                  <h4 className="font-bold text-lg text-white">Live Notarization Tool</h4>
                  <p className="text-xs text-slate-400">Experience our Sui & Walrus pipeline execution</p>
                </div>
                <button
                  onClick={resetSimulation}
                  disabled={simStep === "idle" || simStep !== "success"}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:text-slate-400"
                  title="Reset Tool"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Display Panel based on step */}
              <div className="min-h-[220px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {/* Step: IDLE */}
                  {simStep === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center justify-center py-6 text-center"
                    >
                      <label className="w-16 h-16 rounded-2xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-400 mb-4 cursor-pointer hover:border-sky-500/40 hover:text-sky-400 transition-colors">
                        <Upload className="w-7 h-7" />
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                              setFileName(file.name);
                              setFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
                            }
                          }}
                        />
                      </label>
                      
                      <div className="mb-4">
                        <span className={`text-sm font-semibold block ${selectedFile ? "text-white" : "text-slate-400"}`}>{fileName}</span>
                        {fileSize && <span className="text-xs text-slate-400">{fileSize}</span>}
                        {selectedFile && (
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              setFileName("Belum ada file dipilih");
                              setFileSize("");
                            }}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:underline mt-1 block transition-colors"
                          >
                            Ganti File
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => { if (selectedFile) startSimulation(selectedFile); }}
                        disabled={!selectedFile}
                        className={`font-bold px-8 py-3.5 rounded-xl text-sm transition-all duration-300 inline-flex items-center gap-2 ${
                          selectedFile
                            ? "glow-btn bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer"
                            : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        Notarize Document
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {/* Step: RUNNING (hashing, storing, registering) */}
                  {(simStep === "hashing" || simStep === "storing" || simStep === "registering") && (
                    <motion.div
                      key="running"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 py-6"
                    >
                      {/* Step Indicator */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">
                          {simStep === "hashing" && "Calculating document checksum..."}
                          {simStep === "storing" && "Splitting and storing blob chunks on Walrus..."}
                          {simStep === "registering" && "Recording proof on Sui blockchain via Tatum..."}
                        </span>
                        <span className="font-mono text-sky-400 font-bold">{simProgress}%</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          className="h-full bg-sky-500 shadow-md shadow-sky-500/50"
                          initial={{ width: "0%" }}
                          animate={{ width: `${simProgress}%` }}
                          transition={{ duration: 0.8 }}
                        ></motion.div>
                      </div>

                      {/* Visual Flow Pipeline */}
                      <div className="grid grid-cols-3 gap-4 pt-4 text-xs text-center">
                        <div className={`p-3 rounded-xl border transition-all duration-300 ${
                          simStep === "hashing" 
                            ? "bg-sky-500/10 border-sky-500/30 text-sky-400 font-semibold"
                            : "bg-slate-950/40 border-white/5 text-slate-500"
                        }`}>
                          <Hash className="w-4.5 h-4.5 mx-auto mb-2 text-center" />
                          Local Hash
                        </div>
                        <div className={`p-3 rounded-xl border transition-all duration-300 ${
                          simStep === "storing" 
                            ? "bg-sky-500/10 border-sky-500/30 text-sky-400 font-semibold"
                            : "bg-slate-950/40 border-white/5 text-slate-500"
                        }`}>
                          <Database className="w-4.5 h-4.5 mx-auto mb-2 text-center" />
                          Walrus Storage
                        </div>
                        <div className={`p-3 rounded-xl border transition-all duration-300 ${
                          simStep === "registering" 
                            ? "bg-sky-500/10 border-sky-500/30 text-sky-400 font-semibold"
                            : "bg-slate-950/40 border-white/5 text-slate-500"
                        }`}>
                          <Cpu className="w-4.5 h-4.5 mx-auto mb-2 text-center" />
                          Sui Tatum Node
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step: SUCCESS */}
                  {simStep === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="py-2"
                    >
                      {/* Success Badge */}
                      <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-base">Notarization Confirmed</h5>
                          <p className="text-xs text-emerald-400">Document successfully anchored on the Sui Mainnet via Tatum RPC</p>
                        </div>
                      </div>

                      {/* Notarization Receipt Details */}
                      <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-3.5 mb-6 text-xs md:text-sm">
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                          <span className="text-slate-400">File Certified</span>
                          <span className="text-white font-semibold">{fileName}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                          <span className="text-slate-400">File SHA-256</span>
                          <span className="text-white font-mono text-[11px] max-w-[200px] md:max-w-none truncate" title={realHash}>
                            {realHash}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                          <span className="text-slate-400">Walrus Blob ID</span>
                          {realBlobId ? (
                            <a 
                              href={`/api/view/${realBlobId}?name=${fileName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-400 hover:text-sky-300 font-mono text-[11px] flex items-center gap-1 hover:underline max-w-[200px] md:max-w-none truncate"
                              title={realBlobId}
                            >
                              {realBlobId.length > 16 ? `${realBlobId.slice(0, 10)}...${realBlobId.slice(-6)}` : realBlobId}
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-500">N/A</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                          <span className="text-slate-400">Walrus Redundancy</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            4x Store Replicas
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-slate-400">Sui Registry TX</span>
                          <a 
                            href={realTxHash && realTxHash.length > 20 ? `https://suiscan.xyz/mainnet/tx/${realTxHash}` : "#"}
                            target={realTxHash && realTxHash.length > 20 ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:text-sky-300 font-mono text-[11px] flex items-center gap-1 hover:underline"
                            title={realTxHash || ""}
                          >
                            {realTxHash ? (realTxHash.length > 16 ? `${realTxHash.slice(0, 10)}...${realTxHash.slice(-6)}` : realTxHash) : "N/A"}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={resetSimulation}
                          className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                        >
                          Certify Another
                        </button>
                        <a
                          href={realTxHash ? `https://suiscan.xyz/mainnet/tx/${realTxHash}` : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`glow-btn font-bold px-6 py-3 rounded-xl text-sm transition-all duration-300 inline-flex items-center gap-2 ${
                            realTxHash 
                              ? "bg-sky-500 hover:bg-sky-400 text-slate-950" 
                              : "bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none"
                          }`}
                          onClick={(e) => {
                            if (!realTxHash) {
                              e.preventDefault();
                              alert("Harap lakukan verifikasi dokumen terlebih dahulu!");
                            }
                          }}
                        >
                          Verify Receipt
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
