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
		// Simple addition tool with rich response
		this.server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => {
			const result = a + b;
			return {
				content: [
					{
						type: "text",
						text: `${a} + ${b} = ${result}`,
						annotations: { priority: 1.0, audience: ["user"] },
					},
					{
						type: "text",
						text: `Sum computed: ${result}`,
						annotations: { audience: ["assistant"] },
					},
				],
			};
		});

		// Calculator tool with multiple operations and rich UI
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				const symbols: Record<string, string> = {
					add: "+",
					subtract: "-",
					multiply: "×",
					divide: "÷",
				};

				// Handle division by zero with isError flag
				if (operation === "divide" && b === 0) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Cannot divide by zero",
								annotations: { priority: 1.0, audience: ["user"] },
							},
						],
						isError: true,
					};
				}

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
						result = a / b;
						break;
				}

				return {
					content: [
						{
							type: "text",
							text: `${a} ${symbols[operation]} ${b} = ${result}`,
							annotations: { priority: 1.0, audience: ["user"] },
						},
						{
							type: "text",
							text: `Operation: ${operation}, Operands: [${a}, ${b}], Result: ${result}`,
							annotations: { audience: ["assistant"] },
						},
					],
				};
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
    button:disabled { background: #ccc; }
    button:hover:not(:disabled) { background: #005bb5; }
    .result { margin-top: 16px; padding: 16px; background: #e8f5e9; border-radius: 8px; font-size: 18px; text-align: center; }
    .error { background: #ffebee; color: #c62828; }
    #log { font-family: monospace; font-size: 12px; background: #1a1a1a; color: #0f0; padding: 12px; border-radius: 8px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; }
    .status { padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-weight: 500; }
    .status.connected { background: #e8f5e9; color: #2e7d32; }
    .status.disconnected { background: #ffebee; color: #c62828; }
    .status.connecting { background: #fff3e0; color: #ef6c00; }
  </style>
</head>
<body>
  <h1>MCP Calculator Test</h1>

  <div class="card">
    <div id="status" class="status connecting">Connecting...</div>
    <h3>Quick Add</h3>
    <label>A</label><input type="number" id="addA" value="5">
    <label>B</label><input type="number" id="addB" value="3">
    <button id="addBtn" onclick="testAdd()" disabled>Add Numbers</button>
    <div class="result" id="addResult" style="display:none"></div>
  </div>

  <div class="card">
    <h3>Calculator</h3>
    <label>Operation</label>
    <select id="op">
      <option value="add">Add (+)</option>
      <option value="subtract">Subtract (-)</option>
      <option value="multiply">Multiply (x)</option>
      <option value="divide">Divide (/)</option>
    </select>
    <label>A</label><input type="number" id="calcA" value="10">
    <label>B</label><input type="number" id="calcB" value="2">
    <button id="calcBtn" onclick="testCalc()" disabled>Calculate</button>
    <div class="result" id="calcResult" style="display:none"></div>
  </div>

  <div class="card">
    <h3>Connection Log</h3>
    <div id="log"></div>
  </div>

  <script>
    const mcpUrl = location.origin + "/mcp";
    let sessionId = null;
    let msgId = 1;

    const log = document.getElementById("log");
    const status = document.getElementById("status");

    function addLog(msg) {
      const time = new Date().toLocaleTimeString();
      log.textContent += "[" + time + "] " + msg + "\\n";
      log.scrollTop = log.scrollHeight;
    }

    function setStatus(state, text) {
      status.className = "status " + state;
      status.textContent = text;
      const connected = state === "connected";
      document.getElementById("addBtn").disabled = !connected;
      document.getElementById("calcBtn").disabled = !connected;
    }

    async function sendMessage(method, params = {}) {
      const id = msgId++;
      const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
      addLog("-> " + method);

      const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
      };
      if (sessionId) {
        headers["Mcp-Session-Id"] = sessionId;
      }

      const res = await fetch(mcpUrl, {
        method: "POST",
        headers,
        body
      });

      // Capture session ID from response
      const newSessionId = res.headers.get("Mcp-Session-Id");
      if (newSessionId) {
        sessionId = newSessionId;
        addLog("Session: " + sessionId.substring(0, 8) + "...");
      }

      const text = await res.text();

      // Parse SSE response format
      let data;
      if (text.startsWith("event:") || text.startsWith("data:")) {
        const lines = text.split("\\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            data = JSON.parse(line.substring(6));
            break;
          }
        }
      } else {
        data = JSON.parse(text);
      }

      if (!data) {
        throw new Error("No data in response");
      }

      if (data.error) {
        addLog("<- Error: " + data.error.message);
        throw new Error(data.error.message);
      }

      addLog("<- OK");
      return data.result;
    }

    async function connect() {
      try {
        addLog("Connecting to " + mcpUrl);
        setStatus("connecting", "Connecting...");

        // Initialize MCP session via HTTP POST
        const initResult = await sendMessage("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "web-test", version: "1.0.0" }
        });
        addLog("Server: " + initResult.serverInfo.name + " v" + initResult.serverInfo.version);

        // Send initialized notification
        await fetch(mcpUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "Mcp-Session-Id": sessionId
          },
          body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
        });

        // List tools
        const toolsResult = await sendMessage("tools/list");
        addLog("Tools: " + toolsResult.tools.map(t => t.name).join(", "));

        setStatus("connected", "Connected - Ready to test!");

      } catch (e) {
        addLog("Error: " + e.message);
        setStatus("disconnected", "Connection failed: " + e.message);
      }
    }

    window.testAdd = async function() {
      const a = parseFloat(document.getElementById("addA").value);
      const b = parseFloat(document.getElementById("addB").value);
      const result = document.getElementById("addResult");

      try {
        const res = await sendMessage("tools/call", {
          name: "add",
          arguments: { a, b }
        });
        const text = res.content[0].text;
        result.textContent = a + " + " + b + " = " + text;
        result.className = "result";
        result.style.display = "block";
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
        const res = await sendMessage("tools/call", {
          name: "calculate",
          arguments: { operation: op, a, b }
        });
        const symbols = { add: "+", subtract: "-", multiply: "x", divide: "/" };
        const text = res.content[0].text;
        result.textContent = a + " " + symbols[op] + " " + b + " = " + text;
        result.className = "result";
        result.style.display = "block";
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
