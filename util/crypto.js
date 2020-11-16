"use strict";
/**
 * @desc: 加密模块
 * @author: jiayanqi
 * @date: 2020-03-11
 */
const crypto = require('crypto');

module.exports = {
  Md5: str => crypto.createHash('md5').update(str, 'utf8').digest('hex'),
  Base64: str => Buffer.from(str).toString('base64')
}
