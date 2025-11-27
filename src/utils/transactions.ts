import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

export interface TransactionInstructionData {
  programId: string;
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: number[];
}

export async function buildAndSendTransaction(
  connection: Connection,
  wallet: {
    publicKey: PublicKey;
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
  },
  instructionData: TransactionInstructionData,
  additionalInstructions?: TransactionInstruction[],
  providedBlockhash?: string,
  providedLastValidBlockHeight?: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  // Create transaction
  const transaction = new Transaction();

  // Convert instruction data to TransactionInstruction
  const instruction = new TransactionInstruction({
    programId: new PublicKey(instructionData.programId),
    keys: instructionData.keys.map((key) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: new Uint8Array(instructionData.data) as any, // Solana accepts Uint8Array
  });

  transaction.add(instruction);

  // Add any additional instructions
  if (additionalInstructions) {
    additionalInstructions.forEach((inst) => transaction.add(inst));
  }

  // Use provided blockhash from backend, or get a new one
  let blockhash: string;
  let lastValidBlockHeight: number;
  
  if (providedBlockhash && providedLastValidBlockHeight !== undefined) {
    blockhash = providedBlockhash;
    lastValidBlockHeight = providedLastValidBlockHeight;
    console.log('📝 Using blockhash from backend');
  } else {
    // Get recent blockhash if not provided
    const blockhashResult = await connection.getLatestBlockhash('confirmed');
    blockhash = blockhashResult.blockhash;
    lastValidBlockHeight = blockhashResult.lastValidBlockHeight;
    console.log('📝 Got new blockhash from connection');
  }

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Sign and send transaction
  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
  });
  
  // Wait for confirmation
  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature,
  }, 'confirmed');

  return signature;
}

// Hook to use transaction builder - must be used inside a React component
export function useTransactionBuilder() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const buildAndSend = async (
    instructionData: TransactionInstructionData,
    additionalInstructions?: TransactionInstruction[]
  ) => {
    if (!connection || !wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }
    return buildAndSendTransaction(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
      },
      instructionData,
      additionalInstructions
    );
  };

  return {
    buildAndSend,
    wallet,
    connection,
  };
}

