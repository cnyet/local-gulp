/**
 * gulp发布版本配置
 * gulp --gulpfile ./deploy.js [default|deploy]
 */
var gulp = require("gulp"),                                 //gulp基础库
    plugins = require('gulp-load-plugins')(),               //自动require你在package.json中声明的依赖
    pngquant = require('imagemin-pngquant'),                //png图片压缩插件
    runSequence = require("run-sequence"),                  //串行依次执行任务
    filePath = require("./src/config/filePath");            //文件路径配置

var pkg = require("./package.json"),
    //添加注释信息到自己编辑的文件头部
    info = ['/**',
        ' * <%= pkg.name %> - <%= pkg.description %>',
        ' * @author <%= pkg.author %>',
        ' * @version v<%= pkg.version %>',
        ' */',
        ''
    ].join('\n');

//拷贝文件
gulp.task("copy:files", function () {
    //拷贝字体文件
    gulp.src(filePath.sourcePath.fonts)
        .pipe(gulp.dest(filePath.targetPath.fonts));

    //拷贝图片
    gulp.src(filePath.sourcePath.images)
        .pipe(plugins.imagemin({
            progressive: true,
            use: [pngquant()]           //使用pngquant来压缩png图片
        }))
        .pipe(gulp.dest(filePath.targetPath.images));
});

//压缩合并css
gulp.task("build:css", function () {
    var cssFilter = plugins.filter(["src/css/**/*.css", "!src/css/components/**"], {restore: true}),
        compFilter = plugins.filter("src/css/components/**/*.{css,less}", {restore: true}),
        cssOptions = {
            compatibility: 'ie7',//保留ie7及以下兼容写法 类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
            keepSpecialComments: '*' //保留所有特殊前缀 当你用autoprefixer生成的浏览器前缀，如果不加这个参数，有可能将会删除你的部分前缀
        },
        timestamp = +new Date();
    return gulp.src(filePath.sourceCss)
        .pipe(plugins.plumber())
        .pipe(cssFilter)
        .pipe(plugins.less())
        .pipe(plugins.autoprefixer({
            browsers: 'last 2 versions'
        }))
        .pipe(plugins.concat("style.min.css"))
        .pipe(plugins.cssSpriter({
            //生成sprite的位置
            spriteSheet: "dist/images/spritesheet" + timestamp + ".png",
            //修改样式文件引用图片地址路径
            pathToSpriteSheetFromCSS: "../images/spritesheet" +timestamp + ".png",
            spritesmithOptions: {
                padding: 10
            }
        }))
        .pipe(plugins.cssBase64())
        .pipe(plugins.cleanCss(cssOptions))
        .pipe(cssFilter.restore)
        .pipe(compFilter)
        .pipe(plugins.concat("common.min.css"))
        .pipe(plugins.cleanCss(cssOptions))
        .pipe(compFilter.restore)
        .pipe(plugins.plumber.stop())
        .pipe(plugins.rev())
        .pipe(gulp.dest(filePath.targetPath.css))
        .pipe(plugins.rev.manifest())
        .pipe(gulp.dest('src/revision/css'));
});

//压缩合并js
gulp.task("build:js", function () {
    var jsFilter = plugins.filter(["src/js/**/*.js", "!src/js/vendors/*"], {restore: true}),
        vendorFilter = plugins.filter(["src/js/vendors/**/*.js"], {restore: true});

    return gulp.src(filePath.sourceJs)
        .pipe(plugins.plumber())
        .pipe(jsFilter)
        .pipe(plugins.concat("custom.min.js"))
        .pipe(plugins.uglify())
        .pipe(plugins.header(info, {
            pkg: pkg
        }))
        .pipe(jsFilter.restore)
        .pipe(vendorFilter)
        .pipe(plugins.concat("lib.min.js"))
        .pipe(plugins.uglify())
        .pipe(vendorFilter.restore)
        .pipe(plugins.plumber.stop())
        .pipe(plugins.rev())
        .pipe(gulp.dest(filePath.targetPath.js))
        .pipe(plugins.rev.manifest())
        .pipe(gulp.dest('src/revision/js'));
});

gulp.task("build:html", function () {
    var options = {
        removeComments: true,                   //清除html注释
        collapseBooleanAttributes: true,        //省略布尔属性值
        collapseWhitespace: true,               //压缩HTML
        preserveLineBreaks: true,               //每行保持一个换行符
        removeEmptyAttributes: true,            //删除所有空格作为属性值
        removeScriptTypeAttributes: true,       //删除script的type属性
        removeStyleTypeAttributes: true,        //删除link的type属性
        minifyJS: true,                         //压缩页面js
        minifyCSS: true                         //压缩页面css
    };
    return gulp.src(filePath.sourcePath.html)
        .pipe(plugins.useref())
        .pipe(plugins.inject(gulp.src('./dist/css/*.css', {read: false}), {ignorePath:"dist", addRootSlash: false, addPrefix: "..", starttag: '<!-- inject:head:{{ext}} -->'}))
        .pipe(plugins.inject(gulp.src('./dist/js/*.js', {read: false}), {ignorePath:"dist", addRootSlash: false, addPrefix: "..", starttag: '<!-- inject:body:{{ext}} -->'}))
        .pipe(plugins.htmlmin(options))
        .pipe(gulp.dest(filePath.targetPath.html));
});

//清除文件
gulp.task('clean', function () {
    return gulp.src('dist')
        .pipe(plugins.clean())
});

//发布
gulp.task("default", function(){
    runSequence("clean", "copy:files", 'build:css', 'build:js', 'build:html');
});