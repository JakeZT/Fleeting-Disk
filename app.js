const Koa = require('koa');
const router = require('koa-router')(); //注意：引入的方式
const app = new Koa();
const path = require('path');
const fs = require('fs');
const session = require('koa-session');
const render = require('koa-art-template');
var hotSearchData = require('./views/news/hotSearch.json')
const static = require('koa-static');
const getNews = require('./modules/newsGet');
const multer = require('koa-multer');
const getFormatTime = require('./modules/time_format');
const md5 = require("md5")
//数据库操作
var DB = require('./modules/db.js');


var storage = multer.diskStorage({
  //定义文件保存路径 
  // cb是一个接受2个参数的回调函数。
  destination: function (req, file, cb) {
    cb(null, './upload/'); //路径根据具体而定。如果不存在的话会自动创建一个路径
  }, //注意这里有个，
  //修改文件名
  filename: function (req, file, cb) {
    var fileFormat = (file.originalname).split(".");
    cb(null, Date.now() + "." + fileFormat[fileFormat.length - 1]);
  }
})

var upload = multer({
  storage: storage
});
var uploadMultiple = multer({
  storage: storage
}).array('userParamName', 10);
//  一般的网页应用 使用 var upload = multer({ dest: 'uploads/' })即可，storage能提供更多的控制
render(app, {
  root: path.join(__dirname, 'views'),
  extname: '.html',
  debug: process.env.NODE_ENV !== 'production'
});
//配置静态资源中间件
app.use(static(__dirname + './public'));
app.use(static(__dirname + './upload'));
app.use(static(__dirname + './src'));
app.use(static('.'))


//配置session的中间件
app.keys = ['some secret hurr']; /*cookie的签名*/
const CONFIG = {
  key: 'koaSess',
  maxAge: 1000 * 60 * 24,
  overwrite: true,
  httpOnly: true,
  signed: true,
  rolling: true,
  renew: true,
};
app.use(session(CONFIG, app));




// 路由1
router.get('/', async (ctx) => {
  ctx.session.userinfo = null;
  ctx.render('login')
});
router.get('/userRepeat', async (ctx) => {
  ctx.session.userinfo = null;
  ctx.render('userRepeat')
})
router.get('/signUp', async (ctx) => {
  ctx.render('signUp')
});
router.post('/doSignUp', upload.single('form'), async (ctx) => {
  let sessionID = String(ctx.req.body.username);
  let password = md5(String(ctx.req.body.password[0]));
  // console.log(sessionID);
  // console.log(password);
  // 查询用户信息！
  let data1 = await DB.find('session', {
    "sessionID": sessionID,
  });
  if (data1[0] === undefined) {
    let data = await DB.insert('session', {
      "sessionID": sessionID,
      "password": password,
    });
    try {
      if (data.result.ok) {
        ctx.redirect('/')
      }
    } catch (err) {
      console.log(err);
      ctx.redirect('/')
      return;
    }
  } else {
    ctx.redirect('/userRepeat')
  }
});


router.get('/changeInfo', async (ctx) => {

  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      let data = await DB.find('session', {
        "sessionID": CookieID,
      });
      // console.log(data);
      let imgPath = data[0].ImgPath;
      ctx.render('userInfo', {
        username: CookieID,
        imgPath: imgPath
      });
    } else {
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }

});
router.post('/updateInfo', upload.single('userImg'), async (ctx) => {
  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      let sessionID = String(ctx.req.body.username);
      // if(ctx.req.body.password!==undefined){
        let passwordTemp = md5(String(ctx.req.body.password[0]));
        // console.log('密码是'+passwordTemp);
      // }else{
        let data1 = await DB.find('session', {
          "sessionID": CookieID
        });
        console.log(data1[0]);
          let pwd=data1[0].password
        passwordTemp===pwd? password=pwd : password=passwordTemp;
        // console.log(password);
      // }
      let ImgPath = String(ctx.req.file.path);
      // console.log(ImgPath);

      let setData = {
        "sessionID": sessionID,
        "password": password,
        "ImgPath": ImgPath
      }
      let data = await DB.update('session', {
        "sessionID": CookieID
      }, setData);
      try {
        if (data.result.ok) {
          console.log('edited Successfully');
          let data2 = await DB.update('disk', {
            "sessionID": CookieID
          }, {
            "sessionID": sessionID
          });
          try {
            if (data2.result.ok) {
              console.log('userInfo updated Successfully');
              ctx.redirect('/')
            }
          } catch (err) {
            if (err) throw err;
          }
        }
      } catch (err) {
        if (err) throw err;
      }

    } else {
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }
});




router.get('/logOut', async (ctx) => {
  ctx.session.userinfo = null;
  let realPath = path.resolve(__dirname, '../Fleeting_KOA_Server/views');
  // console.log(realPath);
  // ctx.render('login')
  ctx.redirect('/')
});

router.get('/Error', async (ctx) => {
  ctx.render('Error');
});

router.get('/userProfile', async (ctx) => {
  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      let data = await DB.find('session', {
        "sessionID": CookieID,
      });
      // console.log(data);
      let imgPath = data[0].ImgPath;
      ctx.render('userProfile', {
        username: CookieID,
        imgPath: imgPath
      });
    } else {
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }

});
// 登录操作
router.post('/doLogin', upload.single('form'), async (ctx) => {
  let sessionID = ctx.req.body.username;
  let password = md5(ctx.req.body.password);
  // console.log(sessionID);
  // console.log(password);
  try {
    let userInfo={
      "sessionID": sessionID,
      "password": password
    };
    // 查询用户信息！
    let data = await DB.find('session', userInfo);

    let userRightNow = data[0];
    // console.log(userRightNow); //我是jake

    if (userRightNow !== undefined) {
      // 设置Session开始
      let sessionID = userRightNow.sessionID;
      // 设置session
      ctx.session.userinfo = sessionID;
      var cookieID = new Buffer.from(sessionID).toString('base64');
      console.log(cookieID);

      ctx.cookies.set('userinfo', cookieID, {
        // maxA
        maxAge: 60 * 1000 * 60,
        // path:['/news', ''],  /*配置可以访问的页面*/
        httpOnly: false, //true表示这个cookie只有服务器端可以访问，false表示客户端（js），服务器端都可以访问
      });
      //获取和显示session-
      // var userName=ctx.session.userinfo;
      var userName = ctx.cookies.get('userinfo')
      var userName1 = new Buffer.from(userName, 'base64').toString();
      // ctx.body = `登录成功:${userName1}`;
      console.log(`登录成功:${userName1}`);
      ctx.redirect('/index')
    } else {
      // ctx.body = "没有您的个人信息，请注册后登录";
      ctx.redirect('/Error');
    }
  } catch (e) {
    console.log(e.message);
  }
})


router.get('/index', async (ctx) => {
  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      let id = CookieID;
      let data = await DB.find('disk', {
        "sessionID": id
      });
      let images = 0;
      let videos = 0;
      let notes = 0;
      let pdf = 0;
      for (let i = 0; i < data.length; i++) {
        let filename1 = data[i].filename1;
        let notesContent = data[i].notes;
        // files total
        filename1.indexOf('pdf') > 0 ? pdf++ : '';
        filename1.indexOf('doc') > 0 ? pdf++ : '';
        filename1.indexOf('docx') > 0 ? pdf++ : '';

        // total images
        filename1.indexOf('png') > 0 || filename1.indexOf('jpg') > 0 || filename1.indexOf('jpeg') > 0 ? images++ : '';
        // total videos
        filename1.indexOf('mp4') > 0 || filename1.indexOf('mkv') > 0 || filename1.indexOf('avi') > 0 ? videos++ : '';
        //total notes
        notesContent != '' ? notes++ : '';

        let filename2 = data[i].filename2;
        // files total
        filename2.indexOf('pdf') > 0 ? pdf++ : '';
        filename2.indexOf('doc') > 0 ? pdf++ : '';
        filename2.indexOf('docx') > 0 ? pdf++ : '';

        // total images
        filename2.indexOf('png') > 0 || filename2.indexOf('jpg') > 0 || filename2.indexOf('jpeg') > 0 ? images++ : '';
        // total videos
        filename2.indexOf('mp4') > 0 || filename2.indexOf('mkv') > 0 || filename2.indexOf('avi') > 0 ? videos++ : '';
      }
      ctx.render('index', {
        images: images,
        videos: videos,
        notes: notes,
        pdf: pdf,
        username: CookieID
      });
      // ctx.body = `您已经登录，这是您的个人信息！${CookieID}`;
    } else {

      // ctx.body = "查看失败";
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }

});



router.post('/dropToUpload', uploadMultiple, async (ctx) => {
  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      let files = ctx.req.files;
      let originalname1, filename1, path1;
      console.log(files);
      let systemTime = Number(new Date().getTime());
      insertFunction = async (originalname1, filename1, path1) => {
        let data = await DB.insert('disk', {
          sessionID: CookieID,
          theme: '',
          notes: '',
          // file1
          originalname1: originalname1,
          filename1: filename1,
          path1: path1,
          // file2
          originalname2: '',
          filename2: '',
          path2: '',
          systemTime: systemTime,
        });
        try {
          if (data.result.ok) {
            // ctx.render('/files',{
            //   username:'我是Jake'
            // });
            console.log('Add Successfully');
            // res.redirect('/')
          }
        } catch (err) {
          console.log(err);
          console.log('Something went wrong');
          return;
        }
      };
      if (files[0] !== undefined) {
        // filesArray.push(files[0]);
        // file1
        originalname1 = files[0].originalname;
        filename1 = files[0].filename;
        path1 = files[0].path;
        systemTime = String(systemTime + 1);
        // ready to insert

        insertFunction(originalname1, filename1, path1, systemTime);
        console.log('File1 upload Successfully');
      }
      if (files[1] !== undefined) {
        originalname1 = files[1].originalname;
        filename1 = files[1].filename;
        path1 = files[1].path;
        systemTime = String(systemTime + 2);
        insertFunction(originalname1, filename1, path1, systemTime);
        console.log('File2 upload Successfully');
      }

      if (files[2] !== undefined) {
        originalname1 = files[2].originalname;
        filename1 = files[2].filename;
        path1 = files[2].path;
        systemTime = String(systemTime + 3);
        insertFunction(originalname1, filename1, path1, systemTime);
        console.log('File3 upload Successfully');
      }

      if (files[3] !== undefined) {
        originalname1 = files[3].originalname;
        filename1 = files[3].filename;
        path1 = files[3].path;
        systemTime = String(systemTime + 4);
        insertFunction(originalname1, filename1, path1, systemTime);
        console.log('File4 upload Successfully');
      }
    } else {
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }

});

// =======================================
router.get('/files', async (ctx) => {
  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      let id = CookieID;
      // 获取所有的文件数据
      let data = await DB.find('disk', {
        "sessionID": id
      });
      // console.log(data);
      let fileArray = [];
      for (let i = 1; i < data.length + 1; i++) {
        // file1
        let part = data[i - 1].filename1;
        let partIndex = part.indexOf('.');
        let fileName = part.slice(0, partIndex);
        console.log(fileName);
        if (fileName !== '') {
          let originalname = data[i - 1].originalname1;
          var fileType = originalname.substring(originalname.lastIndexOf('.') + 1);
          let filePath = data[i - 1].path1;
          let fileMess = [{
            fileName: fileName
          }, {
            fileType: fileType
          }, {
            filePath: filePath
          }, {
            originalname: originalname
          }];
          fileArray.push(fileMess);
        }

        // file2
        let secondFile = data[i - 1].filename2;
        let partIndex2 = secondFile.indexOf('.');
        fileName2 = secondFile.slice(0, partIndex2);
        if (fileName2 !== '') {
          let originalname2 = data[i - 1].originalname2;
          var fileType2 = originalname2.substring(originalname2.lastIndexOf('.') + 1);
          let filePath2 = data[i - 1].path2;
          let fileMess2 = [{
            fileName: fileName2
          }, {
            fileType: fileType2
          }, {
            filePath: filePath2
          }, {
            originalname: originalname2
          }];
          fileArray.push(fileMess2);
        }

      };
      console.log(fileArray);
      // console.log(fileArray);
      await ctx.render('files', {
        fileArray: fileArray,
        username: CookieID
      });

    } else {
      ctx.redirect('/');

    }
  } catch (e) {
    console.log(e.message);
  }



})


// 
router.get('/notes', async (ctx) => {

  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      var id = CookieID;
      // console.log(id);
      //去数据库查询这个id对应的数据     自增长的id 要用{"_id":new DB.getObjectId(id)
      let data = await DB.find('disk', {
        "sessionID": id
      });
      // console.log(data);
      if (data[0] === undefined) {
        await ctx.render('notes', {
          username: CookieID
        })
      } else {
        let NoteArray = [];
        for (let i = 0; i < data.length; i++) {
          let systemTime = data[i].systemTime;
          let timeReturn = getFormatTime(Number(systemTime));
          if (data[i].theme !== '') {
            let theme = data[i].theme;
            let notes = data[i].notes;
            let Note = [{
              theme: theme,
              notes: notes,
              timeReturn: timeReturn
            }];
            NoteArray.push(Note);
          }
        }
        // console.log(NoteArray);
 
    await ctx.render('notes', {
      list: NoteArray,
      username: CookieID
    })
}
    } else {
      ctx.render('login')
    }
  } catch (e) {
    console.log(e.message);
  }
})

router.post('/delNotes',upload.single('123'), async (ctx) => {
  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      console.log(ctx.req.body);
      let noteTheme=String(ctx.req.body.theme).trim();
      let notesVal=String(ctx.req.body.notesValue).trim();
      notesVal = notesVal.replace(/\r\n/g,"");  
      console.log(notesVal);

      let originalInfo={
        "theme":noteTheme,
        "notes":notesVal
      };
      let data1=await DB.find('disk',originalInfo);
      if(data1[0].notes===notesVal){
        console.log('相同')
      }else{
        console.log('不相同');
      }
      let updateInfo={
        "theme":'',
        "notes":''
      };
      let data= await DB.update('disk', originalInfo,updateInfo);
    try {
      if (data.result.ok) {
        console.log('Delete Note Successfully');
       await ctx.redirect('/notes')
      }
    } catch (err) {
      console.log(err);
      console.log('Delete Note went wrong');
      return;
    }
  }else {
      ctx.render('login')
    }
  } catch (e) {
    console.log(e.message);
  }
})


router.get('/upload', async (ctx) => {
  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      var id = CookieID;
      let data = await DB.find('disk', {
        "sessionID": id
      });
      let NoteArray = [];
      await ctx.render('upload', {
        username: CookieID
      })
    } else {
      ctx.render('login')
    }
  } catch (e) {
    console.log(e.message);
  }
})

// 爬虫----------复写文件
let number = 0;
setInterval(async () => {
  try {
    var hotList = await getNews();
    let realPath = path.resolve(__dirname, '../Fleeting_KOA_Server');
    const fileName = `${realPath}\\views\\news\\hotSearch.json`;
    await fs.writeFile(`${fileName}`, JSON.stringify(hotList), "utf-8", function (err) {
      if (err) {
        console.log('Rewrite Failed', err);
      } else {
        number++;
        // console.log('Pulled Times : '+ number );
        // console.log('Rewrite Successfully'); 
        return;
      }
    });
  } catch (error) {
    console.error(error);
  }
}, 60000);
let newsPath = path.resolve(__dirname, '../Fleeting_KOA_Server')
let hotSearchPath = `${newsPath}\\views\\news\\hotSearch.json`;
setInterval(() => {
  fs.readFile(hotSearchPath, "utf-8", function (err, data) {
    if (err) throw err;
    // console.log(data)
    hotSearchData = JSON.parse(data);
  })
}, 10000);



// 
router.get('/news', async (ctx) => {

  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      await ctx.render('news', {
        list: hotSearchData,
        username: CookieID
      })

    } else {
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }
})


// 
var cpUpload = upload.fields([{
  name: 'file1',
  maxCount: 1
}, {
  name: 'file2',
  maxCount: 1
}]);
router.post('/upload/files', cpUpload, async (ctx) => {

  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      // console.log(ctx.req.files); //文本内容
      let originalname1;
      let originalname2;
      let filename1;
      let filename2;
      let path1;
      let path2;
      let systemTime = String(new Date().getTime());

      if (ctx.req.files.file1) {
        originalname1 = ctx.req.files.file1[0].originalname;
        filename1 = ctx.req.files.file1[0].filename;
        path1 = ctx.req.files.file1[0].path;
      } else {
        originalname1 = '';
        filename1 = '';
        path1 = '';
      }

      if (ctx.req.files.file2) {
        originalname2 = ctx.req.files.file2[0].originalname;
        filename2 = ctx.req.files.file2[0].filename;
        path2 = ctx.req.files.file2[0].path;
      } else {
        originalname2 = '';
        filename2 = '';
        path2 = '';
      }
      let notesProcessed=ctx.req.body.notes.replace(/\r\n/g,"");
      console.log(notesProcessed);
      let uploadInsert={
        sessionID: ctx.req.body.sessionID.trim(),
        theme: ctx.req.body.theme.trim(),
        notes: notesProcessed,  
        // file1
        originalname1: originalname1.trim(),
        filename1: filename1.trim(),
        path1: path1.trim(),
        // file2
        originalname2: originalname2.trim(),
        filename2: filename2.trim(),
        path2: path2.trim(),
        systemTime: systemTime.trim(),
      };
      let data = await DB.insert('disk',uploadInsert )
      try {
        if (data.result.ok) {
          //   ctx.body = {
          //   filename1: ctx.req.files.file1[0].filename,  //返回文件名 
          //   // filename2: ctx.req.files.file2[0].filename  //返回文件名 
          // }
          ctx.redirect('/notes')
          console.log('Add Successfully');
          // res.redirect('/')
        }
      } catch (err) {
        console.log(err);
        console.log('Something went wrong');
        ctx.redirect('/')
        return;
      }
    } else {
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }


})




// 下载模块---支持任意文件下载
router.get('/mediafile', async function (ctx) {


  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {

      // const fileName = `../upload/1589949381451.png`;
      var id = CookieID;
      // console.log(id);
      //去数据库查询这个id对应的数据     自增长的id 要用{"_id":new DB.getObjectId(id)
      let data = await DB.find('disk', {
        "sessionID": id
      });
       console.log(data);
      let pathArray = [];
      let videoPathArray = [];

      for (let i = 1; i < data.length + 1; i++) {
        let systemTime = data[i - 1].systemTime;
        // console.log(systemTime);
        let timeReturn = getFormatTime(Number(systemTime));
        // console.log(timeReturn);
        // file1
        let mediaFilePath = data[i - 1].path1;
        let originalname1 = data[i - 1].originalname1;
        originalname1 != '' ? originalname1 = originalname1 : '';
        let existImg = originalname1.indexOf('jpg') ;
        let exitJPG=originalname1.indexOf('png');
        let exitJPEG=originalname1.indexOf('jpeg');

        if (existImg > 0 || exitJPG>0 ||exitJPEG >0) {
          pathArray.push([{
            imgPath: mediaFilePath
          }, {
            originalname: originalname1
          }, {
            timeReturn: timeReturn
          }])
        }
        let existVideo = originalname1.indexOf('mp4') ;
        let existMKV = originalname1.indexOf('mkv') ;
        let existAVI = originalname1.indexOf('avi') ;
        let existWMA = originalname1.indexOf('wma') ;
        if (existVideo > 0 || existAVI>0||existMKV>0||existWMA>0) {
          videoPathArray.push([{
            videoPath: mediaFilePath
          }, {
            originalname: originalname1
          }, {
            timeReturn: timeReturn
          }])
        }
        // file2
        let mediaFilePath2 = data[i - 1].path2;
        let originalname2 = data[i - 1].originalname2;
        originalname2 != '' ? originalname2 = originalname2 : '';
        let exist2 = originalname2.indexOf('png') || originalname2.indexOf('jpg') || originalname2.indexOf('jpeg');
        let existVideo2 = originalname2.indexOf('mp4') || originalname2.indexOf('avi') || originalname2.indexOf('wmv') || originalname2.indexOf('mkv');
        if (exist2 > 0) {
          pathArray.push([{
            imgPath: mediaFilePath
          }, {
            originalname: originalname1
          }, {
            timeReturn: timeReturn
          }])
        }
        if (existVideo2 > 0) {
          videoPathArray.push([{
            videoPath: mediaFilePath2
          }, {
            originalname: originalname2
          }, {
            timeReturn: timeReturn
          }])
        }

        // video1 +video2
      };
      console.log(pathArray);
      console.log(videoPathArray);
      await ctx.render('mediafile', {
        imgList: pathArray,
        videoList: videoPathArray,
        username: CookieID
      })

    } else {
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }



});



//删除文件
router.get('/deleteFile/upload/:filename', async function (ctx) {
  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      realPath = path.resolve(__dirname, '../Fleeting_KOA_Server/upload')
      const path1 = `${realPath}\\${ctx.params.filename}`;
      console.log(path1);
      fs.unlink(path1, (err) => {
        if (err) {
          console.log(err);
          return
        };
        console.log('The file is already delete');
      })
      // console.log(path1);
      const fileName = ctx.params.filename;
      console.log(fileName);
      //获取
      let data = await DB.remove('disk', {
        "filename1": fileName
      } || {
        "filename2": fileName
      });
      // console.log('1111');
      // console.log(data);
      try {
        if (data) {
          console.log('Delete Successfully')
          await ctx.redirect('/files')
        }
      } catch (err) {
        if (err) throw err;
      }
    } else {
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }


})

// 下载模块---支持任意文件下载
router.get('/download/upload/:filename', async function (ctx) {


  try {
    var getCookie = ctx.cookies.get('userinfo');
    var CookieID = new Buffer.from(getCookie, 'base64').toString();
    if (CookieID != '') {
      realPath = path.resolve(__dirname, '../Fleeting_KOA_Server')
      const fileName = `${realPath}\\upload\\${ctx.params.filename}`;
      // console.log(fileName);
      // ctx.req.file中选择ctx.req.file.originalname或ctx.req.file.filename以获取nodejs app创建的新文件名。
      try {
        if (fs.existsSync(fileName)) {
          console.log('it exists');
          ctx.body = fs.createReadStream(fileName); //可以显示pdf,否则还得用pdf插件等，会增大服务器负担
          // readFile也可以展示，只是pdf不能显示在浏览器中
          // ctx.body = fs.readFile(fileName,()=>{
          // });
          ctx.attachment(fileName);
        } else {
          ctx.throw(400, "Requested file not found on server");
        }
      } catch (error) {
        ctx.throw(500, error);
      }
    } else {
      ctx.redirect('/');
    }
  } catch (e) {
    console.log(e.message);
  }



});


// 播放mp4视频
router.get('/:filename', async (ctx) => {
  const path = `${__dirname}/upload/${ctx.params.filename}/`;
  const stat = fs.statSync(path)
  const fileSize = stat.size
  const range = ctx.req.headers.range
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ?
      parseInt(parts[1], 10) :
      fileSize - 1
    const chunksize = (end - start) + 1
    const file = fs.createReadStream(path, {
      start,
      end
    })
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }
    ctx.writeHead(206, head);
    file.pipe(ctx.res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    ctx.res.writeHead(200, head)
    fs.createReadStream(path).pipe(ctx.res)
  }
});


app.use(router.routes()); //启动路由
app.use(router.allowedMethods());

app.listen(3000, () => {
  console.log('starting at port 3000');
});