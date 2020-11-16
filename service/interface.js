'use strict';
/**
 * @desc: 接口服务
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const BaseService = require('./base');
const Tool = require('../util/tool');
const Type = require('../util/type');
const Sign = require('../util/sign');

class ApiService extends BaseService {
  constructor(ctx) {
    super(ctx);
  }
  getInterfaceModel(platform, ex = false) {
    return this.ctx.db[`${platform}_${ex ? 'ex_' : ''}interface`];
  }
  // 获取接口调用树
  getApiTree(tree, api, prevLevel = []) {
    let [loaded, unload] = [[], []];
    api.map(item => {
      (item.params.every(param => (
        param.type !== 'INHERIT' || prevLevel.includes(param.from.replace(/_FORMATER$/, ''))
      )) ? loaded : unload).push(item);
    });
    if (loaded.length) {
      tree.push(loaded);
    }
    if (unload.length) {
      this.getApiTree(tree, unload, loaded.map(item => item.base._id).concat(prevLevel));
    }
    return tree;
  }
  // 获取接口参数对象
  getApiParams(base, params, api, formatData, initData) {
    const { ctx } = this;
    const { cookies, header, req, requestId } = ctx;
    const qs = {};
    params.map(param => {
      let { type = 'KV' , _id, value, from, multiKey, splitKey = ',', chunkSize = 1 } = param;
      if (type === 'KV') {
        qs[_id] = value;
      } else if (type === 'INPUT') {
        qs[_id] = ctx.params.env ? (ctx.query[_id] || value) : ctx.query[_id];
      } else if (type === 'COOKIE') {
        qs[_id] = ctx.query[value] || cookies.get(value) || (value === 'QC005' ? 'NEW' : '');
      } else if (type === 'IP') {
        qs[_id] = ctx.query.ip || Tool.getClientIp(req) || '';
      } else if (type === 'UA') {
        qs[_id] = header['user-agent'] || '';
      } else if (type === 'REFER') {
        qs[_id] = ctx.query.referer || header.referer || '';
      } else if (type === 'REQID') {
        qs[_id] = requestId;
      } else if (type === 'TIMESTAMP') {
        qs[_id] = new Date().valueOf();
      } else if (type === 'INHERIT') {
        const regex = new RegExp('_FORMATER$');
        const fromApi = api.find(item => item.base._id === from.replace(regex, ''));
        const fromFormat = regex.test(from);
        if (fromFormat) {
          value = this.getKey(formatData, value);
        } else {
          value = this.getKey(initData[fromApi._id], value);
        }
        if (Type.isArray(value)) {
          if (multiKey) {
            qs[_id] = {
              out: multiKey,
              in: Tool.chunk(value, chunkSize).map(arr => arr.join(splitKey))
            };
          } else {
            qs[_id] = value.join(splitKey);
          }
        } else {
          qs[_id] = value;
        }
      }
    });
    const sign = params.find(param => param.type === 'SIGN');
    if (sign) {
      qs[sign._id] = Sign[sign.value](qs, base.url);
    }
    return qs;
  }

  async getInterfaceCount(platform, params = {}) {
    (delete params.page) && (delete params.size);
    this.handleDimParams(params, ['name']);
    return await this.getInterfaceModel(platform).find(params).count();
  }

  async getInterface(platform, params) {
    // 分页
    const { page = 1, size = 20 } = params;
    (delete params.page) && (delete params.size);
    // 模糊匹配
    this.handleDimParams(params, ['name']);
    // 查询
    return await this.getInterfaceModel(platform)
      .find(params)
      .limit(parseInt(size))
      .skip((page - 1) * size);
  }

  async getExInterface(platform, _id) {
    return this.getExList({ model: this.getInterfaceModel(platform, true), _id });
  }

  async createInterface(platform, params) {
    return await this.getInterfaceModel(platform)(params).save();
  }

  async updateInterface(_id, platform, params) {
    return await this.updateAndSaveEx({
      _id,
      params,
      model: this.getInterfaceModel(platform),
      modelEx: this.getInterfaceModel(platform, true),
      exLen: 6
    });
  }
}

module.exports = ApiService;