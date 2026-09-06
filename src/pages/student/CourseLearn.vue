<template>
  <div id="student-course-learn-root"></div>


    <!-- 已结束只读提示 -->
    <div v-if="isReadOnly" class="flex items-center gap-2 px-4 py-3 bg-brand-400/5 border border-brand-400/30 rounded-xl text-sm text-gray-400">
      <Eye class="w-4 h-4 text-gray-400" />
      <span>该课程已结束，当前为<strong>只读查看</strong>模式</span>
    </div>

    <div class="flex gap-1 bg-brand-400/10 p-1 rounded-xl overflow-x-auto">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        :class="`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-800'}`">
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div class="lg:col-span-3">
        <div class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-6">
          <!-- ===== AI 分层 ===== -->
          <div v-if="activeTab === 'ai_tier'" class="space-y-6">
            <!-- 未到开始条件 -->
            <div v-if="!firstClassEnded" class="bg-brand-50 border border-brand-200 rounded-xl p-8 text-center">
              <Layers class="w-12 h-12 mx-auto mb-3 text-brand-400" />
              <h3 class="text-lg font-semibold text-brand-800 mb-2">AI 分层测试</h3>
              <p class="text-sm text-brand-700">第一节课尚未结束，AI 分层测试将在第一节课结束后开启</p>
              <p class="text-xs text-brand-400 mt-1">届时将根据第一节课内容生成 10 道测试题，依据得分判定学习层级</p>
            </div>

            <!-- 测试窗口期（第一节课后～第二节课前） -->
            <div v-else-if="firstClassEnded && !secondClassStarted && !tierFinalized" class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 text-center">
              <Sparkles class="w-12 h-12 mx-auto mb-3 text-blue-500" />
              <h3 class="text-lg font-semibold text-blue-800 mb-2">AI 分层测试已开放</h3>
              <p class="text-sm text-blue-600 mb-2">完成 10 道测试题（单选+判断），系统将根据得分判定你的学习层级</p>
              <p class="text-xs text-brand-600 mb-6">⚠ 测试窗口：第一节课结束后 ~ 第二节课开始前，逾期将自动分配到基础层</p>
              <button @click="openAITest"
                class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/25 inline-flex items-center gap-2">
                <HelpCircle class="w-5 h-5" />
                开始 AI 分层测试
              </button>
            </div>

            <!-- 逾期未测，自动分配基础层 -->
            <div v-else-if="secondClassStarted && !tierFinalized" class="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <XCircle class="w-12 h-12 mx-auto mb-3 text-red-400" />
              <h3 class="text-lg font-semibold text-red-700 mb-2">测试窗口已关闭</h3>
              <p class="text-sm text-red-600 mb-4">第二节课已开始，AI 分层测试逾期未完成，已自动分配到基础层</p>
              <div class="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
                <Layers class="w-4 h-4 text-brand-600" />
                <span class="text-sm font-bold text-gray-800">基础层</span>
              </div>
              <p class="text-xs text-gray-400 mt-4">本学期不可修改，后续任务、资源、作业将根据基础层进行适配</p>
            </div>

            <!-- 已分层 → 永久锁定展示 -->
            <div v-else>
              <!-- 当前层级 -->
              <div>
                <h3 class="text-sm font-semibold text-gray-800 mb-3">AI 学习层级评估</h3>
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div class="flex items-center justify-between mb-4">
                    <div>
                      <p class="text-xs text-gray-400 mb-1">当前学习层级</p>
                      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                        :class="tierBadgeClass">
                        <Layers class="w-4 h-4" />
                        {{ tierLabel }}
                        <span v-if="isAutoAssigned" class="text-[10px] opacity-75">(自动分配)</span>
                      </span>
                      <span class="ml-2 text-[10px] text-gray-400">已锁定 · 该学期不可修改</span>
                    </div>
                    <div class="text-right">
                      <p class="text-xs text-gray-400">分层测试得分</p>
                      <p class="text-2xl font-bold text-blue-600">{{ myTierScore }}</p>
                      <p class="text-xs text-gray-400">/ {{ totalQuestions * 10 }}分</p>
                    </div>
                  </div>

                  <!-- 锁定提示 -->
                  <div class="mt-3 flex items-center gap-2 px-3 py-2 bg-brand-400/10/80 rounded-lg text-xs text-gray-400">
                    <Lock class="w-3.5 h-3.5" />
                    <span>AI 分层结果已锁定，本学期不可更改。后续任务、资源、作业将根据 {{ tierLabel }} 进行适配</span>
                  </div>
                </div>
              </div>

              <!-- AI 学习建议 -->
              <div>
                <h3 class="text-sm font-semibold text-gray-800 mb-3">AI 学习建议</h3>
                <div class="space-y-3">
                  <div v-for="(tip, i) in aiTips" :key="i"
                    class="flex items-start gap-3 p-3 rounded-lg border border-brand-400/20 bg-brand-400/5">
                    <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span class="text-xs font-bold text-blue-600">{{ i + 1 }}</span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">{{ tip.title }}</p>
                      <p class="text-xs text-gray-400 mt-0.5">{{ tip.desc }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AI 分层测试弹窗 -->
          <Modal :is-open="aiTestOpen" :on-close="closeAITest"
            title="AI 分层测试" max-width="max-w-2xl">
            <template v-if="!testSubmitted">
              <div class="space-y-6">
                <!-- 进度 -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-400">已答 {{ answeredCount }}/{{ totalQuestions }} 题</span>
                  <span class="text-xs text-gray-400">每题 10 分，满分 {{ totalQuestions * 10 }} 分</span>
                </div>
                <div class="w-full h-1.5 bg-brand-400/10 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-500 rounded-full transition-all"
                    :style="{ width: (answeredCount / totalQuestions * 100) + '%' }" />
                </div>

                <!-- 题目列表 -->
                <div v-for="(q, i) in testQuestions" :key="q.id"
                  class="p-4 rounded-lg border"
                  :class="testAnswers[q.id] !== undefined ? 'border-blue-200 bg-blue-50/30' : 'border-brand-400/20'">
                  <p class="text-sm font-medium text-gray-900 mb-3">
                    <span class="text-blue-600 font-bold">{{ i + 1 }}.</span>
                    {{ q.question }}
                    <span class="ml-1 text-[10px] text-gray-400">({{ q.type === 'true_false' ? '判断题' : '单选题' }})</span>
                  </p>
                  <div class="space-y-1.5">
                    <button v-for="(opt, oi) in q.options" :key="oi"
                      @click="selectAnswer(q.id, q.type === 'true_false' ? (oi === 0) : oi)"
                      class="w-full text-left px-3 py-2 rounded-lg text-sm border transition-all"
                      :class="testAnswers[q.id] === (q.type === 'true_false' ? (oi === 0) : oi)
                        ? 'border-blue-400 bg-blue-100 text-blue-700 font-medium'
                        : 'border-brand-400/30 hover:border-brand-400/60 text-gray-800'">
                      {{ opt }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between mt-6 pt-4 border-t border-brand-400/20">
                <span v-if="!allAnswered" class="text-xs text-brand-600">请完成所有题目后再提交</span>
                <span v-else class="text-xs text-emerald-500">所有题目已作答</span>
                <button @click="submitAITest" :disabled="!allAnswered"
                  class="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                  :class="allAnswered ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-brand-400/10 text-gray-400 cursor-not-allowed'">
                  提交并判定层级
                </button>
              </div>
            </template>

            <!-- 结果展示 -->
            <template v-else>
              <div class="text-center py-6 space-y-4">
                <div class="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                  :class="testScore >= 80 ? 'bg-emerald-100' : testScore >= 60 ? 'bg-blue-100' : 'bg-brand-50'">
                  <Award class="w-10 h-10" :class="testScore >= 80 ? 'text-emerald-500' : testScore >= 60 ? 'text-blue-500' : 'text-brand-600'" />
                </div>
                <div>
                  <p class="text-4xl font-bold text-gray-900">{{ testScore }}<span class="text-lg text-gray-400">/{{ totalQuestions * 10 }}</span></p>
                  <p class="text-sm text-gray-400 mt-1">得分</p>
                </div>
                <div>
                  <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-base font-bold"
                    :class="tierBadgeClass">
                    <Layers class="w-5 h-5" />
                    {{ store.determineTier(testScore) === 'excellent' ? '卓越层' : store.determineTier(testScore) === 'advanced' ? '进阶层' : '基础层' }}
                  </span>
                </div>
                <p class="text-xs text-gray-400">本次分层结果已在系统中锁定，本学期不可修改</p>
                <button @click="closeAITest"
                  class="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2">
                  <CheckCircle class="w-4 h-4" />
                  确认并查看
                </button>
              </div>
            </template>
          </Modal>

          <!-- ===== 课程图谱（项目/预习/工单/资料/测试/评教） ===== -->
          <div v-if="activeTab === 'course-mgmt'" class="space-y-4">
            <KnowledgeGraph :course-id="courseId" :students="[]" :can-manage="false" :student-mode="true" :my-student-id="myStudent?.id || ''" />
          </div>

          <!-- ===== 课程标准 ===== -->
          <div v-if="activeTab === 'course_standard'" class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-semibold text-gray-800">课程标准</h3>
                <p class="text-xs text-gray-400">教师上传的课程标准文件，可在线查看或下载</p>
              </div>
            </div>

            <div v-if="standardsLoading" class="text-center py-14 text-sm text-gray-400">加载中…</div>
            <div v-else-if="courseStandards.length === 0" class="bg-brand-50 border border-brand-200 rounded-xl p-10 text-center">
              <FileText class="w-12 h-12 mx-auto mb-3 text-brand-400" />
              <h3 class="text-lg font-semibold text-brand-800 mb-1">暂无课程标准文件</h3>
              <p class="text-sm text-brand-700">教师上传课程标准后，将自动同步到此处</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="f in courseStandards" :key="f.id"
                class="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-brand-400/20 hover:border-brand-400/50 transition-colors">
                <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FileText class="w-5 h-5 text-indigo-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ f.name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    {{ formatFileSize(f.size) }}<template v-if="formatDateTime(f.createdAt)"> · 上传于 {{ formatDateTime(f.createdAt) }}</template>
                  </p>
                </div>
                <a :href="f.dataUrl" :download="f.name"
                  class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0">
                  <Download class="w-3.5 h-3.5" /> 查看/下载
                </a>
              </div>
            </div>
          </div>

          <!-- ===== 知识图谱 (泡泡图) ===== -->
          <div v-if="activeTab === 'knowledge_graph'" class="space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-semibold text-gray-800">知识点掌握图谱</h3>
                <p class="text-xs text-gray-400">基于学习进度与评价数据自动生成 · 泡泡越大表示知识越重要 · 颜色越深表示掌握度越高</p>
              </div>
              <span class="text-xs text-gray-400">点击泡泡查看详情</span>
            </div>

            <!-- 泡泡视图 -->
            <!-- 分类图例 + 关联图例 -->
              <div class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400 items-center">
                <span v-for="cat in categoryColors" :key="cat.key" class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full" :style="{ background: cat.mid }" />
                  {{ cat.label }}
                </span>
                <span class="text-gray-400/60">|</span>
                <span v-for="rel in relationLegend" :key="rel.key" class="flex items-center gap-1.5">
                  <svg width="20" height="4" class="overflow-visible"><line x1="0" y1="2" x2="20" y2="2" :stroke="rel.color" stroke-width="2" :stroke-dasharray="rel.dash" /></svg>
                  {{ rel.label }}
                </span>
              </div>

              <!-- SVG 知识图谱 -->
              <div class="relative bg-white rounded-xl border border-brand-400/20 overflow-hidden">
                <svg :viewBox="`0 0 ${SVG_W} ${SVG_H}`" class="w-full" style="min-height: 780px">
                  <!-- 背景网格 -->
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" stroke-width="0.5" />
                    </pattern>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  <!-- 分类环带 -->
                  <g v-for="(ring, ri) in categoryRings" :key="ri">
                    <ellipse :cx="SVG_CX" :cy="SVG_CY" :rx="ring.rx" :ry="ring.ry"
                      fill="none" :stroke="ring.color" stroke-width="1" stroke-dasharray="4,4" stroke-opacity="0.3" />
                    <text :x="SVG_CX + ring.rx - 4" :y="SVG_CY - ring.ry + 16" font-size="10" :fill="ring.color" fill-opacity="0.5" text-anchor="end">{{ ring.label }}</text>
                  </g>

                  <!-- 关联连线 -->
                  <g v-for="(edge, ei) in renderedEdges" :key="'edge-' + ei">
                    <path :d="edge.path" fill="none"
                      :stroke="edge.color" :stroke-width="edge.width" :stroke-dasharray="edge.dash"
                      stroke-linecap="round" opacity="0.5"
                      class="transition-all duration-300"
                      :class="{ 'opacity-100': selectedBubble && (edge.source === selectedBubble || edge.target === selectedBubble) }" />
                    <!-- 箭头标记 -->
                    <polygon :points="edge.arrow" :fill="edge.color" opacity="0.5"
                      :class="{ 'opacity-100': selectedBubble && (edge.source === selectedBubble || edge.target === selectedBubble) }" />
                    <!-- 关系标签（连线中间） -->
                    <text :x="edge.midX" :y="edge.midY" font-size="8" :fill="edge.color"
                      text-anchor="middle" dominant-baseline="middle" opacity="0.6"
                      class="pointer-events-none select-none">
                      {{ edge.label }}
                    </text>
                  </g>

                  <!-- 知识点节点 -->
                  <g v-for="pn in positionedNodes" :key="pn.node.id"
                    @click="selectedBubble = selectedBubble === pn.node.id ? null : pn.node.id"
                    class="cursor-pointer"
                    :class="{ 'selected-node': selectedBubble === pn.node.id }">
                    <!-- hover 提示 -->
                    <title>{{ pn.node.label }} - {{ pn.node.mastery }}% ({{ pn.node.chapter }})</title>
                    <!-- 阴影光晕（选中/大掌握度） -->
                    <circle v-if="pn.node.mastery >= 75" :cx="pn.x" :cy="pn.y" :r="pn.r + 6"
                      :fill="pn.fill" opacity="0.15" filter="url(#glow)" />
                    <!-- 外圈（选中时高亮） -->
                    <circle :cx="pn.x" :cy="pn.y" :r="pn.r + 3"
                      fill="none" :stroke="pn.fill" stroke-width="2"
                      :class="selectedBubble === pn.node.id ? 'opacity-100' : 'opacity-0'"
                      class="transition-opacity duration-200" />
                    <!-- 主体圆 -->
                    <circle :cx="pn.x" :cy="pn.y" :r="pn.r"
                      :fill="pn.fill" stroke="white" stroke-width="2"
                      class="transition-all duration-200 hover:brightness-110"
                      :style="{ filter: pn.node.mastery >= 80 ? 'drop-shadow(0 2px 6px ' + pn.fill + '66)' : 'none' }" />
                    <!-- 文字 - 知识点名称（圆内居中，根据泡泡大小自适应字号） -->
                    <text :x="pn.x" :y="pn.y + 1" :font-size="bubbleFontSize(pn.r)" font-weight="700"
                      fill="white" text-anchor="middle" dominant-baseline="central"
                      class="pointer-events-none select-none">
                      {{ pn.node.label }}
                    </text>
                  </g>

                  <!-- 无节点提示 -->
                  <text v-if="positionedNodes.length === 0" x="50%" y="50%" font-size="14" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">暂无知识点数据</text>
                </svg>
              </div>

              <!-- 选中节点的详情 -->
              <div v-if="selectedBubble && bubbleNode(selectedBubble)" class="bg-brand-400/5 rounded-xl p-4 border border-brand-400/30 space-y-2">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full" :style="{ background: bubbleColor(bubbleNode(selectedBubble)?.mastery ?? 50, bubbleNode(selectedBubble)?.category ?? 'foundation') }" />
                  <p class="text-sm font-bold text-gray-800">{{ bubbleNode(selectedBubble)?.label }}</p>
                  <span class="text-xs px-1.5 py-0.5 rounded bg-brand-400/10 text-brand-600">{{ bubbleNode(selectedBubble)?.chapter }}</span>
                </div>
                <p class="text-xs text-gray-400">{{ bubbleNode(selectedBubble)?.description }}</p>
                <div class="flex items-center gap-3 text-xs">
                  <span class="text-gray-400">掌握度</span>
                  <div class="flex-1 h-2 bg-brand-400/10 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" :style="{ width: (bubbleNode(selectedBubble)?.mastery ?? 0) + '%', background: bubbleColor(bubbleNode(selectedBubble)?.mastery ?? 50, bubbleNode(selectedBubble)?.category ?? 'foundation') }" />
                  </div>
                  <span class="font-bold" :style="{ color: bubbleColor(bubbleNode(selectedBubble)?.mastery ?? 50, bubbleNode(selectedBubble)?.category ?? 'foundation') }">{{ bubbleNode(selectedBubble)?.mastery }}%</span>
                </div>
                <!-- 选中节点的关联 -->
                <div v-if="bubbleEdges(selectedBubble).length > 0" class="pt-1 border-t border-brand-400/30">
                  <p class="text-[11px] text-gray-400 mb-1">关联关系</p>
                  <div v-for="edge in bubbleEdges(selectedBubble)" :key="edge.source + edge.target"
                    class="text-xs text-brand-600 flex items-center gap-1.5">
                    <span :class="edge.source === selectedBubble ? 'font-semibold' : ''">{{ nodeLabel(edge.source) }}</span>
                    <ArrowRight class="w-3 h-3 text-gray-400" />
                    <span class="px-1 py-0.5 rounded text-[10px]" :class="relationChipClass(edge.relation)">{{ edge.label }}</span>
                    <ArrowRight class="w-3 h-3 text-gray-400" />
                    <span :class="edge.target === selectedBubble ? 'font-semibold' : ''">{{ nodeLabel(edge.target) }}</span>
                  </div>
                </div>
              </div>


          </div>

          <!-- ===== 素质评价板块 ===== -->
          <div v-if="activeTab === 'evaluations'" class="space-y-6">
            <div class="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-4">
              <div class="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-2xl p-5 border border-emerald-100">
                <div class="flex items-center gap-2 mb-2">
                  <UserCheck class="w-5 h-5 text-emerald-600" />
                  <h3 class="text-base font-semibold text-emerald-800">素质评价</h3>
                </div>
                <p class="text-sm text-emerald-700">
                  上传与本课程相关的实践成果、项目文档、证书等资料，教师将根据提交内容进行评分。素质评价分数会直接加成到你的课程总分中。
                </p>
              </div>

              <div v-if="isReadOnly" class="bg-brand-400/5 border border-brand-400/30 rounded-xl p-6 text-center text-sm text-gray-400">
                <Eye class="w-8 h-8 mx-auto mb-2 text-gray-400/60" />
                <p>课程已结束，无法提交素质评价</p>
                <p class="text-xs mt-1">如需查看已提交内容，请联系教师</p>
              </div>

              <div v-else class="space-y-4">
                <!-- 描述 -->
                <div class="bg-white rounded-xl p-4 border border-brand-400/20">
                  <label class="text-sm font-medium text-gray-700 mb-2 block">成果说明</label>
                  <textarea v-model="qualityDesc" rows="3"
                    placeholder="简要说明你提交的成果、收获或实践内容..."
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>

                <!-- 文件上传 -->
                <div class="bg-white rounded-xl p-4 border border-brand-400/20">
                  <label class="text-sm font-medium text-gray-700 mb-2 block">上传资料（图片/文档，单个文件 ≤ 2MB）</label>
                  <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                    @click="qualityFileInputRef?.click()">
                    <Upload class="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p class="text-sm text-gray-500">点击选择文件上传</p>
                    <p class="text-xs text-gray-400 mt-1">支持图片、PDF、Word、Excel 等格式</p>
                    <input type="file" ref="qualityFileInputRef" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.ppt,.pptx"
                      class="hidden" @change="handleQualityFileSelect" />
                  </div>

                  <!-- 已选文件列表 -->
                  <div v-if="qualityPendingFiles.length > 0" class="mt-3 space-y-2">
                    <div v-for="(f, i) in qualityPendingFiles" :key="i"
                      class="flex items-center justify-between px-3 py-2 bg-gray-50 rounded border">
                      <div class="flex items-center gap-2 min-w-0">
                        <FileText class="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span class="text-sm text-gray-700 truncate">{{ f.fileName }}</span>
                        <span class="text-xs text-gray-400 flex-shrink-0">{{ formatSize(f.fileSize) }}</span>
                      </div>
                      <button @click="qualityPendingFiles.splice(i, 1)" class="text-gray-400 hover:text-red-500">
                        <X class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 历史提交列表 -->
                <div v-if="myQualitySubmissions.length > 0" class="space-y-3">
                  <div v-for="(sub, si) in myQualitySubmissions" :key="sub.id"
                    class="bg-white rounded-xl p-4 border border-brand-400/20">
                    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <p class="text-sm font-medium text-gray-800">第 {{ myQualitySubmissions.length - si }} 次提交</p>
                        <p class="text-xs text-gray-400 mt-0.5">提交时间：{{ sub.submittedAt }}</p>
                      </div>
                      <div v-if="sub.score !== undefined"
                        class="px-3 py-1 rounded-full text-sm font-bold"
                        :class="sub.score >= 60 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'">
                        教师评分：{{ sub.score }} 分
                      </div>
                      <div v-else class="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs">
                        待教师批改
                      </div>
                    </div>
                    <p v-if="sub.description" class="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{{ sub.description }}</p>
                    <div v-if="sub.files.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <a v-for="(f, i) in sub.files" :key="i" :href="f.dataUrl"
                        :download="f.fileName" target="_blank"
                        class="flex items-center gap-2 px-3 py-2 bg-brand-400/5 border border-brand-400/20 rounded text-sm text-brand-700 hover:bg-brand-400/10 transition-colors truncate">
                        <FileText class="w-4 h-4 flex-shrink-0" />
                        <span class="truncate">{{ f.fileName }}</span>
                      </a>
                    </div>
                    <p v-if="sub.teacherComment" class="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      教师评语：{{ sub.teacherComment }}
                    </p>
                  </div>
                </div>

                <!-- 提交按钮 -->
                <div class="flex items-center gap-3 pt-2">
                  <div v-if="qualitySubmitError" class="flex-1 text-xs text-red-500 flex items-center gap-1">
                    <XCircle class="w-3 h-3" />{{ qualitySubmitError }}
                  </div>
                  <button @click="submitQuality"
                    :disabled="qualityPendingFiles.length === 0"
                    class="ml-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                    提交素质评价（第 {{ myQualitySubmissions.length + 1 }} 次）
                  </button>
                </div>
              </div>
            </div>
            </div>
            </div>
          </div>

        <div class="lg:col-span-4">
          <!-- ===== 综合评价 ===== -->
          <div v-if="activeTab === 'eval_overview'">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 左列：最终综合评价 -->
            <div class="space-y-6">
              <!-- 最终综合评价卡片 -->
              <div class="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/10 border border-blue-500/20">
                <div class="flex items-center justify-between mb-5">
                  <div>
                    <p class="text-blue-100/80 text-xs mb-2 tracking-wide">
                      {{ selectedSession === null ? '最终综合评分' : `第 ${selectedSession} 次综合评分` }}
                    </p>
                    <p class="text-4xl font-bold leading-none drop-shadow-sm">
                      {{ currentComprehensiveScore ?? '-' }}<span class="text-lg text-blue-200/80 ml-1 font-medium">分</span>
                    </p>
                    <p class="text-blue-100/60 text-xs mt-2">作为平时分计入总成绩</p>
                  </div>
                  <div class="text-right bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm border border-white/10">
                    <p class="text-blue-100/70 text-xs mb-1">班级平均</p>
                    <p class="text-2xl font-semibold">{{ classAvgScore }}<span class="text-xs text-blue-200/80 ml-0.5">分</span></p>
                  </div>
                </div>
                <!-- 分数条对比 -->
                <div class="relative h-2.5 bg-white/15 rounded-full overflow-hidden">
                  <div class="absolute top-0 h-full w-0.5 bg-white/80 z-10" :style="{ left: classAvgScore + '%' }" />
                  <div v-if="currentComprehensiveScore !== null" class="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400 transition-all"
                    :style="{ width: Math.min(currentComprehensiveScore, 100) + '%' }" />
                </div>
                <div class="flex justify-between text-blue-100/60 text-xs mt-1.5">
                  <span>0</span>
                  <span class="text-white/80 font-medium">▼ 平均 {{ classAvgScore }}</span>
                  <span>100</span>
                </div>
              </div>

            <!-- 次数选择器 -->
            <div v-if="sessionComprehensiveScores.length > 0" class="bg-white rounded-2xl p-5 border border-brand-400/20 shadow-sm">
              <h3 class="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                <Calendar class="w-4 h-4 text-blue-500" /> 查看各次评价
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  @click="selectedSession = null"
                  class="px-4 py-2 rounded-full text-sm font-medium transition-all border"
                  :class="selectedSession === null
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-white text-gray-600 border-brand-400/30 hover:border-blue-300 hover:text-blue-600'">
                  最终
                  <span v-if="finalComprehensiveScore !== null" class="ml-1 font-bold">({{ finalComprehensiveScore }})</span>
                </button>
                <button
                  v-for="s in sessionComprehensiveScores"
                  :key="s.session"
                  @click="selectedSession = s.session"
                  class="px-4 py-2 rounded-full text-sm font-medium transition-all border"
                  :class="selectedSession === s.session
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-white text-gray-600 border-brand-400/30 hover:border-blue-300 hover:text-blue-600'">
                  第{{ s.session }}次
                  <span v-if="s.score !== null" class="ml-1 font-bold">({{ s.score }})</span>
                  <span v-else class="ml-1 text-gray-300">(-)</span>
                </button>
              </div>
            </div>

            <!-- 评价维度细分 -->
            <div class="bg-white rounded-2xl p-5 border border-brand-400/20 shadow-sm">
              <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
                <BarChart3 class="w-4 h-4 text-blue-500" /> 评价维度细分
                <span v-if="selectedSession !== null" class="text-xs font-normal text-gray-400 ml-1">· 第 {{ selectedSession }} 次</span>
                <span v-else class="text-xs font-normal text-gray-400 ml-1">· 全部平均</span>
              </h3>
              <div class="space-y-3.5">
                <div v-for="dim in evalDimensions" :key="dim.label"
                  class="flex items-center gap-3 p-3 rounded-xl border border-brand-400/15 bg-brand-400/[0.02] hover:border-brand-400/30 transition-colors">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    :class="dim.iconBg">
                    <component :is="dim.icon" class="w-4 h-4" :class="dim.iconColor" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">{{ dim.label }}</p>
                    <div class="flex items-center gap-2 mt-1.5">
                      <div class="flex-1 bg-brand-400/10 rounded-full h-2 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500" :class="dim.barColor"
                          :style="{ width: (dim.score / (dim.maxScore || 100) * 100) + '%' }" />
                      </div>
                      <span class="text-xs font-bold text-brand-600 w-12 text-right">
                        {{ dim.score }}<span class="text-gray-400 font-normal">/{{ dim.maxScore || 100 }}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div v-if="evalDimensions.length === 0" class="text-center py-6 text-gray-400">暂无评价数据</div>
              </div>
            </div>

            <!-- 能力雷达图 -->
            <div class="bg-white rounded-2xl p-5 border border-brand-400/20 shadow-sm">
              <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
                <Network class="w-4 h-4 text-blue-500" /> 能力雷达
                <span v-if="selectedSession !== null" class="text-xs font-normal text-gray-400 ml-1">· 第 {{ selectedSession }} 次</span>
                <span v-else class="text-xs font-normal text-gray-400 ml-1">· 全部评价</span>
              </h3>
              <RadarChart
                :labels="overviewRadarData.labels"
                :values="overviewRadarData.values"
                :count="overviewRadarData.count"
                empty-text="暂无分项评价数据，评分后自动生成雷达图。"
              />
            </div>

            <!-- 成绩权重说明 -->
            <div v-if="currentCfg" class="bg-gradient-to-br from-brand-50 to-blue-50 rounded-2xl p-5 border border-brand-200 text-sm text-brand-800 shadow-sm">
              <p class="font-semibold mb-2 flex items-center gap-1.5">
                <PieChart class="w-4 h-4 text-brand-600" /> 成绩构成
              </p>
              <p>总成绩 = 平时成绩({{ currentCfg.regularWeight }}%) + 期中成绩({{ currentCfg.midtermWeight }}%) + 期末成绩({{ currentCfg.finalWeight }}%)</p>
              <p class="text-xs text-brand-700 mt-1.5 leading-relaxed">
                平时成绩构成：个人自评({{ currentCfg.selfEvalWeight }}%) + 小组内互评({{ currentCfg.peerReviewWeight }}%) + 小组间互评({{ currentCfg.interGroupEvalWeight }}%) + 教师评价({{ currentCfg.teacherScoreWeight }}%) + 企业导师评价({{ currentCfg.mentorScoreWeight }}%)
              </p>
            </div>
            </div>

            <!-- ===== 右列：增值评价 ===== -->
            <div class="space-y-6">
          <!-- 说明 -->
          <div class="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 rounded-2xl p-5 border border-blue-500/20 text-white shadow-lg shadow-blue-600/10">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/10">
                <TrendingUp class="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-white">增值评价</h3>
                <p class="text-blue-100/70 text-xs mt-0.5">学业成长趋势分析</p>
              </div>
            </div>
            <p class="text-blue-100/80 text-sm mt-3 leading-relaxed">
              基于本课程历次评价数据，分析你的学习进步趋势，直观展示学业成长轨迹。
            </p>
          </div>

          <!-- 有数据时显示折线图 -->
          <div v-if="valueAddedData.length > 0" class="space-y-6">
            <!-- 统计卡片 -->
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-white rounded-2xl p-4 border border-brand-400/20 shadow-sm">
                <p class="text-xs text-gray-400 mb-1.5">当前得分</p>
                <p class="text-2xl font-bold text-gray-900">{{ valueAddedData[valueAddedData.length - 1].score }}</p>
                <p class="text-xs text-gray-400 mt-1">第{{ valueAddedData.length }}次评价</p>
              </div>
              <div v-if="valueAddedStats" class="bg-white rounded-2xl p-4 border border-brand-400/20 shadow-sm">
                <p class="text-xs text-gray-400 mb-1.5">相比上次</p>
                <p class="text-2xl font-bold" :class="valueAddedStats.change > 0 ? 'text-emerald-600' : valueAddedStats.change < 0 ? 'text-red-500' : 'text-gray-500'">
                  {{ valueAddedStats.change > 0 ? '+' : '' }}{{ valueAddedStats.change.toFixed(1) }}
                </p>
                <p class="text-xs text-gray-400 mt-1">{{ valueAddedStats.change > 0 ? '进步' : valueAddedStats.change < 0 ? '退步' : '保持不变' }}</p>
              </div>
              <div v-if="valueAddedImprovement" class="bg-white rounded-2xl p-4 border border-brand-400/20 shadow-sm">
                <p class="text-xs text-gray-400 mb-1.5">累计变化</p>
                <p class="text-2xl font-bold" :class="valueAddedImprovement.totalChange > 0 ? 'text-emerald-600' : valueAddedImprovement.totalChange < 0 ? 'text-red-500' : 'text-gray-500'">
                  {{ valueAddedImprovement.totalChange > 0 ? '+' : '' }}{{ valueAddedImprovement.totalChange.toFixed(1) }}
                </p>
                <p class="text-xs text-gray-400 mt-1">共{{ valueAddedData.length }}次评价</p>
              </div>
            </div>

            <!-- 折线图 -->
            <div class="bg-white rounded-2xl p-6 border border-brand-400/20 shadow-sm">
              <h3 class="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
                <TrendingUp class="w-4 h-4 text-blue-500" /> 成绩趋势图
              </h3>
              <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="w-full" style="min-height: 200px">
                <!-- 背景网格 -->
                <defs>
                  <pattern id="valueAddedGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" stroke-width="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#valueAddedGrid)" />
                
                <!-- Y轴 -->
                <line 
                  :x1="padding.left" :y1="padding.top" 
                  :x2="padding.left" :y2="padding.top + innerHeight" 
                  stroke="#e5e7eb" stroke-width="1" />
                
                <!-- X轴 -->
                <line 
                  :x1="padding.left" :y1="padding.top + innerHeight" 
                  :x2="padding.left + innerWidth" :y2="padding.top + innerHeight" 
                  stroke="#e5e7eb" stroke-width="1" />
                
                <!-- Y轴刻度 -->
                <g v-for="i in 5" :key="'y-tick-' + i">
                  <line 
                    :x1="padding.left - 5" 
                    :y1="padding.top + innerHeight * (1 - (i - 1) / 4)"
                    :x2="padding.left" 
                    :y2="padding.top + innerHeight * (1 - (i - 1) / 4)"
                    stroke="#9ca3af" stroke-width="1" />
                  <text 
                    :x="padding.left - 8" 
                    :y="padding.top + innerHeight * (1 - (i - 1) / 4) + 3"
                    text-anchor="end" 
                    font-size="10" 
                    fill="#9ca3af">
                    {{ 100 - (i - 1) * 25 }}
                  </text>
                </g>
                
                <!-- 折线 -->
                <polyline
                  :points="linePoints"
                  fill="none"
                  stroke="#2563eb"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                
                <!-- 渐变填充 -->
                <defs>
                  <linearGradient id="valueAddedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#2563eb" stop-opacity="0.3" />
                    <stop offset="100%" stop-color="#2563eb" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  :points="areaPoints"
                  fill="url(#valueAddedGradient)"
                />
                
                <!-- 数据点 -->
                <g v-for="(point, i) in valueAddedData" :key="'point-' + i">
                  <circle
                    :cx="padding.left + (valueAddedData.length > 1 ? i * xStep : innerWidth / 2)"
                    :cy="padding.top + innerHeight * (1 - point.score / 100)"
                    r="5"
                    fill="#2563eb"
                    stroke="white"
                    stroke-width="2"
                    class="cursor-pointer"
                  >
                    <title>{{ point.label }}: {{ point.score }}分</title>
                  </circle>
                  <text
                    :x="padding.left + (valueAddedData.length > 1 ? i * xStep : innerWidth / 2)"
                    :y="padding.top + innerHeight * (1 - point.score / 100) - 12"
                    text-anchor="middle"
                    font-size="10"
                    font-weight="bold"
                    fill="#2563eb">
                    {{ point.score }}
                  </text>
                  <text
                    :x="padding.left + (valueAddedData.length > 1 ? i * xStep : innerWidth / 2)"
                    :y="padding.top + innerHeight + 20"
                    text-anchor="middle"
                    font-size="10"
                    fill="#6b7280">
                    {{ point.label }}
                  </text>
                </g>
              </svg>
            </div>

            <!-- 进步建议 -->
            <div v-if="valueAddedImprovement" class="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl p-5 border border-emerald-100 text-white shadow-lg shadow-emerald-500/10">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/20">
                  <TrendingUp class="w-5 h-5 text-white" />
                </div>
                <div>
                  <p class="text-base font-semibold text-white">
                    {{ valueAddedImprovement.totalChange > 0 ? '学习状态良好' : valueAddedImprovement.totalChange < 0 ? '需要加强学习' : '保持稳定' }}
                  </p>
                  <p class="text-white/80 text-sm mt-1 leading-relaxed">
                    {{ valueAddedImprovement.totalChange > 0 
                      ? `平均每次进步 ${valueAddedImprovement.avgChangePerSession.toFixed(1)} 分，继续保持！` 
                      : valueAddedImprovement.totalChange < 0 
                        ? `平均每次退步 ${Math.abs(valueAddedImprovement.avgChangePerSession).toFixed(1)} 分，建议加强复习。` 
                        : '成绩保持稳定，继续努力提升！' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 无数据时显示空状态 -->
          <div v-else class="bg-white rounded-2xl p-12 border border-brand-400/20 text-center shadow-sm">
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <TrendingUp class="w-8 h-8 text-blue-500" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">暂无增值评价数据</h3>
            <p class="text-sm text-gray-500">完成至少一次课程评价后，系统将自动生成你的增值评价趋势图</p>
            <button 
              v-if="(activeTab as string) !== 'evaluations'"
              @click="activeTab = 'evaluations'"
              class="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-sm font-medium rounded-full shadow-md shadow-blue-600/20 transition-colors">
              去评价填写
            </button>
          </div>
          </div>
          </div>
        </div>
        </div>

      <!-- ===== 右侧栏（D3 渲染） ===== -->
      <div class="lg:col-span-1" id="course-learn-sidebar"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import {
  ArrowLeft, BookOpen, FileText, ClipboardCheck, Edit3,
  CheckCircle, Circle, Layers, Award, Sparkles, UserCheck, Users, MessageSquare, ArrowRight, Eye, HelpCircle, Lock, XCircle,
  Download, Upload, TrendingUp, X, Calendar, BarChart3, PieChart, Network, BookMarked
} from 'lucide-vue-next'
import StudentHomework from '@/components/Homework/StudentHomework.vue'
import { javaListCourseStandards } from '@/api/knowledgeGraph'
import KnowledgeGraph from '@/components/knowledge/KnowledgeGraph.vue'
import RadarChart from '@/components/RadarChart.vue'
import type { AITierQuestion, LearningTier, CloudFile, QualityEvalFile, Schedule } from '@/types'
import Modal from '@/components/Modal.vue'
import { fetchSchedules } from '@/api'
import { getNow, parseLocalDate } from '@/lib/date'
import { computeRadarData } from '@/lib/evalRadar'
import { getStoredStudentSession } from '@/lib/studentSession'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const courseId = route.params.id as string
const studentSession = computed(() => getStoredStudentSession())
const myStudent = computed(() => {
  const session = studentSession.value
  return (
    store.students.find((student) => session.id && student.id === session.id) ||
    store.students.find((student) => session.studentId && student.studentId === session.studentId) ||
    store.students.find((student) => session.name && student.name === session.name) ||
    store.students.find((student) => student.name === store.currentUser) ||
    null
  )
})
const homeworkStudentId = computed(() =>
  studentSession.value.studentId ||
  myStudent.value?.studentId ||
  myStudent.value?.id ||
  studentSession.value.id ||
  '',
)
const currentClassName = computed(() =>
  myStudent.value?.className ||
  studentSession.value.className ||
  '',
)

// 支持 ?tab=xxx 直达对应模块（用于红点溯源跳转）
const VALID_TABS = ['ai_tier', 'course-mgmt', 'course_standard', 'tasks', 'resources', 'homework', 'evaluations', 'eval_overview']
const activeTab = ref<string>(
  VALID_TABS.includes(route.query.tab as string) ? (route.query.tab as string) : 'tasks'
)
const selectedFiles = ref<Record<string, File>>({})

// ===== 课程标准（教师上传，自动同步展示） =====
const courseStandards = ref<any[]>([])
const standardsLoading = ref(false)
async function loadCourseStandards() {
  standardsLoading.value = true
  try {
    const list: any = await javaListCourseStandards(courseId)
    courseStandards.value = Array.isArray(list) ? list : []
  } catch {
    courseStandards.value = []
  } finally {
    standardsLoading.value = false
  }
}

onMounted(async () => {
  loadCourseStandards()
  try {
    const response = await fetchSchedules(
      currentClassName.value
        ? { courseId, class: currentClassName.value }
        : { courseId },
    )
    const remoteSchedules = (response.schedules ?? []) as Schedule[]
    if (remoteSchedules.length > 0) {
      store.schedules = [
        ...store.schedules.filter((schedule) => {
          if (schedule.courseId !== courseId) return true
          if (!currentClassName.value) return false
          return String(schedule.className ?? '').trim() !== currentClassName.value
        }),
        ...remoteSchedules,
      ]

      const latestEndDate = remoteSchedules
        .map((schedule) => parseLocalDate(schedule.endDate))
        .filter((date): date is Date => date !== null)
        .reduce<Date | null>((latest, current) => {
          if (!latest || current.getTime() > latest.getTime()) return current
          return latest
        }, null)

      const currentCourse = store.courses.find((course) => course.id === courseId)
      if (currentCourse && latestEndDate) {
        const endDate = [
          latestEndDate.getFullYear(),
          String(latestEndDate.getMonth() + 1).padStart(2, '0'),
          String(latestEndDate.getDate()).padStart(2, '0'),
        ].join('-')
        store.courses = store.courses.map((course) =>
          course.id === courseId ? { ...course, endDate } : course
        )
      }
    }
  } catch (error) {
    console.warn('同步课程结束日期失败，继续使用本地课程数据:', error)
  }

  await store.syncCourseEvaluationState(courseId)
  await store.syncQualityEvaluationState(courseId)
  store.pushNearDeadlineEvalReminders()
  if (myStudent.value) {
    store.autoAssignOverdueBasicTier(courseId, myStudent.value.id, currentClassName.value)
    await store.syncStudentHomeworkTodos(courseId, myStudent.value.id)
  }
})

// 路由 query 变化时切换 tab（红点溯源：同一页面内二次跳转）
watch(() => route.query.tab, (val) => {
  if (val && VALID_TABS.includes(val as string)) {
    activeTab.value = val as string
  }
})

const tabs = [
  { id: 'ai_tier', label: 'AI分层', icon: Layers },
  { id: 'course-mgmt', label: '课程图谱', icon: Network },
  { id: 'course_standard', label: '课程标准', icon: BookMarked },
  { id: 'evaluations', label: '素质评价', icon: UserCheck },
  { id: 'eval_overview', label: '综合评价', icon: Award },
]

const course = computed(() => store.courses.find((c) => c.id === courseId))
const isReadOnly = computed(() => store.isCourseEnded(courseId, currentClassName.value))
const myEnrollment = computed(() =>
  store.enrollments.find((e) => e.courseId === courseId && e.studentId === myStudent.value?.id)
)
const myGrade = computed(() =>
  store.grades.find((g) => g.courseId === courseId && g.studentId === myStudent.value?.id)
)

// ===== 任务：显示当前课程未完成的真实作业 =====
const courseTasks = computed(() => store.getPendingStudentHomeworkTasks(courseId))

// ===== 资源（从store获取课程关联资源） =====
const courseResources = computed(() => store.getCourseCloudFiles(courseId))

// ===== 作业（从store获取课程作业） =====
const courseHomework = computed(() => store.getCourseHomework(courseId))
const submittedCount = computed(() => courseHomework.value.filter(hw => isHomeworkSubmitted(hw.id)).length)

// ===== AI 分层 =====
const tierRecord = computed(() =>
  myStudent.value ? store.getStudentTier(courseId, myStudent.value.id) : null
)
const myTier = computed<LearningTier>(() => tierRecord.value?.tier ?? 'basic')
const myTierScore = computed(() => tierRecord.value?.score ?? 0)
const tierFinalized = computed(() => tierRecord.value !== null)
const firstClassEnded = computed(() => store.isFirstClassStarted(courseId, currentClassName.value))
const secondClassStarted = computed(() => store.isSecondClassStarted(courseId, currentClassName.value))
// 是否逾期自动分配（score=0 且第二节课已开始）
const isAutoAssigned = computed(() =>
  tierFinalized.value && secondClassStarted.value && myTierScore.value === 0
)

const tierLabel = computed(() => {
  const map = { basic: '基础层', advanced: '进阶层', excellent: '卓越层' }
  return tierFinalized.value ? map[myTier.value] : '未分层'
})

const tierBadgeClass = computed(() => {
  if (!tierFinalized.value) return 'bg-brand-400/10 text-brand-700 border border-brand-400'
  const map = {
    basic: 'bg-brand-400/10 text-brand-700 border border-brand-400',
    advanced: 'bg-blue-600/10 text-blue-600 border border-blue-400',
    excellent: 'bg-emerald-600/10 text-emerald-600 border border-emerald-400',
  }
  return map[myTier.value]
})

// ===== 增值评价 =====
const valueAddedData = computed(() => {
  if (!myStudent.value) return []
  const studentId = myStudent.value.id
  
  const evals = store.evaluations
    .filter(ev => ev.courseId === courseId && ev.studentId === studentId && ev.score > 0)
    .sort((a, b) => a.sessionNumber - b.sessionNumber)
  
  if (evals.length === 0) return []
  
  return evals.map(ev => ({
    session: ev.sessionNumber,
    score: ev.score,
    label: `第${ev.sessionNumber}次`
  }))
})

const valueAddedStats = computed(() => {
  const data = valueAddedData.value
  if (data.length < 2) return null
  
  const currentScore = data[data.length - 1].score
  const previousScore = data[data.length - 2].score
  const change = currentScore - previousScore
  
  return {
    currentScore,
    previousScore,
    change,
    hasTrend: true
  }
})

const valueAddedImprovement = computed(() => {
  const data = valueAddedData.value
  if (data.length < 2) return null
  
  // 计算整体提升/退步趋势
  let totalChange = 0
  for (let i = 1; i < data.length; i++) {
    totalChange += data[i].score - data[i-1].score
  }
  
  return {
    totalChange,
    avgChangePerSession: totalChange / (data.length - 1)
  }
})

// ===== 增值评价图表计算 =====
const chartWidth = 500
const chartHeight = 200
const padding = { top: 20, right: 20, bottom: 35, left: 45 }
const innerWidth = chartWidth - padding.left - padding.right
const innerHeight = chartHeight - padding.top - padding.bottom

const xStep = computed(() => {
  if (valueAddedData.value.length <= 1) return 0
  return innerWidth / (valueAddedData.value.length - 1)
})

const linePoints = computed(() => {
  return valueAddedData.value.map((point, i) => {
    const x = padding.left + (valueAddedData.value.length > 1 ? i * xStep.value : innerWidth / 2)
    const y = padding.top + innerHeight * (1 - point.score / 100)
    return `${x},${y}`
  }).join(' ')
})

const areaPoints = computed(() => {
  if (valueAddedData.value.length === 0) return ''
  const points = valueAddedData.value.map((point, i) => {
    const x = padding.left + (valueAddedData.value.length > 1 ? i * xStep.value : innerWidth / 2)
    const y = padding.top + innerHeight * (1 - point.score / 100)
    return `${x},${y}`
  })
  // 添加底部两个点形成封闭区域
  const firstX = padding.left + (valueAddedData.value.length > 1 ? 0 * xStep.value : innerWidth / 2)
  const lastX = padding.left + (valueAddedData.value.length > 1 ? (valueAddedData.value.length - 1) * xStep.value : innerWidth / 2)
  const bottomY = padding.top + innerHeight
  return `${firstX},${bottomY} ${points.join(' ')} ${lastX},${bottomY}`
})

// ===== AI 分层测试弹窗 =====
const aiTestOpen = ref(false)
const testQuestions = ref<AITierQuestion[]>([])
const testAnswers = ref<Record<string, number | boolean>>({})
const testSubmitted = ref(false)
const testScore = ref(0)

function getMockAITierQuestions(courseId: string): AITierQuestion[] {
  const questionSets: Record<string, AITierQuestion[]> = {
    'course-1': [
      { id: 'q1', type: 'single_choice', question: 'React 中 JSX 最终会被编译成什么？', options: ['原生 HTML', 'JavaScript 函数调用', 'CSS 代码', 'XML 标记'], answer: 1, score: 10 },
      { id: 'q2', type: 'single_choice', question: '以下哪个 Hook 用于管理副作用？', options: ['useState', 'useEffect', 'useContext', 'useReducer'], answer: 1, score: 10 },
      { id: 'q3', type: 'true_false', question: 'React 组件名必须大写字母开头', options: ['正确', '错误'], answer: true, score: 10 },
      { id: 'q4', type: 'single_choice', question: 'Props 在组件间是？', options: ['可变的', '只读的', '异步的', '全局的'], answer: 1, score: 10 },
      { id: 'q5', type: 'true_false', question: 'useState 的更新是同步的', options: ['正确', '错误'], answer: false, score: 10 },
      { id: 'q6', type: 'single_choice', question: '以下哪个不是 React 生命周期方法？', options: ['componentDidMount', 'componentWillUnmount', 'componentRendered', 'componentDidUpdate'], answer: 2, score: 10 },
      { id: 'q7', type: 'true_false', question: '虚拟 DOM 可以提高页面渲染性能', options: ['正确', '错误'], answer: true, score: 10 },
      { id: 'q8', type: 'single_choice', question: 'React 中列表渲染需要使用什么属性？', options: ['id', 'key', 'ref', 'index'], answer: 1, score: 10 },
      { id: 'q9', type: 'single_choice', question: '以下哪个是受控组件的特征？', options: ['由 DOM 控制状态', '由 React state 控制表单值', '使用 ref 获取值', '无需事件处理'], answer: 1, score: 10 },
      { id: 'q10', type: 'true_false', question: 'React.Fragment 可以包含 key 属性', options: ['正确', '错误'], answer: true, score: 10 },
    ],
    'course-2': [
      { id: 'q1', type: 'single_choice', question: 'Python 中列表使用什么符号？', options: ['()', '[]', '{}', '<>'], answer: 1, score: 10 },
      { id: 'q2', type: 'single_choice', question: 'NumPy 数组相比 Python 列表的主要优势是？', options: ['支持更多数据类型', '向量化运算速度快', '占用更少内存', '以上都是'], answer: 3, score: 10 },
      { id: 'q3', type: 'true_false', question: 'Pandas 的 DataFrame 是二维数据结构', options: ['正确', '错误'], answer: true, score: 10 },
      { id: 'q4', type: 'single_choice', question: '以下哪个不是数据可视化的常用库？', options: ['Matplotlib', 'Seaborn', 'NumPy', 'Plotly'], answer: 2, score: 10 },
      { id: 'q5', type: 'true_false', question: '数据清洗是数据分析中最耗时的环节之一', options: ['正确', '错误'], answer: true, score: 10 },
      { id: 'q6', type: 'single_choice', question: '描述性统计不包括以下哪项？', options: ['均值', '标准差', '回归系数', '中位数'], answer: 2, score: 10 },
      { id: 'q7', type: 'true_false', question: '机器学习属于监督学习的一种方法', options: ['正确', '错误'], answer: false, score: 10 },
      { id: 'q8', type: 'single_choice', question: '特征工程的目的是什么？', options: ['增加数据量', '提升模型性能', '减少计算资源', '简化算法'], answer: 1, score: 10 },
      { id: 'q9', type: 'single_choice', question: '以下哪个是降维算法？', options: ['K-Means', 'PCA', '线性回归', '决策树'], answer: 1, score: 10 },
      { id: 'q10', type: 'true_false', question: '交叉验证可以有效防止过拟合', options: ['正确', '错误'], answer: true, score: 10 },
    ],
  }
  return questionSets[courseId] || questionSets['course-1']
}

function openAITest() {
  testQuestions.value = getMockAITierQuestions(courseId)
  testAnswers.value = {}
  testSubmitted.value = false
  testScore.value = 0
  aiTestOpen.value = true
}

function selectAnswer(questionId: string, answer: number | boolean) {
  testAnswers.value = { ...testAnswers.value, [questionId]: answer }
}

function submitAITest() {
  let score = 0
  for (const q of testQuestions.value) {
    const userAnswer = testAnswers.value[q.id]
    if (userAnswer === q.answer) {
      score += q.score
    }
  }
  testScore.value = score
  testSubmitted.value = true

  if (myStudent.value) {
    store.submitAITierTest(courseId, myStudent.value.id, score)
  }
}

function closeAITest() {
  aiTestOpen.value = false
}

const totalQuestions = computed(() => testQuestions.value.length)
const answeredCount = computed(() => Object.keys(testAnswers.value).length)
const allAnswered = computed(() => answeredCount.value === totalQuestions.value)

const aiTips = computed(() => {
  const tier = myTier.value
  if (tier === 'basic') {
    return [
      { title: '基础巩固', desc: '建议回看课程前3章内容，完成所有基础练习题' },
      { title: '重点突破', desc: '核心概念理解还不够深入，推荐观看配套视频讲解' },
      { title: '学习计划', desc: '建议每天安排1小时学习时间，周末可适当增加' },
    ]
  }
  if (tier === 'advanced') {
    return [
      { title: '拓展提升', desc: '基础扎实，可尝试完成课后拓展项目和实战练习' },
      { title: '查漏补缺', desc: '建议重点复习第4-5章薄弱环节，巩固整体知识体系' },
      { title: '能力进阶', desc: '推荐参加线上讨论和组队项目，提升协作实践能力' },
    ]
  }
  return [
    { title: '高阶挑战', desc: '已掌握课程核心内容，建议挑战高级项目和竞赛题目' },
    { title: '知识拓展', desc: '推荐阅读相关领域前沿资料，拓展知识深度和广度' },
    { title: '实践应用', desc: '可以尝试将所学知识应用到实际项目中，产出完整作品' },
  ]
})

// ===== 知识图谱 (节点 + 边) =====
interface KnowledgeNode {
  id: string
  label: string
  mastery: number
  importance: number
  category: 'foundation' | 'core' | 'advanced' | 'comprehensive'
  chapter: string
  description: string
}

interface KnowledgeEdge {
  source: string
  target: string
  relation: 'prerequisite' | 'related_to' | 'extends' | 'part_of'
  label: string
}

interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

function generateKnowledgeGraph(courseId: string, studentId: string): KnowledgeGraph {
  const evals = store.evaluations.filter((e) => e.courseId === courseId && e.studentId === studentId)
  const avgEvalScore = evals.length > 0
    ? Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length)
    : 60
  const progress = myEnrollment.value?.progress ?? 50

  const masteryFor = (base: number): number => Math.min(95, Math.max(20, (base + avgEvalScore + progress) / 2))

  const graphs: Record<string, { nodes: Omit<KnowledgeNode, 'mastery' | 'importance'>[]; edges: KnowledgeEdge[] }> = {
    'course-1': {
      nodes: [
        { id: 'kp-1', label: 'JS语法基础', category: 'foundation', chapter: '第1章', description: '变量、作用域、闭包、原型链等 JS 核心语法' },
        { id: 'kp-2', label: 'React核心概念', category: 'foundation', chapter: '第1章', description: 'JSX、组件化、Props、State 等 React 基础' },
        { id: 'kp-3', label: 'Hooks体系', category: 'core', chapter: '第2章', description: 'useState、useEffect、useContext 等内置 Hooks' },
        { id: 'kp-4', label: '状态管理', category: 'core', chapter: '第2章', description: 'Context API、Reducer、状态提升与共享策略' },
        { id: 'kp-5', label: '组件通信', category: 'core', chapter: '第3章', description: '父子传值、跨层通信、Event Bus 模式' },
        { id: 'kp-6', label: '路由与导航', category: 'core', chapter: '第3章', description: 'React Router 路由配置、嵌套路由、路由守卫' },
        { id: 'kp-7', label: '性能优化', category: 'advanced', chapter: '第4章', description: 'Memo、useCallback、Lazy Loading、虚拟列表' },
        { id: 'kp-8', label: '测试与调试', category: 'advanced', chapter: '第4章', description: 'Jest、React Testing Library、Debug 技巧' },
        { id: 'kp-9', label: '企业级架构', category: 'advanced', chapter: '第5章', description: 'Monorepo、微前端、CI/CD、工程化实践' },
        { id: 'kp-10', label: '综合项目实战', category: 'comprehensive', chapter: '项目', description: '从零搭建完整企业级应用的端到端能力' },
      ],
      edges: [
        { source: 'kp-1', target: 'kp-2', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-2', target: 'kp-3', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-2', target: 'kp-4', relation: 'related_to', label: '相关联' },
        { source: 'kp-3', target: 'kp-5', relation: 'extends', label: '拓展延伸' },
        { source: 'kp-4', target: 'kp-6', relation: 'related_to', label: '相关联' },
        { source: 'kp-3', target: 'kp-7', relation: 'extends', label: '深入扩展' },
        { source: 'kp-5', target: 'kp-8', relation: 'related_to', label: '实践关联' },
        { source: 'kp-7', target: 'kp-9', relation: 'extends', label: '进阶方向' },
        { source: 'kp-6', target: 'kp-9', relation: 'related_to', label: '组合构建' },
        { source: 'kp-9', target: 'kp-10', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-8', target: 'kp-10', relation: 'related_to', label: '实践关联' },
      ],
    },
    'course-2': {
      nodes: [
        { id: 'kp-1', label: 'Python基础', category: 'foundation', chapter: '第1章', description: '数据类型、控制流、函数、面向对象基础' },
        { id: 'kp-2', label: 'NumPy数组计算', category: 'foundation', chapter: '第1章', description: '多维数组、广播机制、向量化运算' },
        { id: 'kp-3', label: 'Pandas数据处理', category: 'core', chapter: '第2章', description: 'DataFrame操作、数据清洗、分组聚合' },
        { id: 'kp-4', label: '数据可视化', category: 'core', chapter: '第2章', description: 'Matplotlib、Seaborn 图表绘制' },
        { id: 'kp-5', label: '统计分析基础', category: 'core', chapter: '第3章', description: '描述统计、假设检验、相关分析' },
        { id: 'kp-6', label: '机器学习入门', category: 'advanced', chapter: '第4章', description: '监督学习、无监督学习基础算法' },
        { id: 'kp-7', label: '特征工程', category: 'advanced', chapter: '第4章', description: '特征选择、降维、数据变换' },
        { id: 'kp-8', label: '综合数据项目', category: 'comprehensive', chapter: '项目', description: '端到端数据分析项目实战能力' },
      ],
      edges: [
        { source: 'kp-1', target: 'kp-2', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-2', target: 'kp-3', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-3', target: 'kp-4', relation: 'related_to', label: '相关联' },
        { source: 'kp-3', target: 'kp-5', relation: 'extends', label: '深入方向' },
        { source: 'kp-5', target: 'kp-6', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-4', target: 'kp-7', relation: 'related_to', label: '实践关联' },
        { source: 'kp-6', target: 'kp-8', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-7', target: 'kp-8', relation: 'related_to', label: '实践关联' },
      ],
    },
    'course-14': {
      nodes: [
        { id: 'kp-1', label: '大模型基础', category: 'foundation', chapter: '第1章', description: 'Transformer 架构、预训练与微调概念' },
        { id: 'kp-2', label: 'Prompt工程', category: 'foundation', chapter: '第1章', description: '提示词设计、Few-shot、思维链技巧' },
        { id: 'kp-3', label: 'API调用集成', category: 'core', chapter: '第2章', description: 'OpenAI API、流式响应、Token管理' },
        { id: 'kp-4', label: 'RAG检索增强', category: 'core', chapter: '第2章', description: '文档索引、向量数据库、语义检索' },
        { id: 'kp-5', label: 'Agent智能体', category: 'core', chapter: '第3章', description: '函数调用、工具链、多智能体协作' },
        { id: 'kp-6', label: '微调与部署', category: 'advanced', chapter: '第3章', description: 'LoRA微调、模型量化、推理优化' },
        { id: 'kp-7', label: '应用安全与评估', category: 'advanced', chapter: '第4章', description: '内容过滤、越狱防护、效果评估' },
        { id: 'kp-8', label: 'AI应用综合开发', category: 'comprehensive', chapter: '项目', description: '打通前/后端+AI能力的完整应用构建' },
      ],
      edges: [
        { source: 'kp-1', target: 'kp-2', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-2', target: 'kp-3', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-1', target: 'kp-4', relation: 'related_to', label: '相关联' },
        { source: 'kp-3', target: 'kp-5', relation: 'extends', label: '进阶方向' },
        { source: 'kp-4', target: 'kp-5', relation: 'related_to', label: '组合构建' },
        { source: 'kp-1', target: 'kp-6', relation: 'extends', label: '深入方向' },
        { source: 'kp-5', target: 'kp-7', relation: 'related_to', label: '实践关联' },
        { source: 'kp-3', target: 'kp-8', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-5', target: 'kp-8', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-6', target: 'kp-8', relation: 'related_to', label: '实践关联' },
      ],
    },
    'course-3': {
      nodes: [
        { id: 'kp-1', label: '设计基础理论', category: 'foundation', chapter: '第1章', description: '色彩理论、排版原则、视觉层级' },
        { id: 'kp-2', label: '用户研究方法', category: 'foundation', chapter: '第1章', description: '用户访谈、问卷、可用性测试方法' },
        { id: 'kp-3', label: '信息架构', category: 'core', chapter: '第2章', description: '内容组织、导航设计、心智模型' },
        { id: 'kp-4', label: '交互设计', category: 'core', chapter: '第2章', description: '用户流程、交互模式、反馈机制' },
        { id: 'kp-5', label: '原型设计', category: 'core', chapter: '第3章', description: '线框图、高保真原型、设计系统' },
        { id: 'kp-6', label: '视觉设计进阶', category: 'advanced', chapter: '第3章', description: '动效设计、微交互、品牌视觉统一' },
        { id: 'kp-7', label: '设计交付与开发', category: 'advanced', chapter: '第4章', description: '标注切图、设计Token、开发协作' },
        { id: 'kp-8', label: '全链路设计项目', category: 'comprehensive', chapter: '项目', description: '从用户研究到上线跟踪的完整设计流程' },
      ],
      edges: [
        { source: 'kp-1', target: 'kp-3', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-2', target: 'kp-3', relation: 'related_to', label: '互补关联' },
        { source: 'kp-3', target: 'kp-4', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-4', target: 'kp-5', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-1', target: 'kp-6', relation: 'extends', label: '进阶方向' },
        { source: 'kp-5', target: 'kp-7', relation: 'related_to', label: '实践关联' },
        { source: 'kp-4', target: 'kp-8', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-5', target: 'kp-8', relation: 'prerequisite', label: '前置依赖' },
        { source: 'kp-6', target: 'kp-8', relation: 'related_to', label: '实践关联' },
      ],
    },
  }

  const defaultGraph = graphs['course-1']
  const courseGraph = graphs[courseId] || defaultGraph

  const catGroups: Record<string, typeof courseGraph.nodes> = {}
  for (const n of courseGraph.nodes) {
    if (!catGroups[n.category]) catGroups[n.category] = []
    catGroups[n.category].push(n)
  }
  const catIdx: Record<string, number> = {}

  const nodes: KnowledgeNode[] = courseGraph.nodes.map((n) => {
    const ci = catIdx[n.category] ?? 0
    catIdx[n.category] = ci + 1

    let importance = 2
    if (n.category === 'foundation' || n.category === 'comprehensive') importance = 3
    else if (n.category === 'core') importance = ci < 2 ? 3 : 2
    else if (n.category === 'advanced') importance = ci < 1 ? 2 : 1

    return {
      ...n,
      mastery: masteryFor(
        n.category === 'foundation' ? 70 + Math.floor(Math.random() * 20) :
        n.category === 'core' ? 50 + Math.floor(Math.random() * 30) :
        n.category === 'advanced' ? 30 + Math.floor(Math.random() * 35) :
        20 + Math.floor(Math.random() * 50)
      ),
      importance,
    }
  })

  return { nodes, edges: courseGraph.edges }
}

const knowledgeGraphData = computed<KnowledgeGraph>(() =>
  generateKnowledgeGraph(courseId, myStudent.value?.id || '')
)

// ===== 知识图谱 SVG 可视化 =====

function nodeLabel(id: string): string {
  const n = knowledgeGraphData.value.nodes.find((n) => n.id === id)
  return n ? n.label : id
}

const SVG_W = 900
const SVG_H = 800
const SVG_CX = SVG_W / 2
const SVG_CY = 460

const categoryRings = computed(() => {
  const rings: { rx: number; ry: number; color: string; label: string }[] = []
  const radii = [145, 240, 330, 415]
  const ringColors = ['#5eb6b9', '#5eb6b9', '#5eb6b9', '#5eb6b9']
  const ringLabels = ['基础知识', '核心知识', '进阶能力', '综合能力']
  for (let i = 0; i < radii.length; i++) {
    rings.push({ rx: radii[i], ry: radii[i] * 0.78, color: ringColors[i], label: ringLabels[i] })
  }
  return rings
})

const relationLegend = [
  { key: 'prerequisite', label: '前置依赖', color: '#429fc4', dash: '' },
  { key: 'related_to', label: '相关联', color: '#5eb6b9', dash: '5,4' },
  { key: 'extends', label: '拓展延伸', color: '#429fc4', dash: '3,5' },
  { key: 'part_of', label: '组成关系', color: '#429fc4', dash: '7,4' },
]

const categoryColors = [
  { key: 'foundation', label: '基础知识', light: '#93c5fd', mid: '#3b82f6', deep: '#1d4ed8' },
  { key: 'core', label: '核心知识', light: '#86efac', mid: '#22c55e', deep: '#15803d' },
  { key: 'advanced', label: '进阶能力', light: '#fde68a', mid: '#f59e0b', deep: '#b45309' },
  { key: 'comprehensive', label: '综合能力', light: '#c4b5fd', mid: '#8b5cf6', deep: '#6d28d9' },
]

function categoryColorMap(cat: string): { light: string; mid: string; deep: string } {
  return categoryColors.find((c) => c.key === cat) || categoryColors[0]
}

function bubbleColor(mastery: number, category: string): string {
  const cc = categoryColorMap(category)
  if (mastery >= 80) return cc.deep
  if (mastery >= 50) return cc.mid
  return cc.light
}

function bubbleSize(importance: number): number {
  return importance === 3 ? 55 : importance === 2 ? 42 : 30
}

function bubbleFontSize(r: number): number {
  return r >= 50 ? 14 : r >= 38 ? 12 : 10
}

interface PositionedNode {
  x: number
  y: number
  r: number
  fill: string
  node: KnowledgeNode
}

const positionedNodes = computed<PositionedNode[]>(() => {
  const nodes = knowledgeGraphData.value.nodes
  const categoryRadius: Record<string, number> = {
    foundation: 145,
    core: 240,
    advanced: 330,
    comprehensive: 415,
  }
  const ringAngleOffsets: Record<string, number> = {
    foundation: 0,
    core: 30,
    advanced: -25,
    comprehensive: 20,
  }

  const grouped: Record<string, KnowledgeNode[]> = {}
  for (const n of nodes) {
    if (!grouped[n.category]) grouped[n.category] = []
    grouped[n.category].push(n)
  }

  const result: PositionedNode[] = []
  for (const [cat, catNodes] of Object.entries(grouped)) {
    const r = categoryRadius[cat] || 160
    const count = catNodes.length
    const arcDeg = Math.min(200, 60 + count * 30)
    const arcRad = (arcDeg * Math.PI) / 180
    const offsetRad = ((ringAngleOffsets[cat] || 0) * Math.PI) / 180
    const startAngle = -Math.PI / 2 - arcRad / 2 + offsetRad
    const step = count > 1 ? arcRad / (count - 1) : 0

    catNodes.forEach((node, i) => {
      const angle = startAngle + step * i
      const radius = bubbleSize(node.importance)
      const fill = bubbleColor(node.mastery, cat)
      result.push({
        x: SVG_CX + r * Math.cos(angle),
        y: SVG_CY + r * Math.sin(angle),
        r: radius,
        fill,
        node,
      })
    })
  }

  const MIN_GAP = 14
  for (let iter = 0; iter < 3; iter++) {
    let moved = false
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i]
        const b = result[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = a.r + b.r + MIN_GAP
        if (dist < minDist && dist > 0.01) {
          const push = (minDist - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          a.x -= nx * push
          a.y -= ny * push
          b.x += nx * push
          b.y += ny * push
          moved = true
        }
      }
    }
    if (!moved) break
  }

  return result
})

interface RenderedEdge {
  source: string
  target: string
  path: string
  arrow: string
  midX: number
  midY: number
  label: string
  color: string
  dash: string
  width: number
}

const renderedEdges = computed<RenderedEdge[]>(() => {
  const posMap = new Map<string, { x: number; y: number; r: number }>()
  for (const pn of positionedNodes.value) {
    posMap.set(pn.node.id, { x: pn.x, y: pn.y, r: pn.r })
  }

  const edgeStyles: Record<string, { color: string; dash: string; width: number }> = {
    prerequisite: { color: '#429fc4', dash: '', width: 2 },
    related_to: { color: '#5eb6b9', dash: '5,3', width: 1.5 },
    extends: { color: '#429fc4', dash: '3,4', width: 1.5 },
    part_of: { color: '#429fc4', dash: '7,3', width: 1.5 },
  }

  const result: RenderedEdge[] = []
  for (const edge of knowledgeGraphData.value.edges) {
    const src = posMap.get(edge.source)
    const tgt = posMap.get(edge.target)
    if (!src || !tgt) continue

    const style = edgeStyles[edge.relation] || edgeStyles.related_to

    const dx = tgt.x - src.x
    const dy = tgt.y - src.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) continue
    const nx = dx / dist
    const ny = dy / dist

    const x1 = src.x + nx * src.r
    const y1 = src.y + ny * src.r
    const x2 = tgt.x - nx * tgt.r
    const y2 = tgt.y - ny * tgt.r

    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const cpx = midX - ny * 20
    const cpy = midY + nx * 20
    const path = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`

    const arrowSize = 8
    const ax = x2 - nx * arrowSize
    const ay = y2 - ny * arrowSize
    const apx = -ny * arrowSize * 0.4
    const apy = nx * arrowSize * 0.4
    const arrow = `${ax - apx},${ay - apy} ${x2},${y2} ${ax + apx},${ay + apy}`

    result.push({
      source: edge.source,
      target: edge.target,
      path,
      arrow,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2 - 6,
      label: edge.label,
      color: style.color,
      dash: style.dash,
      width: style.width,
    })
  }
  return result
})

const selectedBubble = ref<string | null>(null)

function bubbleNode(id: string | null): KnowledgeNode | undefined {
  if (!id) return undefined
  return knowledgeGraphData.value.nodes.find((n) => n.id === id)
}

function bubbleEdges(id: string): KnowledgeEdge[] {
  return knowledgeGraphData.value.edges.filter((e) => e.source === id || e.target === id)
}

function relationChipClass(relation: string): string {
  const map: Record<string, string> = {
    prerequisite: 'bg-brand-600/10 text-brand-600',
    related_to: 'bg-brand-400/10 text-brand-600',
    extends: 'bg-brand-600/10 text-brand-600',
    part_of: 'bg-brand-400/10 text-brand-600',
  }
  return map[relation] || 'bg-brand-400/10 text-gray-400'
}

// ===== 综合评价 =====
const totalScore = computed(() => {
  const base = myGrade.value?.score ?? null
  if (base === null || !myStudent.value) return null
  return Math.min(100, base + store.getStudentQualityScore(courseId, myStudent.value.id))
})

const classAvgScore = computed(() => {
  const courseGrades = store.grades.filter((g) => g.courseId === courseId)
  if (courseGrades.length === 0) return 0
  return Math.round(courseGrades.reduce((s, g) => s + g.score, 0) / courseGrades.length)
})

const currentCfg = computed(() => store.getGradeConfig(courseId))

const gradeIconMap: Record<string, any> = {
  self: UserCheck,
  intra_group: Users,
  inter_group: MessageSquare,
  teacher: Award,
  mentor: Sparkles,
}

const gradeLabelMap: Record<string, string> = {
  self: '个人自评',
  intra_group: '小组内互评',
  inter_group: '小组间互评',
  teacher: '教师评价',
  mentor: '企业导师评价',
}

const gradeWeightKeyMap: Record<string, keyof import('@/types').GradeWeightConfig> = {
  self: 'selfEvalWeight',
  intra_group: 'peerReviewWeight',
  inter_group: 'interGroupEvalWeight',
  teacher: 'teacherScoreWeight',
  mentor: 'mentorScoreWeight',
}

const allEvalTypes = ['self', 'intra_group', 'inter_group', 'teacher', 'mentor'] as const
type EvalTypeKey = typeof allEvalTypes[number]

const selectedSession = ref<number | null>(null)

const evalSessions = computed(() => {
  const evals = store.evaluations.filter(
    (e) => e.courseId === courseId && e.studentId === myStudent.value?.id
  )
  const sessions = new Set<number>()
  evals.forEach(e => sessions.add(e.sessionNumber))
  return Array.from(sessions).sort((a, b) => a - b)
})

function calcSessionComprehensiveScore(sessionNumber: number) {
  const cfg = currentCfg.value
  const evals = store.evaluations.filter(
    (e) => e.courseId === courseId && e.studentId === myStudent.value?.id && e.sessionNumber === sessionNumber
  )
  let totalWeight = 0
  let weightedSum = 0
  for (const type of allEvalTypes) {
    const filtered = evals.filter(e => e.type === type)
    if (filtered.length === 0) continue
    const avg = Math.round(filtered.reduce((s, e) => s + e.score, 0) / filtered.length)
    const weight = (cfg[gradeWeightKeyMap[type]] as number) || 0
    weightedSum += avg * weight
    totalWeight += weight
  }
  if (totalWeight === 0) return null
  return Math.round(weightedSum / totalWeight)
}

const sessionComprehensiveScores = computed(() => {
  return evalSessions.value.map(sn => ({
    session: sn,
    score: calcSessionComprehensiveScore(sn),
  }))
})

const finalComprehensiveScore = computed(() => {
  const validScores = sessionComprehensiveScores.value.filter(s => s.score !== null)
  if (validScores.length === 0) return null
  return Math.round(validScores.reduce((s, v) => s + (v.score as number), 0) / validScores.length)
})

const currentComprehensiveScore = computed(() => {
  if (selectedSession.value === null) return finalComprehensiveScore.value
  const found = sessionComprehensiveScores.value.find(s => s.session === selectedSession.value)
  return found ? found.score : null
})

const evalDimensions = computed(() => {
  const evals = store.evaluations.filter(
    (e) => e.courseId === courseId && e.studentId === myStudent.value?.id
  )

  const evalsForCalc = selectedSession.value !== null
    ? evals.filter(e => e.sessionNumber === selectedSession.value)
    : evals

  const calcAvg = (type: string) => {
    const filtered = evalsForCalc.filter((e) => e.type === type)
    if (filtered.length === 0) return null
    return Math.round(filtered.reduce((s, e) => s + e.score, 0) / filtered.length)
  }

  const dims: { label: string; icon: string; iconBg: string; iconColor: string; barColor: string; score: number; maxScore: number }[] = []
  for (const type of allEvalTypes) {
    const score = calcAvg(type)
    if (score !== null) {
      const weight = (currentCfg.value[gradeWeightKeyMap[type]] as number) || 0
      dims.push({
        label: gradeLabelMap[type],
        icon: gradeIconMap[type],
        iconBg: 'bg-brand-600/15',
        iconColor: 'text-brand-600',
        barColor: 'bg-brand-600',
        score,
        maxScore: 100,
      })
    }
  }

  return dims
})

const overviewRadarData = computed(() => {
  const studentId = myStudent.value?.id
  if (!studentId) return { labels: [], values: [], count: 0 }
  const evals = store.evaluations.filter(
    (e) => e.courseId === courseId && e.studentId === studentId &&
      (selectedSession.value === null || e.sessionNumber === selectedSession.value)
  )
  return computeRadarData(evals)
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDateTime(value: any): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getFileTypeName(type: string): string {
  const extMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/docx': 'DOC',
    'application/zip': 'ZIP',
    'application/fig': 'FIG',
    'text/markdown': 'MD',
    'text/csv': 'CSV',
    'application/ipynb': 'IPYNB',
    'text/typescript': 'TS',
    'application/pptx': 'PPT',
  }
  return extMap[type] || '文件'
}

function downloadFile(file: CloudFile) {
  alert(`开始下载：${file.name}`)
}

function goToHomeworkTab() {
  activeTab.value = 'homework'
  void router.replace({
    query: {
      ...route.query,
      tab: 'homework',
    },
  })
}

function isHomeworkSubmitted(homeworkId: string): boolean {
  if (!myStudent.value) return false
  return !!store.getHomeworkSubmission(homeworkId, myStudent.value.id)
}

function getSubmissionFileName(homeworkId: string): string {
  if (!myStudent.value) return ''
  const submission = store.getHomeworkSubmission(homeworkId, myStudent.value.id)
  return submission?.fileName || ''
}

function downloadSubmission(homeworkId: string) {
  if (!myStudent.value) return
  const submission = store.getHomeworkSubmission(homeworkId, myStudent.value.id)
  if (submission) {
    alert(`开始下载已提交作业：${submission.fileName}`)
  }
}

function handleFileSelect(event: Event, homeworkId: string) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFiles.value[homeworkId] = file
  }
}

function submitHomework(hw: typeof courseHomework.value[0]) {
  if (!myStudent.value || !selectedFiles.value[hw.id]) return
  
  const file = selectedFiles.value[hw.id]
  
  store.submitHomework({
    id: `sub-${Date.now()}`,
    homeworkId: hw.id,
    courseId: courseId,
    studentId: myStudent.value.id,
    submittedAt: getNow().toISOString().split('T')[0],
    fileName: file.name,
    fileDataUrl: 'https://example.com/submissions/' + file.name,
    fileSize: file.size,
    fileType: file.type,
  })
  
  delete selectedFiles.value[hw.id]
  alert('作业提交成功！')
}

// ====== 素质评价 ======
const qualityDesc = ref('')
const qualityPendingFiles = ref<QualityEvalFile[]>([])
const qualitySubmitError = ref('')
const qualityFileInputRef = ref<HTMLInputElement | null>(null)

const myQualityRecord = computed(() => {
  if (!myStudent.value) return undefined
  return store.getStudentQualityEvaluation(courseId, myStudent.value.id)
})

// 历史提交列表（最新在前）
const myQualitySubmissions = computed(() => {
  const rec = myQualityRecord.value
  if (!rec) return []
  return [...rec.submissions].reverse()
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

async function handleQualityFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  qualitySubmitError.value = ''
  // 总大小限制（base64 存储于 localStorage，避免撑爆配额）
  const totalSize = qualityPendingFiles.value.reduce((s, f) => s + f.fileSize, 0)
  for (const file of Array.from(files)) {
    if (file.size > 2 * 1024 * 1024) {
      qualitySubmitError.value = `文件 ${file.name} 超过 2MB，已跳过`
      continue
    }
    if (totalSize + file.size > 4 * 1024 * 1024) {
      qualitySubmitError.value = `文件总大小超过 4MB，已停止添加（当前已选 ${(totalSize / 1024 / 1024).toFixed(1)}MB）`
      break
    }
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      qualityPendingFiles.value.push({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        dataUrl,
      })
    } catch {
      qualitySubmitError.value = `文件 ${file.name} 读取失败`
    }
  }
  input.value = ''
}

const qualitySubmitting = ref(false)

async function submitQuality() {
  if (!myStudent.value) return
  if (qualitySubmitting.value) return
  qualitySubmitError.value = ''

  // 多次提交：每次提交必须有新的文件
  if (qualityPendingFiles.value.length === 0) {
    qualitySubmitError.value = '请至少上传一份文件'
    return
  }

  qualitySubmitting.value = true
  try {
    await store.submitQualityEvaluation({
      courseId,
      studentId: myStudent.value.id,
      files: qualityPendingFiles.value,
      description: qualityDesc.value,
    })

    qualityPendingFiles.value = []
    qualityDesc.value = ''
    alert('素质评价提交成功！请等待教师批改。')
  } catch (error) {
    qualitySubmitError.value = error instanceof Error
      ? error.message
      : '提交失败，请稍后重试'
  } finally {
    qualitySubmitting.value = false
  }
}
</script>
