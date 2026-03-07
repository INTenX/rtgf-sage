'use strict'

const { randomUUID } = require('crypto')
const { ask } = require('./gateway')
const { getContextForPrompt } = require('./chronicle')

// ─── Agent system prompts ─────────────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  research: `You are a research agent. Your job is to synthesize information and produce structured, well-cited findings. Be thorough but concise. Use markdown headers and bullet points. Prefer depth over breadth on the specific question asked.`,

  code: `You are a coding agent. Your job is to implement clean, production-ready code. No fluff — provide the implementation with brief inline comments for non-obvious logic. Explain key design decisions after the code block. Default to the language and style evident from the context.`,

  write: `You are a writing agent. Your job is to produce professional prose. Be clear, concise, and appropriate for the intended audience. Use the tone evident from the context (technical docs, client communication, internal notes, etc.).`,

  analyze: `You are an analysis agent. Your job is to identify patterns, risks, trade-offs, and actionable recommendations. Structure your output with clear sections. Be specific — avoid generic observations. Flag the highest-priority findings first.`,
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 4096

// ─── dispatchTask ─────────────────────────────────────────────────────────────

/**
 * Dispatch a structured task to a Claude agent.
 *
 * @param {object} packet - TaskPacket (see dispatcher/PROTOCOL.md)
 * @returns {Promise<object>} ResultPacket
 */
async function dispatchTask(packet) {
  const taskId = packet.taskId ?? randomUUID()
  const type = packet.type ?? 'research'
  const goal = packet.goal
  const model = packet.constraints?.model ?? DEFAULT_MODEL
  const maxTokens = packet.constraints?.max_tokens ?? DEFAULT_MAX_TOKENS
  const chatId = packet.callback?.chat_id ?? null

  if (!SYSTEM_PROMPTS[type]) {
    return {
      taskId,
      status: 'failed',
      result: `Unknown agent type: "${type}". Valid types: ${Object.keys(SYSTEM_PROMPTS).join(', ')}`,
      model,
      usage: { input_tokens: 0, output_tokens: 0 },
      elapsed_ms: 0,
    }
  }

  const start = Date.now()

  try {
    // Build system prompt: agent type prompt + any CHRONICLE context
    let systemPrompt = SYSTEM_PROMPTS[type]

    const chronicleContext = await getContextForPrompt(goal).catch(() => null)
    if (chronicleContext) {
      systemPrompt += `\n\n---\n\n**Relevant past context from CHRONICLE:**\n${chronicleContext}`
    }

    if (packet.context?.inline) {
      systemPrompt += `\n\n---\n\n**Additional context provided by user:**\n${packet.context.inline}`
    }

    // Use the existing gateway ask() — it handles LiteLLM routing, spend tracking, etc.
    // Pass chatId for per-client key resolution; null falls back to default key.
    const response = await ask(chatId, model, goal, {
      systemPrompt,
      history: [],
    })

    return {
      taskId,
      status: 'completed',
      result: response,
      model,
      usage: { input_tokens: 0, output_tokens: 0 },  // LiteLLM doesn't surface usage via openai SDK easily
      elapsed_ms: Date.now() - start,
    }
  } catch (err) {
    return {
      taskId,
      status: 'failed',
      result: `Dispatch failed: ${err.message}`,
      model,
      usage: { input_tokens: 0, output_tokens: 0 },
      elapsed_ms: Date.now() - start,
    }
  }
}

module.exports = { dispatchTask, AGENT_TYPES: Object.keys(SYSTEM_PROMPTS) }
