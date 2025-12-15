import BN from "bn.js";
import * as anchor from "@coral-xyz/anchor";
import type { Absent } from "../target/types/absent";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.Absent as anchor.Program<Absent>;

const { PublicKey, SystemProgram } = anchor.web3;

(async () => {
  console.log("Initializing Absent");

  const admin = program.provider.publicKey;

  const verifier = new PublicKey(
    "BYZbRCpWE74pGzp1WSeKSpKCR9ty49hTaynpxXZwgVw9"
  );

  const forbiddenProgram = new PublicKey(
    "MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac"
  );

  const startSlot = new anchor.BN(428420670);
  const endSlot = new anchor.BN(428430670);

  const program = program;

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config"), admin.toBuffer()],
    program.programId
  );

  console.log("Admin:", admin.toBase58());
  console.log("Verifier:", verifier.toBase58());
  console.log("Config PDA:", configPda.toBase58());

  const tx = await program.methods
    .initialize(verifier, forbiddenProgram, startSlot, endSlot)
    .accounts({
      admin,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Absent initialized");
  console.log("Tx:", tx);
})();
