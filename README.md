# 框架开发规范

## 文件结构
 - router：路由层
 - service：主服务层
 	+ base：service基类
 	+ block：模块服务
 	+ interface：接口配置服务
 	+ mapping：映射服务
 	+ gray：灰度服务
 	+ data：数据服务
 - dao：数据请求层
 	+ base：dao基类
 	+ data：数据接口dao
 - middleware：中间件扩展（错误处理，日志记录等）
 - util：业务工具目录
 - schema：数据库模块
 - redis：redis缓存接入
 - config：配置文件

## 语法及命名规范
 - 严格按照es6语法编写
 - 类名采用大驼峰式， 比如class FileLoader
 - 函数名采用小驼峰式，比如loadFile()


## 注释规范
 - 按照JSDoc规范编写注释
	+ [参考教程1 - 官方](http://usejsdoc.org/)
 	+ [参考教程2 - css88](http://www.css88.com/doc/jsdoc/)
 - 模块头部注释

