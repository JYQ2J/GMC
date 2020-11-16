/**
 * @desc: 返回Code码配置
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const codeMsg = {
  'success': {
    code: 'A00000'
  },
  'arg_error': {
    code: 'A00001',
    msg: '参数错误'
  },
  'not_found': {
    code: 'A00002',
    msg: '未找到数据'
  },
  'request_failed': {
    code: 'A00003',
    msg: '请求失败,请重试'
  },
  'internal_error': {
    code: 'A00004',
    msg: '服务端错误'
  },
  'timeout_error': {
    code: 'E00000',
    msg: '接口超时'
  },
  'connect_timeout': {
    code: 'E00001',
    msg: '连接超时'
  },
  'response_timeout': {
    code: 'E00002',
    msg: '响应超时'
  },
  'access_deny': {
    code: 'A00005',
    msg: '禁止访问'
  }
};

module.exports = (type, data = {}, errMsg = '') => {
  const { code, msg: message } = codeMsg[type] || codeMsg['internal_error'];
  const msg = errMsg || message;
  return { code, data, ...(msg ? { msg } : {}) };
};
