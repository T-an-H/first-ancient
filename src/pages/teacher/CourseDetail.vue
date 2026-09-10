<template>
  <div class="space-y-6">
    <!-- 返回按钮 + 课程信息栏 -->
    <div class="flex items-center gap-3">
      <button @click="$router.back()" class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <ArrowLeft class="w-5 h-5 text-gray-500" />
      </button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-gray-900">{{ course?.title || '课程详情' }}</h1>
        <p class="text-gray-500 mt-1">{{ course?.id }} · {{ course?.duration }}课时</p>
      </div>
      <span :class="`text-xs px-2 py-0.5 rounded-full ${!isCourseEnded ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`">
        {{ !isCourseEnded ? '进行中' : '已结束' }}
      </span>
    </div>

    <!-- 已结束只读提示 -->
    <div v-if="isReadOnly" class="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
      <Eye class="w-4 h-4 text-gray-400" />
      <span>该课程已结束，当前为<strong>只读查看</strong>模式，无法进行配置修改操作</span>
    </div>

    <!-- Tab 切换 -->
    <div class="flex gap-1 border-b border-gray-200">
      <button v-for="tab in tabList" :key="tab.key"
        @click="activeTab = tab.key"
        :class="`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all ${activeTab === tab.key ? 'bg-white text-blue-600 border border-b-0 border-gray-200 -mb-px' : 'text-gray-500 hover:text-gray-700'}`">
        <component :is="tab.icon" class="w-4 h-4 inline mr-1.5" />
        <span class="relative inline-flex items-center">
          {{ tab.label }}
          <span v-if="tabBadgeCount(tab.key) > 0"
            :title="tabBadgeTitle(tab.key)"
            class="absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
          </span>
      </button>
    </div>

    <!-- Tab: 评价管理 -->
    <div v-if="activeTab === 'comments'" class="space-y-6">
      <!-- 评价方案配置（始终展开） -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Settings class="w-5 h-5 text-gray-400" />
            <h2 class="font-semibold text-gray-900">评价方案配置</h2>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="evalConfigLocked || isViewOnly" class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200">
              <Lock class="w-3 h-3 inline mr-0.5" />仅查看
            </span>
            <span class="text-xs text-gray-400">
              {{ selectedConfig ? EvalTemplateLabels[selectedConfig.template] : '默认方案' }} ·
              {{ selectedConfig ? EvalFrequencyLabels[selectedConfig.frequency] : '默认频率' }}
            </span>
          </div>
        </div>

        <!-- 锁定提示 -->
        <div v-if="evalConfigLocked" class="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
          <Lock class="w-3.5 h-3.5 text-gray-400" />
          <span v-if="selectedConfig">评价方案已在第一节课开始前配置完成，已锁定不可修改。</span>
          <span v-else>第一节课已开始，评价方案未配置，现按默认方案实施，已锁定不可修改。</span>
        </div>

        <!-- 评价类型标签（始终展示） -->
        <div class="flex flex-wrap gap-2 mt-3">
          <template v-for="t in ALL_EVAL_TYPES" :key="t">
            <span v-if="!selectedConfig || !TEMPLATE_EVAL_TYPES[selectedConfig.template].includes(t)"
              class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-300 border border-gray-200">
              {{ EvalTypeLabels[t] }} ✗
            </span>
            <span v-else-if="(t === 'intra_group' || t === 'inter_group') && !courseHasGroups || t === 'mentor' && selectedConfig && !selectedConfig.hasMentor"
              class="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
              <EyeOff class="w-3 h-3 inline mr-0.5" />
              {{ EvalTypeLabels[t] }}（自动隐藏）
            </span>
            <span v-else :class="`text-xs px-2.5 py-1 rounded-full border ${EvalTypeColors[t]}`">
              <Eye class="w-3 h-3 inline mr-0.5" />
              {{ EvalTypeLabels[t] }}
            </span>
          </template>
        </div>

        <!-- 教师可编辑：直接展示配置界面 -->
        <template v-if="!isReadOnly && !evalConfigLocked && !isViewOnly">
          <div class="border-t border-gray-100 mt-3 pt-4 space-y-4">
            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">评价模板</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button v-for="tpl in EVAL_TEMPLATE_KEYS" :key="tpl"
                  @click="handleSetConfig({ template: tpl })"
                  :class="`text-left p-3 rounded-lg border transition-all ${selectedConfig?.template === tpl ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`">
                  <span class="text-sm font-medium text-gray-900">{{ EvalTemplateLabels[tpl] }}</span>
                  <p class="text-xs text-gray-400 mt-0.5">{{ EvalTemplateDescs[tpl] }}</p>
                  <div class="flex gap-1 mt-1">
                    <span v-for="et in TEMPLATE_EVAL_TYPES[tpl]" :key="et" class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{{ EvalTypeLabels[et] }}</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">评价频率</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button v-for="freq in EVAL_FREQUENCY_KEYS" :key="freq"
                  @click="handleSetConfig({ frequency: freq })"
                  :class="`text-left p-3 rounded-lg border transition-all ${selectedConfig?.frequency === freq ? 'border-cyan-300 bg-cyan-50' : 'border-gray-200 bg-white hover:border-gray-300'}`">
                  <span class="text-sm font-medium text-gray-900">{{ EvalFrequencyLabels[freq] }}</span>
                  <p class="text-xs text-gray-400 mt-0.5">{{ EvalFrequencyDescs[freq] }}</p>
                  <span class="text-xs text-cyan-500 mt-0.5 block">共 {{ courseId ? store.getEvalSessions(courseId) : 0 }} 次评价</span>
                </button>
              </div>
              <div v-if="selectedConfig?.frequency === 'custom'" class="mt-2">
                <label class="text-xs text-gray-500">自定义评价次数：</label>
                <input type="number" min="1" max="20"
                  :value="selectedConfig?.customSessions || 3"
                  @change="(e) => handleSetConfig({ customSessions: parseInt((e.target as HTMLInputElement).value) || 3 })"
                  class="ml-2 w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>

          </div>
        </template>

        <!-- 只读/锁定展示：完整展示当前生效方案（仅保留已选中的选项） -->
        <template v-else>
          <div class="border-t border-gray-100 mt-3 pt-4 space-y-4">
            <div v-if="!selectedConfig" class="flex items-center gap-1.5 text-xs text-gray-400">
              <EyeOff class="w-3.5 h-3.5" />
              <span>未配置自定义方案，按以下默认方案实施</span>
            </div>

            <!-- 评价模板 -->
            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">评价模板</p>
              <div class="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium text-gray-900">{{ EvalTemplateLabels[activeEvalConfig.template] }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">当前生效</span>
                </div>
                <p class="text-xs text-gray-500 mt-0.5">{{ EvalTemplateDescs[activeEvalConfig.template] }}</p>
                <div class="flex flex-wrap gap-1 mt-1.5">
                  <span v-for="et in TEMPLATE_EVAL_TYPES[activeEvalConfig.template]" :key="et"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-white text-emerald-700 border border-emerald-200">
                    {{ EvalTypeLabels[et] }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 评价频率 -->
            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">评价频率</p>
              <div class="p-3 rounded-lg border border-cyan-200 bg-cyan-50/60">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium text-gray-900">{{ EvalFrequencyLabels[activeEvalConfig.frequency] }}</span>
                  <span class="text-xs text-cyan-600">共 {{ courseId ? store.getEvalSessions(courseId) : 0 }} 次评价</span>
                </div>
                <p class="text-xs text-gray-500 mt-0.5">{{ EvalFrequencyDescs[activeEvalConfig.frequency] }}</p>
              </div>
            </div>

          </div>
        </template>
      </div>

      <!-- 评价管理（合并批量评价 + 逐次评价） -->
      <div v-if="!isReadOnly" class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <ClipboardCheck class="w-5 h-5 text-gray-400" />
            <h2 class="font-semibold text-gray-900">评价管理</h2>
            <span class="text-xs text-gray-400">{{ enrolledStudents.length }}名学生</span>
          </div>
          <button v-if="!isViewOnly" @click="handleProcessOverdue" class="text-xs flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100">
            <RefreshCw class="w-3 h-3" />
            处理逾期个人自评
          </button>
        </div>

        <!-- 轮次 + 类型选择器 -->
        <div class="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <span class="text-xs text-gray-500 font-medium">评价轮次：</span>
          <button v-for="s in totalSessions" :key="s"
            @click="handleSessionSelect(s)"
            :disabled="isSessionDisabled(s)"
            :title="getSessionTitle(s)"
            :class="`text-xs px-3 py-1.5 rounded-lg border transition-all ${selectedBatchSession === s ? 'bg-blue-50 text-blue-600 border-blue-300 font-medium' : isSessionDisabled(s) ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`">
            第{{ s }}次
            <span v-if="store.isSessionLocked(courseId || '', s)" class="ml-1">🔒</span>
            <span v-else-if="!isSessionTime(s)" class="ml-1 text-gray-300">⏳</span>
          </button>
        </div>

        <!-- 轮次状态提示 -->
        <div v-if="store.isSessionLocked(courseId || '', selectedBatchSession)" class="flex items-center gap-2 px-3 py-2 mb-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
          <EyeOff class="w-3.5 h-3.5 text-gray-400" />
          <span>该轮次已锁定，评价不可修改。上一轮次结束后自动锁定并处理逾期。</span>
        </div>
        <div v-else-if="!isSessionTime(selectedBatchSession)" class="flex items-center gap-2 px-3 py-2 mb-3 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-700">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>{{ selectedBatchSession === 1 ? '第一节课已开始，评价已开启' : '该轮次尚未到开启时间' }}</span>
        </div>
        <div v-else-if="isFinalSessionExpired" class="flex items-center gap-2 px-3 py-2 mb-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-500">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
          <span>课程已结束，最终评价已截止。</span>
        </div>

        <!-- 搜索 + 过滤 + 弹窗查看 -->
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <div class="relative max-w-xs flex-1 min-w-[180px]">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input v-model="evalStudentSearch" type="text" placeholder="搜索学生姓名..."
              class="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <select v-model="evalFilterClass"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
            <option value="">全部班级</option>
            <option v-for="opt in evalClassOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select v-model="evalFilterGroup"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
            <option value="">全部分组</option>
            <option v-for="opt in evalGroupOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- 班级卡片列表 -->
        <div v-if="filteredEvalTableSections.length > 0">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="(classBlock, ci) in filteredEvalTableSections" :key="ci"
              @click="selectedEvalClass = classBlock.className; showEvalPopup = true"
              class="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-sm font-semibold text-gray-800">班级 {{ classBlock.className || '未分班' }}</span>
                  <span class="text-xs text-gray-400 ml-2">{{ classBlock.groups.reduce((a, g) => a + g.students.length, 0) }}人</span>
                </div>
                <ChevronRight class="w-4 h-4 text-gray-400" />
              </div>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span v-for="(group, gi) in classBlock.groups" :key="gi"
                  class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {{ group.groupName }} ({{ group.students.length }}人)
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-400">
          {{ evalStudentSearch ? '未找到匹配的学生' : '该课程暂无学生' }}
        </div>
      </div>

      <!-- 评价管理弹窗 -->
      <Teleport to="body">
        <div v-if="showEvalPopup" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="closeEvalPopup()" />
          <div class="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[85vh] flex flex-col">
            <!-- 头部 -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-800">班级 {{ selectedEvalClass }} - 评价管理</h3>
              <button @click="closeEvalPopup()" class="text-gray-400 hover:text-gray-600">
                <X class="w-5 h-5" />
              </button>
            </div>
            <!-- 内容 -->
            <div class="flex-1 overflow-auto px-6 py-4">
              <div v-if="!currentEvalClassSection" class="text-center py-8 text-gray-400">暂无数据</div>
              <template v-if="currentEvalClassSection">
                <div v-for="(group, gi) in currentEvalClassSection.groups" :key="gi" class="mb-4">
                  <div class="text-xs font-semibold text-gray-600 mb-2 px-1">{{ group.groupName }}（{{ group.students.length }}人）</div>
                  <table class="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr class="bg-gray-50 border-b border-gray-200">
                        <th class="w-10 py-2 px-2">
                          <input type="checkbox"
                            :checked="isGroupSelected(gi)"
                            @change="toggleGroup(gi)"
                            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        </th>
                        <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs">学生</th>
                        <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs w-20">个人自评</th>
                        <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs w-20">小组内互评</th>
                        <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs w-20">小组间互评</th>
                        <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs w-20">教师评价</th>
                        <th class="text-center py-2 px-2 text-gray-500 font-medium text-xs w-20">企业导师评价</th>
                        <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs w-20">状态</th>
                        <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs w-24">新评分</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="s in group.students" :key="s.student.id"
                        class="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        :class="{ 'bg-blue-50/30': selectedStudentIds.includes(s.student.id), 'bg-emerald-50/20': s.submitted }">
                        <td class="py-2 px-2 text-center">
                          <input type="checkbox"
                            v-model="selectedStudentIds"
                            :value="s.student.id"
                            :disabled="s.submitted || !canManageEval"
                            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        </td>
                        <td class="py-2 px-3">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span class="text-xs font-medium text-blue-600">{{ s.student.name.charAt(0) }}</span>
                            </div>
                            <div>
                              <p class="font-medium text-gray-900 text-sm">{{ s.student.name }}</p>
                              <p class="text-xs text-gray-400">{{ s.student.id }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="py-2 px-2 text-center text-xs" :class="s.selfScore !== null ? 'text-blue-600 font-medium' : 'text-gray-300'">{{ s.selfScore !== null ? s.selfScore + '分' : '-' }}</td>
                        <td class="py-2 px-2 text-center text-xs" :class="s.intraScore !== null ? 'text-emerald-600 font-medium' : 'text-gray-300'">{{ s.intraScore !== null ? s.intraScore + '分' : '-' }}</td>
                        <td class="py-2 px-2 text-center text-xs" :class="s.interScore !== null ? 'text-purple-600 font-medium' : 'text-gray-300'">{{ s.interScore !== null ? s.interScore + '分' : '-' }}</td>
                        <td class="py-2 px-2 text-center text-xs" :class="s.teacherScore !== null ? 'text-brand-700 font-medium' : 'text-gray-300'">{{ s.teacherScore !== null ? s.teacherScore + '分' : '-' }}</td>
                        <td class="py-2 px-2 text-center text-xs" :class="s.mentorScore !== null ? 'text-rose-600 font-medium' : 'text-gray-300'">{{ s.mentorScore !== null ? s.mentorScore + '分' : '-' }}</td>
                        <td class="py-2 px-3">
                          <span v-if="s.submitted" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle class="w-3 h-3" />已提交
                          </span>
                          <span v-else-if="s.hasDraft" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                            <Save class="w-3 h-3" />已保存
                          </span>
                          <span v-else class="text-xs text-gray-300">-</span>
                        </td>
                        <td class="py-2 px-3">
                          <template v-if="!s.submitted && canManageEval">
                            <button
                              @click="openEvalCriteria(s.student)"
                              class="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                            >
                              <Pencil class="h-3 w-3" />
                              分项评分
                            </button>
                            <span v-if="s.hasDraft" class="mt-1 block text-[11px] text-blue-500">已保存，待提交</span>
                          </template>
                          <span v-else-if="s.submitted" class="text-xs font-medium text-emerald-600">{{ s.finalScore }}分</span>
                          <span v-else class="text-xs text-gray-300">-</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
            <!-- 底部 -->
            <div class="px-6 py-4 border-t border-gray-200 flex flex-wrap items-start justify-between gap-4">
              <div class="flex flex-wrap items-center gap-2">
                <button @click="toggleAllClass"
                  :disabled="!canManageEval"
                  :class="`text-xs px-3 py-1.5 rounded-lg border transition-all ${!canManageEval || (selectedUnsubmittedCount === 0 && !isAllClassSelected) ? 'opacity-50 cursor-not-allowed' : ''} border-gray-300 text-gray-600 hover:bg-gray-100`">
                  {{ isAllClassSelected ? '取消全选' : '全选本班' }}
                </button>
                <span class="text-xs text-gray-500 font-medium">一键等级评价（选中 {{ selectedUnsubmittedCount }} 名学生）：</span>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="level in LEVEL_OPTIONS" :key="level.label"
                    @click="handleBatchEval(level.label)"
                    :class="`text-xs px-3 py-1.5 rounded-lg border transition-all ${level.color} hover:opacity-80 ${selectedUnsubmittedCount === 0 || !canManageEval ? 'opacity-50 cursor-not-allowed' : ''}`"
                    :disabled="selectedUnsubmittedCount === 0 || !canManageEval">
                    {{ level.label }} ({{ level.range[0] }}-{{ level.range[1] }}分)
                  </button>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button @click="handleSubmitAll"
                  :class="`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${hasSubmittable && canManageEval ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`"
                  :disabled="!hasSubmittable || !canManageEval">
                  <CheckCircle class="w-4 h-4" />
                  提交评价（{{ submittableCount }}人）
                </button>
                <button @click="closeEvalPopup()"
                  class="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">关闭</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 教师/企业导师：分项评分弹窗 -->
        <div v-if="showEvalCriteriaPopup" class="fixed inset-0 z-[60] flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="closeEvalCriteriaPopup" />
          <div class="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h4 class="text-lg font-semibold text-gray-900">{{ EvalTypeLabels[evalCriteriaType] }}</h4>
                <p class="mt-0.5 text-sm text-gray-400">{{ evalCriteriaStudentName }}</p>
              </div>
              <button @click="closeEvalCriteriaPopup" class="text-gray-400 hover:text-gray-600">
                <X class="h-5 w-5" />
              </button>
            </div>
            <div class="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              <div
                v-for="(item, index) in getEvalItemDefinitions(evalCriteriaType)"
                :key="index"
                class="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
              >
                <span class="text-sm text-gray-700">{{ item.label }} ：</span>
                <div class="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    :max="item.max"
                    :value="evalCriteriaDraft[index] ?? ''"
                    @input="setEvalCriteriaScore(index, $event)"
                    placeholder="填写分数"
                    class="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm outline-none focus:border-blue-500"
                  />
                  <span class="text-xs text-gray-400">/ {{ item.max }}</span>
                </div>
              </div>
              <p class="text-right text-sm font-medium text-gray-800">合计：{{ evalCriteriaTotal }} 分</p>
              <p v-if="evalCriteriaError" class="text-right text-xs text-red-500">{{ evalCriteriaError }}</p>
            </div>
            <div class="mt-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button @click="closeEvalCriteriaPopup" class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">取消</button>
              <button
                @click="saveEvalCriteria"
                :disabled="!evalCriteriaStudentId"
                class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save class="mr-1 inline h-4 w-4" />
                保存评分
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- Tab: 课程管理（知识图谱） -->
    <div v-if="activeTab === 'course-mgmt'" class="space-y-6">
      <KnowledgeGraph :course-id="courseId" :students="kgStudents" :can-manage="canManageProjects" :eval-type="isMentor ? 'mentor' : 'teacher'" />
    </div>

    <!-- Tab: 成绩配置（完整权重配置） -->
    <div v-if="activeTab === 'grade-config'" class="space-y-6">
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Settings class="w-5 h-5 text-gray-400" />
            <h2 class="font-semibold text-gray-900">成绩配置</h2>
            <span class="text-xs text-gray-400">{{ enrolledStudents.length }}名学生</span>
          </div>
          <div v-if="!isViewOnly" class="flex items-center gap-2">
            <button @click="handleSaveGradeConfig" :disabled="isReadOnly || isWeightLocked || mainTotal !== 100 || regularTotal !== 100 || midtermSubTotal !== 100 || finalSubTotal !== 100"
              class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-colors">
              <Save class="w-3.5 h-3.5" />
              保存配置
            </button>
          </div>
        </div>

        <!-- 权重锁定提示 -->
        <div v-if="isWeightLocked" class="mb-4 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
          <Lock class="w-3.5 h-3.5 text-gray-400" />
          <span>期末考试成绩已录入，权重已锁定，不可再修改。</span>
        </div>

        <!-- 完整权重配置区域 -->
        <div class="space-y-6">
          <Section title="评价模板" :hint="`启用 ${TEMPLATE_EVAL_TYPES[activeEvalConfig.template].length} 种评价方式`" :valid="true">
            <div v-if="!isReadOnly && !evalConfigLocked && !isViewOnly" class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                v-for="tpl in EVAL_TEMPLATE_KEYS"
                :key="tpl"
                @click="handleSetConfig({ template: tpl })"
                :class="`text-left p-3 rounded-lg border transition-all ${activeEvalConfig.template === tpl ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`"
              >
                <span class="text-sm font-medium text-gray-900">{{ EvalTemplateLabels[tpl] }}</span>
                <p class="text-xs text-gray-400 mt-0.5">{{ EvalTemplateDescs[tpl] }}</p>
                <div class="flex flex-wrap gap-1 mt-1.5">
                  <span v-for="et in TEMPLATE_EVAL_TYPES[tpl]" :key="et" class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {{ EvalTypeLabels[et] }}
                  </span>
                </div>
              </button>
            </div>
            <div v-else class="rounded-lg bg-gray-50 p-3">
              <p class="text-sm font-medium text-gray-700">{{ EvalTemplateLabels[activeEvalConfig.template] }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ EvalTemplateDescs[activeEvalConfig.template] }}</p>
              <div class="flex flex-wrap gap-1 mt-1.5">
                <span v-for="et in TEMPLATE_EVAL_TYPES[activeEvalConfig.template]" :key="et" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  {{ EvalTypeLabels[et] }}
                </span>
              </div>
            </div>
          </Section>

          <Section title="总成绩权重" :hint="`合计：${mainTotal}%${mainTotal !== 100 ? '（须等于 100%）' : ''}`" :valid="mainTotal === 100">
            <Slider label="平时成绩" :val="gradeConfig.regularWeight" @change="(v) => updateGradeConfig('regularWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly" />
            <Slider label="期中成绩" :val="gradeConfig.midtermWeight" @change="(v) => updateGradeConfig('midtermWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly" />
            <Slider label="期末成绩" :val="gradeConfig.finalWeight" @change="(v) => updateGradeConfig('finalWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly" />
          </Section>

          <Section title="平时成绩构成" :hint="`合计：${regularTotal}%${regularTotal !== 100 ? '（须等于 100%）' : ''}`" :valid="regularTotal === 100">
            <Slider label="个人自评" :val="gradeConfig.selfEvalWeight" @change="(v) => updateGradeConfig('selfEvalWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly || !isEvalTypeEnabled('self')" />
            <Slider label="小组内互评" :val="gradeConfig.peerReviewWeight" @change="(v) => updateGradeConfig('peerReviewWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly || !isEvalTypeEnabled('intra_group')" />
            <Slider label="小组间互评" :val="gradeConfig.interGroupEvalWeight" @change="(v) => updateGradeConfig('interGroupEvalWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly || !isEvalTypeEnabled('inter_group')" />
            <Slider label="教师评价" :val="gradeConfig.teacherScoreWeight" @change="(v) => updateGradeConfig('teacherScoreWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly || !isEvalTypeEnabled('teacher')" />
            <Slider label="企业导师评价" :val="gradeConfig.mentorScoreWeight" @change="(v) => updateGradeConfig('mentorScoreWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly || !isEvalTypeEnabled('mentor')" />
          </Section>

          <Section title="期中成绩构成" :hint="`合计：${midtermSubTotal}%${midtermSubTotal !== 100 ? '（须等于 100%）' : ''}`" :valid="midtermSubTotal === 100">
            <Slider label="期中考试" :val="gradeConfig.midtermExamWeight" @change="(v) => updateGradeConfig('midtermExamWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly" />
            <Slider label="项目成绩" :val="gradeConfig.midtermProjectWeight" @change="(v) => updateGradeConfig('midtermProjectWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly" />
          </Section>

          <Section title="期末成绩构成" :hint="`合计：${finalSubTotal}%${finalSubTotal !== 100 ? '（须等于 100%）' : ''}`" :valid="finalSubTotal === 100">
            <Slider label="期末测试" :val="gradeConfig.finalExamWeight" @change="(v) => updateGradeConfig('finalExamWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly" />
            <Slider label="项目成绩" :val="gradeConfig.finalProjectWeight" @change="(v) => updateGradeConfig('finalProjectWeight', v)" :disabled="isReadOnly || isWeightLocked || isViewOnly" />
          </Section>

          <Section title="素质评价" hint="教师评分的加成分数上限（不计入权重百分比）" :valid="true">
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-700 w-28 flex-shrink-0">加成上限（分）</span>
              <input type="number" min="0" max="20" step="1"
                :value="gradeConfig.qualityEvalMaxBonus ?? 10"
                :disabled="isReadOnly || isWeightLocked || isViewOnly"
                @change="(e) => updateQualityMaxBonus(Number((e.target as HTMLInputElement).value))"
                class="w-24 px-2 py-1 rounded border border-gray-200 focus:border-brand-600 outline-none text-sm text-center disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
              <span class="text-sm text-gray-400">分</span>
            </div>
            <p class="text-xs text-gray-400 pl-2">教师对素质评价打分（0-100），最终最多折算该上限分数加成到总成绩（当前上限 {{ gradeConfig.qualityEvalMaxBonus ?? 10 }} 分）</p>
          </Section>
        </div>
      </div>
    </div>

    <!-- Tab: 成绩录入（期中/期末分区） -->
    <div v-if="activeTab === 'grade-entry'" class="space-y-6">
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-gray-400" />
            <h2 class="font-semibold text-gray-900">成绩录入</h2>
            <span class="text-xs text-gray-400">{{ enrolledStudents.length }}名学生</span>
          </div>
        </div>

        <!-- 搜索与过滤 -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <div class="relative w-48">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input v-model="gradeEntrySearch" type="text" placeholder="搜索学生姓名或学号..."
              class="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-xs" />
          </div>
          <select v-model="gradeFilterClass"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
            <option value="">全部班级</option>
            <option v-for="opt in gradeClassOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select v-model="gradeFilterGroup"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
            <option value="">全部分组</option>
            <option v-for="opt in gradeGroupOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <span v-if="gradeEntrySearch.trim()" class="text-xs text-gray-400">
            搜索 "{{ gradeEntrySearch.trim() }}"：匹配 {{ filteredGradeClassBlocks.length }} 个班级
          </span>
        </div>

        <!-- 期中 / 期末 列表（展开，含导入导出） -->
        <div class="mb-4 space-y-3">
          <!-- ====== 期中 ====== -->
          <div class="border border-gray-200 rounded-xl overflow-hidden">
            <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <BookOpen class="w-4 h-4 text-blue-500" />
              <span class="text-sm font-semibold text-gray-800">期中</span>
            </div>
            <div class="space-y-2 p-2">
              <!-- ===== 项目子板块 ===== -->
              <div class="border border-blue-100 rounded-lg overflow-hidden bg-white">
                <div class="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-100">
                  <div class="flex items-center gap-1.5">
                    <div class="w-1 h-4 rounded-full bg-blue-400"></div>
                    <span class="text-xs font-semibold text-blue-700">项目</span>
                    <span v-if="midtermProjects.length > 1" :class="midtermProjectTotalShare === 100 ? 'text-blue-400' : 'text-amber-500'" class="text-[10px]">占比合计：{{ midtermProjectTotalShare }}%</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button @click="showNewExamModal = true; newExamType = 'midterm_project'" :disabled="isReadOnly || !canManageProjects"
                      class="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-lg bg-white text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Plus class="w-3 h-3" /> 添加项目
                    </button>
                  </div>
                </div>
                <div class="divide-y divide-gray-50">
                  <div v-for="e in midtermProjects" :key="e.name" class="px-4 py-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <button @click="handleSelectExam(e.name, e.type)"
                          :class="`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${selectedExam === e.name ? 'bg-blue-50 text-blue-600 border-blue-300 font-medium' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`">
                          {{ e.name }}
                        </button>
                        <div v-if="midtermProjects.length > 1" class="flex items-center gap-1.5">
                          <span class="text-[10px] text-gray-400">占比</span>
                          <input type="number" min="0" max="100" :value="store.getExamWeight(courseId, e.name, e.type)"
                            @change="(ev) => { const v = parseInt((ev.target as HTMLInputElement).value); if (!isNaN(v)) store.setExamWeight(courseId, e.name, Math.min(100, Math.max(0, v)), e.type) }"
                            class="w-14 px-2 py-1 border border-gray-200 rounded text-[10px] text-center" :disabled="isReadOnly || !canManageProjects" />
                          <Lock v-if="isProjectWeightLocked(e.name)" class="w-3 h-3 text-amber-500" />
                          <span class="text-[10px] text-gray-400">%</span>
                        </div>
                      </div>
                    </div>
                    <!-- 班级列表 - 选中时展开 -->
                    <div v-if="selectedExam === e.name && filteredGradeClassBlocks.length > 0" class="mt-2 ml-6 border border-gray-100 rounded-lg overflow-hidden">
                      <div v-if="!midtermProjectShareReady" class="px-4 py-3 bg-amber-50 border-b border-amber-100 text-amber-700 flex items-center gap-2">
                        <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                        <span class="text-xs font-medium">项目占比合计为 {{ midtermProjectTotalShare }}%，需调整至 100% 才能录入成绩</span>
                      </div>
                      <div v-else class="px-4 py-3 bg-green-50 border-b border-green-200 text-green-700 flex items-center gap-2">
                        <CheckCircle class="w-5 h-5 flex-shrink-0 text-green-500" />
                        <span class="text-sm font-semibold">✓ 占比已配置完成，点击下方班级即可录入项目成绩</span>
                      </div>
                      <div v-for="(classBlock, ci) in filteredGradeClassBlocks" :key="ci"
                        @click="midtermProjectShareReady && (selectedGradeClass = classBlock.className, showGradePopup = true)"
                        class="flex items-center justify-between px-4 py-3 transition-colors border-b border-gray-50 last:border-b-0"
                        :class="midtermProjectShareReady ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-not-allowed opacity-60'">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-semibold text-gray-700 min-w-[4rem]">班级 {{ classBlock.className || '未分班' }}</span>
                          <div class="flex flex-wrap gap-1">
                            <span v-for="(group, gi) in classBlock.groups" :key="gi"
                              class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {{ group.groupName }} ({{ group.items.length }}人)
                            </span>
                          </div>
                          <span class="text-[10px] text-gray-400">{{ classBlock.groups.reduce((a, g) => a + g.items.length, 0) }}人</span>
                        </div>
                        <ChevronRight class="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                    <div v-else-if="selectedExam === e.name && filteredGradeClassBlocks.length === 0" class="mt-2 ml-6 text-center py-3 text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      暂无学生数据
                    </div>
                  </div>
                  <div v-if="midtermProjects.length === 0" class="px-4 py-3 text-center text-[10px] text-gray-400">
                    暂无项目，点击上方"添加项目"按钮创建
                  </div>
                </div>
              </div>
              <!-- ===== 笔试成绩子板块 ===== -->
              <div class="border border-emerald-100 rounded-lg overflow-hidden bg-white">
                <div class="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                  <div class="w-1 h-4 rounded-full bg-emerald-400"></div>
                  <span class="text-xs font-semibold text-emerald-700">笔试成绩</span>
                  <span class="text-[10px] text-emerald-300 ml-1">(固定，仅1次)</span>
                  <span v-if="isViewOnly" class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-500">仅查看</span>
                </div>
                <div class="divide-y divide-gray-50">
                  <div v-for="e in midtermExams" :key="e.name" class="px-4 py-3">
                    <div class="flex items-center justify-between">
                      <button @click="handleSelectExam(e.name, e.type)"
                        :class="`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${selectedExam === e.name ? 'bg-emerald-50 text-emerald-600 border-emerald-300 font-medium' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`">
                        {{ e.name }}
                      </button>
                    </div>
                    <!-- 班级列表 - 选中时展开 -->
                    <div v-if="selectedExam === e.name && filteredGradeClassBlocks.length > 0" class="mt-2 ml-6 border border-gray-100 rounded-lg overflow-hidden">
                      <div v-for="(classBlock, ci) in filteredGradeClassBlocks" :key="ci"
                        @click="selectedGradeClass = classBlock.className; showGradePopup = true"
                        class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-semibold text-gray-700 min-w-[4rem]">班级 {{ classBlock.className || '未分班' }}</span>
                          <div class="flex flex-wrap gap-1">
                            <span v-for="(group, gi) in classBlock.groups" :key="gi"
                              class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {{ group.groupName }} ({{ group.items.length }}人)
                            </span>
                          </div>
                          <span class="text-[10px] text-gray-400">{{ classBlock.groups.reduce((a, g) => a + g.items.length, 0) }}人</span>
                        </div>
                        <ChevronRight class="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                    <div v-else-if="selectedExam === e.name && filteredGradeClassBlocks.length === 0" class="mt-2 ml-6 text-center py-3 text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      暂无学生数据
                    </div>
                  </div>
                  <div v-if="midtermExams.length === 0" class="px-4 py-3 text-center text-[10px] text-gray-400">
                    笔试成绩将自动创建，请等待加载完成后导入
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ====== 期末 ====== -->
          <div class="border border-gray-200 rounded-xl overflow-hidden">
            <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <BookOpen class="w-4 h-4 text-amber-500" />
              <span class="text-sm font-semibold text-gray-800">期末</span>
            </div>
            <div class="space-y-2 p-2">
              <!-- ===== 项目子板块 ===== -->
              <div class="border border-blue-100 rounded-lg overflow-hidden bg-white">
                <div class="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-100">
                  <div class="flex items-center gap-1.5">
                    <div class="w-1 h-4 rounded-full bg-blue-400"></div>
                    <span class="text-xs font-semibold text-blue-700">项目</span>
                    <span v-if="finalProjects.length > 1" :class="finalProjectTotalShare === 100 ? 'text-blue-400' : 'text-amber-500'" class="text-[10px]">占比合计：{{ finalProjectTotalShare }}%</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button @click="showNewExamModal = true; newExamType = 'final_project'" :disabled="isReadOnly || !canManageProjects"
                      class="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-lg bg-white text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Plus class="w-3 h-3" /> 添加项目
                    </button>
                  </div>
                </div>
                <div class="divide-y divide-gray-50">
                  <div v-for="e in finalProjects" :key="e.name" class="px-4 py-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <button @click="handleSelectExam(e.name, e.type)"
                          :class="`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${selectedExam === e.name ? 'bg-blue-50 text-blue-600 border-blue-300 font-medium' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`">
                          {{ e.name }}
                        </button>
                        <div v-if="finalProjects.length > 1" class="flex items-center gap-1.5">
                          <span class="text-[10px] text-gray-400">占比</span>
                          <input type="number" min="0" max="100" :value="store.getExamWeight(courseId, e.name, e.type)"
                            @change="(ev) => { const v = parseInt((ev.target as HTMLInputElement).value); if (!isNaN(v)) store.setExamWeight(courseId, e.name, Math.min(100, Math.max(0, v)), e.type) }"
                            class="w-14 px-2 py-1 border border-gray-200 rounded text-[10px] text-center" :disabled="isReadOnly || !canManageProjects" />
                          <Lock v-if="isProjectWeightLocked(e.name)" class="w-3 h-3 text-amber-500" />
                          <span class="text-[10px] text-gray-400">%</span>
                        </div>
                      </div>
                    </div>
                    <!-- 班级列表 - 选中时展开 -->
                    <div v-if="selectedExam === e.name && filteredGradeClassBlocks.length > 0" class="mt-2 ml-6 border border-gray-100 rounded-lg overflow-hidden">
                      <div v-if="!finalProjectShareReady" class="px-4 py-3 bg-amber-50 border-b border-amber-100 text-amber-700 flex items-center gap-2">
                        <AlertTriangle class="w-4 h-4 flex-shrink-0" />
                        <span class="text-xs font-medium">项目占比合计为 {{ finalProjectTotalShare }}%，需调整至 100% 才能录入成绩</span>
                      </div>
                      <div v-else class="px-4 py-3 bg-green-50 border-b border-green-200 text-green-700 flex items-center gap-2">
                        <CheckCircle class="w-5 h-5 flex-shrink-0 text-green-500" />
                        <span class="text-sm font-semibold">✓ 占比已配置完成，点击下方班级即可录入项目成绩</span>
                      </div>
                      <div v-for="(classBlock, ci) in filteredGradeClassBlocks" :key="ci"
                        @click="finalProjectShareReady && (selectedGradeClass = classBlock.className, showGradePopup = true)"
                        class="flex items-center justify-between px-4 py-3 transition-colors border-b border-gray-50 last:border-b-0"
                        :class="finalProjectShareReady ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-not-allowed opacity-60'">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-semibold text-gray-700 min-w-[4rem]">班级 {{ classBlock.className || '未分班' }}</span>
                          <div class="flex flex-wrap gap-1">
                            <span v-for="(group, gi) in classBlock.groups" :key="gi"
                              class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {{ group.groupName }} ({{ group.items.length }}人)
                            </span>
                          </div>
                          <span class="text-[10px] text-gray-400">{{ classBlock.groups.reduce((a, g) => a + g.items.length, 0) }}人</span>
                        </div>
                        <ChevronRight class="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                    <div v-else-if="selectedExam === e.name && filteredGradeClassBlocks.length === 0" class="mt-2 ml-6 text-center py-3 text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      暂无学生数据
                    </div>
                  </div>
                  <div v-if="finalProjects.length === 0" class="px-4 py-3 text-center text-[10px] text-gray-400">
                    暂无项目，点击上方"添加项目"按钮创建
                  </div>
                </div>
              </div>
              <!-- ===== 笔试成绩子板块 ===== -->
              <div class="border border-emerald-100 rounded-lg overflow-hidden bg-white">
                <div class="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                  <div class="w-1 h-4 rounded-full bg-emerald-400"></div>
                  <span class="text-xs font-semibold text-emerald-700">笔试成绩</span>
                  <span class="text-[10px] text-emerald-300 ml-1">(固定，仅1次)</span>
                  <span v-if="isViewOnly" class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-500">仅查看</span>
                </div>
                <div class="divide-y divide-gray-50">
                  <div v-for="e in finalExams" :key="e.name" class="px-4 py-3">
                    <div class="flex items-center justify-between">
                      <button @click="handleSelectExam(e.name, e.type)"
                        :class="`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${selectedExam === e.name ? 'bg-emerald-50 text-emerald-600 border-emerald-300 font-medium' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`">
                        {{ e.name }}
                      </button>
                    </div>
                    <!-- 班级列表 - 选中时展开 -->
                    <div v-if="selectedExam === e.name && filteredGradeClassBlocks.length > 0" class="mt-2 ml-6 border border-gray-100 rounded-lg overflow-hidden">
                      <div v-for="(classBlock, ci) in filteredGradeClassBlocks" :key="ci"
                        @click="selectedGradeClass = classBlock.className; showGradePopup = true"
                        class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-semibold text-gray-700 min-w-[4rem]">班级 {{ classBlock.className || '未分班' }}</span>
                          <div class="flex flex-wrap gap-1">
                            <span v-for="(group, gi) in classBlock.groups" :key="gi"
                              class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {{ group.groupName }} ({{ group.items.length }}人)
                            </span>
                          </div>
                          <span class="text-[10px] text-gray-400">{{ classBlock.groups.reduce((a, g) => a + g.items.length, 0) }}人</span>
                        </div>
                        <ChevronRight class="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                    <div v-else-if="selectedExam === e.name && filteredGradeClassBlocks.length === 0" class="mt-2 ml-6 text-center py-3 text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      暂无学生数据
                    </div>
                  </div>
                  <div v-if="finalExams.length === 0" class="px-4 py-3 text-center text-[10px] text-gray-400">
                    笔试成绩将自动创建，请等待加载完成后导入
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 搜索与过滤（影响各项目/考试下展开的班级列表） -->
        <div v-if="selectedExam" class="flex flex-wrap items-center gap-2 mb-3">
          <select v-model="gradeFilterClass"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
            <option value="">全部班级</option>
            <option v-for="opt in gradeClassOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select v-model="gradeFilterGroup"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
            <option value="">全部分组</option>
            <option v-for="opt in gradeGroupOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>

      <!-- 成绩查询（置于成绩管理下方） -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <BarChart3 class="w-5 h-5 text-gray-400" />
            <h2 class="font-semibold text-gray-900">成绩查询</h2>
            <span class="text-xs text-gray-400">{{ enrolledStudents.length }}名学生</span>
          </div>
        </div>

        <!-- 搜索与过滤 -->
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <div class="relative w-48">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input v-model="gradeSearch" type="text" placeholder="搜索学生姓名或学号..."
              class="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-xs" />
          </div>
          <select v-model="gradeFilterClass"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
            <option value="">全部班级</option>
            <option v-for="opt in gradeClassOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select v-model="gradeFilterGroup"
            class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
            <option value="">全部分组</option>
            <option v-for="opt in gradeGroupOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- 成绩分布图表 -->
        <div v-if="hasGradeData" class="border-t border-gray-100 pt-4">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 class="text-xs font-semibold text-gray-700 mb-2">期中成绩分布</h4>
              <div ref="midtermChartRef" class="w-full h-64"></div>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-gray-700 mb-2">期末成绩分布</h4>
              <div ref="finalChartRef" class="w-full h-64"></div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8">
          <BarChart3 class="w-12 h-12 text-gray-200 mx-auto mb-2" />
          <p class="text-sm text-gray-400">暂无成绩数据，请先录入期中/期末成绩</p>
        </div>
      </div>
    </div>

      <!-- 新建考试/项目弹窗 -->
      <Teleport to="body">
        <div v-if="showNewExamModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showNewExamModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">新建项目</h3>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-gray-500 font-medium mb-1 block">名称</label>
                <input v-model="newExamName" type="text" placeholder="如：项目一、项目二"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>
              <div>
                <label class="text-xs text-gray-500 font-medium mb-1 block">满分</label>
                <input v-model.number="newExamFullScore" type="number" min="1" max="100" value="100"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
              </div>
              <div>
                <label class="text-xs text-gray-500 font-medium mb-1 block">类型</label>
                <select v-model="newExamType"
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none">
                    <option value="midterm_project">期中项目</option>
                    <option value="final_project">期末项目</option>
                  </select>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-6">
              <button @click="showNewExamModal = false"
                class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button @click="handleAddExam"
                :disabled="!newExamName.trim()"
                class="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                创建
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- 成绩管理弹窗 -->
      <Teleport to="body">
        <div v-if="showGradePopup" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="closeGradePopup()" />
          <div class="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[85vh] flex flex-col">
            <!-- 头部 -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-semibold text-gray-800">班级 {{ selectedGradeClass }} - 成绩管理（{{ selectedExam }}）</h3>
                <div class="flex items-center gap-1">
                  <label class="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded transition-colors cursor-pointer bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100">
                    <FileSpreadsheet class="w-3 h-3" /> 导入
                    <input type="file" accept=".xlsx,.xls" @change="handleExcelImport" class="hidden" :disabled="isReadOnly || isViewOnly" />
                  </label>
                  <button @click="handleDownloadTemplate()"
                    class="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded border border-gray-200 text-gray-500 hover:bg-gray-50">
                    <FileSpreadsheet class="w-3 h-3" /> 模板
                  </button>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="relative w-48">
                  <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input v-model="gradePopupSearch" type="text" placeholder="搜索学生姓名或学号..."
                    class="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-xs" />
                </div>
                <button @click="closeGradePopup()" class="text-gray-400 hover:text-gray-600">
                  <X class="w-5 h-5" />
                </button>
              </div>
            </div>
            <!-- 内容 -->
            <div class="flex-1 overflow-auto px-6 py-4">
              <div v-if="!currentGradeClassSection" class="text-center py-8 text-gray-400">暂无数据</div>
              <div v-else-if="filteredGradePopupGroups.length === 0" class="text-center py-8 text-gray-400">未找到匹配的学生</div>
              <template v-if="currentGradeClassSection">
                <div v-for="(group, gi) in filteredGradePopupGroups" :key="gi" class="mb-4">
                  <div class="text-xs font-semibold text-gray-600 mb-2 px-1">{{ group.groupName }}（{{ group.items.length }}人）</div>
                  <table class="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr class="bg-gray-50 border-b border-gray-200">
                        <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs">学生</th>
                        <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs w-20">满分</th>
                        <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs w-32">成绩</th>
                        <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs w-24">折合百分制</th>
                        <th class="text-left py-2 px-3 text-gray-500 font-medium text-xs w-20">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="{ student } in group.items" :key="student!.id"
                        class="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        :class="{ 'bg-emerald-50/20': isExamSubmitted(student!.id) }">
                        <td class="py-2 px-3">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span class="text-xs font-medium text-blue-600">{{ student!.name.charAt(0) }}</span>
                            </div>
                            <div>
                              <p class="font-medium text-gray-900 text-sm">{{ student!.name }}</p>
                              <p class="text-xs text-gray-400">{{ student!.studentId || student!.id }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="py-2 px-3 text-xs text-gray-500">{{ currentExamFullScore }}</td>
                        <td class="py-2 px-3">
                          <div v-if="!isExamSubmitted(student!.id) && !isViewOnly" class="flex items-center gap-1">
                            <input type="number" min="0" max="100" step="0.5"
                              :value="examInputs[student!.id] ?? getStudentExamScore(student!.id)"
                              @input="(e) => { const v = parseFloat((e.target as HTMLInputElement).value); if (!isNaN(v)) examInputs[student!.id] = Math.min(100, Math.max(0, v)); else delete examInputs[student!.id] }"
                              :placeholder="getStudentExamScore(student!.id) !== null ? String(getStudentExamScore(student!.id)) : '分数'"
                              class="w-full max-w-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                            <span class="text-xs text-gray-400">/ {{ currentExamFullScore }}</span>
                          </div>
                          <span v-else-if="isExamSubmitted(student!.id)" class="text-xs font-medium text-emerald-600">{{ getStudentExamScore(student!.id) }}分</span>
                          <span v-else-if="isViewOnly" class="text-xs font-medium text-gray-500">
                            {{ getStudentExamScore(student!.id) !== null ? getStudentExamScore(student!.id) + '分' : '未录入' }}
                          </span>
                        </td>
                        <td class="py-2 px-3 text-xs text-blue-600 font-medium">{{ getStudentExamPercent(student!.id) }}</td>
                        <td class="py-2 px-3">
                          <span v-if="isExamSubmitted(student!.id)" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle class="w-3 h-3" />已提交
                          </span>
                          <span v-else-if="getStudentExamScore(student!.id) !== null" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                            <Save class="w-3 h-3" />已保存
                          </span>
                          <span v-else class="text-xs text-gray-300">-</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
            <!-- 底部：导师在笔试成绩下不显示保存（笔试仅查看）；项目成绩可保存 -->
            <div v-if="!isReadOnly && !isViewOnly" class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">已提交 {{ submittedExamCount }} 人</span>
              </div>
              <div class="flex items-center gap-2">
                <button @click="handleSaveExamScores"
                  :class="`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${hasExamInputs ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`"
                  :disabled="!hasExamInputs">
                  <Save class="w-4 h-4" />
                  保存成绩
                </button>
                <button @click="handleSubmitExamScores"
                  :class="`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${pendingExamSubmits > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`"
                  :disabled="pendingExamSubmits === 0">
                  <CheckCircle class="w-4 h-4" />
                  全部提交（{{ pendingExamSubmits }}人）
                </button>
                <button @click="closeGradePopup()"
                  class="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">关闭</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

    <!-- Tab: 学生管理（大改版：班级板块直展分组） -->
    <div v-if="activeTab === 'students'" class="space-y-6">
      <!-- 课程信息提示 -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <BookOpen class="w-5 h-5 text-blue-600" />
        <span class="text-sm font-medium text-blue-800">
          当前课程：<span class="font-bold">{{ course?.title }}</span>
        </span>
        <span class="text-xs text-blue-500 ml-auto">共 {{ enrolledStudents.length }} 名学生</span>
      </div>

      <!-- 顶部全局操作栏：搜索框 + 新建班级（含导入班级成员） -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3 flex-wrap">
          <h2 class="font-semibold text-gray-900 text-lg">班级管理</h2>
          <!-- 学员搜索框 -->
          <div class="relative">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input v-model="studentManageSearch" type="text" placeholder="搜索学员姓名/学号..."
              class="w-64 pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" />
            <button v-if="studentManageSearch" @click="studentManageSearch = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div v-if="!isViewOnly" class="flex gap-2 flex-wrap">
          <button @click="openAddStudentModal"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm">
            <UserPlus class="w-3.5 h-3.5" />
            新增学生
          </button>
          <button @click="openAddClassModal"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-sm">
            <Plus class="w-3.5 h-3.5" />
            新建班级
          </button>
        </div>
      </div>

      <!-- 班级横向等分板块 -->
      <!-- ====== 搜索结果区（当有搜索词时显示） ====== -->
      <div v-if="studentManageSearch.trim()" class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span class="text-sm text-gray-600">
            搜索 "<span class="font-medium text-gray-900">{{ studentManageSearch.trim() }}</span>" 找到
            <span class="font-bold text-blue-600">{{ searchedStudentList.length }}</span> 名学员
          </span>
          <button @click="studentManageSearch = ''" class="text-xs text-gray-400 hover:text-gray-600">清除搜索</button>
        </div>
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th class="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">学号</th>
              <th class="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">所在班级</th>
              <th class="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">所在分组</th>
              <th v-if="!isViewOnly" class="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in searchedStudentList" :key="item.student.id" class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td class="px-4 py-2.5">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <span class="text-xs font-bold text-blue-600">{{ item.student.name[0] }}</span>
                  </div>
                  <span class="text-sm font-medium text-gray-900">{{ item.student.name }}</span>
                </div>
              </td>
              <td class="px-4 py-2.5 text-sm text-gray-600">{{ item.student.studentId || '-' }}</td>
              <td class="px-4 py-2.5">
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{{ item.student.className || '未分班' }}</span>
              </td>
              <td class="px-4 py-2.5">
                <span v-if="item.groupName" class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{{ item.groupName }}</span>
                <span v-else class="text-xs text-gray-400">未分组</span>
              </td>
              <td v-if="!isViewOnly" class="px-4 py-2.5">
                <div class="flex flex-col gap-1.5 items-end">
                  <!-- 分组操作 -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-gray-400 w-7 text-right">分组</span>
                    <button v-if="item.groupName" @click="quickRemoveFromGroup(item.student.id)"
                      class="px-2 py-0.5 text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors" title="移出当前分组">
                      移出分组
                    </button>
                    <button v-else @click="openQuickAddToGroup(item.student.id)"
                      class="px-2 py-0.5 text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors" title="加入分组">
                      加入分组
                    </button>
                  </div>
                  <!-- 班级操作 -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-gray-400 w-7 text-right">班级</span>
                    <button v-if="item.student.className" @click="handleRemoveStudentFromClass(item.student.id)"
                      class="px-2 py-0.5 text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors" title="移出当前班级">
                      移出班级
                    </button>
                    <button v-else @click="openQuickAddToClass(item.student.id)"
                      class="px-2 py-0.5 text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors" title="加入班级">
                      加入班级
                    </button>
                  </div>
                  <!-- 课程操作 -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-gray-400 w-7 text-right">课程</span>
                    <button @click="handleRemoveStudent(item.student.id)"
                      class="px-2 py-0.5 text-[11px] text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors" title="移出本课程">
                      移出课程
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="searchedStudentList.length === 0">
              <td :colspan="isViewOnly ? 4 : 5" class="px-4 py-12 text-center text-gray-400">没有匹配的学员</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ====== 班级板块（无搜索词时显示，排除未分班） ====== -->
      <div v-if="!studentManageSearch.trim() && classedBlocks.length > 0" class="flex flex-nowrap gap-5 overflow-x-auto pb-2" style="scrollbar-width: thin;">
        <div
          v-for="(classData, clsIdx) in classedBlocks" :key="clsIdx"
          class="flex-1 min-w-[320px] bg-white rounded-xl border border-gray-100 shadow-sm p-5 group"
        >
          <!-- 班级标题 + 人数 + 操作 -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-lg text-gray-900 flex items-center gap-2">
              <span class="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">班级</span>
              {{ classData.className || '未分班' }}
              <span class="text-xs text-gray-400 font-normal">（{{ classData.students.length }}人）</span>
            </h3>
            <div v-if="!isViewOnly && classData.className" class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click.stop="openAddStudentToClass(classData.className)" class="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="添加学员到班级">
                <UserPlus class="w-3.5 h-3.5" />
              </button>
              <button @click.stop="handleImportGroupsForClass(classData.className)" class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="导入分组">
                <Upload class="w-3.5 h-3.5" />
              </button>
              <button @click.stop="openNewGroupForClass(classData.className)" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="新建分组">
                <Plus class="w-3.5 h-3.5" />
              </button>
              <button @click.stop="handleDeleteClass(classData.className)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除班级">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- 该班级的分组列表 -->
          <div v-if="getGroupsForClassBlock(classData.className).length > 0" class="space-y-3">
            <div
              v-for="group in getGroupsForClassBlock(classData.className)" :key="group.id"
              class="p-3 rounded-lg border border-gray-100 hover:border-gray-200 group/grp transition-all"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-700">
                    {{ group.name.charAt(0) }}
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900">{{ group.name }}</p>
                    <p class="text-[11px] text-gray-400">{{ group.memberIds.length }} 名成员</p>
                  </div>
                </div>
                <div v-if="!isViewOnly" class="flex gap-1 opacity-0 group-hover/grp:opacity-100 transition-opacity">
                  <button @click.stop="openAddMemberToGroup(group)" class="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="添加本班级未分组学员">
                    <UserPlus class="w-3.5 h-3.5" />
                  </button>
                  <button @click.stop="openEditGroupModal(group)" class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑分组">
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button @click.stop="handleDeleteGroup(group.id)" class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除分组">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div class="flex flex-wrap gap-1">
                <template v-for="sid in group.memberIds" :key="sid">
                  <span class="group/tag relative inline-flex items-center gap-1 text-[11px] pl-2 pr-1 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {{ getStudentName(sid) }}
                    <button v-if="!isViewOnly" @click.stop="openRemoveMemberModal(group.id, sid)"
                      class="w-3.5 h-3.5 rounded-full flex items-center justify-center text-indigo-400 hover:text-white hover:bg-red-500 transition-colors" title="移除学员">
                      <X class="w-2.5 h-2.5" />
                    </button>
                  </span>
                </template>
                <span v-if="group.memberIds.length === 0" class="text-[11px] text-gray-400 italic">暂无成员</span>
              </div>
            </div>
          </div>
          <div v-else class="border border-dashed border-gray-200 rounded-lg p-6 text-center">
            <Users class="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p class="text-xs text-gray-400">该班级暂无分组</p>
            <button v-if="!isViewOnly" @click="openNewGroupForClass(classData.className)"
              class="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <Plus class="w-3 h-3" />新建分组
            </button>
          </div>

          <!-- 一键分组按钮（每个班级内部） -->
          <div v-if="!isViewOnly && classData.className && classData.students.length >= 2" class="mt-4 pt-3 border-t border-gray-100 flex gap-2 justify-end">
            <button @click.stop="showOneClickGroupForClass(classData.className)"
              class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
              <RefreshCw class="w-3.5 h-3.5" />一键分组
            </button>
          </div>

        </div>
      </div>

      <!-- ====== 未分班学员面板（固定展开，位于班级板块下方） ====== -->
      <div v-if="!studentManageSearch.trim() && unclassedStudents.length > 0" class="mt-4 bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div class="flex items-center gap-2 px-5 py-3 bg-amber-50">
          <Users class="w-4 h-4 text-amber-600" />
          <span class="text-sm font-semibold text-amber-800">未分班学员</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">{{ unclassedStudents.length }}人</span>
          <span class="text-xs text-amber-500">对其分组 / 班级 / 课程进行移出与加入</span>
        </div>
        <div class="p-4">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">姓名</th>
                <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">学号</th>
                <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">所在分组</th>
                <th v-if="!isViewOnly" class="text-center px-3 py-2 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stu in unclassedStudents" :key="stu.id" class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                      <span class="text-xs font-bold text-amber-600">{{ stu.name[0] }}</span>
                    </div>
                    <span class="text-sm font-medium text-gray-900">{{ stu.name }}</span>
                  </div>
                </td>
                <td class="px-3 py-2.5 text-sm text-gray-600">{{ stu.studentId || stu.id }}</td>
                <td class="px-3 py-2.5">
                  <span v-if="getStudentGroupName(stu.id)" class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{{ getStudentGroupName(stu.id) }}</span>
                  <span v-else class="text-xs text-gray-400">未分组</span>
                </td>
                <td v-if="!isViewOnly" class="px-3 py-2.5">
                  <div class="flex flex-col gap-1.5 items-end">
                    <!-- 分组操作 -->
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] text-gray-400 w-7 text-right">分组</span>
                      <button v-if="getStudentGroupName(stu.id)" @click="quickRemoveFromGroup(stu.id)"
                        class="px-2 py-0.5 text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors" title="移出当前分组">
                        移出分组
                      </button>
                      <button v-else @click="openQuickAddToGroup(stu.id)"
                        class="px-2 py-0.5 text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors" title="加入分组">
                        加入分组
                      </button>
                    </div>
                    <!-- 班级操作 -->
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] text-gray-400 w-7 text-right">班级</span>
                      <button v-if="stu.className" @click="handleRemoveStudentFromClass(stu.id)"
                        class="px-2 py-0.5 text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors" title="移出当前班级">
                        移出班级
                      </button>
                      <button v-else @click="openQuickAddToClass(stu.id)"
                        class="px-2 py-0.5 text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors" title="加入班级">
                        加入班级
                      </button>
                    </div>
                    <!-- 课程操作 -->
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] text-gray-400 w-7 text-right">课程</span>
                      <button @click="handleRemoveStudent(stu.id)"
                        class="px-2 py-0.5 text-[11px] text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors" title="移出本课程">
                        移出课程
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="!studentManageSearch.trim() && classBlocks.length === 0" class="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
        <Users class="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>暂无班级数据，请先导入学生</p>
      </div>
      <!-- 隐藏的文件输入：用于每个班级内的导入分组 -->
      <input ref="groupClassExcelInput" type="file" accept=".xlsx,.xls" class="hidden" @change="handleImportGroupsExcel" />

      <!-- ====== 一键分组弹窗 ====== -->
      <Teleport to="body">
        <div v-if="showOneClickGroup" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showOneClickGroup = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-semibold text-gray-900 text-lg">一键随机分组</h3>
              <button @click="showOneClickGroup = false" class="text-gray-400 hover:text-gray-600"><X class="w-4 h-4" /></button>
            </div>
            <div class="space-y-4">
              <!-- 当前班级（只读显示） -->
              <div>
                <label class="text-xs text-gray-500 block mb-1.5 font-medium">当前班级</label>
                <div class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700">
                  {{ oneClickGroupData.className || '未分班' }}
                </div>
              </div>

              <!-- 班级总人数 -->
              <div v-if="oneClickGroupData.className" class="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <Users class="w-5 h-5 text-blue-600" />
                <div>
                  <p class="text-sm font-medium text-blue-800">
                    该班共 <span class="text-lg font-bold">{{ getClassStudentCount(oneClickGroupData.className) }}</span> 名学生
                  </p>
                  <p class="text-xs text-blue-500">请根据人数设置合适的总组数</p>
                </div>
              </div>

              <!-- 填写总组数 -->
              <div>
                <label class="text-xs text-gray-500 block mb-1.5 font-medium">设置总组数</label>
                <div class="flex items-center gap-3">
                  <button
                    @click="oneClickGroupData.groupCount = Math.max(2, (oneClickGroupData.groupCount || 2) - 1)"
                    class="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >−</button>
                  <input
                    v-model.number="oneClickGroupData.groupCount"
                    type="number" min="2"
                    :max="oneClickMaxGroups"
                    class="flex-1 text-center px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:border-blue-400 outline-none"
                    :class="{ 'border-red-400 focus:border-red-500': groupCountExceedsStudents }"
                  />
                  <button
                    @click="oneClickGroupData.groupCount = Math.min(oneClickMaxGroups || 1, (oneClickGroupData.groupCount || 2) + 1)"
                    class="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >+</button>
                </div>
                <!-- 组数超过班级人数警告 -->
                <p v-if="groupCountExceedsStudents" class="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle class="w-3 h-3" />
                  总组数（{{ oneClickGroupData.groupCount }}）不能超过该班级人数（{{ oneClickMaxGroups }}）
                </p>
                <p v-else-if="oneClickGroupData.className" class="text-[11px] text-gray-400 mt-1.5">
                  每组约 {{ Math.ceil(oneClickMaxGroups / (oneClickGroupData.groupCount || 2)) }} 人
                </p>
              </div>

              <button
                @click="handleOneClickGroup"
                :disabled="!oneClickGroupData.className || !oneClickGroupData.groupCount || oneClickGroupData.groupCount < 2 || groupCountExceedsStudents"
                class="w-full py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw class="w-4 h-4" />
                开始随机分组
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 新增班级弹窗（含一键导入班级成员） ====== -->
      <Teleport to="body">
        <div v-if="showAddClass" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showAddClass = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900 text-lg">新增班级</h3>
              <button @click="showAddClass = false" class="text-gray-400 hover:text-gray-600"><X class="w-4 h-4" /></button>
            </div>
            <div class="space-y-4">
              <!-- 班级名称 -->
              <div>
                <label class="text-xs text-gray-500 block mb-1">班级名称 <span class="text-red-500">*</span></label>
                <input v-model="addClassForm.className" placeholder="输入班级名称，如：软件工程一班"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" />
              </div>

              <!-- 一键导入班级成员 -->
              <div class="border-t border-gray-100 pt-4">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs text-gray-500">导入班级成员（可选）</label>
                  <div class="flex items-center gap-2">
                    <span v-if="addClassFileName" class="text-xs text-gray-400 truncate max-w-[160px]" :title="addClassFileName">{{ addClassFileName }}</span>
                    <button v-if="addClassMembers.length > 0" @click="clearAddClassMembers"
                      class="text-xs text-red-500 hover:text-red-600">清空</button>
                  </div>
                </div>
                <input ref="addClassExcelInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="handleAddClassExcel" />
                <button type="button" @click="addClassExcelInput?.click()"
                  class="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 border border-dashed border-teal-300 rounded-lg transition-colors">
                  <Upload class="w-4 h-4" />
                  {{ addClassMembers.length > 0 ? `已解析 ${addClassMembers.length} 名成员，点击重新选择` : '一键导入班级成员信息（Excel）' }}
                </button>
                <p class="text-[11px] text-gray-400 mt-1.5">支持列：学生姓名 / 学生学号；已存在的学生会自动匹配，不存在将自动新建并加入本课程</p>

                <!-- 解析出的成员预览 -->
                <div v-if="addClassMembers.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg">
                  <table class="w-full">
                    <thead class="sticky top-0 bg-gray-50">
                      <tr class="border-b border-gray-100">
                        <th class="text-left px-3 py-1.5 text-[11px] font-medium text-gray-500">#</th>
                        <th class="text-left px-3 py-1.5 text-[11px] font-medium text-gray-500">学生姓名</th>
                        <th class="text-left px-3 py-1.5 text-[11px] font-medium text-gray-500">学生学号</th>
                        <th class="text-left px-3 py-1.5 text-[11px] font-medium text-gray-500">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(m, i) in addClassMembers" :key="i" class="border-b border-gray-50">
                        <td class="px-3 py-1.5 text-xs text-gray-400">{{ i + 1 }}</td>
                        <td class="px-3 py-1.5 text-xs text-gray-700">{{ m.name || '-' }}</td>
                        <td class="px-3 py-1.5 text-xs text-gray-700">{{ m.studentId || '-' }}</td>
                        <td class="px-3 py-1.5">
                          <span v-if="m.existing" class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">已存在</span>
                          <span v-else class="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">将新建</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="flex gap-2 pt-2">
                <button @click="showAddClass = false" class="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button @click="saveAddClass" :disabled="!addClassForm.className.trim()"
                  class="flex-1 px-4 py-2 text-sm text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg">保存</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 新增学生弹窗（从总库选人加入本课程） ====== -->
      <Teleport to="body">
        <div v-if="showAddStudentModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showAddStudentModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900 text-lg">从总库选择学生</h3>
              <button @click="showAddStudentModal = false" class="text-gray-400 hover:text-gray-600"><X class="w-4 h-4" /></button>
            </div>
            <p class="text-xs text-gray-400 mb-4">搜索系统总库中的学生并加入本课程；不在库的学生请联系管理员添加入库</p>
            <div class="space-y-3">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input v-model="repoSearchKeyword" @input="searchRepoStudents" placeholder="搜索姓名 / 学号 / 手机号"
                  class="w-full pl-10 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none" />
              </div>
              <div class="max-h-64 overflow-y-auto rounded-lg border border-gray-100">
                <div v-if="repoSearching" class="py-6 text-center text-sm text-gray-400">搜索中...</div>
                <div v-else-if="repoSearchResults.length === 0" class="py-6 text-center text-sm text-gray-400">
                  {{ repoSearchKeyword ? '未找到匹配学生，请联系管理员添加入库' : '请输入关键词搜索总库' }}
                </div>
                <div v-else>
                  <div v-for="s in repoSearchResults" :key="s.id"
                    @click="addRepoStudentToCourse(s)"
                    class="flex items-center justify-between px-4 py-3 cursor-pointer border-b border-gray-50 last:border-0 hover:bg-emerald-50">
                    <div>
                      <p class="text-sm font-medium text-gray-900">{{ s.name }}</p>
                      <p class="text-xs text-gray-400">{{ s.user_no || '-' }} · {{ s.account || '-' }}</p>
                    </div>
                    <span class="text-xs text-emerald-600">加入</span>
                  </div>
                </div>
              </div>
              <p v-if="repoAddMsg" class="text-sm" :class="repoAddMsgType === 'error' ? 'text-red-500' : 'text-emerald-600'">{{ repoAddMsg }}</p>
              <div class="flex gap-2 pt-2">
                <button @click="showAddStudentModal = false" class="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">关闭</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 编辑班级弹窗 ====== -->
      <Teleport to="body">
        <div v-if="showEditClassModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showEditClassModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900 text-lg">编辑班级</h3>
              <button @click="showEditClassModal = false" class="text-gray-400 hover:text-gray-600"><X class="w-4 h-4" /></button>
            </div>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-gray-500 block mb-1">班级名称</label>
                <input v-model="editClassName" placeholder="输入班级名称"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" />
              </div>
              <div class="flex gap-2 pt-2">
                <button @click="showEditClassModal = false" class="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button @click="handleSaveEditClass" :disabled="!editClassName.trim()"
                  class="flex-1 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg">保存</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 新建/编辑分组弹窗（选班级 + 选成员） ====== -->
      <Teleport to="body">
        <div v-if="showGroupModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showGroupModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editingGroup ? '修改分组' : '新建分组' }}</h3>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-gray-500 block mb-1">所属班级</label>
                <select v-model="groupFormClassName"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none">
                  <option value="" disabled>请选择班级</option>
                  <option v-for="cb in classBlocks" :key="cb.className" :value="cb.className">
                    {{ cb.className || '未分班' }}
                  </option>
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">组名</label>
                <input v-model="groupFormName" placeholder="请输入组名" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">选择成员（仅显示该班学生）</label>
                <div class="max-h-40 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1">
                  <div v-for="stu in getClassStudents(groupFormClassName)" :key="stu.id"
                    @click="toggleGroupFormMember(stu.id)"
                    class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm"
                    :class="groupFormMembers.includes(stu.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'">
                    <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      :class="groupFormMembers.includes(stu.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'">
                      <span v-if="groupFormMembers.includes(stu.id)" class="text-white text-[10px]">✓</span>
                    </div>
                    <span>{{ stu.name }}</span>
                    <span class="text-xs text-gray-400 ml-auto">{{ stu.id }}</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-2 pt-2">
                <button @click="showGroupModal = false; editingGroup = null" class="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button @click="handleSaveGroup" class="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  {{ editingGroup ? '保存' : '保存' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 编辑学生弹窗 ====== -->
      <Teleport to="body">
        <div v-if="showEditStudentModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showEditStudentModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">编辑学生信息</h3>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-gray-500 block mb-1">姓名</label>
                <input v-model="editStudentName" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">学号</label>
                <input v-model="editStudentIdField" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label class="text-xs text-gray-500 block mb-1">班级</label>
                <input v-model="editStudentClass" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="输入班级名称" />
              </div>
              <div class="flex gap-2 pt-2">
                <button @click="showEditStudentModal = false" class="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button @click="handleSaveEditStudent" class="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">保存</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 添加学员到分组弹窗 ====== -->
      <Teleport to="body">
        <div v-if="showAddMemberModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showAddMemberModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">添加学员到分组</h3>
                <p class="text-xs text-gray-400 mt-0.5">分组：{{ addMemberGroupName }} · 仅显示本班级未分组学员</p>
              </div>
              <button @click="showAddMemberModal = false" class="text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
            </div>
            <div class="space-y-3">
              <div class="relative">
                <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input v-model="addMemberSearch" type="text" placeholder="搜索学员姓名或学号..."
                  class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" />
              </div>
              <div class="max-h-60 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1">
                <div v-for="stu in candidateAddMembers" :key="stu.id"
                  @click="toggleAddMember(stu.id)"
                  class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm"
                  :class="addMemberSelected.includes(stu.id) ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50 text-gray-600'">
                  <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    :class="addMemberSelected.includes(stu.id) ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'">
                    <span v-if="addMemberSelected.includes(stu.id)" class="text-white text-[10px]">✓</span>
                  </div>
                  <span class="flex-1">{{ stu.name }}</span>
                  <span class="text-xs text-gray-400">{{ stu.studentId || stu.id }}</span>
                </div>
                <div v-if="candidateAddMembers.length === 0" class="text-center py-6 text-xs text-gray-400">
                  该班级没有未分组学员
                </div>
              </div>
              <div class="flex gap-2 pt-2">
                <button @click="showAddMemberModal = false" class="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button @click="confirmAddMembersToGroup" :disabled="addMemberSelected.length === 0"
                  class="flex-1 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg">
                  添加（{{ addMemberSelected.length }}）
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ====== 添加学员到班级弹窗 ====== -->
      <Teleport to="body">
        <div v-if="showAddStudentToClassModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showAddStudentToClassModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">添加学员到班级</h3>
                <p class="text-xs text-gray-400 mt-0.5">目标班级：{{ addStudentToClassName }} · 仅显示已选课且不在此班级的学员</p>
              </div>
              <button @click="showAddStudentToClassModal = false" class="text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
            </div>
            <div class="space-y-3">
              <div class="relative">
                <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input v-model="addStudentToClassSearch" type="text" placeholder="搜索学员姓名或学号..."
                  class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" />
              </div>
              <div class="max-h-60 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1">
                <div v-for="stu in candidateAddStudentsToClass" :key="stu.id"
                  @click="toggleAddStudentToClass(stu.id)"
                  class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm"
                  :class="addStudentToClassSelected.includes(stu.id) ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50 text-gray-600'">
                  <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    :class="addStudentToClassSelected.includes(stu.id) ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'">
                    <span v-if="addStudentToClassSelected.includes(stu.id)" class="text-white text-[10px]">✓</span>
                  </div>
                  <span class="flex-1">{{ stu.name }}</span>
                  <span class="text-xs text-gray-400">{{ stu.studentId || stu.id }}</span>
                  <span class="text-[10px] text-gray-400">当前：{{ stu.className || '未分班' }}</span>
                </div>
                <div v-if="candidateAddStudentsToClass.length === 0" class="text-center py-6 text-xs text-gray-400">
                  没有可添加的学员
                </div>
              </div>
              <div class="flex gap-2 pt-2">
                <button @click="showAddStudentToClassModal = false" class="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button @click="confirmAddStudentsToClass" :disabled="addStudentToClassSelected.length === 0"
                  class="flex-1 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg">
                  添加（{{ addStudentToClassSelected.length }}）
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
      <Teleport to="body">
        <div v-if="showRemoveMemberModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showRemoveMemberModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">移除学员</h3>
              <button @click="showRemoveMemberModal = false" class="text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
            </div>
            <p class="text-sm text-gray-500 mb-4">请选择移除方式（学员：<span class="font-medium text-gray-700">{{ removeMemberStudentName }}</span>）</p>
            <div class="space-y-3">
              <button @click="confirmRemoveMemberFromGroup"
                class="w-full flex items-center gap-3 px-4 py-3 text-left bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors">
                <UserMinus class="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <p class="text-sm font-medium text-indigo-700">移出分组</p>
                  <p class="text-xs text-indigo-400">仅从当前分组移除，仍保留在班级中</p>
                </div>
              </button>
              <button @click="confirmRemoveMemberFromClass"
                class="w-full flex items-center gap-3 px-4 py-3 text-left bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors">
                <LogOut class="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p class="text-sm font-medium text-amber-700">移出班级</p>
                  <p class="text-xs text-amber-400">设为未分班，并从所有分组中移除</p>
                </div>
              </button>
              <button @click="confirmRemoveMemberFromCourse"
                class="w-full flex items-center gap-3 px-4 py-3 text-left bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors">
                <Trash2 class="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p class="text-sm font-medium text-red-700">移出本课程</p>
                  <p class="text-xs text-red-400">删除选课记录，不可恢复</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </Teleport>
      <!-- ====== 快捷加入分组弹窗 ====== -->
      <Teleport to="body">
        <div v-if="showQuickAddGroupModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showQuickAddGroupModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">加入分组</h3>
              <button @click="showQuickAddGroupModal = false" class="text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
            </div>
            <p class="text-sm text-gray-500 mb-4">为学员 <span class="font-medium text-gray-700">{{ quickAddGroupStudentName }}</span> 选择目标分组</p>
            <div v-if="quickAddGroupCandidates.length === 0" class="text-center py-6 text-sm text-gray-400">
              暂无可加入的分组（请确认该学员已分班，或所在班级下已建立分组）
            </div>
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <button v-for="g in quickAddGroupCandidates" :key="g.id" @click="quickAddGroupSelected = g.id"
                :class="['w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg border transition-colors', quickAddGroupSelected === g.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200 hover:bg-gray-50']">
                <div class="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-700">
                  {{ g.name.charAt(0) }}
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900">{{ g.name }}</p>
                  <p class="text-[11px] text-gray-400">{{ g.memberIds.length }} 名成员</p>
                </div>
                <CheckCircle v-if="quickAddGroupSelected === g.id" class="w-4 h-4 text-indigo-600" />
              </button>
            </div>
            <div class="mt-5 flex justify-end gap-2">
              <button @click="showQuickAddGroupModal = false" class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button :disabled="!quickAddGroupSelected" @click="confirmQuickAddToGroup"
                class="px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">确认加入</button>
            </div>
          </div>
        </div>
      </Teleport>
      <!-- ====== 快捷加入班级弹窗 ====== -->
      <Teleport to="body">
        <div v-if="showQuickAddClassModal" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showQuickAddClassModal = false" />
          <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">加入班级</h3>
              <button @click="showQuickAddClassModal = false" class="text-gray-400 hover:text-gray-600"><X class="w-5 h-5" /></button>
            </div>
            <p class="text-sm text-gray-500 mb-4">为学员 <span class="font-medium text-gray-700">{{ quickAddClassStudentName }}</span> 选择目标班级</p>
            <div v-if="quickAddClassCandidates.length === 0" class="text-center py-6 text-sm text-gray-400">
              暂无可加入的班级
            </div>
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <button v-for="cn in quickAddClassCandidates" :key="cn" @click="quickAddClassSelected = cn"
                :class="['w-full flex items-center gap-3 px-4 py-2.5 text-left rounded-lg border transition-colors', quickAddClassSelected === cn ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200 hover:bg-gray-50']">
                <div class="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center text-xs font-bold text-amber-700">
                  {{ cn.charAt(0) }}
                </div>
                <p class="flex-1 text-sm font-medium text-gray-900">{{ cn }}</p>
                <CheckCircle v-if="quickAddClassSelected === cn" class="w-4 h-4 text-amber-600" />
              </button>
            </div>
            <div class="mt-5 flex justify-end gap-2">
              <button @click="showQuickAddClassModal = false" class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button :disabled="!quickAddClassSelected" @click="confirmQuickAddToClass"
                class="px-3 py-1.5 text-sm text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">确认加入</button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- ===== 素质评价 Tab ===== -->

    <div v-if="activeTab === 'quality-eval'" class="space-y-6">
      <div class="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-xl p-5 border border-emerald-100">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UserCheck class="w-5 h-5 text-emerald-600" />
            <h2 class="font-semibold text-emerald-800 text-lg">素质评价管理</h2>
            <span v-if="isViewOnly" class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-500">仅查看</span>
          </div>
          <div class="text-xs text-emerald-700">
            已提交：{{ courseQualityEvaluations.length }} / {{ enrolledStudents.length }} 人
            <span class="mx-1">·</span>
            已批改：{{ courseQualityEvaluations.filter(q => q.submissions.some(s => s.score !== undefined)).length }} 人
          </div>
        </div>
        <p class="text-sm text-emerald-700 mt-2">
          查看学生提交的素质评价资料，上传后直接按打分加成到总成绩（满分 10 分加成）。
        </p>
      </div>

      <div v-if="courseQualityEvaluations.length === 0" class="bg-white rounded-xl p-12 border border-brand-400/20 text-center">
        <div class="w-16 h-16 rounded-full bg-brand-400/10 flex items-center justify-center mx-auto mb-4">
          <UserCheck class="w-8 h-8 text-brand-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">暂无学生提交</h3>
        <p class="text-sm text-gray-500">学生在课程学习页的「素质评价」Tab 中提交资料后，会在此处显示</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="qe in courseQualityEvaluations" :key="qe.id"
          class="bg-white rounded-xl border border-brand-400/20 shadow-sm p-5">
          <!-- 头部：学生信息 + 提交次数切换 -->
          <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold">
                {{ getQualityStudentName(qe.studentId)?.[0] || '?' }}
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ getQualityStudentName(qe.studentId) || '未知学生' }}</p>
                <p class="text-xs text-gray-400">学号：{{ qe.studentId }} · 共 {{ qe.submissions.length }} 次提交</p>
              </div>
            </div>
            <!-- 提交次数选择器（可对任意一次提交评分） -->
            <div class="flex items-center gap-1 flex-wrap" v-if="qe.submissions.length > 1">
              <span class="text-xs text-gray-400 mr-1">选择提交：</span>
              <button v-for="(sub, si) in qe.submissions" :key="sub.id"
                @click="qualitySelectedSubId[qe.id] = sub.id"
                :class="`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  (qualitySelectedSubId[qe.id] || qe.submissions[qe.submissions.length - 1].id) === sub.id
                    ? 'bg-blue-50 text-blue-600 border-blue-300 font-medium'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`">
                第{{ si + 1 }}次
                <span v-if="sub.score !== undefined" class="text-emerald-500 ml-0.5">✓</span>
              </button>
            </div>
            <div v-else class="px-3 py-1 rounded-full text-xs text-gray-400 bg-gray-50 border border-gray-200">
              第 1 次提交
            </div>
          </div>

          <!-- 当前选中的提交 -->
          <template v-if="getQualityCurrentSub(qe)">
            <!-- 成果说明 -->
            <div v-if="getQualityCurrentSub(qe).description" class="mb-3">
              <p class="text-xs text-gray-500 mb-1">成果说明</p>
              <p class="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border">{{ getQualityCurrentSub(qe).description }}</p>
            </div>

            <!-- 文件列表 -->
            <div class="mb-4">
              <p class="text-xs text-gray-500 mb-2">提交的资料（{{ getQualityCurrentSub(qe).files.length }} 个文件）</p>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <a v-for="(f, fi) in getQualityCurrentSub(qe).files" :key="fi" :href="f.dataUrl"
                  :download="f.fileName" target="_blank"
                  class="flex items-center gap-2 px-3 py-2 bg-brand-400/5 border border-brand-400/20 rounded text-sm text-brand-700 hover:bg-brand-400/10 transition-colors truncate">
                  <FileText class="w-4 h-4 flex-shrink-0" />
                  <span class="truncate">{{ f.fileName }}</span>
                  <span class="text-xs text-gray-400 flex-shrink-0">{{ (f.fileSize / 1024).toFixed(0) }}KB</span>
                </a>
              </div>
            </div>

            <!-- 教师评分区域 -->
            <div class="border-t border-brand-400/20 pt-4">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <span class="text-xs font-medium text-gray-600">该次提交状态：</span>
                <span v-if="getQualityCurrentSub(qe).score !== undefined"
                  class="px-3 py-1 rounded-full text-sm font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  已批改：{{ getQualityCurrentSub(qe).score }} 分
                </span>
                <span v-else class="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs border border-amber-200">
                  待批改
                </span>
              </div>
              <!-- 未批改：可编辑评分 -->
              <div v-if="!isViewOnly && getQualityCurrentSub(qe).score === undefined" class="flex items-center gap-3 flex-wrap mt-3">
                <label class="text-sm font-medium text-gray-700">评分 (0-100)：</label>
                <input type="number" min="0" max="100"
                  :value="getQualityCurrentSub(qe).score !== undefined ? getQualityCurrentSub(qe).score : ''"
                  @change="(e) => onQualityScoreChange(getQualityCurrentSub(qe).id, Number((e.target as HTMLInputElement).value))"
                  class="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                  placeholder="分数" />
                <span class="text-xs text-gray-400">（折算为最多 {{ gradeConfig.qualityEvalMaxBonus ?? 10 }} 分加成到总分）</span>
              </div>
              <!-- 已批改：分数只读 -->
              <div v-else-if="getQualityCurrentSub(qe).score !== undefined" class="flex items-center gap-3 flex-wrap mt-3">
                <label class="text-sm font-medium text-gray-700">评分：</label>
                <span class="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg border border-emerald-200">
                  {{ getQualityCurrentSub(qe).score }} 分
                </span>
                <span class="text-xs text-gray-400">（已保存，不可修改）</span>
              </div>
              <!-- 未批改：可编辑评语 + 保存 -->
              <div v-if="!isViewOnly && getQualityCurrentSub(qe).score === undefined" class="flex items-center gap-2 mt-2">
                <label class="text-xs text-gray-500">评语：</label>
                <input type="text"
                  :value="getQualityCurrentSub(qe).teacherComment || ''"
                  @change="(e) => onQualityCommentChange(getQualityCurrentSub(qe).id, (e.target as HTMLInputElement).value)"
                  class="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                  placeholder="可选的评语" />
                <button @click="saveQualityEval(qe.id, getQualityCurrentSub(qe).id)"
                  class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
                  保存批改
                </button>
              </div>
              <p v-if="getQualityCurrentSub(qe).teacherComment" class="text-xs text-gray-500 mt-2">评语：{{ getQualityCurrentSub(qe).teacherComment }}</p>
              <p v-if="getQualityCurrentSub(qe).gradedAt" class="text-xs text-gray-400 mt-2">批改时间：{{ getQualityCurrentSub(qe).gradedAt }}</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- GradeConfig 权重配置弹窗 -->
  <GradeConfig
    :course-id="courseId || ''"
    :open="showGradeConfig"
    :on-close="() => { showGradeConfig = false }"
  />

  <!-- 下载模板弹窗（已移除：模板下载固定按当前班级直接下载） -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import GradeConfig from '@/components/GradeConfig.vue'
import Slider from '@/components/GradeConfig/Slider.vue'
import Section from '@/components/GradeConfig/Section.vue'
import KnowledgeGraph from '@/components/knowledge/KnowledgeGraph.vue'
import {
  EvalTemplateLabels, EvalTemplateDescs, TEMPLATE_EVAL_TYPES,
  EvalTypeLabels, EvalTypeColors, EvalFrequencyLabels,
  EvalFrequencyDescs, getDefaultGradeConfig
} from '@/types'
import type { EvalTemplate, EvalType, Evaluation, EvalFrequency, Schedule, GradeWeightConfig, EvaluationConfig } from '@/types'
import { AlertTriangle, ChevronRight, Plus, Search, X, Pencil, Trash2, Calendar, Clock, ClipboardCheck, TrendingUp, Users, Upload, RefreshCw, Settings, ArrowLeft, Eye, Lock, EyeOff, CheckCircle, Save, FileSpreadsheet, BookOpen, BarChart3, UserCheck, FileText, UserPlus, UserMinus, LogOut, Network } from 'lucide-vue-next'
import { getNow } from '@/lib/date'
import {
  createEmptyEvalDraft,
  evalItemsFromDraft,
  getEvalItemDefinitions,
  makeEvalItemsForTotal,
  scoreFromEvalDraft,
  type EvalScoreDraftValue,
} from '@/lib/evalStandards'
import {
  bulkImportEnrollments,
  bulkImportGroups,
  bulkImportSchedules,
  bulkImportScores,
  fetchStudentsPool,
  fetchCourseClasses,
  createCourseClass,
  deleteCourseClass,
  fetchCourseStudents,
  fetchSchedules,
  updateStudent as syncStudent,
} from '@/api'
import * as echarts from 'echarts'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const courseId = computed(() => route.params.id as string)
const course = computed(() => {
  const item = store.courses.find((c) => c.id === courseId.value)
  if (!item) return undefined
  return {
    ...item,
    status: store.isCourseEnded(courseId.value) ? 'inactive' : 'active',
  }
})
const isCourseEnded = computed(() => store.isCourseEnded(courseId.value))
const isReadOnly = computed(() => isCourseEnded.value)
/** 导师模式：纯导师登录，或学院领导以导师身份进入 /mentor 路由（我的课程/详情均为导师视图） */
const isMentor = computed(() => store.currentRole === 'mentor' || route.path.startsWith('/mentor'))
/** 领导以教师身份进入 /teacher 路由（教师部分视图） */
const isLeaderTeacherRoute = computed(() => store.currentRole === 'leader' && route.path.startsWith('/teacher'))
/** 领导视图：学院领导身份进入 /leader 路由（领导段，只读查看） */
const isLeaderView = computed(() => store.currentRole === 'leader' && route.path.startsWith('/leader'))
/**
 * 是否仅查看：导师 / 领导段 / 非本课程授课教师只能查看老师录入的内容，
 * 不能修改课程配置、成绩、评价方案、学生管理等。导师仍可在评价管理中提交自己的导师评价。
 * 领导在教师段时：仅当课程为其专属授课课程时与普通教师一致（可完整管理），否则只读。
 */
const isViewOnly = computed(() => {
  if (isMentor.value || isLeaderView.value) return true
  const c = course.value
  if (isLeaderTeacherRoute.value) {
    return c ? !store.isLeaderTeacherCourse(store.currentUser || '', c.id) : true
  }
  return c ? c.teacher !== store.currentUser : false
})
/** 能否操作评价管理：授课教师可评教师评价，企业导师（含领导以导师身份进入）可提交自己的导师评价；领导/其他教师仅查看 */
const canManageEval = computed(() => !isViewOnly.value || isMentor.value)
/** 能否添加/管理课程项目：企业导师可以添加项目；领导/其他教师仅查看 */
const canManageProjects = computed(() => !isViewOnly.value || isMentor.value)
const kgStudents = computed(() => enrolledStudents.value.map((item: any) => item.student).filter(Boolean))

// 从数据库加载课程学员
onMounted(async () => {
  try {
    const scheduleResponse = await fetchSchedules({ courseId: courseId.value })
    const remoteSchedules = (scheduleResponse.schedules ?? []) as Schedule[]
    if (remoteSchedules.length > 0) {
      store.schedules = [
        ...store.schedules.filter((schedule) => schedule.courseId !== courseId.value),
        ...remoteSchedules,
      ]
    }
  } catch (error) {
    console.warn('同步课程排课失败，继续使用本地课程数据:', error)
  }

  try {
    const data = await fetchCourseStudents(courseId.value)
    const remoteStudents = Array.isArray(data.students) ? data.students : []
    if (remoteStudents.length > 0) {
      // 更新 store.students 为数据库数据
      for (const s of remoteStudents) {
        const existing = store.students.findIndex((x) => x.studentId === s.studentId)
        if (existing >= 0) {
          store.students[existing] = { ...store.students[existing], ...s }
        } else {
          store.students.push({ ...s, avatar: '', joinDate: '', enrollmentScore: 0 })
        }
      }
      // 同步 enrollments（避免重复）
      for (const s of remoteStudents) {
        const hasCurrentCourseEnrollment = store.enrollments.some(
          (e) => e.courseId === courseId.value && e.studentId === s.id && e.status !== 'dropped'
        )
        if (!hasCurrentCourseEnrollment) {
          store.enrollments.push({
            id: `enr-db-${s.id}-${courseId.value}`,
            studentId: s.id,
            courseId: courseId.value,
            scheduleId: '',
            enrollDate: '',
            progress: 0,
            status: 'enrolled',
          })
        }
      }
    }
  } catch (e) {
    console.error('加载课程学员失败:', e)
  }
  // 加载课程班级列表（含空班级）
  await loadCourseClasses()
  await store.syncCourseEvaluationState(courseId.value)
  ensureWrittenExams()
  normalizeProjectShares()
  syncProjectWeightLocksFromStore()
})

/** 默认均分：对未配置占比（全部为 0）的期中/期末项目按项目数平均分配，合计 100% */
function normalizeProjectShares() {
  if (!courseId.value) return
  const apply = (projects: { name: string; type: string }[]) => {
    const items = projects.map((p) => ({ name: p.name, type: p.type }))
    if (items.length === 0) return
    if (items.some((it) => store.getExamWeight(courseId.value || '', it.name, it.type) > 0)) return
    const eachShare = Math.floor(100 / items.length)
    items.forEach((it, i) =>
      store.setExamWeight(courseId.value!, it.name, i === items.length - 1 ? 100 - eachShare * (items.length - 1) : eachShare, it.type))
  }
  apply(midtermProjects.value)
  apply(finalProjects.value)
}

const courseSchedules = computed(() =>
  store.schedules.filter((s) => s.courseId === courseId.value)
)

const sortedCourseSchedules = computed(() =>
  [...courseSchedules.value].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
)

const schedulesWithStatus = computed(() => {
  const sorted = [...courseSchedules.value].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )
  // 以第一节课开课时间作为参考基准，学期前所有课程均显示为"待上课"
  const referenceDate = getNow()
  referenceDate.setHours(0, 0, 0, 0)
  const completed: (Schedule & { isCompleted: boolean; originalIndex: number })[] = []
  const upcoming: (Schedule & { isCompleted: boolean; originalIndex: number })[] = []
  sorted.forEach((sch, i) => {
    if (new Date(sch.endDate) < referenceDate) {
      completed.push({ ...sch, isCompleted: true, originalIndex: i })
    } else {
      upcoming.push({ ...sch, isCompleted: false, originalIndex: i })
    }
  })
  return [...upcoming, ...completed]
})

const completedCount = computed(() =>
  schedulesWithStatus.value.filter((s) => s.isCompleted).length
)

// ---- Tab 配置 ----
const tabList = [
  { key: 'students',     label: '学生管理', icon: Users },
  { key: 'course-mgmt',  label: '课程管理', icon: Network },
  { key: 'quality-eval', label: '素质评价', icon: UserCheck },
  { key: 'grade-config', label: '成绩配置', icon: Settings },
  { key: 'grade-entry',  label: '成绩管理', icon: TrendingUp },
]

/** Tab 红点提醒：检测该 tab 下未处理的事务数量，支持红点一路溯源 */
function tabBadgeCount(tabKey: string): number {
  if (!courseId.value) return 0
  const user = store.currentUser || ''
  if (tabKey === 'comments') {
    // 当前用户在该课程待完成的评价（教师→自己作为授课者收到的提醒，导师→自己作为导师收到的提醒）
    const myTargetId = store.currentRole === 'student'
      ? (store.students.find((s) => s.name === user)?.id ?? '')
      : user
    return store.evalReminders.filter(
      (r) => r.courseId === courseId.value && r.studentId === myTargetId && r.status !== 'completed'
    ).length
  }
  if (tabKey === 'quality-eval') {
    // 仅授课教师/领导专属授课可批改，其余角色（导师/领导只读段/非授课教师）不提醒
    if (isViewOnly.value) return 0
    return store.countPendingQualitySubmissions(courseId.value)
  }
  if (tabKey === 'grade-config') {
    if (isViewOnly.value || isReadOnly.value) return 0
    return store.isCourseConfigPending(courseId.value) ? 1 : 0
  }
  return 0
}

/** Tab 红点 tooltip：说明具体待处理事项，点击即可前往处理 */
function tabBadgeTitle(tabKey: string): string {
  if (tabKey === 'comments') {
    const n = tabBadgeCount('comments')
    return `有 ${n} 条未完成的评价，点击前往`
  }
  if (tabKey === 'quality-eval') {
    const n = tabBadgeCount('quality-eval')
    return `有 ${n} 份素质评价待批改，点击前往`
  }
  if (tabKey === 'grade-config') return '成绩权重/评价方案尚未配置完成，点击前往'
  return ''
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// ---- 常量 ----
const LEVEL_OPTIONS = [
  { label: 'A (优秀)', range: [90, 100], color: 'bg-brand-600/15 text-gray-800 border-brand-600' },
  { label: 'B (良好)', range: [80, 89],  color: 'bg-brand-600/15 text-gray-800 border-brand-600' },
  { label: 'C (中等)', range: [70, 79],  color: 'bg-brand-600/15 text-gray-800 border-brand-600' },
  { label: 'D (及格)', range: [60, 69],  color: 'bg-brand-600/15 text-gray-800 border-brand-600' },
]
const ALL_EVAL_TYPES: EvalType[] = ['self', 'intra_group', 'inter_group', 'teacher', 'mentor']
const EVAL_TEMPLATE_KEYS = Object.keys(EvalTemplateLabels) as EvalTemplate[]
const EVAL_FREQUENCY_KEYS = Object.keys(EvalFrequencyLabels) as EvalFrequency[]
const ExamTypeLabels: Record<string, string> = {
  midterm_exam: '期中考试',
  midterm_project: '期中项目',
  final_exam: '期末考试',
  final_project: '期末项目',
}

// ---- 配置锁定状态 ----
const evalConfigLocked = computed(() => {
  if (!courseId.value) return true
  return !store.isEvalConfigEditable(courseId.value)
})
const isWeightLocked = computed(() => {
  if (!courseId.value) return true
  return !store.isWeightConfigEditable(courseId.value)
})

// ---- 状态 ----
// 支持 ?tab=xxx 直达对应模块（用于红点溯源跳转）
const activeTab = ref<string>(
  tabList.some((t) => t.key === route.query.tab) ? (route.query.tab as string) : 'students'
)
const studentSearch = ref('')

// 路由 query 变化时切换 tab（红点溯源：同一页面内二次跳转）
watch(() => route.query.tab, (val) => {
  if (val && tabList.some((t) => t.key === val)) {
    activeTab.value = val as string
  }
})

// ---- 学生管理 ----
const selectedGroupId = ref<string | null>(null)
// 分组管理（新建/编辑）
const showGroupModal = ref(false)
const editingGroup = ref<import('@/types').StudentGroup | null>(null)
const groupFormName = ref('')
const groupFormMembers = ref<string[]>([])
const groupFormClassName = ref('')
// 编辑学生
const showEditStudentModal = ref(false)
const editingStudent = ref<import('@/types').Student | null>(null)
const editStudentName = ref('')
const editStudentIdField = ref('')
const editStudentClass = ref('')
const editStudentGroupId = ref('')
// 新增班级（含一键导入班级成员）
const showAddClass = ref(false)
const addClassForm = ref({ className: '', studentIds: [] as string[] })
const addClassExcelInput = ref<HTMLInputElement | null>(null)
const addClassFileName = ref('')
const addClassMembers = ref<{ name: string; studentId: string; existing: boolean }[]>([])

/** 打开新增班级弹窗，重置表单与导入数据 */
function openAddClassModal() {
  addClassForm.value = { className: '', studentIds: [] }
  addClassFileName.value = ''
  addClassMembers.value = []
  showAddClass.value = true
}

/** 清空已解析的班级成员 */
function clearAddClassMembers() {
  addClassFileName.value = ''
  addClassMembers.value = []
  if (addClassExcelInput.value) addClassExcelInput.value.value = ''
}

/** 解析新增班级弹窗中选择的 Excel，提取成员并标记是否已存在 */
async function handleAddClassExcel(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  addClassFileName.value = file.name
  try {
    const XLSX = await import('xlsx')
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    const members: { name: string; studentId: string; existing: boolean }[] = []
    for (const row of rows) {
      const stuName = (row['学生姓名'] || row['name'] || '').toString().trim()
      const stuId = (row['学生学号'] || row['studentId'] || '').toString().trim()
      if (!stuName && !stuId) continue
      const match = store.students.find(s =>
        (stuId && (s.studentId === stuId || s.id === stuId)) ||
        (stuName && s.name === stuName)
      )
      members.push({ name: stuName, studentId: stuId, existing: !!match })
    }
    addClassMembers.value = members
    if (members.length === 0) alert('未从文件中解析出有效成员，请检查表格列：学生姓名 / 学生学号')
  } catch (err) {
    console.error(err)
    alert('解析文件失败，请确认上传的是有效的 Excel/CSV 文件')
    addClassMembers.value = []
  }
  target.value = ''
}

/** 保存新增班级：创建班级并处理导入的成员（匹配/新建学生、分配班级、选课） */
async function saveAddClass() {
  const className = addClassForm.value.className.trim()
  if (!className || !courseId.value) return
  let assignedCount = 0
  let createdCount = 0
  const course = store.courses.find((c: any) => c.id === courseId.value)

  // 持久化班级记录（无论有无成员）
  try {
    await createCourseClass(courseId.value, className)
    if (!courseClassNames.value.includes(className)) {
      courseClassNames.value.push(className)
    }
  } catch {}

  for (const m of addClassMembers.value) {
    // 查找已有学生（按学号/ID 或姓名）
    let student = m.studentId
      ? store.students.find(s => s.id === m.studentId || s.studentId === m.studentId || (m.name && s.name === m.name))
      : (m.name ? store.students.find(s => s.name === m.name) : undefined)
    if (!student) {
      const id = m.studentId || `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      store.addStudent({
        id,
        name: m.name || m.studentId,
        phone: '',
        email: '',
        avatar: '',
        joinDate: getNow().toISOString().split('T')[0],
        status: 'active',
        studentId: m.studentId || undefined,
        className,
      })
      student = store.students.find(s => s.id === id)!
      createdCount++
    } else {
      store.updateStudent(student.id, { className })
      assignedCount++
    }
    // 选课（避免重复）
    const enrolled = store.enrollments.some(
      e => e.courseId === courseId.value && e.studentId === student!.id && e.status !== 'dropped'
    )
    if (!enrolled) {
      const enrId = `enr-${courseId.value}-${student!.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      store.addEnrollment({
        id: enrId,
        courseId: courseId.value,
        studentId: student!.id,
        scheduleId: '',
        status: 'enrolled',
        progress: 0,
        enrollDate: getNow().toISOString().split('T')[0],
      })
      try {
        await bulkImportEnrollments([{ id: enrId, studentId: student!.id, courseId: courseId.value }])
      } catch {}
    }
    try {
      await syncStudent(student!.id, { className })
    } catch {}
  }

  // 同步到课程管理：为该班级创建排课记录
  if (course && addClassMembers.value.length > 0) {
    try {
      await bulkImportSchedules([{
        courseId: courseId.value,
        title: course.title,
        teacher: course.teacher || '',
        className,
        room: '\u5f85\u5b9a',
        startDate: new Date().toISOString().split('T')[0],
        timeSlot: '09:00-11:00',
      }])
    } catch {}
  }
  const total = addClassMembers.value.length
  const msg = total > 0
    ? `已创建班级"${className}"，共处理 ${total} 名成员（匹配已有 ${assignedCount} 人，新建 ${createdCount} 人）`
    : `已创建班级"${className}"`
  addClassForm.value = { className: '', studentIds: [] }
  addClassFileName.value = ''
  addClassMembers.value = []
  showAddClass.value = false
  alert(msg)
}
// 从总库选择学生加入本课程
const showAddStudentModal = ref(false)
const repoSearchKeyword = ref('')
const repoSearchResults = ref<any[]>([])
const repoSearching = ref(false)
const repoAddMsg = ref('')
const repoAddMsgType = ref('')
let repoSearchTimer: ReturnType<typeof setTimeout> | null = null

function openAddStudentModal() {
  repoSearchKeyword.value = ''
  repoSearchResults.value = []
  repoAddMsg.value = ''
  showAddStudentModal.value = true
}

async function searchRepoStudents() {
  if (repoSearchTimer) clearTimeout(repoSearchTimer)
  const kw = repoSearchKeyword.value.trim()
  if (!kw) {
    repoSearchResults.value = []
    return
  }
  repoSearchTimer = setTimeout(async () => {
    repoSearching.value = true
    try {
      const data = await fetchStudentsPool(kw)
      repoSearchResults.value = data.students || []
    } catch {
      repoSearchResults.value = []
    } finally {
      repoSearching.value = false
    }
  }, 300)
}

async function addRepoStudentToCourse(s: any) {
  if (!courseId.value) return
  repoAddMsg.value = ''
  const studentId = s.ref_id || s.user_no || s.id
  // 补写学生到 store，否则未分班面板因 store.students.find 落空而不显示
  if (!store.students.some((st) => st.id === studentId)) {
    store.addStudent({
      id: studentId,
      name: s.name,
      phone: '',
      email: '',
      avatar: '',
      joinDate: getNow().toISOString().split('T')[0],
      status: 'active',
      studentId: s.user_no || studentId,
      className: '',
    })
  }
  // 检查是否已选本课程
  const exists = store.enrollments.some(
    (e) => e.courseId === courseId.value && e.studentId === studentId && e.status !== 'dropped'
  )
  if (exists) {
    repoAddMsg.value = `学生"${s.name}"已在本课程中，无需重复加入`
    repoAddMsgType.value = 'error'
    return
  }
  const enrId = `enr-${courseId.value}-${studentId}-${Date.now()}`
  store.addEnrollment({
    id: enrId,
    courseId: courseId.value,
    studentId,
    scheduleId: '',
    status: 'enrolled',
    progress: 0,
    enrollDate: getNow().toISOString().split('T')[0],
  })
  // 同步到 MySQL
  try {
    await bulkImportEnrollments([{ id: enrId, studentId, courseId: courseId.value }])
  } catch {}
  repoAddMsg.value = `已将"${s.name}"加入本课程`
  repoAddMsgType.value = 'success'
  repoSearchResults.value = repoSearchResults.value.filter((r) => r.id !== s.id)
}
// 编辑班级
const showEditClassModal = ref(false)
const editingOldClassName = ref('')
const editClassName = ref('')
function openEditClassModal(className: string) {
  editingOldClassName.value = className
  editClassName.value = className
  showEditClassModal.value = true
}
function handleSaveEditClass() {
  if (!editingOldClassName.value || !editClassName.value.trim()) return
  const newName = editClassName.value.trim()
  // 更新该班级所有学生的 className
  for (const stu of store.students) {
    if (stu.className === editingOldClassName.value) {
      store.updateStudent(stu.id, { className: newName })
    }
  }
  showEditClassModal.value = false
  alert(`班级"${editingOldClassName.value}"已重命名为"${newName}"`)
}
function handleDeleteClass(className: string) {
  if (!confirm(`确定删除班级"${className}"？该操作只会清空学生的班级信息，不会删除学生。`)) return
  for (const stu of store.students) {
    if (stu.className === className) {
      store.updateStudent(stu.id, { className: '' })
    }
  }
  // 同步删除课程班级记录
  try { void deleteCourseClass(courseId.value, className) } catch {}
  courseClassNames.value = courseClassNames.value.filter(n => n !== className)
}
// 一键分组
const showOneClickGroup = ref(false)
const oneClickGroupData = ref({ className: '', groupCount: 2 })

/** 当前选中班级的学生人数（也是最大组数） */
const oneClickMaxGroups = computed(() => {
  if (!oneClickGroupData.value.className) return 0
  return getClassStudentCount(oneClickGroupData.value.className)
})

/** 组数是否超过班级人数 */
const groupCountExceedsStudents = computed(() => {
  return oneClickMaxGroups.value > 0 && (oneClickGroupData.value.groupCount || 0) > oneClickMaxGroups.value
})

// 导入分组 ref + 目标班级
const groupClassExcelInput = ref<HTMLInputElement | null>(null)
const classNameForImport = ref('')

/** 在指定班级内导入分组（触发表格文件选择） */
function handleImportGroupsForClass(className: string) {
  classNameForImport.value = className
  groupClassExcelInput.value?.click()
}

// ---- 成绩管理 ----
const showNewExamModal = ref(false)
const showGradeConfig = ref(false)
/** 成绩配置——完整权重编辑器（直接展示在标签页内） */
const gradeConfig = ref<GradeWeightConfig>(getDefaultGradeConfig(courseId.value))
watch(() => courseId.value, (id) => {
  const cfg = store.getGradeConfig(id)
  gradeConfig.value = { ...cfg, qualityEvalMaxBonus: cfg.qualityEvalMaxBonus ?? 10 }
}, { immediate: true })
const updateGradeConfig = (key: keyof GradeWeightConfig, val: number) => {
  gradeConfig.value = { ...gradeConfig.value, [key]: Math.max(0, Math.min(100, val || 0)) }
}

const evalTypeWeightKeyMap: Record<EvalType, keyof GradeWeightConfig> = {
  self: 'selfEvalWeight',
  intra_group: 'peerReviewWeight',
  inter_group: 'interGroupEvalWeight',
  teacher: 'teacherScoreWeight',
  mentor: 'mentorScoreWeight',
}

function isEvalTypeEnabled(type: EvalType) {
  return TEMPLATE_EVAL_TYPES[activeEvalConfig.value.template].includes(type)
}

function normalizeGradeConfigForTemplate() {
  const zeroed: Partial<GradeWeightConfig> = {}
  for (const type of ALL_EVAL_TYPES) {
    if (!isEvalTypeEnabled(type)) zeroed[evalTypeWeightKeyMap[type]] = 0
  }
  gradeConfig.value = { ...gradeConfig.value, ...zeroed }
}

watch(activeTab, (tab) => {
  if (tab === 'grade-config') normalizeGradeConfigForTemplate()
  if (tab === 'students') void loadCourseClasses()
})
/** 素质评价加成上限（0-20分） */
const updateQualityMaxBonus = (val: number) => {
  const v = Number.isFinite(val) ? Math.round(val) : 0
  gradeConfig.value = { ...gradeConfig.value, qualityEvalMaxBonus: Math.max(0, Math.min(20, v)) }
}
const mainTotal = computed(() => gradeConfig.value.regularWeight + gradeConfig.value.midtermWeight + gradeConfig.value.finalWeight)
const regularTotal = computed(() => gradeConfig.value.selfEvalWeight + gradeConfig.value.peerReviewWeight + gradeConfig.value.interGroupEvalWeight + gradeConfig.value.teacherScoreWeight + gradeConfig.value.mentorScoreWeight)
const midtermSubTotal = computed(() => gradeConfig.value.midtermExamWeight + gradeConfig.value.midtermProjectWeight)
const finalSubTotal = computed(() => gradeConfig.value.finalExamWeight + gradeConfig.value.finalProjectWeight)
function handleSaveGradeConfig() {
  if (!courseId.value) return
  normalizeGradeConfigForTemplate()
  store.saveGradeConfig({ ...gradeConfig.value, courseId: courseId.value })
  store.markConfigCompleted(courseId.value, 'weights')
}
const newExamName = ref('')
const newExamFullScore = ref(100)
const newExamType = ref<'midterm_project' | 'final_project'>('midterm_project')
const selectedExam = ref('')
type ExamType = 'midterm_exam' | 'midterm_project' | 'final_exam' | 'final_project' | 'quiz' | 'assignment'
const selectedExamType = ref<ExamType | ''>('')
const gradeSearch = ref('')
const gradeEntrySearch = ref('')
const examInputs = ref<Record<string, number>>({})
const selectedStudentIds = ref<string[]>([])
const evalScoreInputs = ref<Record<string, number>>({})
const evalCriteriaDrafts = ref<Record<string, EvalScoreDraftValue[]>>({})
const evalCriteriaDraft = ref<EvalScoreDraftValue[]>([])
const evalCriteriaError = ref('')
const showEvalCriteriaPopup = ref(false)
const evalCriteriaStudentId = ref('')
const evalCriteriaStudentName = ref('')
const evalStudentSearch = ref('')
const selectedBatchSession = ref(1)

const evalCriteriaType = computed<EvalType>(() => (isMentor.value ? 'mentor' : 'teacher'))
const evalCriteriaTotal = computed(() =>
  scoreFromEvalDraft(getEvalItemDefinitions(evalCriteriaType.value), evalCriteriaDraft.value)
)

// 评价管理过滤
const evalFilterClass = ref('')
const evalFilterGroup = ref('')
const showEvalPopup = ref(false)
const selectedEvalClass = ref('')

// 成绩管理过滤
const gradeFilterClass = ref('')
const gradeFilterGroup = ref('')
const showGradePopup = ref(false)
const selectedGradeClass = ref('')
const gradePopupSearch = ref('')

// 项目占比锁定状态：每个项目独立控制锁定/解锁
const lockedWeightProjects = ref<Set<string>>(new Set())

// 板块级锁定状态（期中/期末项目整体锁定）
const midtermProjectLocked = ref(false)
const finalProjectLocked = ref(false)

function isProjectWeightLocked(examName: string): boolean {
  return lockedWeightProjects.value.has(examName)
}

function toggleProjectWeight(examName: string) {
  if (lockedWeightProjects.value.has(examName)) {
    lockedWeightProjects.value.delete(examName)
  } else {
    lockedWeightProjects.value.add(examName)
  }
}

function canLockProjectWeight(type: string): boolean {
  if (type === 'midterm') return midtermProjectTotalShare.value === 100
  if (type === 'final') return finalProjectTotalShare.value === 100
  return false
}

function lockProjectWeight(examName: string) {
  lockedWeightProjects.value.add(examName)
}

function unlockProjectWeight(examName: string) {
  lockedWeightProjects.value.delete(examName)
}

// 板块级锁定/解锁：锁定后该板块所有项目占比不可修改（状态持久化，刷新不丢失）
function toggleMidtermProjectLock() {
  if (midtermProjectLocked.value) {
    midtermProjectLocked.value = false
    midtermProjects.value.forEach((e) => unlockProjectWeight(e.name))
  } else {
    if (canLockProjectWeight('midterm')) {
      midtermProjectLocked.value = true
      midtermProjects.value.forEach((e) => lockProjectWeight(e.name))
    }
  }
  if (courseId.value) store.setProjectWeightLock(courseId.value, 'midterm', midtermProjectLocked.value)
}

function toggleFinalProjectLock() {
  if (finalProjectLocked.value) {
    finalProjectLocked.value = false
    finalProjects.value.forEach((e) => unlockProjectWeight(e.name))
  } else {
    if (canLockProjectWeight('final')) {
      finalProjectLocked.value = true
      finalProjects.value.forEach((e) => lockProjectWeight(e.name))
    }
  }
  if (courseId.value) store.setProjectWeightLock(courseId.value, 'final', finalProjectLocked.value)
}

/** 页面加载时根据占比合计自动设置期中/期末项目占比锁定状态 */
function syncProjectWeightLocksFromStore() {
  if (!courseId.value) return
  // 自动锁定逻辑：多项且占比合计 = 100% 时锁定，否则解锁
  const midLock = midtermProjects.value.length > 1 && midtermProjectTotalShare.value === 100
  const finalLock = finalProjects.value.length > 1 && finalProjectTotalShare.value === 100
  midtermProjectLocked.value = midLock
  finalProjectLocked.value = finalLock
  store.setProjectWeightLock(courseId.value, 'midterm', midLock)
  store.setProjectWeightLock(courseId.value, 'final', finalLock)
  const lockedNames = new Set<string>()
  if (midLock) midtermProjects.value.forEach((e) => lockedNames.add(e.name))
  if (finalLock) finalProjects.value.forEach((e) => lockedNames.add(e.name))
  lockedWeightProjects.value = lockedNames
}

// 切换课程时重新同步锁定状态：路由复用组件不会触发 onMounted，
// 若不重新同步，会沿用上一门课程的锁定状态，导致已锁定课程的占比被误判为未锁定而重新均分。
// 首次挂载的同步由 onMounted 中的 syncProjectWeightLocksFromStore() 完成，故此处不加 immediate（避免 setup 阶段访问后置声明的 computed 触发 TDZ）
watch(() => courseId.value, () => {
  syncProjectWeightLocksFromStore()
})

// 成绩查询图表引用
const midtermChartRef = ref<HTMLDivElement | null>(null)
const finalChartRef = ref<HTMLDivElement | null>(null)
let midtermChart: echarts.ECharts | null = null
let finalChart: echarts.ECharts | null = null

const hasGradeData = computed(() => {
  if (!courseId.value) return false
  const scores = store.getExamScoresForCourse(courseId.value)
  return scores.some((s) => s.score !== undefined && s.score !== null && s.score > 0)
})

const selectedConfig = computed(() => courseId.value ? store.evalConfigs.find((c) => c.courseId === courseId.value) : null)
/** 当前生效的评价方案（未配置时回退到系统默认方案：简易评价+每2周一次） */
const activeEvalConfig = computed<EvaluationConfig>(() => {
  if (selectedConfig.value) return selectedConfig.value
  return {
    courseId: courseId.value || '',
    template: 'simple',
    frequency: 'biweekly',
    hasMentor: false,
    overdueRule: 'average',
  }
})
const baseEnabledTypes = computed<EvalType[]>(() => selectedConfig.value ? TEMPLATE_EVAL_TYPES[selectedConfig.value.template] : [])
const totalSessions = computed(() => courseId.value ? store.getEvalSessions(courseId.value) : 1)
const courseHasGroups = computed(() => courseId.value ? store.hasGroups(courseId.value) : false)

// ---- 评价管理 ----
const evalTableSections = computed(() => {
  if (!courseId.value) return []
  const session = selectedBatchSession.value
  const search = evalStudentSearch.value.trim().toLowerCase()

  const enrolled = store.enrollments
    .filter((e) => e.courseId === courseId.value && e.status !== 'dropped')
    .map((e) => store.students.find((s) => s.id === e.studentId))
    .filter(Boolean) as NonNullable<ReturnType<typeof store.students.find>>[]

  const filtered = search
    ? enrolled.filter((s) => s.name.toLowerCase().includes(search))
    : enrolled

  const groups = store.studentGroups.filter((g) => g.courseId === courseId.value)
  const memberToGroup = new Map<string, string>()
  for (const g of groups) {
    for (const mid of g.memberIds) {
      memberToGroup.set(mid, g.name)
    }
  }

  function buildRow(student: typeof filtered[number]) {
    const evals = store.evaluations.filter(
      (e) => e.courseId === courseId.value && e.studentId === student.id && e.sessionNumber === session
    )
    const getScore = (type: EvalType) => {
      const found = evals.filter((e) => e.type === type)
      if (found.length === 0) return null
      return Math.round(found.reduce((a, e) => a + e.score, 0) / found.length)
    }
    const evalTypeForMentor: EvalType = 'mentor'
    const submitted = store.isSessionLocked(courseId.value || '', session) ||
      store.isTeacherEvalSubmitted(courseId.value || '', student.id, session, isMentor.value ? evalTypeForMentor : 'teacher')
    const draftEvals = evals.filter((e) => e.type === (isMentor.value ? evalTypeForMentor : 'teacher'))
    return {
      student,
      selfScore: getScore('self'),
      intraScore: getScore('intra_group'),
      interScore: getScore('inter_group'),
      teacherScore: getScore('teacher'),
      mentorScore: getScore('mentor'),
      submitted,
      hasDraft: !submitted && draftEvals.length > 0,
      finalScore: store.getSubmittedTeacherScore(courseId.value || '', student.id, session, isMentor.value ? evalTypeForMentor : 'teacher') ?? '-',
    }
  }

  // 先按班级分组，再按分组组织
  const classMap = new Map<string, typeof filtered>()
  for (const s of filtered) {
    const cn = s.className || '未分班'
    if (!classMap.has(cn)) classMap.set(cn, [])
    classMap.get(cn)!.push(s)
  }

  const sections: { className: string; groups: { groupName: string; students: ReturnType<typeof buildRow>[] }[] }[] = []
  for (const [className, students] of classMap) {
    const groupedMap = new Map<string, typeof filtered>()
    const ungrouped: typeof filtered = []
    for (const s of students) {
      const groupName = memberToGroup.get(s.id)
      if (groupName) {
        if (!groupedMap.has(groupName)) groupedMap.set(groupName, [])
        groupedMap.get(groupName)!.push(s)
      } else {
        ungrouped.push(s)
      }
    }
    const groupsArr: { groupName: string; students: ReturnType<typeof buildRow>[] }[] = []
    for (const [name, members] of groupedMap) {
      groupsArr.push({ groupName: name, students: members.map(buildRow) })
    }
    if (ungrouped.length > 0) {
      groupsArr.push({ groupName: '未分组', students: ungrouped.map(buildRow) })
    }
    sections.push({ className, groups: groupsArr })
  }
  return sections
})

/** 当前选中的评价班级数据（用于弹窗）— 使用 filteredEvalTableSections 保持过滤一致性 */
const currentEvalClassSection = computed(() => {
  if (!selectedEvalClass.value) return null
  return filteredEvalTableSections.value.find(cb => cb.className === selectedEvalClass.value) || null
})

/** 评价管理 - 班级选项 */
const evalClassOptions = computed(() => {
  const names = new Set(evalTableSections.value.map(s => s.className))
  return Array.from(names).map(n => ({ label: n, value: n }))
})

/** 评价管理 - 分组选项（基于当前选中的班级） */
const evalGroupOptions = computed(() => {
  if (!evalFilterClass.value) return []
  const section = evalTableSections.value.find(s => s.className === evalFilterClass.value)
  if (!section) return []
  return section.groups.map(g => ({ label: g.groupName, value: g.groupName }))
})

/** 评价管理 - 过滤后的数据 */
const filteredEvalTableSections = computed(() => {
  let sections = evalTableSections.value
  if (evalFilterClass.value) {
    sections = sections.filter(s => s.className === evalFilterClass.value)
  }
  if (evalFilterGroup.value) {
    sections = sections.map(s => ({
      ...s,
      groups: s.groups.filter(g => g.groupName === evalFilterGroup.value)
    })).filter(s => s.groups.length > 0)
  }
  return sections
})

const hasEvalInputs = computed(() => Object.keys(evalScoreInputs.value).length > 0)

function isGroupSelected(gi: number): boolean {
  const group = currentEvalClassSection.value?.groups[gi]
  if (!group) return false
  const all = group.students.filter(s => !s.submitted).map(s => s.student.id)
  return all.length > 0 && all.every(id => selectedStudentIds.value.includes(id))
}

const isAllClassSelected = computed(() => {
  const all = currentEvalClassSection.value
    ? currentEvalClassSection.value.groups.flatMap(g => g.students).filter(s => !s.submitted).map(s => s.student.id)
    : []
  return all.length > 0 && all.every(id => selectedStudentIds.value.includes(id))
})

// ---- 成绩管理 computed ----
const examNames = computed(() => {
  if (!courseId.value) return []
  return store.getExamNames(courseId.value)
})

/** 成绩录入 - 按类型分组的考试/项目 */
const examsWithTypes = computed(() => {
  if (!courseId.value) return [] as { name: string; type: ExamType }[]
  const scores = store.getExamScoresForCourse(courseId.value)
  const map = new Map<string, { name: string; type: ExamType }>()
  for (const s of scores) {
    // 用 名称+类型 作为唯一键，避免跨类型同名（如期中项目/期末项目同名）被吞掉
    const key = `${s.examName}@@${s.type}`
    if (!map.has(key)) {
      map.set(key, { name: s.examName, type: s.type })
    }
  }
  return Array.from(map.values())
})
const midtermProjects = computed(() => examsWithTypes.value.filter(e => e.type === 'midterm_project'))
const midtermExams = computed(() => examsWithTypes.value.filter(e => e.type === 'midterm_exam'))
const finalProjects = computed(() => examsWithTypes.value.filter(e => e.type === 'final_project'))
const finalExams = computed(() => examsWithTypes.value.filter(e => e.type === 'final_exam'))

/** 期中/期末项目占比合计（各项目占比之和，便于配置校验） */
const midtermProjectTotalShare = computed(() =>
  courseId.value ? midtermProjects.value.reduce((a, e) => a + store.getExamWeight(courseId.value || '', e.name, e.type), 0) : 0)
const finalProjectTotalShare = computed(() =>
  courseId.value ? finalProjects.value.reduce((a, e) => a + store.getExamWeight(courseId.value || '', e.name, e.type), 0) : 0)

/** 占比合计是否为 100%（不为 100% 时禁止录入项目成绩） */
const midtermProjectShareReady = computed(() => midtermProjects.value.length === 0 || midtermProjectTotalShare.value === 100)
const finalProjectShareReady = computed(() => finalProjects.value.length === 0 || finalProjectTotalShare.value === 100)

// 自动锁定/解锁：占比合计达到 100% 时自动锁定，偏离 100% 时自动解锁
watch(midtermProjectTotalShare, (val) => {
  if (!courseId.value || midtermProjects.value.length <= 1) return
  const shouldLock = val === 100
  midtermProjectLocked.value = shouldLock
  midtermProjects.value.forEach((e) => shouldLock ? lockProjectWeight(e.name) : unlockProjectWeight(e.name))
  store.setProjectWeightLock(courseId.value, 'midterm', shouldLock)
})
watch(finalProjectTotalShare, (val) => {
  if (!courseId.value || finalProjects.value.length <= 1) return
  const shouldLock = val === 100
  finalProjectLocked.value = shouldLock
  finalProjects.value.forEach((e) => shouldLock ? lockProjectWeight(e.name) : unlockProjectWeight(e.name))
  store.setProjectWeightLock(courseId.value, 'final', shouldLock)
})

function getTypeWeightLabel(type: string): string {
  if (!courseId.value) return '-'
  const cfg = store.getGradeConfig(courseId.value)
  if (type === 'midterm_exam' || type === 'midterm_project') {
    return `${cfg.midtermWeight}%`
  }
  if (type === 'final_exam' || type === 'final_project') {
    return `${cfg.finalWeight}%`
  }
  return `${cfg.regularWeight}%`
}

const currentExamFullScore = computed(() => {
  if (!courseId.value || !selectedExam.value) return 100
  const scores = store.getExamScoresForCourse(courseId.value, selectedExam.value)
  return scores.length > 0 ? scores[0].fullScore : 100
})

const currentExamWeight = computed(() => {
  if (!courseId.value || !selectedExam.value) return 0
  return store.getExamWeight(courseId.value, selectedExam.value, selectedExamType.value || undefined)
})

const filteredGradeStudents = computed(() => {
  if (!selectedExam.value) return []
  let list = enrolledStudents.value
  if (gradeSearch.value.trim()) {
    const q = gradeSearch.value.trim().toLowerCase()
    list = list.filter(({ student }) =>
      student && (student.name.toLowerCase().includes(q) || student.id.toLowerCase().includes(q))
    )
  }
  return list
})

const gradeClassBlocks = computed(() => {
  if (!courseId.value || !selectedExam.value) return []
  const search = gradeSearch.value.trim().toLowerCase()
  let list = enrolledStudents.value
  if (search) {
    list = list.filter(({ student }) =>
      student && (student.name.toLowerCase().includes(search) || student.id.toLowerCase().includes(search))
    )
  }

  // 按班级分组
  const classMap = new Map<string, typeof list>()
  for (const item of list) {
    if (!item.student) continue
    const cn = item.student.className || '未分班'
    if (!classMap.has(cn)) classMap.set(cn, [])
    classMap.get(cn)!.push(item)
  }

  // 按分组组织
  const result: { className: string; groups: { groupName: string; items: typeof list }[] }[] = []
  const groups = store.studentGroups.filter(g => g.courseId === courseId.value)

  for (const [className, data] of classMap) {
    const memberToGroup = new Map<string, string>()
    for (const g of groups) {
      for (const mid of g.memberIds) {
        const student = store.students.find(s => s.id === mid)
        if (student && (student.className || '未分班') === className) {
          memberToGroup.set(mid, g.name)
        }
      }
    }
    
    const groupedMap = new Map<string, typeof list>()
    const ungrouped: typeof list = []
    for (const item of data) {
      const groupName = memberToGroup.get(item.student!.id)
      if (groupName) {
        if (!groupedMap.has(groupName)) groupedMap.set(groupName, [])
        groupedMap.get(groupName)!.push(item)
      } else {
        ungrouped.push(item)
      }
    }
    
    const groupsArr: { groupName: string; items: typeof list }[] = []
    for (const [name, members] of groupedMap) {
      groupsArr.push({ groupName: name, items: members })
    }
    if (ungrouped.length > 0) {
      groupsArr.push({ groupName: '未分组', items: ungrouped })
    }
    
    result.push({ className, groups: groupsArr })
  }
  return result
})

/** 成绩管理 - 班级选项 */
const gradeClassOptions = computed(() => {
  const names = new Set(gradeClassBlocks.value.map(s => s.className))
  return Array.from(names).map(n => ({ label: n, value: n }))
})

/** 成绩管理 - 分组选项（基于当前选中的班级） */
const gradeGroupOptions = computed(() => {
  if (!gradeFilterClass.value) return []
  const block = gradeClassBlocks.value.find(s => s.className === gradeFilterClass.value)
  if (!block) return []
  return block.groups.map(g => ({ label: g.groupName, value: g.groupName }))
})

/** 成绩管理 - 过滤后的数据 */
const filteredGradeClassBlocks = computed(() => {
  let blocks = gradeClassBlocks.value
  if (gradeFilterClass.value) {
    blocks = blocks.filter(s => s.className === gradeFilterClass.value)
  }
  if (gradeFilterGroup.value) {
    blocks = blocks.map(s => ({
      ...s,
      groups: s.groups.filter(g => g.groupName === gradeFilterGroup.value)
    })).filter(s => s.groups.length > 0)
  }
  // 按学生姓名/学号搜索：仅展示包含匹配学生的班级
  if (gradeEntrySearch.value.trim()) {
    const q = gradeEntrySearch.value.trim().toLowerCase()
    blocks = blocks.filter(b => b.groups.some(g => g.items.some(({ student }) =>
      student && (student.name.toLowerCase().includes(q) || student.id.toLowerCase().includes(q) || (student.studentId && student.studentId.toLowerCase().includes(q)))
    )))
  }
  return blocks
})

/** 当前选中的成绩班级数据（用于弹窗）— 使用 filteredGradeClassBlocks 保持过滤一致性 */
const currentGradeClassSection = computed(() => {
  if (!selectedGradeClass.value) return null
  return filteredGradeClassBlocks.value.find(cb => cb.className === selectedGradeClass.value) || null
})

/** 弹窗内按搜索过滤后的分组数据 */
const filteredGradePopupGroups = computed(() => {
  const section = currentGradeClassSection.value
  if (!section) return []
  const search = gradePopupSearch.value.trim().toLowerCase()
  if (!search) return section.groups
  return section.groups.map(g => ({
    ...g,
    items: g.items.filter(({ student }) =>
      student && (student.name.toLowerCase().includes(search) || student.id.toLowerCase().includes(search) || (student.studentId && student.studentId.toLowerCase().includes(search)))
    )
  })).filter(g => g.items.length > 0)
})

/** 弹窗内当前班级的所有学生 ID */
const currentGradeClassStudentIds = computed(() => {
  const section = currentGradeClassSection.value
  if (!section) return new Set<string>()
  const ids = new Set<string>()
  for (const group of section.groups) {
    for (const item of group.items) {
      if (item.student) ids.add(item.student.id)
    }
  }
  return ids
})

const hasExamInputs = computed(() => {
  // 弹窗打开时只检查当前班级的输入
  if (selectedGradeClass.value) {
    const ids = currentGradeClassStudentIds.value
    return Object.keys(examInputs.value).some(id => ids.has(id))
  }
  return Object.keys(examInputs.value).length > 0
})

const submittedExamCount = computed(() => {
  if (!courseId.value || !selectedExam.value) return 0
  const all = store.getExamScoresForCourse(courseId.value, selectedExam.value).filter((s) => s.status === 'submitted')
  // 弹窗打开时只统计当前班级
  if (selectedGradeClass.value) {
    const ids = currentGradeClassStudentIds.value
    return all.filter(s => ids.has(s.studentId)).length
  }
  return all.length
})

const pendingExamSubmits = computed(() => {
  if (!courseId.value || !selectedExam.value) return 0
  const target = selectedGradeClass.value
    ? filteredGradeStudents.value.filter(({ student }) => student && currentGradeClassStudentIds.value.has(student.id))
    : filteredGradeStudents.value
  return target.filter(({ student }) => {
    if (!student) return false
    const score = store.getExamScoresForCourse(courseId.value, selectedExam.value)
      .find((s) => s.studentId === student.id)
    return score && score.status === 'draft'
  }).length
})

function getStudentExamScore(studentId: string): number | null {
  if (!courseId.value || !selectedExam.value) return null
  const score = store.getExamScoresForCourse(courseId.value, selectedExam.value)
    .find((s) => s.studentId === studentId)
  return score?.score ?? null
}

function isExamSubmitted(studentId: string): boolean {
  if (!courseId.value || !selectedExam.value) return false
  const score = store.getExamScoresForCourse(courseId.value, selectedExam.value)
    .find((s) => s.studentId === studentId)
  return score?.status === 'submitted'
}

function getStudentExamPercent(studentId: string): string {
  if (!courseId.value || !selectedExam.value) return '-'
  const score = store.getExamScoresForCourse(courseId.value, selectedExam.value)
    .find((s) => s.studentId === studentId)
  if (!score) return '-'
  return `${Math.round((score.score / score.fullScore) * 100)}分`
}

function getExamWeightFromConfig(examName: string, type?: string): number {
  if (!courseId.value) return 0
  return store.getExamWeight(courseId.value, examName, type)
}

function handleSelectExam(name: string, type: ExamType) {
  if (!courseId.value) return
  selectedExam.value = name
  selectedExamType.value = type
}

// ---- 成绩分布图表逻辑 ----
function getGradeDistribution(type: 'midterm' | 'final'): { ranges: string[]; counts: number[] } {
  if (!courseId.value) return { ranges: [], counts: [] }
  const scores = store.getExamScoresForCourse(courseId.value)
  const typePrefix = type === 'midterm' ? 'midterm' : 'final'
  const typeScores = scores
    .filter((s) => s.type && s.type.startsWith(typePrefix) && s.score !== undefined && s.score !== null && s.score > 0)
    .map((s) => s.score as number)
  if (typeScores.length === 0) return { ranges: [], counts: [] }

  const ranges = ['0-59', '60-69', '70-79', '80-89', '90-100']
  const counts = [0, 0, 0, 0, 0]
  typeScores.forEach((score) => {
    const pct = Math.min(100, Math.max(0, score))
    if (pct < 60) counts[0]++
    else if (pct < 70) counts[1]++
    else if (pct < 80) counts[2]++
    else if (pct < 90) counts[3]++
    else counts[4]++
  })
  return { ranges, counts }
}

function renderMidtermChart() {
  if (!midtermChartRef.value) return
  if (!midtermChart) {
    midtermChart = echarts.init(midtermChartRef.value)
  }
  const { ranges, counts } = getGradeDistribution('midterm')
  if (counts.length === 0) { midtermChart?.clear(); return }
  midtermChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: ranges, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar',
      data: counts,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#6366f1' },
          { offset: 1, color: '#818cf8' }
        ])
      },
      barWidth: '50%',
      label: { show: true, position: 'top', fontSize: 11, color: '#6b7280' }
    }]
  })
}

function renderFinalChart() {
  if (!finalChartRef.value) return
  if (!finalChart) {
    finalChart = echarts.init(finalChartRef.value)
  }
  const { ranges, counts } = getGradeDistribution('final')
  if (counts.length === 0) { finalChart?.clear(); return }
  finalChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: ranges, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar',
      data: counts,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#f59e0b' },
          { offset: 1, color: '#fbbf24' }
        ])
      },
      barWidth: '50%',
      label: { show: true, position: 'top', fontSize: 11, color: '#6b7280' }
    }]
  })
}

function renderGradeCharts() {
  nextTick(() => {
    renderMidtermChart()
    renderFinalChart()
  })
}

// 监听成绩数据变化，刷新图表
watch(() => store.getExamScoresForCourse(courseId.value || ''), () => {
  renderGradeCharts()
}, { deep: true })

watch(activeTab, (tab) => {
  if (tab === 'grade-entry') {
    renderGradeCharts()
  }
})

watch(midtermChartRef, (el) => {
  if (el && activeTab.value === 'grade-entry') renderGradeCharts()
})
watch(finalChartRef, (el) => {
  if (el && activeTab.value === 'grade-entry') renderGradeCharts()
})

function handleAddExam() {
  if (!courseId.value || !newExamName.value.trim()) return
  const name = newExamName.value.trim()
  const type = newExamType.value

  // 同类型下重名检查，避免重复创建同名项目/考试
  const sameTypeNames = new Set(
    store.getExamScoresForCourse(courseId.value)
      .filter((s) => s.type === type)
      .map((s) => s.examName)
  )
  if (sameTypeNames.has(name)) {
    const typeLabel = type === 'midterm_project' ? '期中项目' : type === 'final_project' ? '期末项目' : '考试'
    alert(`已存在名为「${name}」的${typeLabel}，请更换名称`)
    return
  }

  // 课程无学生时无法创建成绩记录
  if (enrolledStudents.value.length === 0) {
    alert('该课程暂无学生，无法添加项目')
    return
  }

  for (const { student } of enrolledStudents.value) {
    if (!student) continue
    const id = `exam-${courseId.value}-${student.id}-${name}-${Date.now()}`
    store.addExamScore({
      id,
      courseId: courseId.value,
      studentId: student.id,
      examName: name,
      score: 0,
      fullScore: newExamFullScore.value,
      weight: 0,
      type,
      status: 'draft',
      createdAt: getNow().toISOString().split('T')[0],
      gradedAt: '',
    })
  }

  if (type === 'midterm_project' || type === 'final_project') {
    const sameTypeExams = store.getExamScoresForCourse(courseId.value)
      .filter((s) => s.type === type)
    const uniqueNames = Array.from(new Set(sameTypeExams.map((s) => s.examName)))

    // 添加项目后该类项目占比始终刷新为均分 100%（末项取余数保证合计）；
    // 占比合计变为 100% 后由 watcher 自动上锁
    const eachShare = Math.floor(100 / uniqueNames.length)
    uniqueNames.forEach((examName, i) =>
      store.setExamWeight(courseId.value!, examName, i === uniqueNames.length - 1 ? 100 - eachShare * (uniqueNames.length - 1) : eachShare, type))
  }

  showNewExamModal.value = false
  selectedExam.value = name
  selectedExamType.value = type
  newExamName.value = ''

}

/** 确保期中和期末的笔试成绩默认存在（自动创建，无需手动添加） */
function ensureWrittenExams() {
  if (!courseId.value) return
  const students = enrolledStudents.value
  if (students.length === 0) return

  // 先清理重复数据，再将非标准笔试名称统一
  store.deduplicateExamScores(courseId.value)
  store.normalizeWrittenExamNames(courseId.value)

  const existingScores = store.getExamScoresForCourse(courseId.value)
  const now = getNow().toISOString().split('T')[0]

  // 期中考试（按类型检查，已有则不再创建）
  const hasMidterm = existingScores.some((s) => s.type === 'midterm_exam')
  if (!hasMidterm) {
    for (const { student } of students) {
      if (!student) continue
      const id = `exam-${courseId.value}-${student.id}-期中考试-${Date.now()}`
      store.addExamScore({
        id,
        courseId: courseId.value,
        studentId: student.id,
        examName: '期中考试',
        score: 0,
        fullScore: 100,
        weight: 0,
        type: 'midterm_exam',
        status: 'draft',
        createdAt: now,
        gradedAt: '',
      })
    }
  }

  // 期末考试（按类型检查，已有则不再创建）
  const hasFinal = existingScores.some((s) => s.type === 'final_exam')
  if (!hasFinal) {
    for (const { student } of students) {
      if (!student) continue
      const id = `exam-${courseId.value}-${student.id}-期末考试-${Date.now()}`
      store.addExamScore({
        id,
        courseId: courseId.value,
        studentId: student.id,
        examName: '期末考试',
        score: 0,
        fullScore: 100,
        weight: 0,
        type: 'final_exam',
        status: 'draft',
        createdAt: now,
        gradedAt: '',
      })
    }
  }
}

function handleSaveExamScores() {
  if (!courseId.value || !selectedExam.value) return
  const existingScores = store.getExamScoresForCourse(courseId.value, selectedExam.value)
  // 优先使用选中时记录的类型，避免跨类型同名时 existingScores[0].type 取到错误类型
  const examType = selectedExamType.value
    || (existingScores.length > 0 ? existingScores[0].type : 'midterm_exam')
  const examWeight = store.getExamWeight(courseId.value, selectedExam.value, examType)
  // 弹窗打开时只保存当前班级的输入
  let inputsToSave = Object.entries(examInputs.value)
  if (selectedGradeClass.value) {
    const ids = currentGradeClassStudentIds.value
    inputsToSave = inputsToSave.filter(([sid]) => ids.has(sid))
  }
  inputsToSave.forEach(([studentId, score]) => {
    const existing = existingScores.find((s) => s.studentId === studentId)
    const clampedScore = Math.min(100, Math.max(0, score))
    if (existing && existing.status !== 'submitted') {
      store.updateExamScore(existing.id, { score: clampedScore, gradedAt: getNow().toISOString().split('T')[0] })
    } else if (!existing) {
      const id = `exam-${courseId.value}-${studentId}-${selectedExam.value}-${Date.now()}`
      store.addExamScore({
        id,
        courseId: courseId.value,
        studentId,
        examName: selectedExam.value,
        score: clampedScore,
        fullScore: currentExamFullScore.value,
        weight: examWeight,
        type: examType,
        status: 'draft',
        createdAt: getNow().toISOString().split('T')[0],
        gradedAt: '',
      })
    }
  })
  // 只清除已保存的学生输入
  const savedIds = new Set(inputsToSave.map(([sid]) => sid))
  for (const sid of savedIds) {
    delete examInputs.value[sid]
  }

}

function handleSubmitExamScores() {
  if (!courseId.value || !selectedExam.value) return
  handleSaveExamScores()
  if (selectedGradeClass.value) {
    const ids = Array.from(currentGradeClassStudentIds.value)
    store.submitExamScores(courseId.value, selectedExam.value, ids.length > 0 ? ids : undefined)
  } else {
    store.submitExamScores(courseId.value, selectedExam.value)
  }

}

function getStudentTotalScore(studentId: string): string | number {
  if (!courseId.value) return '-'
  const scores = store.getExamScoresForCourse(courseId.value)
    .filter((s) => s.studentId === studentId && s.status === 'submitted')
  if (scores.length === 0) return '-'
  const gradeConfig = store.getGradeConfig(courseId.value)
  let weightedSum = 0
  let totalWeight = 0
  const typeGroups = new Map<string, { count: number; sumPercent: number }>()
  for (const s of scores) {
    const w = store.getExamWeight(courseId.value, s.examName, s.type)
    const percent = (s.score / s.fullScore) * 100
    if (w > 0) {
      weightedSum += percent * w
      totalWeight += w
    } else {
      if (!typeGroups.has(s.type)) typeGroups.set(s.type, { count: 0, sumPercent: 0 })
      const g = typeGroups.get(s.type)!
      g.count++
      g.sumPercent += percent
    }
  }
  for (const [type, g] of typeGroups) {
    let typeWeight = 0
    if (type === 'midterm_exam' || type === 'midterm_project') typeWeight = gradeConfig.midtermWeight
    else if (type === 'final_exam' || type === 'final_project') typeWeight = gradeConfig.finalWeight
    else typeWeight = gradeConfig.regularWeight
    if (typeWeight > 0 && g.count > 0) {
      const avgPercent = g.sumPercent / g.count
      weightedSum += avgPercent * typeWeight
      totalWeight += typeWeight
    }
  }
  if (totalWeight === 0) return '0'
  return Math.round(weightedSum / totalWeight)
}

function getStudentExamCount(studentId: string): number {
  if (!courseId.value) return 0
  return store.getExamScoresForCourse(courseId.value)
    .filter((s) => s.studentId === studentId).length
}

function getStudentAvgScore(studentId: string): string | number {
  if (!courseId.value) return '-'
  const allEvals = store.evaluations.filter(
    (e) => e.courseId === courseId.value && e.studentId === studentId
  )
  if (allEvals.length === 0) return '-'
  const maxSession = Math.max(...allEvals.map((e) => e.sessionNumber))
  const relevantEvals = allEvals.filter((e) => e.sessionNumber <= maxSession)
  const sum = relevantEvals.reduce((a, e) => a + e.score, 0)
  return Math.round(sum / relevantEvals.length)
}

function getStudentScoreForExam(studentId: string, examName: string): string | number {
  if (!courseId.value) return '-'
  const score = store.getExamScoresForCourse(courseId.value, examName)
    .find((s) => s.studentId === studentId && s.status === 'submitted')
  return score?.score ?? '-'
}

async function handleExcelImport(event: Event) {
  if (!courseId.value || !selectedExam.value) return
  const existingScores = store.getExamScoresForCourse(courseId.value, selectedExam.value)
  // 优先使用选中时记录的类型，避免跨类型同名时 existingScores[0].type 取到错误类型
  const examType = selectedExamType.value
    || (existingScores.length > 0 ? existingScores[0].type : 'midterm_exam')
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  try {
    const buf = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data: Record<string, string>[] = XLSX.utils.sheet_to_json(ws)
    const keys = Object.keys(data[0] || {})
    const normalizedExamName = selectedExam.value.trim()
    const nameKey = keys.find((key) => ['学生姓名', '姓名'].includes(key.trim())) || keys[0]
    const studentIdKey = keys.find((key) => ['学生学号', '学号', '学生ID', 'studentId'].includes(key.trim()))
    const scoreKey = keys.find((key) => key.trim() === normalizedExamName)
      || keys.find((key) => ['成绩', '分数', '得分'].includes(key.trim()))
      || (keys.length === 2 ? keys[1] : keys[keys.length - 1])
    if (keys.length < 2 || !nameKey || !scoreKey || scoreKey === nameKey) {
      alert('Excel 格式不正确，请包含学生姓名/学号和成绩列')
      return
    }
    let imported = 0
    const scores: any[] = []
    for (const row of data) {
      const name = String(row[nameKey] || '').trim().toLowerCase()
      const studentId = studentIdKey ? String(row[studentIdKey] || '').trim().toLowerCase() : ''
      const rawScore = parseFloat(String(row[scoreKey] || '').trim())
      if (isNaN(rawScore) || (!name && !studentId)) continue
      const student = store.students.find(
        (s) => s.name.toLowerCase() === name
          || s.id.toLowerCase() === name
          || s.id.toLowerCase() === studentId
          || String(s.studentId || '').toLowerCase() === studentId
      )
      if (!student) continue
      const existing = existingScores.find((s) => s.studentId === student.id)
      const score = Math.min(100, Math.max(0, rawScore))
      if (existing && existing.status !== 'submitted') {
        store.updateExamScore(existing.id, { score, gradedAt: getNow().toISOString().split('T')[0] })
      } else if (!existing) {
        const sid = `exam-${courseId.value}-${student.id}-${selectedExam.value}-${Date.now()}`
        store.addExamScore({
          id: sid,
          courseId: courseId.value,
          studentId: student.id,
          examName: selectedExam.value,
          score,
          fullScore: currentExamFullScore.value,
          weight: currentExamWeight.value,
          type: examType,
          status: 'draft',
          createdAt: getNow().toISOString().split('T')[0],
          gradedAt: '',
        })
        scores.push({ id: sid, courseId: courseId.value, studentId: student.id, examName: selectedExam.value, score, fullScore: currentExamFullScore.value, weight: currentExamWeight.value, type: examType })
      }
      imported++
    }
    // 同步到 MySQL
    if (scores.length > 0) {
      try { await bulkImportScores(scores) } catch {}
    }
    alert(`导入成功！共导入 ${imported} 名学生的成绩`)
    input.value = ''
  } catch (err) {
    console.error('Excel 导入失败:', err)
    alert('Excel 导入失败，请检查文件格式')
    input.value = ''
  }
}

async function handleDownloadTemplate() {
  if (!courseId.value || !selectedExam.value) return
  const targetClass = selectedGradeClass.value
  if (!targetClass) {
    alert('请先选择班级')
    return
  }
  try {
    const XLSX = await import('xlsx')
    const data = enrolledStudents.value
      .filter(({ student }) => (student!.className || '') === targetClass)
      .map(({ student }) => {
        const row: Record<string, string | number> = {
          '学生姓名': student!.name,
          '学生学号': student!.id,
          '班级': student!.className || '',
          [selectedExam.value]: '',
        }
        return row
      })
    if (data.length === 0) {
      alert('该班级暂无学生')
      return
    }
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '成绩')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedExam.value}-${targetClass}-成绩模板.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('下载模板失败:', err)
    alert('下载模板失败')
  }
}

const enabledTypes = computed(() => baseEnabledTypes.value.filter((t) => {
  if ((t === 'intra_group' || t === 'inter_group') && !courseHasGroups.value) return false
  if (t === 'mentor' && !selectedConfig.value?.hasMentor) return false
  return true
}))

const filteredEvalTypes = computed(() => enabledTypes.value)

const displaySessions = computed(() => {
  const count = Math.min(totalSessions.value, 3)
  return Array.from({ length: count }, (_, i) => i + 1)
})

const enrolledStudents = computed(() => {
  if (!courseId.value) return []
  return store.enrollments
    .filter((e) => e.courseId === courseId.value && e.status !== 'dropped')
    .map((e) => ({
      enrollmentId: e.id,
      student: store.students.find((s) => s.id === e.studentId),
    }))
    .filter((e) => e.student)
})

const studentSections = computed(() => {
  if (!courseId.value) return []
  const search = studentSearch.value.trim().toLowerCase()

  const enrolled = store.enrollments
    .filter((e) => e.courseId === courseId.value && e.status !== 'dropped')
    .map((e) => ({
      enrollmentId: e.id,
      student: store.students.find((s) => s.id === e.studentId),
    }))
    .filter((e) => e.student) as { enrollmentId: string; student: NonNullable<ReturnType<typeof store.students.find>> }[]

  const filtered = search
    ? enrolled.filter(({ student }) => student.name.toLowerCase().includes(search) || student.id.includes(search))
    : enrolled

  const groups = store.studentGroups.filter((g) => g.courseId === courseId.value)
  const memberToGroup = new Map<string, string>()
  const groupIdMap = new Map<string, string>()
  for (const g of groups) {
    for (const mid of g.memberIds) {
      memberToGroup.set(mid, g.name)
      groupIdMap.set(mid, g.id)
    }
  }

  const groupedMap = new Map<string, { groupId: string; students: typeof filtered }>()
  const ungrouped: typeof filtered = []
  for (const item of filtered) {
    const groupName = memberToGroup.get(item.student.id)
    const groupId = groupIdMap.get(item.student.id) || ''
    if (groupName && groupId) {
      if (!groupedMap.has(groupName)) groupedMap.set(groupName, { groupId, students: [] })
      groupedMap.get(groupName)!.students.push(item)
    } else {
      ungrouped.push(item)
    }
  }

  const sections: { groupId: string; groupName: string; students: typeof filtered }[] = []
  for (const g of groups) {
    const entry = groupedMap.get(g.name)
    if (entry) {
      sections.push({ groupId: g.id, groupName: g.name, students: entry.students })
      groupedMap.delete(g.name)
    } else {
      sections.push({ groupId: g.id, groupName: g.name, students: [] })
    }
  }
  if (ungrouped.length > 0) {
    sections.push({ groupId: '', groupName: '未分组', students: ungrouped })
  }
  return sections
})

/** 当前课程的班级列表 */
const courseGroups = computed(() => {
  if (!courseId.value) return []
  return store.studentGroups.filter((g) => g.courseId === courseId.value)
})

// ====== 新版学生管理：班级板块 computed ======

/** 课程独立班级列表（从 course_classes 表拉取，含空班级） */
const courseClassNames = ref<string[]>([])

/** 加载课程相关班级列表 */
async function loadCourseClasses() {
  if (!courseId.value) return
  try {
    const data = await fetchCourseClasses(courseId.value)
    courseClassNames.value = data.classes || []
  } catch { courseClassNames.value = [] }
}

/** 班级板块：按学生 className 分组 + 合并独立班级列表 */
const classBlocks = computed(() => {
  if (!courseId.value) return []
  const classMap = new Map<string, typeof enrolledStudents.value>()
  for (const item of enrolledStudents.value) {
    if (!item.student) continue
    const cn = item.student.className || ''
    if (!classMap.has(cn)) classMap.set(cn, [])
    classMap.get(cn)!.push(item)
  }
  // 补入独立班级列表中的空班级
  for (const cn of courseClassNames.value) {
    if (!classMap.has(cn)) classMap.set(cn, [])
  }
  return Array.from(classMap.entries())
    .map(([className, items]) => ({
      className,
      students: items.map(i => i.student!).filter(Boolean),
    }))
    .sort((a, b) => a.className.localeCompare(b.className, 'zh-CN'))
})

/** 已分班的班级板块（排除"未分班"） */
const classedBlocks = computed(() => classBlocks.value.filter((cb) => cb.className !== ''))

/** 未分班学员列表 */
const unclassedStudents = computed(() => {
  const block = classBlocks.value.find((cb) => cb.className === '')
  return block ? block.students : []
})

// ====== 学员搜索（班级管理顶部） ======
const studentManageSearch = ref('')

/** 获取学员所在分组名称 */
function getStudentGroupName(studentId: string): string {
  for (const g of store.studentGroups) {
    if (g.courseId === courseId.value && g.memberIds.includes(studentId)) return g.name
  }
  return ''
}

/** 搜索结果列表：包含学员、所在班级、所在分组 */
const searchedStudentList = computed(() => {
  if (!courseId.value || !studentManageSearch.value.trim()) return []
  const search = studentManageSearch.value.trim().toLowerCase()
  return enrolledStudents.value
    .filter((item) => {
      if (!item.student) return false
      const s = item.student
      return s.name.toLowerCase().includes(search) ||
             (s.studentId || '').toLowerCase().includes(search) ||
             s.id.toLowerCase().includes(search)
    })
    .map((item) => ({
      student: item.student!,
      groupName: getStudentGroupName(item.student!.id),
    }))
})

/** 获取某班级的分组（检查组内所有学生 className 是否匹配） */
function getGroupsForClassBlock(className: string) {
  if (!courseId.value) return []
  const allGroups = store.studentGroups.filter((g) => g.courseId === courseId.value)
  return allGroups.filter((g) => {
    if (g.memberIds.length === 0) return false
    // 检查组中所有成员是否都属于该班级
    return g.memberIds.every((sid) => {
      const student = store.students.find((s) => s.id === sid)
      return student && (student.className || '') === className
    })
  })
}

/** 获取某班级的学生人数 */
function getClassStudentCount(className: string) {
  return getClassStudents(className).length
}

/** 获取某班级的学生列表 */
function getClassStudents(className: string) {
  return store.students.filter((s) => (s.className || '') === className && store.enrollments.some((e) => e.courseId === courseId.value && e.studentId === s.id && e.status !== 'dropped'))
}

/** 点击班级内的"新建分组" */
function openNewGroupForClass(className: string) {
  groupFormClassName.value = className
  // 自动建议该班级的下一个组号
  const existingGroups = getGroupsForClassBlock(className)
  const nextNum = existingGroups.length + 1
  groupFormName.value = `第${nextNum}组`
  groupFormMembers.value = []
  editingGroup.value = null
  showGroupModal.value = true
}

/** 从班级内部打开一键分组弹窗 */
function showOneClickGroupForClass(className: string) {
  oneClickGroupData.value = {
    className,
    groupCount: Math.max(2, Math.ceil(getClassStudentCount(className) / 3)),
  }
  showOneClickGroup.value = true
}

/** 切换分组表单中成员勾选 */
function toggleGroupFormMember(studentId: string) {
  const idx = groupFormMembers.value.indexOf(studentId)
  if (idx >= 0) {
    groupFormMembers.value.splice(idx, 1)
  } else {
    groupFormMembers.value.push(studentId)
  }
}

/** 一键随机分组 */
function handleOneClickGroup() {
  const className = oneClickGroupData.value.className
  const groupCount = oneClickGroupData.value.groupCount
  if (!className || !groupCount || groupCount < 2) return
  const students = getClassStudents(className)
  if (students.length === 0) { alert('该班级暂无学生'); return }
  if (groupCount > students.length) {
    alert(`总组数（${groupCount}）不能超过该班级人数（${students.length}）`)
    return
  }

  // 打乱学生数组（Fisher-Yates）
  const shuffled = [...students]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // 先删除该班级现有的所有分组
  const existingGroups = getGroupsForClassBlock(className)
  for (const g of existingGroups) {
    store.deleteStudentGroup(g.id)
  }

  // 按组数平均分配
  const perGroup = Math.ceil(shuffled.length / groupCount)
  let created = 0
  for (let g = 0; g < groupCount; g++) {
    const chunk = shuffled.slice(g * perGroup, (g + 1) * perGroup)
    if (chunk.length === 0) continue
    store.addStudentGroup({
      id: `group-${courseId.value}-${Date.now()}-${g}`,
      courseId: courseId.value!,
      name: `第${g + 1}组`,
      memberIds: chunk.map((s) => s.id),
    })
    created++
  }
  showOneClickGroup.value = false
  oneClickGroupData.value = { className: '', groupCount: 2 }
  alert(`已成功分为 ${created} 组（共 ${shuffled.length} 名学生）`)
}

/** 未分班的学生 */
const ungroupedStudents = computed(() => {
  const allGroupMemberIds = new Set<string>()
  for (const g of courseGroups.value) {
    for (const mid of g.memberIds) allGroupMemberIds.add(mid)
  }
  return enrolledStudents.value.filter(({ student }) => student && !allGroupMemberIds.has(student.id))
})

/** 选中的班级名称 */
const selectedGroupName = computed(() => {
  if (selectedGroupId.value === '__ungrouped__') return '未分班学生'
  const group = store.studentGroups.find((g) => g.id === selectedGroupId.value)
  return group?.name || ''
})

/** 选中班级的学生列表 */
const selectedGroupStudents = computed(() => {
  if (selectedGroupId.value === '__ungrouped__') return ungroupedStudents.value
  const group = store.studentGroups.find((g) => g.id === selectedGroupId.value)
  if (!group) return []
  const memberSet = new Set(group.memberIds)
  return enrolledStudents.value.filter(({ student }) => student && memberSet.has(student.id))
})

/** 搜索过滤后的选中班级学生 */
const filteredSelectedGroupStudents = computed(() => {
  const search = studentSearch.value.trim().toLowerCase()
  if (!search) return selectedGroupStudents.value
  return selectedGroupStudents.value.filter(({ student }) =>
    student && (student.name.toLowerCase().includes(search) || student.id.toLowerCase().includes(search))
  )
})

// ---- 评价数据 ----
function getStudentEvals(studentId: string, sessionNumber?: number, type?: EvalType): Evaluation[] {
  return store.evaluations.filter((e) => {
    if (e.courseId !== courseId.value || e.studentId !== studentId) return false
    if (sessionNumber && e.sessionNumber !== sessionNumber) return false
    if (type && e.type !== type) return false
    return true
  })
}

function getStudentEvalCount(studentId: string): number {
  return store.evaluations.filter((e) => e.courseId === courseId.value && e.studentId === studentId && e.type === 'self').length
}

function getAvgScore(studentId: string, sessionNumber: number, type: EvalType): number | null {
  const evals = getStudentEvals(studentId, sessionNumber, type)
  if (evals.length === 0) return null
  return Math.round(evals.reduce((a, e) => a + e.score, 0) / evals.length)
}

function getScoreDisplay(studentId: string, sessionNumber: number, type: EvalType): string {
  const v = getAvgScore(studentId, sessionNumber, type)
  return v !== null ? `${v}分` : '-'
}

function scoreCellClass(studentId: string, sessionNumber: number, type: EvalType): string {
  const v = getAvgScore(studentId, sessionNumber, type)
  if (v === null) return 'text-gray-400/60'
  if (v >= 85) return 'text-emerald-600 font-medium'
  if (v >= 60) return 'text-blue-600'
  return 'text-red-500'
}

function getStudentTotalAvg(studentId: string): string {
  let total = 0; let count = 0
  displaySessions.value.forEach((s) => {
    filteredEvalTypes.value.forEach((t) => {
      const v = getAvgScore(studentId, s, t)
      if (v !== null) { total += v; count++ }
    })
  })
  return count > 0 ? `${Math.round(total / count)}分` : '-'
}

function totalScoreColor(val: string | number): string {
  if (val === '-') return '#9ca3af'
  const n = parseInt(String(val))
  if (n >= 85) return '#22c55e'
  if (n >= 60) return '#3b82f6'
  return '#ef4444'
}

function getEnrollStatus(studentId: string): { label: string; color: string; progress: number } {
  const enr = store.enrollments.find((e) => e.courseId === courseId.value && e.studentId === studentId)
  if (!enr) return { label: '未知', color: 'bg-brand-400/10 text-gray-400', progress: 0 }
  const map: Record<string, { label: string; color: string }> = {
    enrolled:     { label: '已报名',    color: 'bg-brand-600/10 text-gray-600' },
    in_progress:  { label: '学习中',    color: 'bg-brand-400/10 text-gray-600' },
    completed:    { label: '已完成',    color: 'bg-brand-400/10 text-gray-600' },
    dropped:      { label: '已退课',    color: 'bg-brand-600/10 text-gray-600' },
  }
  return { ...map[enr.status] || { label: '未知', color: 'bg-brand-400/10 text-gray-400' }, progress: enr.progress || 0 }
}

const handleSetConfig = (updates: Partial<import('@/types').EvaluationConfig>) => {
  if (!courseId.value) return
  const existing = store.evalConfigs.find((c) => c.courseId === courseId.value)
  const config = {
    courseId: courseId.value,
    template: existing?.template || 'standard',
    frequency: existing?.frequency || 'biweekly',
    hasMentor: existing?.hasMentor ?? false,
    overdueRule: existing?.overdueRule || 'average',
    ...existing,
    ...updates,
  }
  if (updates.template) {
    const enabledTypes = TEMPLATE_EVAL_TYPES[updates.template]
    const zeroed: Partial<GradeWeightConfig> = {}
    for (const type of ALL_EVAL_TYPES) {
      if (!enabledTypes.includes(type)) {
        zeroed[evalTypeWeightKeyMap[type]] = 0
      }
    }
    gradeConfig.value = { ...gradeConfig.value, ...zeroed }
  }
  store.setEvalConfig(config)
  store.markConfigCompleted(courseId.value, 'evalConfig')
}

function openEvalCriteria(student: { id: string; name: string }) {
  const type = evalCriteriaType.value
  const defs = getEvalItemDefinitions(type)
  const existing = courseId.value
    ? store.evaluations.find(
        (e) => e.courseId === courseId.value && e.studentId === student.id &&
          e.sessionNumber === selectedBatchSession.value && e.type === type
      )
    : undefined

  evalCriteriaStudentId.value = student.id
  evalCriteriaStudentName.value = student.name
  evalCriteriaError.value = ''
  evalCriteriaDraft.value = defs.map((item, index) => {
    const saved = existing?.items?.[index]
    return saved && saved.score !== undefined ? saved.score : ''
  })
  evalScoreInputs.value = {}
  showEvalCriteriaPopup.value = true
}

function closeEvalCriteriaPopup() {
  showEvalCriteriaPopup.value = false
  evalCriteriaStudentId.value = ''
  evalCriteriaStudentName.value = ''
  evalCriteriaDraft.value = []
  evalCriteriaError.value = ''
}

function setEvalCriteriaScore(index: number, e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const parsed = Number(raw)
  const next: EvalScoreDraftValue = raw === '' || Number.isNaN(parsed) ? '' : parsed
  evalCriteriaDraft.value = evalCriteriaDraft.value.map((value, i) => (i === index ? next : value))
}

function saveEvalCriteria() {
  const studentId = evalCriteriaStudentId.value
  const type = evalCriteriaType.value
  const defs = getEvalItemDefinitions(type)
  const invalid = defs.some((item, index) => {
    const value = evalCriteriaDraft.value[index]
    return value === '' || typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > item.max
  })
  if (invalid) {
    evalCriteriaError.value = '请完整填写各项分数'
    return
  }

  const items = evalItemsFromDraft(defs, evalCriteriaDraft.value)
  const score = scoreFromEvalDraft(defs, evalCriteriaDraft.value)
  const existing = courseId.value
    ? store.evaluations.find(
        (e) => e.courseId === courseId.value && e.studentId === studentId &&
          e.sessionNumber === selectedBatchSession.value && e.type === type
      )
    : undefined
  const ev: Evaluation = {
    id: existing ? existing.id : `ev-manual-${Date.now()}-${studentId}-${type}`,
    courseId: courseId.value || '',
    studentId,
    sessionNumber: selectedBatchSession.value,
    type,
    score,
    items,
    evaluatorId: store.currentUser || '',
    evaluatorName: store.currentUser || (isMentor.value ? '企业导师' : '教师'),
    createdAt: getNow().toISOString().split('T')[0],
  }
  if (existing) {
    store.updateEvaluation(ev.id, { score, items, createdAt: ev.createdAt })
  } else {
    store.addEvaluation(ev)
  }
  evalCriteriaDrafts.value[studentId] = [...evalCriteriaDraft.value]
  closeEvalCriteriaPopup()
  if (courseId.value) {
    store.syncEvalToDetailedGrade(courseId.value)
  }
}

const handleBatchEval = (level: string) => {
  if (!courseId.value) return
  const range = LEVEL_OPTIONS.find((o) => o.label === level)?.range
  if (!range) return
  const score = Math.round((range[0] + range[1]) / 2)
  const session = selectedBatchSession.value
  const type: EvalType = isMentor.value ? 'mentor' : 'teacher'
  const items = makeEvalItemsForTotal(type, score)

  selectedStudentIds.value.forEach((studentId) => {
    if (store.isSessionLocked(courseId.value || '', session) ||
        store.isTeacherEvalSubmitted(courseId.value || '', studentId, session, type)) return
    const existing = store.evaluations.find(
      (e) => e.courseId === courseId.value && e.studentId === studentId && e.type === type && e.sessionNumber === session
    )
    const ev: Evaluation = {
      id: existing ? existing.id : `ev-batch-${Date.now()}-${studentId}-${type}`,
      courseId: courseId.value,
      studentId,
      sessionNumber: session,
      type,
      score,
      items: items.map((item) => ({ ...item })),
      evaluatorId: store.currentUser || '',
      evaluatorName: store.currentUser || (isMentor.value ? '企业导师' : '教师'),
      comment: level,
      createdAt: getNow().toISOString().split('T')[0],
    }
    if (existing) {
      store.updateEvaluation(ev.id, { score, items: items.map((item) => ({ ...item })), comment: level, createdAt: ev.createdAt })
    } else {
      store.addEvaluation(ev)
    }
  })
  evalScoreInputs.value = {}
  store.markSessionEvalRemindersCompleted(courseId.value, session)
  // 保存后同步评价到详细成绩（实时更新总分）
  store.syncEvalToDetailedGrade(courseId.value)
}

function handleSaveEvalScores() {
  if (!courseId.value) return
  const session = selectedBatchSession.value
  const type: EvalType = isMentor.value ? 'mentor' : 'teacher'
  Object.entries(evalScoreInputs.value).forEach(([studentId, score]) => {
    if (store.isSessionLocked(courseId.value || '', session) ||
        store.isTeacherEvalSubmitted(courseId.value || '', studentId, session, type)) return
    const clampedScore = Math.min(100, Math.max(0, score))
    const existing = store.evaluations.find(
      (e) => e.courseId === courseId.value && e.studentId === studentId && e.type === type && e.sessionNumber === session
    )
    const ev: Evaluation = {
      id: existing ? existing.id : `ev-manual-${Date.now()}-${studentId}-${type}`,
      courseId: courseId.value,
      studentId,
      sessionNumber: session,
      type,
      score: clampedScore,
      evaluatorId: store.currentUser || '',
      evaluatorName: store.currentUser || (isMentor.value ? '企业导师' : '教师'),
      createdAt: getNow().toISOString().split('T')[0],
    }
    if (existing) {
      store.updateEvaluation(ev.id, { score: clampedScore, createdAt: ev.createdAt })
    } else {
      store.addEvaluation(ev)
    }
  })
  evalScoreInputs.value = {}
  // 保存后同步评价到详细成绩（实时更新总分）
  if (courseId.value) {
    store.syncEvalToDetailedGrade(courseId.value)
  }
}

function handleSubmitAll() {
  if (!courseId.value) return
  const session = selectedBatchSession.value
  const type: EvalType = isMentor.value ? 'mentor' : 'teacher'

  // 1. 先保存所有待处理的输入
  handleSaveEvalScores()

  // 2. 只提交当前弹窗班级中有草稿评价的学生
  const section = currentEvalClassSection.value
  if (!section) return

  let count = 0
  for (const group of section.groups) {
    for (const s of group.students) {
      if (s.submitted) continue
      const hasEval = store.evaluations.some(
        (e) => e.courseId === courseId.value && e.studentId === s.student.id && e.type === type && e.sessionNumber === session
      )
      if (hasEval) {
        store.submitTeacherEval(courseId.value, s.student.id, session, type)
        count++
      }
    }
  }

  store.markSessionEvalRemindersCompleted(courseId.value, session)
  // 提交后同步评价到详细成绩
  store.syncEvalToDetailedGrade(courseId.value)
}

function toggleGroup(gi: number) {
  const group = currentEvalClassSection.value?.groups[gi]
  if (!group) return
  const all = group.students.filter(s => !s.submitted).map(s => s.student.id)
  if (isGroupSelected(gi)) {
    selectedStudentIds.value = selectedStudentIds.value.filter(id => !all.includes(id))
  } else {
    for (const id of all) {
      if (!selectedStudentIds.value.includes(id)) {
        selectedStudentIds.value = [...selectedStudentIds.value, id]
      }
    }
  }
}

function toggleAllClass() {
  const all = currentEvalClassSection.value
    ? currentEvalClassSection.value.groups.flatMap(g => g.students).filter(s => !s.submitted).map(s => s.student.id)
    : []
  if (isAllClassSelected.value) {
    selectedStudentIds.value = selectedStudentIds.value.filter(id => !all.includes(id))
  } else {
    for (const id of all) {
      if (!selectedStudentIds.value.includes(id)) {
        selectedStudentIds.value = [...selectedStudentIds.value, id]
      }
    }
  }
}

function closeEvalPopup() {
  showEvalPopup.value = false
  selectedEvalClass.value = ''
  selectedStudentIds.value = []
  evalScoreInputs.value = {}
}

function closeGradePopup() {
  showGradePopup.value = false
  selectedGradeClass.value = ''
  gradePopupSearch.value = ''
}

const selectedUnsubmittedCount = computed(() => {
  const selected = selectedStudentIds.value
  if (selectedEvalClass.value) {
    const section = currentEvalClassSection.value
    if (!section) return 0
    const allUnsubmitted = section.groups.flatMap(g => g.students).filter(s => !s.submitted).map(s => s.student.id)
    return selected.filter(id => allUnsubmitted.includes(id)).length
  }
  return selected.filter(id => {
    const found = evalTableSections.value.some(cb => cb.groups.some(g => g.students.some(s => s.student.id === id && !s.submitted)))
    return found
  }).length
})

function handleSessionSelect(session: number) {
  if (!courseId.value) return
  store.autoLockPreviousSession(courseId.value, session)
  selectedBatchSession.value = session

}

function isSessionDisabled(session: number): boolean {
  if (!courseId.value) return true
  if (store.isSessionLocked(courseId.value, session)) return true
  if (!store.isSessionTime(courseId.value, session)) return true
  if (session === totalSessions.value && isFinalSessionExpired.value) return true
  return false
}

function isSessionTime(session: number): boolean {
  if (!courseId.value) return true
  return store.isSessionTime(courseId.value, session)
}

const isFinalSessionExpired = computed(() => {
  if (!courseId.value) return false
  return store.isFinalSessionDeadlinePassed(courseId.value, totalSessions.value)
})

// 过滤下拉联动：切换班级时重置分组选择
watch(evalFilterClass, () => { evalFilterGroup.value = '' })
watch(gradeFilterClass, () => { gradeFilterGroup.value = '' })

// 弹窗打开时，从已保存评价预填评分输入框，方便修改
watch(showEvalPopup, (show) => {
  if (show && courseId.value && selectedEvalClass.value) {
    prefillEvalInputs()
  }
  if (!show) {
    evalScoreInputs.value = {}
  }
})

function prefillEvalInputs() {
  const section = currentEvalClassSection.value
  if (!section || !courseId.value) return
  const session = selectedBatchSession.value
  const type: EvalType = isMentor.value ? 'mentor' : 'teacher'
  const inputs: Record<string, number> = {}
  for (const group of section.groups) {
    for (const s of group.students) {
      const ev = store.evaluations.find(
        (e) => e.courseId === courseId.value && e.studentId === s.student.id &&
              e.type === type && e.sessionNumber === session
      )
      if (ev) {
        inputs[s.student.id] = ev.score
      }
    }
  }
  evalScoreInputs.value = inputs
}

function getSessionTitle(session: number): string {
  if (!courseId.value) return ''
  if (store.isSessionLocked(courseId.value, session)) return '该轮次已锁定，不可修改'
  if (!store.isSessionTime(courseId.value, session)) return session === 1 ? '第一节课尚未开始' : '该轮次尚未到开启时间'
  if (session === totalSessions.value && isFinalSessionExpired.value) return '课程已结束，最终评价已截止'
  return ''
}

const hasSubmittable = computed(() => submittableCount.value > 0)

const submittableCount = computed(() => {
  // 当前弹窗班级中，有草稿（已保存但未提交）或未提交输入的未提交学生数量
  if (selectedEvalClass.value) {
    const section = currentEvalClassSection.value
    if (!section) return 0
    return section.groups.reduce((a, g) => a + g.students.filter(s => {
      if (s.submitted) return false
      if (evalScoreInputs.value[s.student.id] !== undefined) return true
      return s.hasDraft
    }).length, 0)
  }
  return evalTableSections.value.reduce((a, cb) => a + cb.groups.reduce((b, g) => b + g.students.filter(s => {
    if (s.submitted) return false
    if (evalScoreInputs.value[s.student.id] !== undefined) return true
    return s.hasDraft
  }).length, 0), 0)
})

const handleProcessOverdue = () => {
  if (!courseId.value) return
  for (let s = 1; s <= totalSessions.value; s++) {
    store.processSessionOverdue(courseId.value, s)
  }
  const students = enrolledStudents.value.map(({ student }) => student).filter(Boolean)
  for (const s of students) {
    for (let sn = 1; sn <= totalSessions.value; sn++) {
      store.markEvalReminderCompleted(courseId.value, s!.id, sn)
    }
  }

}

function getStudentName(studentId: string): string {
  const student = store.students.find((s) => s.id === studentId)
  return student?.name || studentId
}

function getStudentGroupId(studentId: string): string | null {
  for (const g of store.studentGroups) {
    if (g.memberIds.includes(studentId)) return g.id
  }
  return null
}

function handleRemoveStudentFromGroup(studentId: string) {
  for (const g of store.studentGroups) {
    if (g.memberIds.includes(studentId)) {
      store.updateStudentGroup(g.id, {
        memberIds: g.memberIds.filter((id) => id !== studentId),
      })
      break
    }
  }

}

function handleEditStudent(student: import('@/types').Student) {
  editingStudent.value = student
  editStudentName.value = student.name
  editStudentIdField.value = student.id
  editStudentClass.value = student.className || ''
  const group = store.studentGroups.find(g => g.courseId === courseId.value && g.memberIds.includes(student.id))
  editStudentGroupId.value = group?.id || ''
  showEditStudentModal.value = true

}

function handleSaveEditStudent() {
  if (!editingStudent.value || !editStudentName.value.trim()) return
  const student = editingStudent.value
  const newId = editStudentIdField.value.trim() || student.id
  if (newId !== student.id && store.students.some((s) => s.id === newId)) {
    alert('该学号已被其他学生使用')
    return
  }
  const oldId = student.id
  store.updateStudent(oldId, { name: editStudentName.value.trim(), id: newId, className: editStudentClass.value || '' })

  if (newId !== oldId) {
    store.enrollments.forEach((e) => {
      if (e.studentId === oldId) {
        store.updateEnrollment(e.id, { studentId: newId })
      }
    })
    store.evaluations.forEach((ev) => {
      if (ev.studentId === oldId) {
        store.updateEvaluation(ev.id, { studentId: newId })
      }
      if (ev.evaluatorId === oldId) {
        store.updateEvaluation(ev.id, { evaluatorId: newId })
      }
    })
    const examScores = (store as any).examScores?.value || []
    examScores.forEach((s: any) => {
      if (s.studentId === oldId) {
        ;(store as any).examScores.value = examScores.map((es: any) =>
          es.id === s.id ? { ...es, studentId: newId } : es
        )
      }
    })
    const evalReminders = (store as any).evalReminders?.value || []
    ;(store as any).evalReminders.value = evalReminders.map((r: any) => {
      if (r.studentId === oldId) return { ...r, studentId: newId }
      return r
    })
    store.studentGroups.forEach((g) => {
      if (g.memberIds.includes(oldId)) {
        store.updateStudentGroup(g.id, {
          memberIds: g.memberIds.map((id) => (id === oldId ? newId : id)),
        })
      }
    })
    try {
      localStorage.setItem('examScores', JSON.stringify((store as any).examScores?.value || []))
      localStorage.setItem('evalReminders', JSON.stringify((store as any).evalReminders?.value || []))
    } catch {}
  }

  const currentGroup = store.studentGroups.find(g => g.courseId === courseId.value && g.memberIds.includes(newId))
  const currentGroupId = currentGroup?.id || ''
  if (currentGroupId !== editStudentGroupId.value) {
    if (currentGroupId) {
      store.updateStudentGroup(currentGroupId, {
        memberIds: currentGroup!.memberIds.filter((id) => id !== newId),
      })
    }
    if (editStudentGroupId.value) {
      const newGroup = store.studentGroups.find((g) => g.id === editStudentGroupId.value)
      if (newGroup) {
        store.updateStudentGroup(newGroup.id, {
          memberIds: [...newGroup.memberIds, newId],
        })
      }
    }
  }

  showEditStudentModal.value = false
  editingStudent.value = null
  editStudentName.value = ''
  editStudentIdField.value = ''
  editStudentGroupId.value = ''

}

function handleRemoveStudent(studentId: string) {
  if (!courseId.value) return
  if (!confirm('确定将该学生删除并从课程中移除？')) return
  handleRemoveStudentFromGroup(studentId)
  const enrollment = store.enrollments.find(
    (e) => e.courseId === courseId.value && e.studentId === studentId && e.status !== 'dropped'
  )
  if (enrollment) {
    store.deleteEnrollment(enrollment.id)
  }

}

async function handleImportStudentsExcel(event: Event) {
  if (!courseId.value) return
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  try {
    const buf = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data: Record<string, string>[] = XLSX.utils.sheet_to_json(ws)
    const keys = Object.keys(data[0] || {})
    if (keys.length < 1) {
      alert('Excel 格式不正确，请确保第一列为学生姓名')
      return
    }
    const nameKey = keys[0]
    const idKey = keys.length >= 2 ? keys[1] : null
    let imported = 0
    const enrollments: any[] = []
    for (const row of data) {
      const name = String(row[nameKey] || '').trim()
      if (!name) continue
      const rawId = idKey ? String(row[idKey] || '').trim() : ''
      let student = rawId
        ? store.students.find((s) => s.id === rawId || s.name === name)
        : store.students.find((s) => s.name === name)
      if (!student) {
        const id = rawId || `stu-${Date.now()}-${imported}`
        store.addStudent({ id, name, phone: '', email: '', avatar: '', joinDate: getNow().toISOString().split('T')[0], status: 'active' })
        student = store.students.find((s) => s.id === id)!
      }
      const exists = store.enrollments.some(
        (e) => e.courseId === courseId.value && e.studentId === student!.id && e.status !== 'dropped'
      )
      if (exists) continue
      const enrId = `enr-${courseId.value}-${student!.id}-${Date.now()}-${imported}`
      store.addEnrollment({
        id: enrId,
        courseId: courseId.value,
        studentId: student!.id,
        scheduleId: '',
        status: 'enrolled',
        progress: 0,
        enrollDate: getNow().toISOString().split('T')[0],
      })
      enrollments.push({ id: enrId, studentId: student!.id, courseId: courseId.value })
      imported++
    }
    // 同步到 MySQL
    if (enrollments.length > 0) {
      try { await bulkImportEnrollments(enrollments) } catch {}
    }
    alert(`导入成功！共导入 ${imported} 名学生`)
  } catch (err) {
    console.error('Excel 导入失败:', err)
    alert('Excel 导入失败，请检查文件格式')
  }
  input.value = ''
}

function openNewGroupModal() {
  editingGroup.value = null
  groupFormName.value = ''
  groupFormMembers.value = []
  groupFormClassName.value = ''
  showGroupModal.value = true
}

function openEditGroupModal(group: import('@/types').StudentGroup) {
  editingGroup.value = group
  groupFormName.value = group.name
  groupFormMembers.value = [...group.memberIds]
  // 从成员推断所属班级
  if (group.memberIds.length > 0) {
    const firstMember = store.students.find(s => s.id === group.memberIds[0])
    groupFormClassName.value = firstMember?.className || ''
  } else {
    groupFormClassName.value = ''
  }
  showGroupModal.value = true
}

function handleSaveGroup() {
  if (!courseId.value || !groupFormName.value.trim()) {
    alert('请输入组名')
    return
  }
  const name = groupFormName.value.trim()
  if (editingGroup.value) {
    store.updateStudentGroup(editingGroup.value.id, {
      name,
      memberIds: groupFormMembers.value,
    })
  } else {
    store.addStudentGroup({
      id: `group-${courseId.value}-${Date.now()}`,
      courseId: courseId.value,
      name,
      memberIds: groupFormMembers.value,
    })
  }
  showGroupModal.value = false
  editingGroup.value = null
  groupFormName.value = ''
  groupFormMembers.value = []

}

function handleDeleteGroup(groupId: string) {
  if (!confirm('确定删除该分组？')) return
  store.deleteStudentGroup(groupId)
}

// ====== 分组内添加/移除学员 ======
const showAddMemberModal = ref(false)
const addMemberGroupId = ref('')
const addMemberGroupName = ref('')
const addMemberClassName = ref('')
const addMemberSearch = ref('')
const addMemberSelected = ref<string[]>([])

/** 候选添加到分组的学员：本班级内未分组成员 */
const candidateAddMembers = computed(() => {
  if (!addMemberClassName.value) return []
  const classStudents = getClassStudents(addMemberClassName.value)
  // 找出本班级中已在任何分组的学员ID
  const groupedStudentIds = new Set<string>()
  for (const g of store.studentGroups) {
    if (g.courseId === courseId.value) {
      for (const sid of g.memberIds) {
        groupedStudentIds.add(sid)
      }
    }
  }
  const search = addMemberSearch.value.trim().toLowerCase()
  return classStudents.filter((s) => {
    if (groupedStudentIds.has(s.id)) return false
    if (search) {
      return s.name.toLowerCase().includes(search) || (s.studentId || s.id).toLowerCase().includes(search)
    }
    return true
  })
})

function openAddMemberToGroup(group: import('@/types').StudentGroup) {
  addMemberGroupId.value = group.id
  addMemberGroupName.value = group.name
  if (group.memberIds.length > 0) {
    const firstMember = store.students.find((s) => s.id === group.memberIds[0])
    addMemberClassName.value = firstMember?.className || ''
  } else {
    addMemberClassName.value = ''
  }
  addMemberSearch.value = ''
  addMemberSelected.value = []
  showAddMemberModal.value = true
}

function toggleAddMember(studentId: string) {
  const idx = addMemberSelected.value.indexOf(studentId)
  if (idx >= 0) {
    addMemberSelected.value.splice(idx, 1)
  } else {
    addMemberSelected.value.push(studentId)
  }
}

function confirmAddMembersToGroup() {
  const group = store.studentGroups.find((g) => g.id === addMemberGroupId.value)
  if (!group) return
  store.updateStudentGroup(group.id, {
    memberIds: [...group.memberIds, ...addMemberSelected.value],
  })
  showAddMemberModal.value = false
  addMemberSelected.value = []
}

/** 从分组中移除单个学员（不改变其班级归属） */
function handleRemoveMemberFromGroup(groupId: string, studentId: string) {
  const group = store.studentGroups.find((g) => g.id === groupId)
  if (!group) return
  store.updateStudentGroup(groupId, {
    memberIds: group.memberIds.filter((id) => id !== studentId),
  })
}

// ====== 分组内移除学员选择弹窗 ======
const showRemoveMemberModal = ref(false)
const removeMemberGroupId = ref('')
const removeMemberStudentId = ref('')

const removeMemberStudentName = computed(() => {
  return getStudentName(removeMemberStudentId.value) || '未知学员'
})

function openRemoveMemberModal(groupId: string, studentId: string) {
  removeMemberGroupId.value = groupId
  removeMemberStudentId.value = studentId
  showRemoveMemberModal.value = true
}

/** 确认移出分组：仅从当前分组移除，保留班级归属 */
function confirmRemoveMemberFromGroup() {
  handleRemoveMemberFromGroup(removeMemberGroupId.value, removeMemberStudentId.value)
  showRemoveMemberModal.value = false
}

/** 确认移出班级：设为未分班，并从所有分组中移除 */
function confirmRemoveMemberFromClass() {
  const studentId = removeMemberStudentId.value
  store.updateStudent(studentId, { className: '' })
  for (const g of store.studentGroups) {
    if (g.courseId === courseId.value && g.memberIds.includes(studentId)) {
      store.updateStudentGroup(g.id, {
        memberIds: g.memberIds.filter((id) => id !== studentId),
      })
    }
  }
  showRemoveMemberModal.value = false
}

/** 确认移出本课程：删除选课记录，并从所有分组中移除 */
function confirmRemoveMemberFromCourse() {
  const studentId = removeMemberStudentId.value
  for (const g of store.studentGroups) {
    if (g.courseId === courseId.value && g.memberIds.includes(studentId)) {
      store.updateStudentGroup(g.id, {
        memberIds: g.memberIds.filter((id) => id !== studentId),
      })
    }
  }
  const enrollment = store.enrollments.find(
    (e) => e.courseId === courseId.value && e.studentId === studentId && e.status !== 'dropped'
  )
  if (enrollment) {
    store.deleteEnrollment(enrollment.id)
  }
  showRemoveMemberModal.value = false
}

// ====== 搜索结果：快捷移出分组 / 加入分组 / 加入班级 ======
/** 搜索结果：快捷移出当前分组（保留班级归属） */
function quickRemoveFromGroup(studentId: string) {
  const groupId = getStudentGroupId(studentId)
  if (!groupId) return
  if (!confirm('确定将该学员移出当前分组？（仍保留在班级中）')) return
  handleRemoveMemberFromGroup(groupId, studentId)
}

// -- 快捷加入分组 --
const showQuickAddGroupModal = ref(false)
const quickAddGroupStudentId = ref('')
const quickAddGroupSelected = ref('')

const quickAddGroupStudentName = computed(() => getStudentName(quickAddGroupStudentId.value) || '未知学员')

/** 可加入的分组：与该学员同班级的分组（含空分组），排除学员已所在的分组 */
const quickAddGroupCandidates = computed(() => {
  if (!courseId.value || !quickAddGroupStudentId.value) return []
  const student = store.students.find((s) => s.id === quickAddGroupStudentId.value)
  if (!student) return []
  const studentClass = student.className || ''
  if (!studentClass) return [] // 未分班不能加入分组
  return store.studentGroups
    .filter((g) => g.courseId === courseId.value)
    .filter((g) => {
      if (g.memberIds.length === 0) return true // 空分组允许
      // 组内成员是否都属于该班级
      return g.memberIds.every((sid) => {
        const m = store.students.find((s) => s.id === sid)
        return m && (m.className || '') === studentClass
      })
    })
    .filter((g) => !g.memberIds.includes(quickAddGroupStudentId.value))
})

function openQuickAddToGroup(studentId: string) {
  quickAddGroupStudentId.value = studentId
  quickAddGroupSelected.value = ''
  showQuickAddGroupModal.value = true
}

function confirmQuickAddToGroup() {
  if (!quickAddGroupSelected.value) return
  const group = store.studentGroups.find((g) => g.id === quickAddGroupSelected.value)
  if (!group) return
  if (!group.memberIds.includes(quickAddGroupStudentId.value)) {
    store.updateStudentGroup(group.id, {
      memberIds: [...group.memberIds, quickAddGroupStudentId.value],
    })
  }
  showQuickAddGroupModal.value = false
}

// -- 快捷加入班级 --
const showQuickAddClassModal = ref(false)
const quickAddClassStudentId = ref('')
const quickAddClassSelected = ref('')

const quickAddClassStudentName = computed(() => getStudentName(quickAddClassStudentId.value) || '未知学员')

/** 可加入的班级：当前课程已有班级（排除学员当前班级） */
const quickAddClassCandidates = computed(() => {
  if (!courseId.value || !quickAddClassStudentId.value) return []
  const student = store.students.find((s) => s.id === quickAddClassStudentId.value)
  if (!student) return []
  const currentClass = student.className || ''
  const classes = new Set<string>()
  for (const item of enrolledStudents.value) {
    if (item.student && item.student.className && item.student.className !== currentClass) {
      classes.add(item.student.className)
    }
  }
  return Array.from(classes).sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

function openQuickAddToClass(studentId: string) {
  quickAddClassStudentId.value = studentId
  quickAddClassSelected.value = ''
  showQuickAddClassModal.value = true
}

/** 确认加入班级：变更班级后从原分组移除（原分组不再适用） */
function confirmQuickAddToClass() {
  if (!quickAddClassSelected.value) return
  for (const g of store.studentGroups) {
    if (g.courseId === courseId.value && g.memberIds.includes(quickAddClassStudentId.value)) {
      store.updateStudentGroup(g.id, {
        memberIds: g.memberIds.filter((id) => id !== quickAddClassStudentId.value),
      })
    }
  }
  store.updateStudent(quickAddClassStudentId.value, { className: quickAddClassSelected.value })
  showQuickAddClassModal.value = false
}

// ====== 班级内添加/移除学员 ======
const showAddStudentToClassModal = ref(false)
const addStudentToClassName = ref('')
const addStudentToClassSearch = ref('')
const addStudentToClassSelected = ref<string[]>([])

/** 候选添加到班级的学员：已选课但不在该班级的学员 */
const candidateAddStudentsToClass = computed(() => {
  if (!courseId.value || !addStudentToClassName.value) return []
  const enrolledIds = store.enrollments
    .filter((e) => e.courseId === courseId.value && e.status !== 'dropped')
    .map((e) => e.studentId)
  const search = addStudentToClassSearch.value.trim().toLowerCase()
  return store.students
    .filter((s) =>
      enrolledIds.includes(s.id) &&
      (s.className || '') !== addStudentToClassName.value
    )
    .filter((s) => {
      if (search) {
        return s.name.toLowerCase().includes(search) || (s.studentId || s.id).toLowerCase().includes(search)
      }
      return true
    })
})

function openAddStudentToClass(className: string) {
  addStudentToClassName.value = className
  addStudentToClassSearch.value = ''
  addStudentToClassSelected.value = []
  showAddStudentToClassModal.value = true
}

function toggleAddStudentToClass(studentId: string) {
  const idx = addStudentToClassSelected.value.indexOf(studentId)
  if (idx >= 0) {
    addStudentToClassSelected.value.splice(idx, 1)
  } else {
    addStudentToClassSelected.value.push(studentId)
  }
}

function confirmAddStudentsToClass() {
  for (const sid of addStudentToClassSelected.value) {
    store.updateStudent(sid, { className: addStudentToClassName.value })
  }
  showAddStudentToClassModal.value = false
  addStudentToClassSelected.value = []
}

/** 从班级移除学员（将其设为未分班，同时从所有分组中移除） */
function handleRemoveStudentFromClass(studentId: string) {
  if (!confirm('确定将该学员移出当前班级？（该学员将变为未分班状态，并从所有分组中移除）')) return
  store.updateStudent(studentId, { className: '' })
  // 从所有分组中移除
  for (const g of store.studentGroups) {
    if (g.courseId === courseId.value && g.memberIds.includes(studentId)) {
      store.updateStudentGroup(g.id, {
        memberIds: g.memberIds.filter((id) => id !== studentId),
      })
    }
  }
}

async function handleImportGroupsExcel(event: Event) {
  if (!courseId.value) return
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  try {
    const buf = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data: Record<string, string>[] = XLSX.utils.sheet_to_json(ws)
    const keys = Object.keys(data[0] || {})
    if (keys.length < 2) {
      alert('Excel 格式不正确，请确保第一列为组名，第二列及之后为学生姓名/学号')
      return
    }
    const groupNameKey = keys[0]
    const groupMap = new Map<string, string[]>()

    // 如果是从班级内导入，只允许该班级的学生入组
    const targetClassName = classNameForImport.value
    const classStudentIds = targetClassName ? new Set(
      enrolledStudents.value
        .filter(e => e.student!.className === targetClassName)
        .map(e => e.student!.id)
    ) : null

    for (const row of data) {
      const groupName = String(row[groupNameKey] || '').trim()
      if (!groupName) continue
      for (let i = 1; i < keys.length; i++) {
        const studentRef = String(row[keys[i]] || '').trim()
        if (!studentRef) continue
        if (!groupMap.has(groupName)) groupMap.set(groupName, [])
        const student = store.students.find(
          (s) => s.name === studentRef || s.id === studentRef
        )
        if (student) {
          // 如果指定了目标班级，只导入该班级的学生
          if (classStudentIds && !classStudentIds.has(student.id)) continue
          groupMap.get(groupName)!.push(student.id)
        }
      }
    }
    let imported = 0
    const groups: any[] = []
    for (const [name, memberIds] of groupMap) {
      const existing = store.studentGroups.find(
        (g) => g.courseId === courseId.value && g.name === name
      )
      if (existing) {
        const merged = Array.from(new Set([...existing.memberIds, ...memberIds]))
        store.updateStudentGroup(existing.id, { memberIds: merged })
      } else {
        const gid = `group-${courseId.value}-${Date.now()}-${imported}`
        store.addStudentGroup({
          id: gid,
          courseId: courseId.value,
          name,
          memberIds: Array.from(new Set(memberIds)),
        })
        groups.push({ id: gid, courseId: courseId.value, name, memberIds: Array.from(new Set(memberIds)) })
      }
      imported++
    }
    // 同步到 MySQL
    if (groups.length > 0) {
      try { await bulkImportGroups(groups) } catch {}
    }
    alert(`导入成功！共导入 ${imported} 个分组`)
  } catch (err) {
    console.error('Excel 导入失败:', err)
    alert('Excel 导入失败，请检查文件格式')
  }
  input.value = ''
}

// ====== 素质评价（教师端） ======
const courseQualityEvaluations = computed(() => store.getQualityEvaluationsForCourse(courseId.value || ''))

// 每个学生当前选中的提交（key: 记录 id，value: submission id；未选择时默认最后一条）
const qualitySelectedSubId = ref<Record<string, string>>({})

// 本地暂存编辑值（key: submission id，避免 @change 直接写入时丢失未保存状态）
const qualityScoreDrafts = ref<Record<string, number>>({})
const qualityCommentDrafts = ref<Record<string, string>>({})

function getQualityStudentName(studentId: string): string {
  return store.students.find((s) => s.id === studentId)?.name || ''
}

/** 获取记录当前选中的提交（默认最后一条，即最新提交） */
function getQualityCurrentSub(qe: any): any {
  if (!qe || !qe.submissions || qe.submissions.length === 0) return undefined
  const selectedId = qualitySelectedSubId.value[qe.id]
  return qe.submissions.find((s: any) => s.id === selectedId) || qe.submissions[qe.submissions.length - 1]
}

function onQualityScoreChange(submissionId: string, score: number) {
  qualityScoreDrafts.value[submissionId] = score
}

function onQualityCommentChange(submissionId: string, comment: string) {
  qualityCommentDrafts.value[submissionId] = comment
}

async function saveQualityEval(qeId: string, submissionId: string) {
  // 保护：已批改的评分不可再修改
  const qe = store.qualityEvaluations.find((q) => q.id === qeId)
  const sub = qe?.submissions.find((s) => s.id === submissionId)
  if (sub && sub.score !== undefined) {
    alert('该次提交已批改，分数不可修改')
    return
  }
  const score = qualityScoreDrafts.value[submissionId]
  if (score === undefined || score === null || Number.isNaN(score)) {
    alert('请输入有效分数（0-100）')
    return
  }
  if (score < 0 || score > 100) {
    alert('分数必须在 0-100 之间')
    return
  }
  const comment = qualityCommentDrafts.value[submissionId]
  try {
    await store.scoreQualityEvaluation(qeId, submissionId, score, comment)
    delete qualityScoreDrafts.value[submissionId]
    delete qualityCommentDrafts.value[submissionId]
    alert('批改已保存，该次素质评价分数将自动加成到学生总成绩中。保存后不可修改。')
  } catch (error) {
    alert(error instanceof Error ? error.message : '保存失败，请稍后重试')
  }
}
</script>
