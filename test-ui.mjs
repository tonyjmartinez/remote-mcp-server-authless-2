#!/usr/bin/env node

// Test script to call MCP UI tools and display their responses
const MCP_URL = "http://localhost:8787/mcp";

let sessionId = null;
let msgId = 1;

async function sendMessage(method, params = {}) {
  const id = msgId++;
  const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
  };

  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body
  });

  // Capture session ID from response
  const newSessionId = res.headers.get("Mcp-Session-Id");
  if (newSessionId) {
    sessionId = newSessionId;
  }

  const text = await res.text();

  // Parse SSE response format
  let data;
  if (text.startsWith("event:") || text.startsWith("data:")) {
    const lines = text.split("\n");
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
    throw new Error(data.error.message);
  }

  return data.result;
}

async function testUIComponents() {
  try {
    console.log("🔌 Connecting to MCP server...\n");

    // Initialize
    const initResult = await sendMessage("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-script", version: "1.0.0" }
    });
    console.log(`✅ Connected to: ${initResult.serverInfo.name} v${initResult.serverInfo.version}\n`);

    // Test 1: Weather Card
    console.log("🌤️  Testing Weather Card UI Component...");
    const weatherResult = await sendMessage("tools/call", {
      name: "get_weather_card",
      arguments: {
        city: "San Francisco",
        temperature: 22,
        condition: "sunny",
        humidity: 65
      }
    });
    console.log("Response:", JSON.stringify(weatherResult, null, 2));
    console.log("\n---\n");

    // Test 2: Data Table
    console.log("📊 Testing Data Table UI Component...");
    const tableResult = await sendMessage("tools/call", {
      name: "render_data_table",
      arguments: {
        title: "Sales Report",
        headers: ["Product", "Q1", "Q2", "Q3"],
        rows: [
          ["Laptops", "$45K", "$52K", "$58K"],
          ["Tablets", "$22K", "$28K", "$31K"]
        ]
      }
    });
    console.log("Response:", JSON.stringify(tableResult, null, 2));
    console.log("\n---\n");

    // Test 3: Progress Card
    console.log("📈 Testing Progress Card UI Component...");
    const progressResult = await sendMessage("tools/call", {
      name: "render_progress_card",
      arguments: {
        title: "Deployment",
        progress: 75,
        status: "in_progress",
        message: "Pushing to production..."
      }
    });
    console.log("Response:", JSON.stringify(progressResult, null, 2));
    console.log("\n---\n");

    // Test 4: Alert
    console.log("⚠️  Testing Alert UI Component...");
    const alertResult = await sendMessage("tools/call", {
      name: "render_alert",
      arguments: {
        type: "success",
        title: "Success!",
        message: "The operation completed successfully.",
        dismissible: true
      }
    });
    console.log("Response:", JSON.stringify(alertResult, null, 2));
    console.log("\n---\n");

    // Test 5: Stats
    console.log("📊 Testing Stats UI Component...");
    const statsResult = await sendMessage("tools/call", {
      name: "render_stats",
      arguments: {
        stats: [
          { label: "Revenue", value: "$85.2K", change: "+12.5%", changeType: "positive" },
          { label: "Users", value: "2,543", change: "+8.2%", changeType: "positive" }
        ]
      }
    });
    console.log("Response:", JSON.stringify(statsResult, null, 2));
    console.log("\n---\n");

    // Test 6: User Card
    console.log("👤 Testing User Card UI Component...");
    const userResult = await sendMessage("tools/call", {
      name: "render_user_card",
      arguments: {
        name: "Alex Johnson",
        role: "Product Designer",
        avatar_emoji: "👨‍💻",
        bio: "Passionate about design and user experience",
        stats: { posts: 247, followers: 3842, following: 512 }
      }
    });
    console.log("Response:", JSON.stringify(userResult, null, 2));
    console.log("\n---\n");

    console.log("✅ All UI components tested successfully!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testUIComponents();
