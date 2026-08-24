const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

// We already added export default { fetch... } in a messy way before. Let's clean it up.
// First, let's restore the end of the file or just replace the whole export default block.
code = code.replace(/export default \{\n    fetch\(req: any, env: any, ctx: any\) \{\n        return new Response\("CinePro API is running\."\);\n    \}\n\};\n\nmain\(\)\.catch\(\(err\) => \{/g, 'main().catch((err) => {');

// Now let's append it properly.
const cfBlock = `
export default {
    async fetch(request: any, env: any, ctx: any) {
        return new Response(
            JSON.stringify({
                status: "success",
                message: "CinePro Core is running on Cloudflare Workers",
                note: "Full API functionality requires Node.js environment (Docker/Render/Vercel)."
            }),
            {
                headers: { "Content-Type": "application/json" }
            }
        );
    }
};

const isCloudflareWorker = typeof globalThis.WebSocketPair !== 'undefined';
if (!isCloudflareWorker) {
    main().catch((err) => {
        console.error("Server crashed:", err);
        process.exit(1);
    });
}
`;

code = code.replace(/main\(\)\.catch\(\(err\) => \{([\s\S]*?)process\.exit\(1\);\n\}\);/, cfBlock);

fs.writeFileSync(file, code);
