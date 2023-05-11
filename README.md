[![npm version](https://badge.fury.io/js/lpc-flash.svg)](https://badge.fury.io/js/lpc-flash)

# LPC Flash

A library for programming flash based microcontrollers from [NXP](http://www.nxp.com/microcontrollers) using a serial protocol.

It implements a function similar to [Flash Magic](http://www.flashmagictool.com) but using [Node.js](https://github.com/nodejs/node), [TypeScript](https://github.com/microsoft/typescript) and [node-serialport](https://github.com/voodootikigod/node-serialport) instead.

In 2023, the original [`flashmagic.js`](https://www.npmjs.com/package/flashmagic.js) was abandoned and very out of date.
This fork is intended to keep it up to date and working with more modern practices.

## Install

### via Npm

```bash
npm install lpc-flash
```

### via Git (GitHub)

```bash
npm install cinderblock/lpc-flash
```

## API

Minimal sample code:

```javascript
import flasher from 'lpc-flash';

const isp = new flasher.InSystemProgramming(path, baudrate, clk);
isp
  .open()
  .then(isp => flasher.handshake(isp))
  .catch(error => console.error(error));
```

## Disclaimer

This tool is **not** related to [Flash Magic](http://www.flashmagictool.com).
However, it is intended to be **100% compatible** with [NXP](http://www.nxp.com/microcontrollers)'s legacy serial bootloader.
