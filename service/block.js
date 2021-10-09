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
    this.mapping = new MappingService(this.ctx);
  }
  getBlockModel(platform, ex = false) {
    return this.ctx.db[`${platform}_${ex ? 'ex_' : ''}block`];
  }
  // 数据读取方法
  async getData(result = {}, api = {}, prevData = {}, prevApi = []) {
    // const { ctx, interface } = this || {};
    const [Data, dao] = [new DataService(this.ctx), new Dao(this.ctx)];
    const { _id, base = {}, required = [], level = 'error', params = [], body = [], headers = [], formater = [], qipuIdConst, qipuIdKey, qipuDataKey, qipuSize = 0 } = api;
    // 获取请求参数
    const qs = this.interface.getApiParams(this.ctx.query, base, params, prevApi, result, prevData);
    const formData = this.interface.getApiParams(this.ctx.request.body, base, body, prevApi, result, prevData);
    const headerData = this.interface.getApiParams(this.ctx.headers, base, headers, prevApi, result, prevData);
    // 数据源校验
    if (this.checkRequired(true, required, { ...qs, ...formData })) {
      // 请求原始数据
      let initData = {};
      let { url, url_encode, content_type = 'FORM', timeout = 3000, method } = base;
      if (method === 'POST') {
        initData = this.checkDaoData(await dao.requestPost(url, formData, headerData, content_type === 'FORM', content_type === 'JSON', timeout, qs), level);
      } else {
        const [multiKey, supplement] = [Object.keys(qs).find(key => (
          qs[key] && qs[key].out && IsType.isArray(qs[key].in)
        )), url_encode ? {} : {
          qsStringifyOptions: {
            encodeURIComponent: uri => uri
          },
          useQuerystring: true
        }];
        if (multiKey) {
          initData = {
            [qs[multiKey].out]: await Promise.all(qs[multiKey].in.map(async (v, i) => {
              const qsObj = { ...qs, [multiKey]: v };
              if (qs[multiKey].sign) {
                qsObj[qs[multiKey].sign.key] = qs[multiKey].sign.value[i];
              }
              return {
                [multiKey]: v,
                ...this.checkDaoData(await dao.baseline.requestGet(url, qsObj, timeout, supplement, headerData), level)
              }
            }))
          };
          if (qs[multiKey].append) {
            initData[INHERIT_QS] = qs[multiKey].append;
          }
        } else {
          initData = this.checkDaoData(await dao.requestGet(url, qs, timeout, supplement, headerData), level);
        }
      }
      // 获取奇谱数据
      if (qipuIdKey) {
        let qipuIdData = qipuIdConst ? [qipuIdKey] : qipuIdKey.split(',').map(key => this.getKey(initData, key));
        let qipuIdArr = this.flatten(qipuIdData.map(item => IsType.isArray(item) ? item : [item]));
        if (qipuSize) {
          qipuIdArr = qipuIdArr.slice(0, qipuSize);
        }
        initData[qipuDataKey] = await Data.getEntity([...new Set(qipuIdArr)].filter(id => id > 0));
      }
      // 记录原始数据
      prevData[_id] = initData;
      // 组装数据
      this.mapping.formatMapData(true, result, formater, initData, initData, qipuIdKey, qipuDataKey);
    }
  }
  // 模块数据映射主函数
  async mapBlockToData(params, env, body = {}) {
    const { ctx } = this;
    let [data, apiTree, initData, Gray] = [{}, [], {}, new GrayService(ctx)];
    // 获取block信息
    const { id, platform } = params;
    if (['preview', 'initData'].includes(env)) {
      data = await this.mergeApiToBlock(platform, body);
    } else {
      data = await this.getBlockModel(platform, env === 'ex').findOne({ _id: id }).populate('list.api.base', 'name url url_encode content_type timeout method level cache');
      data = data ? data.toObject() : {};
    }
    const { list = [], gray, isOnline, chunk, cache = {} } = data;
    if (!env && !isOnline) {
      return { base: { isOnline } };
    }
    // 获取对应灰度的block
    const { _id: block, gray: grayKey, api = [], formater = [], deleter = [], abtest } = await Gray.getGrayItem(list, gray);
    // 读取模块级缓存
    const [useCache, cacheKey] = [
      (!env) && (cache.time > 0),
      (cache.key || []).length ? `${grayKey}_${cache.key.map(key => Tool.get(ctx.query, key) || Tool.get(ctx.request.body, key) || '').join('_')}` : grayKey
    ];
    const result = useCache && (await this.ctx.redis.nestedGet(cacheKey, `${platform}_${id}`)) || {};
    // 未命中缓存时，根据策略映射数据
    if (Type.isEmptyObj(result || {}) || result === 'cacheerror') {
      // 获取接口调用树
      this.interface.getApiTree(apiTree, api);
      // 串行执行接口调用树，并行调取每一级接口
      if (apiTree.length > 0) {
        await Tool.promiseSequenceExec(apiTree.map((arr, index) => {
          const prevApi = Tool.flatten(apiTree.slice(0, index + 1));
          return () => Promise.all(arr.map(item => (
            this.getData(result, item, initData, prevApi)
          )));
        }));
      }
      // 映射后处理
      if (formater.length > 0) {
        formater.map(child => {
          const keyArr = child.key.split('.');
          const itemKey = keyArr.pop();
          // 映射输入节点为空时，默认取原有映射数据
          (child.mapping || []).map(item => {
            if ((item.type || 'KEY') === 'KEY' && !item.value) {
              item.value = item.field === 'GLOBAL' ? child.key : itemKey;
            }
          });
          // 获取处理节点父级数据
          const handleData = keyArr.length ? this.getKey(result, keyArr.join('.')) : result;
          (child.key.includes('[*]') ? handleData : [handleData]).filter(item => item).map((item, index) => {
            item[itemKey] = this.mapping.formatMapData(false, {}, [{
              ...child,
              key: itemKey
            }], item, result, '', '', index)[itemKey];
          });
        });
      }
      // 去除废弃节点
      if (deleter.length > 0) {
        deleter.map(key => {
          if (key.includes('[*]')) {
            const keyArr = key.split('.');
            const itemKey = keyArr.pop();
            this.getKey(result, keyArr.join('.')).filter(item => item).map(item => delete item[itemKey]);
          } else {
            delete result[key]
          }
        });
      }
      // 写入模块级缓存
      useCache && this.ctx.redis.set(cacheKey, result, cache.time, `${platform}_${id}`);
    } else {
      ctx.set({ 'redis-hits-count': 1 });
    }
    const response = {
      base: id.endsWith('Data') ? { isOnline } : { isOnline, block, chunk, abtest },
      formatData: result
    };
    if (env) {
      response.rtt = ctx.rtt;
    }
    if (env === 'initData') {
      return initData;
    } else {
      return response;
    }
  }
  // 预览模块数据
  async mergeApiToBlock(platform, block = {}) {
    const list = block.list || [];
    // 获取Api ID
    const apiList = Tool.flatten(
      list.map(item => item.api.map(api => api.base))
    ).filter(id => id);
    // 获取Api数据
    const apiData = await this.interface.getInterfaceModel(platform).find({
      _id: { $in: apiList }
    }, { name: 1, url: 1, url_encode: 1, content_type: 1, method: 1 });
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
      .populate('list.api.base', 'name url url_encode content_type timeout method level cache');
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
    list.map(item => this.ctx.redis.delete(`${platform}_${_id}${item.gray}`));
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