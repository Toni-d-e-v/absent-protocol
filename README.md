
# **Absent — Cryptographic Proof of Not Doing Something (Contextual Absence on Solana)**

🌐 **Live App:** https://absent-protocol.vercel.app  
🎥 **Pitch Video:** https://www.youtube.com/watch?v=XWw1e9-qPD8  

---

> **Most blockchain systems prove what you *did*.  
Absent is built to prove what you *didn’t*.**

Absent introduces **contextual absence** as a cryptographic primitive on Solana — enabling users to prove that their wallet **did NOT** interact with a forbidden program during a defined time window.  
In the hackathon MVP, verification is **hybrid**: absence is validated off-chain, while Solana enforces trust boundaries, replay protection, and award minting.

---

## 🚀 What This MVP Demonstrates

✔️ Proving **non-interaction** with a forbidden contract  
✔️ Context-based absence (`start_slot → end_slot`)  
✔️ Secure replay protection using PDAs  
✔️ Hybrid verifier trust model  
✔️ Optional **Absent Award NFT** mint

Even though full Zero-Knowledge isn’t active yet, the system is designed so **the on-chain program doesn’t need to change** to support it later.

---

## 🌀 Contextual Absence (Core Concept)

Absent proves:

> **This wallet did NOT interact with program P between slots X and Y**

Context is:
- public
- immutable in configuration
- enforced through a Config PDA

This enables:
- “No exploit exposure before patch”
- “No early mint during private phase”
- “No governance participation during restricted window”

---

## 🔐 Current Trust + Security Model

**MVP Model (Hackathon Reality):**
- A verifier service:
  - checks wallet history within the slot window  
  - ensures no forbidden interaction  
  - signs the claim or co-signs the tx
- The Solana program:
  - enforces correct verifier
  - prevents replay using Claim PDA
  - mints a one-per-wallet award token

➡️ Trusted-but-cryptographically-bounded today  
➡️ Fully ZK-capable tomorrow

---

## 🧱 On-Chain Architecture

### **Config PDA**
Stores protocol + context:
- `admin`
- `verifier`
- `forbidden_program`
- `start_slot`
- `end_slot`

---

### **Claim PDA**
Stores successful proof and blocks replay:
- `user`
- `config`
- `proof_hash`
- `claimed`

Seeded uniquely per:
`config + user + start_slot + end_slot + forbidden_program`

---

## 🧾 Program Entrypoints

### `initialize`
Create Config + define context

### `update_context`
Admin updates forbidden program + slot window

### `verify_and_award`
- Verifier must sign
- Creates Claim PDA
- Stores proof hash
- Mints **Absent Award NFT** (SPL, supply 1)

---

## 🖥 Verifier Service (Off-Chain)

Responsibilities:
1️⃣ Read Config  
2️⃣ Scan activity in slot window  
3️⃣ Ensure no forbidden interactions  
4️⃣ Produce a canonical `proof_hash`  
5️⃣ Co-sign transaction in MVP

Later:
- Replace scanning with **ZK non-membership proof**
- Keep same program interface

---

## 🧑‍🚀 Frontend Flow (Next.js)

1️⃣ User connects wallet  
2️⃣ App loads current Absent context  
3️⃣ User clicks **Generate Proof**  
4️⃣ Verifier validates absence + returns proof hash  
5️⃣ Transaction executes → Claim created → Award minted  
6️⃣ UI displays badge + claim status

---

## 🏅 Absent Award NFT

A **non-transferable or single-supply badge** representing:

> “This wallet verifiably proved absence in this context.”

- Contains no sensitive data
- Fully privacy-preserving
- Portable across protocols

---

## 🧭 Roadmap Toward Full Decentralization

1️⃣ M-of-N verifier sets (consensus-based trust)  
2️⃣ On-chain attestation / registry  
3️⃣ Full on-chain Zero-Knowledge verification  

The current architecture is already prepared.

---

## 🧠 Honest Summary

Absent proves integrity **without forcing users to expose their history**.  
This MVP demonstrates the architecture, trust boundaries, replay protection, award minting, and contextual absence logic — while keeping the door open for full Zero-Knowledge integration with **no redesign needed**.

---

## 🧠 One-Liner

> **Absent makes “not doing something” provable — privately, cryptographically, and composably on Solana.**
```


# HOW TO RUN
### FRONTEND
```
npm i
npm run dev
```
### BACKEND
```
cd absent-verifier
npm i
node index.js
```
