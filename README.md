# **Absent — Zero-Knowledge Proof of Absence on Solana**

> **Most systems prove what you did.  
Absent proves what you didn’t.**

---

## 🔍 What is Absent?

**Absent** is a Solana-native protocol that introduces a new cryptographic primitive:

### ✅ **Verifiable Absence**

It allows wallets to prove — using Zero-Knowledge Proofs — that they have **NOT**:

- interacted with a specific contract  
- participated in a restricted phase  
- belonged to a forbidden on-chain set  

…while **revealing nothing else** about identity, history, or behavior.

This enables:

- **Fairness without surveillance**
- **Trust without doxxing**
- **Compliance without centralization**

---

## 🎯 Why It Matters

Today, blockchain systems face a harsh tradeoff:

❌ **No filtering** → bots, exploits, unfair advantages  
❌ **Full transparency filtering** → wallet surveillance, deanonymization, privacy loss  

Existing approaches depend on:

- centralized data indexers  
- exposing full transaction history  
- identity systems / KYC  

**Absent replaces trust assumptions with cryptography**, enabling selective, verifiable absence — without violating privacy.

---

## 🌀 The Twist: Contextual Absence Proofs

Absent doesn’t just prove:

> “This wallet never interacted with contract X.”

It proves:

> “This wallet never interacted with **contract X** during **context Y**.”

Where **context** may be:

- ⏱️ a time window  
- ⛓️ a block range  
- 🎯 a protocol-defined event  

### Examples

- Prove you **did not** use an exploit contract before it was patched  
- Prove you **did not** mint during a presale phase  
- Prove you **did not** vote during a restricted governance epoch  

This makes Absent dramatically more flexible and powerful than simple blacklist checks.

---

## 🧩 Core Use Cases

### ❄️ Clean Wallet Airdrops
Prove your wallet never interacted with:
- bot infrastructure  
- exploit contracts  
- farming abuse systems  

Without revealing what it *did* interact with.

---

### 🎨 Fair NFT Launches
Prove a wallet:
- did not mint early  
- did not exploit private phases  

→ ensures fairness without leaking whitelist data.

---

### 🛡️ Compliance Without Surveillance
Protocols can require proof of:
- no sanctioned contract exposure  
- no interaction with high-risk protocols  

…without storing personal data or tracking users.

---

### 🏪 Trust for Marketplaces
Wallets can show **Absent Proof Badges** such as:

- “No scam contract history”
- “No exploit exposure”

→ Trust, without building dystopian identity systems.

---

### 🏛 Governance Integrity
DAOs can verify voters:
- weren’t previously engaged in manipulation
- didn’t participate in restricted governance epochs  

→ Stronger governance, zero privacy compromise.

---

## ⚙️ How Absent Works (High Level)

1️⃣ **Define Forbidden Context**
- contract(s)
- optional time / block constraints  

2️⃣ **Local Computation**
- user processes their own interaction set  
- Merkle commitment generated  

3️⃣ **Zero-Knowledge Non-Membership Proof**
- proves the wallet **did not** belong to forbidden set  
- enforces contextual constraints  

4️⃣ **On-Chain Verification**
- Solana program verifies proof  
- protocol grants eligibility / claim / access  

📌 **At no point is transaction history revealed.**

---

## 🏗 Architecture

- **Frontend** — Next.js + Solana Wallet Adapter  
- **ZK Layer** — non-membership proof circuits  
- **Off-Chain Indexing** — lightweight & privacy-preserving  
- **Solana Program** — Anchor-powered verifier  

MVP uses hybrid verification with a clear path to full on-chain ZK enforcement.

---

## 🚀 Current MVP (Hackathon Build)

This submission ships a **minimal but complete end-to-end working system.**

🔗 Demo / Pitch Video  
https://www.youtube.com/watch?v=XWw1e9-qPD8  

---

## 🛠 How to Run

### Frontend
```bash
npm i
npm run dev
```

### Backend
```
cd absent-verifier
npm i
node index.js
```

