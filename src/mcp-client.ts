import { Anthropic } from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { Message } from "discord.js";
import env from "../env";

export class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StreamableHTTPClientTransport | null = null;
  private tools: Tool[] = [];
  isInited: boolean = false;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
    this.mcp = new Client({ name: "streamable-http-client", version: "1.0.0" });
  }

  async connectToServer() {
    this.isInited = true;
    const baseURL = new URL(env.JOB_APP_MCP_URL);

    console.log(`URL: ${new URL(env.JOB_APP_MCP_URL)}`);

    try {
      this.transport = new StreamableHTTPClientTransport(baseURL);

      await this.mcp.connect(this.transport);
      console.log("Connected using Streamable HTTP transport");

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });

      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (error) {
      console.log("Failed to connect to MCP server: ", error);
      throw error;
    }
  }

  async processQuery(query: string, msgReply: Message) {
    const messages: MessageParam[] = [{ role: "user", content: query }];

    const response = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages,
      tools: this.tools,
      system:
        "You are a 'JobApp' HR Assistant. Reply concisely. Try to retain the context in Job Application system that are covered in the MCP tools",
    });

    let buffer = "";
    let intervalId: NodeJS.Timeout;

    const sendBufferedUpdate = async () => {
      if (buffer.length > 0) {
        try {
          await msgReply.edit(buffer);
        } catch (err) {
          console.error("Edit failed:", err);
        }
      }
    };

    intervalId = setInterval(sendBufferedUpdate, 1000);

    for (const content of response.content) {
      if (content.type === "text") {
        buffer += content.text;
      } else if (content.type === "tool_use") {
        const toolName = content.name;
        const toolArgs = content.input as Record<string, unknown> | undefined;

        const result = await this.mcp.callTool({
          name: toolName,
          arguments: toolArgs,
        });

        buffer += `\n[Calling tool ${toolName} with args ${JSON.stringify(
          toolArgs
        )}]\n`;

        messages.push({
          role: "user",
          content: result.content as string,
        });

        const followUp = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          messages,
        });

        const textContent = followUp.content.find((c) => c.type === "text");
        if (textContent && textContent.type === "text") {
          buffer += textContent.text;
        }
      }
    }

    clearInterval(intervalId);
    await sendBufferedUpdate();
  }

  async cleanup() {
    this.isInited = false;
    await this.mcp.close();
  }
}
