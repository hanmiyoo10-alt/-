'use strict';

const fs=require('fs'),path=require('path');
const eventCore=require('./core/event.cjs'),descriptorCore=require('./core/descriptor.cjs'),severityCore=require('./core/severity.cjs'),incidentCore=require('./core/incident.cjs'),operatorStateCore=require('./core/operator-state.cjs');
const POLICY_PATH=path.join(__dirname,'policy.json');
function loadPolicy(){return JSON.parse(fs.readFileSync(POLICY_PATH,'utf8'));}
function validateDescriptor(descriptor,policy=loadPolicy()){return descriptorCore.validateDescriptor(descriptor,policy);}
function validateEvent(event,policy=loadPolicy()){return eventCore.validateEvent(event,policy);}
function correlationKey(event,policy=loadPolicy()){return eventCore.correlationKey(event,policy);}
function severityFor(event,overrides={},policy=loadPolicy()){return severityCore.severityFor(event,overrides,policy);}
function applyIncident(previous,event,overrides={},policy=loadPolicy()){return incidentCore.applyIncident(previous,event,overrides,policy);}
module.exports={loadPolicy,normalizeScope:eventCore.normalizeScope,validateDescriptor,validateEvent,correlationKey,severityFor,applyIncident,deriveOperatorState:operatorStateCore.deriveOperatorState};
