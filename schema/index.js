'use strict';
/**
 * @desc: MongoDb初始化
 * @author: jiayanqi
 * @date: 2020-11-10
 */
const { dbList, dbConf: conf } = require('../config');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const [db, dbModel] = [{}, {}];
dbList.map(item => {
  const { collection, model = [], platform = [] } = item;
  const [url, options] = [
    `mongodb://${conf.replica[process.env.NODE_ENV].join(',')}/${collection}`,
    {
      poolSize: 20,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    }
  ];
  db[collection] = mongoose.createConnection(url, options);
  // 初始化schema
  platform.map(pf => {
    model.map(item => {
      const [key, keyEx] = [`${pf}_${item.name}`, `${pf}_ex_${item.name}`];
      if (item.ex) {
        dbModel[keyEx] = db[collection].model(keyEx, item.schema(pf));
      }
      dbModel[key] = db[collection].model(key, item.schema(pf));
    })
  })
  // 数据库监听处理
  db[collection].on('connected', () => {
    console.log(`Mongodb: ${collection} connect success`);
  });
  db[collection].on('error', (error) => {
    console.log(`Error in MongoDb: ${collection} connection: ${error}`);
  });
  db[collection].on('close', () => {
    console.log(`Mongodb: ${collection} disconnect, reconnect it....`);
    db[collection] = mongoose.createConnection(url, options);
  });
});

module.exports = dbModel;