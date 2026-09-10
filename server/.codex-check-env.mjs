import "./load-env.js";
console.log(JSON.stringify({
  hasKey: Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim()),
  baseUrl: process.env.DEEPSEEK_BASE_URL || null,
  model: process.env.DEEPSEEK_MODEL || null,
  requireLlm: process.env.ASSISTANT_REQUIRE_LLM || null,
}, null, 2));
