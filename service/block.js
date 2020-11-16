'use strict';
/**
 * @desc: 模块服务
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const Dao = require('../dao/base');
const BaseService = require('./base');
const DataService = require('./data');
const InterfaceService = require('./interface');
const MappingService = require('./mapping');
const GrayService = require('./gray');
const Tool = require('../util/tool');
const Type = require('../util/type');

class BlockService extends BaseService {
  constructor(ctx) {
    super(ctx);
    this.interface = new InterfaceService(ctx);
  }
  getBlockModel(platform, ex = false) {
    return this.ctx.db[`${platform}_${ex ? 'ex_' : ''}block`];
  }
  // 数据读取方法
  async getData(result = {}, api = {}, prevData = {}, prevApi = []) {
    const { ctx, interface } = this;
    const [Data, Mapping, dao] = [new DataService(ctx), new MappingService(ctx), new Dao()];
    const { _id, base = {}, required = [], level = 'error', params = [], body = [], headers = [], formater = [], qipuIdKey, qipuDataKey } = api;
    // 获取请求参数
    const qs = interface.getApiParams(base, params, prevApi, result, prevData);
    const formData = interface.getApiParams(base, body, prevApi, result, prevData);
    const headerData = interface.getApiParams(base, headers);
    // 数据源校验
    if (this.checkRequired(required, { ...qs, ...formData })) {
      // 请求原始数据
      let initData = {};
      let { url, timeout = 3000, method } = base;
      if (method === 'POST') {
        initData = this.checkDaoData(await dao.requestPost(url, formData, headerData, false, false, timeout, qs), level);
      } else {
        const [multiKey, supplement] = [Object.keys(qs).find(key => (
          qs[key] && qs[key].out && Type.isArray(qs[key].in)
        )), {
          qsStringifyOptions: {
            encodeURIComponent: uri => uri
          },
          useQuerystring: true
        }];
        if (multiKey) {
          initData = {
            [qs[multiKey].out]: await Promise.all(qs[multiKey].in.map(async v => (
              this.checkDaoData(await dao.requestGet(url, { ...qs, [multiKey]: v }, timeout, supplement, headerData), level)
            )))
          };
        } else {
          initData = this.checkDaoData(await dao.requestGet(url, qs, timeout, supplement, headerData), level);
        }
      }
      // 获取奇谱数据
      if (qipuIdKey) {
        initData[qipuDataKey] = await Data.getEntity([...new Set(this.getKey(initData, qipuIdKey))]);
      }
      // 记录原始数据
      prevData[_id] = initData;
      // 组装数据
      Mapping.formatMapData(result, formater, initData, initData, qipuIdKey, qipuDataKey);
    }
  }
  // 模块数据映射主函数
  async mapBlockToData(params, env, body = {}) {
    const { ctx, interface } = this;
    let [data, apiTree, initData, Gray] = [{}, [], {}, new GrayService(ctx)];
    // 获取block信息
    const { id, platform } = params;
    if (env === 'preview') {
      data = await this.mergeApiToBlock(platform, body);
    } else {
      data = await this.getBlockModel(platform, env === 'ex').findOne({ _id: id }).populate('list.api.base', 'name url timeout method level cache');
      data = data ? data.toObject() : {};
    }
    const { list = [], gray, isOnline, chunk, cache = {} } = data;
    if (!env && !isOnline) {
      return { base: { isOnline } };
    }
    // 获取对应灰度的block
    const { _id: block, gray: grayKey, api = [], abtest } = await Gray.getGrayItem(list, gray);
    // 读取模块级缓存
    const [useCache, cacheKey] = [
      (!env) && (cache.time > 0),
      (cache.key || []).length ? `${grayKey}_${cache.key.map(key => ctx.query[key] || '').join('_')}` : grayKey
    ];
    const result = useCache && (await ctx.redis.nestedGet(cacheKey, `pcw_${id}`)) || {};
    // 未命中缓存时，根据策略映射数据
    if (Type.isEmptyObj(result || {}) || result === 'cacheerror') {
      // 获取接口调用树
      interface.getApiTree(apiTree, api);
      // 串行执行接口调用树，并行调取每一级接口
      if (apiTree.length > 0) {
        await Tool.promiseSequenceExec(apiTree.map((arr, index) => {
          const prevApi = Tool.flatten(apiTree.slice(0, index + 1));
          return () => Promise.all(arr.map(item => (
            this.getData(result, item, initData, prevApi)
          )));
        }));
      }
      // 写入模块级缓存
      useCache && ctx.redis.set(cacheKey, result, cache.time, `pcw_${id}`);
    }
    const response = {
      base: id.endsWith('Data') ? { isOnline } : { isOnline, block, chunk, abtest },
      formatData: result
    };
    if (env) {
      response.rtt = ctx.rtt;
    }
    return response;
  }
  // 预览模块数据
  async mergeApiToBlock(platform, block = {}) {
    const list = block.list || [];
    // 获取Api ID
    const apiList = this.flatten(
      list.map(item => item.api.map(api => api.base))
    ).filter(id => id);
    // 获取Api数据
    const apiData = await this.interface.getInterfaceModel(platform).find({
      _id: { $in: apiList }
    }, { name: 1, url: 1 });
    const apiObj = Tool.getMap(apiData, '_id');
    // Merge Api数据
    list.map(item => {
      item.api.map(api => {
        api.base = apiObj[api.base];
      });
    });
    return block;
  }

  async getBlockCount(platform, params = {}) {
    (delete params.page) && (delete params.size);
    this.handleDimParams(params, ['name']);
    return await this.getBlockModel(platform).find(params).count();
  }

  async getBlock(platform, params = {}) {
    // 分页
    const { page = 1, size = 20, _id } = params;
    (delete params.page) && (delete params.size);
    // 模糊匹配
    this.handleDimParams(params, ['name']);
    // 查询
    let data = await this.getBlockModel(platform)
      .find(_id ? { ...params, _id: { $in: _id.split(',') } } : params)
      .limit(parseInt(size))
      .skip((page - 1) * size)
      .populate('list.api.base', 'name url timeout method level cache');
    return Tool.getMap(data, '_id');
  }

  async getExBlock(platform, _id) {
    return this.getExList({ model: this.getBlockModel(platform, true), platform, _id });
  }

  async createBlock(platform, params) {
    return await this.getBlockModel(platform)(params).save();
  }

  async updateBlock(_id, platform, params) {
    const { chunk = [], list = [] } = params;
    // 清除模块级缓存
    list.map(item => ctx.redis.delete(`pcw_${_id}${item.gray}`));
    // 线上模块存入历史
    if (params.isOnline) {
      return await this.updateAndSaveEx({
        _id,
        params: {
          chunk,
          ...params
        },
        modelEx: this.getBlockModel(platform, true),
        model: this.getBlockModel(platform),
        exLen: 6
      });
    } else {
      return await this.getBlockModel(platform).update({ _id }, {
        update_time: new Date(),
        ...params
      });
    }
  }
}

module.exports = BlockService