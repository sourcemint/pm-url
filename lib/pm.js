
const PATH = require("path");
const FS = require("fs");
const URL = require("url");
const HTTP = require("http");
const HTTPS = require("https");
const Q = require("sourcemint-util-js/lib/q");
const FS_RECURSIVE = require("sourcemint-util-js/lib/fs-recursive");


exports.install = function(pm, options) {

    var done = Q.ref();

    var path = PATH.resolve(pm.context.package.path,  "response-body");

    done = Q.when(done, function() {

        var deferred = Q.defer();

        FS_RECURSIVE.mkdirSyncRecursive(pm.context.package.path);

        console.log("Downloading: " + options.locator);

        // TODO: Use sourcemint/util-js/lib/url-proxy-cache instead.

        var writeStream = FS.createWriteStream(path);
        writeStream.on("error", function(err) {
            deferred.reject(err);
        });
        writeStream.on("close", function() {
            deferred.resolve();
        });

        var urlParts = URL.parse(options.locator);
        var request = ((urlParts.protocol==="https:")?HTTPS:HTTP).request({
            host: urlParts.host,
            port: urlParts.port || ((urlParts.protocol==="https:")?443:80),
            path: urlParts.path,
            method: "GET"
        }, function(res) {
            if (res.statusCode === 301) {
                options.locator = res.headers["location"];
                Q.when(exports.install(pm, options),deferred.resolve, deferred.reject);
                return;
            }
            if (res.statusCode !== 200) {
                deferred.reject(new Error("Got status '" + res.statusCode + "'!"));
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
            deferred.reject(err);
        });
        request.end();

        return deferred.promise;
    });

    if (options.descriptorOverlay && options.descriptorOverlay.main) {
        done = Q.when(done, function() {
            var deferred = Q.defer();

            var targetPath = PATH.join(path, "..", options.descriptorOverlay.main);

            FS.symlink(PATH.basename(path), targetPath, function(err) {
                if (err) {
                    return deferred.reject(err);
                }
                deferred.resolve();
            });

            return deferred.promise;
        });
    }

    return done;
}
