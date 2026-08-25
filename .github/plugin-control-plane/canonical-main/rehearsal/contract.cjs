'use strict';

const {loadPolicy, validateEvent, correlationKey, severityFor} = require('../contract.cjs');
const {previousIncidentState, buildAlertEnvelope, envelopeMarker} = require('../notification.cjs');
const policy = loadPolicy();
const REHEARSAL_ID = policy.rehearsal?.id || 'phase-h-v1';
const REASON_CODE = policy.rehearsal?.reasonCode || 'CANONICAL_MAIN_REHEARSAL';
const markerForKey = (key) => `<!-- canonical-main-correlation:${Buffer.from(key).toString('base64url')} -->`;
const markerForEvent = (eventId) => `<!-- canonical-main-event:${Buffer.from(String(eventId)).toString('base64url')} -->`;
const proofMarker = (mainSha) => `<!-- canonical-main-rehearsal-proof:${mainSha} -->`;
function buildRehearsalEvent(transition, mainSha) {
  if (!['OPEN','RECOVERED'].includes(transition)) throw new Error(`unsupported rehearsal transition: ${transition}`);
  const open = transition === 'OPEN';
  const event = {schemaVersion:1,eventId:`${REHEARSAL_ID}:${transition}:${mainSha}`,eventClass:'CONTROL_PLANE',subject:{kind:'rehearsal',id:REHEARSAL_ID},scope:['scope:repo'],authority:{kind:'rehearsal-contract',identity:REHEARSAL_ID},observation:{from:open?'CLEAR':'INCIDENT',to:open?'INCIDENT':'CLEAR',reasonCode:REASON_CODE},disposition:open?'FEEDBACK_CANDIDATE':'RECOVERY_FEEDBACK_CANDIDATE',evidence:[`rehearsal:${REHEARSAL_ID}`,`main:${mainSha}`],summary:open?'Synthetic canonical-main rehearsal incident. No production or release failure is asserted.':'Synthetic canonical-main rehearsal recovered. No production or release authority changed.'};
  const errors = validateEvent(event, policy); if (errors.length) throw new Error(`invalid rehearsal event: ${errors.join('; ')}`); return event;
}
function incidentLabels(severity,state){ return ['control-plane:incident',`incident:${state.toLowerCase()}`,`severity:${severity}`,'scope:repo'].sort(); }
function renderIncidentBody(event,severity,state,key,alertEnvelope){ return [`# Canonical Main Incident — ${event.observation.reasonCode}`,'','> Synthetic rehearsal record. This issue is not a production/release authority and does not assert a real outage.','','- Synthetic rehearsal: `true`',`- Rehearsal id: \`${REHEARSAL_ID}\``,`- State: **${state}**`,`- Severity: **${severity}**`,'- Scope: `scope:repo`',`- Event class: \`${event.eventClass}\``,`- Reason: \`${event.observation.reasonCode}\``,`- Subject: \`${event.subject.kind}:${event.subject.id}\``,`- Summary: ${event.summary}`,`- Observed transition: \`${event.observation.from} → ${event.observation.to}\``,`- Notification eligible: \`${alertEnvelope.eligible}\``,`- Delivery key: \`${alertEnvelope.deliveryKey}\``,'','## Evidence','',...event.evidence.map((row)=>`- \`${row}\``),'',markerForKey(key),markerForEvent(event.eventId),envelopeMarker(alertEnvelope)].join('\n'); }
function rehearsalState(allIssues,mainSha){ const openEvent=buildRehearsalEvent('OPEN',mainSha), recoveredEvent=buildRehearsalEvent('RECOVERED',mainSha), key=correlationKey(openEvent), issue=allIssues.find((row)=>(row.body||'').includes(markerForKey(key)))||null; if(!issue)return{state:'NONE',issue:null,key}; const previousState=previousIncidentState(issue),body=issue.body||''; if(previousState==='RECOVERED'&&body.includes(proofMarker(mainSha))&&body.includes(markerForEvent(recoveredEvent.eventId)))return{state:'PROVEN',issue,key}; if(previousState==='OPEN'&&body.includes(markerForEvent(openEvent.eventId)))return{state:'OPEN',issue,key}; return{state:previousState,issue,key}; }
function deliveryEnvelope(event,transition,issue){ const key=correlationKey(event),severity=severityFor(event,{},policy),previousState=previousIncidentState(issue); return{key,severity,previousState,envelope:buildAlertEnvelope({event,severity,transition,correlationKey:key,previousState})}; }
module.exports={policy,REHEARSAL_ID,REASON_CODE,markerForKey,markerForEvent,proofMarker,buildRehearsalEvent,incidentLabels,renderIncidentBody,rehearsalState,deliveryEnvelope};
