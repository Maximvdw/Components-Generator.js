import type { PackageMetadata } from '../../lib/parse/PackageMetadataLoader';
import { ContextConstructor } from '../../lib/serialize/ContextConstructor';

describe('ContextConstructor', () => {
  let ctor: ContextConstructor;
  let packageMetadata: PackageMetadata;

  describe('no package prefix provided', () => {
    beforeEach(async() => {
      packageMetadata = {
        name: 'my-package',
        version: '2.3.4',
        moduleIri: 'https://linkedsoftwaredependencies.org/bundles/npm/my-package/',
        componentsPath: 'components',
        contexts: {},
        importPaths: {},
        typesPath: '',
      };
      ctor = new ContextConstructor({
        packageMetadata,
      });
    });

    describe('getPackageNamePrefix', () => {
      it('should handle a name with one component', () => {
        expect(ContextConstructor.getPackageNamePrefix('package')).toEqual('p');
      });

      it('should handle a name with two components', () => {
        expect(ContextConstructor.getPackageNamePrefix('my-package')).toEqual('mp');
      });

      it('should handle a name with three components', () => {
        expect(ContextConstructor.getPackageNamePrefix('my-package-stuff')).toEqual('mps');
      });

      it('should handle a scoped name with three components', () => {
        expect(ContextConstructor.getPackageNamePrefix('@personal/my-package-stuff')).toEqual('pmps');
      });
    });

    describe('constructContext', () => {
      it('should handle undefined component definitions', () => {
        expect(ctor.constructContext()).toEqual({
          '@context': [
            'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^5.0.0/components/context.jsonld',
            {
              npmd: 'https://linkedsoftwaredependencies.org/bundles/npm/',
              mp: 'npmd:my-package/^2.0.0/',
            },
          ],
        });
      });

      it('should handle defined component definitions', () => {
        expect(ctor.constructContext({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          '@context': [
            'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^5.0.0/components/context.jsonld',
            {
              MyClass1: {
                '@id': 'mp:file1#MyClass1',
                '@prefix': true,
                '@context': {},
              },
              MyClass2: {
                '@id': 'mp:b/file2#MyClass2',
                '@prefix': true,
                '@context': {},
              },
              mp: 'npmd:my-package/^2.0.0/',
              npmd: 'https://linkedsoftwaredependencies.org/bundles/npm/',
            },
          ],
        });
      });
    });

    describe('constructComponentShortcuts', () => {
      it('should handle empty component definitions', () => {
        expect(ctor.constructComponentShortcuts({})).toEqual({});
      });

      it('should handle non-empty component definitions', () => {
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_param1',
                    range: {
                      '@type': 'ParameterRangeArray',
                      parameterRangeValue: 'xsd:float',
                    },
                  },
                  {
                    '@id': 'mp:file1#MyClass1_param2',
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              param1: {
                '@id': 'mp:file1#MyClass1_param1',
                '@container': '@list',
              },
              param2: {
                '@id': 'mp:file1#MyClass1_param2',
              },
            },
          },
          MyClass2: {
            '@id': 'mp:b/file2#MyClass2',
            '@prefix': true,
            '@context': {},
          },
        });
      });

      it('should handle non-empty component definitions with two prefixes', () => {
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_args_param1',
                    range: {
                      '@type': 'ParameterRangeArray',
                      parameterRangeValue: 'xsd:float',
                    },
                  },
                  {
                    '@id': 'mp:file1#MyClass1_args_param2',
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              args_param1: {
                '@id': 'mp:file1#MyClass1_args_param1',
                '@container': '@list',
              },
              args_param2: {
                '@id': 'mp:file1#MyClass1_args_param2',
              },
              param1: {
                '@id': 'mp:file1#MyClass1_args_param1',
                '@container': '@list',
              },
              param2: {
                '@id': 'mp:file1#MyClass1_args_param2',
              },
            },
          },
          MyClass2: {
            '@id': 'mp:b/file2#MyClass2',
            '@prefix': true,
            '@context': {},
          },
        });
      });

      it('should handle non-empty component definitions with three shared prefixes', () => {
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_args_param1',
                    range: {
                      '@type': 'ParameterRangeArray',
                      parameterRangeValue: 'xsd:float',
                    },
                  },
                  {
                    '@id': 'mp:file1#MyClass1_args_param2',
                  },
                  {
                    '@id': 'mp:file1#MyClass1_args_param3',
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              args_param1: {
                '@id': 'mp:file1#MyClass1_args_param1',
                '@container': '@list',
              },
              args_param2: {
                '@id': 'mp:file1#MyClass1_args_param2',
              },
              args_param3: {
                '@id': 'mp:file1#MyClass1_args_param3',
              },
              param1: {
                '@id': 'mp:file1#MyClass1_args_param1',
                '@container': '@list',
              },
              param2: {
                '@id': 'mp:file1#MyClass1_args_param2',
              },
              param3: {
                '@id': 'mp:file1#MyClass1_args_param3',
              },
            },
          },
          MyClass2: {
            '@id': 'mp:b/file2#MyClass2',
            '@prefix': true,
            '@context': {},
          },
        });
      });

      it('should handle non-empty component definitions with complex shared prefixes', () => {
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_args_param1',
                    range: {
                      '@type': 'ParameterRangeArray',
                      parameterRangeValue: 'xsd:float',
                    },
                  },
                  {
                    '@id': 'mp:file1#MyClass1_args_x_param2',
                  },
                  {
                    '@id': 'mp:file1#MyClass1_args_x_param3',
                  },
                  {
                    '@id': 'mp:file1#MyClass1_args_param4',
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              args_param1: {
                '@id': 'mp:file1#MyClass1_args_param1',
                '@container': '@list',
              },
              args_x_param2: {
                '@id': 'mp:file1#MyClass1_args_x_param2',
              },
              args_x_param3: {
                '@id': 'mp:file1#MyClass1_args_x_param3',
              },
              args_param4: {
                '@id': 'mp:file1#MyClass1_args_param4',
              },
              param1: {
                '@id': 'mp:file1#MyClass1_args_param1',
                '@container': '@list',
              },
              x_param2: {
                '@id': 'mp:file1#MyClass1_args_x_param2',
              },
              x_param3: {
                '@id': 'mp:file1#MyClass1_args_x_param3',
              },
              param4: {
                '@id': 'mp:file1#MyClass1_args_param4',
              },
            },
          },
          MyClass2: {
            '@id': 'mp:b/file2#MyClass2',
            '@prefix': true,
            '@context': {},
          },
        });
      });

      it('should handle non-empty component definitions with nearly shared prefixes', () => {
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_args_param1',
                    range: {
                      '@type': 'ParameterRangeArray',
                      parameterRangeValue: 'xsd:float',
                    },
                  },
                  {
                    '@id': 'mp:file1#MyClass1_args_param2',
                  },
                  {
                    '@id': 'mp:file1#MyClass1_param3',
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              args_param1: {
                '@id': 'mp:file1#MyClass1_args_param1',
                '@container': '@list',
              },
              args_param2: {
                '@id': 'mp:file1#MyClass1_args_param2',
              },
              param3: {
                '@id': 'mp:file1#MyClass1_param3',
              },
            },
          },
          MyClass2: {
            '@id': 'mp:b/file2#MyClass2',
            '@prefix': true,
            '@context': {},
          },
        });
      });

      it('should handle non-empty component definitions without shared prefixes', () => {
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_param1',
                    range: {
                      '@type': 'ParameterRangeArray',
                      parameterRangeValue: 'xsd:float',
                    },
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              param1: {
                '@id': 'mp:file1#MyClass1_param1',
                '@container': '@list',
              },
            },
          },
        });
      });

      it('should handle non-empty component definitions for JSON ranges', () => {
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_param1',
                    range: 'rdf:JSON',
                  },
                  {
                    '@id': 'mp:file1#MyClass1_param2',
                    range: 'rdf:JSON',
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              param1: {
                '@id': 'mp:file1#MyClass1_param1',
                '@type': '@json',
              },
              param2: {
                '@id': 'mp:file1#MyClass1_param2',
                '@type': '@json',
              },
            },
          },
          MyClass2: {
            '@id': 'mp:b/file2#MyClass2',
            '@prefix': true,
            '@context': {},
          },
        });
      });

      it('should handle non-empty component definitions when typeScopedContexts is true for opt arrays', () => {
        ctor = new ContextConstructor({
          packageMetadata,
        });
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_param1',
                    range: {
                      '@type': 'ParameterRangeUnion',
                      parameterRangeElements: [
                        { '@type': 'ParameterRangeUndefined' },
                        {
                          '@type': 'ParameterRangeArray',
                          parameterRangeValue: 'xsd:float',
                        },
                      ],
                    },
                  },
                  {
                    '@id': 'mp:file1#MyClass1_param2',
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              param1: {
                '@id': 'mp:file1#MyClass1_param1',
                '@container': '@list',
              },
              param2: {
                '@id': 'mp:file1#MyClass1_param2',
              },
            },
          },
          MyClass2: {
            '@id': 'mp:b/file2#MyClass2',
            '@prefix': true,
            '@context': {},
          },
        });
      });

      it('should handle non-empty component definitions when typeScopedContexts is true for opt arrays (2)', () => {
        ctor = new ContextConstructor({
          packageMetadata,
        });
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_param1',
                    range: {
                      '@type': 'ParameterRangeUnion',
                      parameterRangeElements: [
                        {
                          '@type': 'ParameterRangeArray',
                          parameterRangeValue: 'xsd:float',
                        },
                        { '@type': 'ParameterRangeUndefined' },
                      ],
                    },
                  },
                  {
                    '@id': 'mp:file1#MyClass1_param2',
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              param1: {
                '@id': 'mp:file1#MyClass1_param1',
                '@container': '@list',
              },
              param2: {
                '@id': 'mp:file1#MyClass1_param2',
              },
            },
          },
          MyClass2: {
            '@id': 'mp:b/file2#MyClass2',
            '@prefix': true,
            '@context': {},
          },
        });
      });

      it('should handle non-empty component definitions when typeScopedContexts is true for union types', () => {
        ctor = new ContextConstructor({
          packageMetadata,
        });
        expect(ctor.constructComponentShortcuts({
          '/docs/package/components/file1': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:file1#MyClass1',
                '@type': 'Class',
                constructorArguments: [],
                parameters: [
                  {
                    '@id': 'mp:file1#MyClass1_param1',
                    range: {
                      '@type': 'ParameterRangeUnion',
                      parameterRangeElements: [
                        { '@type': 'ParameterRangeUndefined' },
                        { '@type': 'ParameterRangeUndefined' },
                      ],
                    },
                  },
                  {
                    '@id': 'mp:file1#MyClass1_param2',
                  },
                ],
                memberFields: [],
                requireElement: 'MyClass1',
              },
            ],
          },
          '/docs/package/components/b/file2': {
            '@context': [
              'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
            ],
            '@id': 'npmd:my-package',
            components: [
              {
                '@id': 'mp:b/file2#MyClass2',
                '@type': 'Class',
                requireElement: 'MyClass2',
                constructorArguments: [],
                parameters: [],
                memberFields: [],
              },
            ],
          },
        })).toEqual({
          MyClass1: {
            '@id': 'mp:file1#MyClass1',
            '@prefix': true,
            '@context': {
              param1: {
                '@id': 'mp:file1#MyClass1_param1',
              },
              param2: {
                '@id': 'mp:file1#MyClass1_param2',
              },
            },
          },
          MyClass2: {
            '@id': 'mp:b/file2#MyClass2',
            '@prefix': true,
            '@context': {},
          },
        });
      });
    });
  });

  describe('package prefix provided', () => {
    beforeEach(async() => {
      packageMetadata = {
        name: 'my-package',
        version: '2.3.4',
        moduleIri: 'https://linkedsoftwaredependencies.org/bundles/npm/my-package/',
        componentsPath: 'components',
        contexts: {},
        importPaths: {},
        typesPath: '',
        prefix: 'test',
      };
      ctor = new ContextConstructor({
        packageMetadata,
      });
    });

    it('should handle defined component definitions', () => {
      expect(ctor.constructContext({
        '/docs/package/components/file1': {
          '@context': [
            'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
          ],
          '@id': 'npmd:my-package',
          components: [
            {
              '@id': 'mp:file1#MyClass1',
              '@type': 'Class',
              constructorArguments: [],
              parameters: [],
              memberFields: [],
              requireElement: 'MyClass1',
            },
          ],
        },
        '/docs/package/components/b/file2': {
          '@context': [
            'https://linkedsoftwaredependencies.org/bundles/npm/my-package/context.jsonld',
          ],
          '@id': 'npmd:my-package',
          components: [
            {
              '@id': 'mp:b/file2#MyClass2',
              '@type': 'Class',
              requireElement: 'MyClass2',
              constructorArguments: [],
              parameters: [],
              memberFields: [],
            },
          ],
        },
      })).toEqual({
        '@context': [
          'https://linkedsoftwaredependencies.org/bundles/npm/componentsjs/^5.0.0/components/context.jsonld',
          {
            MyClass1: {
              '@id': 'mp:file1#MyClass1',
              '@prefix': true,
              '@context': {},
            },
            MyClass2: {
              '@id': 'mp:b/file2#MyClass2',
              '@prefix': true,
              '@context': {},
            },
            test: 'npmd:my-package/^2.0.0/',
            npmd: 'https://linkedsoftwaredependencies.org/bundles/npm/',
          },
        ],
      });
    });
  });
});
