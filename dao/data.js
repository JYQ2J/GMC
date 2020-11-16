'use strict';
/**
 * @desc: 数据Dao
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const Dao = require('./base');

class DataDao extends Dao {
  constructor(ctx) {
    super(ctx);
  }
  /**
   * 基础数据示例
   */
  async dataCenter(type, idArr) {
    const [url, timeout] = [{
      video: 'http://api.video/',
      album: 'http://api.album/'
    }, 3000];
    return await this.requestGet(url[type], { ids: idArr.join(',') }, timeout, {
      qsStringifyOptions: {
        encodeURIComponent: uri => uri
      },
      useQuerystring: true,
    });
  }
}

module.exports = DataDao;