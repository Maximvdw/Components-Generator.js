import type { IModuleState } from 'componentsjs';
import {
  ModuleStateBuilder,
  ComponentsManagerBuilder,
  ComponentRegistryFinalizer,
  ComponentRegistry,
} from 'componentsjs';
import type { JsonLdContextNormalized } from 'jsonld-context-parser';
import type { Resource } from 'rdf-object';
import type { Logger } from 'winston';
import type { ClassIndex, ClassReferenceLoaded } from '../parse/ClassIndex';
import type { ConstructorData } from '../parse/ConstructorLoader';
import type { PackageMetadata } from '../parse/PackageMetadataLoader';
import type { ParameterRangeResolved } from '../parse/ParameterLoader';
import type { PathDestinationDefinition } from '../serialize/ComponentConstructor';
import type { ResolutionContext } from './ResolutionContext';

/**
 * Loads components from Node modules.
 */
export class ExternalModulesLoader {
  private readonly pathDestination: PathDestinationDefinition;
  private readonly packageMetadata: PackageMetadata;
  private readonly packagesBeingGenerated: Record<string, PackageMetadataScope>;
  private readonly resolutionContext: ResolutionContext;
  private readonly debugState: boolean;
  private readonly logger: Logger;

  public constructor(args: ExternalModulesLoaderArgs) {
    this.pathDestination = args.pathDestination;
    this.packageMetadata = args.packageMetadata;
    this.packagesBeingGenerated = args.packagesBeingGenerated;
    this.resolutionContext = args.resolutionContext;
    this.debugState = args.debugState;
    this.logger = args.logger;
  }

  /**
   * Determine packages referred to by components.
   * @param classIndex The available classes.
   * @param constructors The available constructors.
   */
  public findExternalPackages(
    classIndex: ClassIndex<ClassReferenceLoaded>,
    constructors: ClassIndex<ConstructorData<ParameterRangeResolved>>,
  ): string[] {
    const externalPackages: Record<string, boolean> = {};

    // Handle super classes
    for (const classReference of Object.values(classIndex)) {
      this.indexClassInExternalPackage(classReference, externalPackages);
    }

    // Handle constructor parameters
    for (const ctor of Object.values(constructors)) {
      for (const parameter of ctor.parameters) {
        this.indexParameterRangeInExternalPackage(parameter.range, externalPackages);
      }
    }

    // Exclude packages that are being generated
    for (const key of Object.keys(externalPackages)) {
      if (key in this.packagesBeingGenerated) {
        delete externalPackages[key];
      }
    }

    return Object.keys(externalPackages);
  }

  public indexClassInExternalPackage(
    classReference: ClassReferenceLoaded,
    externalPackages: Record<string, boolean>,
  ): void {
    if (classReference.packageName !== this.packageMetadata.name) {
      externalPackages[classReference.packageName] = true;
    }
    if (classReference.type === 'class') {
      if (classReference.superClass) {
        this.indexClassInExternalPackage(classReference.superClass.value, externalPackages);
      }
      if (classReference.implementsInterfaces) {
        for (const iface of classReference.implementsInterfaces) {
          this.indexClassInExternalPackage(iface.value, externalPackages);
        }
      }
    }
  }

  public indexParameterRangeInExternalPackage(
    parameterRange: ParameterRangeResolved,
    externalPackages: Record<string, boolean>,
  ): void {
    switch (parameterRange.type) {
      case 'raw':
      case 'literal':
      case 'override':
      case 'undefined':
      case 'wildcard':
      case 'genericTypeReference':
        break;
      case 'class':
        this.indexClassInExternalPackage(parameterRange.value, externalPackages);
        break;
      case 'nested':
        for (const nestedParameter of parameterRange.value) {
          this.indexParameterRangeInExternalPackage(nestedParameter.range, externalPackages);
        }
        break;
      case 'union':
      case 'intersection':
      case 'tuple':
        for (const child of parameterRange.elements) {
          this.indexParameterRangeInExternalPackage(child, externalPackages);
        }
        break;
      case 'rest':
      case 'array':
      case 'keyof':
      case 'typeof':
        this.indexParameterRangeInExternalPackage(parameterRange.value, externalPackages);
        break;
      case 'indexed':
        this.indexParameterRangeInExternalPackage(parameterRange.object, externalPackages);
        this.indexParameterRangeInExternalPackage(parameterRange.index, externalPackages);
        break;
    }
  }

  /**
   * Build the module state.
   * Adapted from {@link ModuleStateBuilder#buildModuleState}.
   *
   * Instead of loading the modules for all available packages,
   * only the packages with their name included in the packageNames array are included.
   * This leads to better performance, as we usually need only a small subset of all packages.
   *
   * @param req The `require` instance.
   * @param packageNames Names of the packages to load.
   */
  public async buildModuleStateSelective(req: NodeJS.Require, packageNames: string[]): Promise<IModuleState> {
    const moduleStateBuilder = new ModuleStateBuilder(this.logger);
    const mainModulePath = this.pathDestination.packageRootDirectory;
    const nodeModuleImportPaths = moduleStateBuilder.buildNodeModuleImportPaths(mainModulePath);

    // This loop makes sure that we also consider dependencies (recursively) of the given package names
    let nodeModulePaths: string[] = [];
    let packageJsons: Record<string, any> = {};
    let componentModules: Record<string, string> = {};
    let packageNamesNew: string[] = packageNames;
    while (packageNamesNew.length > 0) {
      const nodeModulePathsNew = this.buildNodeModulePathsSelective(req, nodeModuleImportPaths, packageNamesNew);
      const packageJsonsNew = await moduleStateBuilder.buildPackageJsons(nodeModulePathsNew);
      await moduleStateBuilder.preprocessPackageJsons(packageJsonsNew);
      const componentModulesNew = await moduleStateBuilder.buildComponentModules(packageJsonsNew);

      // Determine (Components.js) modules that we haven't seen yet
      const newComponentModuleIris = Object.keys(componentModulesNew)
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        .filter(componentModuleNew => !componentModules[componentModuleNew]);

      nodeModulePaths = [ ...nodeModulePaths, ...nodeModulePathsNew ];
      packageJsons = { ...packageJsons, ...packageJsonsNew };
      componentModules = { ...componentModules, ...componentModulesNew };
      packageNamesNew = [];

      // For the new modules, extract their dependencies, and handle them in the next iteration
      for (const packageJson of Object.values(packageJsonsNew)) {
        if (packageJson.dependencies) {
          if (newComponentModuleIris.some(iri => packageJson['lsd:module'] === iri)) {
            packageNamesNew.push(...Object.keys(packageJson.dependencies));
          }
        }
      }
    }

    const contexts = await moduleStateBuilder.buildComponentContexts(packageJsons);
    const importPaths = await moduleStateBuilder.buildComponentImportPaths(packageJsons);
    return {
      mainModulePath,
      nodeModuleImportPaths,
      nodeModulePaths,
      packageJsons,
      componentModules,
      contexts,
      importPaths,
    };
  }

  /**
   * Get all currently available node module paths.
   * Adapted from {@link ModuleStateBuilder#buildNodeModulePaths}.
   * @param req The `require` instance.
   * @param nodeModuleImportPaths The import paths to resolve from.
   * @param packageNames The package names to resolve the path for.
   */
  public buildNodeModulePathsSelective(
    req: NodeJS.Require,
    nodeModuleImportPaths: string[],
    packageNames: string[],
  ): string[] {
    return packageNames
      .map(packageName => req
        .resolve(`${packageName}/package.json`, { paths: nodeModuleImportPaths })
        .slice(0, -13));
  }

  /**
   * Loads all components from the given Node package names.
   * @param req The `require` instance.
   * @param externalPackages
   */
  public async loadExternalComponents(req: NodeJS.Require, externalPackages: string[]): Promise<ExternalComponents> {
    // Load module state for the external packages
    const moduleState = await this.buildModuleStateSelective(req, externalPackages);

    // Dump the module state to a file if needed
    if (this.debugState) {
      await this.dumpModuleState(moduleState, externalPackages);
    }

    // Load components for this module state (code inspired by ComponentsManagerBuilder from Components.js)
    const componentResources: Record<string, Resource> = {};
    const objectLoader = ComponentsManagerBuilder.createObjectLoader();
    const componentRegistry = new ComponentRegistry({
      moduleState,
      objectLoader,
      logger: this.logger,
      componentResources,
      skipContextValidation: true,
    });
    await componentRegistry.registerAvailableModules();
    const componentFinalizer = new ComponentRegistryFinalizer({
      objectLoader,
      // We pass another logger, because there's no valuable information being logged here related to generation
      logger: ComponentsManagerBuilder.createLogger('error'),
      componentResources,
      componentRegistry,
    });
    componentFinalizer.finalize();

    // Index available package.json by package name
    const packageJsons: Record<string, { contents: any; path: string }> = {};
    for (const [ path, packageJson ] of Object.entries(moduleState.packageJsons)) {
      packageJsons[packageJson.name] = { contents: packageJson, path };
    }

    // Index all loaded components
    const externalComponents: ExternalComponents = {
      moduleState,
      components: {},
      packagesBeingGenerated: this.packagesBeingGenerated,
    };
    for (const componentResource of Object.values(componentResources)) {
      const packageNames = componentResource.properties.module.map(module => module.property.requireName.value);
      for (const packageName of packageNames) {
        // Initialize metadata for a package if it doesn't exist yet
        if (!externalComponents.components[packageName]) {
          const packageJson = packageJsons[packageName];
          if (!packageJson) {
            this.logger.warn(`Could not find a package.json for '${packageName}'`);
          } else {
            const contexts = packageJson.contents['lsd:contexts'];
            externalComponents.components[packageName] = {
              contextIris: Object.keys(contexts),
              componentNamesToIris: {},
            };
          }
        }

        // Add component to package
        if (externalComponents.components[packageName]) {
          externalComponents.components[packageName]
            .componentNamesToIris[componentResource.property.requireElement.value] = componentResource.value;
        }
      }
    }

    return externalComponents;
  }

  /**
   * Create a 'componentsjs-debug-state.json' file with the given module state.
   * @param moduleState The module state to dump.
   * @param externalPackages The external packages to include in the dump.
   */
  public async dumpModuleState(moduleState: IModuleState, externalPackages: string[]): Promise<void> {
    const contents = JSON.stringify({
      externalPackages,
      moduleState: {
        mainModulePath: moduleState.mainModulePath,
        componentModules: moduleState.componentModules,
        importPaths: moduleState.importPaths,
        contexts: moduleState.contexts,
        nodeModuleImportPaths: moduleState.nodeModuleImportPaths,
        nodeModulePaths: moduleState.nodeModulePaths,
      },
    }, null, '  ');
    await this.resolutionContext.writeFileContent('componentsjs-generator-debug-state.json', contents);
  }
}

/**
 * Data object for external components.
 */
export interface ExternalComponents {
  /**
   * Module state.
   */
  moduleState: IModuleState;
  /**
   * Maps package name to exported class name to component IRI.
   */
  components: Record<string, {
    contextIris: string[];
    componentNamesToIris: Record<string, string>;
  }>;
  /**
   * Maps package name to package metadata.
   */
  packagesBeingGenerated: Record<string, PackageMetadataScope>;
}

export interface ExternalModulesLoaderArgs {
  pathDestination: PathDestinationDefinition;
  packageMetadata: PackageMetadata;
  /**
   * Maps package name to package metadata.
   */
  packagesBeingGenerated: Record<string, PackageMetadataScope>;
  resolutionContext: ResolutionContext;
  debugState: boolean;
  logger: Logger;
}

export interface PackageMetadataScope {
  packageMetadata: PackageMetadata;
  pathDestination: PathDestinationDefinition;
  minimalContext: JsonLdContextNormalized;
}
