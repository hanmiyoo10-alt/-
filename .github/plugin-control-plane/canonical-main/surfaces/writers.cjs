'use strict';

function renderWriterStatus(rows) {
  if (!rows.length) return '- `UNKNOWN`';
  return rows.map((row) => `- \`${row.id}\`: ${row.summary}`).join('\n');
}
module.exports = {renderWriterStatus};
