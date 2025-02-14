import * as Path from 'path';
import { GeneratorFactory } from '../../lib/config/GeneratorFactory';
import { Generator } from '../../lib/generate/Generator';
import { ResolutionContextMocked } from '../ResolutionContextMocked';

describe('GeneratorFactory', () => {
  let resolutionContext: ResolutionContextMocked;
  let factory: GeneratorFactory;

  beforeEach(() => {
    resolutionContext = new ResolutionContextMocked({});
    factory = new GeneratorFactory({ resolutionContext });
  });

  describe('createGenerator', () => {
    it('should create a new generator without custom options', async() => {
      expect(await factory.createGenerator(
        Path.normalize('/root'),
        {},
        [ Path.normalize('/root') ],
      )).toBeInstanceOf(Generator);
    });

    it('should create a new generator with custom options', async() => {
      resolutionContext.contentsOverrides[Path.normalize('/root/.componentsjs-generator-config.json')] = `{ "source": "FILESRC/", "extension": "FILEEXT", "debugState": true }`;
      resolutionContext.contentsOverrides[Path.normalize('/root/.componentsignore')] = '[ "a", "b" ]';
      expect(await factory.createGenerator('/root', {
        c: 'COMPONENTS/',
        e: 'EXT',
        r: 'PRE',
        i: Path.normalize('/root/.componentsignore'),
      }, [ Path.normalize('/root') ])).toBeInstanceOf(Generator);
    });

    it('should create a new generator when ignoring certain packages', async() => {
      resolutionContext.contentsOverrides[Path.normalize('/root/.componentsjs-generator-config.json')] = `{ "ignorePackagePaths": [ "ignored1/", "ignored2/" ] }`;
      expect(await factory.createGenerator(Path.normalize('/root'), {
        c: 'COMPONENTS/',
        e: 'EXT',
        r: 'PRE',
      }, [ Path.normalize('/root'), Path.normalize('/ignored1'), Path.normalize('/ignored2') ]))
        .toBeInstanceOf(Generator);
    });
  });

  describe('getConfig', () => {
    it('should handle no cli args and no config file', async() => {
      expect(await factory.getConfig('root', {})).toEqual({
        source: 'lib',
        destination: 'components',
        extension: 'jsonld',
        ignorePackagePaths: [],
        ignoreComponents: [],
        logLevel: 'info',
        modulePrefix: undefined,
        debugState: false,
        hardErrorUnsupported: true,
      });
    });

    it('should handle no cli args and config file', async() => {
      resolutionContext.contentsOverrides[Path.normalize('/root/.componentsjs-generator-config.json')] = `{ "source": "FILESRC/", "extension": "FILEEXT", "debugState": true }`;
      expect(await factory.getConfig(Path.normalize('/root'), {})).toEqual({
        source: 'FILESRC/',
        destination: 'components',
        extension: 'FILEEXT',
        ignorePackagePaths: [],
        ignoreComponents: [],
        logLevel: 'info',
        modulePrefix: undefined,
        debugState: true,
        hardErrorUnsupported: true,
      });
    });

    it('should handle cli args and no config file', async() => {
      expect(await factory.getConfig('root', {
        s: 'SOURCE/',
        c: 'COMPONENTS/',
        e: 'EXT',
        r: 'PRE',
      })).toEqual({
        source: 'SOURCE/',
        destination: 'COMPONENTS/',
        extension: 'EXT',
        ignorePackagePaths: [],
        ignoreComponents: [],
        logLevel: 'info',
        modulePrefix: 'PRE',
        debugState: false,
        hardErrorUnsupported: true,
      });
    });

    it('should handle cli args and config file', async() => {
      resolutionContext.contentsOverrides[Path.normalize('/root/.componentsjs-generator-config.json')] = `{ "source": "FILESRC/", "extension": "FILEEXT", "debugState": true }`;
      expect(await factory.getConfig(Path.normalize('/root'), {
        c: 'COMPONENTS/',
        e: 'EXT',
        r: 'PRE',
      })).toEqual({
        source: 'FILESRC/',
        destination: 'COMPONENTS/',
        extension: 'EXT',
        ignorePackagePaths: [],
        ignoreComponents: [],
        logLevel: 'info',
        modulePrefix: 'PRE',
        debugState: true,
        hardErrorUnsupported: true,
      });
    });
  });

  describe('getDefaultConfig', () => {
    it('should return the default config', () => {
      expect(factory.getDefaultConfig()).toEqual({
        source: 'lib',
        destination: 'components',
        extension: 'jsonld',
        ignorePackagePaths: [],
        ignoreComponents: [],
        logLevel: 'info',
        modulePrefix: undefined,
        debugState: false,
        hardErrorUnsupported: true,
      });
    });
  });

  describe('getCliConfig', () => {
    it('should handle empty CLI args', async() => {
      expect(await factory.getCliConfig({})).toEqual({});
    });

    it('should handle complete CLI args', async() => {
      resolutionContext.contentsOverrides['.componentsignore'] = '[ "a", "b" ]';
      expect(await factory.getCliConfig({
        s: 'lib/',
        c: 'components/',
        e: 'jsonld',
        i: '.componentsignore',
        l: 'info',
        r: 'pre',
        debugState: true,
        lenient: true,
      })).toEqual({
        source: 'lib/',
        destination: 'components/',
        extension: 'jsonld',
        ignoreComponents: [ 'a', 'b' ],
        logLevel: 'info',
        modulePrefix: 'pre',
        debugState: true,
        hardErrorUnsupported: false,
      });
    });
  });
});
