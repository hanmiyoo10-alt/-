'use strict';

const PARTS = Object.freeze([
  {file:'00-runtime-core.part.js', marker:null, label:'runtime/core'},
  {file:'02-runtime-state.part.js', marker:'\n\n  function hydrateState(saved) {', label:'runtime/state + helpers'},
  {file:'04-runtime-bridge-normalize.part.js', marker:'\n  function normalizeBridgeModule(name, row) {', label:'runtime/bridge normalization'},
  {file:'06-runtime-stability.part.js', marker:'\n  function bridgeStabilitySnapshot() {', label:'runtime/stability snapshots'},
  {file:'08-runtime-product.part.js', marker:'\n\n  function bridgeRuntimeSnapshot() {', label:'runtime/product snapshots'},
  {file:'10-request-normalize.part.js', marker:'\n  function recentRequestValue(row, keys, fallback = null) {', label:'request normalization'},
  {file:'12-service-tier.part.js', marker:'\n  function normalizeServiceTierValue(value) {', label:'request/service tier fidelity'},
  {file:'14-request-ledger.part.js', marker:'\n  function requestTimestampPrecision(timestamp, sourceKey, requestNumber) {', label:'request ledger + drilldown'},
  {file:'15-request-provenance.part.js', marker:'\n  function requestAccountScopeStats(rows) {', label:'request account provenance'},
  {file:'16-usage-analytics.part.js', marker:'\n  function normalizeRequestProvenanceMetadata(raw) {', label:'usage + analytics normalization'},
  {file:'18-premium-allowance.part.js', marker:'\n  function premiumAllowanceTruth(weekly) {', label:'DevPass Premium allowance truth'},
  {file:'19-payg-account.part.js', marker:'\n  function paygAccountTruth(account) {', label:'DevPass PAYG + Auto-Reload truth'},
  {file:'20-bridge-io.part.js', marker:'\n  async function fetchSnapshot() {', label:'bridge I/O'},
  {file:'30-refresh-runtime.part.js', marker:"  async function refresh(reason = 'manual', silent = false) {", label:'refresh runtime'},
  {file:'40-diagnostics.part.js', marker:'\n  function refreshPhaseTimingText(phases = performanceRuntime.lastRefreshPhases) {', label:'diagnostics + release hardening'},
  {file:'50-dashboard-context.part.js', marker:'\n  function settingsHtml() {', label:'dashboard/context'},
  {file:'52-analytics-context.part.js', marker:"    const analyticsScopeKey = ['all','devpass','credits'].includes(String(state.analyticsScopeView)) ? String(state.analyticsScopeView) : 'all';", label:'dashboard/analytics context'},
  {file:'54-dashboard-markup.part.js', marker:'    return `<style>', label:'dashboard/markup'},
  {file:'60-settings-runtime.part.js', marker:'\n  function renderSettings() {', label:'settings runtime'},
  {file:'62-diagnostics-workspace.part.js', marker:'\n  const DIAGNOSTICS_WORKSPACE_SECTIONS = Object.freeze([', label:'diagnostics workspace + runtime weight audit'},
  {file:'70-widget-render.part.js', marker:'\n  function widgetHtml() {', label:'floating widget/render'},
  {file:'72-widget-layout.part.js', marker:'\n  const widgetWidth = (mobile = false, expanded = false) => mobile', label:'floating widget/layout'},
  {file:'74-widget-gestures.part.js', marker:'\n  async function ensureWidget() {', label:'floating widget/gestures'},
  {file:'76-widget-runtime.part.js', marker:"\n  async function renderWidget(reason = 'ui') {", label:'floating widget/runtime'},
  {file:'80-lifecycle.part.js', marker:'\n  function scheduleRefresh() {', label:'lifecycle/scheduling'},
  {file:'90-bootstrap.part.js', marker:"\n  try {\n    store=await Risuai.getLocalPluginStorage();", label:'bootstrap/unload'}
].map((part) => Object.freeze({...part})));

module.exports = {PARTS};
