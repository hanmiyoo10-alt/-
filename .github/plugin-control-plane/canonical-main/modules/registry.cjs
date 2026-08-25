'use strict';

const requiredCi = require('../observers/required-ci.cjs');
const productionAuthority = require('../observers/production-authority.cjs');
const writerWorkflows = require('../observers/writer-workflows.cjs');
const bootstrap = require('../observers/bootstrap.cjs');
const protection = require('../observers/protection.cjs');
const projectStatus = require('../observers/project-status.cjs');

const modules = Object.freeze([
  Object.freeze({id: 'requiredCi', observe: requiredCi.observe, permissionClass: 'actions:read'}),
  Object.freeze({id: 'productionAuthority', observe: productionAuthority.observe, permissionClass: 'contents:read'}),
  Object.freeze({id: 'writers', observe: writerWorkflows.observe, permissionClass: 'actions:read'}),
  Object.freeze({id: 'bootstrap', observe: bootstrap.observe, permissionClass: 'contents:read'}),
  Object.freeze({id: 'protection', observe: protection.observe, permissionClass: 'contents:read'}),
  Object.freeze({id: 'projectStatus', observe: projectStatus.observe, permissionClass: 'issues:read'}),
]);

module.exports = {modules};
