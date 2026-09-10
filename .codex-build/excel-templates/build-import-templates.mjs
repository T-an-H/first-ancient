import fs from 'node:fs/promises'
import path from 'node:path'
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool'

const projectRoot = 'E:/课程平台3/xin'
const outputDir = path.join(projectRoot, 'outputs', 'excel-import-templates-20260813')
const previewDir = path.join(projectRoot, '.codex-build', 'excel-templates', 'previews')

const templates = [
  {
    file: '01-学院导入模板.xlsx',
    sheet: '学院',
    tableName: 'DepartmentImport',
    headers: [
      { name: '学院名称', required: true, width: 22 },
      { name: '颜色', required: false, width: 16 },
    ],
    rows: [
      ['计算机学院', '#3b82f6'],
      ['信息工程学院', '#10b981'],
    ],
  },
  {
    file: '02-学院课程导入模板.xlsx',
    sheet: '课程',
    tableName: 'DepartmentCourseImport',
    headers: [
      { name: '课程名称', required: true, width: 22 },
      { name: '课程分类', required: true, width: 18 },
      { name: '教师', required: false, width: 16 },
      { name: '课程描述', required: false, width: 30 },
      { name: '学分', required: false, width: 10, numberFormat: '0.0' },
      { name: '课时', required: false, width: 10, numberFormat: '0' },
      { name: '状态', required: false, width: 12 },
    ],
    rows: [
      ['Java程序设计', '专业核心课', '张老师', 'Java基础与项目实践', 3, 48, '进行中'],
      ['数据库原理', '专业核心课', '李老师', '关系数据库设计与应用', 3, 48, '进行中'],
    ],
  },
  {
    file: '03-课程排课导入模板.xlsx',
    sheet: '排课',
    tableName: 'ScheduleImport',
    headers: [
      { name: '课程名称', required: false, width: 22 },
      { name: '教师', required: false, width: 16 },
      { name: '企业导师', required: false, width: 16 },
      { name: '班级', required: false, width: 18 },
      { name: '教室', required: false, width: 14 },
      { name: '周几', required: false, width: 12 },
      { name: '日期', required: true, width: 14, numberFormat: 'yyyy-mm-dd' },
      { name: '结束日期', required: false, width: 14, numberFormat: 'yyyy-mm-dd' },
      { name: '时间段', required: true, width: 18 },
    ],
    rows: [
      ['Java程序设计', '张老师', '王导师', '软件工程1班', 'A301', '星期二', new Date('2026-09-01T00:00:00'), new Date('2026-12-31T00:00:00'), '08:00-09:40'],
      ['Java程序设计', '李老师', '', '软件工程2班', 'A302', '星期四', new Date('2026-09-03T00:00:00'), new Date('2026-12-31T00:00:00'), '10:00-11:40'],
    ],
  },
  {
    file: '04-新增班级成员导入模板.xlsx',
    sheet: '班级成员',
    tableName: 'NewClassMemberImport',
    headers: [
      { name: '学生姓名', required: false, width: 18 },
      { name: '学生学号', required: false, width: 20, numberFormat: '@' },
    ],
    rows: [
      ['张三', '2026001001'],
      ['李四', '2026001002'],
    ],
  },
  {
    file: '05-课程学生导入模板.xlsx',
    sheet: '课程学生',
    tableName: 'CourseStudentImport',
    headers: [
      { name: '学生姓名', required: true, width: 18 },
      { name: '学生学号', required: false, width: 20, numberFormat: '@' },
    ],
    rows: [
      ['张三', '2026001001'],
      ['李四', '2026001002'],
    ],
  },
  {
    file: '06-课程分组导入模板.xlsx',
    sheet: '分组',
    tableName: 'CourseGroupImport',
    headers: [
      { name: '组名', required: true, width: 16 },
      { name: '学生1', required: true, width: 18 },
      { name: '学生2', required: false, width: 18 },
      { name: '学生3', required: false, width: 18 },
      { name: '学生4', required: false, width: 18 },
      { name: '学生5', required: false, width: 18 },
    ],
    rows: [
      ['第一组', '张三', '2026001002', '', '', ''],
      ['第二组', '王五', '赵六', '', '', ''],
    ],
  },
  {
    file: '07-成绩导入模板.xlsx',
    sheet: '成绩',
    tableName: 'ScoreImport',
    headers: [
      { name: '学生姓名', required: false, width: 18 },
      { name: '学生学号', required: false, width: 20, numberFormat: '@' },
      { name: '班级', required: false, width: 18 },
      { name: '成绩', required: true, width: 12, numberFormat: '0.0' },
    ],
    rows: [
      ['张三', '2026001001', '软件工程1班', 86],
      ['李四', '2026001002', '软件工程1班', 92],
    ],
  },
  {
    file: '08-班级信息导入模板.xlsx',
    sheet: '班级信息',
    tableName: 'ClassInfoImport',
    headers: [
      { name: '班级名称', required: true, width: 20 },
      { name: '学生姓名', required: false, width: 18 },
      { name: '学生学号', required: false, width: 20, numberFormat: '@' },
    ],
    rows: [
      ['软件工程1班', '张三', '2026001001'],
      ['软件工程1班', '李四', '2026001002'],
    ],
  },
  {
    file: '09-课程信息导入模板.xlsx',
    sheet: '课程信息',
    tableName: 'CourseInfoImport',
    headers: [
      { name: '课程名称', required: true, width: 22 },
      { name: '课程描述', required: false, width: 32 },
      { name: '学分', required: false, width: 10, numberFormat: '0.0' },
      { name: '课时', required: false, width: 10, numberFormat: '0' },
    ],
    rows: [
      ['Java程序设计', 'Java基础与项目实践', 3, 48],
    ],
  },
  {
    file: '10-学员导入模板.xlsx',
    sheet: '学员',
    tableName: 'LearnerImport',
    headers: [
      { name: '姓名', required: true, width: 18 },
      { name: '学号', required: false, width: 20, numberFormat: '@' },
      { name: '班级', required: false, width: 18 },
      { name: '手机号', required: false, width: 18, numberFormat: '@' },
      { name: '邮箱', required: false, width: 28 },
    ],
    rows: [
      ['张三', '2026001001', '软件工程1班', '13800000001', 'zhangsan@example.com'],
      ['李四', '2026001002', '软件工程1班', '13800000002', 'lisi@example.com'],
    ],
  },
  {
    file: '11-旧版课程分组导入模板.xlsx',
    sheet: '分组',
    tableName: 'LegacyCourseGroupImport',
    headers: [
      { name: '组名', required: true, width: 16 },
      { name: '成员姓名', required: true, width: 36 },
    ],
    rows: [
      ['第一组', '张三，李四'],
      ['第二组', '王五，赵六'],
    ],
  },
]

const indexRows = [
  ['01', '01-学院导入模板.xlsx', '管理员端：排课管理 > 导入学院', '按列名', '学院名称'],
  ['02', '02-学院课程导入模板.xlsx', '管理员端：选中学院 > 导入课程', '按列名', '课程名称、课程分类'],
  ['03', '03-课程排课导入模板.xlsx', '管理员端：选中课程 > 导入排课', '按列名', '日期、时间段'],
  ['04', '04-新增班级成员导入模板.xlsx', '教师端：课程详情 > 新增班级', '按列名', '学生姓名或学生学号'],
  ['05', '05-课程学生导入模板.xlsx', '教师端：课程详情 > 学生管理', '按列顺序', '第1列学生姓名'],
  ['06', '06-课程分组导入模板.xlsx', '教师端：课程详情 > 分组管理', '按列顺序', '第1列组名，第2列起为学生'],
  ['07', '07-成绩导入模板.xlsx', '教师端：课程详情 > 成绩管理', '优先按列名', '学生姓名或学号、成绩'],
  ['08', '08-班级信息导入模板.xlsx', '教师端：旧课程管理 > 班级信息', '按列名', '班级名称'],
  ['09', '09-课程信息导入模板.xlsx', '教师端：旧课程管理 > 课程信息', '按列名', '课程名称'],
  ['10', '10-学员导入模板.xlsx', '教师端：旧课程管理 > 学员导入', '按列名', '姓名'],
  ['11', '11-旧版课程分组导入模板.xlsx', '教师端：旧课程管理 > 分组导入', '按列名', '组名、成员姓名'],
]

const collectionSheetNames = [
  '01学院',
  '02学院课程',
  '03课程排课',
  '04新增班级成员',
  '05课程学生',
  '06课程分组',
  '07成绩',
  '08班级信息',
  '09课程信息',
  '10学员',
  '11旧版课程分组',
]

function columnLetter(index) {
  let value = index + 1
  let result = ''
  while (value > 0) {
    value -= 1
    result = String.fromCharCode(65 + (value % 26)) + result
    value = Math.floor(value / 26)
  }
  return result
}

function populateTemplateSheet(workbook, config, sheetName, tableName) {
  const sheet = workbook.worksheets.add(sheetName)
  const matrix = [config.headers.map((header) => header.name), ...config.rows]
  const lastColumn = columnLetter(config.headers.length - 1)
  const lastRow = matrix.length

  sheet.getRange(`A1:${lastColumn}${lastRow}`).values = matrix
  sheet.showGridLines = false
  sheet.freezePanes.freezeRows(1)

  const headerRange = sheet.getRange(`A1:${lastColumn}1`)
  headerRange.format = {
    fill: '#0F766E',
    font: { bold: true, color: '#FFFFFF' },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    wrapText: true,
    borders: { preset: 'all', style: 'thin', color: '#CBD5E1' },
  }
  headerRange.format.rowHeight = 28

  const bodyRange = sheet.getRange(`A2:${lastColumn}${lastRow}`)
  bodyRange.format = {
    fill: '#FFFFFF',
    font: { color: '#1F2937' },
    verticalAlignment: 'center',
    borders: { preset: 'all', style: 'thin', color: '#E2E8F0' },
  }
  bodyRange.format.rowHeight = 24

  for (let index = 0; index < config.headers.length; index += 1) {
    const header = config.headers[index]
    const letter = columnLetter(index)
    const columnRange = sheet.getRange(`${letter}1:${letter}${lastRow}`)
    columnRange.format.columnWidth = header.width
    if (header.numberFormat) {
      sheet.getRange(`${letter}2:${letter}${lastRow}`).format.numberFormat = header.numberFormat
    }
    if (!header.required) {
      sheet.getRange(`${letter}1`).format.fill = '#475569'
    }
  }

  const table = sheet.tables.add(`A1:${lastColumn}${lastRow}`, true, tableName)
  table.style = 'TableStyleMedium2'
  table.showFilterButton = true
  table.showBandedColumns = false

  return { sheet, lastColumn, lastRow }
}

async function buildTemplate(config) {
  const workbook = Workbook.create()
  const { lastColumn, lastRow } = populateTemplateSheet(workbook, config, config.sheet, config.tableName)

  const inspect = await workbook.inspect({
    kind: 'table',
    range: `${config.sheet}!A1:${lastColumn}${lastRow}`,
    include: 'values,formulas',
    tableMaxRows: 8,
    tableMaxCols: 12,
    maxChars: 4000,
  })

  const errors = await workbook.inspect({
    kind: 'match',
    searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
    options: { useRegex: true, maxResults: 50 },
    summary: `${config.file} formula error scan`,
  })

  const preview = await workbook.render({
    sheetName: config.sheet,
    autoCrop: 'all',
    scale: 1.5,
    format: 'png',
  })
  await fs.writeFile(
    path.join(previewDir, config.file.replace(/\.xlsx$/i, '.png')),
    new Uint8Array(await preview.arrayBuffer()),
  )

  const output = await SpreadsheetFile.exportXlsx(workbook)
  await output.save(path.join(outputDir, config.file))

  return {
    file: config.file,
    sheet: config.sheet,
    inspect: inspect.ndjson,
    errors: errors.ndjson,
  }
}

async function buildCollection() {
  const workbook = Workbook.create()
  const indexSheet = workbook.worksheets.add('模板索引')
  const indexHeaders = ['编号', '模板文件', '使用入口', '读取规则', '必填要求']
  indexSheet.getRange(`A1:E${indexRows.length + 1}`).values = [indexHeaders, ...indexRows]
  indexSheet.showGridLines = false
  indexSheet.freezePanes.freezeRows(1)
  indexSheet.getRange('A1:E1').format = {
    fill: '#0F766E',
    font: { bold: true, color: '#FFFFFF' },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    borders: { preset: 'all', style: 'thin', color: '#CBD5E1' },
  }
  indexSheet.getRange('A1:E1').format.rowHeight = 28
  indexSheet.getRange(`A2:E${indexRows.length + 1}`).format = {
    fill: '#FFFFFF',
    font: { color: '#1F2937' },
    verticalAlignment: 'center',
    borders: { preset: 'all', style: 'thin', color: '#E2E8F0' },
  }
  indexSheet.getRange(`A2:E${indexRows.length + 1}`).format.rowHeight = 24
  for (const [column, width] of [['A', 8], ['B', 32], ['C', 38], ['D', 16], ['E', 32]]) {
    indexSheet.getRange(`${column}1:${column}${indexRows.length + 1}`).format.columnWidth = width
  }
  const indexTable = indexSheet.tables.add(`A1:E${indexRows.length + 1}`, true, 'ImportTemplateIndex')
  indexTable.style = 'TableStyleMedium2'
  indexTable.showFilterButton = true

  templates.forEach((config, index) => {
    populateTemplateSheet(
      workbook,
      config,
      collectionSheetNames[index],
      `${config.tableName}Collection`,
    )
  })

  const inspections = []
  for (const sheetName of ['模板索引', ...collectionSheetNames]) {
    const inspect = await workbook.inspect({
      kind: 'table',
      sheetId: sheetName,
      include: 'values,formulas',
      tableMaxRows: 14,
      tableMaxCols: 12,
      maxChars: 5000,
    })
    inspections.push({ sheetName, inspect: inspect.ndjson })

    const preview = await workbook.render({
      sheetName,
      autoCrop: 'all',
      scale: 1.5,
      format: 'png',
    })
    await fs.writeFile(
      path.join(previewDir, `00-合集-${sheetName}.png`),
      new Uint8Array(await preview.arrayBuffer()),
    )
  }

  const errors = await workbook.inspect({
    kind: 'match',
    searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
    options: { useRegex: true, maxResults: 100 },
    summary: 'Excel 导入模板合集 formula error scan',
  })

  const file = '00-Excel导入模板合集.xlsx'
  const output = await SpreadsheetFile.exportXlsx(workbook)
  await output.save(path.join(outputDir, file))
  return { file, sheets: inspections, errors: errors.ndjson }
}

await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(previewDir, { recursive: true })

const verification = []
for (const config of templates) {
  verification.push(await buildTemplate(config))
}

const collection = await buildCollection()

console.log(JSON.stringify({ outputDir, collection, templates: verification }, null, 2))
