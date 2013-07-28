define(["ember"], function (Ember) {

  var ignore = Ember.keys(Ember.Handlebars.helpers);

  var viewPath = "views/";
  var templatePath = "templates/";
  var controllerPath = "controllers/";
  var helperPath = "helpers/";
  var casing = "camel";

  var camelize = Ember.String.camelize;
  var underscore = Ember.String.underscore;
  var classify = Ember.String.classify;

  function enforceCase(str) {
    if (casing === "snake" || casing === "underscore") {
      return underscore(str);
    } else if (casing === "class") {
      return classify(str);
    } else {
      return camelize(str);
    }
  }

  function join(uriParts) {
    var parts = [];
    uriParts.forEach(function (part) {
      parts.push.apply(parts, part.split("/"));
    });
    return parts.filter(function(part) {
      return !!part;
    }).join("/");
  }

  function readConfig(config) {
    if (config.ehbs) {
      var paths = config.ehbs.paths;
      if (paths) {
        viewPath = paths.views || viewPath;
        templatePath = paths.templates || templatePath;
        controllerPath = paths.controllers || controllerPath;
        helperPath = paths.helpers || helperPath;
      }
      if (config.ehbs.casing) {
        casing = config.ehbs.casing;
      }
    }
  }

  function getNamespaceAndNameFromStatement(statement) {
    if (statement.params[0]) {
      var parts = statement.params[0].string.split(".");
      var namespace;
      var name;

      if (parts.length === 1) {
        namespace = null;
        name = parts[0];
      } else {
        namespace = parts.shift();
        name = parts.join(".");
      }

      return [namespace, name];
    } else {
      return [null, statement.id.string];
    }
  }

  function shouldIgnore(helper, namespace) {
    return (namespace && namespace == "Ember" || namespace == "Em") || ignore.indexOf(helper) !== -1;
  }

  function getDeps(ast, parentRequire) {
    var deps = ast.statements.reduce(function(deps, statement) {
      var helperName = statement.id && statement.id.string;
      var dep, parts, namespace, arg;

      if (statement.isHelper) {
        parts = getNamespaceAndNameFromStatement(statement);
        namespace = parts[0];
        arg = parts[1];

        if (!shouldIgnore(helperName, namespace)) {
          if (helperName == "view") {
            path = viewPath;
            ext = ".js";
          } else if (helperName == "partial" || helperName == "render") {
            path = "ehbs!";
            ext = "";
          } else if (helperName == "control") {
            path = controllerPath;
            ext = ".js";
          } else {
            path = helperPath;
            arg = statement.id.string;
            ext = ".js";
          }

          arg = enforceCase(arg);

          deps.push(parentRequire.toUrl(path + arg + ext));
        }
      }

      return deps;
    }, []);

    return deps.filter(function(dep) {
      return !(parentRequire.defined(dep) || parentRequire.specified(dep));
    });
  }

  var compileOptions = {
    data: true,
    stringParams: true
  };

  return {
    load: function(name, parentRequire, onload, config) {
      readConfig(config);
      parentRequire(["text!" + join([templatePath, name + ".hbs"])], function (template) {
        var ast = Ember.Handlebars.parse(template);
        var deps = getDeps(ast, parentRequire);

        // This stuff is taken right from Ember.Handlebars.compile()
        var environment = new Ember.Handlebars.Compiler().compile(ast, compileOptions);
        var templateSpec = new Ember.Handlebars.JavaScriptCompiler().compile(environment, compileOptions, undefined, true);
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


