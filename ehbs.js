define(["ember"], function (Ember) {

  var options = { data: true, stringParams: true };

  function getArgFromStatement(statement) {
    var parts = statement.params[0].string.split(".");
    return parts.length === 1 ? parts[0] : parts.slice(1).join(".");
  }

  function getDeps(ast) {
    var deps = [];

    ast.statements.forEach(function(statement) {
        if (statement.isHelper) {
          if (statement.id.string == "view") {
            deps.push("views/" + getArgFromStatement(statement));
          } else if (statement.id.string == "partial") {
            deps.push("ehbs!" + getArgFromStatement(statement));
          } else {
            deps.push("helpers/" + statement.id.string);
          }
        }
    });

    return deps;
  }

  return {
    load: function(name, parentRequire, onload, config) {
      require(["text!templates/" + name + ".hbs"], function (template) {
        var ast = Ember.Handlebars.parse(template);
        var deps = getDeps(ast);

        // This stuff is taken right from Ember.Handlebars.compile()
        var environment = new Ember.Handlebars.Compiler().compile(ast, options);
        var templateSpec = new Ember.Handlebars.JavaScriptCompiler().compile(environment, options, undefined, true);
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
