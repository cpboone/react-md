import { repeat } from 'lodash';
import updateMarkdownLinks, { MANUAL_DOCGEN_DEFINTIION_REGEX } from './updateMarkdownLinks.js';

function tab(amt) {
  return repeat(' ', amt * 2);
}

/* eslint-disable no-use-before-define */
export function formatOneOf(values, depth) {
  return `${tab(depth)}oneOf([
${tab(depth + 1)}${values.map(value => value.value).join(`,\n${tab(depth + 1)}`)}
${tab(depth)}])`;
}

export function formatOneOfType(values, customPropTypes, manualDefinition, depth) {
  return `${tab(depth)}oneOfType([
${tab(depth + 1)}${values.map(value => formatType(value, customPropTypes, manualDefinition, depth + 1)).join(`,\n${tab(depth + 1)}`)}
${tab(depth)}])`;
}

export function formatShape(shape, customPropTypes, manualDefinition, depth) {
  const parts = Object.keys(shape)
    .map(key => `${key}: ${formatType(shape[key], customPropTypes, manualDefinition, depth + 1).replace(/^ +/, '')}`)
    .join(`,\n${tab(depth + 1)}`);

  return `${tab(depth)}shape({\n${tab(depth + 1)}${parts}\n${tab(depth)}})`;
}

export function formatCustom(raw, customPropTypes, manualDefinition) {
  if (raw.match(/deprecated/)) {
    return raw.replace(/(\r?\n)|\s/g, '').replace(/,'.*/, ')');
  } else if (raw.match(new RegExp(customPropTypes.join('|')))) {
    return raw;
  } else if (manualDefinition && manualDefinition[0]) {
    const desc = manualDefinition[0].replace('```docgen\n', '');
    return desc.substring(0, desc.lastIndexOf('\n```')).replace(/PropTypes\./g, '');
  }

  return 'custom';
}

export function addRequired(value, required) {
  return `${value}${required ? '.isRequired' : ''}`;
}

export function formatType({ name, value, raw, required }, customPropTypes, manualDefinition, depth = 0) {
  switch (name) {
    case 'union':
      return addRequired(formatOneOfType(value, customPropTypes, manualDefinition, depth), required);
    case 'arrayOf':
      return addRequired(`${name}(${formatType(value, customPropTypes, manualDefinition, depth)})`, required);
    case 'enum':
      return addRequired(formatOneOf(value, depth));
    case 'shape':
      return addRequired(formatShape(value, customPropTypes, manualDefinition, depth));
    case 'instanceOf':
      return addRequired(`${name}(${value})`);
    case 'custom':
      return formatCustom(raw, customPropTypes, manualDefinition);
    default:
      return addRequired(name, required);
  }
}

/**
 * Takes in a prop from the output of react-docgen and formats it for use on the client.
 */
export default function prettifyProp(prop, propName, customPropTypes, file) {
  let { description, defaultValue } = prop;
  const type = formatType(prop.type, customPropTypes, description.match(MANUAL_DOCGEN_DEFINTIION_REGEX), 0);

  if (description) {
    description = updateMarkdownLinks(description, file);
  }

  if (type.indexOf('deprecated') !== -1) {
    description = `The \`${propName}\` prop has been deprecated and will be removed in the next major release.

${prop.type.raw.split(',')[1].replace(/\)$/, '').replace(/'/g, '').trim()}.`;
  }

  if (defaultValue) {
    defaultValue = defaultValue.value;
  }

  return {
    propName,
    type,
    description,
    required: prop.required,
    defaultValue,
  };
}
