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
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showToast, setShowToast] = useState(false);

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
    setStatus("checking");
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
      setErrorMsg("");

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
      if (!json.success) {
        setErrorMsg(json.error || "Verification failed");
        throw new Error(json.error);
      }

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
    } catch (e: any) {
      setStatus("error");
      if (!errorMsg) {
        setErrorMsg(e.message || "Transaction failed");
      }
    }
  };

  const getProgressStep = () => {
    if (status === "idle") return 0;
    if (status === "checking") return 1;
    if (["ready", "proving"].includes(status)) return 2;
    if (["success", "claimed"].includes(status)) return 3;
    return 2;
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white font-mono flex items-center justify-center px-4 overflow-hidden">

      {/* PARTICLE BACKGROUND */}
      <ParticleBackground />

      {/* GLOW EFFECT */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[120px] animate-pulse" />

      <div className="relative w-full max-w-2xl">
        
        {/* MAIN CARD */}
        <div className="border border-green-500/20 bg-black/40 backdrop-blur-xl rounded-2xl p-6 md:p-8 space-y-6 shadow-[0_0_50px_rgba(34,197,94,0.1)]">

          {/* HEADER */}
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                <h1 className="text-3xl md:text-4xl tracking-[0.3em] font-light">
                  ABSENT
                </h1>
              </div>
              <p className="text-[10px] text-green-500/60 tracking-widest pl-4">
                CRYPTOGRAPHIC PROOF OF ABSENCE
              </p>
            </div>
            <button
              onClick={() => setShowAbout(true)}
              className="text-[10px] border border-green-500/30 px-3 py-1.5 rounded hover:bg-green-500/10 hover:border-green-500/60 transition-all duration-300 tracking-wider"
            >
              PROTOCOL INFO
            </button>
          </div>

          {/* HERO STATS - Only show when idle */}
          {status === "idle" && (
            <div className="grid grid-cols-3 gap-3 py-4">
              <div className="text-center space-y-1 bg-green-500/5 border border-green-500/20 rounded-lg py-3">
                <div className="text-2xl font-bold text-green-400">100%</div>
                <div className="text-[9px] text-zinc-500 tracking-wider">ON-CHAIN</div>
              </div>
              <div className="text-center space-y-1 bg-green-500/5 border border-green-500/20 rounded-lg py-3">
                <div className="text-2xl font-bold text-green-400">ZK</div>
                <div className="text-[9px] text-zinc-500 tracking-wider">READY</div>
              </div>
              <div className="text-center space-y-1 bg-green-500/5 border border-green-500/20 rounded-lg py-3">
                <div className="text-2xl font-bold text-green-400">∞</div>
                <div className="text-[9px] text-zinc-500 tracking-wider">TRUSTLESS</div>
              </div>
            </div>
          )}

          {/* DIVIDER */}
          <div className="h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

          {/* DESCRIPTION */}
          <div className="space-y-2 text-center">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Prove that your wallet{" "}
              <span className="text-green-400 font-semibold">
                did not interact
              </span>{" "}
              with a compromised protocol.
            </p>
            <p className="text-xs text-zinc-600">
              Zero-knowledge absence verification on Solana
            </p>
          </div>

          {/* PROGRESS INDICATOR - CENTERED */}
          {status !== "idle" && (
            <div className="flex justify-center py-3">
              <div className="flex items-center gap-3 text-xs">
                {["CONNECT", "VERIFY", "CLAIM"].map((label, i) => (
                  <div key={label} className="flex items-center">
                    <div className={`flex flex-col items-center gap-1.5 ${
                      i < getProgressStep() ? "text-green-400" : 
                      i === getProgressStep() ? "text-green-400 animate-pulse" : 
                      "text-zinc-700"
                    }`}>
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] ${
                        i < getProgressStep() ? "border-green-400 bg-green-400/20" :
                        i === getProgressStep() ? "border-green-400 bg-green-400/10" :
                        "border-zinc-700"
                      }`}>
                        {i < getProgressStep() ? "✓" : i + 1}
                      </div>
                      <span className="text-[9px] tracking-wider">{label}</span>
                    </div>
                    {i < 2 && (
                      <div className={`w-12 h-px mx-3 ${
                        i < getProgressStep() - 1 ? "bg-green-400/40" : "bg-zinc-800"
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROTOCOL INFO BOX */}
          {status !== "idle" && status !== "success" && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-1.5">
              <div className="text-[9px] text-zinc-600 tracking-widest">VERIFICATION TARGET</div>
              <div className="text-[10px] text-zinc-400 font-mono break-all">
                Program: <span className="text-green-400">{PROGRAM_ID.toBase58().slice(0, 20)}...</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Network: <span className="text-green-400">Solana Devnet</span>
              </div>
            </div>
          )}

          {/* MAIN ACTION AREA */}
          {!pubkey ? (
            <div className="space-y-3">
              <button
                onClick={connectWallet}
                className="group w-full py-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl hover:from-green-500/20 hover:to-emerald-500/20 hover:border-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all duration-300 transform active:scale-[0.98]"
              >
                <span className="text-sm tracking-widest group-hover:tracking-[0.3em] transition-all duration-300">
                  CONNECT WALLET
                </span>
              </button>
              <p className="text-center text-xs text-zinc-600">
                Phantom wallet required
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* WALLET INFO */}
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-3 space-y-1.5">
                <div className="text-[9px] text-zinc-600 tracking-widest">CONNECTED WALLET</div>
                <div className="text-[10px] text-green-400 font-mono break-all flex items-start gap-2">
                  <span className="opacity-60">0x</span>
                  <span>{pubkey}</span>
                </div>
              </div>

              {/* CHECKING STATE */}
              {status === "checking" && (
                <div className="border border-green-500/30 bg-green-500/5 p-4 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-green-400 animate-pulse">
                      Scanning blockchain history...
                    </span>
                  </div>
                </div>
              )}

              {/* READY STATE */}
              {status === "ready" && (
                <div className="border border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-6 rounded-xl space-y-3 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-green-400 font-bold tracking-wide text-sm">ELIGIBLE FOR CREDENTIAL</div>
                      <div className="text-xs text-zinc-500">No interactions detected</div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-zinc-400 leading-relaxed border-l-2 border-green-500/30 pl-3">
                    Your wallet has no recorded interactions with the flagged protocol 
                    during the specified audit window. You may proceed with claiming 
                    your cryptographic absence credential.
                  </p>
                  
                  <button
                    onClick={claimAbsent}
                    className="group w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all duration-300 transform active:scale-[0.98] font-bold tracking-widest text-sm"
                  >
                    <span className="group-hover:tracking-[0.3em] transition-all duration-300">
                      CLAIM ABSENCE CREDENTIAL
                    </span>
                  </button>
                </div>
              )}

              {/* PROVING STATE */}
              {status === "proving" && (
                <div className="border border-green-500/30 bg-green-500/5 p-5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                      <div className="absolute inset-0 w-8 h-8 border-2 border-green-400/30 rounded-full animate-ping" />
                    </div>
                    <div>
                      <div className="text-green-400 font-bold animate-pulse text-sm">GENERATING PROOF</div>
                      <div className="text-xs text-zinc-500">Verifying absence claim...</div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    {["Scanning transaction history", "Computing merkle proofs", "Generating attestation", "Awaiting signature"].map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                        <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CLAIMED STATE */}
              {status === "claimed" && (
                <div className="border border-yellow-500/30 bg-yellow-500/5 p-5 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-yellow-400 font-bold tracking-wide text-sm">ALREADY CLAIMED</div>
                      <div className="text-xs text-zinc-500">Credential previously issued</div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 border-l-2 border-yellow-500/30 pl-3">
                    This wallet has already claimed an absence credential for this context.
                    Each wallet may only claim once per verification period.
                  </p>
                </div>
              )}

              {/* ERROR STATE */}
              {status === "error" && (
                <div className="border border-red-500/30 bg-red-500/5 p-5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-red-400 font-bold tracking-wide text-sm">VERIFICATION FAILED</div>
                      <div className="text-xs text-zinc-500">Unable to issue credential</div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-zinc-400 border-l-2 border-red-500/30 pl-3">
                    {errorMsg || "Your wallet may have interacted with the flagged protocol, or the verification service encountered an error."}
                  </p>
                  
                  <button
                    onClick={() => setStatus("ready")}
                    className="w-full py-3 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-all text-sm tracking-wider"
                  >
                    TRY AGAIN
                  </button>
                </div>
              )}

              {/* SUCCESS STATE */}
              {status === "success" && txSig && (
                <div className="border border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 rounded-xl space-y-4 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 w-10 h-10 bg-green-400 rounded-full animate-ping opacity-20" />
                    </div>
                    <div>
                      <div className="text-green-400 font-bold text-base tracking-wide">CREDENTIAL MINTED</div>
                      <div className="text-xs text-zinc-500">On-chain proof secured</div>
                    </div>
                  </div>
                  
                  <div className="bg-black/40 border border-green-500/20 rounded-lg p-3 space-y-1.5">
                    <div className="text-[9px] text-zinc-600 tracking-widest">TRANSACTION SIGNATURE</div>
                    <div className="text-[10px] text-green-400 font-mono break-all">
                      {txSig}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your absence credential has been permanently recorded on the Solana blockchain. 
                    This cryptographic proof can now be independently verified by any third party.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <a
                      href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-center gap-2 py-3 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 hover:border-green-400 transition-all text-xs tracking-wider"
                    >
                      VIEW ON EXPLORER
                      <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                    <button
                      onClick={() => {
                        const shareText = `✓ Verified absence on Solana\n\nI proved my wallet did NOT interact with a compromised protocol using ABSENT.\n\nTransaction: ${txSig}\n\n#Solana #ZeroKnowledge #CryptoSecurity`;
                        navigator.clipboard.writeText(shareText);
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 3000);
                      }}
                      className="flex items-center justify-center gap-2 py-3 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-all text-xs tracking-wider"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      COPY SHARE TEXT
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <div className="text-center space-y-1.5 pt-3">
            <div className="h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[9px] text-zinc-700 tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-0.5 bg-green-500/50 rounded-full" />
                <span>SOLANA STUDENT HACKATHON</span>
                <div className="w-0.5 h-0.5 bg-green-500/50 rounded-full" />
                <span>PROOF OF ABSENCE PROTOCOL</span>
                <div className="w-0.5 h-0.5 bg-green-500/50 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">MADE BY</span>
                <a 
                  href="https://dumancic.dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-400/80 hover:text-green-400 transition-colors underline decoration-green-500/30 hover:decoration-green-400"
                >
                  TONI DUMANCIC
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-[slideIn_0.3s_ease-out]">
          <div className="bg-green-500/20 border border-green-400 rounded-lg px-6 py-3 shadow-[0_0_30px_rgba(34,197,94,0.3)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-400 font-bold tracking-wide">Copied to clipboard!</span>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT MODAL */}
      {showAbout && (
        <AboutWindow
          isMobile={isMobile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => setShowAbout(false)}
        />
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}

/* ---------------- PARTICLE BACKGROUND ---------------- */

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Particle configuration
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    const particleCount = 80;
    const connectionDistance = 150;
    const particleSpeed = 0.3;

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * particleSpeed,
        vy: (Math.random() - 0.5) * particleSpeed,
        radius: Math.random() * 1.5 + 0.5,
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((particle, i) => {
        // Move particle
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity = (1 - distance / connectionDistance) * 0.3;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(34, 197, 94, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 opacity-40"
    />
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
    w: 800,
    h: 600,
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
    <div className="space-y-6">
      {/* TABS */}
      <div className="flex gap-1 border-b border-green-500/20">
        {["overview", "mvp", "future"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-6 py-3 text-xs tracking-widest transition-all ${
              activeTab === t
                ? "border-b-2 border-green-400 text-green-400 bg-green-500/5"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === "overview" && <OverviewContent />}
        {activeTab === "mvp" && <MVPContent />}
        {activeTab === "future" && <FutureContent />}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-50 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-green-500/20">
          <h2 className="text-sm tracking-widest text-green-400">PROTOCOL DOCUMENTATION</h2>
          <button
            onClick={onClose}
            className="border border-green-500/30 px-4 py-2 rounded text-xs hover:bg-green-500/10 transition-all tracking-wider"
          >
            CLOSE
          </button>
        </div>
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
      className="fixed bg-black border border-green-500/30 rounded-lg z-50 shadow-[0_0_80px_rgba(34,197,94,0.3)] animate-[fadeIn_0.2s_ease-out]"
    >
      {/* TITLE BAR */}
      <div
        onMouseDown={startDrag}
        className="cursor-move px-6 py-3 border-b border-green-500/20 text-xs flex justify-between items-center bg-gradient-to-r from-green-500/5 to-transparent"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="tracking-widest text-green-400">PROTOCOL_DOCUMENTATION.md</span>
        </div>
        <button 
          onClick={onClose}
          className="hover:bg-red-500/20 hover:text-red-400 w-6 h-6 rounded flex items-center justify-center transition-all"
        >
          ✕
        </button>
      </div>

      {/* CONTENT */}
      <div
        className="px-6 py-4 overflow-auto no-scrollbar" 
        style={{ height: "calc(100% - 48px)" }}
      >
        {content}
      </div>

      {/* RESIZE HANDLE */}
      <div
        onMouseDown={startResize}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize"
      >
        <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-green-500/40" />
      </div>
    </div>
  );
}

/* ---------------- CONTENT COMPONENTS ---------------- */

function OverviewContent() {
  return (
    <div className="space-y-6 text-sm">
      <div>
        <h3 className="text-green-400 font-bold tracking-wide mb-3">ABSENT — PROOF OF ABSENCE PROTOCOL</h3>
        <p className="text-zinc-400 leading-relaxed">
          Absent is a cryptographic protocol for proving the absence of on-chain actions.
          While blockchains make it trivial to prove that something happened, they make it 
          surprisingly difficult to prove that something did NOT happen.
        </p>
      </div>

      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-5 space-y-3">
        <div className="text-xs text-green-400 tracking-widest">CORE PRINCIPLE</div>
        <p className="text-zinc-400 text-xs leading-relaxed">
          Allow a wallet to cryptographically prove it did NOT interact with a specific 
          smart contract during a defined time window. This primitive addresses the 
          fundamental asymmetry in blockchain provability.
        </p>
      </div>

      <div>
        <div className="text-xs text-zinc-600 tracking-widest mb-3">USE CASES</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "Post-Hack Recovery", desc: "Prove non-interaction with exploited protocols" },
            { title: "Compliance", desc: "Attest absence of prohibited activities" },
            { title: "Risk Disclosure", desc: "Demonstrate clean transaction history" },
            { title: "Reputation Systems", desc: "Selective negative proof credentials" }
          ].map((item, i) => (
            <div key={i} className="bg-zinc-900/30 border border-zinc-800 rounded p-3 space-y-1">
              <div className="text-xs text-green-400 font-mono">• {item.title}</div>
              <div className="text-[10px] text-zinc-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-black/40 border border-zinc-800 rounded-lg p-5 font-mono text-xs space-y-2">
        <div className="text-zinc-600">// PROTOCOL FLOW</div>
        <div className="text-zinc-400">
          <div className="text-green-400">User Wallet</div>
          <div className="pl-4 text-zinc-600">│</div>
          <div className="pl-4 text-zinc-600">└─→ Request Verification</div>
          <div className="pl-8 text-zinc-600">│</div>
          <div className="pl-4 text-green-400">Verifier (Off-Chain)</div>
          <div className="pl-8 text-zinc-600">│</div>
          <div className="pl-8 text-zinc-600">├─ Scan transaction history</div>
          <div className="pl-8 text-zinc-600">└─ Generate attestation</div>
          <div className="pl-12 text-zinc-600">│</div>
          <div className="pl-8 text-green-400">Solana Program (On-Chain)</div>
          <div className="pl-12 text-zinc-600">│</div>
          <div className="pl-12 text-zinc-600">├─ Verify attestation</div>
          <div className="pl-12 text-zinc-600">├─ Enforce uniqueness</div>
          <div className="pl-12 text-zinc-600">└─ Mint credential</div>
        </div>
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
        <p className="text-xs text-yellow-400 leading-relaxed">
          <span className="font-bold">DESIGN PRINCIPLE:</span> Verification and enforcement are 
          intentionally separated. Solana programs cannot read transaction history, so Absent 
          embraces this constraint with a hybrid architecture.
        </p>
      </div>
    </div>
  );
}

function MVPContent() {
  return (
    <div className="space-y-6 text-sm">
      <div>
        <h3 className="text-green-400 font-bold tracking-wide mb-3">HACKATHON MVP IMPLEMENTATION</h3>
        <p className="text-zinc-400 leading-relaxed text-xs">
          This submission implements a minimal but complete end-to-end version of the 
          Absent protocol, demonstrating the core concept with production-ready architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
            <div className="text-xs text-green-400 tracking-widest mb-2">ON-CHAIN</div>
            <ul className="space-y-1 text-xs text-zinc-400">
              <li>• Program configuration</li>
              <li>• Claim uniqueness (PDA)</li>
              <li>• Credential minting</li>
              <li>• Trustless execution</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
            <div className="text-xs text-blue-400 tracking-widest mb-2">OFF-CHAIN</div>
            <ul className="space-y-1 text-xs text-zinc-400">
              <li>• Transaction scanning</li>
              <li>• Absence verification</li>
              <li>• Attestation generation</li>
              <li>• Historical analysis</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5 space-y-3">
        <div className="text-xs text-zinc-600 tracking-widest">MVP SCOPE</div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="text-green-400 font-mono">✓ Single target contract</div>
            <div className="text-green-400 font-mono">✓ Fixed time window</div>
            <div className="text-green-400 font-mono">✓ One claim per wallet</div>
          </div>
          <div className="space-y-2">
            <div className="text-green-400 font-mono">✓ Public verification</div>
            <div className="text-green-400 font-mono">✓ Replay protection</div>
            <div className="text-green-400 font-mono">✓ Devnet deployment</div>
          </div>
        </div>
      </div>

      <div className="bg-black/40 border border-zinc-800 rounded-lg p-5 space-y-3">
        <div className="text-xs text-zinc-600 tracking-widest">SECURITY MODEL</div>
        <ul className="space-y-2 text-xs text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">▸</span>
            <span>Verifier identity explicitly stored on-chain</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">▸</span>
            <span>Only valid attestations can mint credentials</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">▸</span>
            <span>Each wallet limited to one claim per context</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">▸</span>
            <span>PDA architecture prevents replay attacks</span>
          </li>
        </ul>
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
        <p className="text-xs text-yellow-400 leading-relaxed">
          <span className="font-bold">WHY THE SPLIT?</span> Solana programs cannot query past 
          transactions or perform unbounded computation. The hybrid architecture is not a 
          limitation—it's the optimal design pattern for this problem space.
        </p>
      </div>
    </div>
  );
}

function FutureContent() {
  return (
    <div className="space-y-6 text-sm">
      <div>
        <h3 className="text-green-400 font-bold tracking-wide mb-3">PROTOCOL ROADMAP</h3>
        <p className="text-zinc-400 leading-relaxed text-xs">
          Absent is architected to evolve without fundamental changes to the core 
          on-chain program. The following extensions are planned for production deployment.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-green-500/10 to-transparent border-l-2 border-green-400 p-4 space-y-2">
          <div className="text-xs text-green-400 tracking-widest font-bold">PHASE 1: DECENTRALIZATION</div>
          <ul className="space-y-1 text-xs text-zinc-400 pl-4">
            <li>• Multiple verifier support (M-of-N threshold)</li>
            <li>• Community-operated oracle network</li>
            <li>• DAO-governed verifier registry</li>
            <li>• Economic security via staking</li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-400 p-4 space-y-2">
          <div className="text-xs text-blue-400 tracking-widest font-bold">PHASE 2: ZERO-KNOWLEDGE</div>
          <ul className="space-y-1 text-xs text-zinc-400 pl-4">
            <li>• ZK non-membership proofs</li>
            <li>• Privacy-preserving credentials</li>
            <li>• Client-side proof generation</li>
            <li>• On-chain ZK verification</li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-purple-500/10 to-transparent border-l-2 border-purple-400 p-4 space-y-2">
          <div className="text-xs text-purple-400 tracking-widest font-bold">PHASE 3: GENERALIZATION</div>
          <ul className="space-y-1 text-xs text-zinc-400 pl-4">
            <li>• Multi-protocol verification contexts</li>
            <li>• Programmable absence conditions</li>
            <li>• Cross-chain absence proofs</li>
            <li>• Composable credential systems</li>
          </ul>
        </div>
      </div>

      <div className="bg-black/60 border border-green-500/30 rounded-lg p-6 space-y-4">
        <div className="text-xs text-green-400 tracking-widest">LONG-TERM VISION</div>
        <p className="text-zinc-400 text-xs leading-relaxed">
          Absent evolves into a general-purpose "negative attestation" primitive for 
          decentralized systems. Applications include:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            "Exploit immunity proof",
            "Regulatory compliance",
            "Risk threshold attestation",
            "Clean history certification",
            "Restricted action proof",
            "Behavioral non-participation"
          ].map((item, i) => (
            <div key={i} className="bg-green-500/5 border border-green-500/20 rounded px-3 py-2 text-[10px] text-green-400 text-center">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10 border border-green-500/30 rounded-lg p-5">
        <p className="text-sm text-zinc-300 leading-relaxed font-mono">
          <span className="text-green-400">&gt;</span> Absence is harder to prove than presence.
          <br />
          <span className="text-green-400">&gt;</span> Absent makes it possible.
          <br />
          <span className="text-green-400">&gt;</span> <span className="text-green-400">_</span>
        </p>
      </div>
    </div>
  );
}