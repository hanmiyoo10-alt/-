'use strict';
// mcl-s-rdc-device-name:v1

const os = require('node:os');
const deviceName = process.env.DESKTOP_COMMANDER_DEVICE_NAME;

if (deviceName !== 'S') {
  throw new Error('DESKTOP_COMMANDER_DEVICE_NAME must be exactly S');
}

os.hostname = () => deviceName;
