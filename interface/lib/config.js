'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

let _config = null

function loadConfig() {
  if (_config) return _config

  const configPath = path.join(__dirname, '..', 'config.yaml')
  _config = yaml.load(fs.readFileSync(configPath, 'utf8'))
  return _config
}

// Resolve which chat config applies for a given chat_id string
function chatConfig(chatId) {
  const config = loadConfig()
  const id = String(chatId)

  // Explicit match first
  if (config.chats[id]) return config.chats[id]

  // Fall back to default
  return config.chats.default
}

function isAdmin(chatId) {
  const cfg = chatConfig(chatId)
  return cfg?.admin === true || String(chatId) === process.env.ADMIN_CHAT_ID
}

function modelForCommand(command) {
  const config = loadConfig()
  return config.models?.[command] ?? 'local-general'
}

module.exports = { loadConfig, chatConfig, isAdmin, modelForCommand }
