// https://github.com/jshttp/content-disposition/blob/master/index.js
/*!
 * content-disposition
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */

const HEX_ESCAPE_REPLACE_REGEXP = /%([0-9A-Fa-f]{2})/g
const NON_LATIN1_REGEXP = /[^\x20-\x7e\xa0-\xff]/g
const QESC_REGEXP = /\\([\u0000-\u007f])/g // eslint-disable-line no-control-regex
const PARAM_REGEXP = /;[\x09\x20]*([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*=[\x09\x20]*("(?:[\x20!\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*/g // eslint-disable-line no-control-regex
const EXT_VALUE_REGEXP = /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+.^_`|~-])+)$/
const DISPOSITION_TYPE_REGEXP = /^([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*(?:$|;)/ // eslint-disable-line no-control-regex

function decodefield (str: string) {
  const match = EXT_VALUE_REGEXP.exec(str)

  if (!match) throw new TypeError('invalid extended field value');

  const charset = match[1].toLowerCase()
  const encoded = match[2]
  let value

  // to binary string
  const binary = encoded.replace(HEX_ESCAPE_REPLACE_REGEXP, pdecode)

  switch (charset) {
    case 'iso-8859-1':
      value = getlatin1(binary);
      break;
    case 'utf-8':
      value = binary;
      break;
    default:
      throw new TypeError('unsupported charset in extended field')
  }

  return value;
}

function getlatin1 (val: string) {
  // simple Unicode -> ISO-8859-1 transformation
  return String(val).replace(NON_LATIN1_REGEXP, '?')
}

export function parse(string: string) {
  if (!string || typeof string !== 'string') throw new TypeError('argument string is required');

  let match = DISPOSITION_TYPE_REGEXP.exec(string);
  if (!match) throw new TypeError('invalid type format');

  // normalize type
  let index = match[0].length;
  const type = match[1].toLowerCase();

  let key;
  const names = [];
  const params: Record<string, string> = {};
  let value;

  // calculate index to start at
  index = PARAM_REGEXP.lastIndex = match[0].substr(-1) === ';'
    ? index - 1
    : index;

  // match parameters
  while ((match = PARAM_REGEXP.exec(string))) {
    if (match.index !== index) throw new TypeError('invalid parameter format');

    index += match[0].length;
    key = match[1].toLowerCase();
    value = match[2];

    if (names.indexOf(key) !== -1) throw new TypeError('invalid duplicate parameter');
    names.push(key);

    if (key.indexOf('*') + 1 === key.length) {
      // decode extended value
      key = key.slice(0, -1);
      value = decodefield(value);

      // overwrite existing value
      params[key] = value;
      continue;
    }

    if (typeof params[key] === 'string') continue;

    if (value[0] === '"') {
      // remove quotes and escapes
      value = value
        .substr(1, value.length - 2)
        .replace(QESC_REGEXP, '$1');
    }

    params[key] = value;
  }

  if (index !== -1 && index !== string.length) throw new TypeError('invalid parameter format');

  return { type, params };
}

function pdecode (str: string, hex: string) {
  return String.fromCharCode(parseInt(hex, 16))
}

