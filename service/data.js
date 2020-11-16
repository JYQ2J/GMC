'use strict';
/**
 * @desc: 数据服务
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const DataDao = require('../dao/data');
const BaseService = require('./base');

class DataService extends BaseService {
  constructor(ctx) {
    super(ctx);
  }
  /**
   * 数据示例服务
   */
  async getEntity(idArr) {
    const dao = new DataDao(this.ctx);
    return this.checkDaoData(await dao.dataCenter(type, idArr));
  }
}

module.exports = DataService;
