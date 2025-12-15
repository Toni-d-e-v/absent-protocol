"use client";

import { useEffect, useRef, useState } from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";

const RPC = process.env.NEXT_PUBLIC_RPC!;
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID!
);
const VERIFIER_API =
  process.env.NEXT_PUBLIC_VERIFIER_API!;

type Status =
  | "idle"
  | "checking"
  | "ready"
  | "proving"
  | "claimed"
  | "success"
  | "error";

type Tab = "overview" | "mvp" | "future";

export default function Page() {
  const [wallet, setWallet] = useState<any>(null);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [txSig, setTxSig] = useState<string | null>(null);

  const [showAbout, setShowAbout] = useState(false);
  const [activeTab, setActiveTab] =
    useState<Tab>("overview");

  const [isMobile, setIsMobile] = useState(false);

  const connection = new Connection(RPC, "confirmed");

  /* ---------------- MOBILE ---------------- */

  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () =>
      window.removeEventListener("resize", check);
  }, []);

  /* ---------------- WALLET ---------------- */

  const connectWallet = async () => {
    const w: any = window;
    if (!w.solana?.isPhantom) {
      alert("Phantom wallet required");
      return;
    }
    const res = await w.solana.connect();
    setWallet(w.solana);
    setPubkey(res.publicKey.toBase58());
  };

  /* ---------------- CLAIM CHECK ---------------- */

  const checkClaimed = async (user: PublicKey) => {
    setStatus("checking");
    const accounts =
      await connection.getProgramAccounts(
        PROGRAM_ID,
        {
          filters: [
            {
              memcmp: {
                offset: 8,
                bytes: user.toBase58(),
              },
            },
          ],
        }
      );
    setStatus(
      accounts.length > 0 ? "claimed" : "ready"
    );
  };

  useEffect(() => {
    if (wallet?.publicKey) {
      checkClaimed(wallet.publicKey);
    }
  }, [wallet]);

  /* ---------------- CLAIM ---------------- */

  const claimAbsent = async () => {
    if (!wallet?.publicKey) return;
    try {
      setStatus("proving");

      const res = await fetch(
        `${VERIFIER_API}/prepare-claim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userPubkey:
              wallet.publicKey.toBase58(),
          }),
        }
      );

      const json = await res.json();
      if (!json.success)
        throw new Error(json.error);

      const tx = Transaction.from(
        Buffer.from(json.txBase64, "base64")
      );

      const signed =
        await wallet.signTransaction(tx);

      const sig =
        await connection.sendRawTransaction(
          signed.serialize()
        );

      await connection.confirmTransaction(
        sig,
        "confirmed"
      );

      setTxSig(sig);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="relative min-h-screen bg-black text-white font-mono flex items-center justify-center px-4 overflow-hidden">

      {/* BACKGROUND NOISE */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.15)_0px,rgba(255,255,255,0.15)_1px,transparent_1px,transparent_2px)]" />

      <div className="relative w-full max-w-2xl border border-white/10 rounded-2xl p-8 md:p-10 space-y-8">

        {/* HEADER */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl tracking-widest">
              ABSENT
            </h1>
            <p className="text-xs text-white/40">
              Cryptographic proof of absence
            </p>
          </div>
          <button
            onClick={() => setShowAbout(true)}
            className="text-xs border border-white/30 px-3 py-2 rounded hover:bg-white hover:text-black transition"
          >
            ABOUT
          </button>
        </div>

        <p className="text-sm text-white/60">
          Prove that your wallet did{" "}
          <span className="text-white">
            not interact
          </span>{" "}
          with a compromised protocol.
        </p>

        {!pubkey ? (
          <button
            onClick={connectWallet}
            className="w-full py-4 border border-white rounded-xl hover:bg-white hover:text-black transition"
          >
            CONNECT WALLET
          </button>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-white/40 break-all">
              {pubkey}
            </div>

            {status === "claimed" && (
              <div className="border border-white/20 p-4 rounded text-yellow-400 text-sm">
                ✓ Already claimed
              </div>
            )}

            {status === "ready" && (
              <button
                onClick={claimAbsent}
                className="w-full py-4 border border-white rounded-xl hover:bg-white hover:text-black transition"
              >
                CLAIM ABSENCE CREDENTIAL
              </button>
            )}

            {status === "proving" && (
              <div className="border border-white/20 p-4 rounded text-sm animate-pulse">
                Verifying history…
              </div>
            )}
          </div>
        )}

        {status === "success" && txSig && (
          <div className="border border-white/20 p-4 rounded text-sm">
            ✓ Success{" "}
            <a
              className="underline text-xs ml-2"
              href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
              target="_blank"
            >
              view tx
            </a>
          </div>
        )}

        <div className="text-xs text-center text-white/30">
          Built for Solana Student Hackathon
        </div>
      </div>

      {/* ABOUT */}
      {showAbout && (
        <AboutWindow
          isMobile={isMobile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => setShowAbout(false)}
        />
      )}
    </main>
  );
}

/* ---------------- ABOUT WINDOW ---------------- */

function AboutWindow({
  isMobile,
  activeTab,
  setActiveTab,
  onClose,
}: any) {
  const [pos, setPos] = useState({ x: 100, y: 80 });
  const [size, setSize] = useState({
    w: 720,
    h: 560,
  });

  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const startDrag = (e: any) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  const startResize = () => {
    resizing.current = true;
  };

  useEffect(() => {
    const move = (e: any) => {
      if (dragging.current) {
        setPos({
          x: e.clientX - offset.current.x,
          y: e.clientY - offset.current.y,
        });
      }
      if (resizing.current) {
        setSize({
          w: Math.max(520, e.clientX - pos.x),
          h: Math.max(420, e.clientY - pos.y),
        });
      }
    };
    const stop = () => {
      dragging.current = false;
      resizing.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
  }, [pos]);

  const content = (
    <>
      {/* TABS */}
      <div className="flex gap-4 border-b border-white/20 text-xs">
        {["overview", "mvp", "future"].map(
          (t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`pb-2 ${
                activeTab === t
                  ? "border-b border-white"
                  : "text-white/40"
              }`}
            >
              {t.toUpperCase()}
            </button>
          )
        )}
      </div>

      <div className="pt-4 text-sm text-white/70 whitespace-pre-wrap">
        {activeTab === "overview" && OVERVIEW}
        {activeTab === "mvp" && MVP}
        {activeTab === "future" && FUTURE}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-50 p-6 overflow-y-auto">
        <button
          onClick={onClose}
          className="mb-4 border border-white px-4 py-2 rounded"
        >
          CLOSE
        </button>
        {content}
      </div>
    );
  }

  return (
    <div
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
      }}
      className="fixed bg-black border border-white/30 rounded-lg z-50 shadow-xl animate-[fadeIn_0.2s_ease-out]"
    >
      <div
        onMouseDown={startDrag}
        className="cursor-move px-4 py-2 border-b border-white/20 text-xs flex justify-between"
      >
        <span>ABOUT_ABSENT.md</span>
        <button onClick={onClose}>✕</button>
      </div>

      <div
        className="px-4 py-3 overflow-auto no-scrollbar" 
        style={{ height: "calc(100% - 42px)" }}
      >
        {content}
      </div>

      <div
        onMouseDown={startResize}
        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize border border-white/40"
      />
    </div>
  );
}

/* ---------------- CONTENT ---------------- */
const OVERVIEW = `
ABSENT — Solana Student Hackathon

Absent is a protocol for proving the absence of on-chain actions.

While blockchains make it easy to prove that something happened,
they make it surprisingly difficult to prove that something did NOT happen.
Absent addresses this asymmetry.

The goal:
Allow a wallet to prove it did NOT interact with a specific
smart contract during a defined time window.

This primitive is useful for:
• Post-hack reputation recovery
• Compliance attestations
• Risk disclosure
• Selective reputation proofs
• Future zero-knowledge credentials

------------------------------------------------------------

PROTOCOL FLOW

User Wallet
   |
   | request verification
   v
Verifier (off-chain)
   |
   | scans public on-chain history
   | produces cryptographic attestation
   v
Solana Program (on-chain)
   |
   | verifies attestation
   | enforces uniqueness
   | mints credential
   v
User Wallet

------------------------------------------------------------

DESIGN PRINCIPLE

Verification and enforcement are intentionally separated.

• Verification requires historical data access
• Enforcement requires trustless execution

Solana programs cannot read transaction history.
Absent embraces this constraint instead of fighting it.
`;

const MVP = `
CURRENT MVP (HACKATHON SCOPE)

This submission implements a minimal but complete
end-to-end version of the Absent protocol.

SCOPE

• One forbidden smart contract
• One fixed time window (slot range)
• One claim per wallet
• Public verification logic
• On-chain replay protection

WHAT IS ON-CHAIN

• Configuration (verifier, forbidden program, slot window)
• Claim uniqueness enforcement via PDAs
• Credential minting logic
• Deterministic, trustless execution

WHAT IS OFF-CHAIN

• Transaction history scanning
• Absence verification logic
• Attestation generation

WHY THIS SPLIT EXISTS

Solana programs cannot:
• Query past transactions
• Scan account history
• Perform unbounded computation

The verifier handles historical verification.
The Solana program handles enforcement and minting.

This separation is intentional and fundamental.

------------------------------------------------------------

SECURITY MODEL (MVP)

• Verifier identity is explicitly stored on-chain
• Only a valid attestation can mint a credential
• Each wallet can claim only once per context
• Replay attacks are prevented by PDA design
`;

const FUTURE = `
FUTURE ROADMAP

Absent is designed to evolve without changing
the core on-chain program.

PLANNED EXTENSIONS

• Multiple verifiers (M-of-N threshold attestations)
• Community-run oracle verifier networks
• DAO-governed verifier registry
• Context-specific absence proofs

ZERO-KNOWLEDGE PHASE

• ZK non-membership proofs
• Privacy-preserving absence credentials
• Local proof generation by users
• On-chain ZK verification

LONG-TERM VISION

Absent becomes a general-purpose
"negative attestation" primitive:

• Prove you did NOT interact with a hack
• Prove you did NOT exceed a risk threshold
• Prove you did NOT perform restricted actions

Absence is harder to prove than presence.
Absent makes it possible.
`;
