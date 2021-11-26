import { PrefetchedDocumentLoader } from 'componentsjs';
import semverMajor = require('semver/functions/major');
import type { PackageMetadata } from '../parse/PackageMetadataLoader';
import type { ComponentDefinitions, ParameterDefinitionRange } from './ComponentDefinitions';

/**
 * Constructs a JSON-LD context for a given package..
 */
export class ContextConstructor {
  private readonly packageMetadata: PackageMetadata;

  public constructor(args: ContextConstructorArgs) {
    this.packageMetadata = args.packageMetadata;
  }

  /**
   * Determine a JSON-LD prefix for the given package name.
   * It will take the first letters of the name's components.
   * @param packageName A package name.
   */
  public static getPackageNamePrefix(packageName: string): string {
    return packageName
      .replace(/@/gu, '')
      .split(/[/-]/u)
      .map(part => part.charAt(0))
      .join('');
  }

  /**
   * Construct a JSON-LD context.
   * @param components Optional component definitions to provide shortcuts for.
   */
  public constructContext(components?: ComponentDefinitions): ContextRaw {
    // Determine a compact prefix to represent this package.
    const prefix = this.packageMetadata.prefix ?? ContextConstructor.getPackageNamePrefix(this.packageMetadata.name);

    // Determine component shortcuts if provided.
    const componentShortcuts = components ? this.constructComponentShortcuts(components) : {};

    return {
      '@context': [
        PrefetchedDocumentLoader.CONTEXT_URL,
        {
          npmd: 'https://linkedsoftwaredependencies.org/bundles/npm/',
          [prefix]: `npmd:${this.packageMetadata.name}/^${semverMajor(this.packageMetadata.version)}.0.0/`,
          ...componentShortcuts,
        },
      ],
    };
  }

  /**
   * Construct a hash of component shortcuts.
   * @param componentDefinitions Component definitions.
   */
  public constructComponentShortcuts(componentDefinitions: ComponentDefinitions): Record<string, string> {
    const shortcuts: Record<string, string> = {};
    for (const componentDefinition of Object.values(componentDefinitions)) {
      for (const component of componentDefinition.components) {
        // Shortcut name for a class contains no special characters
        // Regex will always match
        const match = <RegExpExecArray> (/[a-z0-9]*$/iu.exec(component['@id']));
        shortcuts[match[0]] = <any> {
          '@id': component['@id'],
          '@prefix': true,
        };

        // Generate type-scoped context
        const typeScopedContext: Record<string, Record<string, string>> = {};
        for (const parameter of component.parameters) {
          typeScopedContext[parameter['@id'].slice(Math.max(0, component['@id'].length + 1))] = {
            '@id': parameter['@id'],
            ...parameter.range === 'rdf:JSON' ? { '@type': '@json' } : {},
            // Mark as list container if range is array
            ...ContextConstructor.isParameterRangeList(parameter.range) ?
              { '@container': '@list' } :
              {},
          };
        }
        (<any> shortcuts[match[0]])['@context'] = typeScopedContext;
      }
    }
    return shortcuts;
  }

  public static isParameterRangeList(range: ParameterDefinitionRange | undefined): boolean {
    if (range && typeof range !== 'string' && '@type' in range) {
      if (range['@type'] === 'ParameterRangeArray' || range['@type'] === 'ParameterRangeCollectEntries') {
        return true;
      }
      if (range['@type'] === 'ParameterRangeUnion' && range.parameterRangeElements.length === 2) {
        const elementLeft = range.parameterRangeElements[0];
        const elementRight = range.parameterRangeElements[1];
        return (this.isParameterRangeUndefined(elementLeft) && this.isParameterRangeList(elementRight)) ||
          (this.isParameterRangeUndefined(elementRight) && this.isParameterRangeList(elementLeft));
      }
    }
    return false;
  }

  public static isParameterRangeUndefined(range: ParameterDefinitionRange): boolean {
    return typeof range !== 'string' && '@type' in range && range['@type'] === 'ParameterRangeUndefined';
  }
}

export interface ContextConstructorArgs {
  packageMetadata: PackageMetadata;
}

export interface ContextRaw {
  '@context': (string | Record<string, string>)[];
}
