var px = require("./build/Debug/px");
var http = require('http');
var util = require('util');

function Api(scene) {
  this._scene = scene;
}

Api.prototype.loadScriptContents = function(uri, closure) {
  var fs = require('fs');
  var url = require('url');

  var code = '';

  if (uri.substring(0, 4) == "http") {
    var options = url.parse(uri);
    if (uri.substring(0, 5) == "https") {
      throw 'not supported'
    }
    else {
      var req = http.get(options, function(res) {
        res.on('data',  function(data)  { code += data; });
        res.on('end',   function()      { closure(code, null); });
      });
      req.on('error',   function(err)   { closure('', err); });
    }
  }
  else {
    var infile = fs.createReadStream(uri);
    infile.on('data',  function(data)   { code += data; });
    infile.on('end',   function()       { closure(code, null); });
    infile.on('error', function(err)    { closure('', err); });
  }
}

Api.prototype.loadScriptForScene = function(scene, uri) {
  var sceneForChild = scene;
  var apiForChild = this;

  var code;

  try {
    code = this.loadScriptContents(uri, function(code, err) {
      var vm = require('vm');
      var sandbox = {
        console   : console,
        scene     : sceneForChild,
        runtime   : apiForChild,
        process   : process
      };

      if (err) {
        console.log("failed to load script:" + uri);
        console.log(err);
        // TODO: scene.onError(err); ???
      }
      else {

        var app;
        try {
          app = vm.runInNewContext(code, sandbox);
        }
        catch (err) {
          console.log('dumping contetx');

          // sanbox was turned into a context via vm.runInNewContext(...);
          console.log(util.inspect(sandbox));
          console.log("failed to run app:" + uri);
          console.log(err);
          // TODO: scene.onError(err); ???
          // TODO: at this point we need to destroy the child scene
        }
      }
    });
  }
  catch (err) {
    console.log("failed to load script:" + uri);
    console.log(err);
    // TODO: scene.onError(err); ???
  }
}

var scene = px.getScene(0, 0, 800, 400);
var api = new Api(scene);

// register a "global" hook that gets invoked whenever a child scene is created
scene.onScene = function(scene, url) {
    api.loadScriptForScene(scene, url);
};

var argv = process.argv;

if (argv.length >= 3) {
    var childScene = scene.createScene();
    childScene.url = argv[2];
    childScene.parent = scene.root;

    function updateSize(w, h) {
        childScene.w = w;
        childScene.h = h;
    }
    
    scene.on("resize", updateSize);
    updateSize(scene.w, scene.h);
}
else
    console.log("Usage: ./load.sh <js file>");
