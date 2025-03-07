import { InSystemProgramming } from './InSystemProgramming';
import { Logger } from './log';

const ECHO = false;

export function handshake(
  isp: InSystemProgramming,
  count: number = Infinity,
  timeout: number = 20,
  logger?: Logger,
): Promise<InSystemProgramming> {
  return new Promise<InSystemProgramming>((resolve, reject) => {
    logger?.info(`Sync'ing...`, { source: 'handshake' });
    (function synchronize() {
      let ret = isp
        .write('?')
        .then(() => isp.assert(/^\?*Synchronized/, timeout))
        .then(isp => isp.writeln('Synchronized'))
        .then(isp => isp.assert(/Synchronized/))
        .then(isp => isp.assertOK())
        .then(isp => isp.reset())
        .then(isp => isp.sendLine(isp.cclk.toString(10)))
        .then(isp => isp.assertOK());
      if (!InSystemProgramming.VLAB_MODE) {
        // XXX our custom bootloader implements only a subset
        ret = ret
          .then(isp => isp.setEcho(ECHO))
          .then(isp => isp.readPartIdentification())
          .then(partId => isp.readBootcodeVersion())
          .then(bootVer => isp);
      }
      ret
        .then(isp => resolve(isp))
        .catch(error => {
          if (count-- <= 0) {
            return reject(error);
          } else {
            logger?.warn(error, { source: 'handshake' });
            process.nextTick(synchronize);
          }
        });
    })(); // start loop, until no error
  });
}
