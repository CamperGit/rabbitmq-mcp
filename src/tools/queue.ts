import { z } from "zod"
import { rabbitHttpRequest } from "../client.js"
import { MCPTextContent, MCPToolResult } from "../types/mcp.js"

export const listQueues = {
  name: "list-queues",
  description: "List all queues across all known vhosts",
  params: z.object({}),
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  annotations: {
    title: "List Queues",
    readOnlyHint: true,
    openWorldHint: true
  },
  handler: async (_args: {}): Promise<MCPToolResult> => {
    const queues = await rabbitHttpRequest("/queues")
    return { content: [{ type: "text", text: JSON.stringify(queues, null, 2) } as MCPTextContent] }
  }
}

export const listQueuesVhost = {
  name: "list-queues-vhost",
  description: "List queues for a specific vhost",
  params: z.object({ vhost: z.string() }),
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" }
    },
    required: ["vhost"]
  },
  annotations: {
    title: "List Queues (Vhost)",
    readOnlyHint: true,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const { vhost } = listQueuesVhost.params.parse(args)
    const queues = await rabbitHttpRequest(`/queues/${encodeURIComponent(vhost)}`)
    return { content: [{ type: "text", text: JSON.stringify(queues, null, 2) } as MCPTextContent] }
  }
}

export const getQueue = {
  name: "get-queue",
  description: "Get details for a specific queue",
  params: z.object({ vhost: z.string(), name: z.string() }),
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      name: { type: "string" }
    },
    required: ["vhost", "name"]
  },
  annotations: {
    title: "Get Queue Details",
    readOnlyHint: true,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const { vhost, name } = getQueue.params.parse(args)
    const queue = await rabbitHttpRequest(`/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}`)
    return { content: [{ type: "text", text: JSON.stringify(queue, null, 2) } as MCPTextContent] }
  }
}

export const putQueue = {
  name: "put-queue",
  description: "Create or update a queue",
  params: z.object({
    vhost: z.string(),
    name: z.string(),
    durable: z.boolean().optional().default(true),
    auto_delete: z.boolean().optional().default(false),
    arguments: z.record(z.any()).optional(),
  }),
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      name: { type: "string" },
      durable: { type: "boolean", default: true },
      auto_delete: { type: "boolean", default: false },
      arguments: { type: "object", additionalProperties: true }
    },
    required: ["vhost", "name"]
  },
  annotations: {
    title: "Create or Update Queue",
    readOnlyHint: false,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const { vhost, name, ...body } = putQueue.params.parse(args)
    const result = await rabbitHttpRequest(
      `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}`,
      "PUT",
      undefined,
      body
    )
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) } as MCPTextContent] }
  }
}

export const deleteQueue = {
  name: "delete-queue",
  description: "Delete a queue",
  params: z.object({ vhost: z.string(), name: z.string() }),
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      name: { type: "string" }
    },
    required: ["vhost", "name"]
  },
  annotations: {
    title: "Delete Queue",
    readOnlyHint: false,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const { vhost, name } = deleteQueue.params.parse(args)
    const result = await rabbitHttpRequest(
      `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}`,
      "DELETE"
    )
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) } as MCPTextContent] }
  }
}

export const purgeQueue = {
  name: "purge-queue",
  description: "Purge a queue",
  params: z.object({ vhost: z.string(), name: z.string() }),
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      name: { type: "string" }
    },
    required: ["vhost", "name"]
  },
  annotations: {
    title: "Purge Queue",
    readOnlyHint: false,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const { vhost, name } = purgeQueue.params.parse(args)
    const result = await rabbitHttpRequest(
      `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/contents`,
      "DELETE"
    )
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) } as MCPTextContent] }
  }
}

const getQueueMessagesParams = z.object({
  vhost: z.string(),
  name: z.string(),
  count: z.number().default(1),
  ackmode: z.enum(["get", "reject_requeue_true"]).default("get"),
  encoding: z.enum(["auto", "base64"]).default("auto"),
  truncate: z.string().optional(),
  requeue: z.boolean().optional().default(false),
});

export const getQueueMessages = {
  name: "get-queue-messages",
  description: "Get messages from a queue",
  params: getQueueMessagesParams, // Используем переменную
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      name: { type: "string" },
      count: { type: "number", default: 1 },
      ackmode: { type: "string", enum: ["get", "reject_requeue_true"], default: "get" },
      encoding: { type: "string", enum: ["auto", "base64"], default: "auto" },
      truncate: { type: "string" },
      requeue: { type: "boolean", default: false }
    },
    required: ["vhost", "name"]
  },
  annotations: {
    title: "Get Queue Messages",
    readOnlyHint: true,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const parsed = getQueueMessagesParams.parse(args);
    const { vhost, name } = parsed;

    const body = {
      count: Number(parsed.count),
      ackmode: parsed.ackmode === "get" ? "ack_requeue_true" : "reject_requeue_true",
      encoding: parsed.encoding,
      truncate: parsed.truncate ? Number(parsed.truncate) : 50000
    };

    const messages = await rabbitHttpRequest(
        `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/get`,
        "POST",
        undefined,
        body
    );
    return { content: [{ type: "text", text: JSON.stringify(messages, null, 2) } as MCPTextContent] };
  }
};

export const getQueueBindings = {
  name: "get-queue-bindings",
  description: "List queue bindings",
  params: z.object({ vhost: z.string(), name: z.string() }),
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      name: { type: "string" }
    },
    required: ["vhost", "name"]
  },
  annotations: {
    title: "List Queue Bindings",
    readOnlyHint: true,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const { vhost, name } = getQueueBindings.params.parse(args)
    const bindings = await rabbitHttpRequest(
      `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/bindings`
    )
    return { content: [{ type: "text", text: JSON.stringify(bindings, null, 2) } as MCPTextContent] }
  }
}

export const getQueueUnacked = {
  name: "get-queue-unacked",
  description: "List unacked messages for a queue",
  params: z.object({ vhost: z.string(), name: z.string() }),
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      name: { type: "string" }
    },
    required: ["vhost", "name"]
  },
  annotations: {
    title: "List Unacked Messages",
    readOnlyHint: true,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const { vhost, name } = getQueueUnacked.params.parse(args)
    const unacked = await rabbitHttpRequest(
      `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/unacked`
    )
    return { content: [{ type: "text", text: JSON.stringify(unacked, null, 2) } as MCPTextContent] }
  }
}

export const pauseQueue = {
  name: "pause-queue",
  description: "Pause a queue",
  params: z.object({ vhost: z.string(), name: z.string() }),
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      name: { type: "string" }
    },
    required: ["vhost", "name"]
  },
  annotations: {
    title: "Pause Queue",
    readOnlyHint: false,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const { vhost, name } = pauseQueue.params.parse(args)
    const result = await rabbitHttpRequest(
      `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/pause`,
      "PUT"
    )
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) } as MCPTextContent] }
  }
}

export const resumeQueue = {
  name: "resume-queue",
  description: "Resume a queue",
  params: z.object({ vhost: z.string(), name: z.string() }),
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      name: { type: "string" }
    },
    required: ["vhost", "name"]
  },
  annotations: {
    title: "Resume Queue",
    readOnlyHint: false,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const { vhost, name } = resumeQueue.params.parse(args)
    const result = await rabbitHttpRequest(
      `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}/resume`,
      "PUT"
    )
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) } as MCPTextContent] }
  }
}

const publishMessageParams = z.object({
  vhost: z.string().describe("The vhost name"),
  exchange: z.string().describe("The exchange name"),
  routing_key: z.string().optional().default("").describe("The routing key"),
  payload: z.string().describe("The message content (payload)"),
  payload_encoding: z.string().optional().default("string").describe("Encoding of the payload (e.g., string)"),
  properties: z.record(z.any()).optional().default({}).describe("Optional message properties")
});

export const publishMessage = {
  name: "publish-message",
  description: "Publish a message to a specific exchange",
  params: publishMessageParams,
  inputSchema: {
    type: "object",
    properties: {
      vhost: { type: "string" },
      exchange: { type: "string" },
      routing_key: { type: "string", default: "" },
      payload: { type: "string" },
      payload_encoding: { type: "string", default: "string" },
      properties: { type: "object", additionalProperties: true }
    },
    required: ["vhost", "exchange", "payload"]
  },
  annotations: {
    title: "Publish Message",
    readOnlyHint: false,
    openWorldHint: true
  },
  handler: async (args: any): Promise<MCPToolResult> => {
    const parsed = publishMessageParams.parse(args);
    const { vhost, exchange, ...body } = parsed;

    const result = await rabbitHttpRequest(
        `/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(exchange)}/publish`,
        "POST",
        undefined,
        {
          properties: body.properties || {},
          routing_key: body.routing_key,
          payload: body.payload,
          payload_encoding: body.payload_encoding
        }
    );

    return {
      content: [
        {
          type: "text",
          text: `Message published. Routed: ${result.routed}`
        } as MCPTextContent
      ]
    };
  }
};

export const QUEUE_TOOLS = [
  listQueues,
  listQueuesVhost,
  getQueue,
  putQueue,
  deleteQueue,
  purgeQueue,
  getQueueMessages,
  publishMessage,
  getQueueBindings,
  getQueueUnacked,
  pauseQueue,
  resumeQueue
]
