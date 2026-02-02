import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "MCP UI Demo Server",
		version: "2.0.0",
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

		// ==========================================
		// MCP UI HTML Snippet Tools
		// ==========================================

		// Weather Card - renders a beautiful weather display
		this.server.tool(
			"get_weather_card",
			{
				city: z.string().describe("City name"),
				temperature: z.number().describe("Temperature in Celsius"),
				condition: z.enum(["sunny", "cloudy", "rainy", "snowy", "stormy"]).describe("Weather condition"),
				humidity: z.number().min(0).max(100).describe("Humidity percentage"),
			},
			async ({ city, temperature, condition, humidity }) => {
				const weatherIcons: Record<string, string> = {
					sunny: "☀️",
					cloudy: "☁️",
					rainy: "🌧️",
					snowy: "❄️",
					stormy: "⛈️",
				};

				const bgColors: Record<string, string> = {
					sunny: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
					cloudy: "linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)",
					rainy: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
					snowy: "linear-gradient(135deg, #e6e9f0 0%, #eef1f5 100%)",
					stormy: "linear-gradient(135deg, #232526 0%, #414345 100%)",
				};

				const textColor = condition === "snowy" ? "#333" : "#fff";

				const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 320px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
  <div style="background: ${bgColors[condition]}; padding: 30px; color: ${textColor};">
    <div style="font-size: 64px; text-align: center; margin-bottom: 10px;">${weatherIcons[condition]}</div>
    <h2 style="margin: 0; text-align: center; font-size: 24px; font-weight: 600;">${city}</h2>
    <div style="text-align: center; font-size: 56px; font-weight: 300; margin: 10px 0;">${temperature}°C</div>
    <div style="text-align: center; text-transform: capitalize; font-size: 18px; opacity: 0.9;">${condition}</div>
    <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
      <div style="text-align: center;">
        <div style="font-size: 14px; opacity: 0.7;">Humidity</div>
        <div style="font-size: 20px; font-weight: 600;">${humidity}%</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 14px; opacity: 0.7;">Feels Like</div>
        <div style="font-size: 20px; font-weight: 600;">${Math.round(temperature - 2 + humidity / 25)}°C</div>
      </div>
    </div>
  </div>
</div>`;

				return {
					content: [
						{
							type: "text",
							text: html,
							annotations: { priority: 1.0, audience: ["user"] },
						},
						{
							type: "text",
							text: `Weather data for ${city}: ${temperature}°C, ${condition}, ${humidity}% humidity`,
							annotations: { audience: ["assistant"] },
						},
					],
				};
			},
		);

		// Data Table - renders a styled data table
		this.server.tool(
			"render_data_table",
			{
				title: z.string().describe("Table title"),
				headers: z.array(z.string()).describe("Column headers"),
				rows: z.array(z.array(z.string())).describe("Table rows (array of arrays)"),
			},
			async ({ title, headers, rows }) => {
				const headerCells = headers.map(h => `<th style="padding: 12px 16px; text-align: left; font-weight: 600; border-bottom: 2px solid #e0e0e0;">${h}</th>`).join("");
				const dataRows = rows.map((row, i) => {
					const cells = row.map(cell => `<td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">${cell}</td>`).join("");
					return `<tr style="background: ${i % 2 === 0 ? "#fff" : "#fafafa"};">${cells}</tr>`;
				}).join("");

				const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 100%; overflow-x: auto;">
  <div style="background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden;">
    <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">📊 ${title}</h3>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead style="background: #f8f9fa;">
        <tr>${headerCells}</tr>
      </thead>
      <tbody>${dataRows}</tbody>
    </table>
    <div style="padding: 12px 16px; background: #f8f9fa; color: #666; font-size: 13px;">
      ${rows.length} row${rows.length !== 1 ? "s" : ""} • ${headers.length} column${headers.length !== 1 ? "s" : ""}
    </div>
  </div>
</div>`;

				return {
					content: [
						{
							type: "text",
							text: html,
							annotations: { priority: 1.0, audience: ["user"] },
						},
						{
							type: "text",
							text: `Table "${title}" with ${headers.length} columns and ${rows.length} rows`,
							annotations: { audience: ["assistant"] },
						},
					],
				};
			},
		);

		// Progress Card - renders a progress/status card
		this.server.tool(
			"render_progress_card",
			{
				title: z.string().describe("Card title"),
				progress: z.number().min(0).max(100).describe("Progress percentage (0-100)"),
				status: z.enum(["pending", "in_progress", "completed", "failed"]).describe("Current status"),
				message: z.string().describe("Status message"),
			},
			async ({ title, progress, status, message }) => {
				const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
					pending: { color: "#f59e0b", bg: "#fef3c7", icon: "⏳" },
					in_progress: { color: "#3b82f6", bg: "#dbeafe", icon: "🔄" },
					completed: { color: "#10b981", bg: "#d1fae5", icon: "✅" },
					failed: { color: "#ef4444", bg: "#fee2e2", icon: "❌" },
				};

				const cfg = statusConfig[status];

				const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px;">
  <div style="background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="padding: 24px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
        <span style="font-size: 28px;">${cfg.icon}</span>
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">${title}</h3>
          <span style="display: inline-block; margin-top: 4px; padding: 4px 12px; background: ${cfg.bg}; color: ${cfg.color}; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${status.replace("_", " ")}</span>
        </div>
      </div>
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; color: #6b7280;">Progress</span>
          <span style="font-size: 14px; font-weight: 600; color: ${cfg.color};">${progress}%</span>
        </div>
        <div style="height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${progress}%; background: ${cfg.color}; border-radius: 4px; transition: width 0.3s ease;"></div>
        </div>
      </div>
      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">${message}</p>
    </div>
  </div>
</div>`;

				return {
					content: [
						{
							type: "text",
							text: html,
							annotations: { priority: 1.0, audience: ["user"] },
						},
						{
							type: "text",
							text: `Progress: ${title} - ${status} at ${progress}%: ${message}`,
							annotations: { audience: ["assistant"] },
						},
					],
				};
			},
		);

		// Alert/Notification - renders styled alerts
		this.server.tool(
			"render_alert",
			{
				type: z.enum(["info", "success", "warning", "error"]).describe("Alert type"),
				title: z.string().describe("Alert title"),
				message: z.string().describe("Alert message"),
				dismissible: z.boolean().optional().describe("Show dismiss button"),
			},
			async ({ type, title, message, dismissible = false }) => {
				const alertConfig: Record<string, { bg: string; border: string; icon: string; titleColor: string }> = {
					info: { bg: "#eff6ff", border: "#3b82f6", icon: "ℹ️", titleColor: "#1e40af" },
					success: { bg: "#f0fdf4", border: "#22c55e", icon: "✅", titleColor: "#166534" },
					warning: { bg: "#fffbeb", border: "#f59e0b", icon: "⚠️", titleColor: "#92400e" },
					error: { bg: "#fef2f2", border: "#ef4444", icon: "🚨", titleColor: "#991b1b" },
				};

				const cfg = alertConfig[type];
				const dismissBtn = dismissible ? `<button style="background: none; border: none; font-size: 18px; cursor: pointer; opacity: 0.5; padding: 0;">×</button>` : "";

				const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px;">
  <div style="background: ${cfg.bg}; border-left: 4px solid ${cfg.border}; border-radius: 8px; padding: 16px 20px; display: flex; gap: 12px; align-items: flex-start;">
    <span style="font-size: 20px; flex-shrink: 0;">${cfg.icon}</span>
    <div style="flex: 1; min-width: 0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${cfg.titleColor};">${title}</h4>
        ${dismissBtn}
      </div>
      <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${message}</p>
    </div>
  </div>
</div>`;

				return {
					content: [
						{
							type: "text",
							text: html,
							annotations: { priority: 1.0, audience: ["user"] },
						},
						{
							type: "text",
							text: `Alert [${type.toUpperCase()}] ${title}: ${message}`,
							annotations: { audience: ["assistant"] },
						},
					],
				};
			},
		);

		// Stat Cards - renders multiple stat cards in a row
		this.server.tool(
			"render_stats",
			{
				stats: z.array(z.object({
					label: z.string(),
					value: z.string(),
					change: z.string().optional(),
					changeType: z.enum(["positive", "negative", "neutral"]).optional(),
				})).describe("Array of stat objects"),
			},
			async ({ stats }) => {
				const changeColors: Record<string, string> = {
					positive: "#10b981",
					negative: "#ef4444",
					neutral: "#6b7280",
				};

				const changeIcons: Record<string, string> = {
					positive: "↑",
					negative: "↓",
					neutral: "→",
				};

				const statCards = stats.map(stat => {
					const changeHtml = stat.change ? `
            <div style="font-size: 13px; color: ${changeColors[stat.changeType || "neutral"]}; font-weight: 500;">
              ${changeIcons[stat.changeType || "neutral"]} ${stat.change}
            </div>` : "";

					return `
          <div style="flex: 1; min-width: 140px; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
            <div style="font-size: 13px; color: #6b7280; font-weight: 500; margin-bottom: 8px;">${stat.label}</div>
            <div style="font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">${stat.value}</div>
            ${changeHtml}
          </div>`;
				}).join("");

				const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="display: flex; gap: 16px; flex-wrap: wrap;">
    ${statCards}
  </div>
</div>`;

				return {
					content: [
						{
							type: "text",
							text: html,
							annotations: { priority: 1.0, audience: ["user"] },
						},
						{
							type: "text",
							text: `Stats displayed: ${stats.map(s => `${s.label}: ${s.value}`).join(", ")}`,
							annotations: { audience: ["assistant"] },
						},
					],
				};
			},
		);

		// Code Snippet - renders syntax-highlighted code
		this.server.tool(
			"render_code_snippet",
			{
				code: z.string().describe("Code to display"),
				language: z.string().describe("Programming language"),
				filename: z.string().optional().describe("Optional filename to display"),
				showLineNumbers: z.boolean().optional().describe("Show line numbers"),
			},
			async ({ code, language, filename, showLineNumbers = true }) => {
				const lines = code.split("\n");
				const codeLines = lines.map((line, i) => {
					const lineNum = showLineNumbers ? `<span style="display: inline-block; width: 40px; color: #6b7280; text-align: right; margin-right: 16px; user-select: none;">${i + 1}</span>` : "";
					return `<div style="min-height: 20px;">${lineNum}${line.replace(/</g, "&lt;").replace(/>/g, "&gt;") || " "}</div>`;
				}).join("");

				const fileHeader = filename ? `
          <div style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #1e1e1e; border-bottom: 1px solid #333;">
            <span style="font-size: 14px;">📄</span>
            <span style="font-size: 13px; color: #d4d4d4;">${filename}</span>
            <span style="margin-left: auto; font-size: 11px; padding: 2px 8px; background: #333; color: #888; border-radius: 4px;">${language}</span>
          </div>` : "";

				const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 100%;">
  <div style="background: #1e1e1e; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
    ${fileHeader}
    <pre style="margin: 0; padding: 16px; overflow-x: auto; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 13px; line-height: 1.5; color: #d4d4d4;">${codeLines}</pre>
  </div>
</div>`;

				return {
					content: [
						{
							type: "text",
							text: html,
							annotations: { priority: 1.0, audience: ["user"] },
						},
						{
							type: "text",
							text: `Code snippet (${language}): ${lines.length} lines${filename ? ` from ${filename}` : ""}`,
							annotations: { audience: ["assistant"] },
						},
					],
				};
			},
		);

		// User Profile Card - renders a user profile
		this.server.tool(
			"render_user_card",
			{
				name: z.string().describe("User's name"),
				role: z.string().describe("User's role or title"),
				avatar_emoji: z.string().optional().describe("Emoji to use as avatar"),
				bio: z.string().optional().describe("Short bio"),
				stats: z.object({
					posts: z.number().optional(),
					followers: z.number().optional(),
					following: z.number().optional(),
				}).optional().describe("User stats"),
			},
			async ({ name, role, avatar_emoji = "👤", bio, stats }) => {
				const statsHtml = stats ? `
          <div style="display: flex; justify-content: center; gap: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            ${stats.posts !== undefined ? `<div style="text-align: center;"><div style="font-size: 20px; font-weight: 700; color: #1f2937;">${stats.posts}</div><div style="font-size: 12px; color: #6b7280;">Posts</div></div>` : ""}
            ${stats.followers !== undefined ? `<div style="text-align: center;"><div style="font-size: 20px; font-weight: 700; color: #1f2937;">${stats.followers}</div><div style="font-size: 12px; color: #6b7280;">Followers</div></div>` : ""}
            ${stats.following !== undefined ? `<div style="text-align: center;"><div style="font-size: 20px; font-weight: 700; color: #1f2937;">${stats.following}</div><div style="font-size: 12px; color: #6b7280;">Following</div></div>` : ""}
          </div>` : "";

				const bioHtml = bio ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.5;">${bio}</p>` : "";

				const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 320px;">
  <div style="background: #fff; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
    <div style="padding: 0 24px 24px; margin-top: -40px;">
      <div style="width: 80px; height: 80px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 4px solid #fff;">${avatar_emoji}</div>
      <h3 style="margin: 16px 0 4px 0; text-align: center; font-size: 20px; font-weight: 700; color: #1f2937;">${name}</h3>
      <p style="margin: 0; text-align: center; font-size: 14px; color: #6b7280;">${role}</p>
      ${bioHtml}
      ${statsHtml}
    </div>
  </div>
</div>`;

				return {
					content: [
						{
							type: "text",
							text: html,
							annotations: { priority: 1.0, audience: ["user"] },
						},
						{
							type: "text",
							text: `User profile: ${name}, ${role}`,
							annotations: { audience: ["assistant"] },
						},
					],
				};
			},
		);

		// Timeline/Steps - renders a vertical timeline
		this.server.tool(
			"render_timeline",
			{
				title: z.string().describe("Timeline title"),
				steps: z.array(z.object({
					title: z.string(),
					description: z.string(),
					status: z.enum(["completed", "current", "upcoming"]),
					time: z.string().optional(),
				})).describe("Timeline steps"),
			},
			async ({ title, steps }) => {
				const statusConfig: Record<string, { bg: string; border: string; icon: string }> = {
					completed: { bg: "#10b981", border: "#10b981", icon: "✓" },
					current: { bg: "#3b82f6", border: "#3b82f6", icon: "●" },
					upcoming: { bg: "#e5e7eb", border: "#d1d5db", icon: "○" },
				};

				const stepsHtml = steps.map((step, i) => {
					const cfg = statusConfig[step.status];
					const isLast = i === steps.length - 1;
					const lineColor = step.status === "completed" ? "#10b981" : "#e5e7eb";

					return `
            <div style="display: flex; gap: 16px;">
              <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${cfg.bg}; border: 2px solid ${cfg.border}; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 600;">${cfg.icon}</div>
                ${!isLast ? `<div style="width: 2px; flex: 1; min-height: 40px; background: ${lineColor};"></div>` : ""}
              </div>
              <div style="flex: 1; padding-bottom: ${isLast ? "0" : "24px"};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: ${step.status === "upcoming" ? "#9ca3af" : "#1f2937"};">${step.title}</h4>
                  ${step.time ? `<span style="font-size: 12px; color: #9ca3af;">${step.time}</span>` : ""}
                </div>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.5;">${step.description}</p>
              </div>
            </div>`;
				}).join("");

				const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 450px;">
  <div style="background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">📋 ${title}</h3>
    </div>
    <div style="padding: 24px;">
      ${stepsHtml}
    </div>
  </div>
</div>`;

				return {
					content: [
						{
							type: "text",
							text: html,
							annotations: { priority: 1.0, audience: ["user"] },
						},
						{
							type: "text",
							text: `Timeline "${title}" with ${steps.length} steps: ${steps.map(s => s.title).join(" → ")}`,
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
