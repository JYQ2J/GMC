'use strict';
/**
 * @desc: block schema
 * @author: jiayanqi
 * @date: 2020-06-05
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blockSchema = (platform) => new Schema({
  // Block ID
  _id: String,
  // 名称
  name: String,
  // 组别
  group: { type: String, default: 'common', index: true },
  // 是否上线
  isOnline: { type: Boolean, default: true },
  // 灰度类型
  gray: {
    // 灰度类型: NONE / COOKIE / INPUT
    type: { type: String, default: 'NONE' },
    // 灰度取值
    _id: String
  },
  // 灰度列表
  list: [{
    // 统计值 - block
    _id: String,
    // 接口列表
    api: [{
      // 接口ID
      base: { type: String, ref: `${platform}_interface` },
      // 接口请求条件
      required: [{
        // 子条件关系: MUST / SHOULD
        type: { type: String, default: 'MUST' },
        // 三元运算变量
        variable: [{
          /// 输入的映射类型: KEY / VALUE
          type: { type: String, default: 'KEY' },
          // 输入的具体变量值
          value: { type: Schema.Types.Mixed, default: null },
          // 运算符类型: !! / ! / == / != / > / >= / < / <= / + / - / * / / / REGEX / ENTITY
          operation: String
        }]
      }],
      // 接口阻塞级别
      level: { type: String, default: 'error' },
      // 接口参数列表
      params: [{
        // 参数类型: KV / COOKIE / IP / INHERIT / UA / REFER / REQID / TIMESTAMP / SIGN
        type: { type: String, default: 'KV' },
        // 参数字段名
        _id: String,
        // 参数取值
        value: String,
        // INHERIT类型 - 参数取值来源
        from: String,
        // INHERIT类型 - 批量参数分隔符
        splitKey: String,
        // INHERIT类型 - 批量请求输出
        multiKey: String,
        // INHERIT类型 - 分批批量尺寸
        chunkSize: { type: Number, default: 1 }
      }],
      // 接口参数列表 - Post Body
      body: [{
        // 参数类型: KV / COOKIE / IP / INHERIT / UA / REFER / REQID / TIMESTAMP / SIGN
        type: { type: String, default: 'KV' },
        // 参数字段名
        _id: String,
        // 参数取值
        value: String,
        // INHERIT类型 - 参数取值来源
        from: String,
        // INHERIT类型 - 是否批量参数
        isMulti: { type: Boolean, default: false },
        // INHERIT类型 - 批量参数分隔符
        splitKey: String
      }],
      // Header
      headers: [{
        // 参数类型: KV / COOKIE / IP / INHERIT / UA / REFER / REQID / TIMESTAMP / SIGN
        type: { type: String, default: 'KV' },
        // 参数字段名
        _id: String,
        // 参数取值
        value: String
      }],
      // 输出规则
      formater: [{
        // 数据类型: String / Number / Boolean / Array / Object / A2O
        type: { type: String, default: 'String' },
        // 输出名称
        key: String,
        // 多个可选映射的字段
        mapping: [{
          // 输入的映射类型: KEY / VALUE / RULE / KV2V
          type: { type: String, default: 'KEY' },
          // 输入的映射值
          value: Schema.Types.Mixed,
          // 输出条件
          required: [{
            // 子条件关系: MUST / SHOULD
            type: { type: String, default: 'MUST' },
            // 三元运算变量
            variable: [{
              // 映射域: GLOBAL / LOCAL
              field: { type: String, default: 'LOCAL' },
              /// 输入的映射类型: KEY / VALUE
              type: { type: String, default: 'KEY' },
              // 输入的具体变量值
              value: { type: Schema.Types.Mixed, default: null },
              // 运算符类型: !! / ! / == / != / > / >= / < / <= / + / - / * / / / REGEX / FIND / ENTITY
              operation: String
            }]
          }],
          // 运算符类型: + / - / * / /
          operation: String,
          // KV数组输出单个Value
          kv2v: { key: String, keyName: String, value: String }
        }],
        // 多个拼接数据的顺序索引
        order: { type: Number, default: 0 },
        // 数组排序
        sort: {
          // 升序 asc, 降序 desc
          order: String,
          // 排序字段
          key: String
        },
        // 数组起始Index
        startIndex: { type: Number, default: 0 },
        // 所需数组长度
        size: Number,
        // 数组转对象
        a2o: { key: String, value: String },
        // 子结构
        children: []
      }],
      // 奇谱ID字段名
      qipuIdKey: String,
      // 奇谱结构字段名
      qipuDataKey: String,
    }],
    // 灰度值
    gray: String
  }],
  // 数据切割 [2, 8]
  chunk: [{ key: String, value: Number }],
  // 缓存配置
  cache: {
    key: { type: Array, default: [] },
    time: { type: Number, default: 0 }
  },
  // 创建时间
  create_time: { type: Date, default: Date.now },
  // 更新时间
  update_time: { type: Date, default: Date.now },
  // 编辑者
  editor: String
});

module.exports = blockSchema;