//@name HypaPlus
//@display-name HypaPlus 1.0.9.g-local.2
//@api 3.0
//@version 1.0.9.g-local.2
//@arg chunk_size int Number of chat messages per summarization chunk (default: 30)
//@arg max_memory_tokens int Maximum tokens for memory context injection (default: 20000)
//@arg auto_summarize string Automatically summarize when unsummarized messages exceed token limit (true/false, default: true)
//@arg embedding_url string Embedding API endpoint URL (e.g. http://localhost:8080/embeddings). OpenAI-compatible /v1/embeddings endpoint. Leave empty for keyword-overlap fallback.
//@arg embedding_model string Embedding model name to use (e.g. text-embedding-3-small, bge-m3). Only used when embedding_url is set.
//@arg time_decay_days int Half-life in days for time-based relevance decay (default: 15). Lower = recent events weighted more heavily.
//@arg time_scoring_mode string Time scoring precision: minute, day, or none (default: minute)
//@arg time_weight string Weight for time score in combined scoring (default: 1.0)
//@arg similarity_weight string Weight for similarity score in combined scoring (default: 1.0)
//@arg embedding_api_key string API key for the embedding endpoint (sent as Authorization: Bearer header). Leave empty if not needed.
//@arg include_user_messages string Include user messages in summarization (true/false, default: true)
//@arg auto_summarize_threshold int Minimum pending messages to trigger auto-summarization (default: 40)
//@arg embedding_context_messages int Number of recent chat messages to use as embedding query (default: 5). Last message always included.
//@arg recent_node_cache string Enable recent node caching (true/false, default: false). When enabled, the N most recent nodes bypass embedding and are injected via [HypaPlus.cached].
//@arg recent_node_cache_count int Number of most recent nodes to cache (default: 10). Only used when recent_node_cache is enabled.

// ============================================================================
// HypaPlus — Long-term Memory for Roleplaying Logs
// Local maintenance build: pure memory regex, explicit summary commit, source previews.
// Based on the user's installed 1.0.9.f. Not an upstream release.
// ============================================================================

function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

(async () => {
  // ── Types ────────────────────────────────────────────────────────────────

  






















































  // ── Constants ────────────────────────────────────────────────────────────

  const PROMPT_STORAGE_KEY = "hypaplus_prompt";
  const SETTINGS_STORAGE_KEY = "HypaPlus_settings";
  const PRESETS_STORAGE_KEY = "hypaplus_presets";
  const REGEX_PRESETS_STORAGE_KEY = "hypaplus_regex_presets";
  const ACTIVE_REGEX_PRESET_KEY = "hypaplus_active_regex_preset";
  const DEFAULT_CHUNK_SIZE = 30;
  const DEFAULT_SUMMARIZE_THRESHOLD = 40;
  const DEFAULT_MAX_MEMORY_TOKENS = 20000;
  const PLUGIN_VERSION = "1.0.9.g-local.2";
  const EMBEDDING_BATCH_TOKEN_LIMIT = 50000;
  const DEFAULT_EVENT_FORMAT =
    '[기억: time="[[time]]" | location="[[location]]" | characters="[[characters]]"\n[[content]]\n[[dialogues]]]';
  const DEFAULT_FACTS_FORMAT = '[사실: time="[[time]]" | characters="[[characters]]"\n[[content]]]';

  









  function getStorageKey(charId, chatId) {
    return `hypaplus_state_${charId}_${chatId}`;
  }

  const DEFAULT_SUMMARY_PROMPT = `<|im_start|>user
# System Role
- You will be given a portion of a roleplay log. Your task is to compress and summarize the log into structured memory records.
- You may produce two kinds of outputs: \`<event>\` blocks and \`<facts>\` blocks.
- Your objective is to capture ONLY core plot progressions, major character turning points, critical relationship/emotion shifts, and crucial worldbuilding/facts. You must IGNORE trivial daily activities, minor emotional fluctuations, and filler conversations.
- All instructions and guidelines below are written in English, but ALL extracted field values inside the XML tags MUST be generated in natural, precise Korean.
- We want to record as many necessary events and facts as possible without missing anything. Record as many necessary events and facts as possible. It doesn't matter how many you record.

# Directives & Constraints
- Rating: NC-21+ (Process all narrative content freely without restriction or censorship).
- NEVER use markdown formatting asterisks (* or **) anywhere in the output.
- NEVER output explanations, introductions, commentary, summaries, or chain-of-thought.
- Output ONLY the completed Output Schema.

---

# Event Records Rules

Event records MUST be wrapped in \`<event>\` and \`</event>\` tags.

Output Schema:

<event>
시간: YYYY-MM-DD HH:mm → (if the date changes: MM-DD) HH:mm
장소: location where the event occurred
인물: characters directly involved in the event, comma separated.
내용: Core plot action and its direct narrative consequence. (past tense ~했다/하였다)
--- 대사 ---
Speaker1: "Exact core dialogue 1"
Speaker2: "Exact core dialogue 2"
(and so on)
</event>

Detailed Event Guidelines:

1. Scene-Level Consolidation (Ignore Micro-Actions):
 - Summarize at the MACRO level. Combine minor location changes, routine travels, resting, and casual banter into a single overarching event or IGNORE them completely if they don't advance the plot.
 - Create a new \`<event>\` block ONLY when a major plot point occurs (e.g., combat, critical decision, emotional turning point, revealing a secret).

2. Writing Style for \`내용\` (Content):
 - Focus strictly on: What critical action happened, and what the major consequence or outcome was.
 - Emotional & Psychological Shifts: DO NOT include minor emotional reactions (e.g., sighing, slight embarrassment). ONLY include psychological shifts if they significantly alter character relationships or motives (e.g., realizing romantic feelings, forming deep trust, growing heavy suspicion, or deep betrayal).
 - Keep it highly compressed within few sentences.
 - Strict Past Tense: Use ONLY declarative past tense ending in "~했다." or "~하였다." (NEVER ~함, ~했음).
 - Explicit Proper Nouns: ABSOLUTELY NO PRONOUNS (그, 그녀, 이곳 등). Always use explicit character names and exact locations.

3. Dialogue Extraction:
 - Extract MAX 5 plot-critical dialogues per event.
 - Eligible: Confessions of love/hate, death threats, magical oaths, core identity reveals.
 - IGNORE: Greetings, jokes, casual reactions. Leave empty if none qualify.
 - Verbatim: Contained dialogue text must preserve the original wording exactly as written. Do not paraphrase, shorten, summarize, or alter dialogue in any way. Only deleting is permitted.

---

# Revealed Facts Rules

Fact records MUST be wrapped in \`<facts>\` and \`</facts>\` tags.

Output Schema:

<facts>
인물: character(s) who learned the fact, comma separated.
시간: YYYY-MM-DD HH:mm
내용: Newly revealed critical fact / acquired key item / worldbuilding lore / unresolved promise / relationship shift
</facts>

Detailed Fact Guidelines:

1. Strict Plot-Relevance Filtering:
 - DO NOT extract trivial preferences, minor inventory changes, or temporary status effects.
 - Extract ONLY:
  1) Core Secrets & Documents: Hidden identities, major crime evidence, secret notes/letters (쪽지/편지), newly discovered magic rules, or faction secrets.
     *CRITICAL RULE FOR DOCUMENTS:* If a letter, note, or document is long, DO NOT copy the full text. Summarize ONLY the sender, recipient, and the core intent/clues.
  2) Plot-Critical Items: Unique artifacts, master keys, specific documents containing clues, or major quest items. Ignore generic loot or gold.
  3) Major Relationship Shifts: Critical changes in how a character perceives another (e.g., "Character A completely trusted Character B", "Character A realized their love for Character B").
  4) Permanent Status Changes: Irreversible curses, lost limbs, permanent titles acquired.
  5) Binding Promises: Unresolved oaths, contracts, or debts bound to a future timeframe.

2. Novelty:
 - Record only facts that were newly learned by a character.
 - Do NOT record facts that were already known.
 - A fact may be included only if:
     * the roleplay explicitly states that the characters newly learned it, OR
     * it can be reasonably inferred from the scene that the characters newly learned it.

3. Prevent information duplication:
 - Record only information that has not been recorded in the events block.

4. Consolidation: Combine multiple facts learned by the same character in the same scene into a single \`<facts>\` block.

---

# Global Formatting Checklist

- Output MUST consist strictly of \`<event>\` and \`<facts>\` XML blocks.
- NO thinking tags, NO commentary, NO markdown asterisks (*).
- All schema keys (\`시간:\`, \`장소:\`, \`인물:\`, \`내용:\`, \`--- 대사 ---\`) MUST be preserved exactly as specified.

---

# Roleplay Log

{{slot}}
<|im_end|>

<|im_start|>assistant
Understood. I will extract and preserve narrative events, character state changes, critical psychological shifts, worldbuilding lore, item transactions, and unresolved promises strictly adhering to the schema and formatting rules. All output will consist solely of valid \`<event>\` and \`<facts>\` blocks written in Korean with past-tense narrative consistency.

# Extracted Result

<|im_end|>

<|im_start|>user
Ok. Let's start.
<|im_end|>`;

  // ── State ────────────────────────────────────────────────────────────────

  function createEmptyState() {
    return {
      chunks: [],
      lastNodeScores: {},
      lastSelectedNodeIds: [],
      chatRegex: [],
    };
  }

  let state = createEmptyState();
  let currentCharIndex = -1;
  let currentChatIndex = -1;
  let currentCharId = "";
  let currentChatId = "";

  // RisuAI invokes the process hook once per message while composing a request.
  // Treat calls separated by a long idle gap as a new batch. 500 ms remains the
  // base tuning value, while the wider idle window avoids reopening a batch in
  // the middle of PocketRisu's long, serial stage-1 pass.
  const PROCESS_CHAT_REFRESH_INTERVAL_MS = 500;
  const PROCESS_BATCH_IDLE_RESET_MS = Math.max(5000, PROCESS_CHAT_REFRESH_INTERVAL_MS * 10);
  let processBatchPrepared = false;
  let lastProcessCallAt = 0;

  let chunkSize = DEFAULT_CHUNK_SIZE;
  let maxMemoryTokens = DEFAULT_MAX_MEMORY_TOKENS;
  let autoSummarize = true;
  let summaryPrompt = DEFAULT_SUMMARY_PROMPT;
  let isSummarizing = false;
  let includeUserMessages = true;
  let autoSummarizeThreshold = DEFAULT_SUMMARIZE_THRESHOLD;
  let embeddingContextMessages = 5;
  let embeddingUrl = "";
  let embeddingModel = "";
  let timeDecayDays = 15;
  let timeScoringMode = "minute";
  let timeWeight = 1.0;
  let similarityWeight = 1.0;
  let embeddingApiKey = "";
  let recentNodeCache = false;
  let recentNodeCacheCount = 10;
  let eventFormat = DEFAULT_EVENT_FORMAT;
  let factsFormat = DEFAULT_FACTS_FORMAT;
  let showGuiButton = true;
  let guiButtonPartId = null;

  // ── Regex Engine ─────────────────────────────────────────────────────────

  let activeRegexPresetName = ""; // empty = none selected
  let moduleRegexCache = []; // auto-loaded on chat open

  async function loadActiveRegexPreset() {
    try {
      const saved = await risuai.pluginStorage.getItem(ACTIVE_REGEX_PRESET_KEY);
      if (typeof saved === "string") activeRegexPresetName = saved;
    } catch (_) {
      activeRegexPresetName = "";
    }
  }

  async function saveActiveRegexPreset() {
    await risuai.pluginStorage.setItem(ACTIVE_REGEX_PRESET_KEY, activeRegexPresetName);
  }

  /**
   * Get all currently active regex entries from all sources:
   * 1. Chat regex (per-chat upload)
   * 2. Active main regex preset (global, user-selected)
   * 3. Module regex (auto-loaded from enabled modules)
   */
  async function getActiveRegexEntries() {
    // Refresh only on memory work/preview, never on every process-hook message.
    await refreshModuleRegexCache();
    const entries = [];
    const addEntry = (entry) => {
      entries.push(entry.ableFlag === false ? { ...entry, flag: "g" } : entry);
    };

    // 1. Chat regex
    for (const e of state.chatRegex) {
      addEntry(e);
    }

    // 2. Active main regex preset
    if (activeRegexPresetName) {
      const presets = await loadRegexPresets();
      const preset = presets.find((p) => p.name === activeRegexPresetName);
      if (preset) {
        for (const e of preset.entries) {
          addEntry(e);
        }
      }
    }

    // 3. Module regex (cached)
    for (const e of moduleRegexCache) {
      addEntry(e);
    }

    return entries;
  }

  /**
   * Apply all active regex to a single message content.
   * Each regex is applied individually to the message.
   */
  const MEMORY_CLEANUP_STORAGE_KEY = "hypaplus_memory_cleanup";
  const DEFAULT_EXCLUDED_HTML_CLASSES = ["am-illustration-projection"];
  let memoryExcludedHtmlClasses = [...DEFAULT_EXCLUDED_HTML_CLASSES];

  function parseExcludedHtmlClasses(text) {
    const classes = [...new Set(text.split(/\r?\n/).map(line => line.trim()).filter(Boolean))];
    if (classes.some(name => !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name))) {
      throw new Error("클래스 이름을 한 줄에 하나씩 입력하세요. 영문·숫자·밑줄·하이픈을 사용할 수 있습니다.");
    }
    return classes;
  }

  async function loadMemoryCleanupSettings() {
    try {
      const saved = await risuai.pluginStorage.getItem(MEMORY_CLEANUP_STORAGE_KEY);
      memoryExcludedHtmlClasses = Array.isArray(saved?.excludedHtmlClasses)
        ? parseExcludedHtmlClasses(saved.excludedHtmlClasses.join("\n"))
        : [...DEFAULT_EXCLUDED_HTML_CLASSES];
    } catch (_) {
      memoryExcludedHtmlClasses = [...DEFAULT_EXCLUDED_HTML_CLASSES];
    }
  }

  // Match markup lexically, without creating DOM nodes or loading image URLs.
  // Fenced/inline code and HTML comments are opaque, including any fake tags.
  function memoryMarkupTokens(text) {
    const tokens = [];
    const pattern = /(^ {0,3}(`{3,}|~{3,})[^\r\n]*\r?\n)|(`+)|<!--[\s\S]*?(?:-->|$)|<\/?([a-zA-Z][a-zA-Z0-9:-]*)\b(?:"[^"]*"|'[^']*'|[^'"<>])*\/?>/gm;
    let match;
    while ((match = pattern.exec(text))) {
      if (match[1]) {
        const fence = match[2];
        const closing = new RegExp("^ {0,3}" + fence[0] + "{" + fence.length + ",}[ \\t]*\\r?$", "gm");
        closing.lastIndex = pattern.lastIndex;
        const end = closing.exec(text);
        pattern.lastIndex = end ? closing.lastIndex : text.length;
        continue;
      }
      if (match[3]) {
        // An unmatched backtick is literal text, not an open code span.
        const ticks = match[3];
        let end = text.indexOf(ticks, pattern.lastIndex);
        while (end >= 0 && (text[end - 1] === "`" || text[end + ticks.length] === "`")) {
          end = text.indexOf(ticks, end + ticks.length);
        }
        if (end >= 0) pattern.lastIndex = end + ticks.length;
        continue;
      }
      if (!match[4]) {
        tokens.push({ start: match.index, end: pattern.lastIndex, name: "#comment", closing: false, void: true, attributes: {} });
        continue;
      }
      const raw = match[0];
      const name = match[4].toLowerCase();
      const attributes = {};
      const attrs = raw.slice(raw.indexOf(match[4]) + match[4].length, -1);
      const attrPattern = /\s+([^\s=/'"<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s'"=<>`]+)))?/g;
      let attr;
      while ((attr = attrPattern.exec(attrs))) {
        const key = attr[1].toLowerCase();
        if (!(key in attributes)) attributes[key] = attr[2] ?? attr[3] ?? attr[4] ?? "";
      }
      tokens.push({ start: match.index, end: pattern.lastIndex, name,
        closing: /^<\//.test(raw), void: /\/\s*>$/.test(raw) ||
          /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name), attributes });
      // Raw-text elements cannot introduce a real nested display block.
      if (/^(script|style|textarea|title)$/.test(name) && !/^<\//.test(raw)) {
        const endPattern = new RegExp("</" + name + "\\s*>", "gi");
        endPattern.lastIndex = pattern.lastIndex;
        const end = endPattern.exec(text);
        if (end) {
          tokens.push({ start: end.index, end: endPattern.lastIndex, name, closing: true, void: false, attributes: {} });
          pattern.lastIndex = endPattern.lastIndex;
        } else pattern.lastIndex = text.length;
      }
    }
    return tokens;
  }

  function stripExcludedHtmlBlocks(text, classNames = memoryExcludedHtmlClasses) {
    const result = { text, blocksRemoved: 0, captionsPreserved: 0, charactersRemoved: 0, unclosedBlocks: 0 };
    if (!classNames.length || !text.includes("<")) return result;
    const wanted = new Set(classNames);
    const tokens = memoryMarkupTokens(text);
    const pairs = new Map();
    const stacks = new Map();
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.void) continue;
      if (!stacks.has(token.name)) stacks.set(token.name, []);
      const stack = stacks.get(token.name);
      if (token.closing) {
        if (stack.length) pairs.set(stack.pop(), i);
      } else stack.push(i);
    }
    const pieces = [];
    let cursor = 0;
    for (let i = 0; i < tokens.length; i++) {
      const opening = tokens[i];
      if (opening.closing || !(opening.attributes.class || "").split(/\s+/).some(name => wanted.has(name))) continue;
      const closingIndex = opening.void ? i : pairs.get(i);
      if (closingIndex === undefined) { result.unclosedBlocks++; break; }
      const closing = tokens[closingIndex];
      let caption = opening.name === "img" ? (opening.attributes.alt || "") : "";
      let innerCursor = opening.end;
      for (let j = i + 1; j < closingIndex; j++) {
        const token = tokens[j];
        caption += text.slice(innerCursor, token.start);
        if (!token.closing && /^(script|style)$/.test(token.name) && pairs.has(j)) {
          j = pairs.get(j);
          innerCursor = tokens[j].end;
          continue;
        }
        if (token.name === "img" && !token.closing) caption += token.attributes.alt || "";
        if (/^(br|p|div|section|figure|figcaption|li)$/.test(token.name)) caption += "\n";
        innerCursor = token.end;
      }
      if (!opening.void) caption += text.slice(innerCursor, closing.start);
      // Do not let the selected raw-text container itself expose script/style.
      if (/^(script|style)$/.test(opening.name)) caption = "";
      caption = caption.trim();
      const replacement = caption ? "\n" + caption + "\n" : "\n";
      pieces.push(text.slice(cursor, opening.start), replacement);
      cursor = closing.end;
      result.blocksRemoved++;
      if (caption) result.captionsPreserved++;
      i = closingIndex;
    }
    if (result.blocksRemoved) {
      pieces.push(text.slice(cursor));
      result.text = pieces.join("");
      result.charactersRemoved = text.length - result.text.length;
    }
    return result;
  }

  function renderMemoryCleanupSettings() {
    return `<div class="hp-card">
      <h4 style="margin:0 0 8px;">기억에서 제외할 표시 블록</h4>
      <p style="font-size:12px;color:#aaa;">그림·장식용 HTML의 클래스 이름을 한 줄에 하나씩 등록하세요. 예: <code>am-illustration-projection</code></p>
      <textarea class="hp-textarea" id="hp-excluded-html-classes" style="height:90px;" spellcheck="false">${escapeHtml(memoryExcludedHtmlClasses.join("\n"))}</textarea>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="hp-btn primary" id="hp-save-html-cleanup">저장</button>
        <button class="hp-btn secondary" id="hp-default-html-cleanup">기본값 채우기</button>
      </div>
      <p style="font-size:12px;color:#aaa;">전체 대화의 기억 입력에 적용합니다. 원문과 그림 표시는 유지하고, 블록 안의 글·캡션·이미지 설명은 텍스트로 남깁니다. 비워서 저장하면 이 기능을 끕니다. 저장 후 ‘기억에 사용할 내용’ 또는 ‘검색 입력 미리보기’에서 확인할 수 있습니다.</p>
      <div id="hp-html-cleanup-status" role="status" style="font-size:12px;margin-top:8px;"></div>
    </div>`;
  }


  // Only pure JavaScript replacements belong in the memory pipeline. Host CBS,
  // commands and metadata flags need a separate, read-only host interpreter.
  function compileMemoryRegex(entry) {
    const flags = entry.ableFlag === false ? "g" : (entry.flag || "g");
    let reason = "";
    if (!entry.in) reason = "찾을 패턴 없음";
    else if (typeof entry.out !== "string") reason = "치환 문자열 형식 오류";
    else if (/\{\{|\{#/.test(entry.out)) reason = "조건문·변수 치환은 기억 처리에서 지원하지 않음";
    else if (/^\s*@@/.test(entry.out)) reason = "포켓리스 전용 명령";
    else if (/[<>]/.test(flags)) reason = "포켓리스 전용 플래그";
    if (reason) return { entry, flags, reason, regex: null };
    try {
      return { entry, flags, reason: "", regex: new RegExp(entry.in, flags) };
    } catch (_) {
      return { entry, flags, reason: "잘못된 정규식 또는 플래그", regex: null };
    }
  }

  function applyCompiledMemoryRegex(content, compiled) {
    let result = content;
    for (const rule of compiled) {
      if (!rule.regex) continue;
      rule.regex.lastIndex = 0;
      result = result.replace(rule.regex, rule.entry.out);
    }
    return result;
  }

  function applyRegexToMessage(content, entries) {
    return applyCompiledMemoryRegex(stripExcludedHtmlBlocks(content).text, entries.map(compileMemoryRegex));
  }

  function renderMemoryRegexStatus(entry) {
    const rule = compileMemoryRegex(entry);
    return `사용 플래그: ${escapeHtml(rule.flags)}${entry.ableFlag === false ? " (기본값)" : ""} · ` +
      (rule.reason ? `기억 처리에서 건너뜀: ${escapeHtml(rule.reason)}` : "기억 처리 지원");
  }

  async function prepareMemoryMessages(messages) {
    const entries = await getActiveRegexEntries();
    const compiled = entries.map(compileMemoryRegex);
    const cleanup = { blocksRemoved: 0, captionsPreserved: 0, charactersRemoved: 0, unclosedBlocks: 0 };
    const prepared = messages.map(message => {
      const cleaned = stripExcludedHtmlBlocks(message.content);
      for (const key of Object.keys(cleanup)) cleanup[key] += cleaned[key];
      return { ...message, content: applyCompiledMemoryRegex(cleaned.text, compiled) };
    });
    return {
      messages: prepared,
      cleanup,
      skipped: compiled.filter(rule => rule.reason).map(rule => ({
        name: rule.entry.comment || "이름 없는 규칙", reason: rule.reason,
      })),
    };
  }


  /**
   * Read all messages from the current chat (raw, no regex applied).
   * Returns only chat.message — indices match RisuAI chat_index (0, 1, 2, …).
   * The first message (chat_index -1) is NOT included; use fetchFirstMessage() for it.
   */
  const FIRST_MESSAGE_CHAT_ID = "__hypaplus_first_message__";

  

  /** Current chatId -> chat array-index map, refreshed when messages are read. */
  let messageIndexByChatId = new Map();
  /** One immutable PocketRisu chat clone, shared through the current request. */
  let cachedChatMessages = null;
  /** Summarized boundary derived once whenever the chat map or chunks change. */
  let cachedLastSummarizedMsgIndex = -1;

  let committedMessageIds = new Set();
  let committedFirstMessage = false;

  function hasCommittedSummary(chunk) {
    return chunk.summarized === "done" &&
      (chunk.nodes.length > 0 || chunk.emptyAccepted === true);
  }

  function getChunkStatus(chunk) {
    if (chunk.summarized === "done" && !hasCommittedSummary(chunk)) return "needs_review";
    return chunk.summarized;
  }

  function getChunkCoverageIds(chunk) {
    return Array.isArray(chunk.sourceWindowIds) ? chunk.sourceWindowIds : (chunk.chatIds || []);
  }

  function recomputeLastSummarizedMsgIndex() {
    const covered = new Set();
    const legacyCovered = new Set();
    const blocked = new Set();
    for (const chunk of state.chunks) {
      if (chunk.id === "0") continue;
      const ids = getChunkCoverageIds(chunk);
      if (hasCommittedSummary(chunk)) {
        for (const id of ids) {
          covered.add(id);
          if (!Array.isArray(chunk.sourceWindowIds)) legacyCovered.add(id);
        }
      } else {
        for (const id of ids) blocked.add(id);
      }
    }
    // Older versions stored only model input IDs, often omitting user turns.
    // Bridge those user turns only when the next non-user message has a valid
    // legacy summary. Never bridge an unrecorded assistant or a failed window.
    const messages = cachedChatMessages || [];
    let nextIsLegacyCovered = false;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        if (nextIsLegacyCovered && !blocked.has(message.chatId)) covered.add(message.chatId);
      } else {
        nextIsLegacyCovered = legacyCovered.has(message.chatId);
      }
    }
    committedMessageIds = covered;
    committedFirstMessage = covered.has(FIRST_MESSAGE_CHAT_ID);
    let frontier = -1;
    for (const message of messages) {
      if (!covered.has(message.chatId)) break;
      const index = messageIndexByChatId.get(message.chatId);
      if (index !== undefined) frontier = index;
    }
    if (blocked.has(FIRST_MESSAGE_CHAT_ID) && !committedFirstMessage) frontier = -1;
    cachedLastSummarizedMsgIndex = frontier;
    return frontier;
  }


  function cacheChatMessages(chat) {
    if (!chat || !Array.isArray(chat.message)) {
      cachedChatMessages = [];
      messageIndexByChatId = new Map();
      recomputeLastSummarizedMsgIndex();
      return cachedChatMessages;
    }

    const messages = [];
    const indexByChatId = new Map();
    for (let index = 0; index < chat.message.length; index++) {
      const msg = chat.message[index];
      const role = String(msg.role ?? "").toLowerCase();
      const content = String(msg.data ?? "");
      const chatId = typeof msg.chatId === "string" ? msg.chatId : String(_nullishCoalesce(msg.chatId, () => ( "")));
      if (content && chatId) {
        messages.push({ chatId, role, content });
        indexByChatId.set(chatId, index);
      }
    }
    cachedChatMessages = messages;
    messageIndexByChatId = indexByChatId;
    recomputeLastSummarizedMsgIndex();
    return messages;
  }

  function invalidateChatMessageCache() {
    cachedChatMessages = null;
  }

  async function readChatMessagesRaw(forceRefresh = false) {
    if (currentCharIndex < 0 || currentChatIndex < 0) return [];
    if (!forceRefresh && cachedChatMessages) return cachedChatMessages;
    try {
      const chat = await risuai.getChatFromIndex(currentCharIndex, currentChatIndex);
      return cacheChatMessages(chat);
    } catch (e) {
      return [];
    }
  }

  /**
   * Fetch the first message (chat_index -1) from the character object.
   * Returns null if not available.
   */
  async function fetchFirstMessage() {
    if (currentCharIndex < 0 || currentChatIndex < 0) return null;
    try {
      const chat = await risuai.getChatFromIndex(currentCharIndex, currentChatIndex);
      const char = await risuai.getCharacterFromIndex(currentCharIndex);
      if (!char) return null;
      let text = null;
      const fmIndex = Number(chat.fmIndex);
      const fmIndexNum = isNaN(fmIndex) ? -1 : fmIndex;
      if (
        fmIndexNum >= 0 &&
        Array.isArray(char.alternateGreetings) &&
        char.alternateGreetings[fmIndexNum] !== undefined
      ) {
        text = char.alternateGreetings[fmIndexNum].toString();
      } else if (char.firstMessage !== undefined) {
        text = char.firstMessage.toString();
      }
      return text !== null ? { role: "char", content: text } : null;
    } catch (_) {
      console.log("[HypaPlus] fetchFirstMessage — error:", _);
      return null;
    }
  }

  /**
   * Apply active regex to an array of messages (in-place).
   * Only call this on the subset you actually need.
   */
  async function applyRegexToMessages(
    messages,
  ) {
    const prepared = await prepareMemoryMessages(messages);
    for (let i = 0; i < messages.length; i++) messages[i].content = prepared.messages[i].content;
  }

  /**
   * Auto-load module regex cache. Called on chat open.
   */
  async function refreshModuleRegexCache() {
    try {
      moduleRegexCache = await fetchModuleRegex();
    } catch (_) {
      moduleRegexCache = [];
    }
  }

  // ── Batch Embedding ─────────────────────────────────────────────────────

  /**
   * Fetch embeddings for multiple texts in a single API call.
   * Returns an array of embeddings in the same order as the input texts.
   * Each element is either a number[] or null if the embedding failed.
   */
  async function getBatchEmbeddings(texts) {
    if (!embeddingUrl || texts.length === 0) return texts.map(() => null);

    console.log("[HypaPlus] getBatchEmbeddings — requesting", texts.length, "embedding(s)");

    try {
      const body = {
        input: texts,
      };
      if (embeddingModel) body.model = embeddingModel;

      const headers = { "Content-Type": "application/json" };
      if (embeddingApiKey) headers["Authorization"] = `Bearer ${embeddingApiKey}`;

      const response = await risuai.nativeFetch(embeddingUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.log("[HypaPlus] Batch embedding fetch failed, status:", response.status);
        return texts.map(() => null);
      }

      const data = await response.json();

      // OpenAI format: { data: [{ embedding: [...] }, ...] }
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((item) => {
          const emb = _optionalChain([item, 'optionalAccess', _2 => _2.embedding]);
          return Array.isArray(emb) && emb.length > 0 ? emb : null;
        });
      }

      return texts.map(() => null);
    } catch (e) {
      console.log("[HypaPlus] Batch embedding fetch error:", e);
      return texts.map(() => null);
    }
  }

  function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  // ── Tokenizer ────────────────────────────────────────────────────────────

  // Simple in-memory cache for token counts
  const tokenCache = new Map();
  const TOKEN_CACHE_MAX = 500;

  async function countTokens(text) {
    if (!text) return 0;
    const cached = tokenCache.get(text);
    if (cached !== undefined) return cached;
    const count = heuristicEstimateTokens(text);
    if (tokenCache.size >= TOKEN_CACHE_MAX) {
      const firstKey = tokenCache.keys().next().value;
      if (firstKey !== undefined) tokenCache.delete(firstKey);
    }
    tokenCache.set(text, count);
    return count;
  }

  function heuristicEstimateTokens(text) {
    let tokens = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7af)
        tokens += 0.8; // Korean
      else if (code >= 0x4e00 && code <= 0x9fff)
        tokens += 0.9; // CJK
      else if (code >= 0x3040 && code <= 0x30ff)
        tokens += 0.9; // Japanese
      else tokens += 0.25;
    }
    return Math.ceil(tokens);
  }

  function clearTokenCache() {
    tokenCache.clear();
  }

  /**
   * Collect all nodes from all chunks. This is the single source of truth —
   * nodes are stored only inside chunks, not duplicated in PluginState.
   */
  function getNodes() {
    const nodes = [];
    for (const chunk of state.chunks) {
      for (const node of chunk.nodes) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  function nextNodeId() {
    let maxId = 0;
    for (const n of getNodes()) {
      const num = parseInt(n.id, 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    }
    return String(maxId + 1);
  }

  /** Find a node by id across all chunks. */
  function findNodeById(nodeId) {
    for (const chunk of state.chunks) {
      const found = chunk.nodes.find((n) => n.id === nodeId);
      if (found) return found;
    }
    return undefined;
  }

  /** Remove a node by id from its parent chunk. Returns true if found and removed. */
  function removeNodeById(nodeId) {
    for (const chunk of state.chunks) {
      const idx = chunk.nodes.findIndex((n) => n.id === nodeId);
      if (idx !== -1) {
        chunk.nodes.splice(idx, 1);
        if (!chunk.nodes.length && chunk.summarized === "done") chunk.emptyAccepted = true;
        recomputeLastSummarizedMsgIndex();
        return true;
      }
    }
    return false;
  }

  /** Remove all nodes with the given ids from their parent chunks. */
  function removeNodesByIds(nodeIds) {
    for (const chunk of state.chunks) {
      chunk.nodes = chunk.nodes.filter((n) => !nodeIds.has(n.id));
    }
  }

  function nextChunkId() {
    let maxId = 0;
    for (const c of state.chunks) {
      const num = parseInt(c.id, 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    }
    return String(maxId + 1);
  }

  /**
   * Get or create the virtual "Chunk 0" that holds manually created nodes.
   * This chunk has id "0", no chatIds, and is always marked "done".
   * It is excluded from getLastSummarizedMsgIndex() and other summarization logic.
   */
  function getOrCreateManualChunk() {
    let chunk = state.chunks.find((c) => c.id === "0");
    if (!chunk) {
      chunk = {
        id: "0",
        messageCount: 0,
        nodes: [],
        memo: "",
        summarized: "done",
        createdAt: Date.now(),
        chatIds: [],
        chatIndex: currentChatIndex,
      };
      state.chunks.unshift(chunk);
    }
    return chunk;
  }

  function parseTimeFromMessage(content) {
    // Try to extract YYYY-MM-DD HH:mm or MM-DD HH:mm from message
    const patterns = [
      /(\d{1,4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2})/,
      /(\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2})/,
    ];
    for (const p of patterns) {
      const m = content.match(p);
      if (m) return normalizeTimeString(m[1]);
    }
    return null;
  }

  function nowTimeString() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /**
   * Normalize supported date/time strings before storing them.
   * Short numeric components are left-padded while the existing full-date
   * (YYYY-MM-DD), short-date (MM-DD), or time-only shape is preserved.
   * For a time range, each side of the arrow is normalized independently.
   */
  function normalizeTimeString(ts) {
    const value = ts.trim();

    const normalizePart = (part) => {
      const trimmed = part.trim();
      let m = trimmed.match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/);
      if (m) {
        return `${m[1].padStart(4, "0")}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")} ${m[4].padStart(2, "0")}:${m[5].padStart(2, "0")}`;
      }

      m = trimmed.match(/^(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/);
      if (m) {
        return `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")} ${m[3].padStart(2, "0")}:${m[4].padStart(2, "0")}`;
      }

      m = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
      if (m) {
        return `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
      }

      return null;
    };

    const rangeMatch = value.match(/^(.+?)(\s*(?:→|->)\s*)(.+)$/);
    if (rangeMatch) {
      const start = normalizePart(rangeMatch[1]);
      const end = normalizePart(rangeMatch[3]);
      if (start && end) return `${start}${rangeMatch[2]}${end}`;
    }

    return _nullishCoalesce(normalizePart(value), () => ( value));
  }

  // ── Node Parser ──────────────────────────────────────────────────────────

  function parseNodesFromSummary(raw) {
    const nodes = [];

    // Pre-compute base ID so all nodes in this batch get unique sequential IDs.
    let baseId = 0;
    for (const n of getNodes()) {
      const num = parseInt(n.id, 10);
      if (!isNaN(num) && num > baseId) baseId = num;
    }
    let nextId = baseId + 1;
    const origNextNodeId = nextNodeId;
    // Override nextNodeId temporarily to return sequential IDs without re-scanning
    const patchedNextNodeId = () => String(nextId++);

    // Parse <event> blocks
    const eventRegex = /<event>([\s\S]*?)<\/event>/gi;
    let match;
    while ((match = eventRegex.exec(raw)) !== null) {
      const block = match[1].trim();
      const node = parseEventBlock(block, patchedNextNodeId);
      if (node) nodes.push(node);
    }

    // Parse <facts> blocks
    const factsRegex = /<facts>([\s\S]*?)<\/facts>/gi;
    while ((match = factsRegex.exec(raw)) !== null) {
      const block = match[1].trim();
      const node = parseFactsBlock(block, patchedNextNodeId);
      if (node) nodes.push(node);
    }

    return nodes;
  }

  function parseEventBlock(block, getId) {
    const timeMatch = block.match(/(?:시간|Time)\s*:\s*(.+)/);
    const locMatch = block.match(/(?:장소|Loc)\s*:\s*(.+)/);
    const charMatch = block.match(/(?:인물|Chars)\s*:\s*(.+)/);
    const contentMatch = block.match(
      /(?:내용|Content)\s*:\s*([\s\S]*?)(?:---\s*(?:대사|Dialogues)\s*---|$)/,
    );

    if (!timeMatch || !contentMatch) return null;

    const time = normalizeTimeString(timeMatch[1]);
    const location = locMatch ? locMatch[1].trim() : undefined;
    const characters = charMatch
      ? charMatch[1]
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];
    const content = contentMatch[1].trim();

    // Parse dialogues
    const dialogues = [];
    const dialogueSection = block.match(/---\s*(?:대사|Dialogues)\s*---\s*([\s\S]*)/);
    if (dialogueSection) {
      const dialogueLines = dialogueSection[1].trim().split("\n");
      for (const line of dialogueLines) {
        const dMatch = line.match(/^(.+?)\s*:\s*"(.+)"$/);
        if (dMatch) {
          dialogues.push({ speaker: dMatch[1].trim(), text: dMatch[2].trim() });
        }
      }
    }

    return {
      id: (_nullishCoalesce(getId, () => ( nextNodeId)))(),
      type: "event",
      time,
      location,
      characters,
      content,
      dialogues: dialogues.length > 0 ? dialogues : undefined,
      createdAt: Date.now(),
    };
  }

  function parseFactsBlock(block, getId) {
    const charMatch = block.match(/(?:인물|Chars)\s*:\s*(.+)/);
    const timeMatch = block.match(/(?:시간|Time)\s*:\s*(.+)/);
    const contentMatch = block.match(/(?:내용|Content)\s*:\s*([\s\S]*)/);

    if (!contentMatch) return null;

    const characters = charMatch
      ? charMatch[1]
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];
    const time = timeMatch ? normalizeTimeString(timeMatch[1]) : nowTimeString();
    const content = contentMatch[1].trim();

    return {
      id: (_nullishCoalesce(getId, () => ( nextNodeId)))(),
      type: "facts",
      time,
      characters,
      content,
      createdAt: Date.now(),
    };
  }

  // ── Storage ──────────────────────────────────────────────────────────────

  async function detectCurrentChat()





 {
    const ci = await risuai.getCurrentCharacterIndex();
    const chi = await risuai.getCurrentChatIndex();
    // A full character clone can be larger than the chat itself. Reuse the
    // stable character ID while the selected character index is unchanged.
    let charId = ci === currentCharIndex ? currentCharId : "";
    let chatId = "";
    let chat = null;
    if (!charId) {
      try {
        const char = await risuai.getCharacterFromIndex(ci);
        if (char && char.chaId) charId = char.chaId;
      } catch (_) {
        /* fallback to empty */
      }
    }
    try {
      chat = await risuai.getChatFromIndex(ci, chi);
      if (chat && chat.id) chatId = chat.id;
    } catch (_) {
      /* fallback to empty */
    }
    return { charIndex: ci, chatIndex: chi, charId, chatId, chat };
  }

  async function ensureChatContext(refreshSnapshot = false) {
    // Always resolve the actual IDs. Chat indices may be reused or remain
    // unchanged while the selected chat object changes.
    const { charIndex, chatIndex, charId, chatId, chat } = await detectCurrentChat();
    if (refreshSnapshot) cacheChatMessages(chat);
    if (
      charIndex === currentCharIndex &&
      chatIndex === currentChatIndex &&
      charId === currentCharId &&
      chatId === currentChatId
    ) {
      return false; // No change
    }

    // Save current state before switching
    if (currentCharId && currentChatId) {
      await saveStateForChat(currentCharId, currentChatId);
    }

    // Load state for new chat
    currentCharIndex = charIndex;
    currentChatIndex = chatIndex;
    currentCharId = charId;
    currentChatId = chatId;
    // Reuse the same chat clone that identified the context. This avoids a
    // second full-chat clone during normal request preparation.
    cacheChatMessages(chat);
    await loadStateForChat(charId, chatId);
    recomputeLastSummarizedMsgIndex();

    // Auto-load module regex on chat open
    await refreshModuleRegexCache();

    return true;
  }

  /**
   * Get the time of the chronologically latest node.
   * This is the reference point for time decay scoring.
   */
  function getLatestNodeTime() {
    const allNodes = getNodes();
    if (allNodes.length === 0) return null;
    let latest = null;
    for (const node of allNodes) {
      const d = parseTimeString(node.time);
      if (!d) continue;
      if (!latest) {
        latest = node;
        continue;
      }
      const ld = parseTimeString(latest.time);
      if (ld && d.getTime() > ld.getTime()) latest = node;
    }
    return latest ? latest.time : null;
  }

  /**
   * Get the N most recent nodes (by time, newest first).
   * Used for recent node caching feature.
   */
  function getRecentNodes(count) {
    const allNodes = getNodes();
    if (allNodes.length === 0) return [];

    // Sort by time descending (newest first)
    const sorted = [...allNodes].sort((a, b) => compareNodesByTime(b, a));

    return sorted.slice(0, count);
  }

  /** Resolve a chunk's stored chat IDs to current message indices. */
  function getChunkMessageIndices(chunk) {
    return chunk.chatIds
      .map((chatId) => (chatId === FIRST_MESSAGE_CHAT_ID ? -1 : messageIndexByChatId.get(chatId)))
      .filter((index) => index !== undefined);
  }

  /** Compute the last summarized current-chat index from stored chat IDs. */
  function getLastSummarizedMsgIndex() {
    return cachedLastSummarizedMsgIndex;
  }

  /**
   * Read pending (unsummarized) messages from chat history on-the-fly.
   * Returns messages whose index is > lastSummarizedMsgIndex.
   * When startIdx === 0, the first message (chat_index -1) is prepended.
   */
  async function getPendingMessages() {
    if (currentCharIndex < 0 || currentChatIndex < 0) return [];

    try {
      const allMessages = await readChatMessagesRaw();

      const startIdx = getLastSummarizedMsgIndex() + 1;

      let pending = [];

      // Prepend first message (chat_index -1) if we're starting from the beginning
      if (startIdx <= 0 && !committedFirstMessage) {
        const firstMsg = await fetchFirstMessage();
        if (firstMsg) pending.push(firstMsg);
      }

      for (const message of allMessages) {
        const index = messageIndexByChatId.get(message.chatId);
        if (index !== undefined && index >= Math.max(0, startIdx)) {
          pending.push({ ...message });
        }
      }

      // Apply regex only to pending subset
      await applyRegexToMessages(pending);

      return pending;
    } catch (e) {
      return [];
    }
  }

  async function loadStateForChat(charId, chatId) {
    const key = getStorageKey(charId, chatId);
    try {
      const saved = await risuai.pluginStorage.getItem(key);
      if (saved) {
        state = saved;
        // Ensure chatRegex field exists for older states
        if (!state.chatRegex) state.chatRegex = [];
        if (!state.lastNodeScores) state.lastNodeScores = {};
        if (!state.lastSelectedNodeIds) state.lastSelectedNodeIds = [];
        // Migrate older state fields and normalize stored node times.
        let migrated = false;
        const needsMessageMigration = state.chunks.some(
          (c) => !Array.isArray(c.chatIds) && Array.isArray(c.msgIndices),
        );
        const currentMessages = needsMessageMigration ? await readChatMessagesRaw() : [];
        for (const c of state.chunks) {
          if (!Array.isArray(c.chatIds) && Array.isArray(c.msgIndices)) {
            c.chatIds = c.msgIndices
              .map((index) =>
                index === -1 ? FIRST_MESSAGE_CHAT_ID : _optionalChain([currentMessages, 'access', _3 => _3[index], 'optionalAccess', _4 => _4.chatId]),
              )
              .filter((chatId) => Boolean(chatId));
            delete c.msgIndices;
            migrated = true;
          }
          if (typeof c.memo !== "string") {
            c.memo = "";
            migrated = true;
          }
          if (c.summarized === (true )) {
            c.summarized = "done";
            migrated = true;
          } else if (c.summarized === (false )) {
            c.summarized = "failed";
            migrated = true;
          }
          for (const node of c.nodes) {
            const normalizedTime = normalizeTimeString(node.time);
            if (normalizedTime !== node.time) {
              node.time = normalizedTime;
              migrated = true;
            }
          }
        }
        if (migrated) {
          await saveStateForChat(charId, chatId);
        }
      } else {
        state = createEmptyState();
      }
    } catch (e) {
      state = createEmptyState();
    }
    recomputeLastSummarizedMsgIndex();
    // Also load chat regex (stored separately)
    await loadChatRegex();
  }

  async function saveStateForChat(charId, chatId) {
    const key = getStorageKey(charId, chatId);
    try {
      await risuai.pluginStorage.setItem(key, state);
    } catch (e) {
      /* ignore */
    }
  }

  async function loadState() {
    // Load global prompt
    try {
      const savedPrompt = await risuai.pluginStorage.getItem(PROMPT_STORAGE_KEY);
      if (savedPrompt) {
        summaryPrompt = savedPrompt;
      }
    } catch (_) {
      /* use default */
    }

    // Load arguments
    const cs = await risuai.getArgument("chunk_size");
    if (cs !== undefined) chunkSize = Number(cs) || DEFAULT_CHUNK_SIZE;

    const mmt = await risuai.getArgument("max_memory_tokens");
    if (mmt !== undefined) maxMemoryTokens = Number(mmt) || DEFAULT_MAX_MEMORY_TOKENS;

    const as = await risuai.getArgument("auto_summarize");
    if (as !== undefined) autoSummarize = as === true || as === "true";

    const eu = await risuai.getArgument("embedding_url");
    if (eu !== undefined && typeof eu === "string") embeddingUrl = eu.trim();

    const em = await risuai.getArgument("embedding_model");
    if (em !== undefined && typeof em === "string") embeddingModel = em.trim();

    const td = await risuai.getArgument("time_decay_days");
    if (td !== undefined) timeDecayDays = Number(td) || 15;

    const tsm = await risuai.getArgument("time_scoring_mode");
    if (tsm === "minute" || tsm === "day" || tsm === "none") timeScoringMode = tsm;

    const tw = await risuai.getArgument("time_weight");
    if (tw !== undefined) timeWeight = Number(tw) || 1.0;

    const sw = await risuai.getArgument("similarity_weight");
    if (sw !== undefined) similarityWeight = Number(sw) || 1.0;

    const eak = await risuai.getArgument("embedding_api_key");
    if (eak !== undefined && typeof eak === "string") embeddingApiKey = eak.trim();

    const ium = await risuai.getArgument("include_user_messages");
    if (ium !== undefined) includeUserMessages = ium === true || ium === "true";

    const ast = await risuai.getArgument("auto_summarize_threshold");
    if (ast !== undefined) autoSummarizeThreshold = Number(ast) || chunkSize;

    const ecm = await risuai.getArgument("embedding_context_messages");
    if (ecm !== undefined) embeddingContextMessages = Number(ecm) || 5;

    const rnc = await risuai.getArgument("recent_node_cache");
    if (rnc !== undefined) recentNodeCache = rnc === true || rnc === "true";

    const rncc = await risuai.getArgument("recent_node_cache_count");
    if (rncc !== undefined) recentNodeCacheCount = Number(rncc) || 10;

    // Load persisted settings (survives plugin updates)
    try {
      const savedSettings = await risuai.pluginStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        if (savedSettings.chunkSize !== undefined) chunkSize = savedSettings.chunkSize;
        if (savedSettings.maxMemoryTokens !== undefined)
          maxMemoryTokens = savedSettings.maxMemoryTokens;
        if (savedSettings.autoSummarize !== undefined) autoSummarize = savedSettings.autoSummarize;
        if (savedSettings.embeddingUrl !== undefined) embeddingUrl = savedSettings.embeddingUrl;
        if (savedSettings.embeddingModel !== undefined)
          embeddingModel = savedSettings.embeddingModel;
        if (savedSettings.timeDecayDays !== undefined) timeDecayDays = savedSettings.timeDecayDays;
        if (
          savedSettings.timeScoringMode === "minute" ||
          savedSettings.timeScoringMode === "day" ||
          savedSettings.timeScoringMode === "none"
        ) {
          timeScoringMode = savedSettings.timeScoringMode;
        }
        if (savedSettings.timeWeight !== undefined) timeWeight = savedSettings.timeWeight;
        if (savedSettings.similarityWeight !== undefined)
          similarityWeight = savedSettings.similarityWeight;
        if (savedSettings.embeddingApiKey !== undefined)
          embeddingApiKey = savedSettings.embeddingApiKey;
        if (savedSettings.includeUserMessages !== undefined)
          includeUserMessages = savedSettings.includeUserMessages;
        if (savedSettings.autoSummarizeThreshold !== undefined)
          autoSummarizeThreshold = savedSettings.autoSummarizeThreshold;
        if (savedSettings.embeddingContextMessages !== undefined)
          embeddingContextMessages = savedSettings.embeddingContextMessages;
        if (savedSettings.recentNodeCache !== undefined)
          recentNodeCache = savedSettings.recentNodeCache;
        if (savedSettings.recentNodeCacheCount !== undefined)
          recentNodeCacheCount = savedSettings.recentNodeCacheCount;
        if (savedSettings.eventFormat !== undefined) eventFormat = savedSettings.eventFormat;
        if (savedSettings.factsFormat !== undefined) factsFormat = savedSettings.factsFormat;
        if (savedSettings.showGuiButton !== undefined) showGuiButton = savedSettings.showGuiButton;
      }
    } catch (_) {
      /* ignore */
    }

    // Detect current chat and load its state (may fail if no chat is open)
    try {
      const { charIndex, chatIndex, charId, chatId, chat } = await detectCurrentChat();
      currentCharIndex = charIndex;
      currentChatIndex = chatIndex;
      currentCharId = charId;
      currentChatId = chatId;
      cacheChatMessages(chat);
      await loadStateForChat(charId, chatId);
    } catch (e) {
      state = createEmptyState();
    }

    // Load active regex preset (global, persists across sessions)
    await loadActiveRegexPreset();
    await loadMemoryCleanupSettings();
    await refreshModuleRegexCache();
  }

  async function saveState() {
    if (currentCharId && currentChatId) {
      await saveStateForChat(currentCharId, currentChatId);
    }
  }

  async function savePrompt() {
    await risuai.pluginStorage.setItem(PROMPT_STORAGE_KEY, summaryPrompt);
  }

  async function saveSettings() {
    await risuai.pluginStorage.setItem(SETTINGS_STORAGE_KEY, {
      chunkSize,
      maxMemoryTokens,
      autoSummarize,
      embeddingUrl,
      embeddingModel,
      timeDecayDays,
      timeScoringMode,
      timeWeight,
      similarityWeight,
      embeddingApiKey,
      includeUserMessages,
      autoSummarizeThreshold,
      embeddingContextMessages,
      recentNodeCache,
      recentNodeCacheCount,
      eventFormat,
      factsFormat,
      showGuiButton,
    });
  }

  // ── Presets ──────────────────────────────────────────────────────────────

  async function loadPresets() {
    try {
      const saved = await risuai.pluginStorage.getItem(PRESETS_STORAGE_KEY);
      if (saved && Array.isArray(saved)) return saved;
    } catch (_) {
      /* ignore */
    }
    return [];
  }

  async function savePresets(presets) {
    await risuai.pluginStorage.setItem(PRESETS_STORAGE_KEY, presets);
  }

  function currentSettingsAsPreset() {
    return {
      name: "",
      summaryPrompt,
      chunkSize,
      includeUserMessages,
      embeddingContextMessages,
      eventFormat,
      factsFormat,
    };
  }

  function applyPreset(p) {
    summaryPrompt = p.summaryPrompt;
    chunkSize = p.chunkSize;
    includeUserMessages = p.includeUserMessages;
    embeddingContextMessages = p.embeddingContextMessages;
    if (p.eventFormat !== undefined) eventFormat = p.eventFormat;
    if (p.factsFormat !== undefined) factsFormat = p.factsFormat;
  }

  function parseRisuPreset(json) {
    try {
      const data = JSON.parse(json);
      if (_optionalChain([data, 'optionalAccess', _5 => _5.type]) !== "risu" || !_optionalChain([data, 'optionalAccess', _6 => _6.data, 'optionalAccess', _7 => _7.settings])) return null;
      const s = data.data.settings;
      return {
        name: data.data.name || "Imported Preset",
        summaryPrompt: s.summarizationPrompt || "",
        chunkSize: s.maxChatsPerSummary || DEFAULT_CHUNK_SIZE,
        includeUserMessages: !s.doNotSummarizeUserMessage,
        embeddingContextMessages: s.queryChatCount || 5,
        eventFormat: DEFAULT_EVENT_FORMAT,
        factsFormat: DEFAULT_FACTS_FORMAT,
      };
    } catch (_) {
      return null;
    }
  }

  // ── Regex Presets (global) ───────────────────────────────────────────────

  async function loadRegexPresets() {
    try {
      const saved = await risuai.pluginStorage.getItem(REGEX_PRESETS_STORAGE_KEY);
      if (saved && Array.isArray(saved)) return saved;
    } catch (_) {
      /* ignore */
    }
    return [];
  }

  async function saveRegexPresets(presets) {
    await risuai.pluginStorage.setItem(REGEX_PRESETS_STORAGE_KEY, presets);
  }

  function parseRegexFile(json) {
    try {
      const data = JSON.parse(json);
      if (_optionalChain([data, 'optionalAccess', _8 => _8.type]) !== "regex" || !Array.isArray(_optionalChain([data, 'optionalAccess', _9 => _9.data]))) return null;
      // Only keep "editprocess" type entries
      return data.data
        .filter((e) => e.type === "editprocess")
        .map(
          (e) => ({
            comment: e.comment || "",
            in: e.in || "",
            out: e.out || "",
            type: e.type || "editprocess",
            ableFlag: _nullishCoalesce(e.ableFlag, () => ( true)),
            flag: typeof e.flag === "string" && e.flag ? e.flag : "g",
          }),
        );
    } catch (_) {
      return null;
    }
  }

  // ── Chat Regex (per-chat) ────────────────────────────────────────────────

  function getChatRegexStorageKey(charId, chatId) {
    return `hypaplus_chat_regex_${charId}_${chatId}`;
  }

  async function loadChatRegex() {
    if (!currentCharId || !currentChatId) return;
    const key = getChatRegexStorageKey(currentCharId, currentChatId);
    try {
      const saved = await risuai.pluginStorage.getItem(key);
      if (saved && Array.isArray(saved)) {
        state.chatRegex = saved;
      } else {
        state.chatRegex = [];
      }
    } catch (_) {
      state.chatRegex = [];
    }
  }

  async function saveChatRegex() {
    if (!currentCharId || !currentChatId) return;
    const key = getChatRegexStorageKey(currentCharId, currentChatId);
    await risuai.pluginStorage.setItem(key, state.chatRegex);
  }

  // ── Module Regex (read-only, fetched on-the-fly) ─────────────────────────

  async function fetchModuleRegex() {
    try {
      const db = await risuai.getDatabase(["modules"]);
      if (!db || !db.modules) return [];

      // Get chat-specific enabled modules (falls back to global enabledModules)
      let enabledIds = [];
      try {
        const chat = await risuai.getChatFromIndex(currentCharIndex, currentChatIndex);
        if (_optionalChain([chat, 'optionalAccess', _10 => _10.modules]) && Array.isArray(chat.modules)) {
          enabledIds = chat.modules;
        }
      } catch (_) {
        /* ignore */
      }
      // Fallback to global enabledModules if chat.modules is empty
      if (enabledIds.length === 0) {
        try {
          const db2 = await risuai.getDatabase(["enabledModules"]);
          if (_optionalChain([db2, 'optionalAccess', _11 => _11.enabledModules])) enabledIds = db2.enabledModules;
        } catch (_) {
          /* ignore */
        }
      }

      const enabledSet = new Set(enabledIds);
      const allEntries = [];
      for (const mod of db.modules) {
        if (!enabledSet.has(mod.id)) continue;
        if (mod.regex && Array.isArray(mod.regex)) {
          for (const entry of mod.regex) {
            if (entry.type === "editprocess") {
              allEntries.push({
                comment: entry.comment || "",
                in: entry.in || "",
                out: entry.out || "",
                type: entry.type || "editprocess",
                ableFlag: _nullishCoalesce(entry.ableFlag, () => ( true)),
                flag: entry.flag || "g",
              });
            }
          }
        }
      }
      return allEntries;
    } catch (_) {
      return [];
    }
  }

  // ── Backup / Restore ────────────────────────────────────────────────────

  



  /**
   * Export current chat's chunks (which contain nodes) as a JSON backup file download.
   * Nodes are stored only inside chunks — no duplication.
   */
  async function downloadBackup() {
    // Resolve char/chat names
    let charName = `char_${currentCharIndex}`;
    let chatName = `chat_${currentChatIndex}`;
    try {
      const char = await risuai.getCharacterFromIndex(currentCharIndex);
      if (char && char.name) charName = char.name;
    } catch (_) {
      /* fallback to index */
    }
    try {
      const chat = await risuai.getChatFromIndex(currentCharIndex, currentChatIndex);
      if (chat && chat.name) chatName = chat.name;
    } catch (_) {
      /* fallback to index */
    }

    const exportedAt = new Date().toISOString();
    const backup = {
      chunks: state.chunks,
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Sanitize names for filename (replace problematic chars)
    const safeCharName = charName.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
    const safeChatName = chatName.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
    const safeDate = exportedAt.replace(/[:.]/g, "-");

    const a = document.createElement("a");
    a.href = url;
    a.download = `hypaplus_backup_${safeCharName}_${safeChatName}_${safeDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Parse and validate a backup JSON file.
   * Supports both new format (chunks-only) and legacy format (nodes + chunks).
   */
  function parseBackupFile(json) {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data.chunks)) {
        return null;
      }
      // Validate chunk structure
      for (const c of data.chunks) {
        if (
          !c.id ||
          !Array.isArray(c.nodes) ||
          (!Array.isArray(c.chatIds) && !Array.isArray(c.msgIndices))
        )
          return null;
        if (typeof c.memo !== "string") c.memo = "";
        // Validate nodes inside each chunk
        for (const n of c.nodes) {
          if (!n.id || !n.type || !n.content) return null;
          n.time = normalizeTimeString(n.time || "");
        }
      }
      return data ;
    } catch (_) {
      return null;
    }
  }

  /**
   * Restore state from a backup JSON file.
   * Replaces chunks (and their contained nodes).
   */
  async function restoreFromBackup(backup) {
    // Replace chunks (nodes are inside chunks — no separate nodes array)
    state.chunks = backup.chunks;
    const currentMessages = await readChatMessagesRaw();
    for (const chunk of state.chunks) {
      if (!Array.isArray(chunk.chatIds) && Array.isArray(chunk.msgIndices)) {
        chunk.chatIds = chunk.msgIndices
          .map((index) => (index === -1 ? FIRST_MESSAGE_CHAT_ID : _optionalChain([currentMessages, 'access', _12 => _12[index], 'optionalAccess', _13 => _13.chatId])))
          .filter((chatId) => Boolean(chatId));
        delete chunk.msgIndices;
      }
    }
    // Clear retrieval cache
    state.lastNodeScores = {};
    state.lastSelectedNodeIds = [];
    recomputeLastSummarizedMsgIndex();

    await saveState();
  }

  /**
   * Build embedding query from recent N chat messages.
   * Always includes the last message regardless of role.
   */
  async function buildEmbeddingQuery() {
    if (currentCharIndex < 0 || currentChatIndex < 0) return "";
    try {
      const allMessages = await readChatMessagesRaw();
      if (allMessages.length === 0) return "";

      // Always include the last message
      const lastMsg = allMessages[allMessages.length - 1];
      // Take up to N-1 more recent messages before the last one
      const startIdx = Math.max(0, allMessages.length - embeddingContextMessages);
      const contextMsgs = allMessages.slice(startIdx, allMessages.length - 1);

      // Apply regex only to the subset we need
      const subset = [...contextMsgs, lastMsg].map((message) => ({ ...message }));
      await applyRegexToMessages(subset);

      const parts = subset.map((m) => m.content);
      return parts.join("\n");
    } catch (e) {
      return "";
    }
  }

  // ── Summarization ────────────────────────────────────────────────────────

  /**
   * Turn a ChatML prompt into the OpenAI-style messages expected by runLLMModel.
   *
   * Summary prompts may be authored as a multi-turn ChatML conversation. Sending
   * that entire string as one user message makes the ChatML markers literal text
   * instead of conversation roles, so only parse when the complete prompt is
   * made of valid ChatML blocks. Plain-text/custom prompts remain unchanged.
   */
  function parseChatMLPrompt(prompt) {
    const blocks = [];
    const blockPattern = /<\|im_start\|>\s*([^\r\n]+)\r?\n([\s\S]*?)<\|im_end\|>/g;
    let cursor = 0;
    let match;

    while ((match = blockPattern.exec(prompt)) !== null) {
      // Any non-whitespace text between blocks means this is not a pure ChatML prompt.
      if (prompt.slice(cursor, match.index).trim() !== "") return null;
      const role = match[1].trim().split(/\s+/, 1)[0].toLowerCase();
      if (role !== "system" && role !== "user" && role !== "assistant") return null;
      blocks.push({ role, content: match[2] });
      cursor = blockPattern.lastIndex;
    }

    if (blocks.length === 0 || prompt.slice(cursor).trim() !== "") return null;
    return blocks;
  }

  async function summarizeChunk(messages, promptTemplate = summaryPrompt) {
    if (messages.length === 0) return { status: "needs_review", reason: "요약할 입력이 없습니다." };
    const messagesText = messages.map(m => m.content).join("\n\n");
    const prompt = promptTemplate.replace("{{slot}}", () => messagesText);
    const promptMessages = parseChatMLPrompt(prompt) || [{ role: "user", content: prompt }];
    let timeout;
    try {
      const result = await Promise.race([
        risuai.runLLMModel({ messages: promptMessages, mode: "memory", allowPlugins: true }),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error("summary-timeout")), 300000);
        }),
      ]);
      // V3 returns a typed result. Do not parse failed/error/streaming objects
      // as records, even if an error happens to contain valid-looking XML.
      if (typeof result !== "string" && (!result || result.type !== "success")) {
        return { status: "failed", reason: "요약 API가 성공 결과를 반환하지 않았습니다." };
      }
      const rawOutput = typeof result === "string" ? result : (result.result ?? result.content);
      if (typeof rawOutput !== "string") {
        return { status: "needs_review", reason: "요약 응답이 문자열 형식이 아닙니다." };
      }
      const cleaned = rawOutput.replace(/<Thoughts>[\s\S]*?<\/Thoughts>/gi, "").trim();
      const nodes = parseNodesFromSummary(cleaned).filter(node => node.content.trim());
      if (!nodes.length) {
        return { status: "needs_review", reason: "유효한 기억을 읽지 못했습니다. 원문은 계속 유지됩니다." };
      }
      return { status: "done", nodes };
    } catch (error) {
      return { status: "failed", reason: error?.message === "summary-timeout"
        ? "요약 응답 대기 시간이 초과되었습니다." : "요약 API 호출 중 오류가 발생했습니다." };
    } finally {
      clearTimeout(timeout);
    }
  }

  function summaryContext() {
    return { state, charId: currentCharId, chatId: currentChatId,
      charIndex: currentCharIndex, chatIndex: currentChatIndex, prompt: summaryPrompt };
  }

  function isSummaryContextCurrent(context) {
    return state === context.state && currentCharId === context.charId &&
      currentChatId === context.chatId && currentCharIndex === context.charIndex &&
      currentChatIndex === context.chatIndex;
  }

  // Fetch a chunk's exact input and its complete source window independently.
  // Legacy assistant-only chunks infer just the intervening user messages.
  async function readChunkSources(chunk) {
    const all = await readChatMessagesRaw(true);
    const byId = new Map(all.map(m => [m.chatId, m]));
    const ids = getChunkCoverageIds(chunk);
    if (ids.includes(FIRST_MESSAGE_CHAT_ID) || chunk.chatIds.includes(FIRST_MESSAGE_CHAT_ID)) {
      const first = await fetchFirstMessage();
      if (first) byId.set(FIRST_MESSAGE_CHAT_ID, { ...first, chatId: FIRST_MESSAGE_CHAT_ID });
    }
    if (!ids.length || ids.some(id => !byId.has(id)) || chunk.chatIds.some(id => !byId.has(id))) return null;
    const input = chunk.chatIds.map(id => ({ ...byId.get(id) }));
    let window;
    if (Array.isArray(chunk.sourceWindowIds)) {
      window = chunk.sourceWindowIds.map(id => ({ ...byId.get(id) }));
    } else {
      const positions = ids.map(id => all.findIndex(m => m.chatId === id)).filter(i => i >= 0);
      window = [];
      if (ids.includes(FIRST_MESSAGE_CHAT_ID)) window.push({ ...byId.get(FIRST_MESSAGE_CHAT_ID) });
      if (positions.length) {
        let start = Math.min(...positions);
        if (input.every(m => m.role !== "user")) {
          while (start > 0 && all[start - 1].role === "user") start--;
        }
        window.push(...all.slice(start, Math.max(...positions) + 1).map(m => ({ ...m })));
      }
    }
    return { input, window };
  }

  async function sourceWindowStillMatches(context, window) {
    if (!isSummaryContextCurrent(context)) return false;
    const chat = await risuai.getChatFromIndex(context.charIndex, context.chatIndex);
    if (!isSummaryContextCurrent(context) || chat?.id !== context.chatId) return false;
    cacheChatMessages(chat);
    const fresh = (chat.message || []).filter(m => m.data && m.chatId)
      .map(m => ({ chatId: String(m.chatId), role: String(m.role).toLowerCase(), content: String(m.data) }));
    const expected = window.filter(m => m.chatId !== FIRST_MESSAGE_CHAT_ID);
    if (expected.length) {
      const start = fresh.findIndex(m => m.chatId === expected[0].chatId);
      const actual = fresh.slice(start, start + expected.length);
      if (start < 0 || actual.length !== expected.length || actual.some((m, i) =>
        m.chatId !== expected[i].chatId || m.role !== expected[i].role || m.content !== expected[i].content)) return false;
    }
    const greeting = window.find(m => m.chatId === FIRST_MESSAGE_CHAT_ID);
    if (greeting) {
      const current = await fetchFirstMessage();
      if (!isSummaryContextCurrent(context) || !current || current.content !== greeting.content) return false;
    }
    return true;
  }

  async function persistSummaryState(context) {
    if (!isSummaryContextCurrent(context)) return false;
    // Unlike routine UI saves, a summary commit must surface storage failure.
    await risuai.pluginStorage.setItem(getStorageKey(context.charId, context.chatId), context.state);
    return isSummaryContextCurrent(context);
  }

  async function executeSummary(chunk, sources, context) {
    const previous = { ...chunk };
    const keepPrevious = hasCommittedSummary(chunk);
    const attempt = { status: "pending", at: Date.now(), reason: "" };
    chunk.lastSummaryAttempt = attempt;
    if (!keepPrevious) chunk.summarized = "pending";
    recomputeLastSummarizedMsgIndex();
    try {
      if (!await persistSummaryState(context)) return false;
      const prepared = await prepareMemoryMessages(sources.input);
      if (!isSummaryContextCurrent(context) || !state.chunks.includes(chunk)) return false;
      const result = await summarizeChunk(prepared.messages, context.prompt);
      if (!isSummaryContextCurrent(context) || !state.chunks.includes(chunk)) return false;
      // Re-read only once after the model returns. New appended turns are fine;
      // edits, insertions or deletion within the summarized window are not.
      if (!await sourceWindowStillMatches(context, sources.window)) {
        result.status = "needs_review";
        result.reason = "처리 중 원문이 바뀌었습니다. 현재 원문을 확인한 뒤 다시 시도하세요.";
      }
      if (!isSummaryContextCurrent(context) || !state.chunks.includes(chunk)) return false;
      if (result.status === "done") {
        // IDs are assigned against the destination state at commit time.
        let id = Number(nextNodeId());
        chunk.nodes = result.nodes.map(node => ({ ...node, id: String(id++) }));
        chunk.summarized = "done";
        chunk.emptyAccepted = false;
        chunk.sourceWindowIds = sources.window.map(m => m.chatId);
        chunk.summaryCommittedAt = Date.now();
        state.lastNodeScores = {};
        state.lastSelectedNodeIds = [];
      } else if (!keepPrevious) {
        chunk.summarized = result.status;
      }
      chunk.lastSummaryAttempt = { status: result.status, at: Date.now(), reason: result.reason || "" };
      // Publish the frontier only after durable storage succeeds.
      if (!await persistSummaryState(context)) return false;
      recomputeLastSummarizedMsgIndex();
      return result.status === "done";
    } catch (_) {
      if (isSummaryContextCurrent(context) && state.chunks.includes(chunk)) {
        restoreChunkSnapshot(chunk, previous);
        if (!keepPrevious) chunk.summarized = "failed";
        chunk.lastSummaryAttempt = { status: "failed", at: Date.now(), reason: "요약 처리 또는 상태 저장에 실패했습니다. 원문과 이전 기억을 유지합니다." };
        recomputeLastSummarizedMsgIndex();
        try { await persistSummaryState(context); } catch (_) { /* retain safe in-memory state */ }
      }
      return false;
    }
  }

  async function summarizeExistingChunk(chunk, context) {
    const sources = await readChunkSources(chunk);
    if (!isSummaryContextCurrent(context) || !state.chunks.includes(chunk)) return false;
    if (!sources) {
      chunk.lastSummaryAttempt = { status: "needs_review", at: Date.now(), reason: "연결된 원문의 일부를 찾을 수 없습니다. 기존 기억을 보존합니다." };
      if (!hasCommittedSummary(chunk)) chunk.summarized = "needs_review";
      recomputeLastSummarizedMsgIndex();
      await persistSummaryState(context);
      return false;
    }
    return executeSummary(chunk, sources, context);
  }

  function restoreChunkSnapshot(chunk, previous) {
    for (const key of Object.keys(chunk)) {
      if (!(key in previous)) delete chunk[key];
    }
    Object.assign(chunk, previous);
  }

  async function runSummarization(count, options = {}) {
    if (isSummarizing) return false;
    isSummarizing = true;
    const context = summaryContext();
    try {
      const take = Math.max(1, Math.floor(count ?? chunkSize));
      const all = await readChatMessagesRaw(true);
      if (!isSummaryContextCurrent(context)) return false;
      const startIdx = getLastSummarizedMsgIndex() + 1;
      const candidates = [];
      if (startIdx <= 0 && !committedFirstMessage) {
        const first = await fetchFirstMessage();
        if (first) candidates.push({ ...first, chatId: FIRST_MESSAGE_CHAT_ID });
      }
      candidates.push(...all.filter(m => messageIndexByChatId.get(m.chatId) >= Math.max(0, startIdx)));
      const firstPending = candidates.find(m => !committedMessageIds.has(m.chatId));
      if (!firstPending || !isSummaryContextCurrent(context)) return false;
      const unresolvedChunks = state.chunks.filter(c => c.id !== "0" && !hasCommittedSummary(c));
      const nextNonUser = candidates.slice(candidates.indexOf(firstPending)).find(m => m.role !== "user");
      const unresolved = unresolvedChunks.find(c => getChunkCoverageIds(c).includes(firstPending.chatId) ||
        (firstPending.role === "user" && !Array.isArray(c.sourceWindowIds) && nextNonUser && c.chatIds.includes(nextNonUser.chatId)));
      // Automatic processing never retries a failed/interrupted window on every
      // request. A manual retry reuses the existing chunk and its original input.
      if (unresolved) return options.automatic ? false : await summarizeExistingChunk(unresolved, context);
      const window = [];
      let boundedGap = false;
      for (const message of candidates) {
        if (window.length && unresolvedChunks.some(c => getChunkCoverageIds(c).includes(message.chatId))) {
          boundedGap = true;
          break;
        }
        if (committedMessageIds.has(message.chatId)) {
          if (window.length) { boundedGap = true; break; }
          continue;
        }
        if (window.length >= take) break;
        window.push({ ...message });
      }
      // A repaired hole may be smaller than chunkSize. Stop at existing valid
      // coverage instead of summarizing already remembered messages again.
      if (!window.length || (window.length < take && !boundedGap)) return false;
      const input = (includeUserMessages ? window : window.filter(m => m.role !== "user"))
        .map(m => ({ ...m }));
      const chunk = { id: nextChunkId(), messageCount: input.length, nodes: [], memo: "",
        summarized: "pending", createdAt: Date.now(), chatIds: input.map(m => m.chatId),
        sourceWindowIds: window.map(m => m.chatId), chatIndex: context.chatIndex };
      state.chunks.push(chunk);
      return await executeSummary(chunk, { input, window }, context);
    } finally {
      isSummarizing = false;
    }
  }

  async function reSummarizeChunk(chunkId) {
    if (isSummarizing) return false;
    const chunk = state.chunks.find(c => c.id === chunkId && c.id !== "0");
    if (!chunk) return false;
    isSummarizing = true;
    try {
      return await summarizeExistingChunk(chunk, summaryContext());
    } finally {
      isSummarizing = false;
    }
  }

  async function acceptEmptyChunk(chunkId) {
    if (isSummarizing) return false;
    const chunk = state.chunks.find(c => c.id === chunkId && c.id !== "0");
    if (!chunk || chunk.nodes.length) return false;
    isSummarizing = true;
    try {
      const context = summaryContext();
      const sources = await readChunkSources(chunk);
      if (!sources || !isSummaryContextCurrent(context) || !state.chunks.includes(chunk)) return false;
      const previous = { ...chunk };
      chunk.sourceWindowIds = sources.window.map(m => m.chatId);
      chunk.emptyAccepted = true;
      chunk.summarized = "done";
      chunk.lastSummaryAttempt = { status: "done", at: Date.now(), reason: "사용자가 기억 없이 완료하도록 확인했습니다." };
      try { if (!await persistSummaryState(context)) return false; }
      catch (_) { restoreChunkSnapshot(chunk, previous); return false; }
      recomputeLastSummarizedMsgIndex();
      return true;
    } finally {
      isSummarizing = false;
    }
  }


  // ── Memory Retrieval ─────────────────────────────────────────────────────

  function buildNodeText(node) {
    return [
      node.content,
      _nullishCoalesce(node.location, () => ( "")),
      node.characters.join(" "),
      ...(_nullishCoalesce(_optionalChain([node, 'access', _16 => _16.dialogues, 'optionalAccess', _17 => _17.map, 'call', _18 => _18((d) => d.text)]), () => ( []))),
    ].join(" ");
  }

  /**
   * The same text can only reuse a vector when it was created by the currently
   * configured embedding endpoint and model. API keys are deliberately excluded.
   */
  function getEmbeddingConfig() {
    return `${embeddingUrl}\u0000${embeddingModel}`;
  }

  function clearNodeEmbedding(node) {
    delete node.embedding;
    delete node.embeddingConfig;
  }

  function computeTimeScore(node, lastTime) {
    if (timeScoringMode === "none") return 0;
    if (!lastTime) return 0.5;

    const nodeDate = parseTimeString(node.time);
    const refDate = parseTimeString(lastTime);

    if (!nodeDate || !refDate) return 0.5;

    if (timeScoringMode === "day") {
      nodeDate.setHours(0, 0, 0, 0);
      refDate.setHours(0, 0, 0, 0);
    }

    const diffDays = Math.abs(nodeDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);

    // 1 / sqrt(1 + (t / T)) decay with configurable half-life in days
    return 1.0 / Math.sqrt(1.0 + diffDays / timeDecayDays);
  }

  function parseTimeString(ts) {
    const normalized = normalizeTimeString(ts);

    const parsePart = (value, base) => {
      // Try YYYY-MM-DD HH:mm
      let m = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
      if (m) {
        const date = new Date(0, +m[2] - 1, +m[3], +m[4], +m[5]);
        date.setFullYear(+m[1]);
        if (
          date.getFullYear() === +m[1] &&
          date.getMonth() === +m[2] - 1 &&
          date.getDate() === +m[3] &&
          date.getHours() === +m[4] &&
          date.getMinutes() === +m[5]
        ) {
          return date;
        }
        return null;
      }

      // Try MM-DD HH:mm (use the range start's year when available)
      m = value.match(/^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
      if (m) {
        const year = _nullishCoalesce(_optionalChain([base, 'optionalAccess', _19 => _19.getFullYear, 'call', _20 => _20()]), () => ( new Date().getFullYear()));
        const date = new Date(year, +m[1] - 1, +m[2], +m[3], +m[4]);
        if (
          date.getMonth() === +m[1] - 1 &&
          date.getDate() === +m[2] &&
          date.getHours() === +m[3] &&
          date.getMinutes() === +m[4]
        ) {
          return date;
        }
        return null;
      }

      // A time-only range end inherits the start's date.
      m = value.match(/^(\d{2}):(\d{2})$/);
      if (m && base) {
        const date = new Date(base);
        date.setHours(+m[1], +m[2], 0, 0);
        if (date.getHours() === +m[1] && date.getMinutes() === +m[2]) return date;
      }

      return null;
    };

    const rangeParts = normalized.split(/\s*(?:→|->)\s*/);
    if (rangeParts.length === 2) {
      const start = parsePart(rangeParts[0]);
      if (!start) return null;
      return parsePart(rangeParts[1], start);
    }

    return parsePart(normalized);
  }

  function compareNodesByTime(a, b) {
    const aTime = _nullishCoalesce(_optionalChain([parseTimeString, 'call', _21 => _21(a.time), 'optionalAccess', _22 => _22.getTime, 'call', _23 => _23()]), () => ( a.createdAt));
    const bTime = _nullishCoalesce(_optionalChain([parseTimeString, 'call', _24 => _24(b.time), 'optionalAccess', _25 => _25.getTime, 'call', _26 => _26()]), () => ( b.createdAt));
    return (
      aTime - bTime ||
      a.createdAt - b.createdAt ||
      a.id.localeCompare(b.id, undefined, {
        numeric: true,
      })
    );
  }

  async function retrieveRelevantNodes(
    query,
    lastTime,
    tokenBudget,
  ) {
    const allNodes = getNodes();
    if (allNodes.length === 0) return [];

    // If recent node cache is enabled, exclude those nodes from retrieval
    // (they will be injected separately via [HypaPlus.cached])
    let excludedIds = new Set();
    if (recentNodeCache && recentNodeCacheCount > 0) {
      const recentNodes = getRecentNodes(recentNodeCacheCount);
      for (const n of recentNodes) {
        excludedIds.add(n.id);
      }
    }

    // Separate favorites — they always get included regardless of score
    const favorites = allNodes.filter((n) => n.favorite && !excludedIds.has(n.id));
    const nonFavorites = allNodes.filter((n) => !n.favorite && !excludedIds.has(n.id));

    // Compute similarity scores with batched embeddings if configured
    const similarityScores = new Map();
    if (embeddingUrl && nonFavorites.length > 0) {
      // Step 1: Get query embedding alone first
      const queryEmbResult = await getBatchEmbeddings([query]);
      const queryEmb = queryEmbResult[0];

      if (queryEmb) {
        // Step 2: Reuse persistent node vectors. Only nodes without a valid
        // cached vector are sent to the embedding API.
        const embeddingConfig = getEmbeddingConfig();
        const missingNodeIndices = [];
        for (let i = 0; i < nonFavorites.length; i++) {
          const node = nonFavorites[i];
          if (
            Array.isArray(node.embedding) &&
            node.embedding.length > 0 &&
            node.embeddingConfig === embeddingConfig
          ) {
            similarityScores.set(node.id, cosineSimilarity(queryEmb, node.embedding));
          } else {
            missingNodeIndices.push(i);
          }
        }

        // Split only missing node texts into token-limited batches.
        const nodeTexts = missingNodeIndices.map((index) => buildNodeText(nonFavorites[index]));

        // Split nodeTexts into batches where total tokens ≤ EMBEDDING_BATCH_TOKEN_LIMIT
        const batches = [];
        let currentBatchTexts = [];
        let currentBatchIndices = [];
        let currentBatchTokens = 0;

        for (let i = 0; i < nodeTexts.length; i++) {
          const textTokens = await countTokens(nodeTexts[i]);

          // If adding this text would exceed the limit and we already have items, flush the batch
          if (
            currentBatchTexts.length > 0 &&
            currentBatchTokens + textTokens > EMBEDDING_BATCH_TOKEN_LIMIT
          ) {
            batches.push({ texts: currentBatchTexts, indices: currentBatchIndices });
            currentBatchTexts = [];
            currentBatchIndices = [];
            currentBatchTokens = 0;
          }

          currentBatchTexts.push(nodeTexts[i]);
          currentBatchIndices.push(missingNodeIndices[i]);
          currentBatchTokens += textTokens;
        }
        // Flush the last batch
        if (currentBatchTexts.length > 0) {
          batches.push({ texts: currentBatchTexts, indices: currentBatchIndices });
        }

        // Step 3: Send missing vectors, persist successful responses, and score.
        let cacheUpdated = false;
        for (const batch of batches) {
          console.log(
            "[HypaPlus] retrieveRelevantNodes — sending node embedding batch:",
            batch.texts.length,
            "node(s)",
          );
          const batchEmbeddings = await getBatchEmbeddings(batch.texts);
          for (let j = 0; j < batch.indices.length; j++) {
            const nodeIdx = batch.indices[j];
            const nodeEmb = batchEmbeddings[j];
            if (nodeEmb) {
              const node = nonFavorites[nodeIdx];
              node.embedding = nodeEmb;
              node.embeddingConfig = embeddingConfig;
              similarityScores.set(node.id, cosineSimilarity(queryEmb, nodeEmb));
              cacheUpdated = true;
            }
          }
        }
        if (cacheUpdated) await saveState();
      }
    }

    // Score each non-favorite node
    const scored = [];
    for (const node of nonFavorites) {
      const similarityScore = _nullishCoalesce(similarityScores.get(node.id), () => ( 0.5));
      const timeScore = computeTimeScore(node, lastTime);
      const timeFactor = timeScoringMode === "none" ? 1 : Math.pow(1.0 - timeScore, timeWeight);
      const combinedScore = 1.0 - timeFactor * Math.pow(1.0 - similarityScore, similarityWeight);
      scored.push({ node, similarity: similarityScore, time: timeScore, combined: combinedScore });
    }

    // Store scores for display
    const nodeScores = new Map();
    const selectedNodeIds = new Set();
    for (const s of scored) {
      nodeScores.set(s.node.id, {
        similarity: s.similarity,
        time: s.time,
        combined: s.combined,
      });
    }
    // Favorites get max score for display
    for (const f of favorites) {
      nodeScores.set(f.id, { similarity: 1.0, time: 1.0, combined: 1.0 });
    }

    // Sort non-favorites by score descending
    scored.sort((a, b) => b.combined - a.combined);

    // Select nodes within token budget — favorites first
    const selected = [];
    let usedTokens = 0;

    // Add favorites first (sorted by time)
    const sortedFavorites = [...favorites].sort(compareNodesByTime);
    for (const node of sortedFavorites) {
      const nodeText = formatNodeForContext(node);
      const nodeTokens = await countTokens(nodeText);
      if (usedTokens + nodeTokens > tokenBudget) continue;
      selected.push(node);
      usedTokens += nodeTokens;
    }

    // Then fill remaining budget with scored non-favorites
    for (const { node, combined } of scored) {
      if (combined < 0.05) continue;

      const nodeText = formatNodeForContext(node);
      const nodeTokens = await countTokens(nodeText);

      if (usedTokens + nodeTokens > tokenBudget) continue;

      selected.push(node);
      usedTokens += nodeTokens;
    }

    // Track which nodes were selected
    for (const n of selected) {
      selectedNodeIds.add(n.id);
    }

    // Sort selected by time for chronological context
    selected.sort(compareNodesByTime);

    // Persist scores to state so they survive GUI close/reopen
    state.lastNodeScores = {};
    for (const [id, s] of nodeScores) {
      state.lastNodeScores[id] = s;
    }
    state.lastSelectedNodeIds = [...selectedNodeIds];

    return selected;
  }

  function formatNodeForContext(node) {
    const dialoguesText =
      node.dialogues && node.dialogues.length > 0
        ? node.dialogues.map((d) => `${d.speaker}: "${d.text}"`).join("\n")
        : "";

    const template = node.type === "event" ? eventFormat : factsFormat;

    return (
      template
        .replace(/\[\[time\]\]/g, node.time)
        .replace(/\[\[location\]\]/g, _nullishCoalesce(node.location, () => ( "")))
        .replace(/\[\[characters\]\]/g, node.characters.join(", "))
        .replace(/\[\[content\]\]/g, node.content)
        .replace(/\[\[dialogues\]\]/g, dialoguesText)
        // Clean up: collapse " |  | " → " | "
        .replace(/\s*\|\s+\|\s*/g, " | ")
        // Clean up: remove " | " at start of line (after leading text like "[기억: ")
        .replace(/^(\[.*?)\s*\|\s*\]/gm, "$1]")
        // Clean up: remove trailing " | " before newline
        .replace(/\s*\|\s*\n/g, "\n")
        // Clean up: remove empty lines that only have separators
        .replace(/^[ |\t]+$/gm, "")
        // Clean up: collapse 3+ newlines to 2
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }

  async function buildMemoryContext(userInput) {
    // Build query from recent chat messages for embedding
    const embeddingQuery = await buildEmbeddingQuery();
    const query = embeddingQuery || userInput;
    console.log(
      "[HypaPlus] buildMemoryContext — embeddingQuery length:",
      embeddingQuery.length,
      "| userInput length:",
      userInput.length,
      "| final query length:",
      query.length,
    );

    // Use the latest node's time as reference for time decay
    const refTime = getLatestNodeTime();
    console.log("[HypaPlus] buildMemoryContext — refTime:", refTime || "(null)");
    const nodes = await retrieveRelevantNodes(query, refTime, maxMemoryTokens);
    console.log(
      "[HypaPlus] buildMemoryContext — retrieved nodes:",
      nodes.length,
      "| maxMemoryTokens:",
      maxMemoryTokens,
    );

    if (nodes.length === 0) {
      console.log("[HypaPlus] buildMemoryContext — returning EMPTY string (no nodes retrieved)");
      return "";
    }

    const result = nodes.map((n) => formatNodeForContext(n)).join("\n");
    console.log("[HypaPlus] buildMemoryContext — result length:", result.length);
    return result;
  }

  // ── Message Tracking ─────────────────────────────────────────────────────

  async function trackUserMessage(content) {
    // Time tracking is derived from getLatestNodeTime() — no explicit storage needed

    // Check if we should auto-summarize — keep summarizing until pending < threshold
    if (autoSummarize) {
      while (true) {
        const pending = await getPendingMessages();
        if (pending.length < autoSummarizeThreshold) break;
        const prevCount = pending.length;
        if (!await runSummarization(undefined, { automatic: true })) break;
        // If summarization didn't reduce pending count (e.g. not enough for a full chunk), stop
        const after = await getPendingMessages();
        if (after.length >= prevCount) break;
      }
    }
  }

  async function trackAssistantMessage(content) {
    await saveState();

    if (autoSummarize) {
      while (true) {
        const pending = await getPendingMessages();
        if (pending.length < autoSummarizeThreshold) break;
        const prevCount = pending.length;
        if (!await runSummarization(undefined, { automatic: true })) break;
        // If summarization didn't reduce pending count (e.g. not enough for a full chunk), stop
        const after = await getPendingMessages();
        if (after.length >= prevCount) break;
      }
    }
  }

  // ── Replacers ────────────────────────────────────────────────────────────

  // beforeRequest: inject memory context + track user messages
  async function beforeRequestHandler(messages, type) {
    // A normal request reaches beforeRequest after every serial process call.
    // Close the latch here, but keep its chat snapshot available to the rest of
    // this request (pending-message checks and the embedding query).
    const hadPreparedProcessBatch = processBatchPrepared;
    processBatchPrepared = false;
    lastProcessCallAt = 0;

    console.log(
      "[HypaPlus] beforeRequest called — type:",
      type,
      "| messages:",
      messages.length,
      "| currentCharId:",
      currentCharId || "(none)",
      "| isSummarizing:",
      isSummarizing,
    );

    // Only process main chat requests — skip auxiliary model calls (memory, emotion, translate, etc.)
    if (type !== "main" && type !== "model") {
      console.log("[HypaPlus] beforeRequest SKIP — type not main/model:", type);
      return messages;
    }

    // Guard against re-entry during summarization
    if (isSummarizing) {
      console.log("[HypaPlus] beforeRequest SKIP — isSummarizing is true");
      return messages;
    }

    try {
      // Always resolve the current chat before using state. A previous chat's
      // currentCharId may still be populated when the user switches chats.
      console.log("[HypaPlus] beforeRequest — checking current chat context...");
      if (!hadPreparedProcessBatch) await ensureChatContext(true);
      console.log(
        "[HypaPlus] beforeRequest — after ensureChatContext: currentCharId:",
        currentCharId || "(none)",
        "| chunks:",
        state.chunks.length,
        "| nodes:",
        getNodes().length,
      );

      // Find the last user message for tracking and retrieval
      let lastUserContent = "";
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          lastUserContent = messages[i].content;
          break;
        }
      }

      console.log(
        "[HypaPlus] beforeRequest — lastUserContent found:",
        lastUserContent ? `yes (${lastUserContent.length} chars)` : "NO",
      );

      if (lastUserContent) {
        // Track the user message
        await trackUserMessage(lastUserContent);

        // Build memory context
        console.log("[HypaPlus] beforeRequest — building memoryContext...");
        const memoryContext = await buildMemoryContext(lastUserContent);
        console.log(
          "[HypaPlus] beforeRequest — memoryContext length:",
          memoryContext.length,
          "| total nodes:",
          getNodes().length,
        );

        // Build recent node cache context (if enabled)
        let cachedContext = "";
        if (recentNodeCache && recentNodeCacheCount > 0) {
          const recentNodes = getRecentNodes(recentNodeCacheCount);
          if (recentNodes.length > 0) {
            // Sort chronologically for display
            recentNodes.sort(compareNodesByTime);
            cachedContext = recentNodes.map((n) => formatNodeForContext(n)).join("\n");
          }
        }

        // Replace [HypaPlus.cached] placeholder if present
        if (cachedContext) {
          for (let i = 0; i < messages.length; i++) {
            if (messages[i].content.includes("[HypaPlus.cached]")) {
              messages[i] = {
                ...messages[i],
                content: messages[i].content.replace("[HypaPlus.cached]", cachedContext),
              };
              console.log("[HypaPlus] Cached nodes injected into message");
              break;
            }
          }
        }

        if (memoryContext) {
          console.log(
            "[HypaPlus] beforeRequest — memoryContext is truthy, searching for [HypaPlus.memory] placeholder...",
          );
          // Strategy 1: Replace [HypaPlus.memory] placeholder if present in any message
          let replaced = false;
          for (let i = 0; i < messages.length; i++) {
            const hasPlaceholder = messages[i].content.includes("[HypaPlus.memory]");
            console.log(
              "[HypaPlus] beforeRequest — message[",
              i,
              "] role:",
              messages[i].role,
              "| has [HypaPlus.memory]:",
              hasPlaceholder,
            );
            if (hasPlaceholder) {
              messages[i] = {
                ...messages[i],
                content: messages[i].content.replace("[HypaPlus.memory]", memoryContext),
              };
              replaced = true;
              console.log(
                "[HypaPlus] beforeRequest — [HypaPlus.memory] REPLACED in message[",
                i,
                "]",
              );
              break;
            }
          }
          if (replaced) {
            // Log memory injection to console
            console.log("[HypaPlus] Memory injected into message");
          }
          if (!replaced) {
            console.log(
              "[HypaPlus] beforeRequest — [HypaPlus.memory] NOT FOUND in any message, falling back to system message append...",
            );
            // Strategy 2: Append to system message or insert at beginning
            const systemIndex = messages.findIndex((m) => m.role === "system");
            if (systemIndex >= 0) {
              messages[systemIndex] = {
                ...messages[systemIndex],
                content: messages[systemIndex].content + "\n\n" + memoryContext,
              };
              console.log(
                "[HypaPlus] beforeRequest — memoryContext appended to system message[",
                systemIndex,
                "]",
              );
            } else {
              messages.unshift({ role: "system", content: memoryContext });
              console.log(
                "[HypaPlus] beforeRequest — memoryContext inserted as new system message at index 0",
              );
            }
          }
        } else {
          console.log(
            "[HypaPlus] beforeRequest — memoryContext is EMPTY/FALSY, placeholder NOT replaced. Nodes exist?",
            getNodes().length > 0,
          );
        }
      }
    } catch (e) {
      console.error("[HypaPlus] beforeRequest ERROR:", e);
      // Return messages unchanged on error — don't block the main request
    }

    console.log("[HypaPlus] beforeRequest — returning", messages.length, "messages");
    return messages;
  }

  // afterRequest: track assistant responses
  async function afterRequestHandler(content, type) {
    if ((type !== "main" && type !== "model") || isSummarizing) return content;
    console.log(
      "[HypaPlus] afterRequest called — type:",
      type,
      "| content length:",
      _nullishCoalesce(_optionalChain([content, 'optionalAccess', _27 => _27.length]), () => ( 0)),
    );
    // The assistant message may have been appended since beforeRequest.
    invalidateChatMessageCache();
    if (content) {
      try {
        await trackAssistantMessage(content);
        console.log("[HypaPlus] afterRequest — trackAssistantMessage done");
      } catch (e) {
        console.error("[HypaPlus] afterRequest — trackAssistantMessage error:", e);
      }
    }
    return content;
  }

  // ── Settings UI ──────────────────────────────────────────────────────────

  let activeTab = "nodes";
  let editingNodeId = null;
  let nodeListPage = 0;
  let nodeSearchQuery = "";
  let nodeSearchComposing = false;
  let nodeSearchSelStart = null;
  let nodeSearchSelEnd = null;
  let nodeSearchShouldFocus = false;
  let showIncludedNodesOnly = false;
  let showFavoriteNodesOnly = false;
  let nodeSortDirection = "asc";
  let uiScrollTop = 0;
  let showSummarizeDialog = false;
  let showCreateNodeDialog = false;
  const NODES_PER_PAGE = 30;

  async function openSettings() {
    // Auto-load current chat state before showing GUI (gracefully handle no chat)
    try {
      if (await ensureChatContext(true)) uiScrollTop = 0;
    } catch (e) {
      console.log("[HypaPlus] Could not load chat context for GUI:", e);
    }
    await risuai.showContainer("fullscreen");
    renderUI();
  }

  async function syncGuiButtonRegistration() {
    if (showGuiButton && !guiButtonPartId) {
      const part = await risuai.registerButton(
        {
          name: "HypaPlus 1.0.9.g-local.2",
          icon: "🗂️",
          iconType: "html",
          location: "action",
          id: "hypaplus-gui",
        },
        async () => {
          await openSettings();
        },
      );
      guiButtonPartId = part.id;
    } else if (!showGuiButton && guiButtonPartId) {
      await risuai.unregisterUIPart(guiButtonPartId);
      guiButtonPartId = null;
    }
  }

  function renderUI(scrollTopOverride) {
    if (scrollTopOverride === undefined) {
      const existingBody = document.getElementById("hp-body");
      if (existingBody) uiScrollTop = existingBody.scrollTop;
    } else {
      uiScrollTop = scrollTopOverride;
    }
    // Keep this render's value in its closure: concurrent asynchronous renders
    // must not overwrite the scroll position captured for this one.
    const renderScrollTop = uiScrollTop;
    // Fetch pending messages and char/chat names asynchronously, then render
    Promise.all([
      getPendingMessages(),
      (async () => {
        if (currentCharIndex < 0 || currentChatIndex < 0) return { charName: "?", chatName: "?" };
        let charName = `Char#${currentCharIndex}`;
        let chatName = `Chat#${currentChatIndex}`;
        try {
          const char = await risuai.getCharacterFromIndex(currentCharIndex);
          if (char && char.name) charName = char.name;
        } catch (_) {
          /* fallback to index */
        }
        try {
          const chat = await risuai.getChatFromIndex(currentCharIndex, currentChatIndex);
          if (chat && chat.name) chatName = chat.name;
        } catch (_) {
          /* fallback to index */
        }
        return { charName, chatName };
      })(),
    ]).then(([pendingMessages, { charName, chatName }]) => {
      renderUIWithPending(pendingMessages, charName, chatName, renderScrollTop);
    });
  }

  function renderUIWithPending(
    pendingMessages,
    charName,
    chatName,
    scrollTop,
  ) {
    document.body.innerHTML = `
      <style>
        .hp-wrap { display:flex; flex-direction:column; height:100vh; color:var(--textcolor,#ccc); font-family:sans-serif; background:var(--bgcolor,#111); }
        .hp-tabs { display:flex; gap:0; border-bottom:2px solid var(--borderc,#333); flex-shrink:0; align-items:center; }
        .hp-tab { padding:10px 18px; cursor:pointer; border:none; background:none; color:var(--textcolor2,#888); font-size:14px; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .15s; }
        .hp-tab:hover { color:var(--textcolor,#eee); }
        .hp-tab.active { color:#4a6cf7; border-bottom-color:#4a6cf7; font-weight:bold; }
        .hp-header-actions { margin-left:auto; display:flex; align-items:center; gap:4px; }
        .hp-version { color:var(--textcolor2,#888); font-size:12px; white-space:nowrap; }
        .hp-close-btn { padding:8px 14px; cursor:pointer; border:none; background:none; color:var(--textcolor2,#888); font-size:18px; line-height:1; transition:all .15s; }
        .hp-close-btn:hover { color:#e74c3c; }
        .hp-body { flex:1; overflow-y:auto; padding:16px; }
        .hp-panel { display:none; }
        .hp-panel.active { display:block; }
        .hp-stat { display:inline-block; padding:6px 12px; margin:2px 4px; background:var(--darkbg,#1e1e1e); border-radius:6px; font-size:13px; }
        .hp-stat b { color:#4a6cf7; }
        .hp-btn { padding:7px 14px; border:none; border-radius:5px; cursor:pointer; font-size:13px; margin:2px; transition:all .15s; }
        .hp-btn.primary { background:#4a6cf7; color:#fff; }
        .hp-btn.primary:hover { background:#5b7df8; }
        .hp-btn.danger { background:#c0392b; color:#fff; }
        .hp-btn.danger:hover { background:#e74c3c; }
        .hp-btn.secondary { background:#444; color:#ddd; }
        .hp-btn.secondary:hover { background:#555; }
        .hp-btn.small { padding:4px 10px; font-size:12px; }
        .hp-card { background:var(--darkbg,#1a1a1a); border:1px solid var(--borderc,#333); border-radius:8px; padding:12px; margin:8px 0; }
        .hp-card-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; }
        .hp-badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold; }
        .hp-badge.event { background:#2d5a27; color:#8fdf82; }
        .hp-badge.facts { background:#5a3e27; color:#dfb882; }
        .hp-meta { font-size:12px; color:var(--textcolor2,#888); margin:4px 0; }
        .hp-content { font-size:13px; line-height:1.5; margin:6px 0; white-space:pre-wrap; }
        .hp-dialogues { margin:6px 0; padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:4px; font-size:12px; }
        .hp-dialogues .dl-line { margin:2px 0; }
        .hp-dialogues .dl-speaker { color:#dfb882; }
        .hp-input, .hp-textarea, .hp-select { background:#111; color:#ddd; border:1px solid var(--borderc,#444); border-radius:4px; padding:6px 10px; font-size:13px; }
        .hp-textarea { width:100%; resize:vertical; font-family:monospace; }
        .hp-input { width:100%; }
        .hp-select { cursor:pointer; }
        .hp-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:6px 0; }
        .hp-label { font-size:13px; font-weight:bold; min-width:120px; }
        .hp-pagination { display:flex; gap:4px; justify-content:center; margin:12px 0; }
        .hp-empty { color:var(--textcolor2,#666); text-align:center; padding:40px; font-size:14px; }
        .hp-edit-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:100; color:#ddd; }
        .hp-edit-box { background:var(--bgcolor,#1a1a1a); border:1px solid var(--borderc,#444); border-radius:12px; padding:20px; width:90%; max-width:650px; max-height:90vh; overflow-y:auto; color:#ddd; }
        .hp-edit-box h3 { margin-top:0; color:#eee; }
        .hp-edit-box pre { color:#ddd; }
        .hp-edit-box .hp-row { margin:8px 0; }
        .hp-edit-box .hp-label { min-width:80px; }
        .hp-toggle { position:relative; display:inline-block; width:44px; height:24px; }
        .hp-toggle input { opacity:0; width:0; height:0; }
        .hp-toggle .slider { position:absolute; cursor:pointer; inset:0; background:#555; border-radius:24px; transition:.2s; }
        .hp-toggle .slider:before { content:""; position:absolute; height:18px; width:18px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:.2s; }
        .hp-toggle input:checked+.slider { background:#4a6cf7; }
        .hp-toggle input:checked+.slider:before { transform:translateX(20px); }
      </style>
      <div class="hp-wrap">
        <div class="hp-tabs">
          <button class="hp-tab${activeTab === "nodes" ? " active" : ""}" data-tab="nodes">📋 노드 (${getNodes().length})</button>
          <button class="hp-tab${activeTab === "chunks" ? " active" : ""}" data-tab="chunks">📦 청크 (${state.chunks.length})</button>
          <button class="hp-tab${activeTab === "settings" ? " active" : ""}" data-tab="settings">⚙️ 설정</button>
          <button class="hp-tab${activeTab === "presets" ? " active" : ""}" data-tab="presets">💾 프리셋</button>
          <button class="hp-tab${activeTab === "prompt" ? " active" : ""}" data-tab="prompt">📝 프롬프트</button>
          <button class="hp-tab${activeTab === "regex" ? " active" : ""}" data-tab="regex">🔧 정규식</button>
          <div class="hp-header-actions">
            <span class="hp-version">v${PLUGIN_VERSION}</span>
            <button class="hp-close-btn" id="hp-close" title="Close">✕</button>
          </div>
        </div>
        <div class="hp-body" id="hp-body">
          ${renderNodesPanel(pendingMessages, charName, chatName)}
          ${renderChunksPanel()}
          ${renderSettingsPanel(pendingMessages)}
          ${renderPresetsPanel()}
          ${renderPromptPanel()}
          ${renderRegexPanel()}
        </div>
      </div>
      ${editingNodeId !== null ? renderEditOverlay() : ""}
      ${showSummarizeDialog ? renderSummarizeDialog(pendingMessages) : ""}
      ${showCreateNodeDialog ? renderCreateNodeOverlay() : ""}
    `;

    const renderedBody = document.getElementById("hp-body");
    if (renderedBody) {
      renderedBody.scrollTop = scrollTop;
      // The browser can reset a newly inserted scroll container after layout.
      // Restore it once more on the next frame, without affecting newer renders.
      requestAnimationFrame(() => {
        if (document.getElementById("hp-body") === renderedBody) renderedBody.scrollTop = scrollTop;
      });
    }
    attachUIEvents(pendingMessages);
  }

  // ── Panel: Nodes ─────────────────────────────────────────────────────────

  function renderNodesPanel(
    pendingMessages,
    charName,
    chatName,
  ) {
    const allNodes = getNodes();

    // Sort nodes with one consistent key before filtering and paginating.
    const sortedNodes = [...allNodes].sort(compareNodesByTime);
    if (nodeSortDirection === "desc") sortedNodes.reverse();
    const cachedNodeIds = new Set(
      recentNodeCache && recentNodeCacheCount > 0
        ? getRecentNodes(recentNodeCacheCount).map((node) => node.id)
        : [],
    );
    const embeddedNodeIds = new Set(_nullishCoalesce(state.lastSelectedNodeIds, () => ( [])));

    // Filter by cache/embedding or favorite membership, then by search query.
    const includedNodes = showIncludedNodesOnly
      ? sortedNodes.filter((n) => cachedNodeIds.has(n.id) || embeddedNodeIds.has(n.id))
      : showFavoriteNodesOnly
        ? sortedNodes.filter((n) => n.favorite)
        : sortedNodes;
    const filteredNodes = nodeSearchQuery
      ? includedNodes.filter((n) => {
          const q = nodeSearchQuery.toLowerCase();
          return (
            n.content.toLowerCase().includes(q) ||
            n.time.toLowerCase().includes(q) ||
            n.characters.some((c) => c.toLowerCase().includes(q)) ||
            (n.location && n.location.toLowerCase().includes(q)) ||
            (n.dialogues &&
              n.dialogues.some(
                (d) => d.text.toLowerCase().includes(q) || d.speaker.toLowerCase().includes(q),
              ))
          );
        })
      : includedNodes;

    const totalPages = Math.max(1, Math.ceil(filteredNodes.length / NODES_PER_PAGE));
    if (nodeListPage >= totalPages) nodeListPage = totalPages - 1;
    const pageStart = nodeListPage * NODES_PER_PAGE;
    const pageNodes = filteredNodes.slice(pageStart, pageStart + NODES_PER_PAGE);

    let html = `<div class="hp-panel${activeTab === "nodes" ? " active" : ""}" data-panel="nodes">`;

    // Stats bar
    const selectedCount = _nullishCoalesce(_optionalChain([state, 'access', _28 => _28.lastSelectedNodeIds, 'optionalAccess', _29 => _29.length]), () => ( 0));
    html += `<div style="margin-bottom:12px;">
      <span class="hp-stat">📊 노드 <b>${allNodes.length}</b>개</span>
      ${nodeSearchQuery || showIncludedNodesOnly || showFavoriteNodesOnly ? `<span class="hp-stat">🔍 필터 결과 <b>${filteredNodes.length}</b>개</span>` : ""}
      <span class="hp-stat">📦 청크 <b>${state.chunks.length}</b> 개</span>
      <span class="hp-stat">⏳ 미요약 <b>${pendingMessages.length}</b> 개</span>
      <span class="hp-stat">✅ 컨텍스트 포함 <b>${selectedCount}</b> 개</span>
      <span class="hp-stat">🆔 챗: <b>${escapeHtml(charName)} / ${escapeHtml(chatName)}</b></span>
    </div>`;

    // Action buttons
    html += `<div style="margin-bottom:12px;">
      <button class="hp-btn primary" id="hp-force-summarize">📋 수동 요약 (미요약 ${pendingMessages.length}개)</button>
      <button class="hp-btn primary" id="hp-auto-summarize-btn" style="background:#27ae60;">⚡ 자동 요약 (미요약 개수 &lt; ${autoSummarizeThreshold}까지)</button>
      <button class="hp-btn primary" id="hp-create-node" style="background:#8e44ad;">➕ 수동 노드 추가</button>
      <button class="hp-btn secondary" id="hp-filter-included-nodes" style="${showIncludedNodesOnly ? "background:#4a6cf7;color:#fff;" : ""}">🧩 캐시/임베딩 노드만</button>
      <button class="hp-btn secondary" id="hp-filter-favorite-nodes" style="${showFavoriteNodesOnly ? "background:#f39c12;color:#000;" : ""}">⭐ 즐겨찾기만</button>
      <button class="hp-btn secondary" id="hp-toggle-node-sort">${nodeSortDirection === "asc" ? "↑ 오래된 순" : "↓ 최신순"}</button>
      <button class="hp-btn secondary" id="hp-backup-download">💾 백업</button>
      <button class="hp-btn secondary" id="hp-backup-restore">📥 복구</button>
      <input type="file" id="hp-restore-file" accept=".json" style="display:none;">
      <button class="hp-btn danger" id="hp-clear-memory">🗑️ 모두 지우기</button>
    </div>`;

    // Search bar
    html += `<div style="margin-bottom:12px;">
      <input class="hp-input" type="text" id="hp-node-search" placeholder="🔍 노드 검색 (내용, 시간, 인물, 장소)..." value="${escapeHtml(nodeSearchQuery)}" style="max-width:400px;">
      ${nodeSearchQuery ? `<button class="hp-btn secondary small" id="hp-node-search-clear">✕ 초기화</button>` : ""}
    </div>`;

    // Pending messages preview
    if (pendingMessages.length > 0) {
      const window = pendingMessages.slice(0, chunkSize);
      const displayPending = includeUserMessages ? window : window.filter((m) => m.role !== "user");
      const previewCount = displayPending.length;
      html += `<details style="margin-bottom:12px;" open>
        <summary style="cursor:pointer;font-size:13px;color:#4a6cf7;font-weight:bold;">⏳ 미요약 메시지 (총 ${pendingMessages.length} 개 — 첫 ${chunkSize}개 중 ${previewCount}개 출력)</summary>
        <div style="max-height:200px;overflow-y:auto;margin-top:6px;background:#0a0a0a;padding:8px;border-radius:4px;font-size:12px;">`;
      for (let i = 0; i < previewCount; i++) {
        const msg = displayPending[i];
        const roleLabel = msg.role === "user" ? "👤" : "🤖";
        const preview = msg.content.length > 200 ? msg.content.slice(0, 200) + "..." : msg.content;
        html += `<div style="padding:3px 0;border-bottom:1px solid #1a1a1a;">
          <span style="color:#4a6cf7;">[${i + 1}]</span> ${roleLabel} ${escapeHtml(preview)}
        </div>`;
      }
      html += `</div></details>`;
    }

    if (pageNodes.length === 0) {
      html += `<div class="hp-empty">${nodeSearchQuery || showIncludedNodesOnly || showFavoriteNodesOnly ? "필터 결과가 없습니다." : "요약 노드가 없습니다. 요약 노드를 생성하세요!"}</div>`;
    } else {
      for (const node of pageNodes) {
        html += renderNodeCard(node);
      }
    }

    // Pagination
    if (totalPages > 1) {
      html += `<div class="hp-pagination">
        <button class="hp-btn secondary small" data-page="0" ${nodeListPage === 0 ? "disabled" : ""}>« First</button>
        <button class="hp-btn secondary small" data-page="${nodeListPage - 1}" ${nodeListPage === 0 ? "disabled" : ""}>‹ Prev</button>
        <span style="padding:4px 12px;font-size:13px;">Page ${nodeListPage + 1} / ${totalPages}</span>
        <button class="hp-btn secondary small" data-page="${nodeListPage + 1}" ${nodeListPage >= totalPages - 1 ? "disabled" : ""}>Next ›</button>
        <button class="hp-btn secondary small" data-page="${totalPages - 1}" ${nodeListPage >= totalPages - 1 ? "disabled" : ""}>Last »</button>
      </div>`;
    }

    html += `</div>`;
    return html;
  }

  function renderNodeCard(node) {
    // Find which chunk this node belongs to
    const parentChunk = state.chunks.find((c) => c.nodes.some((n) => n.id === node.id));
    const chunkLink = parentChunk
      ? `<span style="font-size:11px;color:#4a6cf7;margin-left:6px;" title="Chunk #${parentChunk.id}">📦 Chunk #${parentChunk.id}</span>`
      : "";
    const scores = _nullishCoalesce(_optionalChain([state, 'access', _30 => _30.lastNodeScores, 'optionalAccess', _31 => _31[node.id]]), () => ( null));
    const isSelected = _nullishCoalesce(_optionalChain([state, 'access', _32 => _32.lastSelectedNodeIds, 'optionalAccess', _33 => _33.includes, 'call', _34 => _34(node.id)]), () => ( false));
    const isCached =
      recentNodeCache &&
      recentNodeCacheCount > 0 &&
      getRecentNodes(recentNodeCacheCount).some((n) => n.id === node.id);
    const cardBackground = isCached
      ? "background:rgb(15,10,0);"
      : isSelected
        ? "background:rgb(0,20,0);"
        : "";
    const selectedBadge = isSelected
      ? `<span style="font-size:11px;color:#8fdf82;margin-left:4px;" title="임베딩 검색으로 컨텍스트에 포함">🧬</span>`
      : "";
    const cachedBadge = isCached
      ? `<span style="font-size:11px;color:#dfb882;margin-left:4px;" title="최근 노드 캐시에 포함">📌 캐시</span>`
      : "";
    const scoreBar = scores
      ? `
      <div style="margin-top:6px;display:flex;gap:8px;font-size:11px;">
        <span style="color:#8fdf82;" title="유사도 점수">🧬 Sim: ${(scores.similarity * 100).toFixed(1)}%</span>
        <span style="color:#dfb882;" title="시간 기반 점수">⏱️ 시간: ${timeScoringMode === "none" ? "사용 안 함" : `${(scores.time * 100).toFixed(1)}%`}</span>
        <span style="color:#4a6cf7;" title="최종 점수">⭐ Total: ${(scores.combined * 100).toFixed(1)}%</span>
      </div>`
      : "";

    return `
    <div class="hp-card" data-node-id="${node.id}" style="${cardBackground}">
      <div class="hp-card-header">
        <span>
          <span class="hp-badge ${node.type}">${node.type.toUpperCase()}</span>
          <strong>${escapeHtml(node.time)}</strong>
          <span style="font-size:11px;color:#666;margin-left:6px;">#${node.id}</span>
          ${selectedBadge}
          ${cachedBadge}
          ${chunkLink}
        </span>
        <span>
          <button class="hp-btn secondary small hp-fav-node" data-node-id="${node.id}" style="${node.favorite ? "background:#f39c12;color:#000;" : ""}">${node.favorite ? "⭐" : "☆"}</button>
          <button class="hp-btn secondary small hp-edit-node" data-node-id="${node.id}">✏️ 편집</button>
          <button class="hp-btn danger small hp-delete-node" data-node-id="${node.id}">🗑️ 삭제</button>
        </span>
      </div>
      ${node.location ? `<div class="hp-meta">📍 ${escapeHtml(node.location)}</div>` : ""}
      ${node.characters.length > 0 ? `<div class="hp-meta">👤 ${escapeHtml(node.characters.join(", "))}</div>` : ""}
      <div class="hp-content">${escapeHtml(node.content)}</div>
      ${
        node.dialogues && node.dialogues.length > 0
          ? `
        <div class="hp-dialogues">
          ${node.dialogues.map((d) => `<div class="dl-line"><span class="dl-speaker">${escapeHtml(d.speaker)}:</span> "${escapeHtml(d.text)}"</div>`).join("")}
        </div>
      `
          : ""
      }
      ${scoreBar}
    </div>`;
  }

  // ── Panel: Chunks ────────────────────────────────────────────────────────

  function renderChunkMemoEditor(chunk) {
    const memo = _nullishCoalesce(chunk.memo, () => ( ""));
    return `
      <div style="margin-top:8px;">
        ${
          memo.trim()
            ? `<div style="padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:4px;font-size:12px;white-space:pre-wrap;"><strong style="color:#bbb;">📝 메모</strong><div style="margin-top:4px;">${escapeHtml(memo)}</div></div>`
            : ""
        }
        <details style="margin-top:6px;">
          <summary style="cursor:pointer;font-size:12px;color:#4a6cf7;">✏️ 메모 편집</summary>
          <div style="margin-top:6px;">
            <textarea class="hp-textarea hp-chunk-memo" data-chunk-id="${chunk.id}" style="height:64px;" placeholder="이 청크에 대한 메모를 입력하세요...">${escapeHtml(memo)}</textarea>
            <button class="hp-btn secondary small hp-save-chunk-memo" data-chunk-id="${chunk.id}" style="margin-top:4px;">💾 메모 저장</button>
          </div>
        </details>
      </div>`;
  }

  function renderChunksPanel() {
    let html = `<div class="hp-panel${activeTab === "chunks" ? " active" : ""}" data-panel="chunks">`;
    html += `<h3>📦 요약 청크</h3>`;

    // Separate manual chunk (id "0") from auto chunks
    const manualChunk = state.chunks.find((c) => c.id === "0");
    const autoChunks = state.chunks.filter((c) => c.id !== "0");

    // Show manual chunk first if it exists
    if (manualChunk) {
      html += `<h4 style="margin:16px 0 8px;color:#8e44ad;">✋ 수동 노드 (청크 0)</h4>`;
      html += `
      <div class="hp-card" style="border-color:#8e44ad;">
        <div class="hp-card-header">
          <span>
            <strong style="color:#8e44ad;">✋ Chunk #0 — 수동 노드</strong>
            <span style="font-size:12px;color:#888;margin-left:8px;">${manualChunk.nodes.length} nodes</span>
          </span>
        </div>
        ${renderChunkMemoEditor(manualChunk)}`;
      if (manualChunk.nodes.length > 0) {
        html += `<details style="margin-top:8px;" open>
          <summary style="cursor:pointer;font-size:13px;color:#8e44ad;font-weight:bold;">📋 수동 노드 (${manualChunk.nodes.length}개)</summary>
          <div style="margin-top:6px;">`;
        for (const node of manualChunk.nodes) {
          html += renderNodeCardCompact(node);
        }
        html += `</div></details>`;
      } else {
        html += `<div style="margin-top:6px;font-size:12px;color:#888;">수동 노드가 없습니다.</div>`;
      }
      html += `</div>`;
    }

    if (autoChunks.length === 0) {
      if (!manualChunk) {
        html += `<div class="hp-empty">아직 요약 청크가 없습니다. 요약을 생성하세요!</div>`;
      }
    } else {
      html += `<h4 style="margin:16px 0 8px;color:#4a6cf7;">🤖 자동 요약 청크</h4>`;
      // Show newest first
      const reversed = [...autoChunks].reverse();
      for (const chunk of reversed) {
        const date = new Date(chunk.createdAt).toLocaleString();
        let statusBadge = "";
        if (getChunkStatus(chunk) === "needs_review") {
          statusBadge = `<span style="font-size:11px;color:#f39c12;margin-left:6px;">⚠️ 확인 필요 · 원문 유지</span>`;
        } else if (chunk.summarized === "pending") {
          statusBadge = `<span style="font-size:11px;color:#f39c12;margin-left:6px;" title="노드 생성 대기중">⏳ 응답 대기중...</span>`;
        } else if (chunk.summarized === "failed") {
          statusBadge = `<span style="font-size:11px;color:#e74c3c;margin-left:6px;" title="요약 실패 — 재요약 버튼으로 다시 시도하세요">❌ 요약 실패</span>`;
        }
        html += `
        <div class="hp-card">
          <div class="hp-card-header">
            <span>
              <strong>Chunk #${chunk.id}</strong>
              <span style="font-size:12px;color:#888;margin-left:8px;">${date}</span>
              <span style="font-size:12px;color:#888;margin-left:8px;">${chunk.messageCount} msgs → ${chunk.nodes.length} nodes</span>
              ${statusBadge}
            </span>
            <span>
              <button class="hp-btn secondary small hp-reroll-chunk" data-chunk-id="${chunk.id}">🔄 재요약</button>
              <button class="hp-btn danger small hp-delete-chunk" data-chunk-id="${chunk.id}">🗑️ 삭제</button>
            </span>
          </div>
          <div style="margin-top:8px;font-size:12px;color:#888;">
            📍 메시지 ${chunk.chatIds.length}개 (인덱스: ${getChunkMessageIndices(chunk).slice(0, 5).join(", ")}${chunk.chatIds.length > 5 ? "..." : ""})
            <button class="hp-btn secondary small hp-view-chunk-msgs" data-chunk-id="${chunk.id}" style="margin-left:8px;">👁️ 저장 원문</button>
            <button class="hp-btn secondary small hp-view-processed-msgs" data-chunk-id="${chunk.id}">기억에 사용할 내용</button>
          </div>
          ${renderChunkMemoEditor(chunk)}
          ${chunk.lastSummaryAttempt?.reason ? `<div style="font-size:12px;margin-top:8px;color:#c9aa72;">${escapeHtml(chunk.lastSummaryAttempt.reason)}${hasCommittedSummary(chunk) && chunk.lastSummaryAttempt.status !== "done" ? " 이전 기억은 유지됩니다." : ""}</div>` : ""}
          ${!hasCommittedSummary(chunk) && chunk.nodes.length === 0 ? `<div style="font-size:12px;margin-top:8px;color:#aaa;">이 구간은 자동 완료하지 않습니다. 원문 확인 후 재요약하거나 기억 없이 완료할 수 있습니다. <button class="hp-btn secondary small hp-accept-empty-chunk" data-chunk-id="${chunk.id}">기억 없이 완료</button></div>` : ""}`;


        // Show connected nodes within the chunk
        if (chunk.nodes.length > 0) {
          html += `<details style="margin-top:8px;">
            <summary style="cursor:pointer;font-size:13px;color:#4a6cf7;font-weight:bold;">📋 연결된 노드 (${chunk.nodes.length}개)</summary>
            <div style="margin-top:6px;">`;
          for (const node of chunk.nodes) {
            html += renderNodeCardCompact(node);
          }
          html += `</div></details>`;
        } else if (hasCommittedSummary(chunk)) {
          html += `<div style="margin-top:6px;font-size:12px;color:#888;">사용자가 기억 없이 완료한 구간입니다.</div>`;
        } else if (chunk.summarized === "failed") {
          html += `<div style="margin-top:6px;font-size:12px;color:#e74c3c;">⚠️ 요약에 실패했습니다. 재요약 버튼으로 다시 시도하세요.</div>`;
        }

        html += `</div>`;
      }
    }

    html += `</div>`;
    return html;
  }

  /** Compact node card for chunk panel (with edit button) */
  function renderNodeCardCompact(node) {
    const scores = _nullishCoalesce(_optionalChain([state, 'access', _35 => _35.lastNodeScores, 'optionalAccess', _36 => _36[node.id]]), () => ( null));
    const isSelected = _nullishCoalesce(_optionalChain([state, 'access', _37 => _37.lastSelectedNodeIds, 'optionalAccess', _38 => _38.includes, 'call', _39 => _39(node.id)]), () => ( false));
    const isCached =
      recentNodeCache &&
      recentNodeCacheCount > 0 &&
      getRecentNodes(recentNodeCacheCount).some((n) => n.id === node.id);
    const cardBackground = isCached
      ? "background:rgb(30,20,0);"
      : isSelected
        ? "background:rgb(0,40,0);"
        : "";
    const selectedBadge = isSelected
      ? `<span style="font-size:11px;color:#8fdf82;margin-left:4px;" title="임베딩 검색으로 컨텍스트에 포함">🧬</span>`
      : "";
    const cachedBadge = isCached
      ? `<span style="font-size:11px;color:#dfb882;margin-left:4px;" title="최근 노드 캐시에 포함">📌 캐시</span>`
      : "";

    return `
    <div class="hp-card" data-node-id="${node.id}" style="margin:4px 0;padding:8px;${cardBackground}">
      <div class="hp-card-header">
        <span>
          <span class="hp-badge ${node.type}">${node.type.toUpperCase()}</span>
          <strong>${escapeHtml(node.time)}</strong>
          <span style="font-size:11px;color:#666;margin-left:6px;">#${node.id}</span>
          ${selectedBadge}
          ${cachedBadge}
        </span>
        <span>
          <button class="hp-btn secondary small hp-fav-node" data-node-id="${node.id}" style="${node.favorite ? "background:#f39c12;color:#000;" : ""}">${node.favorite ? "⭐" : "☆"}</button>
          <button class="hp-btn secondary small hp-edit-node" data-node-id="${node.id}">✏️ 편집</button>
          <button class="hp-btn danger small hp-delete-node" data-node-id="${node.id}">🗑️ 삭제</button>
        </span>
      </div>
      ${node.location ? `<div class="hp-meta">📍 ${escapeHtml(node.location)}</div>` : ""}
      ${node.characters.length > 0 ? `<div class="hp-meta">👤 ${escapeHtml(node.characters.join(", "))}</div>` : ""}
      <div class="hp-content">${escapeHtml(node.content)}</div>
      ${
        node.dialogues && node.dialogues.length > 0
          ? `
        <div class="hp-dialogues">
          ${node.dialogues.map((d) => `<div class="dl-line"><span class="dl-speaker">${escapeHtml(d.speaker)}:</span> "${escapeHtml(d.text)}"</div>`).join("")}
        </div>
      `
          : ""
      }
      ${
        scores
          ? `
      <div style="margin-top:4px;display:flex;gap:8px;font-size:11px;">
        <span style="color:#8fdf82;">🧬 Sim: ${(scores.similarity * 100).toFixed(1)}%</span>
        <span style="color:#dfb882;">⏱️ 시간: ${timeScoringMode === "none" ? "사용 안 함" : `${(scores.time * 100).toFixed(1)}%`}</span>
        <span style="color:#4a6cf7;">⭐ Total: ${(scores.combined * 100).toFixed(1)}%</span>
      </div>`
          : ""
      }
    </div>`;
  }

  // ── Panel: Settings ──────────────────────────────────────────────────────

  function renderSettingsPanel(pendingMessages) {
    return `
    <div class="hp-panel${activeTab === "settings" ? " active" : ""}" data-panel="settings">
      <h3>⚙️ HypaPlus 설정</h3>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📋 요약</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">청크 크기</span>
          <input class="hp-input" type="number" id="hp-chunk-size" value="${chunkSize}" min="2" max="100" style="width:100px;">
          <span style="font-size:12px;color:#888;">한 요약 청크에 들어가는 메시지 수</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">자동 요약</span>
          <label class="hp-toggle">
            <input type="checkbox" id="hp-auto-summarize" ${autoSummarize ? "checked" : ""}>
            <span class="slider"></span>
          </label>
          <span style="font-size:12px;color:#888;">자동 요약을 켭니다</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">자동 요약 임계값</span>
          <input class="hp-input" type="number" id="hp-auto-threshold" value="${autoSummarizeThreshold}" min="2" max="500" style="width:100px;">
          <span style="font-size:12px;color:#888;">남은 메시지 수가 값보다 작아질 때까지 자동 요약</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">User 메시지 포함</span>
          <label class="hp-toggle">
            <input type="checkbox" id="hp-include-user" ${includeUserMessages ? "checked" : ""}>
            <span class="slider"></span>
          </label>
          <span style="font-size:12px;color:#888;">User 메시지를 요약에 포함합니다</span>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">🧬 임베딩</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">임베딩 URL</span>
          <input class="hp-input" type="text" id="hp-embedding-url" value="${escapeHtml(embeddingUrl)}" placeholder="http://localhost:8080/embeddings">
          <span style="font-size:12px;color:#888;">OpenAI-호환 /v1/embeddings 엔드포인트</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">임베딩 모델</span>
          <input class="hp-input" type="text" id="hp-embedding-model" value="${escapeHtml(embeddingModel)}" placeholder="text-embedding-3-small">
          <span style="font-size:12px;color:#888;">임베딩 모델 이름</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">API 키</span>
          <input class="hp-input" type="password" id="hp-embedding-api-key" value="${escapeHtml(embeddingApiKey)}" placeholder="sk-...">
          <span style="font-size:12px;color:#888;">임베딩 모델 API 키</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">임베딩 요청 메시지 수</span>
          <input class="hp-input" type="number" id="hp-embedding-context" value="${embeddingContextMessages}" min="1" max="50" style="width:100px;">
          <span style="font-size:12px;color:#888;">임베딩 유사도 측정에 포함할 최근 메시지 개수</span>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">⭐ 점수</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">망각 시간 (일)</span>
          <input class="hp-input" type="number" id="hp-time-decay" value="${timeDecayDays}" min="1" max="365" style="width:100px;">
          <span style="font-size:12px;color:#888;">기억이 감쇠하는 스케일</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">시간 반영 범위</span>
          <select class="hp-select" id="hp-time-scoring-mode">
            <option value="minute" ${timeScoringMode === "minute" ? "selected" : ""}>날짜와 분까지</option>
            <option value="day" ${timeScoringMode === "day" ? "selected" : ""}>날짜까지만</option>
            <option value="none" ${timeScoringMode === "none" ? "selected" : ""}>사용하지 않음</option>
          </select>
          <span style="font-size:12px;color:#888;">노드 검색 점수에 시간 차이를 얼마나 정밀하게 반영할지 선택합니다.</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">시간 가중치</span>
          <input class="hp-input" type="number" id="hp-time-weight" value="${timeWeight}" min="0" max="10" step="0.1" style="width:100px;">
          <span style="font-size:12px;color:#888;">시간 기반 점수의 가중치입니다. 기본값 1.</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">유사도 가중치</span>
          <input class="hp-input" type="number" id="hp-similarity-weight" value="${similarityWeight}" min="0" max="10" step="0.1" style="width:100px;">
          <span style="font-size:12px;color:#888;">유사도 점수의 가중치입니다. 기본값 1.</span>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">🧠 기억</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">최대 토큰 용량</span>
          <input class="hp-input" type="number" id="hp-max-tokens" value="${maxMemoryTokens}" min="100" max="10000" step="50" style="width:100px;">
          <span style="font-size:12px;color:#888;">장기기억에 할당되는 최대 토큰 수. 추정치이며, 실제 토큰 수와 다를 수 있습니다.</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">최근 노드 캐시</span>
          <label class="hp-toggle">
            <input type="checkbox" id="hp-recent-node-cache" ${recentNodeCache ? "checked" : ""}>
            <span class="slider"></span>
          </label>
          <span style="font-size:12px;color:#888;">최근 노드를 [HypaPlus.cached]로 주입하고 임베딩/메모리에서 제외합니다</span>
        </div>
        <div class="hp-row">
          <span class="hp-label">캐시할 노드 수</span>
          <input class="hp-input" type="number" id="hp-recent-node-cache-count" value="${recentNodeCacheCount}" min="1" max="100" style="width:100px;">
          <span style="font-size:12px;color:#888;">최근(시간순) 노드 중 캐시할 개수</span>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">🖥️ 인터페이스</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">GUI 아이콘 버튼 표시</span>
          <label class="hp-toggle">
            <input type="checkbox" id="hp-show-gui-button" ${showGuiButton ? "checked" : ""}>
            <span class="slider"></span>
          </label>
          <span style="font-size:12px;color:#888;">기본 채팅창에 HypaPlus GUI 버튼을 표시합니다</span>
        </div>
      </div>

      <button class="hp-btn primary" id="hp-save-settings" style="margin-top:12px;">💾 설정 저장</button>

      <h3 style="margin-top:20px;">⚡ 동작</h3>
      <div class="hp-card">
        <button class="hp-btn primary" id="hp-force-summarize2">📋 수동 요약 (미요약 ${pendingMessages.length}개)</button>
        <button class="hp-btn secondary" id="hp-preview-query">👁️ 검색 입력 미리보기</button>
        <button class="hp-btn secondary" id="hp-test-embedding">🧪 임베딩 테스트</button>
        <button class="hp-btn danger" id="hp-clear-memory2">🗑️ 모든 기억 제거</button>
      </div>
    </div>`;
  }

  // ── Panel: Presets ───────────────────────────────────────────────────────

  function renderPresetsPanel() {
    return `
    <div class="hp-panel${activeTab === "presets" ? " active" : ""}" data-panel="presets">
      <h3>💾 프리셋</h3>
      <p style="font-size:12px;color:#888;">요약 프리셋(프롬프트, 청크 크기, user 메시지 포함 여부, 임베딩 메시지 개수)을 저장하거나 불러옵니다.</p>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">💾 현재 설정을 프리셋으로 저장</h4>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">Preset Name</span>
          <input class="hp-input" type="text" id="hp-preset-name" placeholder="My Preset" style="width:200px;">
        </div>
        <button class="hp-btn primary" id="hp-save-preset">💾 프리셋 이름</button>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📥 하이파에서 불러오기</h4>
      <div class="hp-card">
        <p style="font-size:12px;color:#888;">하이파 JSON 프리셋 파일을 선택하세요.</p>
        <input type="file" id="hp-import-file" accept=".json" style="color:#ddd;font-size:13px;">
        <button class="hp-btn primary" id="hp-import-preset" style="margin-top:8px;">📥 불러오기</button>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📂 저장된 프리셋</h4>
      <div id="hp-preset-list"><span style="color:#888;font-size:13px;">Loading...</span></div>
    </div>`;
  }

  // ── Panel: Regex ─────────────────────────────────────────────────────────

  function renderRegexPanel() {
    return `
    <div class="hp-panel${activeTab === "regex" ? " active" : ""}" data-panel="regex">
      <h3>🔧 정규식 관리</h3>
      ${renderMemoryCleanupSettings()}
      <p style="font-size:12px;color:#888;">메인 프리셋, 채팅방 정규식, 모듈 정규식에서 리퀘스트 데이터 수정 정규식을 불러옵니다. (선택)</p>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">✅ 활성 정규식 현황</h4>
      <div class="hp-card">
        <div style="font-size:13px;">
          <span style="color:#888;">메인 프리셋:</span>
          <b id="hp-active-preset-name" style="color:#4a6cf7;">${activeRegexPresetName || "(none)"}</b>
          <span style="color:#888;margin-left:12px;">채팅방 정규식:</span>
          <b style="color:#27ae60;">${state.chatRegex.length}개 활성화</b>
          <span style="color:#888;margin-left:12px;">모듈 정규식:</span>
          <b style="color:#dfb882;">${moduleRegexCache.length}개 자동 감지</b>
        </div>
      </div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📂 메인 정규식 프리셋 (글로벌)</h4>
      <div class="hp-card">
        <p style="font-size:12px;color:#888;">메인 채팅 프롬프트 정규식을 JSON 파일로 다운로드하여 여기에 업로드하세요.</p>
        <div class="hp-row">
          <span class="hp-label">프리셋 이름</span>
          <input class="hp-input" type="text" id="hp-regex-preset-name" placeholder="My Regex Preset" style="width:200px;">
        </div>
        <input type="file" id="hp-regex-import-file" accept=".json" style="color:#ddd;font-size:13px;margin:6px 0;">
        <button class="hp-btn primary" id="hp-regex-import-preset" style="margin-top:4px;">📥 프리셋 불러오기</button>
      </div>
      <div id="hp-regex-preset-list"><span style="color:#888;font-size:13px;">Loading...</span></div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">💬 채팅방 정규식 (읽기 전용)</h4>
      <div class="hp-card">
        <p style="font-size:12px;color:#888;">채팅방 설정의 정규식을 JSON 파일로 다운로드하여 여기에 업로드하세요. 바꾸려면 다시 업로드하세요.</p>
        <input type="file" id="hp-chat-regex-file" accept=".json" style="color:#ddd;font-size:13px;margin:6px 0;">
        <button class="hp-btn primary" id="hp-chat-regex-upload" style="margin-top:4px;">📤 업로드 / 바꾸기</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">${state.chatRegex.length}개 정규식 감지됨</span>
      </div>
      <div id="hp-chat-regex-list"></div>

      <h4 style="margin:16px 0 8px;color:#4a6cf7;">📦 모듈 정규식 (읽기 전용, 자동 감지)</h4>
      <div class="hp-card">
        <p style="font-size:12px;color:#888;">활성화된 모듈에서 리퀘스트 데이터 수정 정규식을 자동으로 감지합니다. 정규식이 보이지 않으면 새로고침하세요.</p>
        <button class="hp-btn secondary" id="hp-refresh-module-regex">🔄 새로고침</button>
        <span style="font-size:12px;color:#888;margin-left:8px;">${moduleRegexCache.length}개 정규식 캐시됨</span>
      </div>
      <div id="hp-module-regex-list"></div>
      <p style="font-size:12px;color:#aaa;">기억에는 일반 정규식만 적용합니다. 조건문·변수·포켓리스 전용 명령은 건너뛰며, 저장 원문은 바꾸지 않습니다.</p>
    </div>`;
  }

  // ── Panel: Prompt ────────────────────────────────────────────────────────

  function renderPromptPanel() {
    return `
    <div class="hp-panel${activeTab === "prompt" ? " active" : ""}" data-panel="prompt">
      <h3>📝 요약 프롬프트</h3>
      <p style="font-size:12px;color:#888;">챗 메시지는 <code>{{slot}}</code> 에 들어갑니다.</p>
      <textarea class="hp-textarea" id="hp-prompt-textarea" style="height:400px;">${escapeHtml(summaryPrompt)}</textarea>
      <div style="margin-top:8px;">
        <button class="hp-btn primary" id="hp-save-prompt">💾 프롬프트 저장</button>
        <button class="hp-btn secondary" id="hp-reset-prompt">🔄 기본값으로 초기화</button>
      </div>

      <h3 style="margin-top:24px;">🏷️ 컨텍스트 출력 포맷</h3>
      <p style="font-size:12px;color:#888;">
        출력 템플릿입니다. 아래 플레이스홀더가 실제 값으로 치환됩니다:<br>
        <code>[[time]]</code> = 시간, <code>[[location]]</code> = 장소, <code>[[characters]]</code> = 인물, <code>[[content]]</code> = 내용, <code>[[dialogues]]</code> = 대사<br>
        빈 필드는 자동으로 정리됩니다.
      </p>
      <div class="hp-card">
        <div class="hp-row">
          <span class="hp-label">이벤트 포맷</span>
        </div>
        <textarea class="hp-textarea" id="hp-event-format" style="height:80px;">${escapeHtml(eventFormat)}</textarea>
        <div class="hp-row">
          <span class="hp-label">사실 포맷</span>
        </div>
        <textarea class="hp-textarea" id="hp-facts-format" style="height:80px;">${escapeHtml(factsFormat)}</textarea>
        <button class="hp-btn primary" id="hp-save-format-labels" style="margin-top:8px;">💾 포맷 저장</button>
        <button class="hp-btn secondary" id="hp-reset-format-labels" style="margin-top:8px;">🔄 기본값으로 초기화</button>
      </div>
    </div>`;
  }

  // ── Edit Overlay ─────────────────────────────────────────────────────────

  function renderEditOverlay() {
    const node = findNodeById(editingNodeId);
    if (!node) return "";

    const dialoguesText = node.dialogues
      ? node.dialogues.map((d) => `${d.speaker}: "${d.text}"`).join("\n")
      : "";

    return `
    <div class="hp-edit-overlay" id="hp-edit-overlay">
      <div class="hp-edit-box">
        <h3>✏️ 노드 수정</h3>
        <div class="hp-row">
          <span class="hp-label">종류</span>
          <select class="hp-select" id="hp-edit-type">
            <option value="event" ${node.type === "event" ? "selected" : ""}>Event</option>
            <option value="facts" ${node.type === "facts" ? "selected" : ""}>Facts</option>
          </select>
        </div>
        <div class="hp-row">
          <span class="hp-label">시간</span>
          <input class="hp-input" id="hp-edit-time" value="${escapeHtml(node.time)}">
        </div>
        <div class="hp-row">
          <span class="hp-label">위치</span>
          <input class="hp-input" id="hp-edit-location" value="${escapeHtml(_nullishCoalesce(node.location, () => ( "")))}" placeholder="(optional)">
        </div>
        <div class="hp-row">
          <span class="hp-label">인물</span>
          <input class="hp-input" id="hp-edit-characters" value="${escapeHtml(node.characters.join(", "))}" placeholder="쉼표로 구분">
        </div>
        <div class="hp-row">
          <span class="hp-label">내용</span>
          <textarea class="hp-textarea" id="hp-edit-content" style="height:120px;">${escapeHtml(node.content)}</textarea>
        </div>
        <div class="hp-row">
          <span class="hp-label">대사</span>
          <textarea class="hp-textarea" id="hp-edit-dialogues" style="height:80px;" placeholder="발화자: &quot;대사&quot;&#10;한 줄에 하나씩">${escapeHtml(dialoguesText)}</textarea>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
          <button class="hp-btn secondary" id="hp-edit-cancel">취소</button>
          <button class="hp-btn primary" id="hp-edit-save">💾 저장</button>
        </div>
      </div>
    </div>`;
  }

  // ── Create Node Overlay ──────────────────────────────────────────────────

  function renderCreateNodeOverlay() {
    const now = nowTimeString();
    return `
    <div class="hp-edit-overlay" id="hp-create-overlay">
      <div class="hp-edit-box">
        <h3>➕ 수동 노드 추가</h3>
        <p style="font-size:12px;color:#888;">이 노드는 가상의 '청크 0'에 저장되며, 자동 요약과 무관하게 유지됩니다.</p>
        <div class="hp-row">
          <span class="hp-label">종류</span>
          <select class="hp-select" id="hp-create-type">
            <option value="event" selected>Event</option>
            <option value="facts">Facts</option>
          </select>
        </div>
        <div class="hp-row">
          <span class="hp-label">시간</span>
          <input class="hp-input" id="hp-create-time" value="${escapeHtml(now)}">
        </div>
        <div class="hp-row">
          <span class="hp-label">위치</span>
          <input class="hp-input" id="hp-create-location" placeholder="(선택)">
        </div>
        <div class="hp-row">
          <span class="hp-label">인물</span>
          <input class="hp-input" id="hp-create-characters" placeholder="쉼표로 구분">
        </div>
        <div class="hp-row">
          <span class="hp-label">내용</span>
          <textarea class="hp-textarea" id="hp-create-content" style="height:120px;" placeholder="노드 내용을 입력하세요..."></textarea>
        </div>
        <div class="hp-row">
          <span class="hp-label">대사</span>
          <textarea class="hp-textarea" id="hp-create-dialogues" style="height:80px;" placeholder='발화자: "대사"&#10;한 줄에 하나씩 (선택)'></textarea>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
          <button class="hp-btn secondary" id="hp-create-cancel">취소</button>
          <button class="hp-btn primary" id="hp-create-save">💾 저장</button>
        </div>
      </div>
    </div>`;
  }

  // ── Summarize Dialog ─────────────────────────────────────────────────────

  function renderSummarizeDialog(pendingMessages) {
    const totalPending = pendingMessages.length;
    const maxChunks = Math.max(1, Math.floor(totalPending / chunkSize));
    const defaultChunks = Math.min(1, maxChunks);
    const window = pendingMessages.slice(0, chunkSize);
    const displayPending = includeUserMessages ? window : window.filter((m) => m.role !== "user");
    const previewCount = displayPending.length;

    let previewHtml = "";
    for (let i = 0; i < previewCount; i++) {
      const msg = displayPending[i];
      const roleLabel = msg.role === "user" ? "👤" : "🤖";
      const preview = msg.content.length > 150 ? msg.content.slice(0, 150) + "..." : msg.content;
      previewHtml += `<div style="padding:4px 0;border-bottom:1px solid #222;font-size:12px;">
        <span style="color:#4a6cf7;">[${i + 1}]</span> <b>${roleLabel}</b>: ${escapeHtml(preview)}
      </div>`;
    }

    return `
    <div class="hp-edit-overlay" id="hp-summarize-overlay">
      <div class="hp-edit-box" style="max-width:700px;">
        <h3>📋 수동 메시지 요약</h3>
        <p style="font-size:13px;color:#888;">미요약 메시지 ${totalPending}개 (${chunkSize}개 메시지가 포함된 청크 ${maxChunks}개를 만들 수 있습니다).</p>
        <div class="hp-row">
          <span class="hp-label">요약할 청크 수</span>
          <input class="hp-input" type="number" id="hp-summarize-chunks" value="${defaultChunks}" min="1" max="${maxChunks}" style="width:100px;">
          <span style="font-size:12px;color:#888;">/ ${maxChunks} 청크 (각 메시지 ${chunkSize}개)</span>
        </div>
        <div style="margin:8px 0;">
          <strong style="font-size:13px;">📝 미리보기 (첫 ${chunkSize}개 메시지 중 ${previewCount}개 보기)</strong>
          <div style="max-height:300px;overflow-y:auto;margin-top:4px;background:#0a0a0a;padding:8px;border-radius:4px;">
            ${previewHtml}
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
          <button class="hp-btn secondary" id="hp-summarize-cancel">취소</button>
          <button class="hp-btn primary" id="hp-summarize-confirm">📋 요약</button>
        </div>
      </div>
    </div>`;
  }

  // ── Custom Confirm Dialog (iframe-safe) ─────────────────────────────────

  function showConfirmDialog(msg) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "hp-edit-overlay";
      overlay.innerHTML = `
        <div class="hp-edit-box" style="max-width:450px;text-align:center;">
          <p style="font-size:14px;margin:12px 0;color:#ddd;">${msg}</p>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
            <button class="hp-btn danger" id="hp-confirm-yes">예</button>
            <button class="hp-btn secondary" id="hp-confirm-no">아니오</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector("#hp-confirm-yes").addEventListener("click", () => {
        overlay.remove();
        resolve(true);
      });
      overlay.querySelector("#hp-confirm-no").addEventListener("click", () => {
        overlay.remove();
        resolve(false);
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });
    });
  }

  // ── Event Binding ────────────────────────────────────────────────────────

  function attachUIEvents(pendingMessages) {
    // Helper: wrap async handlers with error boundary
    function safeAsync(fn, context) {
      return async () => {
        try {
          await fn();
        } catch (e) {
          console.error(`[HypaPlus] UI error (${context}):`, e);
          alert(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
      };
    }

    // Close button
    const closeBtn = document.getElementById("hp-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        risuai.hideContainer();
      });
    }

    // Tab switching
    document.querySelectorAll(".hp-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        activeTab = (tab ).dataset.tab;
        nodeListPage = 0;
        uiScrollTop = 0;
        editingNodeId = null;
        renderUI();
      });
    });

    // Pagination
    document.querySelectorAll("[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt((btn ).dataset.page);
        if (!isNaN(page)) {
          nodeListPage = page;
          renderUI();
        }
      });
    });

    // Node search (IME-safe: only re-render when composition ends)
    const searchInput = document.getElementById("hp-node-search") ;
    if (searchInput) {
      const doSearch = () => {
        nodeSearchQuery = searchInput.value.trim();
        nodeListPage = 0;
        // Save cursor position before re-render destroys the DOM
        nodeSearchSelStart = searchInput.selectionStart;
        nodeSearchSelEnd = searchInput.selectionEnd;
        nodeSearchShouldFocus = true;
        renderUI();
      };
      searchInput.addEventListener("compositionstart", () => {
        nodeSearchComposing = true;
      });
      searchInput.addEventListener("compositionend", () => {
        nodeSearchComposing = false;
        doSearch();
      });
      searchInput.addEventListener("input", () => {
        if (!nodeSearchComposing) {
          doSearch();
        }
      });
      // Restore cursor position after re-render
      if (nodeSearchSelStart !== null && nodeSearchSelEnd !== null) {
        searchInput.setSelectionRange(nodeSearchSelStart, nodeSearchSelEnd);
      } else {
        // Place cursor at end on initial focus
        const len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);
      }
      if (nodeSearchShouldFocus) {
        searchInput.focus({ preventScroll: true });
        nodeSearchShouldFocus = false;
      }
    }
    const searchClearBtn = document.getElementById("hp-node-search-clear");
    if (searchClearBtn) {
      searchClearBtn.addEventListener("click", () => {
        nodeSearchQuery = "";
        nodeListPage = 0;
        renderUI();
      });
    }

    const includedFilterBtn = document.getElementById("hp-filter-included-nodes");
    if (includedFilterBtn) {
      includedFilterBtn.addEventListener("click", () => {
        showIncludedNodesOnly = !showIncludedNodesOnly;
        if (showIncludedNodesOnly) showFavoriteNodesOnly = false;
        nodeListPage = 0;
        renderUI();
      });
    }

    const favoriteFilterBtn = document.getElementById("hp-filter-favorite-nodes");
    if (favoriteFilterBtn) {
      favoriteFilterBtn.addEventListener("click", () => {
        showFavoriteNodesOnly = !showFavoriteNodesOnly;
        if (showFavoriteNodesOnly) showIncludedNodesOnly = false;
        nodeListPage = 0;
        renderUI();
      });
    }

    const nodeSortBtn = document.getElementById("hp-toggle-node-sort");
    if (nodeSortBtn) {
      nodeSortBtn.addEventListener("click", () => {
        nodeSortDirection = nodeSortDirection === "asc" ? "desc" : "asc";
        nodeListPage = 0;
        renderUI();
      });
    }

    // Force summarize (both buttons) — opens dialog with warning
    document.querySelectorAll("#hp-force-summarize, #hp-force-summarize2").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          if (pendingMessages.length === 0) {
            alert("No pending messages to summarize.");
            return;
          }
          const ok = await showConfirmDialog(
            "⚠️ 수동 요약을 실행하는 동안 <b>다른 채팅방에 들어가지 마세요.</b> 데이터가 섞일 수 있습니다.<br><br>계속하시겠습니까?",
          );
          if (!ok) return;
          showSummarizeDialog = true;
          renderUI();
        }, "force-summarize"),
      );
    });

    // Create node button
    const createNodeBtn = document.getElementById("hp-create-node");
    if (createNodeBtn) {
      createNodeBtn.addEventListener("click", () => {
        showCreateNodeDialog = true;
        renderUI();
      });
    }

    // Auto Summarize button — runs summarization in a loop until pending < threshold
    const autoSummarizeBtn = document.getElementById("hp-auto-summarize-btn");
    if (autoSummarizeBtn) {
      autoSummarizeBtn.addEventListener(
        "click",
        safeAsync(async () => {
          if (pendingMessages.length === 0) {
            alert("No pending messages to summarize.");
            return;
          }
          const ok = await showConfirmDialog(
            "미요약 구간을 순서대로 요약합니다. 요약 API가 호출되며, 실패하거나 채팅이 바뀌면 중단합니다.<br><br>계속하시겠습니까?",
          );
          if (!ok) return;
          autoSummarizeBtn.textContent = "⏳ Summarizing...";
          (autoSummarizeBtn ).disabled = true;
          try {
            let loopCount = 0;
            const maxLoops = 50; // safety limit
            while (loopCount < maxLoops) {
              const pending = await getPendingMessages();
              if (pending.length < autoSummarizeThreshold) break;
              if (!await runSummarization()) break;
              loopCount++;
            }
          } finally {
            renderUI();
          }
        }, "auto-summarize"),
      );
    }

    // Backup download
    const backupDownloadBtn = document.getElementById("hp-backup-download");
    if (backupDownloadBtn) {
      backupDownloadBtn.addEventListener("click", () => {
        if (getNodes().length === 0 && state.chunks.length === 0) {
          alert("No data to backup. Chat more to generate summaries first!");
          return;
        }
        downloadBackup();
      });
    }

    // Backup restore — trigger file picker
    const backupRestoreBtn = document.getElementById("hp-backup-restore");
    const restoreFileInput = document.getElementById("hp-restore-file") ;
    if (backupRestoreBtn && restoreFileInput) {
      backupRestoreBtn.addEventListener("click", () => {
        restoreFileInput.click();
      });
      restoreFileInput.addEventListener(
        "change",
        safeAsync(async () => {
          const file = _optionalChain([restoreFileInput, 'access', _40 => _40.files, 'optionalAccess', _41 => _41[0]]);
          if (!file) return;
          try {
            const json = await file.text();
            const backup = parseBackupFile(json);
            if (!backup) {
              alert("유효한 HypaPlus JSON 백업 파일이 아닙니다.");
              return;
            }
            const nodeCount = backup.chunks.reduce((sum, c) => sum + c.nodes.length, 0);
            const chunkCount = backup.chunks.length;
            const ok = await showConfirmDialog(
              `백업을 불러옵니까?\n\n• 노드 ${nodeCount}개\n• 청크 ${chunkCount}개\n\n⚠️ 이 작업은 모든 노드와 청크를 덮어씌웁니다.`,
            );
            if (!ok) return;
            await restoreFromBackup(backup);
            nodeListPage = 0;
            alert(`노드 ${nodeCount}개와 청크 ${chunkCount}개를 불러왔습니다!`);
            renderUI();
          } catch (_) {
            alert("백업 파일을 읽을 수 없습니다.");
          } finally {
            // Reset file input so the same file can be re-selected
            restoreFileInput.value = "";
          }
        }, "backup-restore"),
      );
    }

    // Clear memory (both buttons) — custom confirm (iframe-safe)
    document.querySelectorAll("#hp-clear-memory, #hp-clear-memory2").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          const ok1 = await showConfirmDialog(
            "⚠️ 모든 요약 노드와 청크를 지웁니까? 이 동작은 되돌릴 수 없습니다.",
          );
          if (!ok1) return;
          const ok2 = await showConfirmDialog("⚠️ 정말 확실합니까? 모든 요약 데이터가 지워집니다.");
          if (!ok2) return;
          state = createEmptyState();
          await saveState();
          nodeListPage = 0;
          renderUI();
        }, "clear-memory"),
      );
    });

    // Favorite node toggle
    document.querySelectorAll(".hp-fav-node").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          // saveState is asynchronous; preserve the exact list position from
          // before it yields so re-rendering cannot jump to the top.
          const body = document.getElementById("hp-body");
          const scrollTop = body ? body.scrollTop : uiScrollTop;
          const nodeId = (btn ).dataset.nodeId;
          const node = findNodeById(nodeId);
          if (!node) return;
          node.favorite = !node.favorite;
          await saveState();
          renderUI(scrollTop);
        }, "fav-node"),
      );
    });

    // Edit node
    document.querySelectorAll(".hp-edit-node").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingNodeId = (btn ).dataset.nodeId;
        renderUI();
      });
    });

    // Delete node — custom confirm
    document.querySelectorAll(".hp-delete-node").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          const nodeId = (btn ).dataset.nodeId;
          const ok = await showConfirmDialog("이 노드를 지웁니까?");
          if (!ok) return;
          removeNodeById(nodeId);
          await saveState();
          renderUI();
        }, "delete-node"),
      );
    });

    // Save a chunk memo without rebuilding or re-summarizing the chunk.
    document.querySelectorAll(".hp-save-chunk-memo").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          const chunkId = (btn ).dataset.chunkId;
          const chunk = state.chunks.find((c) => c.id === chunkId);
          const memoInput = document.querySelector(
            `.hp-chunk-memo[data-chunk-id="${chunkId}"]`,
          ) ;
          if (!chunk || !memoInput) return;
          chunk.memo = memoInput.value;
          await saveState();
          renderUI();
        }, "save-chunk-memo"),
      );
    });

    // Reroll chunk — custom confirm
    document.querySelectorAll(".hp-reroll-chunk").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          const chunkId = (btn ).dataset.chunkId;
          const chunk = state.chunks.find((c) => c.id === chunkId);
          if (!chunk) return;
          const ok = await showConfirmDialog(`이 청크를 다시 요약하겠습니까?`);
          if (!ok) return;
          await reSummarizeChunk(chunkId);
          renderUI();
        }, "reroll-chunk"),
      );
    });

    // Delete chunk — custom confirm
    document.querySelectorAll(".hp-delete-chunk").forEach((btn) => {
      btn.addEventListener(
        "click",
        safeAsync(async () => {
          const chunkId = (btn ).dataset.chunkId;
          const chunk = state.chunks.find((c) => c.id === chunkId);
          if (!chunk) return;
          const ok = await showConfirmDialog(
            `이 청크와, 연결된 노드 ${chunk.nodes.length}개를 지웁니까?`,
          );
          if (!ok) return;

          const nodeIds = new Set(chunk.nodes.map((n) => n.id));
          removeNodesByIds(nodeIds);
          state.chunks = state.chunks.filter((c) => c.id !== chunkId);
          recomputeLastSummarizedMsgIndex();

          await saveState();
          renderUI();
        }, "delete-chunk"),
      );
    });

    // Both views read raw source again; preprocessing never changes stored text.
    document.querySelectorAll(".hp-view-chunk-msgs, .hp-view-processed-msgs").forEach(btn => {
      btn.addEventListener("click", safeAsync(async () => {
        const chunk = state.chunks.find(c => c.id === btn.dataset.chunkId);
        if (!chunk) return;
        const context = summaryContext();
        const all = await readChatMessagesRaw(true);
        const byId = new Map(all.map(m => [m.chatId, m]));
        const processed = btn.classList.contains("hp-view-processed-msgs");
        const ids = processed ? chunk.chatIds : getChunkCoverageIds(chunk);
        if (ids.includes(FIRST_MESSAGE_CHAT_ID)) {
          const first = await fetchFirstMessage();
          if (first) byId.set(FIRST_MESSAGE_CHAT_ID, { ...first, chatId: FIRST_MESSAGE_CHAT_ID });
        }
        if (!isSummaryContextCurrent(context)) return;
        const messages = ids.filter(id => byId.has(id)).map(id => ({ ...byId.get(id) }));
        if (!messages.length) { alert("연결된 원문을 찾을 수 없습니다."); return; }
        const missing = ids.length - messages.length;
        const title = (processed ? "기억에 사용할 내용" : "저장 원문") +
          (missing ? ` · 찾을 수 없는 메시지 ${missing}개` : "");
        if (processed) {
          const prepared = await prepareMemoryMessages(messages);
          if (isSummaryContextCurrent(context)) showMemoryPreview(title, prepared.messages, prepared.skipped, false, prepared.cleanup);
        } else showMemoryPreview(title, messages);
      }, "view-chunk-source"));
    });

    document.querySelectorAll(".hp-accept-empty-chunk").forEach(btn => {
      btn.addEventListener("click", safeAsync(async () => {
        if (isSummarizing) return;
        const context = summaryContext();
        const ok = await showConfirmDialog("이 구간에 남길 기억이 없음을 확인하고 완료 처리합니까? 이후 이 구간의 원문은 본문 문맥에서 제외될 수 있습니다. API는 호출하지 않습니다.");
        if (!ok || !isSummaryContextCurrent(context)) return;
        if (!await acceptEmptyChunk(btn.dataset.chunkId)) alert("완료 처리하지 못했습니다. 연결된 원문을 확인해 주세요.");
        renderUI();
      }, "accept-empty-chunk"));
    });

    const queryPreviewBtn = document.getElementById("hp-preview-query");
    if (queryPreviewBtn) queryPreviewBtn.addEventListener("click", safeAsync(async () => {
      const context = summaryContext();
      const all = await readChatMessagesRaw(true);
      const prepared = await prepareMemoryMessages(all.slice(-Math.max(1, embeddingContextMessages)));
      if (isSummaryContextCurrent(context)) showMemoryPreview("검색에 사용할 입력", prepared.messages, prepared.skipped, true, prepared.cleanup);
    }, "preview-query"));

    const cleanupSaveBtn = document.getElementById("hp-save-html-cleanup");
    if (cleanupSaveBtn) cleanupSaveBtn.addEventListener("click", safeAsync(async () => {
      const input = document.getElementById("hp-excluded-html-classes");
      const status = document.getElementById("hp-html-cleanup-status");
      let classes;
      try { classes = parseExcludedHtmlClasses(input.value); }
      catch (error) { status.textContent = error.message; return; }
      cleanupSaveBtn.disabled = true;
      try {
        await risuai.pluginStorage.setItem(MEMORY_CLEANUP_STORAGE_KEY, { excludedHtmlClasses: classes });
        memoryExcludedHtmlClasses = classes;
        status.textContent = "저장했습니다. 다음 기억 입력부터 적용됩니다.";
      } catch (_) {
        status.textContent = "저장하지 못했습니다. 기존 설정을 유지합니다.";
      } finally { cleanupSaveBtn.disabled = false; }
    }, "save-html-cleanup"));
    const cleanupDefaultBtn = document.getElementById("hp-default-html-cleanup");
    if (cleanupDefaultBtn) cleanupDefaultBtn.addEventListener("click", () => {
      document.getElementById("hp-excluded-html-classes").value = DEFAULT_EXCLUDED_HTML_CLASSES.join("\n");
      document.getElementById("hp-html-cleanup-status").textContent = "기본값을 채웠습니다. 저장하면 적용됩니다.";
    });


    // Test Embedding button — runs full retrieval and displays scores
    const testEmbBtn = document.getElementById("hp-test-embedding");
    if (testEmbBtn) {
      testEmbBtn.addEventListener(
        "click",
        safeAsync(async () => {
          if (!embeddingUrl) {
            alert("No embedding URL configured. Set it in Settings first.");
            return;
          }
          // Build query from recent messages
          const query = await buildEmbeddingQuery();
          if (!query) {
            alert("No chat messages available to build embedding query.");
            return;
          }

          // Run retrieval
          await retrieveRelevantNodes(query, getLatestNodeTime(), maxMemoryTokens);

          // Switch to nodes tab to show results
          activeTab = "nodes";
          renderUI();
        }, "test-embedding"),
      );
    }

    // Summarize dialog: cancel
    const summarizeCancelBtn = document.getElementById("hp-summarize-cancel");
    if (summarizeCancelBtn) {
      summarizeCancelBtn.addEventListener("click", () => {
        showSummarizeDialog = false;
        renderUI();
      });
    }

    // Summarize dialog: confirm
    const summarizeConfirmBtn = document.getElementById("hp-summarize-confirm");
    if (summarizeConfirmBtn) {
      summarizeConfirmBtn.addEventListener(
        "click",
        safeAsync(async () => {
          const numChunks =
            parseInt((document.getElementById("hp-summarize-chunks") ).value) ||
            1;
          showSummarizeDialog = false;
          renderUI();
          for (let i = 0; i < numChunks; i++) {
            if (!await runSummarization(chunkSize)) break;
          }
          renderUI();
        }, "summarize-confirm"),
      );
    }

    // Edit overlay: cancel
    const cancelBtn = document.getElementById("hp-edit-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        editingNodeId = null;
        renderUI();
      });
    }

    // Edit overlay: save
    const saveBtn = document.getElementById("hp-edit-save");
    if (saveBtn) {
      saveBtn.addEventListener(
        "click",
        safeAsync(async () => {
          const node = findNodeById(editingNodeId);
          if (!node) return;

          node.type = (document.getElementById("hp-edit-type") ).value 

;
          node.time = normalizeTimeString(
            (document.getElementById("hp-edit-time") ).value,
          );
          node.location =
            (document.getElementById("hp-edit-location") ).value.trim() ||
            undefined;
          node.characters = (
            document.getElementById("hp-edit-characters") 
          ).value
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          node.content = (
            document.getElementById("hp-edit-content") 
          ).value.trim();

          const dialoguesRaw = (
            document.getElementById("hp-edit-dialogues") 
          ).value.trim();
          if (dialoguesRaw) {
            const lines = dialoguesRaw.split("\n").filter(Boolean);
            node.dialogues = [];
            for (const line of lines) {
              const m = line.match(/^(.+?)\s*:\s*"(.+)"$/);
              if (m) {
                node.dialogues.push({ speaker: m[1].trim(), text: m[2].trim() });
              }
            }
            if (node.dialogues.length === 0) node.dialogues = undefined;
          } else {
            node.dialogues = undefined;
          }

          // The embedding text includes all editable node fields, so the old
          // vector must never be reused after an edit.
          clearNodeEmbedding(node);
          await saveState();
          editingNodeId = null;
          renderUI();
        }, "edit-save"),
      );
    }

    // Create node overlay: cancel
    const createCancelBtn = document.getElementById("hp-create-cancel");
    if (createCancelBtn) {
      createCancelBtn.addEventListener("click", () => {
        showCreateNodeDialog = false;
        renderUI();
      });
    }

    // Create node overlay: save
    const createSaveBtn = document.getElementById("hp-create-save");
    if (createSaveBtn) {
      createSaveBtn.addEventListener(
        "click",
        safeAsync(async () => {
          const type = (document.getElementById("hp-create-type") ).value 

;
          const time = normalizeTimeString(
            (document.getElementById("hp-create-time") ).value,
          );
          const location =
            (document.getElementById("hp-create-location") ).value.trim() ||
            undefined;
          const characters = (
            document.getElementById("hp-create-characters") 
          ).value
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          const content = (
            document.getElementById("hp-create-content") 
          ).value.trim();

          if (!time || !content) {
            alert("시간과 내용은 필수 입력 항목입니다.");
            return;
          }

          const dialoguesRaw = (
            document.getElementById("hp-create-dialogues") 
          ).value.trim();
          let dialogues;
          if (dialoguesRaw) {
            const lines = dialoguesRaw.split("\n").filter(Boolean);
            dialogues = [];
            for (const line of lines) {
              const m = line.match(/^(.+?)\s*:\s*"(.+)"$/);
              if (m) {
                dialogues.push({ speaker: m[1].trim(), text: m[2].trim() });
              }
            }
            if (dialogues.length === 0) dialogues = undefined;
          }

          const node = {
            id: nextNodeId(),
            type,
            time,
            location,
            characters,
            content,
            dialogues,
            createdAt: Date.now(),
          };

          const manualChunk = getOrCreateManualChunk();
          manualChunk.nodes.push(node);

          await saveState();
          showCreateNodeDialog = false;
          renderUI();
        }, "create-save"),
      );
    }

    // Settings: save
    const saveSettingsBtn = document.getElementById("hp-save-settings");
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener(
        "click",
        safeAsync(async () => {
          chunkSize =
            parseInt((document.getElementById("hp-chunk-size") ).value) ||
            DEFAULT_CHUNK_SIZE;
          maxMemoryTokens =
            parseInt((document.getElementById("hp-max-tokens") ).value) ||
            DEFAULT_MAX_MEMORY_TOKENS;
          autoSummarize = (document.getElementById("hp-auto-summarize") )
            .checked;
          includeUserMessages = (document.getElementById("hp-include-user") )
            .checked;
          autoSummarizeThreshold =
            parseInt((document.getElementById("hp-auto-threshold") ).value) ||
            chunkSize;
          embeddingUrl = (
            document.getElementById("hp-embedding-url") 
          ).value.trim();
          embeddingModel = (
            document.getElementById("hp-embedding-model") 
          ).value.trim();
          timeDecayDays =
            parseInt((document.getElementById("hp-time-decay") ).value) || 15;
          timeScoringMode = (document.getElementById("hp-time-scoring-mode") )
            .value ;
          timeWeight =
            parseFloat((document.getElementById("hp-time-weight") ).value) ||
            1.0;
          similarityWeight =
            parseFloat(
              (document.getElementById("hp-similarity-weight") ).value,
            ) || 1.0;
          embeddingApiKey = (
            document.getElementById("hp-embedding-api-key") 
          ).value.trim();
          embeddingContextMessages =
            parseInt((document.getElementById("hp-embedding-context") ).value) ||
            5;
          recentNodeCache = (document.getElementById("hp-recent-node-cache") )
            .checked;
          recentNodeCacheCount =
            parseInt(
              (document.getElementById("hp-recent-node-cache-count") ).value,
            ) || 10;
          showGuiButton = (document.getElementById("hp-show-gui-button") )
            .checked;

          await risuai.setArgument("chunk_size", chunkSize);
          await risuai.setArgument("max_memory_tokens", maxMemoryTokens);
          await risuai.setArgument("auto_summarize", autoSummarize ? "true" : "false");
          await risuai.setArgument("include_user_messages", includeUserMessages ? "true" : "false");
          await risuai.setArgument("auto_summarize_threshold", autoSummarizeThreshold);
          await risuai.setArgument("embedding_url", embeddingUrl);
          await risuai.setArgument("embedding_model", embeddingModel);
          await risuai.setArgument("time_decay_days", timeDecayDays);
          await risuai.setArgument("time_scoring_mode", timeScoringMode);
          await risuai.setArgument("time_weight", timeWeight);
          await risuai.setArgument("similarity_weight", similarityWeight);
          await risuai.setArgument("embedding_api_key", embeddingApiKey);
          await risuai.setArgument("embedding_context_messages", embeddingContextMessages);
          await risuai.setArgument("recent_node_cache", recentNodeCache ? "true" : "false");
          await risuai.setArgument("recent_node_cache_count", recentNodeCacheCount);

          await saveSettings();
          await syncGuiButtonRegistration();

          clearTokenCache();

          // Reload state to ensure UI reflects saved values
          await loadState();

          alert("Settings saved!");
          renderUI();
        }, "save-settings"),
      );
    }

    // Prompt: save
    const savePromptBtn = document.getElementById("hp-save-prompt");
    if (savePromptBtn) {
      savePromptBtn.addEventListener("click", async () => {
        summaryPrompt = (document.getElementById("hp-prompt-textarea") )
          .value;
        await savePrompt();
        alert("Prompt saved!");
      });
    }

    // Prompt: reset
    const resetPromptBtn = document.getElementById("hp-reset-prompt");
    if (resetPromptBtn) {
      resetPromptBtn.addEventListener("click", async () => {
        summaryPrompt = DEFAULT_SUMMARY_PROMPT;
        await savePrompt();
        renderUI();
      });
    }

    // Format labels: save
    const saveFormatLabelsBtn = document.getElementById("hp-save-format-labels");
    if (saveFormatLabelsBtn) {
      saveFormatLabelsBtn.addEventListener("click", async () => {
        eventFormat =
          (document.getElementById("hp-event-format") ).value.trim() ||
          DEFAULT_EVENT_FORMAT;
        factsFormat =
          (document.getElementById("hp-facts-format") ).value.trim() ||
          DEFAULT_FACTS_FORMAT;
        await saveSettings();
        alert("Format templates saved!");
      });
    }

    // Format labels: reset
    const resetFormatLabelsBtn = document.getElementById("hp-reset-format-labels");
    if (resetFormatLabelsBtn) {
      resetFormatLabelsBtn.addEventListener("click", async () => {
        eventFormat = DEFAULT_EVENT_FORMAT;
        factsFormat = DEFAULT_FACTS_FORMAT;
        await saveSettings();
        renderUI();
      });
    }

    // Presets: load list (async, on tab switch to presets)
    if (activeTab === "presets") {
      loadPresets().then((presets) => {
        const listEl = document.getElementById("hp-preset-list");
        if (!listEl) return;
        if (presets.length === 0) {
          listEl.innerHTML = `<span style="color:#888;font-size:13px;">저장된 프리셋이 없습니다.</span>`;
          return;
        }
        listEl.innerHTML = presets
          .map(
            (p, i) => `
          <div class="hp-card">
            <details>
              <summary style="cursor:pointer;font-size:14px;font-weight:bold;color:#ddd;">${escapeHtml(p.name)} <span style="font-size:12px;color:#888;margin-left:8px;">chunk:${p.chunkSize} user:${p.includeUserMessages ? "yes" : "no"} query:${p.embeddingContextMessages}</span></summary>
              <div style="margin-top:8px;font-size:12px;color:#aaa;">
                <div style="margin:4px 0;"><b>Chunk Size:</b> ${p.chunkSize}</div>
                <div style="margin:4px 0;"><b>Include User:</b> ${p.includeUserMessages ? "Yes" : "No"}</div>
                <div style="margin:4px 0;"><b>Query Msgs:</b> ${p.embeddingContextMessages}</div>
                <div style="margin:4px 0;"><b>Event Format:</b> <pre style="background:#0a0a0a;padding:4px;border-radius:4px;font-size:11px;white-space:pre-wrap;">${escapeHtml(p.eventFormat || DEFAULT_EVENT_FORMAT)}</pre></div>
                <div style="margin:4px 0;"><b>Facts Format:</b> <pre style="background:#0a0a0a;padding:4px;border-radius:4px;font-size:11px;white-space:pre-wrap;">${escapeHtml(p.factsFormat || DEFAULT_FACTS_FORMAT)}</pre></div>
                <div style="margin:8px 0;"><b>Prompt:</b></div>
                <pre style="background:#0a0a0a;padding:8px;border-radius:4px;font-size:11px;max-height:200px;overflow:auto;white-space:pre-wrap;">${escapeHtml(p.summaryPrompt)}</pre>
              </div>
            </details>
            <div style="margin-top:8px;display:flex;gap:6px;">
              <button class="hp-btn primary small hp-apply-preset" data-preset-idx="${i}">Apply</button>
              <button class="hp-btn danger small hp-delete-preset" data-preset-idx="${i}">🗑️</button>
            </div>
          </div>`,
          )
          .join("");

        // Bind preset actions after DOM is populated
        listEl.querySelectorAll(".hp-apply-preset").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const idx = parseInt((btn ).dataset.presetIdx);
            const presets = await loadPresets();
            if (idx < 0 || idx >= presets.length) return;
            applyPreset(presets[idx]);
            await savePrompt();
            await saveSettings();
            alert(`Preset "${presets[idx].name}" applied!`);
            renderUI();
          });
        });

        listEl.querySelectorAll(".hp-delete-preset").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const idx = parseInt((btn ).dataset.presetIdx);
            const presets = await loadPresets();
            if (idx < 0 || idx >= presets.length) return;
            const ok = await showConfirmDialog(`Delete preset "${presets[idx].name}"?`);
            if (!ok) return;
            presets.splice(idx, 1);
            await savePresets(presets);
            renderUI();
          });
        });
      });
    }

    // Presets: save (overwrites if same name exists)
    const savePresetBtn = document.getElementById("hp-save-preset");
    if (savePresetBtn) {
      savePresetBtn.addEventListener("click", async () => {
        const name = (document.getElementById("hp-preset-name") ).value.trim();
        if (!name) {
          alert("Enter a preset name.");
          return;
        }
        const presets = await loadPresets();
        const preset = currentSettingsAsPreset();
        preset.name = name;
        // Overwrite existing preset with same name
        const existingIdx = presets.findIndex((p) => p.name === name);
        if (existingIdx >= 0) {
          presets[existingIdx] = preset;
        } else {
          presets.push(preset);
        }
        await savePresets(presets);
        alert(`Preset "${name}" saved!`);
        renderUI();
      });
    }

    // Presets: import
    const importPresetBtn = document.getElementById("hp-import-preset");
    if (importPresetBtn) {
      importPresetBtn.addEventListener("click", async () => {
        const fileInput = document.getElementById("hp-import-file") ;
        const file = _optionalChain([fileInput, 'optionalAccess', _42 => _42.files, 'optionalAccess', _43 => _43[0]]);
        if (!file) {
          alert("Select a RisuAI preset JSON file first.");
          return;
        }
        try {
          const json = await file.text();
          const preset = parseRisuPreset(json);
          if (!preset) {
            alert("Invalid RisuAI preset JSON.");
            return;
          }
          const presets = await loadPresets();
          // Overwrite if same name
          const existingIdx = presets.findIndex((p) => p.name === preset.name);
          if (existingIdx >= 0) {
            presets[existingIdx] = preset;
          } else {
            presets.push(preset);
          }
          await savePresets(presets);
          alert(`Preset "${preset.name}" imported!`);
          renderUI();
        } catch (_) {
          alert("Failed to read file.");
        }
      });
    }

    // ── Regex tab handlers ───────────────────────────────────────────────

    if (activeTab === "regex") {
      // Load regex presets list
      loadRegexPresets().then((regexPresets) => {
        const listEl = document.getElementById("hp-regex-preset-list");
        if (!listEl) return;
        if (regexPresets.length === 0) {
          listEl.innerHTML = `<span style="color:#888;font-size:13px;">No regex presets saved yet.</span>`;
        } else {
          listEl.innerHTML = regexPresets
            .map(
              (rp, i) => `
            <div class="hp-card">
              <details>
                <summary style="cursor:pointer;font-size:14px;font-weight:bold;color:#ddd;">${escapeHtml(rp.name)} <span style="font-size:12px;color:#888;margin-left:8px;">${rp.entries.length} entries</span></summary>
                <div style="margin-top:8px;max-height:300px;overflow:auto;">
                  ${rp.entries
                    .map(
                      (e, j) => `
                    <div style="margin:4px 0;padding:6px;background:#0a0a0a;border-radius:4px;font-size:12px;">
                      <div style="color:#4a6cf7;font-weight:bold;">#${j + 1} ${escapeHtml(e.comment || "(no comment)")}</div>
                      <div style="color:#888;">in: <code>${escapeHtml(e.in)}</code></div>
                      <div style="color:#888;">out: <code>${escapeHtml(e.out)}</code></div>
                      <div style="color:#666;">${renderMemoryRegexStatus(e)}</div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </details>
              <div style="margin-top:8px;display:flex;gap:6px;">
                <button class="hp-btn primary small hp-activate-regex-preset" data-regex-preset-idx="${i}" ${activeRegexPresetName === rp.name ? "disabled" : ""}>${activeRegexPresetName === rp.name ? "✅ 활성화" : "▶ 활성화"}</button>
                ${activeRegexPresetName === rp.name ? `<button class="hp-btn secondary small hp-deactivate-regex-preset">⏹ 비활성화</button>` : ""}
                <button class="hp-btn danger small hp-delete-regex-preset" data-regex-preset-idx="${i}">🗑️ 삭제</button>
              </div>
            </div>
          `,
            )
            .join("");

          listEl.querySelectorAll(".hp-delete-regex-preset").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const idx = parseInt((btn ).dataset.regexPresetIdx);
              const presets = await loadRegexPresets();
              if (idx < 0 || idx >= presets.length) return;
              const ok = await showConfirmDialog(`Delete regex preset "${presets[idx].name}"?`);
              if (!ok) return;
              // If deleting the active preset, deactivate it
              if (activeRegexPresetName === presets[idx].name) {
                activeRegexPresetName = "";
                await saveActiveRegexPreset();
              }
              presets.splice(idx, 1);
              await saveRegexPresets(presets);
              renderUI();
            });
          });

          listEl.querySelectorAll(".hp-activate-regex-preset").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const idx = parseInt((btn ).dataset.regexPresetIdx);
              const presets = await loadRegexPresets();
              if (idx < 0 || idx >= presets.length) return;
              activeRegexPresetName = presets[idx].name;
              await saveActiveRegexPreset();
              renderUI();
            });
          });

          listEl.querySelectorAll(".hp-deactivate-regex-preset").forEach((btn) => {
            btn.addEventListener("click", async () => {
              activeRegexPresetName = "";
              await saveActiveRegexPreset();
              renderUI();
            });
          });
        }
      });

      // Render chat regex list
      const chatRegexList = document.getElementById("hp-chat-regex-list");
      if (chatRegexList) {
        if (state.chatRegex.length === 0) {
          chatRegexList.innerHTML = `<span style="color:#888;font-size:13px;">채팅방 정규식이 업로드되지 않았습니다.</span>`;
        } else {
          chatRegexList.innerHTML = state.chatRegex
            .map(
              (e, j) => `
            <div style="margin:4px 0;padding:6px;background:#0a0a0a;border-radius:4px;font-size:12px;">
              <div style="color:#4a6cf7;font-weight:bold;">#${j + 1} ${escapeHtml(e.comment || "(no comment)")}</div>
              <div style="color:#888;">in: <code>${escapeHtml(e.in)}</code></div>
              <div style="color:#888;">out: <code>${escapeHtml(e.out)}</code></div>
              <div style="color:#666;">${renderMemoryRegexStatus(e)}</div>
            </div>
          `,
            )
            .join("");
        }
      }
    }

    // Regex: import preset
    const regexImportBtn = document.getElementById("hp-regex-import-preset");
    if (regexImportBtn) {
      regexImportBtn.addEventListener("click", async () => {
        const nameInput = document.getElementById("hp-regex-preset-name") ;
        const name = _optionalChain([nameInput, 'optionalAccess', _44 => _44.value, 'optionalAccess', _45 => _45.trim, 'call', _46 => _46()]);
        if (!name) {
          alert("Enter a preset name.");
          return;
        }
        const fileInput = document.getElementById("hp-regex-import-file") ;
        const file = _optionalChain([fileInput, 'optionalAccess', _47 => _47.files, 'optionalAccess', _48 => _48[0]]);
        if (!file) {
          alert("Select a regex JSON file first.");
          return;
        }
        try {
          const json = await file.text();
          const entries = parseRegexFile(json);
          if (!entries || entries.length === 0) {
            alert("No editprocess entries found in the file.");
            return;
          }
          const presets = await loadRegexPresets();
          const existingIdx = presets.findIndex((p) => p.name === name);
          if (existingIdx >= 0) {
            presets[existingIdx] = { name, entries };
          } else {
            presets.push({ name, entries });
          }
          await saveRegexPresets(presets);
          alert(`Regex preset "${name}" imported with ${entries.length} entries!`);
          renderUI();
        } catch (_) {
          alert("Failed to read file.");
        }
      });
    }

    // Regex: chat regex upload
    const chatRegexUploadBtn = document.getElementById("hp-chat-regex-upload");
    if (chatRegexUploadBtn) {
      chatRegexUploadBtn.addEventListener("click", async () => {
        const fileInput = document.getElementById("hp-chat-regex-file") ;
        const file = _optionalChain([fileInput, 'optionalAccess', _49 => _49.files, 'optionalAccess', _50 => _50[0]]);
        if (!file) {
          alert("Select a regex JSON file first.");
          return;
        }
        try {
          const json = await file.text();
          const entries = parseRegexFile(json);
          if (!entries || entries.length === 0) {
            alert("No editprocess entries found in the file.");
            return;
          }
          state.chatRegex = entries;
          await saveChatRegex();
          alert(`Chat regex uploaded with ${entries.length} entries!`);
          renderUI();
        } catch (_) {
          alert("Failed to read file.");
        }
      });
    }

    // Regex: refresh module regex
    const refreshModuleBtn = document.getElementById("hp-refresh-module-regex");
    if (refreshModuleBtn) {
      // Auto-render cached module regex
      const listEl = document.getElementById("hp-module-regex-list");
      if (listEl && moduleRegexCache.length > 0) {
        listEl.innerHTML = moduleRegexCache
          .map(
            (e, j) => `
          <div style="margin:4px 0;padding:6px;background:#0a0a0a;border-radius:4px;font-size:12px;">
            <div style="color:#4a6cf7;font-weight:bold;">#${j + 1} ${escapeHtml(e.comment || "(no comment)")}</div>
            <div style="color:#888;">in: <code>${escapeHtml(e.in)}</code></div>
            <div style="color:#888;">out: <code>${escapeHtml(e.out)}</code></div>
            <div style="color:#666;">${renderMemoryRegexStatus(e)}</div>
          </div>
        `,
          )
          .join("");
      }
      refreshModuleBtn.addEventListener("click", async () => {
        const listEl2 = document.getElementById("hp-module-regex-list");
        if (!listEl2) return;
        listEl2.innerHTML = `<span style="color:#888;font-size:13px;">Loading...</span>`;
        try {
          await refreshModuleRegexCache();
          const entries = moduleRegexCache;
          if (entries.length === 0) {
            listEl2.innerHTML = `<span style="color:#888;font-size:13px;">No editprocess regex found in enabled modules.</span>`;
          } else {
            listEl2.innerHTML = entries
              .map(
                (e, j) => `
              <div style="margin:4px 0;padding:6px;background:#0a0a0a;border-radius:4px;font-size:12px;">
                <div style="color:#4a6cf7;font-weight:bold;">#${j + 1} ${escapeHtml(e.comment || "(no comment)")}</div>
                <div style="color:#888;">in: <code>${escapeHtml(e.in)}</code></div>
                <div style="color:#888;">out: <code>${escapeHtml(e.out)}</code></div>
                <div style="color:#666;">${renderMemoryRegexStatus(e)}</div>
              </div>
            `,
              )
              .join("");
          }
        } catch (_) {
          listEl2.innerHTML = `<span style="color:#e74c3c;font-size:13px;">Failed to fetch module regex. Check database permissions.</span>`;
        }
      });
    }
  }

  function showMemoryPreview(title, messages, skipped = [], joinedQuery = false, cleanup = null) {
    const text = joinedQuery ? messages.map(m => m.content).join("\n") : messages.map(m =>
      `[${m.displayIdx ?? messageIndexByChatId.get(m.chatId) ?? -1}] ${m.role}:\n${m.content}`).join("\n\n---\n\n");
    const overlay = document.createElement("div");
    overlay.className = "hp-edit-overlay";
    const diagnostics = skipped.length ? `<details style="margin:8px 0;"><summary>기억 처리에서 건너뛴 규칙 ${skipped.length}개</summary><ul>${skipped.map(rule =>
      `<li>${escapeHtml(rule.name)}: ${escapeHtml(rule.reason)}</li>`).join("")}</ul></details>` : "";
    overlay.innerHTML = `<div class="hp-edit-box" style="max-width:800px;">
      <h3>${escapeHtml(title)}</h3>
      <div style="font-size:12px;color:#aaa;">${messages.length}개 메시지 · ${text.length.toLocaleString()}자 · 로컬 미리보기</div>
      ${cleanup?.blocksRemoved ? `<div style="font-size:12px;color:#aaa;margin-top:6px;">표시 블록 ${cleanup.blocksRemoved}개 제외 · 캡션/설명 ${cleanup.captionsPreserved}개 보존</div>` : ""}
      ${cleanup?.unclosedBlocks ? `<div style="font-size:12px;color:#c9aa72;margin-top:6px;">닫힘을 확인하지 못한 표시 블록은 원문 그대로 유지했습니다.</div>` : ""}
      ${diagnostics}
      <pre style="background:#0a0a0a;padding:12px;border-radius:4px;font-size:13px;max-height:65vh;overflow:auto;white-space:pre-wrap;">${escapeHtml(text)}</pre>
      <div style="margin-top:12px;display:flex;justify-content:flex-end;"><button class="hp-btn secondary" id="hp-view-close">닫기</button></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#hp-view-close").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });
  }


  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Initialization ───────────────────────────────────────────────────────

  await loadState();

  // Keep only unsummarized messages in the live context.
  // When no chunks exist, all messages pass through unchanged.
  // When chunks exist, only messages with chat_index > lastSummarizedMsgIndex are kept.
  // The first message (chat_index -1) is handled via msgIndex -1 in chunks.
  await risuai.addRisuScriptHandler("process", async (text) => {
    const now = Date.now();
    const idleExpired =
      processBatchPrepared && now - lastProcessCallAt >= PROCESS_BATCH_IDLE_RESET_MS;
    lastProcessCallAt = now;
    if (!processBatchPrepared || idleExpired) {
      processBatchPrepared = true;
      try {
        // Resolve IDs, clone the current chat once, build the index, and derive
        // the summarized boundary for every process call in this request.
        await ensureChatContext(true);
      } catch (error) {
        processBatchPrepared = false;
        throw error;
      }
    }
    const lastIdx = getLastSummarizedMsgIndex();
    // No chunks yet — keep everything
    if (lastIdx < 0) return text;
    // Chunks exist — filter out already-summarized messages
    const firstPendingIdx = lastIdx + 1;
    return `{{#if {{greater_equal::{{chat_index}}::${firstPendingIdx}}}}}\n${text}\n{{/if}}`;
  });

  // Register replacers for message tracking and memory injection
  await risuai.addRisuReplacer("beforeRequest", beforeRequestHandler);
  await risuai.addRisuReplacer("afterRequest", afterRequestHandler);
  console.log("[HypaPlus] Replacers registered — beforeRequest + afterRequest");
  console.log(
    "[HypaPlus] Init complete — chunks:",
    state.chunks.length,
    "| nodes:",
    getNodes().length,
    "| charId:",
    currentCharId || "(none)",
    "| chatId:",
    currentChatId || "(none)",
  );

  // Register settings UI
  await risuai.registerSetting(
    "HypaPlus 1.0.9.g-local.2",
    openSettings,
    "🗂️",
    "html",
    "hypaplus-settings",
  );

  // Register the optional quick action button to open the HypaPlus GUI
  await syncGuiButtonRegistration();
})();
