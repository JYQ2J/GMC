'use strict';
/**
 * @desc: 工具类方法
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const lodash = require('lodash');

const toTwo = v => v.toString().padStart(2, '0');
/**
 * 生成随机串。
 * @param {Number} length 指定生成的随机串长度。
 * @return {String} 返回生成的随机串。
 */
const generateRandomString = (length = 3) => {
  const possible = 'ABCDEFGHIGKLMNOPQRSTUVWXYZabcdefghigklmnopqrstuvwxyz0123456789';;
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
/**
 * 将秒数转换成小时:分:秒的形式
 */
const formatSeconds = val => {
  if (isNaN(val)) {
    return '00:00:00';
  }
  const [h, m, s] = [toTwo(Math.floor(val / 3600)), toTwo(Math.floor(val % 3600 / 60)), toTwo(val % 3600 % 60)];
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}
/**
 * 将毫秒数转换成日期yyyy-mm-dd
 * @param s {Number}
 * @returns {String}
 */
const formatSeconds2Date = (time, isUTC = false, splitKey = '-') => {
  if (isNaN(time)) {
    return '';
  }
  const date = new Date(time);
  const [year, month, day] = [
    isUTC ? date.getUTCFullYear() : date.getFullYear(),
    toTwo(isUTC ? date.getUTCMonth() + 1 : date.getMonth() + 1),
    toTwo(isUTC ? date.getUTCDate() : date.getDate())
  ];
  return year + splitKey + month + splitKey + day;
}
/**
 * 将毫秒数转换成日期hh:mm:ss
 * @param s {Number}
 * @returns {String}
 */
const formateTime = (time, isUTC = false) => {
  if (isNaN(time)) {
    return '';
  }
  const date = new Date(time);
  const [hour, minute, second] = [
    Tool.toTwo(isUTC ? date.getUTCHours() : date.getHours()),
    Tool.toTwo(isUTC ? date.getUTCMinutes() : date.getMinutes()),
    Tool.toTwo(isUTC ? date.getUTCSeconds() : date.getSeconds())
  ];
  return `${hour}:${minite}:${second}`;
}
/**
 * 将毫秒数转换成日期yyyy-mm-dd hh:mm:ss
 * @param s {Number}
 * @returns {String}
 */
const formateDateTime = (time, isUTC = false) => {
  if (isNaN(time)) {
    return '';
  }
  return `${Tool.formatSeconds2Date(time, isUTC)} ${Tool.formateTime(time, isUTC)}`;
}
/**
 * 将对象转换为特定的字符串输出，如："k1=v1|k2=v2|k3=v3"
 * @param {*} obj  待转换的对象
 * @param {*} splitStr  字符串分隔符，如："|"
 */
const objToSpecialStr = (obj, splitStr) => {
  return Object.keys(obj).sort().map(key => `${key}=${obj[key]}`).join(',');
}
/**
 * 按数组对象中的某个属性 根据升序降序进行排序
 * @param arr   对象数组
 * @param prop 对象key值
 * @param order 排序方式
 * @returns {*}
 */
const sortBy = (arr, prop, order) => arr.sort((a, b) => {
  let left = a[prop], right = b[prop];
  if (left === undefined || left === null) {
    return order == 'desc' ? 1 : -1;
  }
  if (right == undefined || right === null) {
    return order == 'desc' ? -1 : 1;
  }
  if (left > right) return order == 'desc' ? -1 : 1;
  if (left < right) return order == 'desc' ? 1 : -1;
});
/**
 * 按数组对象中的两个属性 根据升序降序进行排序
 * @param arr   对象数组
 * @param prop1 对象属性1
 * @param prop2 对象属性2
 * @param order 排序方式
 * @returns {*}
 */
const sortByDouble = (arr, prop1, prop2, order1, order2) => arr.sort((a, b) => {
  let left = a[prop1], right = b[prop1];
  if (left === undefined || left === null) {
    return order1 == 'desc' ? 1 : -1;
  }
  if (right == undefined || right === null) {
    return order1 == 'desc' ? -1 : 1;
  }
  if (left > right) return order1 == 'desc' ? -1 : 1;
  if (left < right) return order1 == 'desc' ? 1 : -1;
  if (left === right) {
    [left, right] = [a[prop2], b[prop2]];
    if (left === undefined || left === null) {
      return order2 == 'desc' ? 1 : -1;
    }
    if (right == undefined || right === null) {
      return order2 == 'desc' ? -1 : 1;
    }
    if (left > right) return order2 == 'desc' ? -1 : 1;
    if (left < right) return order2 == 'desc' ? 1 : -1;
  }
});
/**
 * 将数组转化成以某一特征key为标识的Map对象
 * @param {Array} arr  原始数组
 * @param {Array} key  数组元素内多个可选特征key组成的数组
 */
const getMap = (arr, ...key) => {
  let map = {};
  if (arr) {
    arr.filter(item => item).forEach(item => {
      let index = '';
      for (let i = 0; i < key.length; i++) {
        if (item[key[i]]) {
          index = item[key[i]] + '';
          break;
        }
      }
      map[index] = item;
    });
  }
  return map;
}
/**
 * 将key-value数组转化成对象, 如: [{ name: 'a', value: 1 }, { name: 'b', value: 2 }] => { a: 1, b: 2 }
 * @param {Array}  arr  原始数组
 * @param {String} key  对象key
 * @param {String} key  对象value
 */
const A2O = (arr, key, value) => {
  let obj = {};
  arr.map(item => obj[item[key]] = item[value]);
  return obj;
}
/**
 * 过滤对象属性
 * @param {Object} obj   原始对象
 * @param {Array}  keys  保留的对象属性
 */
const objFilter = (obj, keys = []) => {
  let newObj = {};
  if (obj) {
    keys.map(key => {
      if (obj[key] !== undefined) {
        newObj[key] = obj[key];
      }
    });
  }
  return newObj;
}
/**
 * 数组push方法优化(防止未被初始化的报错)
 */
const arrPush = (arr, item) => {
  arr ? arr.push(item) : arr = [item];
  return arr;
}
/**
 * 串行执行
 */
const promiseSequenceExec = async (asyncArr, startIndex = 0) => {
  await asyncArr[startIndex]();
  if (startIndex + 1 < asyncArr.length) {
    await Tool.promiseSequenceExec(asyncArr, startIndex + 1);
  } 
}
/**
 * 获取客户端ip
 */
const getClientIp = req => {
  const ip = req.headers['true_client_ip'] || 
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket && req.connection.socket.remoteAddress || '');
  const ipNum = ip.split(':');
  return ipNum[ipNum.length - 1].split(',')[0];
}

module.exports = {
  toTwo,
  generateRandomString,
  formateTime,
  formatSeconds,
  formatSeconds2Date,
  formateDateTime,
  objToSpecialStr,
  objFilter,
  sortBy,
  sortByDouble,
  getMap,
  A2O,
  arrPush,
  promiseSequenceExec,
  getClientIp,
  ...lodash
};
