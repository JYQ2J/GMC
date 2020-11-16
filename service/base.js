'use strict';
/**
 * @desc: 基础方法
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const Tool = require('../util/tool');

class BaseService {
  constructor(ctx) {
    this.ctx = ctx;
  }
  // 数据校验
  checkDaoData(daoData, level = 'warn', customCheckFn = () => true, opts = {}) {
    const { type, data = {} } = daoData || {};
    if (level === 'error') {
      if (type !== 'success') {
        throw new Error(type);
      } else if (!customCheckFn(data)) {
        const { type = 'request_failed', msg } = opts;
        throw new Error(type);
      }
    } else if (level === 'warn') {
      if (type !== 'success' || !customCheckFn(data)) {
        console.log(daoData);
      }
    }
    return data;
  }
  // 获取单键值
  getKey(data, initKey) {
    const [isFlatten, key] = [initKey.endsWith('[*]'), initKey.replace(/\[\*\]$/, '')];
    const result = key.includes('[*].') ? this.getMultiKey(data, key.split('[*].'), []) : Tool.get(data, key);
    return isFlatten ? this.flatten(result) : result;
  }
  // 获取扁平化多键值
  getMultiKey(data, keyArr, result = []) {
    const [left, right] = [keyArr[0], keyArr.slice(1)];
    Tool.get(data, left, []).map(item => {
      if (right.length > 1) {
        this.getMultiKey(item, right, result);
      } else {
        const val = Tool.get(item, right[0]);
        ![null, undefined].includes(val) && result.push(val);
      }
    });
    return result;
  }
  // 条件验证器 - 映射校验&数据源校验
  checkRequired(required, parentData, initData = {}, qipuData = {}, qipuDataKey = '', isFind = false) {
    let isValid = (required.length === 0);
    // MUST: 任一条件不符合则结束循环, 判定无效;
    // SHOULD: 任一条件符合则结束循环, 判定有效;
    required.find(item => {
      const { type, variable = [] } = item || {};
      let [operateValue, operateResult] = ['', true]
      variable.some((v, i) => {
        let { field, isFormat = false, type = 'KEY', value = '', operation = '!!' } = v;
        if (operation === 'FIND' && !isFind) {
          return operateResult = operation;
        }
        if (type === 'KEY') {
          if (value.startsWith(`${qipuDataKey}.`)) {
            value = Tool.get(qipuData, value.replace(new RegExp(`^${qipuDataKey}.`), ''));
          } else {
            value = Tool.get(field === 'GLOBAL' ? initData : parentData, value);
          }
        }
        if (!i && variable[i + 1]) {
          operateValue = value;
        } else if (operation === 'ENTITY') {
          operateResult = ((value || '').toUpperCase() === Tool.getQipuType(operateValue));
        } else if (operation === 'WEEK') {
          operateResult = (value === new Date(eval(operateValue)).getDay());
          return true;
        } else if (operation === 'MONTH') {
          operateResult = ((value - 1) === new Date(eval(operateValue)).getMonth());
          return true;
        } else if (operation === 'YEAR') {
          operateResult = (value === new Date(eval(operateValue)).getFullYear());
          return true;
        } else if (operation === 'REGEX') {
          operateResult = new RegExp(value).test(eval(operateValue));
          return true;
        } else if (['!!', '!', '==', '!=', '>', '>=', '<', '<='].includes(operation)) {
          operateResult = eval((i ? JSON.stringify(operateValue) : '') + operation + JSON.stringify(value));
          return true;
        } else if (['+', '-', '*', '/'].includes(operation) && i) {
          operateValue += (operation + value);
        }
      });
      // 校验结果输出
      isValid = operateResult;
      // 充要判断是否跳出循环
      return isValid === 'FIND' ? true : (type === 'SHOULD' ? isValid : !isValid);
    });
    return isValid;
  }
  // 处理正则查询参数
  handleDimParams(params, keys = []) {
    keys.map(key => {
      if (params[key]) {
        params[key] = {
          $regex: new RegExp(params[key], 'i')
        };
      }
    });
  }
  // 更新&存入历史
  async updateAndSaveEx(opt) {
    const { model, modelEx, _id, params, exLen } = opt;
    const [exData, exDataToDel] = await Promise.all([
      model.findOne({ _id }),
      modelEx.findOne({ _id: { $regex: `${_id}_` } }, { _id: 1 }).sort({ update_time: -1 }).skip(exLen - 1)
    ]);
    return await Promise.all([
      model.update({ _id }, {
        update_time: new Date(),
        ...params
      }),
      exDataToDel && (modelEx.remove({ _id: exDataToDel._id })),
      modelEx({
        ...exData.toObject(),
        _id: `${_id}_${exData.update_time.valueOf()}`
      }).save()
    ]);
  }
  // 获取历史列表
  async getExList(opt) {
    const { model, _id } = opt;
    return await model
      .find({
        _id: {
          $regex: new RegExp(`^${_id}_(\\d+)$`)
        }
      })
      .populate('list.api.base', 'name url timeout method level cache')
      .sort({ update_time: -1 });
  }
}

module.exports = BaseService;
