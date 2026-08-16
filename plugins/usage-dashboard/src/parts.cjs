'use strict';

const PARTS = Object.freeze([
  {file:'00-runtime-core.part.js', marker:null, label:'runtime/core'},
  {file:'10-usage-data.part.js', marker:'  function recentRequestValue(row, keys, fallback = null) {', label:'usage normalization'},
  {file:'20-bridge-io.part.js', marker:'  async function fetchSnapshot() {', label:'bridge I/O'},
  {file:'30-refresh-runtime.part.js', marker:"  async function refresh(reason = 'manual', silent = false) {", label:'refresh runtime'},
  {file:'40-diagnostics.part.js', marker:'  function diagText() {', label:'diagnostics'},
  {file:'50-settings-ui.part.js', marker:'  function settingsHtml() {', label:'settings UI'},
  {file:'60-settings-runtime.part.js', marker:'  function renderSettings() {', label:'settings runtime'},
  {file:'70-floating-widget.part.js', marker:'  function widgetHtml() {', label:'floating widget'},
  {file:'80-lifecycle.part.js', marker:'  function scheduleRefresh() {', label:'lifecycle/scheduling'},
  {file:'90-bootstrap.part.js', marker:"  try {\n    store=await Risuai.getLocalPluginStorage();", label:'bootstrap/unload'}
].map((part) => Object.freeze({...part})));

module.exports = {PARTS};
