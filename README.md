# Building a Remote MCP Server on Cloudflare (Without Auth)

This MCP server provides **8 beautiful UI components** that AI assistants can use to render rich, interactive content. Deploy it to Cloudflare Workers and connect it to Claude Desktop, Claude Web, or the Cloudflare AI Playground!

## ✨ Features

- 🌤️ **Weather Cards** - Beautiful gradient weather displays
- 📊 **Data Tables** - Styled, responsive tables
- 📈 **Progress Cards** - Animated progress indicators
- ⚠️ **Alerts** - Color-coded notification banners
- 📊 **Stats** - Multiple stat cards with change indicators
- 💻 **Code Snippets** - Syntax-highlighted code blocks
- 👤 **User Cards** - Profile cards with social stats
- 📋 **Timelines** - Vertical timeline with status indicators

## 🚀 Quick Start

### 1. Deploy to Cloudflare Workers

```bash
# Login to Cloudflare
npx wrangler login

# Deploy your server
npm run deploy
```

Your MCP server will be available at:
```
https://remote-mcp-server-authless-2.<your-account>.workers.dev/mcp
```

**Note**: The MCP endpoint is at `/mcp` (not `/sse`)

### 2. Test in Browser

Visit `/test` to see an interactive demo:
```
https://remote-mcp-server-authless-2.<your-account>.workers.dev/test
```

## 🎨 Available UI Components

| Component | Tool Name | Use Case |
|-----------|-----------|----------|
| Weather Card | `get_weather_card` | Display weather with gradients and icons |
| Data Table | `render_data_table` | Show tabular data with styled rows |
| Progress Card | `render_progress_card` | Track task progress with status badges |
| Alert | `render_alert` | Show info/success/warning/error messages |
| Stats | `render_stats` | Display metrics with change indicators |
| Code Snippet | `render_code_snippet` | Render code with syntax highlighting |
| User Card | `render_user_card` | Show user profiles with stats |
| Timeline | `render_timeline` | Display step-by-step progress |

## 🛠️ Customizing Your MCP Server

To add your own UI components or tools:

1. Edit `src/index.ts`
2. Add a new tool in the `init()` method:
   ```typescript
   this.server.tool(
     "your_tool_name",
     { /* zod schema */ },
     async (args) => {
       const html = `<div>Your HTML here</div>`;
       const resourceUri = `ui://your-component-${Date.now()}`;
       const uiResource = createUIResource(resourceUri, html);
       MyMCP.uiResources.set(resourceUri, uiResource);

       return {
         content: [{ type: "text", text: "Description" }],
         _meta: { ui: { resourceUri, blob: uiResource.blob } }
       };
     }
   );
   ```
3. Redeploy with `npm run deploy`

See the existing UI tools in `src/index.ts` for examples! 

## 🔌 Connect to AI Assistants

### Option 1: Claude Desktop (Recommended)

1. Install the `mcp-remote` proxy:
   ```bash
   npm install -g mcp-remote
   ```

2. Edit your Claude Desktop config:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

3. Add this configuration:
   ```json
   {
     "mcpServers": {
       "ui-components": {
         "command": "npx",
         "args": [
           "mcp-remote",
           "https://remote-mcp-server-authless-2.<your-account>.workers.dev/mcp"
         ]
       }
     }
   }
   ```

4. Restart Claude Desktop

5. Try it out! Ask Claude:
   ```
   "Show me a weather card for Tokyo with 25°C and sunny conditions"
   ```

### Option 2: Cloudflare AI Playground

1. Go to https://playground.ai.cloudflare.com/
2. Enter your MCP server URL:
   ```
   https://remote-mcp-server-authless-2.<your-account>.workers.dev/mcp
   ```
3. Click "Connect"
4. Start using the UI tools!

### Option 3: Local Development

For local testing:
```bash
npm run dev
```

Then connect to `http://localhost:8787/mcp`

## 📖 Full Documentation

See [USAGE_GUIDE.md](./USAGE_GUIDE.md) for:
- Detailed setup instructions
- How to use each UI component
- Troubleshooting tips
- ChatGPT integration options 
