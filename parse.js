

"use strict";

(function() {

    var parseId;

    function id(i) {
        return document.getElementById(i);
    }

    function showIsLoading(show) {
      if(show) console.log("Parsing code...");
      else console.log("Done.");
      id('spinner').style.visibility = show ? "visible" : "hidden";
    }

    function getFullName(node){
        if(node == null) return "??";
        var packageName = "";

        if(node.hasOwnProperty("identifier")) {
            packageName = node.identifier;
        }
        if(node.hasOwnProperty("name")) {
            packageName = getFullName(node.name)+packageName;
        }
        if(node.hasOwnProperty("qualifier")) {
            packageName = getFullName(node.qualifier)+"."+packageName;
        }
        return packageName;
    }


    function findFullType(className, codeParsed) {
        //Class that will not have imports
        switch (className) {
            case "Byte":
            case "Character":
            case "CharSequence":
            case "Double":
            case "Enum":
            case "Float":            case "Integer":
            case "Iterable":
            case "Number":
            case "Long":
            case "Object":

            case "String":
            case "StringBuilder":
            case "StringBuffer":
            case "Thread":
            case "Throwable":
            case "Exception":
                return "Ljava/lang/"+className+";"

        }


        if(codeParsed.hasOwnProperty("imports")) {
            var imports = codeParsed.imports;
            for(var import_idx in imports) {
                var fullImport = getFullName(imports[import_idx].name);
                //console.log(fullImport);
                if(fullImport.endsWith("."+className)) {
                    return "L"+fullImport.replace(/\./g,"/")+";";
                }
            }
        
            var packageName = getFullName(codeParsed.package).replace(/\./g,"/");
            return "L"+packageName+"/"+className+";";
        }
    }


    function getType(type, codeParsed) {
        if(type == undefined) return "??";
        switch (type.node) {
            case "ArrayType":
                return "["+getType(type.componentType,codeParsed);
            case "PrimitiveType":
                switch (type.primitiveTypeCode)
                {
                    case "int":     return "I";
                    case "boolean": return "Z";
                    case "byte":    return "B";
                    case "char":    return "C";
                    case "short":   return "S";
                    case "int":     return "I";
                    case "long":    return "J";
                    case "float":   return "F";
                    case "double":  return "D";
                    case "void":  return "V";
                    default: return "?";
                }
            case "SimpleType":
                return findFullType(type.name.identifier, codeParsed);
            case "ParameterizedType":
                var mainType = getType(type.type,codeParsed)
                return mainType;
        }

        return "??";
    }

    function showGeneratedConfig(configToPrint) {
      id("generatedOutput").value += configToPrint + "\n";
    }

    function generateConfiguration(codeParsed) {
        var packageName = getFullName(codeParsed.package).replace(/\./g,"/");

        id("generatedOutput").value = "";
        for(var itype in codeParsed.types) {
            var type = codeParsed.types[itype];
            //console.info(type.name);
            var className = getFullName(type.name);

            for(var imethod in type.bodyDeclarations) {
                var method = type.bodyDeclarations[imethod];

                if(method.node != "MethodDeclaration") continue;

                var typesSignature = "";
                var stringParams = new Array();
                var stackDepth = 0;
                for(var iparam in method.parameters) {
                    var parameter = method.parameters[iparam];
                    var parameterType = getType(parameter.type,codeParsed);
                    typesSignature += parameterType;

                    if(parameterType == "Ljava/lang/String;") {
                        stringParams.push(stackDepth);
                    }
                    stackDepth++;
                    if(parameterType == "D" || parameterType == "J") {
                        stackDepth++;
                    }
                }
                var returnType = getType(method.returnType2,codeParsed).replace(/\./g,"/");

                var injectatableIndex = stringParams.map(function (value) {
                  return stackDepth-value-1;
                }).sort().join(",")
                showGeneratedConfig(packageName+"/"+className+"."+method.name.identifier+
                    "("+typesSignature+")"+returnType+":"+injectatableIndex);
            }
        }
    }

    function parse(delay) {
        if (parseId) {
            window.clearTimeout(parseId);
        }

        showIsLoading(true);
        parseId = window.setTimeout(function () {
            var code, result, str;

            code = window.editor.getText();
            id('info').className = 'alert-box secondary';

            try {
                result = JavaParser.parse(code);

                window.codeDom = result;
                //console.info(result);
                str = JSON.stringify(result, null, 4);



                id('info').innerHTML = 'No error';
                generateConfiguration(result);
            } catch (err) {
                str = err.name === 'SyntaxError' 
                    ? "Location: " + JSON.stringify(err.location, null, 4) + "\n" + err
                    : err.name + ': ' + err.message;
                id('info').innerHTML  = str;
                id('info').className = 'alert-box alert';
            }
            showIsLoading(false);

            //id('syntax').value = str;

            parseId = undefined;
        }, delay || 811);
    }

    window.onload = function () {
        require(["orion/editor/edit"], function(edit) {
           window.editor = edit({className: "editor"});
           window.editor.getTextView().getModel().addEventListener("Changed", function () { parse(); });

           parse(42);
        });
    };

})();
