// Import in commondjs style
var DustJS = require("dustjs-linkedin");
var fs = require("fs");

initializeDustJS();

// Load dust templates
loadDustTemplate("module");
loadDustTemplate("interface");
loadDustTemplate("enum");
loadDustTemplate("builder");


module.exports = function (inputStr, options, callback) {
    // Load the json file
    var model;
    try {
        model = JSON.parse(inputStr);
    }
    catch (e) {
        callback("Input doesn't look like a JSON!", null);
    }

    // If a packagename isn't present, use a default package name
    if (!model.package) {
        model.package = "Proto2TypeScript";
    }

    // Generates the names of the model
    generateNames(options, model, model.package);

    // Render the model
    DustJS.render("module", model, function (err, out) {
        callback(err, out);
    });
};

// --------------------------- functions -----------------------

function loadDustTemplate(name) {
    var template = fs.readFileSync(__dirname + "/../templates/" + name + ".dust", "UTF8").toString();
    var compiledTemplate = DustJS.compile(template, name);
    DustJS.loadSource(compiledTemplate);
}

function initializeDustJS() {
    // Keep line breaks
    DustJS.optimizers.format = function (ctx, node) {
        return node;
    };

    // Create view filters
    DustJS.filters["firstLetterInUpperCase"] = function (value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    DustJS.filters["firstLetterInLowerCase"] = function (value) {
        return value.charAt(0).toLowerCase() + value.slice(1);
    };

    DustJS.filters["camelCase"] = function (value) {
        return value.replace(/(_[a-zA-Z])/g, function (match) {
            return match[1].toUpperCase();
        });
    };

    DustJS.filters["convertType"] = function (value) {
        switch (value.toLowerCase()) {
            case 'string':
                return 'string';
            case 'bool':
                return 'boolean';
            case 'bytes':
                return 'ByteBuffer';
            case 'double':
            case 'float':
            case 'int32':
            case 'int64':
            case 'uint32':
            case 'uint64':
            case 'sint32':
            case 'sint64':
            case 'fixed32':
            case 'fixed64':
            case 'sfixed32':
            case 'sfixed64':
                return "number";
        }
        // By default, it's a message identifier
        return value;
    };

    DustJS.filters["optionalFieldDeclaration"] = function (value) {
        return value == "optional" ? "?" : "";
    };

    DustJS.filters["repeatedType"] = function (value) {
        return value == "repeated" ? "[]" : "";
    };
}

// Generate the names for the model, the types, and the interfaces
function generateNames(options, model, prefix, name) {
    if (name === void 0) {
        name = "";
    }
    model.fullPackageName = prefix + (name != "." ? name : "");

    // Copies the settings (I'm lazy)
    model.properties = options.properties;


    var newDefinitions = {};

    // Generate names for messages
    // Recursive call for all messages
    var key;
    for (key in model.messages) {
        var message = model.messages[key];
        newDefinitions[message.name] = "Builder";
        generateNames(options, message, model.fullPackageName, "." + (model.name ? model.name : ""));
    }

    // Generate names for enums
    for (key in model.enums) {
        var currentEnum = model.enums[key];
        newDefinitions[currentEnum.name] = "";
        currentEnum.fullPackageName = model.fullPackageName + (model.name ? "." + model.name : "");
    }

    // For fields of types which are defined in the same message,
    // update the field type in consequence
    for (key in model.fields) {
        var field = model.fields[key];
        if (typeof newDefinitions[field.type] !== "undefined") {
            field.type = model.name + "." + field.type;
        }
    }

    // Add the new definitions in the model for generate builders
    var definitions = [];
    for (key in newDefinitions) {
        definitions.push({name: key, type: ((model.name ? (model.name + ".") : "") + key) + newDefinitions[key]});
    }

    model.definitions = definitions;
}