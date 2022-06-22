const { logger, errStack, sHash, list, wsSer } = require('../utils')
const clog = new logger({ head: 'wbeapp', cb: wsSer.send.func('eapp') })

const { runJSFile } = require('../script')
const { exec } = require('../func')
const { CONFIG } = require('../config')

if (!CONFIG.eapp) {
  CONFIG.eapp = {
    enable: true,
    apps: [{
      "name": "说明文档",
      "type": "url",
      "target": "https://github.com/elecV2/elecV2P-dei/blob/master/docs/dev_note/webUI%20首页快捷运行程序%20eapp.md",
    }, {
      "name": "简易记事本",
      "type": "efh",
      "target": "https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/examples/JSTEST/efh/notepad.efh",
      "hash": "94f669c165f0f33ec73fd32f446b32e3"
    }, {
      "name": "清空日志",
      "logo": "https://raw.githubusercontent.com/elecV2/elecV2P/master/efss/logo/dlog.png",
      "type": "js",
      "target": "https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/deletelog.js",
      "hash": "0e9288d021b42478b102a2ff1e19226d"
    }, {
      "name": "PM2 LS",
      "type": "shell",
      "target": "pm2 ls",
    }]
  }
}

module.exports = app => {
  app.get('/eapp', (req, res)=>{
    CONFIG.eapp.apps.forEach(app=>{
      if (!app.hash || app.hash.length !== 32) {
        app.hash = sHash(app.name + app.type + app.target)
      }
    })
    res.json({
      rescode: 0,
      message: 'success get eapp config',
      resdata: CONFIG.eapp,
    })
  })

  app.put('/eapp', (req, res)=>{
    const app = {
      name: req.body.name,
      logo: req.body.logo,
      type: req.body.type,
      target: req.body.target,
    }
    app.hash = sHash(app.name + app.type + app.target)
    if (CONFIG.eapp.apps[req.body.idx]) {
      CONFIG.eapp.apps[req.body.idx] = app
    } else {
      CONFIG.eapp.apps.push(app)
    }
    res.json({
      rescode: 0,
      message: 'success put eapp ' + app.name,
      resdata: app.hash,
    })
    list.put('config.json', JSON.stringify(CONFIG, null, 2))
  })

  app.post('/eapp', (req, res)=>{
    const apps = req.body.apps
    const enable = req.body.enable
    if (apps?.length) {
      CONFIG.eapp.apps = apps.filter(app=>{
        if (app.name && app.type && app.target) {
          if (app.hash?.length !== 32) {
            app.hash = sHash(app.name + app.type + app.target)
          }
          return true
        }
        return false
      })
      res.json({
        rescode: 0,
        message: 'success save eapp lists'
      })
      list.put('config.json', JSON.stringify(CONFIG, null, 2))
    } else {
      return res.json({
        rescode: -1,
        message: 'eapp list is expect to save'
      })
    }
  })

  app.delete('/eapp/:idx', (req, res)=>{
    const app = CONFIG.eapp.apps[req.params.idx]
    let message = ''
    if (app) {
      message = `success delete ${app.name}`
      CONFIG.eapp.apps.splice(req.params.idx, 1)
    } else {
      message = `app index ${ req.params.idx } not exist`
    }
    res.json({
      rescode: 0,
      message,
    })
    list.put('config.json', JSON.stringify(CONFIG, null, 2))
  })

  app.post('/eapp/run', (req, res)=>{
    const app = req.body.app
    if (!app || !app.target) {
      clog.error('a eapp target is expect')
      return res.json({
        rescode: -1,
        message: 'a eapp target is expect'
      })
    }
    switch(app.type) {
    case 'js':
      runJSFile(app.target, {
        from: 'eapp',
        cb: wsSer.send.func('eapp', req.body.id),
      }).catch(error=>{
        clog.error(errStack(error))
      })
      res.json({
        rescode: 0,
        message: app.target + ' running'
      })
      break
    case 'shell':
      // shell 执行日志发送到所有已连接客户端
      exec(app.target, {
        from: 'eapp',
        cb(data, error) {
          if (error) {
            clog.error(error)
          } else {
            clog.info(data)
          }
        }
      })
      res.json({
        rescode: 0,
        message: app.target + ' running'
      })
      break
    default:
      clog.error('eapp type', app.type, 'Not Implemented')
      res.json({
        rescode: 501,
        message: 'eapp type ' + app.type + ' Not Implemented'
      })
    }
  })
}