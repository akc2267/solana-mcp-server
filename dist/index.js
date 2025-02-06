import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { z } from "zod";
import bs58 from 'bs58';
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
// Create server instance
const server = new McpServer({
    name: "solana-rpc",
    version: "1.0.0",
});
// Initialize Solana connection
const connection = new Connection(SOLANA_RPC, 'confirmed');
// Register Solana tools
server.tool("getSlot", "Get the current slot", {}, async () => {
    try {
        const slot = await connection.getSlot();
        return {
            content: [
                {
                    type: "text",
                    text: `Current slot: ${slot}`,
                },
            ],
        };
    }
    catch (err) {
        const error = err;
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to retrieve current slot: ${error.message}`,
                },
            ],
        };
    }
});
server.tool("getBalance", "Get balance for a Solana address", {
    address: z.string().describe("Solana account address"),
}, async ({ address }) => {
    try {
        const publicKey = new PublicKey(address);
        const balance = await connection.getBalance(publicKey);
        const solBalance = balance / 10 ** 9; // Convert lamports to SOL
        return {
            content: [
                {
                    type: "text",
                    text: `Balance for ${address}:\n${solBalance} SOL`,
                },
            ],
        };
    }
    catch (err) {
        const error = err;
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to retrieve balance for address: ${error.message}`,
                },
            ],
        };
    }
});
server.tool("getKeypairInfo", "Get information about a keypair from its secret key", {
    secretKey: z.string().describe("Base58 encoded secret key or array of bytes"),
}, async ({ secretKey }) => {
    try {
        // Handle both base58 encoded strings and byte arrays
        let keypair;
        try {
            // First try parsing as base58 string
            const decoded = Uint8Array.from(secretKey.split(',').map(num => parseInt(num.trim())));
            keypair = Keypair.fromSecretKey(decoded);
        }
        catch {
            // If that fails, try as a byte array string
            keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKey)));
        }
        // Get account info and balance
        const publicKey = keypair.publicKey;
        const balance = await connection.getBalance(publicKey);
        const accountInfo = await connection.getAccountInfo(publicKey);
        return {
            content: [
                {
                    type: "text",
                    text: `Keypair Information:
Public Key: ${publicKey.toBase58()}
Balance: ${balance / 10 ** 9} SOL
Account Program Owner: ${accountInfo?.owner?.toBase58() || 'N/A'}
Account Size: ${accountInfo?.data.length || 0} bytes
Is Executable: ${accountInfo?.executable || false}
Rent Epoch: ${accountInfo?.rentEpoch || 0}`,
                },
            ],
        };
    }
    catch (err) {
        const error = err;
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to retrieve keypair information: ${error.message}`,
                },
            ],
        };
    }
});
server.tool("getAccountInfo", "Get detailed account information for a Solana address", {
    address: z.string().describe("Solana account address"),
    encoding: z.enum(['base58', 'base64', 'jsonParsed']).optional().describe("Data encoding format"),
}, async ({ address, encoding = 'base64' }) => {
    try {
        const publicKey = new PublicKey(address);
        const accountInfo = await connection.getAccountInfo(publicKey, 'confirmed');
        if (!accountInfo) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No account found for address: ${address}`,
                    },
                ],
            };
        }
        // Format the data based on encoding
        let formattedData;
        if (encoding === 'base58') {
            formattedData = bs58.encode(accountInfo.data);
        }
        else if (encoding === 'base64') {
            formattedData = Buffer.from(accountInfo.data).toString('base64');
        }
        else {
            // For jsonParsed, we'll still return base64 but note that it's not parsed
            formattedData = Buffer.from(accountInfo.data).toString('base64');
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Account Information for ${address}:
Lamports: ${accountInfo.lamports} (${accountInfo.lamports / 10 ** 9} SOL)
Owner: ${accountInfo.owner.toBase58()}
Executable: ${accountInfo.executable}
Rent Epoch: ${accountInfo.rentEpoch}
Data Length: ${accountInfo.data.length} bytes
Data (${encoding}): ${formattedData}`,
                },
            ],
        };
    }
    catch (err) {
        const error = err;
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to retrieve account information: ${error.message}`,
                },
            ],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Solana MCP Server running on stdio");
}
main().catch((err) => {
    const error = err;
    console.error("Fatal error in main():", error.message);
    process.exit(1);
});
