# Sui-VeriDocs 🛡️

**Sui-VeriDocs** is a decentralized digital notary system that provides secure, immutable, and instant document verification. Built for the **2026 Sui Developer Hackathon**, the project integrates **Sui Blockchain** for transaction anchoring, **Walrus Protocol** for decentralized metadata storage, and **Tatum RPC Gateway** for fast, high-availability mainnet node operations.

---

## 🚀 Features

- **Local Cryptographic Hashing**: File checksums (SHA-256) are generated locally in the browser to maintain maximum data privacy. The actual document content never leaves your machine.
- **Decentralized Blob Storage (Walrus)**: Metadata and redundancy profiles are stored directly on the **Walrus Testnet**, providing low-cost, decentralized file availability.
- **On-Chain Anchor Registry**: Transactions are anchored permanently on the **Sui Mainnet**, creating a globally verifiable and tamper-proof time-stamp seal.
- **Tatum RPC Gateway**: Leverages Tatum's high-speed RPC gateway on the backend for live block verification, state queries, and transaction checkpoint checks.
- **Client-Side Wallet Integration**: Standard Sui wallet sign-and-execute transaction flows using `@mysten/dapp-kit` (compatible with Sui Wallet, Suiet, OKX, etc.) via public mainnet RPC nodes to ensure zero CORS or browser fetch blocks.
- **User Dashboard & History**: Tracks your notarized records locally (isolated by connected wallet address) for quick auditing and links to the **Suiscan Mainnet Explorer**.

---

## 🛠️ Architecture & Pipeline

```
[User Selects File] ──> [SHA-256 Hash Generated Locally]
                              │
                              ├──> [Upload metadata to Walrus Testnet]
                              │
                              ├──> [Query Sui Checkpoint via Tatum RPC]
                              │
                              └──> [Wallet Prompt: Sign & Execute SUI Tx]
                                             │
                                             └──> [Anchor Tx on Sui Mainnet]
```

---

## 💻 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Styling**: Tailwind CSS
- **Blockchain Integration**: `@mysten/sui` SDK & `@mysten/dapp-kit`
- **RPC Gateway Provider**: [Tatum SUI RPC Gateway](https://tatum.io/)
- **Decentralized Storage**: [Walrus Protocol](https://walrus.xyz/)
- **Icons**: Lucide React
- **Animations**: Framer Motion

---

## ⚙️ Installation & Local Setup

### Prerequisites

- Node.js (v18+ recommended)
- A Sui Wallet Extension installed in your browser (e.g., Sui Wallet, Suiet)
- A Tatum Mainnet API Key (Register at [tatum.io](https://tatum.io/) for free)

### Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/sui-veridocs.git
   cd sui-veridocs
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and add your credentials:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and update the keys:
   ```env
   # Add your Tatum Mainnet API Key (starts with m-)
   TATUM_API_KEY=m-6a21...
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security Practices

- **API Key Secrecy**: The Tatum API key is strictly maintained on the server-side inside Next.js API Routes (`/api/verify`). The frontend does not expose the secret key.
- **Wallet Stability**: The browser client connects to the official public Sui Mainnet node to execute wallet transactions, avoiding CORS errors and preventing API key exposure in developer logs.
- **Zero Document Leakage**: Documents are not uploaded to our backend. We only upload the cryptographic SHA-256 string and meta description to Walrus, ensuring your documents remain 100% private.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
