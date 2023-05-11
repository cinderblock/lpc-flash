# Distribution Scripts

This directory contains scripts for building (and eventually publishing) this package.

## Building

In the parent directory, run `npm run build`.
This will build the distribution files and place them in the `.dist` directory.

You can also run `npm run build -- --skip-dts` to skip generating the `.d.ts` files for slightly faster builds.

## Publishing

Run `npm publish .dist` in the root directory.
Don't forget to build first!
