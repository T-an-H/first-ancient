<template>
  <div class="space-y-6">
    <template v-if="!currentDept">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">课程管理</h1>
          <p class="mt-1 text-gray-500">请选择一个学院进入课程管理</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="triggerDeptExcelImport"
            class="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
          >
            <Upload class="h-4 w-4" /> 导入Excel
          </button>
          <button
            @click="openAddDeptModal"
            class="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <Plus class="h-4 w-4" /> 添加学院
          </button>
        </div>
      </div>

      <div v-if="deptImportMsg" :class="`rounded-lg p-3 text-sm ${deptImportMsg.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`">
        {{ deptImportMsg.text }}
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="dept in departments"
          :key="dept.id"
          @click="selectDepartment(dept)"
          class="group cursor-pointer rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white" :style="{ backgroundColor: dept.color }">
              {{ dept.name[0] }}
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="truncate font-semibold text-gray-900 transition-colors group-hover:text-brand-600">{{ dept.name }}</h3>
              <p class="mt-0.5 text-xs text-gray-400">{{ getDeptCourseCount(dept.id) }} 门课程</p>
            </div>
            <ArrowRight class="h-5 w-5 flex-shrink-0 text-gray-300 transition-colors group-hover:text-brand-500" />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="!selectedCourse">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">课程管理</h1>
          <p class="mt-1 text-gray-500">
            当前学院：<span class="font-medium text-gray-700">{{ currentDeptName }}</span>
            · 点击课程查看排课信息
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="triggerCourseImport"
            class="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
          >
            <Upload class="h-4 w-4" /> 导入Excel
          </button>
          <button
            @click="openCourseModal()"
            class="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <Plus class="h-4 w-4" /> 新增课程
          </button>
          <button
            @click="switchDepartment"
            class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <RefreshCw class="h-4 w-4" /> 切换学院
          </button>
        </div>
      </div>

      <div v-if="courseImportMsg" :class="`rounded-lg p-3 text-sm ${courseImportMsg.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`">
        {{ courseImportMsg.text }}
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="course in departmentCourses"
          :key="course.id"
          @click="selectCourse(course)"
          class="group cursor-pointer rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div class="mb-3 flex items-start justify-between">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg" :style="{ backgroundColor: getCourseColor(course) }">
              <BookOpen class="h-5 w-5 text-white" />
            </div>
            <div class="flex items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusClass(course.status)">
                {{ statusLabel(course.status) }}
              </span>
              <button
                type="button"
                @click.stop="confirmDeleteCourse(course)"
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="删除课程"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
          <h3 class="font-semibold text-gray-900">{{ course.title }}</h3>
          <p class="mt-1 text-xs text-gray-400">{{ getCourseCategoryName(course) || '未分类' }}</p>
          <p class="mt-1 text-xs text-gray-400">{{ getCourseScheduleCount(course) }} 条排课</p>
        </div>

        <div v-if="departmentCourses.length === 0" class="col-span-full py-20 text-center text-gray-400">
          <BookOpen class="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p class="mb-3">该学院暂无课程</p>
          <p class="text-xs text-gray-300">请先录入课程分类和课程信息</p>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="mb-2 flex items-center gap-3">
        <button
          @click="backToCourseList"
          class="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-800"
        >
          <ArrowLeft class="h-4 w-4" /> 返回课程分类
        </button>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg" :style="{ backgroundColor: getCourseColor(selectedCourse) }">
            <BookOpen class="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ selectedCourse.title }}</h1>
            <p class="mt-1 text-gray-500">{{ courseSchedules.length }} 条排课记录</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="triggerImport"
            class="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
          >
            <Upload class="h-4 w-4" /> 导入Excel
          </button>
          <button
            @click="openAdd"
            class="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <Plus class="h-4 w-4" /> 新增排课
          </button>
        </div>
      </div>

      <div class="relative max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索教师、导师或教室..."
          class="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">课程</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">教师</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">企业导师</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">教室</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">周几</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">时间段</th>
              <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="schedule in courseSchedules"
              :key="schedule.id"
              class="transition-colors hover:bg-gray-50/50"
              :class="isConflicting(schedule) ? 'bg-red-50/50' : ''"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-900">{{ schedule.title || selectedCourse.title }}</span>
                  <span v-if="isConflicting(schedule)" class="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">冲突</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ schedule.teacher || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ schedule.mentor || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ schedule.room || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ getDayLabel(schedule) }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ schedule.timeSlot }}</td>
              <td class="px-4 py-3 text-right">
                <button @click="openEdit(schedule)" class="rounded px-2.5 py-1.5 text-xs text-blue-500 transition-colors hover:bg-blue-50">编辑</button>
                <button @click="handleDeleteSchedule(schedule)" class="ml-1 rounded px-2.5 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-50">删除</button>
              </td>
            </tr>
            <tr v-if="courseSchedules.length === 0">
              <td colspan="7" class="py-12 text-center text-sm text-gray-400">
                <CalendarX class="mx-auto mb-2 h-8 w-8 text-gray-200" />
                {{ searchText ? '没有匹配的排课记录' : '该课程暂无排课记录' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="text-xs text-gray-400">
        共 {{ allCourseSchedules.length }} 条排课记录
        <span v-if="courseConflictCount > 0" class="ml-2 text-red-500">
          当前课程存在 {{ courseConflictCount }} 组冲突
        </span>
      </div>

      <input ref="fileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="handleFileChange" />

      <div v-if="importMsg" :class="`rounded-lg p-3 text-sm ${importMsg.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`">
        {{ importMsg.text }}
      </div>

      <div v-if="showScheduleModal" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="closeScheduleModal">
        <div class="absolute inset-0 bg-black/30" @click="closeScheduleModal" />
        <div class="relative mx-4 flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-5 flex-shrink-0 text-lg font-bold text-gray-900">{{ editingSchedule ? '编辑排课' : '新增排课' }}</h3>

          <div class="flex-1 space-y-4 overflow-y-auto pr-1">
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-500">课程名称</label>
              <input :value="selectedCourse?.title" type="text" readonly class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 outline-none" />
              <p class="mt-0.5 text-[10px] text-gray-400">自动使用当前所选课程</p>
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-500">授课教师</label>
              <input v-model="scheduleForm.teacher" type="text" placeholder="输入教师姓名" class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-500">企业导师（选填）</label>
              <input v-model="scheduleForm.mentor" type="text" placeholder="输入企业导师姓名" class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1.5 block text-xs font-medium text-gray-500">开始时间</label>
                <input v-model="scheduleForm.startDate" type="date" class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium text-gray-500">结束时间</label>
                <input v-model="scheduleForm.endDate" type="date" class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1.5 block text-xs font-medium text-gray-500">总课时</label>
                <input v-model.number="scheduleForm.duration" type="number" min="1" step="1" placeholder="填写总课时" class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium text-gray-500">学分</label>
                <input v-model.number="scheduleForm.credits" type="number" min="0.5" step="0.5" placeholder="填写学分" class="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            <div v-if="dateRangeWarning" class="text-xs text-red-500">
              {{ dateRangeWarning }}
            </div>

            <div>
              <label class="mb-2 block text-xs font-medium text-gray-500">
                选择上课时间
                <span v-if="selectedSlots.length" class="ml-1 text-brand-600">已选 {{ selectedSlots.length }} 个时段</span>
              </label>
              <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-gray-200 bg-gray-50">
                      <th class="w-[72px] border-r border-gray-200 p-2 text-left font-medium text-gray-400"></th>
                      <th v-for="day in dayLabels" :key="day" class="p-2 text-center font-medium text-gray-500">{{ day }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="slot in timeSlots" :key="slot.label" class="border-b border-gray-100 last:border-b-0">
                      <td class="border-r border-gray-100 p-2 text-center text-[11px] text-gray-400">{{ slot.label }}</td>
                      <td v-for="day in dayLabels" :key="day" class="border-r border-gray-100 p-1 last:border-r-0">
                        <div
                          v-if="getSelectedSlot(dayLabels.indexOf(day), slot.start, slot.end)"
                          class="relative min-h-[36px] rounded-md border-2 border-brand-400 bg-brand-100"
                        >
                          <input
                            v-model="getSelectedSlot(dayLabels.indexOf(day), slot.start, slot.end)!.room"
                            @click.stop
                            placeholder="地点（选填）"
                            class="h-full min-h-[32px] w-full bg-transparent text-center text-[11px] text-brand-700 outline-none placeholder:text-brand-300"
                          />
                        </div>
                        <div
                          v-else
                          @click="handleSlotClick(day, slot)"
                          class="relative flex min-h-[36px] cursor-pointer select-none items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-[11px] leading-tight text-gray-300 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-500"
                        >
                          +
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="selectedSlots.length" class="mt-2 space-y-1">
                <div class="text-xs text-gray-400">已选时段：</div>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(slot, index) in selectedSlots"
                    :key="`${slot.dayLabel}-${slot.start}-${slot.end}`"
                    class="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs text-brand-700"
                  >
                    {{ slot.dayLabel }} {{ slot.start }}-{{ slot.end }}
                    <span v-if="slot.room" class="font-medium">{{ slot.room }}</span>
                    <button @click="selectedSlots.splice(index, 1)" class="text-brand-400 hover:text-brand-600">
                      <X class="h-3 w-3" />
                    </button>
                  </span>
                </div>
              </div>
            </div>

            <div v-if="conflictWarning" class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle class="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p class="mb-0.5 font-medium">排课冲突</p>
                <p>{{ conflictWarning }}</p>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-2">
            <button @click="closeScheduleModal" class="rounded-lg px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50">取消</button>
            <button
              @click="handleSaveSchedule"
              :disabled="!canSaveSchedule"
              class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {{ editingSchedule ? '保存修改' : '确认添加' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <input ref="courseFileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="handleCourseFileChange" />
    <input ref="deptFileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="handleDeptFileSelect" />

    <Teleport to="body">
      <div v-if="showDeptModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showDeptModal = false" />
        <div class="relative mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <h3 class="mb-4 text-lg font-semibold text-gray-900">添加学院</h3>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">学院名称</label>
              <input v-model="deptForm.name" type="text" placeholder="如：计算机学院" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">颜色</label>
              <div class="flex items-center gap-3">
                <span
                  class="h-10 w-10 flex-shrink-0 rounded border border-gray-200"
                  :style="{ backgroundColor: deptForm.color }"
                />
                <select
                  v-model="deptForm.color"
                  class="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option v-for="color in DEPARTMENT_COLOR_OPTIONS" :key="color.value" :value="color.value">
                    {{ color.name }}
                  </option>
                </select>
              </div>
            </div>
            <div class="flex gap-3 pt-2">
              <button @click="handleSaveDept" :disabled="!deptForm.name.trim()" class="flex-1 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">保存</button>
              <button @click="showDeptModal = false" class="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200">取消</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeptImportModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showDeptImportModal = false" />
        <div class="relative mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <h3 class="mb-2 text-lg font-semibold text-gray-900">从 Excel 导入学院</h3>
          <p class="mb-4 text-sm text-gray-500">Excel 文件需要包含“学院名称”列，可选“颜色”列；颜色请填写中文名称。</p>

          <div class="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p class="mb-2 text-xs text-blue-600">没有模板？先下载一个标准模板：</p>
            <button @click="downloadDeptTemplate" class="rounded bg-blue-500 px-3 py-1.5 text-xs text-white transition-colors hover:bg-blue-600">下载模板</button>
          </div>

          <div
            @click="deptFileInput?.click()"
            @dragover.prevent
            @drop.prevent="handleDeptDrop"
            class="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30"
          >
            <Upload class="mx-auto mb-2 h-10 w-10 text-gray-300" />
            <p class="mb-1 text-sm text-gray-600">{{ deptImportFile?.name || '点击选择或拖拽 Excel 文件到此处' }}</p>
            <p class="text-xs text-gray-400">支持 .xlsx 和 .xls 格式</p>
          </div>

          <div class="mt-4 flex gap-3 border-t pt-4">
            <button @click="showDeptImportModal = false" class="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200">取消</button>
            <button @click="confirmDeptImport" :disabled="!deptImportFile" class="flex-1 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">确认导入</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showCourseModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeCourseModal" />
        <div class="relative mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <h3 class="mb-4 text-lg font-semibold text-gray-900">新增课程</h3>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">课程名称<span class="text-red-500">*</span></label>
              <input v-model="courseForm.title" type="text" placeholder="如：数据结构" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">所属分类<span class="text-red-500">*</span></label>
              <select v-model="courseForm.categoryId" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">请选择分类</option>
                <option v-for="category in departmentCategoryOptions" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">授课教师</label>
              <select v-model="courseForm.teacher" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">暂不指定</option>
                <option v-for="teacher in departmentTeacherOptions" :key="teacher.id" :value="teacher.name">
                  {{ teacher.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">课程简介</label>
              <textarea v-model="courseForm.description" rows="3" placeholder="介绍课程内容、目标等" class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"></textarea>
            </div>
            <div class="flex gap-3 pt-2">
              <button @click="handleSaveCourse" :disabled="!canSaveCourse" class="flex-1 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">保存</button>
              <button @click="closeCourseModal" class="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200">取消</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarX,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-vue-next'
import * as XLSX from 'xlsx'
import {
  bulkImportSchedules,
  createCourse,
  createDepartment,
  deleteCourse,
  deleteSchedule,
  fetchCategories,
  fetchCourses,
  fetchDepartments,
  fetchSchedules,
  fetchTeachers,
  updateCourse,
  updateSchedule,
} from '@/api'
import { useAppStore } from '@/stores/app'
import type { Category, Course, Department, Schedule, Teacher } from '@/types'
import { DEPARTMENT_COLOR_OPTIONS, resolveDepartmentColor } from '@/lib/departmentColors'

type CourseFormState = {
  title: string
  description: string
  categoryId: string
  teacher: string
}

type ScheduleFormState = {
  teacher: string
  mentor: string
  startDate: string
  endDate: string
  duration: number | ''
  credits: number | ''
}

type SlotSelection = {
  dayIdx: number
  dayLabel: string
  start: string
  end: string
  room: string
}

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const departments = ref<Department[]>([...store.departments])
const categories = ref<Category[]>([...store.categories])
const courses = ref<Course[]>([...store.courses])
const teachers = ref<Teacher[]>([...store.teachers])
const dbSchedules = ref<Schedule[]>([])

const selectedCourse = ref<Course | null>(null)
const searchText = ref('')

const showDeptModal = ref(false)
const deptForm = ref({ name: '', color: '#3b82f6' })

const showDeptImportModal = ref(false)
const deptImportFile = ref<File | null>(null)
const deptImportMsg = ref<{ success: boolean; text: string } | null>(null)
const deptFileInput = ref<HTMLInputElement>()

const showCourseModal = ref(false)
const courseForm = ref<CourseFormState>({
  title: '',
  description: '',
  categoryId: '',
  teacher: '',
})

const showScheduleModal = ref(false)
const editingSchedule = ref<Schedule | null>(null)
const scheduleForm = ref<ScheduleFormState>(createScheduleFormState(null))
const selectedSlots = ref<SlotSelection[]>([])

const courseFileInput = ref<HTMLInputElement>()
const courseImportMsg = ref<{ success: boolean; text: string } | null>(null)

const fileInput = ref<HTMLInputElement>()
const importMsg = ref<{ success: boolean; text: string } | null>(null)
const hasLoadedMasterData = ref(false)

const presetColors = DEPARTMENT_COLOR_OPTIONS.map((color) => color.value)
const routeDepartmentId = computed(() => (typeof route.query.departmentId === 'string' ? route.query.departmentId : ''))
const routeCategoryId = computed(() => (typeof route.query.categoryId === 'string' ? route.query.categoryId : ''))
const routeCourseId = computed(() => (typeof route.query.courseId === 'string' ? route.query.courseId : ''))
const departmentList = computed(() => (departments.value.length > 0 ? departments.value : store.departments))
const activeDepartmentId = computed(() => routeDepartmentId.value || store.selectedDepartmentId || '')

const currentDept = computed(() => {
  if (!activeDepartmentId.value) return null
  return departmentList.value.find((department) => department.id === activeDepartmentId.value) || null
})

const currentDeptName = computed(() => currentDept.value?.name || '')

const departmentCategoryOptions = computed(() => {
  if (!currentDept.value) return []
  return categories.value.filter((category) => category.departmentId === currentDept.value?.id)
})

const departmentTeacherOptions = computed(() => {
  if (!currentDept.value) return []
  return teachers.value.filter((teacher) => teacher.departmentId === currentDept.value?.id)
})

const departmentCourses = computed(() => {
  if (!currentDept.value) return []
  const categoryIds = new Set(departmentCategoryOptions.value.map((category) => category.id))
  return courses.value
    .filter((course) => course.departmentId === currentDept.value?.id || categoryIds.has(course.categoryId))
    .sort((left, right) => left.title.localeCompare(right.title, 'zh-Hans-CN'))
})

const allSchedules = computed(() => dbSchedules.value)

const allCourseSchedules = computed(() => {
  if (!selectedCourse.value) return []
  return allSchedules.value.filter((schedule) => {
    return schedule.courseId === selectedCourse.value?.id || (schedule.title || '') === selectedCourse.value?.title
  })
})

const courseSchedules = computed(() => {
  let result = allCourseSchedules.value
  const keyword = searchText.value.trim().toLowerCase()
  if (keyword) {
    result = result.filter((schedule) => {
      return (
        (schedule.teacher || '').toLowerCase().includes(keyword) ||
        (schedule.mentor || '').toLowerCase().includes(keyword) ||
        (schedule.room || '').toLowerCase().includes(keyword) ||
        getDayLabel(schedule).includes(keyword)
      )
    })
  }
  return result
})

const courseConflictCount = computed(() => {
  let total = 0
  const list = allCourseSchedules.value
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const left = list[i]
      const right = list[j]
      if (getDayLabel(left) !== getDayLabel(right)) continue
      if (!timesOverlap(left.timeSlot, right.timeSlot)) continue

      const sameTeacher = normalizeScheduleOptionalValue(left.teacher) && normalizeScheduleOptionalValue(left.teacher) === normalizeScheduleOptionalValue(right.teacher)
      const sameRoom = normalizeScheduleOptionalValue(left.room) && normalizeScheduleOptionalValue(left.room) === normalizeScheduleOptionalValue(right.room)

      if (sameTeacher || sameRoom) {
        total += 1
      }
    }
  }
  return total
})

const canSaveCourse = computed(() => {
  return Boolean(courseForm.value.title.trim() && courseForm.value.categoryId)
})

const dateRangeWarning = computed(() => {
  if (!scheduleForm.value.startDate || !scheduleForm.value.endDate) return ''
  return scheduleForm.value.endDate < scheduleForm.value.startDate ? '结束时间不能早于开始时间' : ''
})

const canSaveSchedule = computed(() => {
  return Boolean(
    selectedCourse.value &&
    scheduleForm.value.teacher.trim() &&
    scheduleForm.value.startDate &&
    scheduleForm.value.endDate &&
    !dateRangeWarning.value &&
    typeof scheduleForm.value.duration === 'number' &&
    scheduleForm.value.duration > 0 &&
    typeof scheduleForm.value.credits === 'number' &&
    scheduleForm.value.credits > 0 &&
    selectedSlots.value.length > 0,
  )
})

const conflictWarning = computed(() => {
  const teacherName = normalizeScheduleOptionalValue(scheduleForm.value.teacher)
  if (!selectedCourse.value || !teacherName || selectedSlots.value.length === 0) return ''

  for (const slot of selectedSlots.value) {
    const timeSlot = `${slot.start}-${slot.end}`
    const conflict = dbSchedules.value.some((schedule) => {
      if (editingSchedule.value && schedule.id === editingSchedule.value.id) return false
      if (getDayLabel(schedule) !== slot.dayLabel) return false
      if (normalizeScheduleOptionalValue(schedule.teacher) !== teacherName) return false
      return timesOverlap(schedule.timeSlot, timeSlot)
    })

    if (conflict) {
      return `「${teacherName}」在 ${slot.dayLabel} ${timeSlot} 已有排课`
    }
  }

  return ''
})

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const timeSlots = [
  { label: '08:00-10:00', start: '08:00', end: '10:00' },
  { label: '10:15-12:15', start: '10:15', end: '12:15' },
  { label: '14:00-16:00', start: '14:00', end: '16:00' },
  { label: '16:15-18:15', start: '16:15', end: '18:15' },
  { label: '19:00-21:00', start: '19:00', end: '21:00' },
]

onMounted(() => {
  syncDepartmentFromRoute()
  void reloadPageData()
})

watch(
  () => routeDepartmentId.value,
  () => {
    syncDepartmentFromRoute()
  },
  { immediate: true },
)

watch(
  () => [
    activeDepartmentId.value,
    routeCourseId.value,
    courses.value.map((course) => `${course.id}:${course.departmentId}:${course.categoryId}`).join('|'),
  ].join('||'),
  () => {
    syncSelections()
  },
  { immediate: true },
)

async function reloadPageData() {
  await Promise.all([loadMasterData(), loadSchedules()])
}

function syncDepartmentFromRoute() {
  if (routeDepartmentId.value && routeDepartmentId.value !== store.selectedDepartmentId) {
    store.setSelectedDepartment(routeDepartmentId.value)
  }
}

function resolveFetchedList<T>(incoming: T[] | undefined, fallback: T[]) {
  if (Array.isArray(incoming) && incoming.length > 0) {
    return incoming
  }
  return fallback
}

async function loadMasterData() {
  try {
    const [departmentRes, categoryRes, courseRes, teacherRes] = await Promise.all([
      fetchDepartments(),
      fetchCategories(),
      fetchCourses(),
      fetchTeachers(),
    ])

    if (departmentRes.success) {
      const nextDepartments = resolveFetchedList(departmentRes.departments, departmentList.value)
      departments.value = nextDepartments
      store.departments = nextDepartments
    }

    if (categoryRes.success) {
      const nextCategories = resolveFetchedList(categoryRes.categories, categories.value.length > 0 ? categories.value : store.categories)
      categories.value = nextCategories
      store.categories = nextCategories
    }

    if (courseRes.success) {
      const nextCourses = resolveFetchedList(courseRes.courses, courses.value.length > 0 ? courses.value : store.courses)
      courses.value = nextCourses
      store.courses = nextCourses
    }

    if (teacherRes.success) {
      const nextTeachers = resolveFetchedList(teacherRes.teachers, teachers.value.length > 0 ? teachers.value : store.teachers)
      teachers.value = nextTeachers
      store.teachers = nextTeachers
    }

    syncSelections()
  } catch (error) {
    console.error('加载课程管理基础数据失败:', error)
  } finally {
    hasLoadedMasterData.value = true
  }
}

async function loadSchedules() {
  try {
    const result = await fetchSchedules()
    dbSchedules.value = result.success ? result.schedules : []
  } catch (error) {
    dbSchedules.value = []
    console.error('加载排课失败:', error)
  }
}

function syncSelections() {
  if (
    activeDepartmentId.value &&
    departmentList.value.length > 0 &&
    !departmentList.value.some((department) => department.id === activeDepartmentId.value)
  ) {
    selectedCourse.value = null
    store.setSelectedDepartment(null)
    void router.replace({ query: {} })
  }

  if (routeCourseId.value) {
    const routedCourse = departmentCourses.value.find((course) => course.id === routeCourseId.value) || null
    if (routedCourse) {
      selectedCourse.value = routedCourse
      return
    }

    if (!hasLoadedMasterData.value) {
      return
    }

    selectedCourse.value = null
    void router.replace({
      query: {
        ...(activeDepartmentId.value ? { departmentId: activeDepartmentId.value } : {}),
        ...(routeCategoryId.value ? { categoryId: routeCategoryId.value } : {}),
      },
    })
    return
  }

  if (selectedCourse.value) {
    const refreshedCourse = departmentCourses.value.find((course) => course.id === selectedCourse.value?.id) || null
    selectedCourse.value = refreshedCourse
  }
}

function selectDepartment(department: Department) {
  store.setSelectedDepartment(department.id)
  void router.replace({
    query: {
      departmentId: department.id,
    },
  })
}

function switchDepartment() {
  selectedCourse.value = null
  store.setSelectedDepartment(null)
  void router.push('/admin')
}

function getDeptCourseCount(departmentId: string) {
  return courses.value.filter((course) => course.departmentId === departmentId).length
}

function getCourseColor(course: Course | null) {
  if (!course) return '#3b82f6'
  return categories.value.find((category) => category.id === course.categoryId)?.color || '#3b82f6'
}

function getCourseCategoryName(course: Course) {
  return categories.value.find((category) => category.id === course.categoryId)?.name || ''
}

function getCourseScheduleCount(course: Course) {
  return allSchedules.value.filter((schedule) => schedule.courseId === course.id || (schedule.title || '') === course.title).length
}

function statusLabel(status: string) {
  if (status === 'active') return '进行中'
  if (status === 'inactive') return '已结束'
  return '草稿'
}

function statusClass(status: string) {
  if (status === 'active') return 'bg-green-50 text-green-600'
  if (status === 'inactive') return 'bg-gray-100 text-gray-500'
  return 'bg-yellow-50 text-yellow-600'
}

function selectCourse(course: Course) {
  selectedCourse.value = course
  searchText.value = ''
  void router.replace({
    query: {
      departmentId: course.departmentId,
      categoryId: course.categoryId,
      courseId: course.id,
    },
  })
}

function backToCourseList() {
  const departmentId = activeDepartmentId.value || selectedCourse.value?.departmentId || ''
  const categoryId = selectedCourse.value?.categoryId || routeCategoryId.value

  selectedCourse.value = null
  searchText.value = ''
  void router.push({
    path: '/admin/categories',
    query: {
      ...(departmentId ? { departmentId } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
  })
}

function confirmDeleteCourse(course: Course) {
  if (!window.confirm(`确定要删除“${course.title}”吗？删除后会一并移除该课程下的排课。`)) {
    return
  }

  void (async () => {
    try {
      await deleteCourse(course.id)
      if (selectedCourse.value?.id === course.id) {
        selectedCourse.value = null
      }
      await reloadPageData()
    } catch (error: any) {
      window.alert(error?.message || '删除课程失败')
    }
  })()
}

function createCourseFormState(): CourseFormState {
  return {
    title: '',
    description: '',
    categoryId: '',
    teacher: '',
  }
}

function openCourseModal() {
  courseForm.value = createCourseFormState()
  courseForm.value.categoryId = departmentCategoryOptions.value[0]?.id || ''
  showCourseModal.value = true
}

function closeCourseModal() {
  showCourseModal.value = false
  courseForm.value = createCourseFormState()
}

async function handleSaveCourse() {
  if (!currentDept.value || !canSaveCourse.value) return

  const targetCategory = categories.value.find((category) => category.id === courseForm.value.categoryId)
  if (!targetCategory) {
    courseImportMsg.value = { success: false, text: '请选择有效的课程分类' }
    return
  }

  try {
    await createCourse({
      title: courseForm.value.title.trim(),
      description: courseForm.value.description.trim(),
      categoryId: targetCategory.id,
      departmentId: currentDept.value.id,
      teacher: courseForm.value.teacher,
      status: 'active',
    })
    closeCourseModal()
    await loadMasterData()
  } catch (error: any) {
    courseImportMsg.value = { success: false, text: error?.message || '保存课程失败' }
  }
}

function triggerCourseImport() {
  courseFileInput.value?.click()
}

function resolveImportCourseCategory(row: Record<string, any>) {
  const rawCategoryId = String(row['分类ID'] || row['categoryId'] || '').trim()
  const rawCategoryName = String(row['课程分类'] || row['分类'] || row['category'] || row['categoryName'] || '').trim()

  if (rawCategoryId) {
    const matched = departmentCategoryOptions.value.find((category) => category.id === rawCategoryId)
    if (matched) return matched.id
  }

  if (rawCategoryName) {
    const matched = departmentCategoryOptions.value.find((category) => category.name === rawCategoryName)
    if (matched) return matched.id
  }

  if (departmentCategoryOptions.value.length === 1) {
    return departmentCategoryOptions.value[0].id
  }

  return ''
}

async function handleCourseFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !currentDept.value) return

  courseImportMsg.value = null

  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      courseImportMsg.value = { success: false, text: 'Excel 文件为空，请检查文件内容' }
      return
    }

    let added = 0
    let skipped = 0

    for (const row of rows) {
      const title = String(row['课程名称'] || row['title'] || row['课程'] || '').trim()
      const categoryId = resolveImportCourseCategory(row)
      const teacher = String(row['教师'] || row['teacher'] || row['授课教师'] || '').trim()

      if (!title || !categoryId) {
        skipped += 1
        continue
      }

      try {
        await createCourse({
          title,
          description: String(row['描述'] || row['description'] || row['课程描述'] || '').trim(),
          categoryId,
          departmentId: currentDept.value.id,
          teacher,
          credits: Number(row['学分'] || row['credits'] || 0) || 0,
          duration: Number(row['课时'] || row['duration'] || 0) || 0,
          status: String(row['状态'] || '').includes('结束') ? 'inactive' : 'active',
        })
        added += 1
      } catch {
        skipped += 1
      }
    }

    if (added === 0) {
      courseImportMsg.value = { success: false, text: `未能导入课程（跳过 ${skipped} 行）：请检查课程名称和分类列` }
      return
    }

    courseImportMsg.value = { success: true, text: `成功导入 ${added} 门课程${skipped ? `，跳过 ${skipped} 行` : ''}` }
    await loadMasterData()
  } catch (error: any) {
    courseImportMsg.value = { success: false, text: '导入失败：' + (error?.message || '未知错误') }
  } finally {
    if (courseFileInput.value) {
      courseFileInput.value.value = ''
    }
  }
}

function normalizeScheduleOptionalValue(value?: string | null) {
  const normalized = String(value ?? '').trim()
  return normalized === '未指定' ? '' : normalized
}

function timesOverlap(left: string, right: string) {
  const [leftStart, leftEnd] = left.split('-')
  const [rightStart, rightEnd] = right.split('-')
  if (!leftStart || !leftEnd || !rightStart || !rightEnd) return false

  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
  }

  return toMinutes(leftStart) < toMinutes(rightEnd) && toMinutes(rightStart) < toMinutes(leftEnd)
}

function getDayLabel(schedule: Schedule) {
  if (schedule.day) return schedule.day
  if (schedule.startDate) {
    const date = new Date(schedule.startDate)
    if (!Number.isNaN(date.getTime())) {
      return dayLabels[(date.getDay() + 6) % 7]
    }
  }
  return '-'
}

function isConflicting(schedule: Schedule) {
  return dbSchedules.value.some((other) => {
    if (other.id === schedule.id) return false
    if (getDayLabel(other) !== getDayLabel(schedule)) return false

    const sameTeacher =
      normalizeScheduleOptionalValue(other.teacher) &&
      normalizeScheduleOptionalValue(other.teacher) === normalizeScheduleOptionalValue(schedule.teacher) &&
      timesOverlap(other.timeSlot, schedule.timeSlot)

    const sameRoom =
      normalizeScheduleOptionalValue(other.room) &&
      normalizeScheduleOptionalValue(other.room) === normalizeScheduleOptionalValue(schedule.room) &&
      timesOverlap(other.timeSlot, schedule.timeSlot)

    return Boolean(sameTeacher || sameRoom)
  })
}

function createScheduleFormState(course: Course | null, schedule?: Schedule | null): ScheduleFormState {
  return {
    teacher: schedule?.teacher || course?.teacher || '',
    mentor: schedule?.mentor || course?.mentor || '',
    startDate: schedule?.startDate || '',
    endDate: schedule?.endDate || '',
    duration: typeof course?.duration === 'number' && course.duration > 0 ? course.duration : '',
    credits: typeof course?.credits === 'number' && course.credits > 0 ? course.credits : '',
  }
}

function openAdd() {
  editingSchedule.value = null
  scheduleForm.value = createScheduleFormState(selectedCourse.value)
  selectedSlots.value = []
  showScheduleModal.value = true
}

function getSelectedSlot(dayIdx: number, start: string, end: string) {
  return selectedSlots.value.find((slot) => slot.dayIdx === dayIdx && slot.start === start && slot.end === end)
}

function handleSlotClick(day: string, slot: { start: string; end: string }) {
  const dayIdx = dayLabels.indexOf(day)
  const index = selectedSlots.value.findIndex((item) => item.dayIdx === dayIdx && item.start === slot.start && item.end === slot.end)

  if (index >= 0) {
    selectedSlots.value.splice(index, 1)
    return
  }

  const defaultRoom = selectedSlots.value[0]?.room || ''
  selectedSlots.value.push({
    dayIdx,
    dayLabel: day,
    start: slot.start,
    end: slot.end,
    room: defaultRoom,
  })
}

function openEdit(schedule: Schedule) {
  editingSchedule.value = schedule
  scheduleForm.value = createScheduleFormState(selectedCourse.value, schedule)

  const dayLabel = getDayLabel(schedule)
  const dayIdx = dayLabels.indexOf(dayLabel)
  const [start, end] = schedule.timeSlot.split('-')
  selectedSlots.value = []
  if (dayIdx >= 0 && start && end) {
    selectedSlots.value.push({
      dayIdx,
      dayLabel,
      start,
      end,
      room: schedule.room || '',
    })
  }

  showScheduleModal.value = true
}

function closeScheduleModal() {
  showScheduleModal.value = false
  editingSchedule.value = null
  selectedSlots.value = []
}

async function persistCourseMeta(course: Course, payload: { teacher: string; mentor: string; duration: number; credits: number }) {
  const updatePayload = {
    teacher: payload.teacher,
    mentor: payload.mentor,
    duration: payload.duration,
    credits: payload.credits,
  }

  await updateCourse(course.id, updatePayload)
}

async function handleSaveSchedule() {
  if (!selectedCourse.value || !canSaveSchedule.value) return

  const course = selectedCourse.value
  const teacher = scheduleForm.value.teacher.trim()
  const mentor = scheduleForm.value.mentor.trim()
  const duration = Number(scheduleForm.value.duration)
  const credits = Number(scheduleForm.value.credits)

  try {
    await persistCourseMeta(course, { teacher, mentor, duration, credits })

    if (editingSchedule.value) {
      const slot = selectedSlots.value[0]
      await updateSchedule(editingSchedule.value.id, {
        courseId: course.id,
        title: course.title,
        teacher,
        mentor,
        day: slot.dayLabel,
        room: slot.room.trim(),
        startDate: scheduleForm.value.startDate,
        endDate: scheduleForm.value.endDate,
        timeSlot: `${slot.start}-${slot.end}`,
      })
    } else {
      const payload = selectedSlots.value.map((slot) => ({
        courseId: course.id,
        title: course.title,
        teacher,
        mentor,
        day: slot.dayLabel,
        room: slot.room.trim(),
        startDate: scheduleForm.value.startDate,
        endDate: scheduleForm.value.endDate,
        timeSlot: `${slot.start}-${slot.end}`,
      }))
      await bulkImportSchedules(payload)
    }

    closeScheduleModal()
    await reloadPageData()
  } catch (error: any) {
    window.alert(error?.message || '保存排课失败')
  }
}

async function handleDeleteSchedule(schedule: Schedule) {
  if (!window.confirm(`确定要删除「${schedule.title || selectedCourse.value?.title}」在 ${getDayLabel(schedule)} ${schedule.timeSlot} 的排课吗？`)) {
    return
  }

  try {
    await deleteSchedule(schedule.id)
    await loadSchedules()
  } catch (error: any) {
    window.alert(error?.message || '删除排课失败')
  }
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !selectedCourse.value) return

  importMsg.value = null

  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      importMsg.value = { success: false, text: 'Excel 文件为空，请检查文件内容' }
      return
    }

    const schedules = rows
      .map((row) => {
        const title = String(row['课程名称'] || row['title'] || row['课程'] || selectedCourse.value?.title || '').trim()
        const teacher = String(row['教师'] || row['teacher'] || row['授课教师'] || '').trim()
        const mentor = String(row['企业导师'] || row['mentor'] || row['导师'] || '').trim()
        const room = String(row['教室'] || row['room'] || '').trim()
        const day = String(row['周几'] || row['星期'] || row['星期几'] || row['day'] || '').trim()
        const startDate = fmtExcelDate(row['日期'] || row['startDate'] || row['上课日期'] || '')
        const endDate = fmtExcelDate(row['结束日期'] || row['endDate'] || '') || startDate
        const timeSlot = String(row['时间段'] || row['timeSlot'] || row['时间'] || '').trim()
        const className = String(row['班级'] || row['className'] || row['class_name'] || '').trim()

        if (!title || !timeSlot || !startDate) return null

        return {
          courseId: selectedCourse.value?.id,
          title,
          teacher,
          mentor,
          room,
          className,
          day,
          startDate,
          endDate,
          timeSlot,
        }
      })
      .filter(Boolean)

    if (schedules.length === 0) {
      importMsg.value = { success: false, text: '未能从 Excel 中解析到有效排课数据，请检查列名是否正确' }
      return
    }

    await bulkImportSchedules(schedules)
    await reloadPageData()
    importMsg.value = { success: true, text: `成功导入 ${schedules.length} 条排课记录` }
  } catch (error: any) {
    importMsg.value = { success: false, text: '导入失败：' + (error?.message || '未知错误') }
  } finally {
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

function fmtExcelDate(value: string | number) {
  if (!value) return ''
  if (typeof value === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(value)
      const month = String(date.m).padStart(2, '0')
      const day = String(date.d).padStart(2, '0')
      return `${date.y}-${month}-${day}`
    } catch {
      return String(value)
    }
  }

  const text = String(value).trim()
  let matched = text.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/)
  if (matched) {
    return `${matched[1]}-${matched[2].padStart(2, '0')}-${matched[3].padStart(2, '0')}`
  }

  matched = text.match(/^(\d{1,2})[\/\.](\d{1,2})$/)
  if (matched) {
    const year = new Date().getFullYear()
    return `${year}-${matched[1].padStart(2, '0')}-${matched[2].padStart(2, '0')}`
  }

  return text
}

function openAddDeptModal() {
  deptForm.value = { name: '', color: '#3b82f6' }
  showDeptModal.value = true
}

async function handleSaveDept() {
  const name = deptForm.value.name.trim()
  if (!name) return

  try {
    await createDepartment({
      name,
      color: deptForm.value.color,
    })
    showDeptModal.value = false
    await loadMasterData()
  } catch (error: any) {
    deptImportMsg.value = { success: false, text: error?.message || '添加学院失败' }
  }
}

function triggerDeptExcelImport() {
  deptImportFile.value = null
  deptImportMsg.value = null
  showDeptImportModal.value = true
}

function handleDeptFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    deptImportFile.value = file
  }
}

function handleDeptDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0]
  if (file) {
    deptImportFile.value = file
  }
}

async function confirmDeptImport() {
  if (!deptImportFile.value) return

  deptImportMsg.value = null

  try {
    const data = await deptImportFile.value.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      deptImportMsg.value = { success: false, text: 'Excel 文件为空，请检查文件内容' }
      return
    }

    let added = 0
    let skipped = 0

    for (const row of rows) {
      const name = String(row['学院名称'] || row['院系'] || row['系'] || row['name'] || '').trim()
      const color = String(row['颜色'] || row['color'] || '').trim()

      if (!name) {
        skipped += 1
        continue
      }

      try {
        const fallbackColor = presetColors[(departments.value.length + added) % presetColors.length]
        await createDepartment({
          name,
          color: resolveDepartmentColor(color, fallbackColor),
        })
        added += 1
      } catch {
        skipped += 1
      }
    }

    if (added === 0) {
      deptImportMsg.value = { success: false, text: `未能导入学院（跳过 ${skipped} 行）：请确保包含“学院名称”列` }
      return
    }

    deptImportMsg.value = { success: true, text: `成功导入 ${added} 个学院${skipped ? `，跳过 ${skipped} 行` : ''}` }
    await loadMasterData()
    showDeptImportModal.value = false
  } catch (error: any) {
    deptImportMsg.value = { success: false, text: '导入失败：' + (error?.message || '未知错误') }
  }
}

function downloadDeptTemplate() {
  const data = [
    { 学院名称: '计算机学院', 颜色: '蓝色' },
    { 学院名称: '信息工程学院', 颜色: '绿色' },
    { 学院名称: '外国语学院', 颜色: '橙色' },
  ]
  const worksheet = XLSX.utils.json_to_sheet(data)
  worksheet['!cols'] = [{ wch: 20 }, { wch: 15 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '学院')
  XLSX.writeFile(workbook, '学院导入模板.xlsx')
}
</script>
