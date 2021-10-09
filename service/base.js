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
  // 获取键值入口函数
  getKey(data, initKey, qsObj = {}) {
    const [isFlatten, key, appendKey, parseKey] = [
      initKey.endsWith('[*]'),
      initKey.replace(/\[[A-Za-z*_][^\[]*\]$/, ''),
      initKey.match(/\[([A-Za-z*_][^\[]*)\]$/),
      initKey.match(/\{[^\{]+\}/g)
    ];
    let result = null;
    if (parseKey) {
      result = this.getParseKey(data, initKey, parseKey, qsObj);
    } else {
      result = /\[[A-Za-z*_][^\[]*\]/.test(key) ? this.getMultiKey(data, key, [], qsObj) : Tool.get(data, key);
      if (appendKey && appendKey[1] !== '*') {
        const keyArr = key.split('.');
        const keyVal = keyArr.slice(0, keyArr.length - 1).concat([appendKey[1]]).join('.');
        qsObj.append = key.includes('[*].') ? this.getMultiKey(data, keyVal, []) : Tool.get(data, keyVal);
      }
    }
    return isFlatten ? Tool.flatten(result) : result;
  }
  // 扁平化多键值提取
  getMultiKey(data, key, result = [], qsObj = {}) {
    const keyArr = key.split(/\[[A-Za-z*_][^\[]*\]\./);
    const [left, right] = [keyArr[0], keyArr.slice(1)];
    const appendKey = key.match(/\[([A-Za-z*_][^\[]*)\]\./);
    const appendVal = appendKey && appendKey[1] !== '*' && Tool.get(data, appendKey[1]);
    const leftVal = left ? Tool.get(data, left, []) : data;
    (IsType.isArray(leftVal) ? leftVal : []).map(item => {
      if (right.length > 1) {
        this.getMultiKey(item, key.replace(`${left}[${appendKey[1]}].`, ''), result, qsObj);
      } else {
        const val = Tool.get(item, right[0]);
        ![null, undefined].includes(val) && result.push(val);
      }
      if (appendVal) {
        qsObj.append = [...(qsObj.append || []), appendVal];
      }
    });
    return result;
  }
  // json字符串裂变提取
  getParseKey(data, initKey, parseKey, qsObj = {}) {
    const parseArr = initKey.split(/\{[^\{]+\}\.?/);
    const right = parseArr.pop();
    parseArr.map((v, i) => {
      const dataStr = this.getKey(data, v + parseKey[i].replace(/\{|\}/g, ''), qsObj);
      try {
        data = JSON.parse(dataStr);
      } catch (e) {
        data = {};
      } finally {
        data = right ? this.getKey(data, right, qsObj) : data;
      }
    });
    return data;
  }
  // 格式化数据裂变提取
  getMixKey(data, parentData, initKey) {
    const itemKey = initKey.match(/\[([A-Za-z_][^\[]*)\]/);
    if (itemKey) {
      const innerData = (Tool.get(parentData, itemKey[1]) || '').toString();
      if (innerData.includes('.')) {
        const [left, right] = initKey.split(itemKey[0]);
        [data, initKey] = [Tool.get(data, left)[innerData], right];
      } else {
        initKey = initKey.replace(itemKey[0], `.${innerData}.`).replace(/\.$/, '');
      }
    }
    return initKey ? this.getKey(data, initKey) : data;
  }
  // 条件验证器 - 映射校验&数据源校验
  checkRequired(isInit, required, parentData, initData = {}, qipuData = {}, qipuDataKey = '', arrayIndex = -1, isFind = false) {
    let isValid = (required.length === 0);
    // MUST: 任一条件不符合则结束循环, 判定无效;
    // SHOULD: 任一条件符合则结束循环, 判定有效;
    required.find(item => {
      const { type, variable = [] } = item || {};
      let [operateValue, operateResult] = ['', true]
      variable.some((v, i) => {
        let { field, type = 'KEY', value = '', operation = '!!' } = v;
        if (['FIND', 'FILTER'].includes(operation) && !isFind) {
          return operateResult = operation;
        }
        if (type === 'KEY') {
          if (value.startsWith(`${qipuDataKey}.`)) {
            value = Tool.get(qipuData, value.replace(new RegExp(`^${qipuDataKey}.`), ''));
          } else if (isInit) {
            value = Tool.get(field === 'GLOBAL' ? initData : parentData, value);
          } else {
            value = (field === 'GLOBAL' ? this.getMixKey(initData, parentData, value) : Tool.get(parentData, value));
          }
        } else if (type === 'INDEX') {
          value = arrayIndex;
        } else if (type === 'TIMESTAMP') {
          value = new Date().valueOf();
        } else if (type === 'INPUT') {
          value = this.ctx.query[value];
        } else if (type === 'QS') {
          value = initData;
        }
        if (!i && variable[i + 1]) {
          operateValue = parseFloat(value).toString() === value ? value : JSON.stringify(value);
        } else if (operation === 'TODAY') {
          operateResult = (new Date().setHours(0, 0, 0, 0) === new Date(eval(operateValue)).setHours(0, 0, 0, 0));
          return true;
        } else if (operation === 'WEEK') {
          const day = new Date(eval(operateValue)).getDay();
          operateResult = (parseInt(value) === (day ? day : 7));
          return true;
        } else if (operation === 'MONTH') {
          operateResult = ((value - 1) === new Date(eval(operateValue)).getMonth());
          return true;
        } else if (operation === 'YEAR') {
          operateResult = (value === new Date(eval(operateValue)).getFullYear());
          return true;
        } else if (operation === 'REGEX') {
          operateResult = new RegExp(value).test(eval(JSON.stringify(operateValue)));
          return true;
        } else if (['!!', '!', '==', '!=', '>', '>=', '<', '<=', 'FIND', 'FILTER'].includes(operation)) {
          const op = ['FIND', 'FILTER'].includes(operation) ? '!!' : operation;
          operateResult = eval((i ? operateValue : '') + op + JSON.stringify(value));
          return true;
        } else if (['+', '-', '*', '/'].includes(operation) && i) {
          value = parseFloat(value).toString() === value ? value : JSON.stringify(value);
          operateValue += (operation + value);
        }
      });
      // 校验结果输出
      isValid = operateResult;
      // 充要判断是否跳出循环
      return ['FIND', 'FILTER'].includes(isValid) ? true : (type === 'SHOULD' ? isValid : !isValid);
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
      .populate('list.api.base', 'name url url_encode content_type timeout method level cache')
      .sort({ update_time: -1 });
  }
}

module.exports = BaseService;
