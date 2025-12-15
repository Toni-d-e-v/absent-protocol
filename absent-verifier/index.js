// CommonJS for easiest Node setup
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");

const anchor = require("@project-serum/anchor");
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} = require("@solana/web3.js");

const RPC = process.env.RPC || "https://api.devnet.solana.com";

// REQUIRED ENV
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID); // your Absent program id
const CONFIG_ADMIN = new PublicKey(process.env.CONFIG_ADMIN); // admin used for config PDA
const VERIFIER_KEYPAIR_PATH = process.env.VERIFIER_KEYPAIR_PATH || "./verifier.json";

// Mango program id you chose (example hacked protocol)
const MANGO_PROGRAM_ID = new PublicKey(
  "MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac"
);

// Load verifier keypair (must match config.verifier)
const verifierKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(VERIFIER_KEYPAIR_PATH, "utf8")))
);

const connection = new Connection(RPC, "confirmed");

async function verifyNoMangoInteraction(connection, userPubkey, startSlot, endSlot) {
  // Pull recent signatures. Increase limit if you want deeper checks.
  const sigs = await connection.getSignaturesForAddress(userPubkey, { limit: 1 });

  for (const s of sigs) {
    if (s.slot < startSlot || s.slot > endSlot) continue;

    const tx = await connection.getParsedTransaction(s.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) continue;

    const ixs = tx.transaction.message.instructions;
    for (const ix of ixs) {
      if ("programId" in ix && ix.programId.equals(MANGO_PROGRAM_ID)) {
        return false; // interacted with Mango during window
      }
    }
  }
  return true;
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

// POST /prepare-claim
// Body: { userPubkey: "<base58>" }
// Response: { txBase64: "<...>", awardMint: "<mintPubkey>" }
app.post("/prepare-claim", async (req, res) => {
  try {
    const { userPubkey } = req.body;
    if (!userPubkey) return res.status(400).json({ error: "Missing userPubkey" });

    const user = new PublicKey(userPubkey);

    // Anchor provider that can sign with verifier
    const provider = new anchor.AnchorProvider(
      connection,
      {
        publicKey: verifierKeypair.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(verifierKeypair);
          return tx;
        },
        signAllTransactions: async (txs) => {
          txs.forEach((t) => t.partialSign(verifierKeypair));
          return txs;
        },
      },
      { commitment: "confirmed" }
    );

    const idl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
    if (!idl) throw new Error("IDL not found on-chain for this program id");
    const program = new anchor.Program(idl, PROGRAM_ID, provider);

    // Derive config PDA
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), CONFIG_ADMIN.toBuffer()],
      PROGRAM_ID
    );

    const config = await program.account.config.fetch(configPda);

    // Real verification (history scan)
    const ok = await verifyNoMangoInteraction(
      connection,
      user,
      Number(config.startSlot),
      Number(config.endSlot)
    );

    if (!ok) {
      return res.status(403).json({
        error: "Wallet interacted with hacked protocol in this window",
      });
    }

    // Derive claim PDA (same seeds as program)
    const [claimPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("claim"),
        configPda.toBuffer(),
        user.toBuffer(),
        Buffer.from(new BigUint64Array([config.startSlot]).buffer),
        Buffer.from(new BigUint64Array([config.endSlot]).buffer),
        config.forbiddenProgram.toBuffer(),
      ],
      PROGRAM_ID
    );

    // Mint authority PDA
    const [mintAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint_auth"), configPda.toBuffer()],
      PROGRAM_ID
    );

    // Create award mint keypair (server signs it so user doesn’t need the private key)
    const awardMint = Keypair.generate();

    // ATA for user
    const userAta = await anchor.utils.token.associatedAddress({
      mint: awardMint.publicKey,
      owner: user,
    });

    // Proof hash (you can later replace this with hash(proof))
    const proofHash = new Uint8Array(32).fill(7);

    // Build the instruction via Anchor
    const ix = await program.methods
      .verifyAndAward([...proofHash])
      .accounts({
        user,
        verifier: verifierKeypair.publicKey,
        config: configPda,
        claim: claimPda,
        mintAuthority,
        awardMint: awardMint.publicKey,
        userAta,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    // Create tx (fee payer = user)
    const latest = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({
      feePayer: user,
      recentBlockhash: latest.blockhash,
    }).add(ix);

    // Partial sign with verifier + awardMint (both required signers)
    tx.partialSign(verifierKeypair);
    tx.partialSign(awardMint);

    // Serialize WITHOUT requiring user signature yet
    const txBase64 = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString("base64");

    return res.json({
      success: true,
      txBase64,
      awardMint: awardMint.publicKey.toBase58(),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/health", (_, res) => res.json({ ok: true, verifier: verifierKeypair.publicKey.toBase58() }));

app.listen(3001, () => {
  console.log("Verifier server running on http://localhost:3001");
  console.log("Verifier pubkey:", verifierKeypair.publicKey.toBase58());
});
