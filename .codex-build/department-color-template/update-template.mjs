import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const projectDir = 'E:/课程平台3/xin';
const sourceDir = `${projectDir}/outputs/excel-import-templates-20260813`;
const outputDir = `${projectDir}/outputs/department-color-chinese-20260813`;
const colorNames = ['蓝色', '绿色', '橙色', '紫色', '青色', '粉色', '红色', '青绿色', '靛蓝色', '黄绿色'];

async function findDepartmentSheet(workbook) {
  for (const sheet of workbook.worksheets.items) {
    const used = sheet.getUsedRange(true);
    if (!used) continue;
    const values = used.values;
    const header = values[0] ?? [];
    if (header.includes('学院名称') && header.includes('颜色')) {
      return sheet;
    }
  }
  throw new Error('未找到包含“学院名称”和“颜色”列的工作表');
}

async function updateWorkbook(sourceName, outputName) {
  const workbook = await SpreadsheetFile.importXlsx(
    await FileBlob.load(path.join(sourceDir, sourceName)),
  );
  const sheet = await findDepartmentSheet(workbook);
  const used = sheet.getUsedRange(true);
  const values = used.values;
  const header = values[0] ?? [];
  const colorColumn = header.indexOf('颜色');

  const replacements = new Map([
    ['#3b82f6', '蓝色'],
    ['#10b981', '绿色'],
    ['#f59e0b', '橙色'],
    ['#8b5cf6', '紫色'],
    ['#06b6d4', '青色'],
    ['#ec4899', '粉色'],
    ['#ef4444', '红色'],
    ['#14b8a6', '青绿色'],
    ['#6366f1', '靛蓝色'],
    ['#84cc16', '黄绿色'],
  ]);

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const current = String(values[rowIndex]?.[colorColumn] ?? '').trim().toLowerCase();
    if (replacements.has(current)) {
      sheet.getCell(rowIndex, colorColumn).values = [[replacements.get(current)]];
    }
  }

  sheet.getRange(`B2:B200`).dataValidation = {
    rule: { type: 'list', values: colorNames },
  };

  await fs.mkdir(outputDir, { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  const outputPath = path.join(outputDir, outputName);
  await output.save(outputPath);

  const verification = await workbook.inspect({
    kind: 'table',
    sheetId: sheet.name,
    range: used.address ?? 'A1:B10',
    include: 'values,formulas',
    tableMaxRows: 12,
    tableMaxCols: 6,
    maxChars: 4000,
  });
  console.log(verification.ndjson);

  const errors = await workbook.inspect({
    kind: 'match',
    searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
    options: { useRegex: true, maxResults: 100 },
    maxChars: 3000,
  });
  console.log(errors.ndjson);

  const preview = await workbook.render({
    sheetName: sheet.name,
    range: used.address ?? 'A1:B10',
    scale: 2,
    format: 'png',
  });
  await fs.writeFile(
    path.join(outputDir, `${path.parse(outputName).name}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );

  return outputPath;
}

const outputs = [];
outputs.push(await updateWorkbook('01-学院导入模板.xlsx', '01-学院导入模板.xlsx'));
outputs.push(await updateWorkbook('00-Excel导入模板合集.xlsx', '00-Excel导入模板合集.xlsx'));
console.log(JSON.stringify({ outputs }, null, 2));
