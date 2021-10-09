'use strict';
/**
 * @desc: 入口函数
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const Koa = require('koa');
const cors = require('@koa/cors');
const app = new Koa();
// 数据库连接
app.context.db = require('./schema');
app.context.redis = new (require('./redis'))();
// 前置中间件
app.use(cors({ origin: '*' }));
app.use(require('./middleware/errorHandler'));
app.use(require('koa-body')({ multipart: true }));
// 路由映射
const router = require('./router');
app.use(router.routes());
app.use(router.allowedMethods());
// 监听端口
const port = process.argv[3] || 3000;
app.listen(port);

console.log('71GMC has been started ...');