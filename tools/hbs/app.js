var express = require('express'),
  hbs = require('hbs'),
  app = express();

app.set('view engine', 'hbs');  // 用hbs作为模版引擎
app.set('views', __dirname + '/views');

app.use(express.static(__dirname + '/public')); // 静态资源

app.get('/*', function(req, res){
    res.render('index', {title: 'hbs demo', author: 'chyingp'});
});

// app.get('/profile', function(req, res){
//     res.render('profile', {title: 'hbs demo', author: 'chyingp'});
// });

app.set('port', process.env.PORT || 3050);

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});