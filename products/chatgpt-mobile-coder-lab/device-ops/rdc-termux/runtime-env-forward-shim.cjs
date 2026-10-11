'use strict';
// mcl-rdc-termux-runtime-env-forward:v1

const childProcess = require('node:child_process');
const {syncBuiltinESMExports} = require('node:module');

const SELECTED_ENV = Object.freeze([
  'ANDROID_ROOT',
  'ANDROID_DATA',
  'ANDROID_ART_ROOT',
  'ANDROID_I18N_ROOT',
  'ANDROID_TZDATA_ROOT',
  'BOOTCLASSPATH',
  'DEX2OATBOOTCLASSPATH',
]);

const originalSpawn = childProcess.spawn;
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function parentBundleComplete() {
  return SELECTED_ENV.every((key) => typeof process.env[key] === 'string');
}

function forwardedOptions(options) {
  if (!options || typeof options !== 'object') return options;
  const childEnv = options.env;
  if (!childEnv || typeof childEnv !== 'object') return options;
  if (childEnv.DC_REMOTE_DEVICE !== 'true') return options;
  if (!parentBundleComplete()) return options;
  let changed = false;
  const env = {...childEnv};
  for (const key of SELECTED_ENV) {
    if (!hasOwn(env, key)) {
      env[key] = process.env[key];
      changed = true;
    }
  }
  return changed ? {...options, env} : options;
}

childProcess.spawn = function mclRdcTermuxSpawn(...args) {
  let optionsIndex = -1;
  if (args.length >= 3 && args[2] && typeof args[2] === 'object' && !Array.isArray(args[2])) {
    optionsIndex = 2;
  } else if (args.length >= 2 && args[1] && typeof args[1] === 'object' && !Array.isArray(args[1])) {
    optionsIndex = 1;
  }

  if (optionsIndex >= 0) {
    const options = forwardedOptions(args[optionsIndex]);
    if (options !== args[optionsIndex]) {
      args = args.slice();
      args[optionsIndex] = options;
    }
  }
  return Reflect.apply(originalSpawn, this, args);
};

syncBuiltinESMExports();
