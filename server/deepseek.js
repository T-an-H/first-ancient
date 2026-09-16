/**
 * DeepSeek API 调用服务
 *
 * 封装了对 DeepSeek API 的调用，用于：
 * 1. 智能出题 — 根据课程章节和老师要求生成题目（支持按层级出不同难度）
 * 2. 智能批改 — 批改学生提交的答案
 * 3. 分层测试出题 — 为 AI 分层测试生成单选题/判断题
 */

import './load-env.js';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_CHAT_PATH = '/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

function getDeepSeekApiUrl() {
  const configuredApiUrl = process.env.DEEPSEEK_API_URL?.trim();
  if (configuredApiUrl) {
    return configuredApiUrl;
  }

  const configuredBaseUrl = process.env.DEEPSEEK_BASE_URL?.trim() || DEEPSEEK_BASE_URL;
  return `${configuredBaseUrl.replace(/\/$/, '')}${DEEPSEEK_CHAT_PATH}`;
}

async function callDeepSeek(systemPrompt, userPrompt, options = {}) {
  const { temperature = 0.7, maxTokens = 4096 } = options;
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const apiUrl = getDeepSeekApiUrl();
  const model = process.env.DEEPSEEK_MODEL?.trim() || DEEPSEEK_MODEL;

  if (!apiKey) {
    throw new Error('未配置 DEEPSEEK_API_KEY，无法调用 DeepSeek。');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API 错误 (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/** 解析返回的 JSON 数组 */
function parseJsonArray(content) {
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error(`返回内容中未找到 JSON 数组\n原始内容: ${content}`);
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`JSON 解析失败: ${e.message}\n原始内容: ${content}`);
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，,。.!！？?；;：:、"'‘’“”()（）【】\[\]-]/g, '');
}

/**
 * AI 出题失败时的本地兜底题库
 *
 * 依据课程名做关键词命中，命中不到就用通用题。
 * **必须返回 10 道题**（接口按 10 道题、每题 10 分判层）。
 */
function fallbackTierTestQuestions({ courseTitle = '' } = {}) {
  const q = (question_text, options, answer) => ({
    question_type: 'single_choice', question_text, options, answer, score: 10,
  })
  const t = (question_text, answer) => ({
    question_type: 'true_false', question_text, options: ['正确', '错误'], answer, score: 10,
  })

  const banks = [
    {
      keywords: ['react', 'vue', '前端', 'javascript', 'typescript', 'html', 'css', 'web'],
      questions: [
        q('前端框架中，用于描述 UI 结构的声明式写法通常被称为什么？', ['模板或 JSX', '存储过程', '二进制指令', '数据库索引'], '模板或 JSX'),
        q('组件之间传递数据时，父组件向子组件传递的数据一般称为？', ['Props', 'Cookie', '索引', '事务'], 'Props'),
        q('下列哪一项用于让页面在不刷新的情况下更新内容？', ['异步请求 + 局部渲染', '整页重定向', '重启服务器', '清空浏览器缓存'], '异步请求 + 局部渲染'),
        q('页面样式冲突时，最有效的定位手段通常是？', ['查看元素的实际生效样式', '反复重装依赖', '删除全部样式', '更换显示器'], '查看元素的实际生效样式'),
        q('组件状态更新后，视图没有变化，最可能的原因是？', ['状态不是响应式的或未触发更新', 'CPU 频率过低', '网络带宽不足', '磁盘空间不足'], '状态不是响应式的或未触发更新'),
        t('同一个页面上可以同时存在多个组件实例。', '正确'),
        t('前端代码不需要考虑浏览器兼容性。', '错误'),
        t('把大组件拆分成小组件通常有利于维护。', '正确'),
        t('所有前端数据都必须保存在本地，不能请求后端。', '错误'),
        t('版本控制工具可以帮助团队协作开发。', '正确'),
      ],
    },
    {
      keywords: ['python', '数据分析', 'pandas', 'numpy', '统计', '可视化'],
      questions: [
        q('Python 中用于表示一组有序数据、且元素可修改的类型是？', ['list', 'tuple', 'str', 'frozenset'], 'list'),
        q('处理二维表格数据时最常用的 Python 库是？', ['pandas', 'requests', 'flask', 'pillow'], 'pandas'),
        q('数据清洗中，缺失值最常用的处理方式不包括下列哪项？', ['直接删除整张表', '删除缺失行', '用均值填充', '用前值填充'], '直接删除整张表'),
        q('描述一组数据离散程度的常用指标是？', ['标准差', '众数', '中位数', '最大值'], '标准差'),
        q('下列哪一项属于数据可视化库？', ['matplotlib', 'numpy', 'os', 'json'], 'matplotlib'),
        t('数据清洗通常比建模更耗时。', '正确'),
        t('样本量越大，统计结论一定越可靠。', '错误'),
        t('异常值在任何情况下都应该直接删除。', '错误'),
        t('训练集和测试集应该分开评估模型效果。', '正确'),
        t('相关性可以证明因果关系。', '错误'),
      ],
    },
    {
      keywords: ['数据库', 'sql', 'mysql', '后端', 'docker', '微服务', 'node', 'java', '服务'],
      questions: [
        q('SQL 中用于从表中查询数据的语句是？', ['SELECT', 'UPDATE', 'DROP', 'GRANT'], 'SELECT'),
        q('为加快查询速度，通常会在经常查询的列上建立？', ['索引', '触发器', '视图', '存储过程'], '索引'),
        q('下列哪一项可以保证一组操作要么全部成功要么全部失败？', ['事务', '索引', '视图', '缓存'], '事务'),
        q('容器化部署中，用于描述多容器编排的文件通常是？', ['docker-compose 配置', 'package.json', '.gitignore', 'README'], 'docker-compose 配置'),
        q('服务拆分为多个独立部署的单元，这种架构称为？', ['微服务', '单页应用', '瀑布模型', '单体插件'], '微服务'),
        t('数据库主键必须保证唯一。', '正确'),
        t('索引越多，写入性能越好。', '错误'),
        t('接口返回 200 就一定代表业务处理成功。', '错误'),
        t('服务之间通过网络接口通信会增加系统复杂度。', '正确'),
        t('生产环境可以直接用测试库的数据做实验。', '错误'),
      ],
    },
    {
      keywords: ['设计', 'ui', 'ux', 'photoshop', '图像', '产品'],
      questions: [
        q('设计流程中，最先进行的通常是？', ['用户研究与需求分析', '视觉稿交付', '开发联调', '上线复盘'], '用户研究与需求分析'),
        q('用于表达页面结构与层级的图称为？', ['线框图', '折线图', '流程图', '甘特图'], '线框图'),
        q('色彩设计中，用于区分主次信息的常用手段是？', ['对比度', '文件格式', '分辨率', '字体授权'], '对比度'),
        q('图像处理中，「图层」的主要作用是？', ['让不同元素可独立编辑', '压缩文件体积', '提高屏幕亮度', '修改文件名'], '让不同元素可独立编辑'),
        q('可用性测试的主要目的是？', ['发现用户使用中的真实问题', '提高代码覆盖率', '降低服务器成本', '美化界面'], '发现用户使用中的真实问题'),
        t('设计稿标注越清晰，开发还原度通常越高。', '正确'),
        t('配色使用越多颜色越专业。', '错误'),
        t('用户反馈是产品迭代的重要输入。', '正确'),
        t('可用性测试只需要找专家参与。', '错误'),
        t('无障碍设计只需考虑色盲用户。', '错误'),
      ],
    },
  ]

  const generic = {
    questions: [
      q('学习一门新课程时，最先应该明确的是？', ['课程目标与考核方式', '教室座位', '同学姓名', '打印机型号'], '课程目标与考核方式'),
      q('遇到不理解的概念时，较有效的做法是？', ['结合例子动手验证', '跳过不管', '直接背结论', '放弃该课程'], '结合例子动手验证'),
      q('完成实践任务时，合理的顺序是？', ['先理解需求再动手实现', '先写完再说', '直接抄同学结果', '随机尝试'], '先理解需求再动手实现'),
      q('复习时检验掌握程度最可靠的方式是？', ['不看资料独立复述或动手做', '反复抄写目录', '只看视频不动手', '仅记住页码'], '不看资料独立复述或动手做'),
      q('团队协作中，任务进度出现偏差时应该？', ['及时同步并调整计划', '隐瞒到截止日期', '退出小组', '指责他人'], '及时同步并调整计划'),
      t('明确的目标有助于安排学习计划。', '正确'),
      t('实践练习对掌握技能没有帮助。', '错误'),
      t('遇到问题应该先尝试自行定位再求助。', '正确'),
      t('只要看过教材就等于掌握了知识。', '错误'),
      t('及时复盘能帮助改进行动。', '正确'),
    ],
  }

  const normalized = String(courseTitle || '').toLowerCase()
  const hit = banks.find(bank => bank.keywords.some(k => normalized.includes(k)))
  const picked = hit || generic
  const tag = hit ? `（本地题库·${hit.keywords[0]}）` : '（本地通用题库）'

  return {
    questions: picked.questions,
    // 便于调用方/日志区分是 AI 出题还是本地兜底
    source: hit ? `fallback:${hit.keywords[0]}` : 'fallback:generic',
    notice: tag,
  }
}

// 层级描述
const TIER_DESCS = {
  basic:    '基础层（难度：简单，考察基本概念和基础知识，适合初学者）',
  advanced: '进阶层（难度：中等，考察理解与应用，需要一定基础）',
  excellent:'卓越层（难度：较难，考察综合运用与深度理解，适合优秀学生）',
};

/**
 * AI 生成分层测试题 — 为某门课生成10道单选/判断题
 *
 * @param {object} params
 * @param {string} params.courseTitle - 课程名称
 * @param {string} params.courseDesc  - 课程简介（可选）
 */
export async function generateTierTestQuestions({ courseTitle, courseDesc }) {
  const systemPrompt = `你是一位经验丰富的教育专家，负责为课程设计分层测试题。
分层测试用于判断学生的基础水平，题目要求：
1. 共10道题，类型只能是：单选题(single_choice) 或 判断题(true_false)
2. 建议单选题7道、判断题3道
3. 题目难度中等，能区分出"基础"、"中等"、"优秀"三个层次
4. 每道题10分，满分100分
5. 必须返回合法的 JSON 数组，格式如下：
[
  {
    "question_type": "single_choice",
    "question_text": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "answer": "正确答案的完整内容（不要写A/B/C/D，写内容）",
    "score": 10
  },
  {
    "question_type": "true_false",
    "question_text": "判断题内容",
    "options": ["正确", "错误"],
    "answer": "正确",
    "score": 10
  }
]
6. 只返回 JSON 数组，不要包含任何其他文字`;

  const userPrompt = `课程名称：${courseTitle}
${courseDesc ? '课程简介：' + courseDesc : ''}

请为这门课程生成10道分层测试题。`;

  try {
    const content = await callDeepSeek(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 6000 });
    const questions = parseJsonArray(content);
    if (questions.length !== 10) {
      throw new Error(`AI 生成了 ${questions.length} 道题，期望10道`);
    }
    return questions;
  } catch (error) {
    // 未配置 API Key / 调用失败 / 题量不符 → 用本地题库兜底，保证分层测试流程可用
    const fallback = fallbackTierTestQuestions({ courseTitle });
    console.warn(`分层测试题 AI 生成失败，改用${fallback.notice}:`, error.message || error);
    return fallback.questions;
  }
}
