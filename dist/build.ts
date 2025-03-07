import { writeFile, mkdir, copyFile, rm, readdir } from 'fs/promises';
import esbuild from 'esbuild';
import { join } from 'path';
import { dtsPlugin } from 'esbuild-plugin-d.ts';
import logger from '../src/log';

function forceExit() {
  setTimeout(() => {
    logger.warn('Something is still running. Forcing exit.');
    process.exit(2);
  }, 1).unref();
}

function handleError(e: any) {
  logger.debug('Handling error...');
  logger.error(e.stack ?? e);
  process.exitCode = 1;
}

if (require.main === module) {
  logger.debug('Running main build');
  parseArgs(...process.argv.slice(2))
    .then(main)
    .then(() => logger.debug('Build exited normally'))
    .then(forceExit)
    .catch(handleError);
}

process.on('unhandledRejection', e => {
  logger.error('Unhandled rejection:');
  logger.error(e);
  process.exitCode = 2;
  forceExit();
});
process.on('uncaughtException', e => {
  logger.error('Uncaught exception:');
  logger.error(e);
  process.exitCode = 2;
  forceExit();
});

export type Options = {
  distDir: string;
  bundleName: string;
  skipDts?: boolean;
  watch?: boolean;
};

type Awaitable<T> = T | Promise<T>;
type Pkg = {
  pkg: Awaitable<Record<string, any>>;
};
type MainOptions = Options & Partial<Pkg>;
type FullOptions = Options & Pkg;

function isFullOptions(options: MainOptions): options is FullOptions {
  return 'pkg' in options;
}

async function extractNamedFlag(args: string[], name: string): Promise<boolean> {
  const index = args.indexOf(name);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

export async function parseArgs(...args: string[]): Promise<MainOptions> {
  const skipDts = await extractNamedFlag(args, '--skip-dts');
  const watch = await extractNamedFlag(args, '--watch');

  const [distDir = '.dist', bundleName = 'index.js'] = args;
  return {
    distDir,
    bundleName,
    skipDts,
    watch,
  };
}

export async function main(options: MainOptions) {
  const { distDir } = options;

  // Load local `package.json` with `import()`
  // import path is relative to current source file. Other paths are relative to `cwd` (normally project root)
  options.pkg ??= import('../package.json').then(p => p.default);

  // Should never happen. Make TypeScript happy.
  if (!isFullOptions(options)) throw new Error('Invalid options');

  // TODO: check before removing??
  await rm(distDir, { recursive: true }).catch(() => {});
  await mkdir(distDir, { recursive: true });

  await Promise.all([
    // Filter package.json
    packageJson(options),

    readme(options),

    // TODO: License
    // TODO: Changelog

    build(options),
  ]);
}

async function readme({ distDir, watch }: FullOptions) {
  await copyFile('README.md', join(distDir, 'README.md'));

  if (watch) logger.warn('Watching README.md for changes is not (yet) implemented');
}

// Not really tested
const outputESM = false;

async function build({ distDir: outDir, skipDts, watch, pkg }: FullOptions) {
  const plugins: esbuild.Plugin[] = [];
  const watchPlugin: esbuild.Plugin = {
    name: 'end Event Plugin',
    setup(build) {
      build.onEnd(() => {
        logger.info('Build finished');
      });
    },
  };

  if (watch) plugins.push(watchPlugin);
  if (!skipDts) plugins.push(dtsPlugin({ outDir }));

  const external = Object.keys((await pkg).dependencies).filter(d => !(d.startsWith('@types/') || d === 'node'));

  logger.debug(`External dependencies: ${external.join(', ')}`);

  const buildOpts: esbuild.BuildOptions = {
    platform: 'node',
    target: 'node18',
    format: outputESM ? 'esm' : 'cjs',
    sourcemap: true,
    sourcesContent: false,
    plugins,
    outdir: outDir,
    bundle: true,
    entryPoints: ['src/index.ts'],
    external,
  };

  const buildAllOpts: esbuild.BuildOptions = {
    ...buildOpts,
    bundle: undefined,
    external: undefined,
    entryPoints: await readdir('src').then(files => files.filter(f => f.endsWith('.ts')).map(f => join('src', f))),
  };

  if (!watch) return await esbuild.build(buildOpts);

  const ctx = await esbuild.context(buildOpts);
  await ctx.watch({});
  logger.info('Watching for changes... (Press Ctrl-C to exit)');

  // CTRL-C
  await new Promise<void>(resolve => process.once('SIGINT', resolve));
  // Unfortunately no good solution for Windows with: "Terminate batch job (Y/N)?"

  logger.info('Stopping watch...');

  await ctx.dispose().catch(() => {
    logger.warn('Failed to dispose esbuild context');
  });
}

async function packageJson({ distDir, bundleName, watch, pkg }: FullOptions) {
  // Filter scripts and other unwanted parts
  const distPackageJson = {
    ...(await pkg),
    bin: {
      rdt: bundleName,
    },
    main: bundleName,
    types: 'index.d.ts',
    private: undefined,
    type: outputESM ? 'module' : undefined,
    files: undefined,
    scripts: undefined,
    devDependencies: undefined,
    // peerDependencies: undefined,
  };

  // Write to `dist/package.json`
  await writeFile(join(distDir, 'package.json'), JSON.stringify(distPackageJson, null, 2));

  if (watch) logger.warn('Watching package.json for changes is not (yet) implemented');
}
