import fs from 'node:fs/promises'
import path from 'node:path'
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool'

const outputDir = 'E:/课程平台3/xin/outputs/excel-import-templates-20260813'
const files = (await fs.readdir(outputDir))
  .filter((name) => name.toLowerCase().endsWith('.xlsx'))
  .sort((a, b) => a.localeCompare(b, 'zh-CN'))

const results = []
for (const file of files) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(outputDir, file)))
  const sheetResult = await workbook.inspect({ kind: 'sheet', include: 'id,name', maxChars: 4000 })
  const errorResult = await workbook.inspect({
    kind: 'match',
    searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
    options: { useRegex: true, maxResults: 100 },
    summary: `${file} exported workbook error scan`,
  })
  results.push({ file, sheets: sheetResult.ndjson, errors: errorResult.ndjson })
}

console.log(JSON.stringify(results, null, 2))
