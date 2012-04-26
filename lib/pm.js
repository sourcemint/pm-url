
const PATH = require("path");
const FS = require("fs");
const URL = require("url");
const HTTP = require("http");


exports.install = function(packagePath, options, callback) {

    FS.mkdirSync(options.installPath, 0755);

    var path = PATH.resolve(options.installPath,  "response-body");
    
    console.log("Downloading: " + options.locator);
    
    var writeStream = FS.createWriteStream(path);
    function fail(err) {
        success = false;
        if (callback) {
            callback(err);
            callback = false;
        }
        return;
    }
    writeStream.on("error", function(err) {
        fail(err);
    });
    writeStream.on("close", function() {
        if (callback) {
            callback(null);
            callback = false;
        }
    });

    var urlParts = URL.parse(options.locator);
    var request = HTTP.request({
        host: urlParts.host,
        path: urlParts.path,
        method: "GET"
    }, function(res) {
        if (res.statusCode !== 200) {
            fail("Got status '" + res.statusCode + "'!");
            return;
        }
        res.on("data", function(chunk) {
            writeStream.write(chunk, "binary");
        });
        res.on("end", function() {
            writeStream.end();
        });
    });
    request.on("error", function(err) {
        fail(err);
    });
    request.end();
}
