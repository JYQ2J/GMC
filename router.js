'use strict';
/**
 * @desc: 路由列表
 * @author: jiayanqi
 * @date: 2020-11-11
 */
const router = require('koa-router')();
const { dbList } = require('./config');
const httpCode = require('./util/code');

router.options('/(.*)', ctx => ctx.status = 204);
router.get('/', ctx => ctx.body = httpCode('success', 'welcome to use 71GMC service'));

const BlockService = require('./service/block');
const InterfaceService = require('./service/block');

const response = async (ctx, service, method, ...args) => {
  service = new service(ctx);
  ctx.body = httpCode('success', await service[method](...args));
};

const strategyPlatform = dbList.find(item => item.collection === 'strategy').platform || [];

router.post('/strategy/:platform/data/:id/:env', async ctx => {
  const { id, platform, env } = ctx.params;
  if (!strategyPlatform.includes(platform) || !id) {
    throw new Error('arg_error');
  }
  await response(ctx, BlockService, 'mapBlockToData', ctx.params, env, ctx.request.body);
});

router.get('/strategy/:platform/data/:id', async ctx => {
  const { id, platform } = ctx.params;
  if (!strategyPlatform.includes(platform) || !id) {
    throw new Error('arg_error');
  }
  await response(ctx, BlockService, 'mapBlockToData', ctx.params);
});

router.get('/strategy/:platform/exblock/:id', async ctx => {
  const { platform, id } = ctx.params || {};
  if (!strategyPlatform.includes(platform) || !id) {
    throw new ApiError('arg_error');
  }
  await response(ctx, BlockService, 'getExBlock', platform, id);
});

router.get('/strategy/:platform/block', async ctx => {
  const { platform } = ctx.params || {};
  if (!strategyPlatform.includes(platform)) {
    throw new ApiError('arg_error');
  }
  await response(ctx, BlockService, 'getBlock', platform, ctx.query);
});

router.get('/strategy/:platform/block/count', async ctx => {
  const { platform } = ctx.params || {};
  if (!strategyPlatform.includes(platform)) {
    throw new ApiError('arg_error');
  }
  await response(ctx, BlockService, 'getBlockCount', platform, ctx.query);
});

router.post('/strategy/:platform/block', async ctx => {
  const { platform } = ctx.params || {};
  const { _id } = ctx.request.body || {};
  if (!strategyPlatform.includes(platform) || !_id) {
    throw new ApiError('arg_error');
  }
  await response(ctx, BlockService, 'createBlock', platform, ctx.request.body);
});

router.post('/strategy/:platform/block/:id', async ctx => {
  const { platform, id } = ctx.params || {};
  if (!strategyPlatform.includes(platform) || !id) {
    throw new ApiError('arg_error');
  }
  await response(ctx, BlockService, 'updateBlock', platform, ctx.request.body);
});

router.get('/strategy/:platform/exinterface/:id', async ctx => {
  const { platform, id } = ctx.params || {};
  if (!strategyPlatform.includes(platform) || !id) {
    throw new ApiError('arg_error');
  }
  await response(ctx, InterfaceService, 'getExInterface', platform, id);
});

router.get('/strategy/:platform/interface', async ctx => {
  const { platform } = ctx.params || {};
  if (!strategyPlatform.includes(platform)) {
    throw new ApiError('arg_error');
  }
  await response(ctx, InterfaceService, 'getInterface', platform, ctx.query);
});

router.get('/strategy/:platform/interface/count', async ctx => {
  const { platform } = ctx.params || {};
  if (!strategyPlatform.includes(platform)) {
    throw new ApiError('arg_error');
  }
  await response(ctx, InterfaceService, 'getInterfaceCount', platform, ctx.query);
});

router.post('/strategy/:platform/interface', async ctx => {
  const { platform } = ctx.params || {};
  const { _id } = ctx.request.body || {};
  if (!strategyPlatform.includes(platform) || !_id) {
    throw new ApiError('arg_error');
  }
  await response(ctx, InterfaceService, 'createInterface', platform, ctx.request.body);
});

router.post('/strategy/:platform/interface/:id', async ctx => {
  const { platform, id } = ctx.params || {};
  if (!strategyPlatform.includes(platform) || !id) {
    throw new ApiError('arg_error');
  }
  await response(ctx, InterfaceService, 'updateInterface', platform, ctx.request.body);
});

module.exports = router;