## 🚀 Current MVP (Hackathon Scope)

This submission implements a **minimal but complete end-to-end system**.



## How to run

First run the front end 
```
npm i
npm run dev
```
And run the backend in new terminal
```
cd absent-verifier
npm i
node index.js
```


### MVP Features
- One forbidden smart contract
- One fixed time window (slot range)
- One claim per wallet
- On-chain replay protection
- Deterministic credential minting

### What’s On-Chain
- Config PDA (verifier, forbidden program, slot window)
- Claim uniqueness enforcement via PDAs
- Credential minting logic
- Verifier authority enforcement

### What’s Off-Chain
- Transaction history scanning
- Absence verification logic
- Attestation generation

---

## 🔐 Security Model

- Verifier public key is stored **on-chain**
- Only the configured verifier can authorize claims
- Users always sign their own transactions
- Claims are one-time and replay-protected
- Invalid proofs fail deterministically

The verifier **cannot bypass** the on-chain program.

---




## 🔮 Future Roadmap

Absent is designed so the **on-chain program does not need to change** as the system evolves.

### Planned Extensions
- Multiple verifiers (M-of-N threshold attestations)
- Community-run oracle verifier networks
- DAO-governed verifier registry
- Context-specific absence proofs

### Zero-Knowledge Phase
- ZK non-membership proofs
- Privacy-preserving absence credentials
- Local proof generation by users
- On-chain ZK verification

---

## 🧪 Tech Stack

- **Solana** (Anchor framework)
- **Node.js** verifier service
- **Next.js** frontend
- **Phantom Wallet**
- **Devnet** deployment

---

## 🏁 Status

✅ Working MVP  
🚧 Hackathon prototype  
🔬 Designed for extensibility  

---

## 📣 Hackathon Submission

This project is submitted to the **Solana Student Hackathon**.

Built with a focus on:
- correctness
- architectural clarity
- honest constraints
- future extensibility

---

## 🧠 One-Liner

> **Absence is harder to prove than presence.  
> Absent makes it possible.**
