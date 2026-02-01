import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}));

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			},
		);
	}
}

const TEST_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Calculator Test</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .card { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    label { display: block; margin-bottom: 8px; font-weight: 600; }
    input, select { width: 100%; padding: 12px; margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
    button { width: 100%; padding: 14px; background: #0070f3; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
    button:hover { background: #005bb5; }
    .result { margin-top: 16px; padding: 16px; background: #e8f5e9; border-radius: 8px; font-size: 18px; text-align: center; }
    .error { background: #ffebee; color: #c62828; }
    #log { font-family: monospace; font-size: 12px; background: #1a1a1a; color: #0f0; padding: 12px; border-radius: 8px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>MCP Calculator Test</h1>

  <div class="card">
    <h3>Quick Add</h3>
    <label>A</label><input type="number" id="addA" value="5">
    <label>B</label><input type="number" id="addB" value="3">
    <button onclick="testAdd()">Add Numbers</button>
    <div class="result" id="addResult" style="display:none"></div>
  </div>

  <div class="card">
    <h3>Calculator</h3>
    <label>Operation</label>
    <select id="op">
      <option value="add">Add (+)</option>
      <option value="subtract">Subtract (-)</option>
      <option value="multiply">Multiply (×)</option>
      <option value="divide">Divide (÷)</option>
    </select>
    <label>A</label><input type="number" id="calcA" value="10">
    <label>B</label><input type="number" id="calcB" value="2">
    <button onclick="testCalc()">Calculate</button>
    <div class="result" id="calcResult" style="display:none"></div>
  </div>

  <div class="card">
    <h3>Connection Log</h3>
    <div id="log">Connecting...</div>
  </div>

  <script type="module">
    import { Client } from "https://esm.sh/@modelcontextprotocol/sdk@1.9.0/client/index.js";
    import { SSEClientTransport } from "https://esm.sh/@modelcontextprotocol/sdk@1.9.0/client/sse.js";

    const log = document.getElementById("log");
    const mcpUrl = location.origin + "/mcp";
    let client;

    function addLog(msg) { log.textContent += "\\n" + msg; log.scrollTop = log.scrollHeight; }

    async function connect() {
      try {
        log.textContent = "Connecting to " + mcpUrl + "...";
        client = new Client({ name: "web-test", version: "1.0.0" });
        const transport = new SSEClientTransport(new URL(mcpUrl));
        await client.connect(transport);
        addLog("Connected!");
        const { tools } = await client.listTools();
        addLog("Tools: " + tools.map(t => t.name).join(", "));
        window.mcpClient = client;
      } catch (e) {
        addLog("Error: " + e.message);
      }
    }

    window.testAdd = async function() {
      const a = parseFloat(document.getElementById("addA").value);
      const b = parseFloat(document.getElementById("addB").value);
      const result = document.getElementById("addResult");
      try {
        addLog("Calling add(" + a + ", " + b + ")");
        const res = await window.mcpClient.callTool({ name: "add", arguments: { a, b } });
        result.textContent = a + " + " + b + " = " + res.content[0].text;
        result.className = "result";
        result.style.display = "block";
        addLog("Result: " + res.content[0].text);
      } catch (e) {
        result.textContent = "Error: " + e.message;
        result.className = "result error";
        result.style.display = "block";
      }
    };

    window.testCalc = async function() {
      const op = document.getElementById("op").value;
      const a = parseFloat(document.getElementById("calcA").value);
      const b = parseFloat(document.getElementById("calcB").value);
      const result = document.getElementById("calcResult");
      try {
        addLog("Calling calculate(" + op + ", " + a + ", " + b + ")");
        const res = await window.mcpClient.callTool({ name: "calculate", arguments: { operation: op, a, b } });
        const symbols = { add: "+", subtract: "-", multiply: "×", divide: "÷" };
        result.textContent = a + " " + symbols[op] + " " + b + " = " + res.content[0].text;
        result.className = "result";
        result.style.display = "block";
        addLog("Result: " + res.content[0].text);
      } catch (e) {
        result.textContent = "Error: " + e.message;
        result.className = "result error";
        result.style.display = "block";
      }
    };

    connect();
  </script>
</body>
</html>`;

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		if (url.pathname === "/" || url.pathname === "/test") {
			return new Response(TEST_PAGE_HTML, {
				headers: { "Content-Type": "text/html" },
			});
		}

		return new Response("Not found", { status: 404 });
	},
};
