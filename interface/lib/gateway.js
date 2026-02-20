'use strict'

const OpenAI = require('openai')
const { chatConfig } = require('./config')

// Build an OpenAI client pointed at LiteLLM for a given chat
function clientFor(chatId) {
  const cfg = chatConfig(chatId)
  const apiKey = cfg?.litellm_key
    ?? process.env.LITELLM_DEFAULT_KEY
    ?? process.env.LITELLM_MASTER_KEY

  return new OpenAI({
    apiKey,
    baseURL: `${process.env.GATEWAY_URL ?? 'http://localhost:4000'}/v1`
  })
}

// Send a prompt to the gateway, return the response text
async function ask(chatId, model, prompt, systemPrompt = null) {
  const client = clientFor(chatId)

  const messages = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 2048
    })
    return response.choices[0]?.message?.content ?? '(no response)'
  } catch (err) {
    if (err.status === 429) {
      return `Budget limit reached for this client. Contact admin to increase.`
    }
    if (err.code === 'ECONNREFUSED') {
      return `Gateway not reachable at ${process.env.GATEWAY_URL}. Is it running?`
    }
    throw err
  }
}

// Fetch model list from gateway
async function listModels() {
  const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }))
  const url = `${process.env.GATEWAY_URL ?? 'http://localhost:4000'}/v1/models`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY}` }
  })
  if (!res.ok) throw new Error(`Gateway returned ${res.status}`)
  const data = await res.json()
  return data.data?.map(m => m.id) ?? []
}

// Fetch spend summary from gateway
async function spendSummary() {
  const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }))
  const url = `${process.env.GATEWAY_URL ?? 'http://localhost:4000'}/spend/teams`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY}` }
  })
  if (!res.ok) throw new Error(`Gateway returned ${res.status}`)
  return res.json()
}

module.exports = { ask, listModels, spendSummary }
