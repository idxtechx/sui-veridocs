"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Menu, X, Wallet } from "lucide-react";
import { useCurrentAccount, useDisconnectWallet, ConnectModal } from "@mysten/dapp-kit";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  const walletConnected = !!currentAccount;
  const walletAddress = currentAccount?.address || null;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/#features" },
    { name: "How it Works", href: "/#how-it-works" },
    { name: "Verify", href: "/verify" },
    { name: "Dashboard", href: "/dashboard" },
  ];

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "py-4 bg-slate-950/75 backdrop-blur-lg border-b border-white/5"
          : "py-6 bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center group-hover:border-sky-500/60 transition-all duration-300">
            <ShieldCheck className="w-5.5 h-5.5 text-sky-400" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Sui<span className="text-sky-400">VeriDocs</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group py-2"
            >
              {link.name}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-sky-400 transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}
        </nav>

        {/* Connect Wallet Button (Desktop) */}
        <div className="hidden md:block">
          {walletConnected ? (
            <button
              onClick={() => disconnect()}
              className="glow-btn inline-flex items-center gap-2 bg-slate-900 border border-sky-500/30 text-white hover:border-sky-500/60 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-102 cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connected"}
            </button>
          ) : (
            <ConnectModal
              trigger={
                <button
                  onClick={() => setShowModal(true)}
                  className="glow-btn inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-102 cursor-pointer border-0"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              }
              open={showModal}
              onOpenChange={(open) => setShowModal(open)}
            />
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-b border-white/5 bg-slate-950/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-slate-300 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              {walletConnected ? (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    disconnect();
                  }}
                  className="flex items-center justify-center gap-2 bg-slate-900 border border-sky-500/30 text-white px-5 py-3.5 rounded-xl font-bold text-base transition-colors text-center w-full shadow-lg shadow-sky-500/5 cursor-pointer"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connected"}
                </button>
              ) : (
                <ConnectModal
                  trigger={
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setShowModal(true);
                      }}
                      className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 px-5 py-3.5 rounded-xl font-bold text-base transition-colors text-center w-full shadow-lg shadow-sky-500/20 cursor-pointer border-0"
                    >
                      <Wallet className="w-4.5 h-4.5" />
                      Connect Wallet
                    </button>
                  }
                  open={showModal}
                  onOpenChange={(open) => setShowModal(open)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
