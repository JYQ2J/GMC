'use strict'
/**
 * @desc: 错误处理中间件
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const httpCode = require('../util/code')
const Tool = require('../util/tool')

module.exports = async (ctx, next) => {
  try {
  	// 标志ID
  	ctx.requestId = new Date().valueOf() + Tool.generateRandomString();
  	// 执行下一步
    await next();
  } catch (err) {
    // 错误日志记录
    console.error(err);
    // 返回错误码
    ctx.body = httpCode(err.message);
  }
}
