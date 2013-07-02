define(["ember"], function (Ember) {

  var options = { data: true, stringParams: true };
  var compiler = new Ember.Handlebars.Compiler();
  var jsCompiler = new Ember.Handlebars.JavaScriptCompiler();
  var viewPath = "views/";
  var templatePath = "templates/"; 
  var controllerPath = "controllers/";
  var helperPath = "helpers/";

  function readConfig(config) {
    var paths = config.ehbs && config.ehbs.paths;
    if (paths) {
      viewPath = paths.views || viewPath;
      templatePath = paths.templates || templatePath;
      controllerPath = paths.controllers || controllerPath;
      helperPath = paths.helpers || helperPath;
    }
  }

  function getArgFromStatement(statement) {
    var parts = statement.params[0].string.split(".");
    return parts.length === 1 ? parts[0] : parts.slice(1).join(".");
  }

  function getDeps(ast, parentRequire) {
    var deps = ast.statements.reduce(function(deps, statement) {
      var string;

      if (statement.isHelper) {
        string = statement.id.string;

        // TODO: get these directories from config instead of hard code
        if (string == "view") {
          deps.push(viewPath + getArgFromStatement(statement));
        } else if (string == "partial" || string == "render") {
          deps.push("ehbs!" + getArgFromStatement(statement));
        } else if (string == "control") {
          deps.push(controllerPath + getArgFromStatement(statement));
        } else {
          deps.push(helperPath + statement.id.string);
        }
      }

      return deps;
    }, []);

    return deps.filter(function(dep) {
      return !(parentRequire.defined(dep) || parentRequire.specified(dep));
    });
  }

  return {
    load: function(name, parentRequire, onload, config) {
      readConfig(config);
      require(["text!" + templatePath + name + ".hbs"], function (template) {
        var ast = Ember.Handlebars.parse(template);
        var deps = getDeps(ast, parentRequire);

        // This stuff is taken right from Ember.Handlebars.compile()
        var environment = compiler.compile(ast, options);
        var templateSpec = jsCompiler.compile(environment, options, undefined, true);
        Ember.TEMPLATES[name] = Ember.Handlebars.template(templateSpec);

        if (deps.length) {
          parentRequire(deps, onload);
        } else {
          onload();
        }
      });
    }
  };
});
