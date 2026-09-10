<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">我的课程</h1>
      <p class="text-gray-400 mt-1">管理课程、查看学员进度和评价</p>
    </div>

    <!-- 搜索栏 -->
    <div class="relative">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索课程名称…"
        class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none transition-all"
      />
    </div>

    <!-- 课程卡片网格：放大版，任何版面仅左右 2 张 -->
    <div class="grid grid-cols-2 gap-6">
      <div
        v-for="course in sortedAndFilteredCourses" :key="course.id"
        @click="goDetail(course.id)"
        :class="[
          'group bg-white rounded-xl border shadow-sm transition-all duration-200 overflow-hidden cursor-pointer',
          course.status === 'active'
            ? 'border-brand-400/20 hover:shadow-lg'
            : 'border-brand-400/30 opacity-60 hover:opacity-70'
        ]"
      >
        <!-- 渐变顶栏（无封面图，只做颜色区分） -->
        <div class="relative h-[160px]" :style="{ background: getCourseGradient(course.id) }">
          <!-- 已结束水印 -->
          <div v-if="course.status !== 'active'" class="absolute inset-0 flex items-center justify-center">
            <span class="text-white/50 text-lg font-bold tracking-widest -rotate-12 select-none">已结束</span>
          </div>

          <!-- 待评价红点标记（点击可溯源到评论管理） -->
          <button
            v-if="hasPendingEval(course.id)"
            @click.stop="goEval(course.id)"
            title="有未完成的评价，点击前往评论管理"
            class="absolute top-3 left-3 z-20 flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-red-500 text-white font-medium shadow cursor-pointer hover:bg-red-600 transition-colors">
            <span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            待评价
          </button>

          <!-- 待配置红点标记（点击可溯源到成绩配置） -->
          <button
            v-if="isConfigPending(course.id)"
            @click.stop="goConfig(course.id)"
            title="成绩权重/评价方案尚未配置完成，点击前往成绩配置"
            class="absolute top-12 left-3 z-20 flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-amber-500 text-white font-medium shadow cursor-pointer hover:bg-amber-600 transition-colors">
            <span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            待配置
          </button>

          <!-- 素质评价待批改红点标记（点击可溯源到素质评价管理） -->
          <button
            v-if="pendingQualityCount(course.id) > 0"
            @click.stop="goQualityEval(course.id)"
            :title="`有 ${pendingQualityCount(course.id)} 名学生提交的素质评价待批改，点击前往素质评价管理`"
            class="absolute top-[84px] left-3 z-20 flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-orange-500 text-white font-medium shadow cursor-pointer hover:bg-orange-600 transition-colors">
            <span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
            素质评价待批改
          </button>

          <!-- 状态标签 - 右上角 -->
          <span :class="`absolute top-3 right-3 z-10 text-xs px-2.5 py-1 rounded-full font-medium ${
            course.status === 'active'
              ? 'bg-white/20 text-white backdrop-blur-sm'
              : 'bg-white/10 text-white/60 backdrop-blur-sm'
          }`">
            <span class="inline-block w-1.5 h-1.5 rounded-full mr-1" :class="course.status === 'active' ? 'bg-white' : 'bg-white/40'"></span>
            {{ course.status === 'active' ? '进行中' : '已结束' }}
          </span>

          <!-- 课程标题 -->
          <div class="absolute bottom-3 left-4 right-4">
            <h3 class="text-white font-bold text-2xl leading-tight truncate">{{ course.title }}</h3>
          </div>
        </div>

        <!-- 卡片内容区域 -->
        <div class="p-7 space-y-5">
          <!-- 老师名字 -->
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <User class="w-4 h-4 text-gray-400" />
            <span>授课老师：<strong>{{ course.teacher }}</strong></span>
            <span class="ml-auto text-xs text-gray-400">
              <Users class="w-3.5 h-3.5 inline mr-0.5 -mt-0.5" />
              {{ studentCount(course.id) }} 名学生
            </span>
          </div>

          <!-- 课程介绍 -->
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">课程介绍</p>
            <p class="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {{ course.description || '暂无描述' }}
            </p>
          </div>

          <!-- 课程进度 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">课程进度</span>
              <span class="text-sm font-semibold text-brand-600">{{ getCourseProgress(course.id) }}%</span>
            </div>
            <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full bg-brand-400 transition-all duration-500"
                :style="{ width: getCourseProgress(course.id) + '%' }">
              </div>
            </div>
          </div>

          <!-- AI 分层分布（与学生端 AI 分层测试结果关联） -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI 分层分布</span>
              <span class="text-[10px] text-gray-400">{{ studentCount(course.id) }} 名学生</span>
            </div>
            <div v-if="studentCount(course.id) > 0" class="flex items-center gap-6">
              <div class="relative w-[140px] h-[140px] flex-shrink-0">
                <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                  <circle v-for="seg in tierPieSegments(course.id)" :key="seg.key" cx="50" cy="50" r="40" fill="none"
                    stroke-width="18" :stroke="seg.color" :stroke-dasharray="seg.dash" :stroke-dashoffset="seg.offset" />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-3xl font-bold text-gray-800 leading-none">{{ studentCount(course.id) }}</span>
                  <span class="text-xs text-gray-400 mt-1 leading-none">学生数</span>
                </div>
              </div>
              <div class="flex-1 grid grid-cols-1 gap-y-2.5">
                <div v-for="item in tierLegend(course.id)" :key="item.label" class="flex items-center gap-2 text-sm text-gray-600">
                  <span class="w-3.5 h-3.5 rounded-sm flex-shrink-0" :style="{ background: item.color }"></span>
                  <span>{{ item.label }}</span>
                  <span class="ml-auto font-semibold text-gray-800">{{ item.count }}人</span>
                </div>
              </div>
            </div>
            <div v-else class="flex items-center justify-center py-6 rounded-lg bg-gray-50 text-sm text-gray-400">暂无学生</div>
          </div>

          <!-- 底部操作 -->
          <div class="flex items-center justify-between pt-1 border-t border-gray-100">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
              :class="course.status === 'active' ? 'bg-brand-600/10 text-gray-600 border-brand-400' : 'bg-brand-400/10 text-gray-400 border-brand-400/30'">
              <BookOpen class="w-3.5 h-3.5" />
              {{ course.status === 'active' ? '教学进行中' : '课程已结束' }}
            </span>

            <span class="inline-flex items-center gap-1 text-xs font-medium transition-colors"
              :class="course.status === 'active' ? 'text-gray-600 group-hover:text-gray-800' : 'text-gray-400'">
              {{ course.status === 'active' ? '管理课程' : '查看详情' }}
              <ArrowRight class="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>


      <div v-if="myCourses.length === 0" class="col-span-2 text-center py-16 text-gray-400">
        <BookOpen class="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p>暂无课程</p>
      </div>

<!-- Tab 1: 学员管理（已移入课程详情页） -->
      <div v-if="false"></div>

      <!-- 编辑学生弹窗 -->
      <div v-if="showEditStudent" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showEditStudent = false">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-900">编辑学生信息</h3>
            <button @click="showEditStudent = false" class="text-gray-400 hover:text-gray-600"><X class="w-4 h-4" /></button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-gray-500 block mb-1">姓名</label>
              <input v-model="editStudentForm.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label class="text-xs text-gray-500 block mb-1">学号</label>
              <input v-model="editStudentForm.studentId" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label class="text-xs text-gray-500 block mb-1">班级</label>
              <input v-model="editStudentForm.className" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div class="flex gap-2 pt-2">
              <button @click="showEditStudent = false" class="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
              <button @click="saveEditStudent" class="flex-1 px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700">保存</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑分组弹窗 -->
      <div v-if="showEditGroup" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showEditGroup = false">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-900">编辑分组</h3>
            <button @click="showEditGroup = false" class="text-gray-400 hover:text-gray-600"><X class="w-4 h-4" /></button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-gray-500 block mb-1">组名</label>
              <input v-model="editGroupForm.name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label class="text-xs text-gray-500 block mb-1">成员管理（点击切换）</label>
              <div class="max-h-40 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1">
                <div v-for="stu in availableMembersForEditGroup" :key="stu.id"
                  @click="toggleEditGroupMember(stu.id)"
                  class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm"
                  :class="editGroupForm.memberIds.includes(stu.id) ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50 text-gray-600'">
                  <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    :class="editGroupForm.memberIds.includes(stu.id) ? 'border-brand-500 bg-brand-500' : 'border-gray-300'">
                    <span v-if="editGroupForm.memberIds.includes(stu.id)" class="text-white text-[10px]">✓</span>
                  </div>
                  <span>{{ stu.name }}</span>
                  <span class="text-xs text-gray-400 ml-auto">{{ stu.studentId }}</span>
                </div>
              </div>
            </div>
            <div class="flex gap-2 pt-2">
              <button @click="showEditGroup = false" class="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
              <button @click="saveEditGroup" class="flex-1 px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700">保存</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: 课程资源 -->
      <div v-if="activeTab === 'resources'" class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-semibold text-gray-900">课程资源管理</h2>
            <p class="text-xs text-gray-400">上传的资源将在学生端课程学习页面展示</p>
          </div>
          <label class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors">
            <Upload class="w-4 h-4" />
            <span>上传文件</span>
            <input type="file" @change="handleFileUpload" class="hidden" />
          </label>
        </div>

        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="file in courseResources" :key="file.id" class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                  <FileText class="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ file.name }}</p>
                  <p class="text-xs text-gray-400">{{ formatFileSize(file.size) }} · {{ file.uploadedAt }}</p>
                </div>
              </div>
              <button @click="handleDeleteFile(file.id)" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除文件">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <div v-if="courseResources.length === 0" class="col-span-full text-center py-8 text-gray-400">暂无课程资源，点击上方按钮上传</div>
          </div>
        </div>
      </div>

      <!-- Tab 3: 评价管理 -->
      <div v-if="activeTab === 'evaluation'" class="space-y-6">
        <!-- 评价方案设置（折叠式） -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <button
            @click="showSettings = !showSettings"
            class="w-full flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <Settings class="w-5 h-5 text-gray-400" />
              <h2 class="font-semibold text-gray-900">评价方案配置</h2>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-400">
                {{ selectedConfig ? EvalTemplateLabels[selectedConfig.template] : '未配置' }} ·
                {{ selectedConfig ? EvalFrequencyLabels[selectedConfig.frequency] : '默认频率' }}
              </span>
              <span class="text-xs text-gray-400 hover:text-gray-600">{{ showSettings ? '收起 ▲' : '展开 ▼' }}</span>
            </div>
          </button>

          <div class="flex flex-wrap gap-2 mt-3 mb-1">
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
              <span v-else
                :class="`text-xs px-2.5 py-1 rounded-full border ${EvalTypeColors[t]}`">
                <Eye class="w-3 h-3 inline mr-0.5" />
                {{ EvalTypeLabels[t] }}
              </span>
            </template>
          </div>

          <template v-if="showSettings">
            <div class="border-t border-gray-100 mt-3 pt-4 space-y-4">
              <!-- 评价模板 -->
              <div>
                <p class="text-sm font-medium text-gray-700 mb-2">评价模板</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    v-for="tpl in EVAL_TEMPLATE_KEYS" :key="tpl"
                    @click="handleSetConfig({ template: tpl })"
                    :class="`text-left p-3 rounded-lg border transition-all ${selectedConfig?.template === tpl ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`"
                  >
                    <span class="text-sm font-medium text-gray-900">{{ EvalTemplateLabels[tpl] }}</span>
                    <p class="text-xs text-gray-400 mt-0.5">{{ EvalTemplateDescs[tpl] }}</p>
                    <div class="flex gap-1 mt-1">
                      <span v-for="et in TEMPLATE_EVAL_TYPES[tpl]" :key="et"
                        class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {{ EvalTypeLabels[et] }}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <!-- 评价频率 -->
              <div>
                <p class="text-sm font-medium text-gray-700 mb-2">评价频率</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    v-for="freq in EVAL_FREQUENCY_KEYS" :key="freq"
                    @click="handleSetConfig({ frequency: freq })"
                    :class="`text-left p-3 rounded-lg border transition-all ${selectedConfig?.frequency === freq ? 'border-cyan-300 bg-cyan-50' : 'border-gray-200 bg-white hover:border-gray-300'}`"
                  >
                    <span class="text-sm font-medium text-gray-900">{{ EvalFrequencyLabels[freq] }}</span>
                    <p class="text-xs text-gray-400 mt-0.5">{{ EvalFrequencyDescs[freq] }}</p>
                    <span class="text-xs text-cyan-500 mt-0.5 block">
                      共 {{ selectedCourseId ? store.getEvalSessions(selectedCourseId) : 0 }} 次评价
                    </span>
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

              <!-- 企业导师参与 -->
              <div class="flex items-center gap-3">
                <label class="text-sm font-medium text-gray-700">企业导师参与评价</label>
                <button
                  @click="handleSetConfig({ hasMentor: !selectedConfig?.hasMentor })"
                  :class="`relative w-10 h-5 rounded-full transition-colors ${selectedConfig?.hasMentor ? 'bg-emerald-400' : 'bg-gray-300'}`"
                >
                  <span :class="`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${selectedConfig?.hasMentor ? 'left-5.5' : 'left-0.5'}`" />
                </button>
                <span class="text-xs text-gray-400">
                  {{ selectedConfig?.hasMentor ? '已启用' : '已禁用' }}——
                  {{ selectedConfig?.hasMentor ? '学生端将显示企业导师评价卡片' : '学生端自动隐藏企业导师评价' }}
                </span>
              </div>

              <!-- 逾期处理规则 -->
              <div>
                <p class="text-sm font-medium text-gray-700 mb-2">逾期未评处理规则</p>
                <div class="flex gap-3">
                  <button
                    v-for="rule in OVERDUE_RULE_KEYS" :key="rule"
                    @click="handleSetConfig({ overdueRule: rule })"
                    :class="`px-4 py-2 rounded-lg border text-sm transition-all ${selectedConfig?.overdueRule === rule ? 'border-purple-300 bg-purple-50 text-purple-700 font-medium' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`"
                  >
                    {{ OverdueRuleLabels[rule] }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 异常预警 -->
        <div v-if="anomalies.length > 0" class="bg-red-50 border border-red-200 rounded-xl p-4">
          <div class="flex items-center gap-2 text-red-600 font-medium mb-2">
            <AlertTriangle class="w-5 h-5" />
            异常预警（个人自评与其他评价差异过大）
          </div>
          <div class="space-y-1">
            <p v-for="{ session, anomaly } in anomalies" :key="anomaly.id" class="text-sm text-red-500">{{ anomaly.warning }}</p>
          </div>
        </div>

        <!-- 一键批量评价 -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <ClipboardCheck class="w-5 h-5 text-gray-400" />
              <h2 class="font-semibold text-gray-900">一键等级批量评价</h2>
              <span class="text-xs text-gray-400">（为所有学生第1次评价生成教师/导师评价）</span>
            </div>
            <button @click="handleProcessOverdue"
              class="text-xs flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100">
              <RefreshCw class="w-3 h-3" />
               处理逾期个人自评
            </button>
          </div>

          <div class="flex flex-wrap gap-4">
            <template v-for="type in enabledTypes.filter(t => t === 'teacher' || t === 'mentor')" :key="type">
              <div class="flex-1 min-w-[200px] p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p class="text-sm font-medium text-gray-700 mb-2">{{ EvalTypeLabels[type] }}批量</p>
                <div class="flex flex-col gap-1.5">
                  <button
                    v-for="level in LEVEL_OPTIONS" :key="level.label"
                    @click="handleBatchEval(type, level.label)"
                    :class="`text-xs px-3 py-1.5 rounded-lg border transition-all ${level.color} hover:opacity-80`"
                  >
                    {{ level.label }} ({{ level.range[0] }}-{{ level.range[1] }}分)
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 学生评价详情 -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <Users class="w-5 h-5 text-gray-400" />
              <h2 class="font-semibold text-gray-900">学生评价详情</h2>
              <span class="text-xs text-gray-400">{{ enrolledStudents.length }}名学生 · 共{{ totalSessions }}次评价</span>
            </div>
            <select
              :value="evalTypeFilter"
              @change="evalTypeFilter = ($event.target as HTMLSelectElement).value as 'self' | 'intra_group' | 'inter_group' | 'teacher' | 'mentor' | 'all'"
              class="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white"
            >
              <option value="all">全部类型</option>
              <option v-for="t in enabledTypes" :key="t" :value="t">{{ EvalTypeLabels[t] }}</option>
            </select>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100">
                  <th class="text-left py-2 px-2 text-gray-500 font-medium">学生</th>
                  <th v-for="s in displaySessions" :key="s"
                    class="text-left py-2 px-2 text-gray-500 font-medium"
                    :colspan="filteredEvalTypes.length">
                    第{{ s }}次评价
                  </th>
                </tr>
                <tr class="border-b border-gray-100">
                  <th class="py-1 px-2"></th>
                  <template v-for="s in displaySessions" :key="s">
                    <th v-for="t in filteredEvalTypes" :key="`${s}-${t}`"
                      class="text-left py-1 px-2 text-[10px] text-gray-400 font-medium">
                      {{ EvalTypeLabels[t] }}
                    </th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <tr v-for="{ student } in enrolledStudents" :key="student!.id"
                  class="border-b border-gray-50 hover:bg-gray-50">
                  <td class="py-2 px-2 text-sm font-medium text-gray-700">{{ student!.name }}</td>
                  <template v-for="s in displaySessions" :key="s">
                    <td v-for="t in filteredEvalTypes" :key="`${student!.id}-${s}-${t}`" class="py-2 px-2">
                      <div :class="`text-xs px-2 py-1 rounded ${getScoreClass(student!.id, s, t)}`">
                        {{ getScoreDisplay(student!.id, s, t) }}
                        <AlertTriangle v-if="showAnomalyIcon(student!.id, s, t)" class="w-3 h-3 inline ml-1 text-red-400" />
                      </div>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

import {
  BookOpen, ChevronDown, ChevronUp, User, Users, ClipboardCheck,
  Search, Settings, RefreshCw, AlertTriangle, Eye, EyeOff,
  FileText, Upload, Trash2, ArrowRight, ArrowLeft, Pencil, Plus, X
} from 'lucide-vue-next'
import {
  EvalTemplateLabels, EvalTemplateDescs, TEMPLATE_EVAL_TYPES,
  EvalTypeLabels, EvalTypeColors,
  EvalFrequencyLabels, EvalFrequencyDescs, OverdueRuleLabels
} from '@/types'
import type { EvalTemplate, EvalType, Evaluation, EvalFrequency, OverdueRule, EvaluationConfig, Course } from '@/types'
import { getNow } from '@/lib/date'
import { fetchTeacherCourses, fetchStudentsPool } from '@/api'


const router = useRouter()
const route = useRoute()
const store = useAppStore()

/** 导师模式：纯导师登录，或学院领导以导师身份进入 /mentor 路由 */
const isMentor = computed(() => store.currentRole === 'mentor' || route.path.startsWith('/mentor'))
const isLeaderWithTeaching = computed(() => store.leaders.some((l) => l.name === store.currentUser && l.asTeacher))

const searchQuery = ref('')
const dbCourses = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  // 清理可能被覆盖的 localStorage 课程缓存
  const stored = localStorage.getItem('courses')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      // 如果存的是没有 title 的脏数据，清掉
      if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].title) {
        localStorage.removeItem('courses')
      }
    } catch { /* ignore */ }
  }
  try {
    const res = await fetchTeacherCourses(store.currentUser || '')
    if (res.success) {
      dbCourses.value = res.courses
      // 更新 store（即使为空也覆盖）
      store.courses = res.courses
      // 保存一份到 localStorage 用于离线展示
      if (res.courses.length > 0) {
        localStorage.setItem('courses', JSON.stringify(res.courses))
      }
    }
  } catch (e) {
    console.error('加载课程失败:', e)
  } finally {
    loading.value = false
  }
})

const sortedAndFilteredCourses = computed(() => {
  let list: Course[]
  if (dbCourses.value.length > 0) {
    list = dbCourses.value as any
  } else if (loading.value) {
    return []
  } else if (isMentor.value) {
    const mentorCourseIds = store.getMentorCourseIds(store.currentUser || '')
    list = store.courses.filter((c) => mentorCourseIds.includes(c.id))
  } else if (isLeaderWithTeaching.value) {
    list = store.getLeaderTeacherCourses(store.currentUser || '')
  } else {
    list = store.courses.filter((c) => c.teacher === store.currentUser)
  }
  // 按名称搜索
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((c) => c.title.toLowerCase().includes(q))
  }

  // 课程是否结束以管理员排课的最晚结束日期为准，数据库里的静态 status 只作为历史兼容字段。
  list = list.map((course) => ({
    ...course,
    status: store.isCourseEnded(course.id) ? 'inactive' : 'active',
  }))

  // 排序：活跃课程按名称字母先后 → 已结束放最后
  return [...list].sort((a, b) => {
    if (a.status !== 'active' && b.status === 'active') return 1
    if (a.status === 'active' && b.status !== 'active') return -1
    return a.title.localeCompare(b.title)
  })
})

const myCourses = computed(() => {
  if (isMentor.value) {
    const mentorCourseIds = store.getMentorCourseIds(store.currentUser || '')
    return store.courses.filter((c) => mentorCourseIds.includes(c.id))
  }
  if (isLeaderWithTeaching.value) {
    return store.getLeaderTeacherCourses(store.currentUser || '')
  }
  return store.courses.filter((c) => c.teacher === store.currentUser)
})

/** 根据课程 ID 分配不同的蓝色渐变配色 */
const gradients = [
  'linear-gradient(135deg, #1e3a5f, #2563eb)',
  'linear-gradient(135deg, #1e40af, #3b82f6)',
  'linear-gradient(135deg, #1e3a8a, #60a5fa)',
  'linear-gradient(135deg, #0f172a, #1e40af)',
  'linear-gradient(135deg, #1e3a5f, #3b82f6)',
  'linear-gradient(135deg, #1e40af, #60a5fa)',
  'linear-gradient(135deg, #1e3a8a, #93c5fd)',
  'linear-gradient(135deg, #0f172a, #2563eb)',
]


function getCourseGradient(courseId: string): string {
  let hash = 0
  for (let i = 0; i < courseId.length; i++) {
    hash = ((hash << 5) - hash) + courseId.charCodeAt(i)
  }
  hash |= 0
  return gradients[Math.abs(hash) % gradients.length]
}

/** 选中一门课程，用于学员管理 / 资源 / 评价面板 */
async function selectCourse(courseId: string) {
  selectedCourseId.value = courseId
  await store.syncCourseEvaluationState(courseId)
}

const ALL_EVAL_TYPES: EvalType[] = ['self', 'intra_group', 'inter_group', 'teacher', 'mentor']
const EVAL_TEMPLATE_KEYS = Object.keys(EvalTemplateLabels) as EvalTemplate[]
const EVAL_FREQUENCY_KEYS = Object.keys(EvalFrequencyLabels) as EvalFrequency[]
const OVERDUE_RULE_KEYS = Object.keys(OverdueRuleLabels) as OverdueRule[]

// 课程选择 & Tab
const selectedCourseId = ref<string | null>(null)
const activeTab = ref<'students' | 'resources' | 'evaluation'>('students')

// 分组管理状态
const showAddGroup = ref(false)
const addGroupForm = ref({ name: '', memberIds: [] as string[], className: '' })

// 一键分组弹窗状态
const showOneClickGroup = ref(false)
const oneClickGroupData = ref({ className: '', groupCount: 2 })

// 打开新建分组弹窗（预选班级）
function openAddGroupForClass(className: string) {
  addGroupForm.value = { name: '', memberIds: [], className }
  showAddGroup.value = true
}

/** 获取指定班级的学员列表 */
function getClassStudents(className: string): any[] {
  if (!selectedCourseId.value || !className) return []
  const enrolledStuIds = store.enrollments
    .filter(e => e.courseId === selectedCourseId.value && e.status !== 'dropped')
    .map(e => e.studentId)
  return store.students.filter(
    s => enrolledStuIds.includes(s.id) && s.status === 'active' && (s.className || '未分班') === className
  )
}

/** 获取指定班级的分组 */
function getGroupsForClassBlock(className: string): any[] {
  if (!selectedCourseId.value) return []
  const allGroups = store.getCourseGroups(selectedCourseId.value)
  const classStuIds = getClassStudents(className).map(s => s.id)
  return allGroups.filter(g => g.memberIds.some(mid => classStuIds.includes(mid)))
}

/** 获取指定班级的学生总数 */
function getClassStudentCount(className: string): number {
  return getClassStudents(className).length
}

/** 获取分组简短标识 */
function getGroupShortName(name: string): string {
  const m = name.match(/(\d+|第[一二三四五六七八九十]+)/)
  return m ? m[1] : name.slice(0, 2)
}

function toggleAddGroupMember(studentId: string) {
  const idx = addGroupForm.value.memberIds.indexOf(studentId)
  if (idx >= 0) {
    addGroupForm.value.memberIds.splice(idx, 1)
  } else {
    addGroupForm.value.memberIds.push(studentId)
  }
}

function saveAddGroup() {
  if (!selectedCourseId.value || !addGroupForm.value.className) return
  if (!addGroupForm.value.name.trim()) { alert('请输入组名'); return }
  if (addGroupForm.value.memberIds.length === 0) { alert('请至少选择一名成员'); return }
  store.addStudentGroup({
    id: `grp-${selectedCourseId.value}-${Date.now()}-${Math.random()}`,
    courseId: selectedCourseId.value,
    name: addGroupForm.value.name.trim(),
    memberIds: addGroupForm.value.memberIds,
  })
  showAddGroup.value = false
  addGroupForm.value = { name: '', memberIds: [], className: '' }
}

/** 一键随机分组逻辑（弹窗版） */
function handleOneClickGroup() {
  if (!selectedCourseId.value || !oneClickGroupData.value.className || oneClickGroupData.value.groupCount < 2) return
  const className = oneClickGroupData.value.className
  const groupCnt = oneClickGroupData.value.groupCount
  const block = classBlocks.value.find(b => b.className === className)
  if (!block || block.students.length === 0) { alert('该班级没有学生'); return }

  const memberIds = block.students.map(s => s.id)
  // Fisher-Yates 洗牌
  const shuffled = [...memberIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const perGroup = Math.ceil(shuffled.length / groupCnt)
  const groups: { name: string; memberIds: string[] }[] = []
  for (let g = 0; g < groupCnt; g++) {
    const start = g * perGroup
    if (start >= shuffled.length) break
    groups.push({
      name: `${className}·第${'一二三四五六七八九十'[g] || g + 1}组`,
      memberIds: shuffled.slice(start, start + perGroup),
    })
  }

  // 保留其他班级的已有分组
  const allGroups = store.getCourseGroups(selectedCourseId.value)
  const otherGroups = allGroups.filter(g =>
    !g.memberIds.some(mid => memberIds.includes(mid))
  )
  store.setCourseGroups(
    selectedCourseId.value,
    [...otherGroups, ...groups].map((g) => ({
      name: g.name,
      memberIds: g.memberIds,
    })),
  )

  showOneClickGroup.value = false
  oneClickGroupData.value = { className: '', groupCount: 2 }
  alert(`已为「${className}」成功随机分为 ${groups.length} 组`)
}

// 学员进度
const search = ref('')
const selectedCourseFilter = ref('all')

// 评价管理
const showSettings = ref(false)
const evalTypeFilter = ref<'all' | EvalType>('all')

// 计算属性
const selectedCourseData = computed(() => selectedCourseId.value ? store.courses.find((c) => c.id === selectedCourseId.value) : null)
const selectedConfig = computed(() => selectedCourseId.value ? store.evalConfigs.find((c) => c.courseId === selectedCourseId.value) : null)
const baseEnabledTypes = computed<EvalType[]>(() => selectedConfig.value ? TEMPLATE_EVAL_TYPES[selectedConfig.value.template] : [])
const totalSessions = computed(() => selectedCourseId.value ? store.getEvalSessions(selectedCourseId.value) : 1)
const courseHasGroups = computed(() => selectedCourseId.value ? store.hasGroups(selectedCourseId.value) : false)

const enabledTypes = computed(() => baseEnabledTypes.value.filter((t) => {
  if ((t === 'intra_group' || t === 'inter_group') && !courseHasGroups.value) return false
  if (t === 'mentor' && !selectedConfig.value?.hasMentor) return false
  return true
}))

const filteredEvalTypes = computed(() => enabledTypes.value.filter((t) => evalTypeFilter.value === 'all' || t === evalTypeFilter.value))

const displaySessions = computed(() => {
  const count = Math.min(totalSessions.value, 3)
  return Array.from({ length: count }, (_, i) => i + 1)
})

// 学员进度相关
const myCourseIds = computed(() => myCourses.value.map((c) => c.id))

const filteredEnrollments = computed(() => {
  return store.enrollments.filter((e) => {
    const matchCourse = selectedCourseFilter.value === 'all' || e.courseId === selectedCourseFilter.value
    const matchTeacher = myCourseIds.value.includes(e.courseId)
    return matchCourse && matchTeacher
  })
})

const displayEnrollments = computed(() => {
  return filteredEnrollments.value.filter((e) => {
    const student = store.students.find((s) => s.id === e.studentId)
    return !search.value || student?.name.includes(search.value)
  })
})

const getCourseTitle = (id: string) => store.courses.find((c) => c.id === id)?.title || '未知'
const getStudentName = (id: string) => store.students.find((s) => s.id === id)?.name || '未知'

const courseResources = computed(() => {
  if (!selectedCourseId.value) return []
  return store.getCourseCloudFiles(selectedCourseId.value)
})

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const handleFileUpload = (event: Event) => {
  if (!selectedCourseId.value) {
    alert('请先选择一门课程')
    return
  }
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  store.addCloudFile({
    id: `file-${Date.now()}`,
    name: file.name,
    size: file.size,
    type: file.type,
    dataUrl: 'https://example.com/files/' + file.name,
    uploadedAt: getNow().toISOString().split('T')[0],
    uploadedBy: store.currentUser || '教师',
    courseId: selectedCourseId.value,
  })

  target.value = ''
  alert('文件上传成功！学生可在课程学习页面查看')
}

const handleDeleteFile = (fileId: string) => {
  if (confirm('确定要删除这个文件吗？')) {
    store.deleteCloudFile(fileId)
    alert('文件已删除')
  }
}

const statusLabels: Record<string, string> = {
  enrolled: '已报名', in_progress: '学习中', completed: '已完成', dropped: '已退课',
}
const statusColors: Record<string, string> = {
  enrolled: 'bg-blue-50 text-blue-600', in_progress: 'bg-brand-50 text-brand-700',
  completed: 'bg-emerald-50 text-emerald-600', dropped: 'bg-red-50 text-red-600',
}

// 评价管理相关
const getCourseConfig = (courseId: string) => store.evalConfigs.find((c) => c.courseId === courseId)

const enrolledStudents = computed(() => {
  if (!selectedCourseId.value) return []
  return store.enrollments
    .filter((e) => e.courseId === selectedCourseId.value && e.status !== 'dropped')
    .map((e) => ({
      enrollmentId: e.id,
      student: store.students.find((s) => s.id === e.studentId),
    }))
    .filter((e) => e.student)
})

const anomalies = computed(() => {
  if (!selectedCourseId.value) return []
  const results: { session: number; anomaly: import('@/types').EvalAnomaly }[] = []
  for (let s = 1; s <= totalSessions.value; s++) {
    store.detectAnomalies(selectedCourseId.value, s).forEach((a) => results.push({ session: s, anomaly: a }))
  }
  return results
})

function studentCount(courseId: string) {
  return store.enrollments.filter((e) => e.courseId === courseId && e.status !== 'dropped').length
}

function getCourseProgress(courseId: string): number {
  const courseEnrollments = store.enrollments.filter(e => e.courseId === courseId && e.status !== 'dropped')
  if (courseEnrollments.length === 0) return 0
  const avg = courseEnrollments.reduce((sum, e) => sum + e.progress, 0) / courseEnrollments.length
  return Math.round(avg)
}

// ===== AI 分层分布（饼图） =====
const TIER_COLORS: Record<string, string> = {
  excellent: '#10b981', // 卓越层（翠绿）
  advanced: '#3b82f6',  // 进阶层（蓝）
  basic: '#f59e0b',     // 基础层（琥珀）
  untested: '#d1d5db',  // 未分层（灰）
}
const TIER_ORDER = ['excellent', 'advanced', 'basic', 'untested'] as const
const TIER_LABELS: Record<string, string> = { excellent: '卓越层', advanced: '进阶层', basic: '基础层', untested: '未分层' }

/** 统计某课程内各 AI 分层人数（关联学生端分层记录） */
function getTierDistribution(courseId: string): Record<string, number> {
  const dist: Record<string, number> = { excellent: 0, advanced: 0, basic: 0, untested: 0 }
  for (const e of store.enrollments) {
    if (e.courseId !== courseId || e.status === 'dropped') continue
    const rec = store.getStudentTier(courseId, e.studentId)
    if (rec && rec.tier in dist) dist[rec.tier]++
    else dist.untested++
  }
  return dist
}

/** 生成饼图扇区（SVG circle stroke-dasharray 方案，r=40，周长 C≈251.3） */
function tierPieSegments(courseId: string) {
  const dist = getTierDistribution(courseId)
  const total = studentCount(courseId)
  if (total === 0) return []
  const C = 2 * Math.PI * 40
  let acc = 0
  return TIER_ORDER.filter((k) => dist[k] > 0).map((k) => {
    const len = (dist[k] / total) * C
    const seg = { key: k, color: TIER_COLORS[k], dash: `${len} ${C - len}`, offset: -acc }
    acc += len
    return seg
  })
}

/** 饼图图例（含未分层，仅显示人数 > 0 的项） */
function tierLegend(courseId: string) {
  const dist = getTierDistribution(courseId)
  return TIER_ORDER.filter((k) => dist[k] > 0).map((k) => ({
    label: TIER_LABELS[k],
    color: TIER_COLORS[k],
    count: dist[k],
  }))
}

function goDetail(courseId: string) {
  router.push(`${isMentor.value ? '/mentor' : '/teacher'}/courses/${courseId}`)
}

/** 当前教师/导师是否有该课程的待完成评价（用于红点溯源） */
function hasPendingEval(courseId: string) {
  return store.hasPendingEvalForCourse(courseId)
}

/** 待评价红点溯源：直达评论管理（评价填写）tab */
function goEval(courseId: string) {
  router.push(`${isMentor.value ? '/mentor' : '/teacher'}/courses/${courseId}?tab=comments`)
}

/** 该课程是否仍有未完成的成绩权重/评价方案配置（教师/领导教师显示红点） */
function isConfigPending(courseId: string) {
  if (!store.currentUser) return false
  const course = store.courses.find((c) => c.id === courseId)
  if (!course) return false
  const canConfig = course.teacher === store.currentUser || store.isLeaderTeacherCourse(store.currentUser, courseId)
  return canConfig && store.isCourseConfigPending(courseId)
}

/** 待配置红点溯源：直达成绩配置 tab */
function goConfig(courseId: string) {
  router.push(`${isMentor.value ? '/mentor' : '/teacher'}/courses/${courseId}?tab=grade-config`)
}

/** 该课程中「最新提交尚未批改」的素质评价学生人数（授课教师/领导教师显示红点） */
function pendingQualityCount(courseId: string) {
  if (!store.currentUser) return 0
  const course = store.courses.find((c) => c.id === courseId)
  if (!course) return 0
  const canGrade = course.teacher === store.currentUser || store.isLeaderTeacherCourse(store.currentUser, courseId)
  if (!canGrade) return 0
  return store.countPendingQualitySubmissions(courseId)
}

/** 素质评价待批改红点溯源：直达素质评价管理 tab */
function goQualityEval(courseId: string) {
  router.push(`${isMentor.value ? '/mentor' : '/teacher'}/courses/${courseId}?tab=quality-eval`)
}

// ===== 评价配置 & 批量操作（模板引用，统一放在此处） =====

function handleSetConfig(partial: Partial<EvaluationConfig>) {
  if (!selectedCourseId.value) return
  const existing = store.evalConfigs.find((c) => c.courseId === selectedCourseId.value)
  const config: EvaluationConfig = {
    courseId: selectedCourseId.value,
    template: 'basic',
    frequency: 'weekly',
    hasMentor: false,
    overdueRule: 'average',
    ...existing,
    ...partial,
  }
  store.setEvalConfig(config)
}

function handleProcessOverdue() {
  if (!selectedCourseId.value) return
  for (let s = 1; s <= totalSessions.value; s++) {
    store.processSessionOverdue(selectedCourseId.value, s)
  }
}

const LEVEL_OPTIONS = [
  { label: '优秀', range: [90, 100], color: 'bg-green-100 text-green-700 border-green-200' },
  { label: '良好', range: [80, 89], color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: '中等', range: [70, 79], color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { label: '及格', range: [60, 69], color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { label: '不及格', range: [0, 59], color: 'bg-red-100 text-red-700 border-red-200' },
]

async function handleBatchEval(type: string, levelLabel: string) {
  if (!selectedCourseId.value) return
  const level = LEVEL_OPTIONS.find((l) => l.label === levelLabel)
  if (!level) return
  const score = Math.round((level.range[0] + level.range[1]) / 2)
  // 为所有学生批量生成该类型的第一次评价
  const cId = selectedCourseId.value
  for (const { student } of enrolledStudents.value) {
    if (!student) continue
    const exists = store.evaluations.find(
      (e) => e.courseId === cId && e.studentId === student.id && e.type === type && e.sessionNumber === 1
    )
    if (!exists) {
      store.addEvaluation({
        id: `batch-${cId}-${student.id}-${type}-${Date.now()}-${Math.random()}`,
        courseId: cId,
        studentId: student.id,
        sessionNumber: 1,
        type: type as EvalType,
        score,
        evaluatorId: store.currentUser || '',
        evaluatorName: store.currentUser || '',
        comment: `批量评价：${levelLabel}`,
        createdAt: getNow().toISOString(),
      })
    }
  }
}

function getScoreClass(studentId: string, sessionNum: number, type: string) {
  const ev = store.evaluations.find(
    (e) => e.courseId === selectedCourseId.value && e.studentId === studentId && e.sessionNumber === sessionNum && e.type === type
  )
  if (!ev) return 'bg-gray-50 text-gray-400'
  if (ev.score >= 90) return 'bg-green-50 text-green-600'
  if (ev.score >= 80) return 'bg-blue-50 text-blue-600'
  if (ev.score >= 70) return 'bg-yellow-50 text-yellow-600'
  if (ev.score >= 60) return 'bg-orange-50 text-orange-600'
  return 'bg-red-50 text-red-600'
}

function getScoreDisplay(studentId: string, sessionNum: number, type: string) {
  const ev = store.evaluations.find(
    (e) => e.courseId === selectedCourseId.value && e.studentId === studentId && e.sessionNumber === sessionNum && e.type === type
  )
  return ev ? `${ev.score}分` : '-'
}

function showAnomalyIcon(studentId: string, sessionNum: number, type: string) {
  if (!selectedCourseId.value) return false
  const anomaly = store.detectAnomalies(selectedCourseId.value, sessionNum)
    .find((a) => a.studentId === studentId && a.type === type)
  return !!anomaly
}

// ===== 学员管理相关 =====

// === 编辑学生弹窗状态 ===
const showEditStudent = ref(false)
const editStudentForm = ref({ id: '', name: '', studentId: '', className: '' })

// === 新增班级状态 ===
const showAddClass = ref(false)
const addClassForm = ref({ className: '', studentIds: [] as string[] })
/** 当前已选课程中所有未分班的分组学生 */
const enrolledStudentsForClass = computed(() => {
  if (!selectedCourseId.value) return []
  const enrolledIds = store.enrollments
    .filter(e => e.courseId === selectedCourseId.value && e.status !== 'dropped')
    .map(e => e.studentId)
  return store.students.filter(s => enrolledIds.includes(s.id) && s.status === 'active')
})
function toggleAddClassStudent(studentId: string) {
  const idx = addClassForm.value.studentIds.indexOf(studentId)
  if (idx >= 0) {
    addClassForm.value.studentIds.splice(idx, 1)
  } else {
    addClassForm.value.studentIds.push(studentId)
  }
}
function saveAddClass() {
  const className = addClassForm.value.className.trim()
  if (!className) return
  // 将选中的学生的 className 设置为新班级
  for (const sid of addClassForm.value.studentIds) {
    const stu = store.students.find(s => s.id === sid)
    if (stu) {
      store.updateStudent(sid, { className })
    }
  }
  addClassForm.value = { className: '', studentIds: [] }
  showAddClass.value = false
  alert(`已创建班级"${className}"，并分配了 ${addClassForm.value.studentIds.length} 名学生`)
}
/** Excel 导入班级信息（班级名称 + 学生分配） */
async function handleImportClass() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls,.csv'
  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0]
    if (!file || !selectedCourseId.value) return
    const XLSX = await import('xlsx')
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    let classCount = 0
    let assignedCount = 0
    for (const row of rows) {
      const className = (row['班级名称'] || row['className'] || '').toString().trim()
      if (!className) continue
      classCount++
      // 按学生姓名或学号分配
      const stuName = (row['学生姓名'] || row['name'] || '').toString().trim()
      const stuId = (row['学生学号'] || row['studentId'] || '').toString().trim()
      if (stuName || stuId) {
        const match = store.students.find(s =>
          (stuId && (s.studentId === stuId || s.id === stuId)) ||
          (stuName && s.name === stuName)
        )
        if (match) {
          store.updateStudent(match.id, { className })
          assignedCount++
        }
      } else {
        // 如果只有班级名称，将当前未分班的学生默认分入该班
        // 不自动做任何事——仅记录班级存在
      }
    }
    alert(`导入完成：共 ${classCount} 个班级，已分配 ${assignedCount} 名学生`)
  }
  input.click()
}
function openEditStudent(student: any) {
  editStudentForm.value = {
    id: student.id,
    name: student.name,
    studentId: student.studentId || '',
    className: student.className || '',
  }
  showEditStudent.value = true
}
function saveEditStudent() {
  const f = editStudentForm.value
  store.updateStudent(f.id, { name: f.name, studentId: f.studentId || undefined, className: f.className || undefined })
  showEditStudent.value = false
}
function removeStudentFromCourse(studentId: string, className: string) {
  if (!selectedCourseId.value || !confirm(`确定将 ${getStuName(studentId)} 移出该课程？`)) return
  const enrollment = store.enrollments.find(e => e.studentId === studentId && e.courseId === selectedCourseId.value)
  if (enrollment) store.deleteEnrollment(enrollment.id)
  // 同时从涉及的分组中移除
  const groups = store.getCourseGroups(selectedCourseId.value)
  groups.forEach(g => {
    if (g.memberIds.includes(studentId)) {
      store.updateStudentGroup(g.id, { memberIds: g.memberIds.filter(id => id !== studentId) })
    }
  })
}

// === 编辑分组弹窗状态 ===
const showEditGroup = ref(false)
const editGroupForm = ref({ id: '', name: '', memberIds: [] as string[] })
const availableMembersForEditGroup = computed(() => {
  if (!selectedCourseId.value) return []
  const enrolledIds = store.enrollments
    .filter(e => e.courseId === selectedCourseId.value && e.status !== 'dropped')
    .map(e => e.studentId)
  return store.students.filter(s => enrolledIds.includes(s.id) && s.status === 'active')
})
function openEditGroup(group: any) {
  editGroupForm.value = {
    id: group.id,
    name: group.name,
    memberIds: [...group.memberIds],
  }
  showEditGroup.value = true
}
function toggleEditGroupMember(studentId: string) {
  const idx = editGroupForm.value.memberIds.indexOf(studentId)
  if (idx >= 0) {
    editGroupForm.value.memberIds.splice(idx, 1)
  } else {
    editGroupForm.value.memberIds.push(studentId)
  }
}
function saveEditGroup() {
  store.updateStudentGroup(editGroupForm.value.id, {
    name: editGroupForm.value.name,
    memberIds: editGroupForm.value.memberIds,
  })
  showEditGroup.value = false
}
function deleteGroupById(groupId: string) {
  if (!confirm('确定删除该分组？')) return
  store.deleteStudentGroup(groupId)
}

/** 计算属性：将某课程的学生按班级分组 */
const classBlocks = computed(() => {
  const cId = selectedCourseId.value
  if (!cId) return []

  const enrolledStuIds = store.enrollments
    .filter(e => e.courseId === cId && e.status !== 'dropped')
    .map(e => e.studentId)

  const classMap = new Map<string, any[]>()
  store.students
    .filter(s => enrolledStuIds.includes(s.id) && s.status === 'active')
    .forEach(s => {
      const cn = s.className || '未分班'
      if (!classMap.has(cn)) classMap.set(cn, [])
      classMap.get(cn)!.push(s)
    })

  return Array.from(classMap.entries()).map(([className, students]) => ({
    className,
    students,
  }))
})

/** 通过学生 id 获取姓名（与已有 getStudentName 区分） */
const getStuName = (sid: string) => store.students.find(s => s.id === sid)?.name || sid

function getGroupsForClass(className: string) {
  if (!selectedCourseId.value) return []
  return store.getCourseGroups(selectedCourseId.value)
}

function getStuGroupName(className: string, studentId: string) {
  const groups = getGroupsForClass(className)
  for (const g of groups) {
    if (g.memberIds.includes(studentId)) return g.name
  }
  return ''
}

function isInGroup(className: string, studentId: string) {
  return !!getStuGroupName(className, studentId)
}

/** 点击学生切换分组选中状态（用于手动拖入分组） */
const selectedStudents = ref<string[]>([])
function toggleGroupMember(className: string, studentId: string) {
  const idx = selectedStudents.value.indexOf(studentId)
  if (idx >= 0) {
    selectedStudents.value.splice(idx, 1)
  } else {
    selectedStudents.value.push(studentId)
  }
}

/** Excel 导入课程信息（支持在线二次修改） */
async function handleImportCourseInfo() {
  if (!selectedCourseId.value) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls,.csv'
  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0]
    if (!file || !selectedCourseId.value) return

    const XLSX = await import('xlsx')
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    for (const row of rows) {
      const title = row['课程名称'] || row['title'] || ''
      const description = row['课程描述'] || row['description'] || ''
      const credits = parseInt(row['学分'] || row['credits']) || 0
      const duration = parseInt(row['课时'] || row['duration']) || 0
      if (!title) continue

      // 如果已选中课程，更新其信息
      store.updateCourse(selectedCourseId.value, {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(credits ? { credits } : {}),
        ...(duration ? { duration } : {}),
      })
    }
    alert('课程信息导入成功！可在课程卡片中在线修改')
  }
  input.click()
}

/** Excel 导入学员（核库：只加入总库中已有的学生，未入库名单单独提示） */
async function handleImportStudents() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls,.csv'
  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0]
    if (!file || !selectedCourseId.value) return

    const XLSX = await import('xlsx')
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    let imported = 0
    const notInRepo: string[] = []

    for (const row of rows) {
      const name = row['姓名'] || row['name'] || ''
      const studentId = row['学号'] || row['studentId'] || ''
      const className = row['班级'] || row['className'] || '未分班'
      if (!name) continue

      // 先从本地 store 找
      let stu = store.students.find(s => s.studentId === studentId || s.name === name)

      // 本地没找到，查总库
      if (!stu) {
        try {
          const keyword = studentId || name
          const repoData = await fetchStudentsPool(keyword)
          const match = (repoData.students || []).find(
            (a: any) => a.name === name || a.user_no === studentId,
          )
          if (match) {
            // 总库命中，加入本地 store
            const newId = match.ref_id || match.user_no || `stu-${Date.now()}`
            store.addStudent({
              id: newId,
              name: match.name,
              studentId: match.user_no || studentId || undefined,
              className,
              phone: match.account || '',
              email: '',
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
              joinDate: getNow().toISOString().split('T')[0],
              status: 'active',
            })
            stu = store.students.find(s => s.id === newId)!
          }
        } catch {
          // 查询失败，跳过
        }
      }

      // 仍然没找到 → 不在总库，记录提示
      if (!stu) {
        notInRepo.push(`${name}（${studentId || '无学号'}）`)
        continue
      }

      const enrolled = store.enrollments.some(e => e.studentId === stu!.id && e.courseId === selectedCourseId.value)
      if (!enrolled) {
        store.addEnrollment({
          id: `enr-${selectedCourseId.value}-${stu.id}`,
          studentId: stu.id,
          courseId: selectedCourseId.value,
          scheduleId: '',
          enrollDate: getNow().toISOString().split('T')[0],
          progress: 0,
          status: 'in_progress',
        })
      }
      imported++
    }

    if (notInRepo.length > 0) {
      alert(`成功导入 ${imported} 名学生\n\n以下 ${notInRepo.length} 名学生不在系统总库，请联系管理员添加入库：\n${notInRepo.join('、')}`)
    } else {
      alert(`成功导入 ${imported} 名学生`)
    }
  }
  input.click()
}

/** Excel 导入分组（支持在线二次修改，按班级导入） */
async function handleImportGroups() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls,.csv'
  input.onchange = async (e: any) => {
    const file = e.target?.files?.[0]
    if (!file || !selectedCourseId.value) return

    const XLSX = await import('xlsx')
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    const groups: { name: string; memberIds: string[] }[] = []

    for (const row of rows) {
      const groupName = row['组名'] || row['group'] || ''
      const memberNames = (row['成员姓名'] || row['members'] || '').toString().split(/[,，、\s]+/).filter(Boolean)
      if (!groupName || memberNames.length === 0) continue

      const memberIds = memberNames.map((n: string) => {
        const stu = store.students.find(s => s.name === n.trim())
        return stu ? stu.id : null
      }).filter(Boolean) as string[]

      if (memberIds.length > 0) {
        groups.push({ name: groupName, memberIds })
      }
    }

    if (groups.length > 0) {
      store.setCourseGroups(selectedCourseId.value, groups)
      alert(`成功导入 ${groups.length} 个分组`)
    } else {
      alert('未识别到有效分组数据，请确保 Excel 包含"组名"和"成员姓名"列')
    }
  }
  input.click()
}
</script>
