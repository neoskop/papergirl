/**
 * This module was automatically generated by `ts-interface-builder`
 */
import * as t from 'ts-interface-checker';
// tslint:disable:object-literal-key-quotes

export const Site = t.iface([], {
  name: 'string',
  hostnames: t.array('string'),
  default: t.opt('boolean'),
});

const exportedTypeSuite: t.ITypeSuite = {
  Site,
};
export default exportedTypeSuite;
