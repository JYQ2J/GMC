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

const INHERIT_QS = 'INHERIT_QS';

class MappingService extends BaseService {
  constructor(ctx) {
    super(ctx);
  }
  // 接口数据映射&处理
  formatMapData(isInit, result, formater, parentData, initData, qipuIdKey, qipuDataKey, arrayIndex = -1) {
    let resultItem = {};
    formater.map(child => {
      const { key, mapping = [], type = 'String', children = [], order, startIndex, size, sort, dup, a2o } = child;
      const { eval: evalStr = '', type: dataType } = mapping[0] || {}
      // 获取映射值
      let data = this.getFormatMapKey(isInit, type, mapping, parentData, initData, qipuIdKey, qipuDataKey, arrayIndex)
      if (dataType === 'EVAL' && evalStr) {
        data = /^\{[\s\S]*\}$/.test(evalStr) ? eval(
          `(${key}, ${qipuDataKey}) => ${evalStr}`
        )(data, initData[qipuDataKey] || {}) : data
      } else {
        // KV数组转对象
        const { key: a2oKey, value: a2oVal, multi: a2oMulti, required = [] } = a2o || {};
        if (type === 'A2O' && Type.isArray(data) && a2oKey) {
          let obj = {};
          data.map((item, index) => {
            let [itemKey, itemData, itemQS] = [
              this.get(item, a2oKey),
              a2oVal ? this.get(item, a2oVal) : item,
              (initData[INHERIT_QS] || {})[index]
            ]
            let isValid = this.checkRequired(isInit, required, itemData);
            if (['FIND', 'FILTER'].includes(isValid)) {
              if (IsType.isArray(itemData)) {
                itemData = itemData[isValid.toLowerCase()]((v, i) => (
                  this.checkRequired(isInit, required, v, itemQS, {}, '', i, true)
                ));
              } else {
                isValid = false;
              }
            }
            if (isValid) {
              const key = itemQS ? `${itemKey}_${itemQS}` : itemKey;
              if (obj[key]) {
                obj[key].push(itemData);
              } else {
                obj[key] = [itemData];
              }
            }
          });
          Object.keys(obj).map(key => {
            if (!a2oMulti) {
              obj[key] = obj[key].pop();
            }
          });
          data = obj;
        }
        const { key: sortKey, order: sortOrder = 'asc', afterFormat = false } = sort || {};
        const { status: dupStatus, key: dupKey } = dup || {};
        const sizeAfter = dupStatus || afterFormat;
        // 数组/对象子级遍历
        if (type === 'Array') {
          if (data) {
            data = Type.isArray(data) ? data : [data];
            // 数组排序
            if (sortKey && !afterFormat) {
              data = Tool.sortBy(data, sortKey, sortOrder, this);
            }
            // 数组裁剪
            if (size && !sizeAfter) {
              data = data.slice(parseInt(startIndex) || 0, size);
            }
            // 子级属性映射
            if (isInit && children.length > 0) {
              data = data.map((item, index) => (
                this.formatMapData(isInit, result, children, item, initData, qipuIdKey, qipuDataKey, index)
              ));
            }
          }
          // 多数据源排序
          const lastData = (isInit && parentData === initData) ? result[key] : resultItem[key];
          if (data || lastData) {
            data = this.orderData(order, data, lastData);
          }
        } else if (isInit && children.length > 0 && data) {
          // 子级属性映射
          if (type === 'A2O') {
            Object.keys(data).map(key => {
              if (Type.isObject(data[key])) {
                if (Type.isArray(data[key])) {
                  data[key] = data[key].map(item => (
                    this.formatMapData(isInit, result, children, item, initData, qipuIdKey, qipuDataKey)
                  ));
                } else {
                  data[key] = this.formatMapData(isInit, result, children, data[key], initData, qipuIdKey, qipuDataKey);
                }
              }
            });
          } else {
            data = this.formatMapData(isInit, result, children, data, initData, qipuIdKey, qipuDataKey);
          }
        }
        if (type === 'Number') {
          data = parseFloat(data);
        } else if (type === 'Boolean') {
          data = (data === 'false' || !data) ? false : true;
        } else if (type === 'Array' && Type.isArray(data)) {
          const sizeAfter = dupStatus || afterFormat;
          if (dupStatus) {
            data = dupKey ? Tool.dupFilter(data, dupKey, this) : [...new Set(data)];
          }
          if (sortKey && afterFormat) {
            data = Tool.sortBy(data, sortKey, sortOrder, this);
          }
          if (size && sizeAfter) {
            data = data.slice(parseInt(startIndex) || 0, size);
          }
        }
      }
      // 根节点校验
      if (isInit && parentData === initData) {
        result[key] = data;
      } else {
        resultItem[key] = data;
      }
    });
    return resultItem;
  }
  // 获取映射数据单个字段的键值
  getFormatMapKey(isInit, dataType, mapping, parentData, initData, qipuIdKey, qipuDataKey, arrayIndex = -1) {
    // 奇谱数据信息
    const qipuId = qipuIdKey > 0 ? qipuIdKey : ((qipuIdKey && parentData) ? parentData[qipuIdKey.split('.').pop()] : '');
    const qipuData = qipuId ? initData[qipuDataKey][qipuId] : {};
    // 定义结果
    let result;
    mapping.some((mappingItem, index) => {
      let { type = 'KEY', field = 'LOCAL', value, operation = '', required = [], kv2v = {}, link = {} } = mappingItem;
      // 输出条件校验
      const isValid = this.checkRequired(isInit, required, parentData, initData, qipuData, qipuDataKey, arrayIndex);
      // 判定无效, 返回 undefined
      if (!isValid) {
        return ;
      }
      const mapData = (field === 'LOCAL' ? parentData : initData);
      // 字段映射
      if (dataType === 'X2O') {
        let aggObj = {};
        value.split(',').map(v => {
          if (isInit) {
            aggObj[v] = this.getKey(
              v.startsWith(`${qipuDataKey}.`) ? qipuData : mapData,
              qipuDataKey ? v.replace(new RegExp(`^${qipuDataKey}.`), '') : v
            )
          } else {
            aggObj[v] = field === 'LOCAL' ? this.getKey(parentData, v) : this.getMixKey(initData, parentData, v);
          }
        })
        value = aggObj;
      } else if (dataType === 'Object' && type === 'VALUE') {
        value = {};
      } else if (type === 'RULE' && Rule[value]) {
        value = Rule[value]({ ...mapData, ...qipuData }, initData);
      } else if (['KEY', 'KV2V', 'EVAL'].includes(type)) {
        if (isInit) {
          value = this.getKey(
            value.startsWith(`${qipuDataKey}.`) ? qipuData : mapData,
            qipuDataKey ? value.replace(new RegExp(`^${qipuDataKey}.`), '') : value
          );
        } else {
          value = field === 'LOCAL' ? this.getKey(parentData, value) : this.getMixKey(initData, parentData, value);
        }
      } else if (type === 'INDEX') {
        value = arrayIndex;
      } else if (type === 'INDEX+') {
        value = arrayIndex + 1;
      } else if (type === 'INPUT') {
        value = this.ctx.query[value];
      }
      // 计算规则-KV数组输出单个Value
      const { key: kk, keyName: kn, value: kv } = kv2v || {};
      if (type === 'KV2V' && IsType.isArray(value) && kk && kn && kv) {
        value = this.get(value.find(item => (
          kn.includes('*') ? new RegExp(kn.replace(/\*/g, '(.*)')).test(`${item[kk]}`) : item[kk] == kn
        )), kv);
      }
      // 计算规则-数组过滤
      if (['FIND', 'FILTER'].includes(isValid) && IsType.isArray(value)) {
        value = value[dataType === 'Array' ? 'filter' : 'find']((item, index) => {
          const itemQipuId = (qipuIdKey && item) ? item[qipuIdKey.split('.').pop()] : '';
          const itemQipuData = itemQipuId ? initData[qipuDataKey][itemQipuId] : {};
          return this.checkRequired(isInit, required, item, initData, itemQipuData, qipuDataKey, index, true);
        });
      }
      // 字符串分割
      const opSplitKey = operation.match(/SPLIT\((.+)\)/);
      if (opSplitKey && value && typeof value === 'string') {
        value = value.split(opSplitKey[1]);
      }
      // 字符串省略
      const opEllipsisLen = operation.match(/ELLIPSIS\((.+)\)/);
      if (opEllipsisLen && value && typeof value === 'string' && value.length > opEllipsisLen[1]) {
        value = `${value.substring(0, opEllipsisLen[1])}...`;
      }
      if (operation === 'SCORE') {
        value = value > 0 ? value.toFixed(1) : '';
      } else if (operation === 'W') {
        value = Tool.toW(value);
      } else if (operation === 'T2V') {
        value = (value === 'NOW' ? new Date() : new Date(value)).valueOf();
      } else if (operation === 'T2Y') {
        value = (value || '').length > 3 ? (value || '').substr(0, 4) : '';
      } else if (operation === 'T2YMD') {
        value = Tool.formatFullDate(value);
      } else if (operation === 'YMD') {
        value = Tool.formatSeconds2Date(value);
      } else if (operation === 'YEAR') {
        value = new Date(value).getFullYear() || '';
      } else if (operation === 'MONTH') {
        value = new Date(value || '').getMonth() + 1 || '';
      } else if (operation === 'WEEK') {
        const day = new Date(value).getDay();
        value = day ? day : 7;
      } else if (operation === 'LINK') {
        const { sizeDefault, size1x, size2x, removeHttp } = link || {};
        let [link1x, link2x] = [
          Tool.getPicUrlWithSize(value, size1x),
          Tool.getPicUrlWithSize(value, size2x)
        ];
        if (removeHttp) {
          [link1x, link2x] = [urlTool.removeHttp(link1x), urlTool.removeHttp(link2x)];
        }
        if (size2x) {
          value = { '1x': link1x, '2x': link2x };
        } else {
          value = link1x;
        }
      }
      // 计算规则-N元运算
      const [nextOperation, evalOperation] = [
        (mapping[index + 1] || {}).operation || '',
        ['+', '-', '*', '/']
      ];
      if (!index && evalOperation.includes(nextOperation)) {
        result = parseFloat(value).toString() === value ? value : JSON.stringify(value);
      } else if (evalOperation.includes(operation)) {
        const operateValue = parseFloat(value).toString() === value ? value : JSON.stringify(value);
        if (evalOperation.includes(nextOperation)) {
          result += (operation + operateValue);
        } else {
          result = eval(result + operation + operateValue);
        }
      } else {
        return (value || value === 0) && (result = value);
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