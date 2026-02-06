# How to Use This MCP Server with AI Assistants

This guide shows you how to connect Claude (or other AI assistants) to your MCP server so they can use the UI components.

## Step 1: Deploy Your Server

### Deploy to Cloudflare Workers

```bash
# Login to Cloudflare
npx wrangler login

# Deploy your server
npm run deploy
```

After deployment, you'll get a URL like:
```
https://remote-mcp-server-authless-2.<your-account>.workers.dev
```

**Important**: Your MCP endpoint will be at `/mcp`, so the full URL is:
```
https://remote-mcp-server-authless-2.<your-account>.workers.dev/mcp
```

## Step 2: Connect AI Assistants

### Option A: Claude Desktop (Local Application)

1. Install the `mcp-remote` proxy:
   ```bash
   npm install -g mcp-remote
   ```

2. Edit Claude Desktop config:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

3. Add your server:
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

5. You should now see these tools available:
   - `get_weather_card`
   - `render_data_table`
   - `render_progress_card`
   - `render_alert`
   - `render_stats`
   - `render_code_snippet`
   - `render_user_card`
   - `render_timeline`

### Option B: Claude on the Web (claude.ai)

**Note**: As of now, Claude on the web has limited MCP support. Check the [Model Context Protocol documentation](https://modelcontextprotocol.io/) for updates.

For web-based Claude:
1. The server needs to be publicly accessible (deployed)
2. You may need to use the Cloudflare AI Playground instead

### Option C: Cloudflare AI Playground

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL:
   ```
   https://remote-mcp-server-authless-2.<your-account>.workers.dev/mcp
   ```
3. Click "Connect"
4. You can now use all the UI tools directly in the playground!

### Option D: ChatGPT / Other AI Assistants

**Current Status**: ChatGPT does not natively support the MCP protocol yet.

To use with ChatGPT, you would need:
1. A custom integration or plugin that supports MCP
2. Or convert the MCP server to OpenAI's function calling format

## Step 3: Using the UI Components

Once connected, you can ask Claude to render UI components:

### Example Prompts:

```
"Show me a weather card for Tokyo with 25°C, sunny conditions, and 70% humidity"
```

Claude will call: `get_weather_card(city="Tokyo", temperature=25, condition="sunny", humidity=70)`

Returns: A beautiful styled weather card!

---

```
"Create a data table showing Q1-Q4 sales for Laptops and Tablets"
```

Claude will call: `render_data_table(...)`

Returns: A styled table with the data!

---

```
"Show me a progress card for deployment at 75% completion"
```

Claude will call: `render_progress_card(title="Deployment", progress=75, status="in_progress", message="...")`

Returns: An animated progress card!

## How UI Rendering Works

### Response Format

Each UI tool returns:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Human-readable description"
    }
  ],
  "_meta": {
    "ui": {
      "resourceUri": "ui://component-name-timestamp",
      "blob": "base64-encoded-html"
    }
  }
}
```

### Client Rendering

- **MCP-aware clients** (like Claude Desktop) automatically decode the `blob` field and render the HTML
- The HTML is fully styled with inline CSS, so no external stylesheets needed
- All components use modern, responsive design

### Supported Clients

✅ **Claude Desktop** - Full support, renders UI components inline
✅ **Cloudflare AI Playground** - Full support
⚠️ **Claude Web** - Limited/experimental MCP support
❌ **ChatGPT** - No MCP support yet
❌ **Generic API clients** - Requires custom rendering logic

## Testing Your Server

### Quick Test (Browser)

Visit your deployed server:
```
https://remote-mcp-server-authless-2.<your-account>.workers.dev/test
```

This loads an interactive test page where you can try all the UI components!

### Programmatic Test

Use the included test script:
```bash
# Make sure your server is running locally
npm run dev

# In another terminal
node test-ui.mjs
```

## Available UI Components

1. **Weather Card** - `get_weather_card`
   - Beautiful gradient backgrounds
   - Weather icons and conditions
   - Temperature and humidity display

2. **Data Table** - `render_data_table`
   - Customizable headers and rows
   - Alternating row colors
   - Responsive design

3. **Progress Card** - `render_progress_card`
   - Status badges (pending, in_progress, completed, failed)
   - Animated progress bars
   - Color-coded by status

4. **Alert** - `render_alert`
   - 4 types: info, success, warning, error
   - Dismissible option
   - Color-coded styling

5. **Stats** - `render_stats`
   - Multiple stat cards in a grid
   - Change indicators (↑/↓/→)
   - Flexible layout

6. **Code Snippet** - `render_code_snippet`
   - Syntax highlighting container
   - Line numbers (optional)
   - Filename header (optional)

7. **User Card** - `render_user_card`
   - Profile display with avatar emoji
   - Bio section
   - Social stats (posts, followers, following)

8. **Timeline** - `render_timeline`
   - Vertical timeline with steps
   - Status indicators
   - Time stamps

## Troubleshooting

### "Connection refused" or "fetch failed"

- Make sure your server is deployed and accessible
- Check the URL includes `/mcp` at the end
- Verify CORS settings if accessing from web

### "Tools not showing up in Claude Desktop"

- Restart Claude Desktop after config changes
- Check the config file path is correct
- Verify the `mcp-remote` proxy is installed globally

### "UI components not rendering"

- Ensure you're using a client that supports MCP-UI (Claude Desktop, Cloudflare Playground)
- Check that the `_meta.ui.blob` field contains base64 data
- Verify the HTML decoding is working

### "401 or 403 errors when pushing"

- Ensure branch names start with `claude/` for git push operations
- Check authentication credentials

## Next Steps

1. **Deploy**: Run `npm run deploy` to make your server public
2. **Connect**: Add to Claude Desktop config
3. **Test**: Ask Claude to render UI components!
4. **Customize**: Modify the UI tools in `src/index.ts`
5. **Share**: Give others your MCP server URL

## Resources

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Claude Desktop](https://claude.ai/download)
- [MCP Remote Proxy](https://www.npmjs.com/package/mcp-remote)
