'use strict';
/**
 * @author: jiayanqi
 * @date: 2020-11-10
 */
module.exports = {
  dbList: [{
    platform: ['pcw'],
    collection: 'strategy',
    model: [
      {
        name: 'block',
        schema: require('./schema/strategy/block'),
        ex: true
      },
      {
        name: 'interface',
        schema: require('./schema/strategy/interface'),
        ex: true
      }
    ]
  }],
  dbConf: {
    replica: {
      test: [
        'test1.mongo:27017',
        'test2.mongo:27017',
      ],
      prod: [
        'localhost:27017',
      ]
    },
    user: {
      name: 'username',
      pwd: 'password'
    }
  },
  redisConf: {
    type: 'master-slave',
    addr: [
      {
        port: 6379,
        host: 'localhost'
      }
    ]
  }
}