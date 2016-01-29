import {InSystemProgramming} from "./InSystemProgramming";
import {LPCProgrammer} from './LPCProgrammer';
import {MemoryReader} from './MemoryReader';
import * as Handshake from "./Handshake";
import {PART_IDENTIFICATIONS} from './PartIdentifications';

var dump = require('buffer-hexdump');
import * as program from 'commander';
import * as path from 'path';
import * as fs from 'fs';

var defaultComPort = '/dev/tty.usbmodemFD131';

program
  .option('-P, --port [port]', `serial port [${defaultComPort}]`, defaultComPort)
  .option('-V, --verbose', `Make the operation more talkative`, true);

program.command('write <file> <address>')
  .description('program file')
  .action((file, addr, cmd) => {
    let address = parseInt(addr);
    Handshake.open(program['port'])
      .then((isp) => {
        isp.verbose = !! program['verbose'];
        return programFile(isp, file, address)
            .then(() => isp.close())
            .then(() => process.exit(0))
      })
      .catch(catchError);
  });

program.command('ping')
  .description('ping device')
  .action(() => {
    Handshake.open(program['port'])
      .then(isp => {
        isp.verbose = !! program['verbose'];
        pingDevice(isp);
      })
      .catch(catchError);
  });

program.command('read <address> <length>')
  .description('read memory')
  .option('-O, --output <file>', 'output file', null)
  .action((addr, len, cmd) => {
    let address = parseInt(addr);
    let length = parseInt(len);
    Handshake.open(program['port'])
      .then(isp => {
        isp.verbose = !! program['verbose'];
        let reader = new MemoryReader(isp);
        return reader.readFully({address, length});
      })
      .then(buffer => {
        if (cmd.output) {
          fs.writeFileSync(cmd.output, buffer, {encoding: 'binary'});
          console.log(`${buffer.length} bytes written to ${cmd.output}`);
        } else {
          console.log(dump(buffer));
        }
        process.exit(0);
      })
      .catch(catchError);
  });

program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}

function programFile(isp: InSystemProgramming, path: string, address: number): Promise<void> {
  return isp.unlock().then(() => {
    let size = fs.statSync(path).size;
    let count = 0;
    let programmer = new LPCProgrammer(isp, address, size);
    return new Promise<void>((resolve, reject) => {
      let stream = fs.createReadStream(path);
      programmer.program(stream)
        .on('start', () => console.log(`About to flash ${size} bytes...`))
        .on('chunk', buffer => count += buffer.length)
        .on('error', error => reject(error))
        .on('end', () => {
          console.log(`${path}: ${count} bytes written`);
          stream.close();
          resolve();
        });
    });
  });
}

function pingDevice(isp: InSystemProgramming): void {
  let count = 0;
  (function loop(): void {
    let start = Date.now();
    isp.readPartIdentification().then(partId => {
      console.log(`LPC${PART_IDENTIFICATIONS[partId] || partId} seq=${count++} time=${Date.now() - start} ms`);
      setTimeout(loop, 1000);
    }).catch(error => {
      console.error(error);
      setTimeout(loop, 1000);
    });
  })();
}

function catchError(error: any): void {
  let stack = error['stack'];
  console.error(stack ? stack : error);
  process.exit(1);
}