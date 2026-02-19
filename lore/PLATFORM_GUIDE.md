# Platform Export & Import Guide

**LORE Platform-Agnostic Session Management**

This guide covers how to export conversations from each supported LLM platform and import them into LORE.

---

## Supported Platforms

- ✅ **Claude Code** (Anthropic) - Native support
- ✅ **ChatGPT** (OpenAI) - Via export adapter
- ✅ **Gemini** (Google) - Via export adapter
- 🔄 **Claude.ai Web** (Anthropic) - Planned
- 🔄 **Poe** (Quora) - Planned
- 🔄 **Perplexity** - Planned

---

## Platform 1: Claude Code (Native)

**Status:** ✅ Fully supported (current implementation)

### Export Location
```bash
~/.claude/projects/-{project-name}/{session-id}.jsonl
```

### Import Command
```bash
node tools/cli/rcm-import.js \
  --source ~/.claude/projects/-home-cbasta/*.jsonl \
  --platform claude-code \
  --target /home/cbasta/makanui-knowledge/
```

### Format Details
- **File Format:** JSONL (newline-delimited JSON)
- **Entry Types:** user, assistant, progress, system, file-history-snapshot
- **Message Structure:** `message.content[]` array with type blocks (text, thinking, tool_use)
- **Metadata:** title, created_at, updated_at, working_directory, git context

---

## Platform 2: ChatGPT (OpenAI)

**Status:** 🔄 Adapter in progress

### How to Export

#### Method 1: Official Export (Recommended)

1. Go to https://chatgpt.com/
2. Click your profile (bottom left)
3. Settings → Data controls → Export data
4. Request export (takes a few minutes)
5. Download `conversations.json`

**File Format:**
```json
[
  {
    "id": "conversation-uuid",
    "title": "Conversation Title",
    "create_time": 1234567890.123,
    "update_time": 1234567891.456,
    "mapping": {
      "message-uuid": {
        "id": "message-uuid",
        "parent": "parent-uuid",
        "children": ["child-uuid"],
        "message": {
          "id": "message-uuid",
          "author": {
            "role": "user|assistant",
            "name": null,
            "metadata": {}
          },
          "create_time": 1234567890.123,
          "content": {
            "content_type": "text",
            "parts": ["Message text here"]
          },
          "metadata": {
            "model_slug": "gpt-4",
            "finish_details": {...}
          }
        }
      }
    }
  }
]
```

#### Method 2: Browser Extension (Real-time)

- **ShareGPT** - Chrome extension for single conversations
- **ChatGPT Exporter** - Export as JSON/Markdown

### Import Command
```bash
node tools/cli/rcm-import.js \
  --source ~/Downloads/conversations.json \
  --platform chatgpt \
  --target /home/cbasta/makanui-knowledge/
```

### Key Mapping Challenges
- ✅ Tree structure (parent-child via mapping) → Flatten to linear
- ✅ Timestamp format (Unix epoch float) → ISO 8601
- ✅ Model names (gpt-4, gpt-3.5-turbo) → Normalize
- ⚠️ No thinking/reasoning exposed (unlike Claude)
- ⚠️ Tool use in separate messages

---

## Platform 3: Gemini (Google)

**Status:** 🔄 Adapter in progress

### How to Export

#### Method 1: Google Takeout (Official)

1. Go to https://takeout.google.com/
2. Select "Bard" or "Gemini" (name varies)
3. Choose JSON format
4. Download archive
5. Extract `Saved Gemini Activity.json`

**File Format:**
```json
[
  {
    "conversationId": "conversation-uuid",
    "title": "Conversation Title",
    "createTime": "2024-02-11T12:34:56.789Z",
    "updateTime": "2024-02-11T13:00:00.000Z",
    "turns": [
      {
        "turnId": "turn-uuid",
        "userQuery": {
          "text": "User message"
        },
        "geminiResponse": {
          "text": "Assistant response",
          "citations": [...],
          "webSearch": {...}
        },
        "timestamp": "2024-02-11T12:35:00.000Z"
      }
    ]
  }
]
```

#### Method 2: Manual Copy-Paste

- Copy conversation from https://gemini.google.com/
- Save as text file
- Import with `--platform gemini-text`

### Import Command
```bash
node tools/cli/rcm-import.js \
  --source ~/Downloads/takeout-gemini.json \
  --platform gemini \
  --target /home/cbasta/makanui-knowledge/
```

### Key Mapping Challenges
- ✅ "Turns" instead of messages → Convert to message pairs
- ✅ userQuery/geminiResponse → Normalize to role: user/assistant
- ✅ Citations and web search → Preserve in metadata
- ⚠️ No thinking/reasoning exposed
- ⚠️ Image uploads handled differently

---

## Platform 4: Claude.ai Web (Planned)

**Status:** 🔄 Not yet implemented

### Export Methods

#### Official Export (Not Available Yet)
Anthropic doesn't provide bulk export from claude.ai web currently.

#### Workarounds:
1. **Browser Extension:** Use ChatGPT Exporter (supports Claude)
2. **Manual:** Copy-paste conversations
3. **API:** If using Claude API, capture via logging

### Import Command (Future)
```bash
node tools/cli/rcm-import.js \
  --source ~/Downloads/claude-web-export.json \
  --platform claude-web \
  --target /home/cbasta/makanui-knowledge/
```

---

## Platform 5: Poe (Planned)

**Status:** 🔄 Not yet implemented

**Note:** Poe aggregates multiple models (Claude, GPT, Gemini). Need to handle multi-model conversations.

### Export: No official export available

---

## Platform 6: Perplexity (Planned)

**Status:** 🔄 Not yet implemented

### Export: Manual copy-paste or browser extension

---

## Universal Import Workflow

### Step 1: Export from Platform

Follow platform-specific instructions above.

### Step 2: Import to LORE

```bash
# General command
node tools/cli/rcm-import.js \
  --source /path/to/export-file \
  --platform {claude-code|chatgpt|gemini|claude-web} \
  --target /home/cbasta/{client}-knowledge/
```

### Step 3: Verify Import

```bash
# Check imported sessions
ls -la /home/cbasta/{client}-knowledge/rcm/archive/canonical/2026/02/

# View in Web UI
node tools/web/server.js /home/cbasta/{client}-knowledge/ 3000
# Open http://localhost:3000
```

### Step 4: Promote Valuable Sessions

```bash
node tools/cli/rcm-flow.js promote \
  --session SESSION_ID \
  --to codified \
  --tags "platform-name,project,topic"
```

---

## Canonical Format Mapping

All platforms convert to the same canonical YAML format:

```yaml
session:
  id: "uuid-v4"                    # Generated by LORE
  canonical_version: "1.0"
  created_at: "ISO 8601"
  updated_at: "ISO 8601"

  source:
    platform: "chatgpt|gemini|claude-code|claude-web|poe"
    platform_version: "gpt-4|gemini-pro|..."
    session_id: "original-platform-id"
    export_method: "official|extension|manual"

  metadata:
    title: "Conversation Title"
    summary: "Auto-generated summary"
    tags: []                       # Manually added post-import
    participants: ["user", "assistant"]
    model: "gpt-4|claude-opus-4|gemini-pro"

  flow_state:
    current: "hypothesis"          # Always starts here
    quality_score: null

messages:
  - id: "uuid"
    parent_id: "uuid|null"
    timestamp: "ISO 8601"
    role: "user|assistant|system"
    content: "Message text"

    # Platform-specific extensions
    thinking: "..."                # Claude only
    citations: [...]               # Gemini only
    tool_uses: [...]               # Claude, GPT with function calling
    web_search: {...}              # Gemini, Perplexity

    usage:                         # If available
      input_tokens: 100
      output_tokens: 50
      cache_read_tokens: 0

fidelity:
  level: "standard"
  preserved_fields: ["thinking", "tool_uses", "usage_metrics", "citations"]
  notes: "Platform-specific fields preserved where available"
```

---

## Platform Comparison

| Feature | Claude Code | ChatGPT | Gemini | Claude Web | Poe |
|---------|-------------|---------|--------|------------|-----|
| **Export Method** | File system | Official export | Google Takeout | Extension | Manual |
| **Format** | JSONL | JSON | JSON | N/A | N/A |
| **Thinking/Reasoning** | ✅ Yes | ❌ No | ❌ No | ✅ Yes | Varies |
| **Tool Use** | ✅ Detailed | ✅ Functions | ⚠️ Limited | ✅ Detailed | Varies |
| **Token Counts** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Conversation Tree** | ✅ Parent IDs | ✅ Mapping | ⚠️ Linear | ✅ Yes | ⚠️ Linear |
| **Citations** | ❌ No | ❌ No | ✅ Yes | ❌ No | Varies |
| **Web Search** | ❌ No | ❌ No | ✅ Yes | ❌ No | ✅ Yes |
| **Image Support** | ✅ Base64 | ✅ URLs | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Adding New Platforms

### Adapter Template

```javascript
// tools/adapters/new-platform.js

export async function convertNewPlatform(sourcePath, options = {}) {
  // 1. Read source file
  const rawData = await fs.readFile(sourcePath, 'utf-8');
  const platformData = JSON.parse(rawData);

  // 2. Extract sessions
  const sessions = platformData.conversations || platformData;

  // 3. Convert each session
  for (const session of sessions) {
    const canonical = {
      session: {
        id: uuidv4(),
        canonical_version: '1.0',
        created_at: convertTimestamp(session.create_time),
        updated_at: convertTimestamp(session.update_time),
        source: {
          platform: 'new-platform',
          platform_version: session.model || 'unknown',
          session_id: session.id,
          export_method: 'official'
        },
        metadata: {
          title: session.title || 'Untitled',
          tags: [],
          participants: ['user', 'assistant'],
          model: session.model
        },
        flow_state: {
          current: 'hypothesis',
          quality_score: null
        }
      },
      messages: convertMessages(session.messages),
      fidelity: {
        level: 'standard',
        preserved_fields: ['tool_uses', 'usage_metrics']
      }
    };

    // 4. Save to canonical format
    await saveCanonical(canonical, options.targetDir);
  }
}

function convertMessages(platformMessages) {
  // Convert platform-specific message format to canonical
  return platformMessages.map(msg => ({
    id: uuidv4(),
    parent_id: msg.parent_id || null,
    timestamp: convertTimestamp(msg.timestamp),
    role: msg.role,
    content: extractContent(msg),
    usage: extractUsage(msg)
  }));
}
```

### Integration Checklist

- [ ] Create adapter in `tools/adapters/{platform}.js`
- [ ] Add export instructions to this guide
- [ ] Update `tools/cli/rcm-import.js` to handle new platform
- [ ] Test with real export data
- [ ] Document platform-specific quirks
- [ ] Add to README.md supported platforms list

---

## Troubleshooting

### "Cannot parse {platform} export"

**Cause:** Export format changed (platforms update formats)

**Solution:**
1. Check export file structure: `jq . export.json | head -50`
2. Compare with format documented above
3. Update adapter if format changed
4. Open GitHub issue with sample (sanitized)

### "Missing messages after import"

**Cause:** Deleted messages, draft messages, or system messages filtered

**Solution:**
- Check original export for message count
- Verify `fidelity: standard` includes all message types
- Use `fidelity: full` to preserve everything

### "Title showing as 'Untitled'"

**Cause:** Platform doesn't provide title or export doesn't include it

**Solution:**
- Auto-title from first user message (already implemented)
- Manually add title post-import via Web UI (future feature)

---

## Best Practices

### 1. Export Regularly

```bash
# Set calendar reminder to export monthly
# ChatGPT: Request export first Monday of month
# Gemini: Request Takeout first Monday of month
# Claude Code: Auto-synced (no action needed)
```

### 2. Tag by Platform

```bash
# After import, tag by source platform
rcm-flow promote --session SESSION_ID --to codified \
  --tags "chatgpt,project-name,topic"
```

### 3. Quality Check Imports

```bash
# After bulk import, browse in Web UI
node tools/web/server.js /home/cbasta/makanui-knowledge/ 3000

# Verify:
# - Message count matches
# - Titles extracted correctly
# - Timestamps converted properly
```

### 4. Backup Raw Exports

```bash
# Keep original exports in rcm/archive/raw/
ls /home/cbasta/makanui-knowledge/rcm/archive/raw/
# chatgpt/conversations-2026-02-11.json
# gemini/takeout-2026-02-11.json
# claude-code/{session-id}.jsonl
```

---

## Future Platform Support

**Vote on next platforms:**
- [ ] Claude.ai Web (Anthropic web interface)
- [ ] Poe (multi-model aggregator)
- [ ] Perplexity (search-augmented)
- [ ] HuggingChat (open-source models)
- [ ] Character.AI (character-based conversations)
- [ ] Phind (developer-focused)

**Submit requests:** https://github.com/cbasta-intenx/rtgf-sage/issues

---

**Last Updated:** 2026-02-11
**LORE Version:** 0.1.0
