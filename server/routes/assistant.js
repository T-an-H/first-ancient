import { Router } from 'express';
import { getAssistantHealth, runAssistantAgent } from '../assistant-agent.js';

const router = Router();

/**
 * 简易内存限流（每用户每分钟 20 次）
 *
 * 为什么不用 express-rate-limit：小智是低频对话接口，单进程部署，
 * 进程内 Map 足够；少一个依赖也少一份安装/审计负担。后端重启即重置。
 *
 * /navigate 是 POST，全局 authMiddleware 会先校验 JWT，故此处 req.user 必存在。
 */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateBuckets = new Map();

function assistantRateLimit(req, res, next) {
  const key = String(req.user?.id ?? req.ip ?? 'anon');
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return next();
  }
  if (bucket.count >= RATE_MAX) {
    return res.status(429).json({ success: false, message: '请求过于频繁，请稍后再试' });
  }
  bucket.count += 1;
  return next();
}

router.get('/health', (req, res) => {
  const health = getAssistantHealth();

  res.json({
    success: true,
    status: health.apiKeyConfigured ? 'configured' : 'misconfigured',
    ...health,
  });
});

router.post('/navigate', assistantRateLimit, async (req, res) => {
  try {
    const result = await runAssistantAgent(req.body);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Assistant agent error:', error);
    const health = getAssistantHealth();
    res.status(Number(error?.status) || 500).json({
      success: false,
      code: error?.code || 'assistant_error',
      diagnostics: health.lastDecision?.error || health.boot?.error || null,
      message: error?.message || '智能体暂时不可用',
    });
  }
});

export default router;
