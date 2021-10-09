'use strict';
/**
 * @desc: dao基类
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const request = require('request');
const querystring = require('querystring');

class BaseDao {
  constructor(ctx) {
    this.ctx = ctx;
  }
  //记录单个接口响应时长及接口地址 (httpResponse.timingPhases, httpResponse.timings)
  addRtt(httpResponse) {
    const url = httpResponse.request.href;
    this.ctx.rtt = this.ctx.rtt || [];
    if (url) {
      this.ctx.rtt.push({ url, time: new Date() - httpResponse.timingStart });
    }
  }
  /**
  * 获取响应类型
  * @return {String} util/httpCode - httpMsg 对应中的键值
  * @author jiayanqi
  */
  getResponseType(err, httpResponse) {
    const { code } = err || {};
    if (err || httpResponse.statusCode !== 200) {
      if (['ETIMEDOUT', 'ESOCKETTIMEDOUT'].includes(code)) {
        return 'timeout_error';
      } else {
        return 'request_failed';
      }
    }
    return 'success';
  }
  /**
    * 获取出错请求的详细描述信息
    * @return {String}
    * @author jiayanqi
    */
  getResponseErrorDetail(err, httpResponse, request) {
    const { code } = err || {};
    const { method, url, body, data } = request || {};
    const { statusCode } = httpResponse || {};
    let result = `${method} ${url}`;
    if (statusCode) {
      result += ` with statusCode: ${statusCode}`;
    }
    if (err) {
      result += ` with error: ${err}`;
    }
    if (body) {
      result += ` with body: ${JSON.stringify(body)}`;
    }
    if (data) {
      result += ` with data: ${JSON.stringify(data)}`;
    }
    return result;
  }
  /**
  *【重要】请优先使用requestGetWithId，接口请求中不能带requestId时才使用此方法
  * 封装httpGet请求，添加requestId、打印接口日志、请求时长、获取详细调用链信息等
  *
  * @param url {String} 接口日志打印 api  (restful api 作区分)
  * @param qs {Object}
  * @param timeout {Number}
  * @param supplement {Object} 接口补充参数，没有传空对象
  * @param headers {Object} 接口请求header，没有传空对象
  *
  * @return {Promise<Object>}
  * 返回对象包含以下字段
  *   - type {String} httpCode.js中codeMsg对象的键值
  *   - msg {String}  httpCode.js中codeMsg对象的data属性值
  *   - data {Object} 透传原接口的返回信息
  *   - detail {String} 详细描述接口调用链
  *
  * @author jiayanqi
  */
  async requestGet(url, qs = {}, timeout = 3000, supplement = {}, headers = {}) {
    if (!url) {
      return ;
    }
    return new Promise((resolve, reject) => {
      request({
        url,
        qs,
        headers: headers || {},
        timeout,
        time: true,
        ...supplement
      }, (err, httpResponse, body) => {
        const type = this.getResponseType(err, httpResponse);
        let data = {};
        if (type === 'success') {
          try {
            data = resParser.parse(body, options.parser);
          } catch (e) {
            try {
              data = eval(`(${body})`);
            } catch (e) {
              data = body;
            }
          }
          this.addRtt(httpResponse);
        } else {
          data = this.getResponseErrorDetail(err, httpResponse, {
            method: 'GET',
            url: `${url}?${querystring.stringify(qs)}`
          });
        }
        resolve({ type, data });
      });
    });
  }
  /**
   * 封装httpGet restful 请求，包装接口请求id
   * @param url {string} 接口日志打印 api  (restful api 作区分)
   * @param id {string}
   * @param timeout {number}
   * @param supplement = {
   *     qsStringifyOptions: {
   *         encodeURIComponent: url => url
   *     },
   *     useQuerystring: true
   *     ....
   * } {object} 接口补充参数，没有传空对象,使用方式参见：https://github.com/request/request#requestoptions-callback
   * @param headers = {
   *     Cookie: cookie {object}, cookie是对象类型的
   *     content-encoding: xxx,
   *     content-type: xxx
   *     ....
   * }
   * @return {any}
   */
  async requestGetRestful(url, id, timeout, supplement = {}, headers = {}, qs = {}) {
    return await this.requestGet(url + '/' + id, qs, timeout, supplement, headers);
  }
  /**
   * http post请求方法， 内部使用form进行post提交
   * @param {String} url  post投递地址
   * @param {Object} param post投递内容
   * @param {Boolean} isMulti 是否为multipart/form-data类型的post提交，默认为false
   * @return {any} 返回值
   */
  async requestPost(url, param, headers = {}, isMulti = false, isJson = false, timeout = 5000, qs = {}) {
    const key = isMulti ? 'formData' : (isJson ? 'json' : 'form');
    return new Promise((resolve, reject) => {
      request.post({
        url,
        qs,
        [key]: param,
        headers,
        timeout,
        time: true
      }, (err, httpResponse, body) => {
        const type = this.getResponseType(err, httpResponse);
        let data = {};
        if (type === 'success') {
          try {
            data = JSON.parse(body);
          } catch (e) {
            data = body;
          }
          this.addRtt(httpResponse);
        } else {
          data = this.getResponseErrorDetail(err, httpResponse, {
            method: 'POST',
            url: `${url}?${querystring.stringify(qs)}`,
            body: param,
            data: body
          });
        }
        resolve({ type, data });
      });
    });
  }
  /**
   * http put请求方法， 内部使用form进行post提交
   * @param {String} url  post投递地址
   * @param {Object} param post投递内容
   * @param {Boolean} isMulti 是否为multipart/form-data类型的post提交，默认为false
   * @return {any} 返回值
   */
  async requestPut(url, param, headers = {}, isMulti = false, isJson = false, timeout = 3000) {
    const key = isMulti ? 'formData' : (isJson ? 'json' : 'form');
    return new Promise((resolve, reject) => {
      request({
        method: 'PUT',
        url,
        [key]: param,
        headers: headers || {},
        timeout,
        time: true
      }, (err, httpResponse, body) => {
        const type = this.getResponseType(err, httpResponse);
        let data = {};
        if (type === 'success') {
          try {
            data = JSON.parse(body);
          } catch (e) {
            data = body;
          }
          this.addRtt(httpResponse);
        } else {
          data = this.getResponseErrorDetail(err, httpResponse, {
            method: 'PUT',
            url,
            body: param,
            data: body
          });
        }
        resolve({ type, data });
      });
    });
  }
  /**
   * http delete请求方法
   * @param {Object} param 投递内容
   * @return {any} 返回值
   */
  async requestDelete(param) {
    return new Promise((resolve, reject) => {
      request.del(param, (err, httpResponse, body) => {
        const type = this.getResponseType(err, httpResponse);
        let data = {};
        if (type === 'success') {
          try {
            data = JSON.parse(body);
          } catch (e) {
            data = body;
          }
          this.addRtt(httpResponse);
        } else {
          data = this.getResponseErrorDetail(err, httpResponse, {
            method: 'DELETE',
            url: param.url,
            data: body
          });
        }
        resolve({ type, data });
      });
    });
  }
}

module.exports = BaseDao;
