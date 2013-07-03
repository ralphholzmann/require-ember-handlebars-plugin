define(["ember"], function () {

  var options = { data: true, stringParams: true };
  var ignore = [
    "action",
    "linkTo"
  ];

  var viewPath = "views/";
  var templatePath = "templates/"; 
  var controllerPath = "controllers/";
  var helperPath = "helpers/";
  var casing = "camel";

  function enforceCase(str) {
    if (casing === "snake" || casing === "underscore") {
      return toUnderscore(str);
    } else if (casing === "class") {
      return toClass(str);
    } else {
      return toCamel(str);
    }
  }

  function _camelOrClass(str) {
    return str.slice(1).replace(/_[a-z]/g, function(match) {
      return match.charAt(1).toUpperCase();
    });
  }

  function toCamel(str) {
    return str.charAt(0).toLowerCase() + _camelOrClass(str);
  }

  function toClass(str) {
    return str.charAt(0).toUpperCase() + _camelOrClass(str);
  }

  function toUnderscore(str) {
    return str.replace(/[A-Z]/g, function(letter, index) {
      return index === 0 ? letter : "_" + letter.toLowerCase();
    }).toLowerCase();
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
  }

  function shouldIgnore(helper, namespace) {
    if (namespace && namespace == "Ember" || namespace == "Em") {
      return true;
    }
    return ignore.indexOf(helper) !== -1;
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

  return {
    load: function(name, parentRequire, onload, config) {
      readConfig(config);

      parentRequire(["text!" + parentRequire.toUrl( templatePath + name + ".hbs")], function (template) {
        var ast = Ember.Handlebars.parse(template);
        var deps = getDeps(ast, parentRequire);

        // This stuff is taken right from Ember.Handlebars.compile()
        var environment = new Ember.Handlebars.Compiler().compile(ast, options);
        var templateSpec = new Ember.Handlebars.JavaScriptCompiler().compile(environment, options, undefined, true);
        Ember.TEMPLATES[enforceCase(name)] = Ember.Handlebars.template(templateSpec);

        if (deps.length) {
          parentRequire(deps, onload);
        } else {
          onload();
        }
      });
    }
  };
});

