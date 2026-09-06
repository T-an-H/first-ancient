<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
    <div class="relative bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
      <!-- 头部 -->
      <div class="sticky top-0 bg-white z-10 border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <GitBranch class="w-5 h-5 text-indigo-500" />
          </div>
          <div class="min-w-0">
            <h3 class="text-lg font-semibold text-gray-900 leading-tight">{{ project.name }}</h3>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ project.hours }} 学时<template v-if="project.weekNo"> · 第{{ project.weekNo }}周</template>
              <template v-if="project.knowledgePoints"> · {{ project.knowledgePoints }}</template>
            </p>
          </div>
        </div>
        <button @click="$emit('close')" class="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 项目信息摘要 -->
      <div class="px-6 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-[10px] text-gray-400 mb-1">教学内容</p>
          <p class="text-xs text-gray-700">{{ project.content || '—' }}</p>
        </div>
        <div class="bg-amber-50 rounded-lg p-3">
          <p class="text-[10px] text-amber-500 mb-1">重点/难点</p>
          <p class="text-xs text-amber-700">{{ project.keyPoints || '—' }}</p>
        </div>
        <div class="bg-indigo-50 rounded-lg p-3">
          <p class="text-[10px] text-indigo-500 mb-1">知识点</p>
          <p class="text-xs text-indigo-700">{{ project.knowledgePoints || '—' }}</p>
        </div>
      </div>

      <!-- 5 大内容 Tab -->
      <div class="px-6 pt-4 flex gap-1 border-b border-gray-100 overflow-x-auto">
        <button v-for="s in sections" :key="s.key" @click="activeSection = s.key"
          :class="`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-all ${activeSection === s.key ? 'bg-indigo-50 text-indigo-600 border border-b-0 border-indigo-100 -mb-px' : 'text-gray-500 hover:text-gray-700'}`">
          <component :is="s.icon" class="w-4 h-4" />
          {{ s.label }}
        </button>
      </div>

      <div class="p-6 space-y-6">
        <!-- ===== 1 预习资料 ===== -->
        <div v-if="activeSection === 'preview'">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="font-semibold text-gray-900">预习资料</h4>
              <p class="text-xs text-gray-400 mt-0.5">教师上传预习资料，学生查看后计入预习进度</p>
            </div>
            <div v-if="canManage" class="flex items-center gap-2">
              <input ref="previewFileInput" type="file" class="hidden" multiple @change="onFileChange('preview', $event)" />
              <button @click="previewFileInput?.click()" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg">
                <Upload class="w-3.5 h-3.5" /> 上传预习资料
              </button>
            </div>
          </div>
          <div v-if="files.preview.length === 0" class="text-center py-8 text-gray-400 text-sm">暂无预习资料</div>
          <ul v-else class="space-y-1.5 mb-4">
            <li v-for="f in files.preview" :key="f.id" class="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <FileText class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span v-if="f.dataUrl" @click="openFileDetail(f.dataUrl)" class="flex-1 min-w-0 truncate text-blue-600 hover:underline cursor-pointer">{{ f.name }}</span>
              <span v-else class="flex-1 min-w-0 truncate">{{ f.name }}</span>
              <span class="text-gray-400 flex-shrink-0">{{ formatFileSize(f.size) }}</span>
              <button v-if="canManage" @click="deleteFile('preview', f)" class="text-gray-400 hover:text-red-500 flex-shrink-0"><X class="w-3.5 h-3.5" /></button>
            </li>
          </ul>
          <!-- 学生预习进度 -->
          <div class="border-t border-gray-100 pt-4">
            <h5 class="text-xs font-semibold text-gray-500 mb-2">同学预习进度（{{ previewDoneCount }}/{{ students.length }}）</h5>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="s in students" :key="s.id"
                :class="`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${hasProgress(s.id, 'preview') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-50 text-gray-400 border border-gray-200'}`">
                <CheckCircle v-if="hasProgress(s.id, 'preview')" class="w-3 h-3" />
                <Clock v-else class="w-3 h-3" />
                {{ s.name }}
              </span>
              <span v-if="students.length === 0" class="text-xs text-gray-400">暂无学生</span>
            </div>
          </div>
        </div>

        <!-- ===== 2 工单 ===== -->
        <div v-if="activeSection === 'workorder'">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="font-semibold text-gray-900">本节课工单</h4>
              <p class="text-xs text-gray-400 mt-0.5">教师上传工单，学生下载完成后提交，教师批改打分</p>
            </div>
            <div v-if="canManage" class="flex items-center gap-2">
              <input ref="workorderFileInput" type="file" class="hidden" multiple @change="onFileChange('workorder', $event)" />
              <button @click="workorderFileInput?.click()" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg">
                <Upload class="w-3.5 h-3.5" /> 上传工单
              </button>
            </div>
          </div>
          <div v-if="files.workorder.length === 0" class="text-center py-8 text-gray-400 text-sm">暂无工单</div>
          <ul v-else class="space-y-1.5 mb-4">
            <li v-for="f in files.workorder" :key="f.id" class="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <FileText class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span v-if="f.dataUrl" @click="openFileDetail(f.dataUrl)" class="flex-1 min-w-0 truncate text-blue-600 hover:underline cursor-pointer">{{ f.name }}</span>
              <span v-else class="flex-1 min-w-0 truncate">{{ f.name }}</span>
              <span class="text-gray-400 flex-shrink-0">{{ formatFileSize(f.size) }}</span>
              <button v-if="canManage" @click="deleteFile('workorder', f)" class="text-gray-400 hover:text-red-500 flex-shrink-0"><X class="w-3.5 h-3.5" /></button>
            </li>
          </ul>
          <!-- 学生提交与批改 -->
          <div class="border-t border-gray-100 pt-4">
            <h5 class="text-xs font-semibold text-gray-500 mb-2">学生提交与批改（{{ workorderSubmittedCount }}/{{ students.length }}）</h5>
            <div v-if="students.length === 0" class="text-xs text-gray-400">暂无学生</div>
            <div v-else class="space-y-2">
              <div v-for="s in students" :key="s.id" class="p-2.5 rounded-lg border border-gray-100">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-sm font-semibold text-brand-600 flex-shrink-0">{{ s.name.charAt(0) }}</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ s.name }}</p>
                    <p class="text-xs text-gray-400">{{ s.studentId }}<template v-if="s.className"> · {{ s.className }}</template></p>
                  </div>
                  <template v-if="canManage">
                    <input v-model.number="workorderScores[s.id]" type="number" min="0" max="100" placeholder="评分"
                      class="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    <button @click="saveWorkorderScore(s.id)" :disabled="workorderScores[s.id] === undefined || workorderScores[s.id] === null || workorderScores[s.id] === ''"
                      class="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed">
                      批改
                    </button>
                  </template>
                  <span v-if="getWorkorderScore(s.id) !== null" class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex-shrink-0">
                    {{ getWorkorderScore(s.id) }} 分
                  </span>
                  <span v-else class="text-xs text-gray-300 flex-shrink-0">未提交</span>
                </div>
                <template v-if="getWorkorderSubmission(s.id)">
                  <p v-if="getWorkorderSubmission(s.id).comment" class="mt-2 ml-11 text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg px-2.5 py-1.5">{{ getWorkorderSubmission(s.id).comment }}</p>
                  <div v-if="getWorkorderSubmission(s.id).attachments?.length" class="mt-1.5 ml-11 flex flex-wrap gap-1.5">
                    <span v-for="(f, fi) in getWorkorderSubmission(s.id).attachments" :key="fi"
                      :class="`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border ${f.dataUrl ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 cursor-pointer' : 'bg-gray-50 text-gray-500 border-gray-200'}`"
                      @click="f.dataUrl && openFileDetail(f.dataUrl)">
                      <FileText class="w-3 h-3" /><span class="max-w-[160px] truncate">{{ f.name }}</span>
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 3 本节课资料 ===== -->
        <div v-if="activeSection === 'material'">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="font-semibold text-gray-900">本节课资料</h4>
              <p class="text-xs text-gray-400 mt-0.5">教师上传本节课课件/文档，学生查看后计入查看情况</p>
            </div>
            <div v-if="canManage" class="flex items-center gap-2">
              <input ref="materialFileInput" type="file" class="hidden" multiple @change="onFileChange('material', $event)" />
              <button @click="materialFileInput?.click()" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg">
                <Upload class="w-3.5 h-3.5" /> 上传资料
              </button>
            </div>
          </div>
          <div v-if="files.material.length === 0" class="text-center py-8 text-gray-400 text-sm">暂无本节课资料</div>
          <ul v-else class="space-y-1.5 mb-4">
            <li v-for="f in files.material" :key="f.id" class="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <FileText class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span v-if="f.dataUrl" @click="openFileDetail(f.dataUrl)" class="flex-1 min-w-0 truncate text-blue-600 hover:underline cursor-pointer">{{ f.name }}</span>
              <span v-else class="flex-1 min-w-0 truncate">{{ f.name }}</span>
              <span class="text-gray-400 flex-shrink-0">{{ formatFileSize(f.size) }}</span>
              <button v-if="canManage" @click="deleteFile('material', f)" class="text-gray-400 hover:text-red-500 flex-shrink-0"><X class="w-3.5 h-3.5" /></button>
            </li>
          </ul>
          <div class="border-t border-gray-100 pt-4">
            <h5 class="text-xs font-semibold text-gray-500 mb-2">同学查看情况（{{ materialDoneCount }}/{{ students.length }}）</h5>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="s in students" :key="s.id"
                :class="`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${hasProgress(s.id, 'material') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-50 text-gray-400 border border-gray-200'}`">
                <CheckCircle v-if="hasProgress(s.id, 'material')" class="w-3 h-3" />
                <Clock v-else class="w-3 h-3" />
                {{ s.name }}
              </span>
              <span v-if="students.length === 0" class="text-xs text-gray-400">暂无学生</span>
            </div>
          </div>
        </div>

        <!-- ===== 4 测试题目 ===== -->
        <div v-if="activeSection === 'test'">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="font-semibold text-gray-900">测试题目</h4>
              <p class="text-xs text-gray-400 mt-0.5">教师上传测试题，学生完成后批改评分（评价体系与任务管理一致）</p>
            </div>
            <div v-if="canManage" class="flex items-center gap-2">
              <input ref="testFileInput" type="file" class="hidden" multiple @change="onFileChange('test', $event)" />
              <button @click="testFileInput?.click()" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg">
                <Upload class="w-3.5 h-3.5" /> 上传测试题目
              </button>
            </div>
          </div>
          <div v-if="files.test.length === 0" class="text-center py-8 text-gray-400 text-sm">暂无测试题目</div>
          <ul v-else class="space-y-1.5 mb-4">
            <li v-for="f in files.test" :key="f.id" class="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <FileText class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span v-if="f.dataUrl" @click="openFileDetail(f.dataUrl)" class="flex-1 min-w-0 truncate text-blue-600 hover:underline cursor-pointer">{{ f.name }}</span>
              <span v-else class="flex-1 min-w-0 truncate">{{ f.name }}</span>
              <span class="text-gray-400 flex-shrink-0">{{ formatFileSize(f.size) }}</span>
              <button v-if="canManage" @click="deleteFile('test', f)" class="text-gray-400 hover:text-red-500 flex-shrink-0"><X class="w-3.5 h-3.5" /></button>
            </li>
          </ul>
          <!-- 学生完成情况与评价（复用任务评价模型） -->
          <div class="border-t border-gray-100 pt-4">
            <h5 class="text-xs font-semibold text-gray-500 mb-2">学生完成与评价（{{ testSubmittedCount }}/{{ students.length }}）</h5>
            <div v-if="canManage" class="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2.5">
              <span class="text-xs font-medium text-gray-500">批量{{ activeEvalType === 'mentor' ? '企业导师' : '教师' }}评价：</span>
              <button v-for="level in TASK_BATCH_LEVELS" :key="level.label" @click="handleTaskBatchEval(level.range)" class="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-100">
                {{ level.label }}（{{ level.range[0] }}-{{ level.range[1] }}）
              </button>
              <button @click="handleTaskOverdue" class="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100">
                处理逾期评价（60分）
              </button>
            </div>
            <div v-if="students.length === 0" class="text-xs text-gray-400">暂无学生</div>
            <div v-else class="space-y-2">
              <div v-for="s in students" :key="s.id" class="p-2.5 rounded-lg border border-gray-100">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-sm font-semibold text-brand-600 flex-shrink-0">{{ s.name.charAt(0) }}</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ s.name }}</p>
                    <p class="text-xs text-gray-400">{{ s.studentId }}<template v-if="s.className"> · {{ s.className }}</template></p>
                  </div>
                  <template v-if="canManage">
                    <button
                      @click="openTestEval(s)"
                      class="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                    >
                      {{ getActiveEvalScore(s.id) !== null ? '重新评价' : '分项评价' }}
                    </button>
                  </template>
                  <span v-if="getActiveEvalScore(s.id) !== null" class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex-shrink-0">
                    {{ getActiveEvalScore(s.id) }} 分
                  </span>
                  <span v-else class="text-xs text-gray-300 flex-shrink-0">未评分</span>
                </div>
                <template v-if="getTestSubmission(s.id)">
                  <p v-if="getTestSubmission(s.id).comment" class="mt-2 ml-11 text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg px-2.5 py-1.5">{{ getTestSubmission(s.id).comment }}</p>
                  <div v-if="getTestSubmission(s.id).attachments?.length" class="mt-1.5 ml-11 flex flex-wrap gap-1.5">
                    <span v-for="(f, fi) in getTestSubmission(s.id).attachments" :key="fi"
                      :class="`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border ${f.dataUrl ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 cursor-pointer' : 'bg-gray-50 text-gray-500 border-gray-200'}`"
                      @click="f.dataUrl && openFileDetail(f.dataUrl)">
                      <FileText class="w-3 h-3" /><span class="max-w-[160px] truncate">{{ f.name }}</span>
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <div class="mt-5 border-t border-gray-100 pt-4">
            <div class="mb-2 flex items-center justify-between">
              <h5 class="text-xs font-semibold text-gray-500">本任务评价雷达（五项能力百分制均分）</h5>
              <span v-if="taskRadarData.count > 0" class="text-[11px] text-gray-400">基于 {{ taskRadarData.count }} 条分项评价</span>
            </div>
            <div v-if="taskRadarData.count > 0" id="task-radar-chart" ref="radarChartEl" class="h-72 w-full"></div>
            <p v-else class="rounded-lg bg-gray-50 px-3 py-6 text-center text-xs text-gray-400">暂无分项评价数据，评分后自动生成雷达图。</p>
          </div>
        </div>

        <!-- ===== 5 评教 ===== -->
        <div v-if="activeSection === 'eval'">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="font-semibold text-gray-900">评教填写情况</h4>
              <p class="text-xs text-gray-400 mt-0.5">学生按固定指标给教师评分，教师查看填写情况和每题均分</p>
            </div>
          </div>
          <div v-if="!questionnaire" class="text-center py-8 text-gray-400 text-sm">尚未创建评教问卷</div>
          <div v-else>
            <div class="bg-indigo-50 rounded-lg p-4 mb-4">
              <p class="text-sm font-medium text-indigo-900">{{ questionnaire.title }}</p>
              <p class="text-xs text-indigo-500 mt-1">{{ questionnaire.questions?.length || 0 }} 道题目 · 已填写 {{ evalResponseCount }}/{{ students.length }} 人</p>
              <div v-if="evalTotalAverageText" class="mt-4 flex items-end justify-between gap-3 rounded-xl border border-indigo-200 bg-white/80 px-4 py-3">
                <div>
                  <p class="text-xs font-medium text-indigo-500">平均总分</p>
                  <p class="text-5xl font-bold leading-none text-indigo-700 tabular-nums">{{ evalTotalAverageText }}</p>
                </div>
                <div class="pb-1 text-right text-xs text-indigo-400">
                  <p>满分 100 分</p>
                  <p>每题平均 {{ evalAverageText }} 分</p>
                </div>
              </div>
              <div class="mt-2 h-1.5 rounded-full bg-indigo-100 overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full transition-all" :style="{ width: `${students.length ? Math.round((evalResponseCount / students.length) * 100) : 0}%` }" />
              </div>
            </div>
            <div class="space-y-1.5">
              <div v-for="(q, qi) in questionnaire.questions" :key="qi" class="bg-gray-50 rounded-lg px-3 py-2">
                <p class="text-xs text-gray-700"><span class="text-gray-400 mr-1">{{ qi + 1 }}.</span>{{ (q as any).text }}</p>
                <div class="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-gray-400">
                  <span>学生填写评分（1-10）</span>
                  <span v-if="questionAverageText(qi)" class="font-medium text-indigo-600">平均 {{ questionAverageText(qi) }} 分</span>
                </div>
              </div>
            </div>
            <!-- 填写情况列表 -->
            <div class="border-t border-gray-100 pt-4 mt-4">
              <h5 class="text-xs font-semibold text-gray-500 mb-2">学生填写情况</h5>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="s in students" :key="s.id"
                  :class="`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${hasEvalResponse(s.id) ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-50 text-gray-400 border border-gray-200'}`">
                  <CheckCircle v-if="hasEvalResponse(s.id)" class="w-3 h-3" />
                  <Clock v-else class="w-3 h-3" />
                  {{ s.name }}
                </span>
                <span v-if="students.length === 0" class="text-xs text-gray-400">暂无学生</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 评教问卷编辑弹窗 -->
    <div v-if="showQuestionnaireModal" class="fixed inset-0 z-[60] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="showQuestionnaireModal = false" />
      <div class="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">{{ questionnaire ? '编辑评教问卷' : '创建评教问卷' }}</h3>
          <button @click="showQuestionnaireModal = false" class="p-1 text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">问卷标题</label>
            <input v-model="qnrForm.title" type="text" placeholder="例如：本学期课程评教问卷" class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div v-for="(q, qi) in qnrForm.questions" :key="qi" class="border border-gray-100 rounded-lg p-3">
            <div class="flex items-center gap-2 mb-2">
              <select v-model="q.type" class="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
                <option value="rating">评分题（直接填写 1-10）</option>
                <option value="single">单选题</option>
                <option value="text">简答题</option>
              </select>
              <button @click="removeQuestion(qi)" class="text-gray-400 hover:text-red-500"><X class="w-3.5 h-3.5" /></button>
            </div>
            <input v-model="q.text" type="text" placeholder="题目内容" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            <template v-if="q.type === 'single'">
              <div v-for="(op, oi) in q.options" :key="oi" class="flex items-center gap-2 mt-1.5">
                <input v-model="q.options[oi]" type="text" placeholder="选项内容" class="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                <button @click="q.options.splice(oi, 1)" class="text-gray-300 hover:text-red-500"><X class="w-3 h-3" /></button>
              </div>
              <button @click="q.options.push('')" class="mt-1.5 text-xs text-indigo-500 hover:text-indigo-700">+ 添加选项</button>
            </template>
          </div>
          <button @click="addQuestion" class="w-full py-2 text-xs text-indigo-500 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50">+ 添加题目</button>
        </div>
        <div class="flex items-center justify-end gap-2 mt-6">
          <button @click="showQuestionnaireModal = false" class="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
          <button @click="saveQuestionnaire" :disabled="!qnrForm.title.trim()" class="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50">保存问卷</button>
        </div>
      </div>
    </div>

    <!-- 测试题目：教师/企业导师分项评价 -->
    <div v-if="showTestEvalModal" class="fixed inset-0 z-[65] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="closeTestEval" />
      <div class="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h4 class="text-lg font-semibold text-gray-900">{{ activeEvalType === 'mentor' ? '企业导师评价' : '教师评价' }}</h4>
            <p class="mt-0.5 text-sm text-gray-400">{{ testEvalStudent?.name || '' }} · {{ project.name }}</p>
          </div>
          <button @click="closeTestEval" class="text-gray-400 hover:text-gray-600"><X class="h-5 w-5" /></button>
        </div>
        <div class="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          <div
            v-for="(item, index) in getEvalItemDefinitions(activeEvalType)"
            :key="index"
            class="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
          >
            <span class="text-sm text-gray-700">{{ item.label }} ：</span>
            <div class="flex items-center gap-1">
              <input
                type="number"
                min="0"
                :max="item.max"
                :value="testEvalDraft[index] ?? ''"
                @input="setTestEvalScore(index, $event)"
                placeholder="填写分数"
                class="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm outline-none focus:border-indigo-500"
              />
              <span class="text-xs text-gray-400">/ {{ item.max }}</span>
            </div>
          </div>
          <p class="text-right text-sm font-medium text-gray-800">合计：{{ testEvalTotal }} 分</p>
          <p v-if="testEvalError" class="text-right text-xs text-red-500">{{ testEvalError }}</p>
        </div>
        <div class="mt-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button @click="closeTestEval" class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">取消</button>
          <button @click="saveTestEval" class="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700">保存评价</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { X, FileText, Upload, CheckCircle, Clock, Plus, Pencil, GitBranch, BookOpen, ClipboardCheck, ListChecks, FileQuestion, Star, Wrench } from 'lucide-vue-next'
import { javaListProjectFiles, javaAddProjectFile, javaDeleteProjectFile, javaListProjectProgress, javaUpsertProjectProgress, javaGradeProjectProgress, javaGetQuestionnaire, javaSaveQuestionnaire, javaListEvalResponses, javaSubmitEvalResponse } from '@/api/knowledgeGraph'
import { useAppStore } from '@/stores/app'
import { getNow } from '@/lib/date'
import type { EvalType, Evaluation } from '@/types'
import {
  createEmptyEvalDraft,
  evalItemsFromDraft,
  getEvalItemDefinitions,
  makeEvalItemsForTotal,
  scoreFromEvalDraft,
  type EvalScoreDraftValue,
} from '@/lib/evalStandards'
import { computeRadarData } from '@/lib/evalRadar'
import { createBuiltinEvalQuestionnaire } from '@/lib/evalQuestionnaire'

const props = defineProps<{
  project: any
  courseId: string
  students: { id: string; name: string; studentId?: string; className?: string }[]
  canManage?: boolean
  evalType?: 'teacher' | 'mentor'
}>()
const emit = defineEmits<{ (e: 'close'): void }>()
const store = useAppStore()

const activeEvalType = computed<EvalType>(() => (props.evalType === 'mentor' ? 'mentor' : 'teacher'))
const projectEvalSession = computed(() => Number(props.project?.orderNo ?? 0) + 1)

const sections = [
  { key: 'preview', label: '预习资料', icon: BookOpen },
  { key: 'workorder', label: '工单', icon: Wrench },
  { key: 'material', label: '本节课资料', icon: ClipboardCheck },
  { key: 'test', label: '测试题目', icon: FileQuestion },
  { key: 'eval', label: '评教', icon: Star },
]
const activeSection = ref('preview')

// ===== 文件 =====
const files = ref<Record<string, any[]>>({ preview: [], workorder: [], material: [], test: [] })
const fileInputs: Record<string, any> = {}
const previewFileInput = ref<any>(null)
const workorderFileInput = ref<any>(null)
const materialFileInput = ref<any>(null)
const testFileInput = ref<any>(null)

async function loadFiles() {
  for (const type of ['preview', 'workorder', 'material', 'test']) {
    try {
      const list: any = await javaListProjectFiles(props.project.id, type)
      files.value[type] = Array.isArray(list) ? list : []
    } catch {
      files.value[type] = []
    }
  }
}

async function onFileChange(type: string, e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const arr = await Promise.all(
    Array.from(input.files).map(
      (file) =>
        new Promise<{ name: string; size: number; dataUrl: string }>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve({ name: file.name, size: file.size, dataUrl: reader.result as string })
          reader.onerror = () => reject(new Error('文件读取失败'))
          reader.readAsDataURL(file)
        })
    )
  )
  try {
    for (const f of arr) {
      await javaAddProjectFile({ projectId: props.project.id, fileType: type, name: f.name, size: f.size, dataUrl: f.dataUrl })
    }
    await loadFiles()
  } catch (err: any) {
    alert('上传失败：' + (err.message || err))
  }
  input.value = ''
}

async function deleteFile(type: string, f: any) {
  if (!confirm('确定删除该文件？')) return
  try {
    await javaDeleteProjectFile(f.id)
    await loadFiles()
  } catch (err: any) {
    alert('删除失败：' + (err.message || err))
  }
}

function openFileDetail(dataUrl: string) {
  if (dataUrl) window.open(dataUrl, '_blank')
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}

// ===== 进度 =====
const progressList = ref<any[]>([])
async function loadProgress() {
  try {
    const list: any = await javaListProjectProgress(props.project.id)
    progressList.value = Array.isArray(list) ? list : []
  } catch {
    progressList.value = []
  }
}
const progressByType = (type: string) => progressList.value.filter((p) => p.progressType === type)
const hasProgress = (studentId: string, type: string) => progressByType(type).some((p) => p.studentId === studentId)
const getProgressRecord = (studentId: string, type: string) => progressByType(type).find((p) => p.studentId === studentId)
const previewDoneCount = computed(() => progressByType('preview').length)
const materialDoneCount = computed(() => progressByType('material').length)
const workorderSubmittedCount = computed(() => progressByType('workorder').length)
const testSubmittedCount = computed(() => progressByType('test').length)

// 工单/测试批改
const workorderScores = ref<Record<string, number | string>>({})
const testScores = ref<Record<string, number | string>>({})
function getWorkorderSubmission(sid: string) { return getProgressRecord(sid, 'workorder') }
function getTestSubmission(sid: string) { return getProgressRecord(sid, 'test') }
function getWorkorderScore(sid: string) {
  const r = getProgressRecord(sid, 'workorder')
  return r?.score != null ? Number(r.score) : null
}
function getTestScore(sid: string) {
  const r = getProgressRecord(sid, 'test')
  return r?.score != null ? Number(r.score) : null
}
async function saveWorkorderScore(studentId: string) {
  const rec = getProgressRecord(studentId, 'workorder')
  if (!rec) { alert('该学生尚未提交工单'); return }
  try {
    await javaGradeProjectProgress(rec.id, { score: Number(workorderScores.value[studentId]) })
    await loadProgress()
  } catch (err: any) { alert('批改失败：' + (err.message || err)) }
}
async function saveTestScore(studentId: string) {
  const rec = getProgressRecord(studentId, 'test')
  if (!rec) { alert('该学生尚未完成测试'); return }
  try {
    await javaGradeProjectProgress(rec.id, { score: Number(testScores.value[studentId]) })
    await loadProgress()
  } catch (err: any) { alert('评分失败：' + (err.message || err)) }
}

// ===== 测试题目分项评价（教师/企业导师） =====
const showTestEvalModal = ref(false)
const testEvalStudent = ref<{ id: string; name: string } | null>(null)
const testEvalDraft = ref<EvalScoreDraftValue[]>([])
const testEvalError = ref('')

const testEvalTotal = computed(() =>
  scoreFromEvalDraft(getEvalItemDefinitions(activeEvalType.value), testEvalDraft.value)
)

function getActiveEvalScore(studentId: string) {
  const ev = store.evaluations.find(
    (e) => e.courseId === props.courseId && e.studentId === studentId &&
      e.sessionNumber === projectEvalSession.value && e.type === activeEvalType.value
  )
  return ev ? Number(ev.score) : null
}

function openTestEval(student: { id: string; name: string }) {
  if (!getTestSubmission(student.id)) {
    alert('该学生尚未完成测试，暂不能评价')
    return
  }
  testEvalStudent.value = student
  testEvalError.value = ''
  const defs = getEvalItemDefinitions(activeEvalType.value)
  const existing = store.evaluations.find(
    (e) => e.courseId === props.courseId && e.studentId === student.id &&
      e.sessionNumber === projectEvalSession.value && e.type === activeEvalType.value
  )
  testEvalDraft.value = defs.map((item, index) => {
    const saved = existing?.items?.[index]
    return saved && saved.score !== undefined ? saved.score : ''
  })
  showTestEvalModal.value = true
}

function closeTestEval() {
  showTestEvalModal.value = false
  testEvalStudent.value = null
  testEvalDraft.value = []
  testEvalError.value = ''
}

function setTestEvalScore(index: number, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const parsed = Number(raw)
  const next: EvalScoreDraftValue = raw === '' || Number.isNaN(parsed) ? '' : parsed
  testEvalDraft.value = testEvalDraft.value.map((value, i) => (i === index ? next : value))
}

function saveTestEval() {
  const student = testEvalStudent.value
  if (!student) return
  const type = activeEvalType.value
  const defs = getEvalItemDefinitions(type)
  const invalid = defs.some((item, index) => {
    const value = testEvalDraft.value[index]
    return value === '' || typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > item.max
  })
  if (invalid) {
    testEvalError.value = '请完整填写各项分数'
    return
  }

  const items = evalItemsFromDraft(defs, testEvalDraft.value)
  const score = scoreFromEvalDraft(defs, testEvalDraft.value)
  const existing = store.evaluations.find(
    (e) => e.courseId === props.courseId && e.studentId === student.id &&
      e.sessionNumber === projectEvalSession.value && e.type === type
  )
  const ev: Evaluation = {
    id: existing ? existing.id : `ev-project-${Date.now()}-${student.id}-${type}`,
    courseId: props.courseId,
    studentId: student.id,
    sessionNumber: projectEvalSession.value,
    type,
    score,
    items,
    evaluatorId: store.currentUser || '',
    evaluatorName: store.currentUser || (type === 'mentor' ? '企业导师' : '教师'),
    createdAt: getNow().toISOString().split('T')[0],
  }
  if (existing) {
    store.updateEvaluation(ev.id, { score, items, createdAt: ev.createdAt })
  } else {
    store.addEvaluation(ev)
  }
  closeTestEval()
  store.syncEvalToDetailedGrade(props.courseId)
}

const TASK_BATCH_LEVELS = [
  { label: 'A 优秀', range: [90, 100] },
  { label: 'B 良好', range: [80, 89] },
  { label: 'C 中等', range: [70, 79] },
  { label: 'D 及格', range: [60, 69] },
]

function saveTaskEvalRecord(studentId: string, score: number, items: Evaluation['items'] = []) {
  const type = activeEvalType.value
  const existing = store.evaluations.find(
    (e) => e.courseId === props.courseId && e.studentId === studentId &&
      e.sessionNumber === projectEvalSession.value && e.type === type
  )
  const ev: Evaluation = {
    id: existing ? existing.id : `ev-project-${Date.now()}-${studentId}-${type}`,
    courseId: props.courseId,
    studentId,
    sessionNumber: projectEvalSession.value,
    type,
    score,
    items,
    evaluatorId: store.currentUser || '',
    evaluatorName: store.currentUser || (type === 'mentor' ? '企业导师' : '教师'),
    createdAt: getNow().toISOString().split('T')[0],
  }
  if (existing) {
    store.updateEvaluation(ev.id, { score, items, createdAt: ev.createdAt })
  } else {
    store.addEvaluation(ev)
  }
  return ev
}

function handleTaskBatchEval(range: number[]) {
  const score = Math.round((range[0] + range[1]) / 2)
  const items = makeEvalItemsForTotal(activeEvalType.value, score)
  let count = 0
  for (const student of props.students) {
    if (!getTestSubmission(student.id)) continue
    saveTaskEvalRecord(student.id, score, items.map((item) => ({ ...item })))
    count += 1
  }
  store.syncEvalToDetailedGrade(props.courseId)
  alert(count > 0 ? `已批量评价 ${count} 名学生` : '尚无学生完成本任务测试')
}

function handleTaskOverdue() {
  let count = 0
  for (const student of props.students) {
    if (getActiveEvalScore(student.id) !== null) continue
    saveTaskEvalRecord(student.id, 60, makeEvalItemsForTotal(activeEvalType.value, 60))
    count += 1
  }
  store.syncEvalToDetailedGrade(props.courseId)
  alert(count > 0 ? `已将 ${count} 名逾期学生按 60 分处理` : '当前没有需要按 60 分处理的学生')
}

// ===== 本任务评价雷达 =====
const radarChartEl = ref<HTMLDivElement | null>(null)
let radarChart: echarts.ECharts | null = null

const taskRadarData = computed(() =>
  computeRadarData(
    store.evaluations.filter(
      (e) => e.courseId === props.courseId && e.sessionNumber === projectEvalSession.value
    )
  )
)

function renderTaskRadar() {
  if (!radarChartEl.value || taskRadarData.value.count === 0) return
  if (!radarChart) radarChart = echarts.init(radarChartEl.value)
  radarChart.setOption({
    tooltip: {},
    radar: {
      indicator: taskRadarData.value.labels.map((name) => ({ name, max: 100 })),
      radius: '68%',
      splitNumber: 4,
    },
    series: [{
      type: 'radar',
      data: [{ value: taskRadarData.value.values, name: '能力评价', areaStyle: { opacity: 0.22 } }],
    }],
  })
}

watch(
  () => [taskRadarData.value.count, ...taskRadarData.value.values],
  () => nextTick(renderTaskRadar),
  { flush: 'post' }
)

watch(
  activeSection,
  (section) => {
    if (section === 'test') nextTick(renderTaskRadar)
  },
  { flush: 'post' }
)

onBeforeUnmount(() => {
  radarChart?.dispose()
  radarChart = null
})

// ===== 评教问卷 =====
const questionnaire = ref<any>(null)
const evalResponses = ref<any[]>([])
const showQuestionnaireModal = ref(false)
const qnrForm = ref<{ title: string; questions: any[] }>({ title: '', questions: [] })

async function loadQuestionnaire() {
  questionnaire.value = createBuiltinEvalQuestionnaire(props.courseId)
  try {
    const list: any = await javaListEvalResponses(questionnaire.value.id)
    evalResponses.value = Array.isArray(list) ? list : []
  } catch {
    evalResponses.value = []
  }
}
const evalResponseCount = computed(() => evalResponses.value.length)
const hasEvalResponse = (sid: string) => evalResponses.value.some((r) => r.studentId === sid)
function questionAverageText(questionIndex: number) {
  const values: number[] = []
  for (const response of evalResponses.value) {
    const raw = Array.isArray(response.answers) ? response.answers[questionIndex] : undefined
    const value = Number(raw)
    if (Number.isFinite(value) && value > 0) values.push(value)
  }
  if (!values.length) return ''
  return (values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(1)
}
const evalAverageText = computed(() => {
  const questions = questionnaire.value?.questions || []
  if (!questions.length || evalResponses.value.length === 0) return ''
  let total = 0
  let count = 0
  for (const response of evalResponses.value) {
    const answers = Array.isArray(response.answers) ? response.answers : []
    questions.forEach((question: any, qi: number) => {
      if (question?.type === 'text') return
      const value = Number(answers[qi])
      if (Number.isFinite(value)) {
        total += value
        count += 1
      }
    })
  }
  if (!count) return ''
  return (total / count).toFixed(1)
})

const evalTotalAverageText = computed(() => {
  let total = 0
  let count = 0
  for (const response of evalResponses.value) {
    const answers = Array.isArray(response.answers) ? response.answers : []
    const numeric = answers.map((value: any) => Number(value)).filter((value: number) => Number.isFinite(value) && value > 0)
    if (numeric.length === 0) continue
    total += numeric.reduce((sum: number, value: number) => sum + value, 0)
    count += 1
  }
  if (!count) return ''
  return (total / count).toFixed(1)
})

function openQuestionnaireModal() {
  qnrForm.value = questionnaire.value
    ? { title: questionnaire.value.title || '', questions: JSON.parse(JSON.stringify(questionnaire.value.questions || [])) }
    : { title: '', questions: [{ type: 'rating', text: '', options: [] }] }
  showQuestionnaireModal.value = true
}
function addQuestion() {
  qnrForm.value.questions.push({ type: 'rating', text: '', options: [] })
}
function removeQuestion(i: number) {
  qnrForm.value.questions.splice(i, 1)
}
async function saveQuestionnaire() {
  if (!qnrForm.value.title.trim()) return
  const questions = qnrForm.value.questions.filter((q: any) => q.text?.trim())
  if (questions.length === 0) { alert('请至少添加一道题目'); return }
  try {
    await javaSaveQuestionnaire({
      courseId: props.courseId,
      title: qnrForm.value.title.trim(),
      questions,
    })
    showQuestionnaireModal.value = false
    await loadQuestionnaire()
  } catch (err: any) { alert('保存失败：' + (err.message || err)) }
}

onMounted(() => {
  loadFiles()
  loadProgress()
  loadQuestionnaire()
  nextTick(renderTaskRadar)
})

watch(() => props.project?.id, () => {
  if (!props.project?.id) return
  activeSection.value = 'preview'
  loadFiles()
  loadProgress()
  loadQuestionnaire()
  nextTick(renderTaskRadar)
})
</script>
