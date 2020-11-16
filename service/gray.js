'use strict';
/**
 * @desc: 灰度服务
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const BaseService = require('./base');
const Tool = require('../util/tool');

class GrayService extends BaseService {
  constructor(ctx) {
    super(ctx);
  }
  async getGrayItem(list, gray) {
    const { query = {}, cookies } = this.ctx;
    const { type, _id } = gray || {};
    const defaultItem = list[0] || {};
    if (query.GRAY) {
      return list.find(item => item.gray === query.GRAY) || {};
    } else if (type === 'INPUT') {
      return list.find(item => item.gray === query[_id]) || defaultItem;
    } else if (type === 'COOKIE') {
      const cookieKey = cookies.get(_id) || '';
      const tail = cookieKey.charAt(cookieKey.length - 1);
      return list.find(item => (item.gray || '').split(',').includes(tail)) || defaultItem;
    } else if (type === 'ABTEST') {
      // const value = 自动化灰度平台数据
      // return {
      //   abtest,
      //   ...(list.find(item => item.gray === value) || defaultItem)
      // };
      return defaultItem;
    } else {
      return defaultItem;
    }
  }
}

module.exports = GrayService;
