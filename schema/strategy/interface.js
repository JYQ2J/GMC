'use strict';
/**
 * @desc: interface schema
 * @author: jiayanqi
 * @date: 2020-06-05
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const interfaceSchema = (platform) => new Schema({
  _id: String,
  name: String,
  group: { type: String, default: 'common', index: true },
  url: String,
  timeout: { type: Number, default: 3000 },
  method: { type: String, default: 'GET' },
  cache: {
    key: { type: Array, default: [] },
    time: { type: Number, default: 0 }
  },
  headers: [{
    _id: String,
    default: String,
    type: { type: String, default: 'KV' }
  }],
  params: [{
    _id: String,
    default: String,
    type: { type: String, default: 'KV' }
  }],
  body: [{
    _id: String,
    default: String,
    type: { type: String, default: 'KV' }
  }],
  qipuIdKey: String,
  qipuDataKey: String,
  create_time: { type: Date, default: Date.now },
  update_time: { type: Date, default: Date.now },
  editor: String
});

module.exports = interfaceSchema;
