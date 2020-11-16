'use strict';
/**
 * @desc: 类型校验方法
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const isNum = s => s != null && s != '' && !isNaN(s);

const isObject = o => typeof o === 'object' && o !== null;

const isString = s => objectToString(s) === '[object String]';


const isArray = a => Array.isArray ? Array.isArray(a) : objectToString(a) === '[object Array]';

const isNumArray = arr => IsType.isArray(arr) && arr.length > 0 && arr.every(v => isNum(v));

const isRegArrayStr = (str, splitKey, regx) => {
  if (isString(str)) {
    const regArr = str.split(splitKey);
    if (isArray(regArr) && regArr.length > 0) {
      return regArr.every(item => regx.test(item));
    }
  }
  return false;
}

const isNumArrayStr = (str, splitKey) => isString(str) && isNumArray(str.split(splitKey));

const isFunction = f => typeof f === 'function';

const isBoolean = b => typeof b === 'boolean';

const isEmptyObj = obj => Object.keys(obj).length === 0;

module.exports = {
  isNum,
  isObject,
  isString,
  isArray,
  isNumArray,
  isRegArrayStr,
  isNumArrayStr,
  isFunction,
  isBoolean,
  isEmptyObj
};
