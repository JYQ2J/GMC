'use strict';
/**
 * @desc: 签名算法
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const Tool = require('./tool');
const crypto = require('./crypto');

const secretKey = {
  exampleKey: 'abcd1234'
};

const paramSign = (secretKey, paramsObj, splitKey = '|') => {
  //计算签名时，需按接口方约定的这种特殊字符串格式传参：`k1=v1|k2=v2|k3=v3|${secretKey}`
  const str = Tool.objToSpecialStr(paramsObj, splitKey) + secretKey;
  //生成签名
  return apiCrypto.Md5(paramStr);
};

module.exports = {
  EXAMPLE: (qs) => paramSign(secretKey.exampleKey, qs)
}
