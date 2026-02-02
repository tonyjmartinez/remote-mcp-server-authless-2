# CLAUDE.md - AI Assistant Guide

This document provides guidance for AI assistants working with this codebase.

## Project Overview

This is a **Remote MCP (Model Context Protocol) Server** deployed on **Cloudflare Workers**. It provides a calculator service without authentication, accessible via HTTP/SSE protocols. The server demonstrates MCP tool implementation with rich response formatting.

**Server Name:** Authless Calculator
**Version:** 1.0.0

## Repository Structure

```
remote-mcp-server-authless-2/
├── src/
│   └── index.ts              # Main server implementation (single-file architecture)
├── package.json              # Dependencies and npm scripts
├── wrangler.jsonc            # Cloudflare Workers configuration
├── tsconfig.json             # TypeScript configuration
├── biome.json                # Code formatter/linter configuration
├── worker-configuration.d.ts # Auto-generated Wrangler types
└── README.md                 # User documentation
```

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| TypeScript | 5.9.3 | Language |
| Wrangler | ^4.61.0 | Cloudflare Workers CLI |
| Zod | ^4.3.6 | Schema validation for tool parameters |
| Agents | ^0.3.6 | MCP agent framework |
| Biome | ^2.3.13 | Code formatter and linter |

## Key Commands

```bash
# Development
npm run dev          # Start local development server (localhost:8787)
npm run start        # Alias for dev

# Deployment
npm run deploy       # Deploy to Cloudflare Workers

# Code Quality
npm run format       # Format code with Biome
npm run lint:fix     # Fix linting issues
npm run type-check   # TypeScript type checking (no emit)

# Wrangler
npm run cf-typegen   # Regenerate worker-configuration.d.ts
```

## Architecture

### Single-File Architecture

All server logic is contained in `/src/index.ts`:

1. **MyMCP Class** (lines 6-95) - Extends `McpAgent`, defines the MCP server and tools
2. **TEST_PAGE_HTML** (lines 97-314) - Embedded HTML/CSS/JS test interface
3. **Default Export Handler** (lines 316-332) - HTTP request routing

### HTTP Endpoints

| Path | Purpose |
|------|---------|
| `/mcp` | MCP protocol endpoint (JSON-RPC 2.0) |
| `/` or `/test` | Interactive test page (HTML) |
| Other | Returns 404 |

### Durable Objects

The `MyMCP` class is configured as a Durable Object for stateful MCP session management:
- Binding name: `MCP_OBJECT`
- SQLite migration tag: `v1`

## MCP Tool Implementation Pattern

Tools are defined in the `init()` method using `this.server.tool()`:

```typescript
this.server.tool(
    "toolName",                              // Tool name
    { param: z.string() },                   // Zod schema for parameters
    async ({ param }) => {                   // Handler function
        return {
            content: [
                {
                    type: "text",
                    text: "User-facing message",
                    annotations: { priority: 1.0, audience: ["user"] },
                },
                {
                    type: "text",
                    text: "Assistant-facing data",
                    annotations: { audience: ["assistant"] },
                },
            ],
        };
    }
);
```

### Response Conventions

- **Dual-audience responses**: Separate content blocks for users vs. assistants
- **Error handling**: Return `isError: true` in the response object for errors
- **Annotations**: Use `priority` and `audience` to control content presentation

### Existing Tools

1. **`add`** - Simple addition (parameters: `a: number`, `b: number`)
2. **`calculate`** - Multi-operation calculator (parameters: `operation: enum`, `a: number`, `b: number`)

## Code Style Conventions

### Formatting (Biome)

- **Indent:** 4 spaces (tabs)
- **Line width:** 100 characters
- **Files:** Only `src/**/*` is formatted (excludes `worker-configuration.d.ts`)

### Linting Rules

Key enabled rules:
- `noInferrableTypes`: error
- `noParameterAssign`: error
- `noUnusedTemplateLiteral`: error
- `noUselessElse`: error
- `useAsConstAssertion`: error
- `useDefaultParameterLast`: error
- `useSelfClosingElements`: error
- `useSingleVarDeclarator`: error

Disabled rules:
- `noNonNullAssertion`: off
- `noConfusingVoidType`: off
- `noDebugger`: off
- `noExplicitAny`: off

### TypeScript

- **Target:** ES2021
- **Module:** ES2022
- **Strict mode:** Enabled
- **No emit:** TypeScript is only used for type checking (Wrangler handles bundling)

## Development Workflow

### Adding a New Tool

1. Open `src/index.ts`
2. Add tool definition in the `init()` method of `MyMCP` class
3. Use Zod for parameter validation
4. Return responses with appropriate audience annotations
5. Run `npm run type-check` to verify types
6. Run `npm run format && npm run lint:fix` for code quality
7. Test with `npm run dev` and visit `http://localhost:8787/test`

### Testing

- **Built-in test page**: Access `/test` endpoint for interactive browser-based testing
- **MCP protocol**: POST JSON-RPC 2.0 requests to `/mcp`
- **Session management**: MCP sessions use `Mcp-Session-Id` header

### Deployment

```bash
npm run deploy
```

Deploys to: `remote-mcp-server-authless-2.<account>.workers.dev`

## Common Patterns

### Error Response

```typescript
if (errorCondition) {
    return {
        content: [
            {
                type: "text",
                text: "Error: Description",
                annotations: { priority: 1.0, audience: ["user"] },
            },
        ],
        isError: true,
    };
}
```

### Multi-Audience Response

```typescript
return {
    content: [
        {
            type: "text",
            text: "Human-readable result",
            annotations: { priority: 1.0, audience: ["user"] },
        },
        {
            type: "text",
            text: "Structured data for AI processing",
            annotations: { audience: ["assistant"] },
        },
    ],
};
```

## Important Notes

- This server has **no authentication** - suitable for public/demo use only
- All state is managed through Cloudflare Durable Objects
- The test page uses HTTP POST with SSE response parsing
- MCP protocol version: `2024-11-05`

## External Connections

- **Cloudflare AI Playground**: Connect via `<deployed-url>/sse`
- **Claude Desktop**: Use `mcp-remote` proxy to connect to the MCP endpoint
- **Local development**: `http://localhost:8787/mcp` or `/sse`
