'use strict';
/**
 * @desc: 映射服务
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const BaseService = require('./base');
const Tool = require('../util/tool');
const Rule = require('../util/rule');
const Type = require('../util/type');

class MappingService extends BaseService {
  constructor(ctx) {
    super(ctx);
  }
  // 接口数据映射&处理
  formatMapData(result, formater, parentData, initData, qipuIdKey, qipuDataKey) {
    let resultItem = {};
    formater.map(child => {
      const { key, mapping = [], type = 'String', children = [], order, startIndex, size, sort, a2o } = child;
      // 获取映射值
      let data = this.getFormatMapKey(type, mapping, parentData, initData, qipuIdKey, qipuDataKey);
      // KV数组转对象
      const { key: a2oKey, value: a2oVal } = a2o || {};
      if (type === 'A2O' && Type.isArray(data) && a2oKey) {
        data = a2oVal ? Tool.A2O(data, a2oKey, a2oVal) : Tool.getMap(data, a2oKey);
      }
      // 数组/对象子级遍历
      if (type === 'Array' && data) {
        data = Type.isArray(data) ? data : [data];
        // 数组排序
        const { key: sortKey, order: sortOrder = 'asc' } = sort || {};
        if (sortKey) {
          data = Tool.sortBy(data, sortKey, sortOrder);
        }
        // 数组裁剪
        if (size) {
          data = data.slice(parseInt(startIndex) || 0, size);
        }
        // 子级属性映射
        if (children.length > 0) {
          data = data.map(item => this.formatMapData(result, children, item, initData, qipuIdKey, qipuDataKey));
        }
        // 多数据源排序
        data = this.orderData(order, data, resultItem[key]);
      } else if (children.length > 0 && data) {
        // 子级属性映射
        if (type === 'A2O') {
          Object.keys(data).map(key => {
            if (Type.isObject(data[key])) {
              if (Type.isArray(data[key])) {
                data[key] = data[key].map(item => (
                  this.formatMapData(result, children, item, initData, qipuIdKey, qipuDataKey)
                ));
              } else {
                data[key] = this.formatMapData(result, children, data[key], initData, qipuIdKey, qipuDataKey);
              }
            }
          });
        } else {
          data = this.formatMapData(result, children, data, initData, qipuIdKey, qipuDataKey);
        }
      }
      // 根节点校验
      if (parentData === initData) {
        result[key] = data;
      } else {
        resultItem[key] = data;
      }
    });
    return resultItem;
  }
  // 获取映射数据单个字段的键值
  getFormatMapKey(dataType, mapping, parentData, initData, qipuIdKey, qipuDataKey) {
    // 奇谱数据信息
    const qipuId = (qipuIdKey && parentData) ? parentData[qipuIdKey.split('.').pop()] : '';
    const qipuData = qipuId ? Tool.get(initData[qipuDataKey], `${qipuId}`, {}) : {};
    // 定义结果
    let result;
    mapping.some((mappingItem, index) => {
      let { type = 'KEY', value, operation, required = [], kv2v = {} } = mappingItem;
      // 输出条件校验
      const isValid = this.checkRequired(required, parentData, initData, qipuData, qipuDataKey);
      // 判定无效, 返回 undefined
      if (!isValid) {
        return ;
      }
      // 字段映射
      if (type === 'RULE') {
        value = Rule[value](qipuData);
      } else if (['KEY', 'KV2V'].includes(type)) {
        value = this.getKey(
          value.startsWith(`${qipuDataKey}.`) ? qipuData : parentData,
          qipuDataKey ? value.replace(new RegExp(`^${qipuDataKey}.`), '') : value
        );
      }
      // 计算规则-KV数组输出单个Value
      const { key: kk, keyName: kn, value: kv } = kv2v || {};
      if (type === 'KV2V' && Type.isArray(value) && kk && kn && kv) {
        value = this.getKey(value.find(item => item[kk] == kn), kv);
      }
      // 计算规则-数组过滤
      if (isValid === 'FIND' && Type.isArray(value)) {
        value = value[dataType === 'Array' ? 'filter' : 'find'](item => (
          this.checkRequired(required, item, initData, qipuData, qipuDataKey, true)
        ));
      }
      // 计算规则-N元运算
      if ((mapping[1] || {}).operation) {
        result = index ? eval(result + operation + value) : value;
      } else {
        return value && (result = value);
      }
    });
    return result;
  }
  // 对数组数据进行排序
  orderData(order, data = [], lastData = []) {
    let result = [];
    const { STRATEGY_ORDER } = lastData[0] || {};
    if (STRATEGY_ORDER) {
      result = order > STRATEGY_ORDER ? [...lastData, ...data] : [...data, ...lastData];
    } else {
      result = data;
    }
    if (data && Type.isObject(data[0])) {
      data[0].STRATEGY_ORDER = order;
    }
    return result;
  }
}

module.exports = MappingService