var express = require('express'),
  hbs = require('hbs'),
  app = express();


// 用hbs作为模版引擎
// app.set('view engine', 'hbs');

// 使用 hbs 引擎，但后缀改为 html
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);

app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public')); // 静态资源

app.get('/', function(req, res){
    res.render('index', {title: 'hbs demo', author: 'chyingp'});
});

app.get('/profile', function(req, res){
    res.render('profile', {title: 'hbs demo', author: 'chyingp'});
});

app.set('port', process.env.PORT || 3050);

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});