import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Connection, PublicKey } from '@solana/web3.js';
import { z } from "zod";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
// Create server instance
const server = new McpServer({
    name: "solana-rpc",
    version: "1.0.0",
});
// Initialize Solana connection
const connection = new Connection(SOLANA_RPC, 'confirmed');
// Helper function for making Solana RPC requests
async function makeSolanaRequest(method, params = []) {
    try {
        const response = await fetch(SOLANA_RPC, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method,
                params,
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.result;
    }
    catch (error) {
        console.error("Error making Solana RPC request:", error);
        return null;
    }
}
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
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to retrieve current slot",
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
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to retrieve balance for address: ${address}`,
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
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
