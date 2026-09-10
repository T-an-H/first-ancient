import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const sourcePath = 'E:/课程平台3/xin/outputs/excel-import-templates-20260813/01-学院导入模板.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));

console.log((await workbook.inspect({
  kind: 'workbook,sheet,table',
  maxChars: 4000,
  tableMaxRows: 10,
  tableMaxCols: 6,
})).ndjson);

console.log((await workbook.inspect({
  kind: 'computedStyle',
  sheetId: '学院',
  range: 'A1:B3',
  maxChars: 4000,
})).ndjson);

const preview = await workbook.render({
  sheetName: '学院',
  range: 'A1:B3',
  scale: 2,
  format: 'png',
});
await fs.writeFile('E:/课程平台3/xin/.codex-build/department-color-template/before.png', new Uint8Array(await preview.arrayBuffer()));
