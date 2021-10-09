'use strict'
/**
 * @desc: Redis客户端
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const { redisConf } = require('./config');
const Type = require('./util/type');
const Redis = require('ioredis');

class RedisClient {
  constructor() {
    this.client = this.createConnection(redisConf);
  }
  createConnection(config = {}) {
    const { type, addr } = config;
    let client = {};
    if (type === 'sentinel') {
      //哨兵部署模式
      client = new Redis(addr);
    } else if (type === 'master-slave') {
      //主从部署模式
      client = new Redis(addr);
    } else {
      //集群部署模式 (默认)
      client = new Redis.Cluster(addr);
    }
    client.on('ready', () => {
      console.log('redis connect success');
    });
    client.on('error', (error) => {
      console.log(`redis client ${error}`);
    });
    return client;
  }
  /**
   * 清除缓存
   * @param {String} key
   */
  async delete(key) {
    return await this.client.del(key);
  }
  /**
   * 键值的过期时间设置为1小时,EX表示单位是秒
   * @param {*} key
   * @param {*} value
   * @param {*} ttl
   * @param {*} slot 插槽
   * @param {*} type 过期时间单位（EX: 秒，PX: 毫秒）
   */
  async set(key, value, ttl = 3600, slot = '', type = 'EX') {
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    this.client.set(slot + key, value, type, ttl);
  }
  /**
   * 返回与键key相关联的字符串值, key只能是string, 否则会返回错误, 如果key不存在返回nil; 否则返回键key的值;
   * @param {String} key
   */
  async get(key, slot = '') {
    return new Promise(resolve => {
      this.client.get(slot + key, (err, result) => {
        resolve(err ? 'cacheerror' : result);
      });
    });
  }
  /**
   * 读取JSON数据缓存
   * @param {String} key
   */
  async nestedGet(key, slot, allowEmpty = false) {
    const str = await this.get(key, slot);
    if (str && str !== 'cacheerror') {
      try {
        const result = JSON.parse(str);
        if (allowEmpty || !Type.isEmptyObj(result)) {
          return result;
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
}

module.exports = RedisClient;
