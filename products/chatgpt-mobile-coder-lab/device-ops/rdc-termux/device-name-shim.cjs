'use strict';
// mcl-rdc-termux-device-name:v1

const os = require('node:os');
const deviceName = process.env.DESKTOP_COMMANDER_DEVICE_NAME;

if (!deviceName || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(deviceName)) {
  throw new Error('DESKTOP_COMMANDER_DEVICE_NAME must be a non-empty safe device label');
}

os.hostname = () => deviceName;
