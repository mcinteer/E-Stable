$(function() {

    function decode(encoded) {
        if (encoded == null) {
            return encoded;
        }
        var div = document.createElement('div');
        div.innerHTML = encoded;
        var test = div.firstChild.nodeValue;
        return JSON.parse(test);
    }

    $.fn.slideFadeToggle = function(easing, callback) {
        return this.animate({ opacity: 'toggle', height: 'toggle' }, "fast", easing, callback);
    };
    

});
/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.10 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.10',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite and existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part, length = ary.length;
            for (i = 0; i < length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        //End of the line. Keep at least one non-dot
                        //path segment at the front so it can be mapped
                        //correctly to disk. Otherwise, there is likely
                        //no path mapping for a path starting with '..'.
                        //This can still fail, but catches the most reasonable
                        //uses of ..
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI,
                baseParts = baseName && baseName.split('/'),
                normalizedBaseParts = baseParts,
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name && name.charAt(0) === '.') {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = name.split('/');
                    lastIndex = name.length - 1;

                    // If wanting node ID compatibility, strip .js from end
                    // of IDs. Have to do this here, and not in nameToUrl
                    // because node allows either .js or non .js to map
                    // to same file.
                    if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                        name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                    }

                    name = normalizedBaseParts.concat(name);
                    trimDots(name);
                    name = name.join('/');
                } else if (name.indexOf('./') === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);
                context.require([id]);
                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        normalizedName = normalize(name, parentName, applyMap);
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return mod.exports;
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return  getOwn(config.config, mod.map.id) || {};
                        },
                        exports: handlers.exports(mod)
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if(args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overriden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                 //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));
/*! jQuery v1.7.2 jquery.com | jquery.org/license */
(function(a,b){function cy(a){return f.isWindow(a)?a:a.nodeType===9?a.defaultView||a.parentWindow:!1}function cu(a){if(!cj[a]){var b=c.body,d=f("<"+a+">").appendTo(b),e=d.css("display");d.remove();if(e==="none"||e===""){ck||(ck=c.createElement("iframe"),ck.frameBorder=ck.width=ck.height=0),b.appendChild(ck);if(!cl||!ck.createElement)cl=(ck.contentWindow||ck.contentDocument).document,cl.write((f.support.boxModel?"<!doctype html>":"")+"<html><body>"),cl.close();d=cl.createElement(a),cl.body.appendChild(d),e=f.css(d,"display"),b.removeChild(ck)}cj[a]=e}return cj[a]}function ct(a,b){var c={};f.each(cp.concat.apply([],cp.slice(0,b)),function(){c[this]=a});return c}function cs(){cq=b}function cr(){setTimeout(cs,0);return cq=f.now()}function ci(){try{return new a.ActiveXObject("Microsoft.XMLHTTP")}catch(b){}}function ch(){try{return new a.XMLHttpRequest}catch(b){}}function cb(a,c){a.dataFilter&&(c=a.dataFilter(c,a.dataType));var d=a.dataTypes,e={},g,h,i=d.length,j,k=d[0],l,m,n,o,p;for(g=1;g<i;g++){if(g===1)for(h in a.converters)typeof h=="string"&&(e[h.toLowerCase()]=a.converters[h]);l=k,k=d[g];if(k==="*")k=l;else if(l!=="*"&&l!==k){m=l+" "+k,n=e[m]||e["* "+k];if(!n){p=b;for(o in e){j=o.split(" ");if(j[0]===l||j[0]==="*"){p=e[j[1]+" "+k];if(p){o=e[o],o===!0?n=p:p===!0&&(n=o);break}}}}!n&&!p&&f.error("No conversion from "+m.replace(" "," to ")),n!==!0&&(c=n?n(c):p(o(c)))}}return c}function ca(a,c,d){var e=a.contents,f=a.dataTypes,g=a.responseFields,h,i,j,k;for(i in g)i in d&&(c[g[i]]=d[i]);while(f[0]==="*")f.shift(),h===b&&(h=a.mimeType||c.getResponseHeader("content-type"));if(h)for(i in e)if(e[i]&&e[i].test(h)){f.unshift(i);break}if(f[0]in d)j=f[0];else{for(i in d){if(!f[0]||a.converters[i+" "+f[0]]){j=i;break}k||(k=i)}j=j||k}if(j){j!==f[0]&&f.unshift(j);return d[j]}}function b_(a,b,c,d){if(f.isArray(b))f.each(b,function(b,e){c||bD.test(a)?d(a,e):b_(a+"["+(typeof e=="object"?b:"")+"]",e,c,d)});else if(!c&&f.type(b)==="object")for(var e in b)b_(a+"["+e+"]",b[e],c,d);else d(a,b)}function b$(a,c){var d,e,g=f.ajaxSettings.flatOptions||{};for(d in c)c[d]!==b&&((g[d]?a:e||(e={}))[d]=c[d]);e&&f.extend(!0,a,e)}function bZ(a,c,d,e,f,g){f=f||c.dataTypes[0],g=g||{},g[f]=!0;var h=a[f],i=0,j=h?h.length:0,k=a===bS,l;for(;i<j&&(k||!l);i++)l=h[i](c,d,e),typeof l=="string"&&(!k||g[l]?l=b:(c.dataTypes.unshift(l),l=bZ(a,c,d,e,l,g)));(k||!l)&&!g["*"]&&(l=bZ(a,c,d,e,"*",g));return l}function bY(a){return function(b,c){typeof b!="string"&&(c=b,b="*");if(f.isFunction(c)){var d=b.toLowerCase().split(bO),e=0,g=d.length,h,i,j;for(;e<g;e++)h=d[e],j=/^\+/.test(h),j&&(h=h.substr(1)||"*"),i=a[h]=a[h]||[],i[j?"unshift":"push"](c)}}}function bB(a,b,c){var d=b==="width"?a.offsetWidth:a.offsetHeight,e=b==="width"?1:0,g=4;if(d>0){if(c!=="border")for(;e<g;e+=2)c||(d-=parseFloat(f.css(a,"padding"+bx[e]))||0),c==="margin"?d+=parseFloat(f.css(a,c+bx[e]))||0:d-=parseFloat(f.css(a,"border"+bx[e]+"Width"))||0;return d+"px"}d=by(a,b);if(d<0||d==null)d=a.style[b];if(bt.test(d))return d;d=parseFloat(d)||0;if(c)for(;e<g;e+=2)d+=parseFloat(f.css(a,"padding"+bx[e]))||0,c!=="padding"&&(d+=parseFloat(f.css(a,"border"+bx[e]+"Width"))||0),c==="margin"&&(d+=parseFloat(f.css(a,c+bx[e]))||0);return d+"px"}function bo(a){var b=c.createElement("div");bh.appendChild(b),b.innerHTML=a.outerHTML;return b.firstChild}function bn(a){var b=(a.nodeName||"").toLowerCase();b==="input"?bm(a):b!=="script"&&typeof a.getElementsByTagName!="undefined"&&f.grep(a.getElementsByTagName("input"),bm)}function bm(a){if(a.type==="checkbox"||a.type==="radio")a.defaultChecked=a.checked}function bl(a){return typeof a.getElementsByTagName!="undefined"?a.getElementsByTagName("*"):typeof a.querySelectorAll!="undefined"?a.querySelectorAll("*"):[]}function bk(a,b){var c;b.nodeType===1&&(b.clearAttributes&&b.clearAttributes(),b.mergeAttributes&&b.mergeAttributes(a),c=b.nodeName.toLowerCase(),c==="object"?b.outerHTML=a.outerHTML:c!=="input"||a.type!=="checkbox"&&a.type!=="radio"?c==="option"?b.selected=a.defaultSelected:c==="input"||c==="textarea"?b.defaultValue=a.defaultValue:c==="script"&&b.text!==a.text&&(b.text=a.text):(a.checked&&(b.defaultChecked=b.checked=a.checked),b.value!==a.value&&(b.value=a.value)),b.removeAttribute(f.expando),b.removeAttribute("_submit_attached"),b.removeAttribute("_change_attached"))}function bj(a,b){if(b.nodeType===1&&!!f.hasData(a)){var c,d,e,g=f._data(a),h=f._data(b,g),i=g.events;if(i){delete h.handle,h.events={};for(c in i)for(d=0,e=i[c].length;d<e;d++)f.event.add(b,c,i[c][d])}h.data&&(h.data=f.extend({},h.data))}}function bi(a,b){return f.nodeName(a,"table")?a.getElementsByTagName("tbody")[0]||a.appendChild(a.ownerDocument.createElement("tbody")):a}function U(a){var b=V.split("|"),c=a.createDocumentFragment();if(c.createElement)while(b.length)c.createElement(b.pop());return c}function T(a,b,c){b=b||0;if(f.isFunction(b))return f.grep(a,function(a,d){var e=!!b.call(a,d,a);return e===c});if(b.nodeType)return f.grep(a,function(a,d){return a===b===c});if(typeof b=="string"){var d=f.grep(a,function(a){return a.nodeType===1});if(O.test(b))return f.filter(b,d,!c);b=f.filter(b,d)}return f.grep(a,function(a,d){return f.inArray(a,b)>=0===c})}function S(a){return!a||!a.parentNode||a.parentNode.nodeType===11}function K(){return!0}function J(){return!1}function n(a,b,c){var d=b+"defer",e=b+"queue",g=b+"mark",h=f._data(a,d);h&&(c==="queue"||!f._data(a,e))&&(c==="mark"||!f._data(a,g))&&setTimeout(function(){!f._data(a,e)&&!f._data(a,g)&&(f.removeData(a,d,!0),h.fire())},0)}function m(a){for(var b in a){if(b==="data"&&f.isEmptyObject(a[b]))continue;if(b!=="toJSON")return!1}return!0}function l(a,c,d){if(d===b&&a.nodeType===1){var e="data-"+c.replace(k,"-$1").toLowerCase();d=a.getAttribute(e);if(typeof d=="string"){try{d=d==="true"?!0:d==="false"?!1:d==="null"?null:f.isNumeric(d)?+d:j.test(d)?f.parseJSON(d):d}catch(g){}f.data(a,c,d)}else d=b}return d}function h(a){var b=g[a]={},c,d;a=a.split(/\s+/);for(c=0,d=a.length;c<d;c++)b[a[c]]=!0;return b}var c=a.document,d=a.navigator,e=a.location,f=function(){function J(){if(!e.isReady){try{c.documentElement.doScroll("left")}catch(a){setTimeout(J,1);return}e.ready()}}var e=function(a,b){return new e.fn.init(a,b,h)},f=a.jQuery,g=a.$,h,i=/^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,j=/\S/,k=/^\s+/,l=/\s+$/,m=/^<(\w+)\s*\/?>(?:<\/\1>)?$/,n=/^[\],:{}\s]*$/,o=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,p=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,q=/(?:^|:|,)(?:\s*\[)+/g,r=/(webkit)[ \/]([\w.]+)/,s=/(opera)(?:.*version)?[ \/]([\w.]+)/,t=/(msie) ([\w.]+)/,u=/(mozilla)(?:.*? rv:([\w.]+))?/,v=/-([a-z]|[0-9])/ig,w=/^-ms-/,x=function(a,b){return(b+"").toUpperCase()},y=d.userAgent,z,A,B,C=Object.prototype.toString,D=Object.prototype.hasOwnProperty,E=Array.prototype.push,F=Array.prototype.slice,G=String.prototype.trim,H=Array.prototype.indexOf,I={};e.fn=e.prototype={constructor:e,init:function(a,d,f){var g,h,j,k;if(!a)return this;if(a.nodeType){this.context=this[0]=a,this.length=1;return this}if(a==="body"&&!d&&c.body){this.context=c,this[0]=c.body,this.selector=a,this.length=1;return this}if(typeof a=="string"){a.charAt(0)!=="<"||a.charAt(a.length-1)!==">"||a.length<3?g=i.exec(a):g=[null,a,null];if(g&&(g[1]||!d)){if(g[1]){d=d instanceof e?d[0]:d,k=d?d.ownerDocument||d:c,j=m.exec(a),j?e.isPlainObject(d)?(a=[c.createElement(j[1])],e.fn.attr.call(a,d,!0)):a=[k.createElement(j[1])]:(j=e.buildFragment([g[1]],[k]),a=(j.cacheable?e.clone(j.fragment):j.fragment).childNodes);return e.merge(this,a)}h=c.getElementById(g[2]);if(h&&h.parentNode){if(h.id!==g[2])return f.find(a);this.length=1,this[0]=h}this.context=c,this.selector=a;return this}return!d||d.jquery?(d||f).find(a):this.constructor(d).find(a)}if(e.isFunction(a))return f.ready(a);a.selector!==b&&(this.selector=a.selector,this.context=a.context);return e.makeArray(a,this)},selector:"",jquery:"1.7.2",length:0,size:function(){return this.length},toArray:function(){return F.call(this,0)},get:function(a){return a==null?this.toArray():a<0?this[this.length+a]:this[a]},pushStack:function(a,b,c){var d=this.constructor();e.isArray(a)?E.apply(d,a):e.merge(d,a),d.prevObject=this,d.context=this.context,b==="find"?d.selector=this.selector+(this.selector?" ":"")+c:b&&(d.selector=this.selector+"."+b+"("+c+")");return d},each:function(a,b){return e.each(this,a,b)},ready:function(a){e.bindReady(),A.add(a);return this},eq:function(a){a=+a;return a===-1?this.slice(a):this.slice(a,a+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(F.apply(this,arguments),"slice",F.call(arguments).join(","))},map:function(a){return this.pushStack(e.map(this,function(b,c){return a.call(b,c,b)}))},end:function(){return this.prevObject||this.constructor(null)},push:E,sort:[].sort,splice:[].splice},e.fn.init.prototype=e.fn,e.extend=e.fn.extend=function(){var a,c,d,f,g,h,i=arguments[0]||{},j=1,k=arguments.length,l=!1;typeof i=="boolean"&&(l=i,i=arguments[1]||{},j=2),typeof i!="object"&&!e.isFunction(i)&&(i={}),k===j&&(i=this,--j);for(;j<k;j++)if((a=arguments[j])!=null)for(c in a){d=i[c],f=a[c];if(i===f)continue;l&&f&&(e.isPlainObject(f)||(g=e.isArray(f)))?(g?(g=!1,h=d&&e.isArray(d)?d:[]):h=d&&e.isPlainObject(d)?d:{},i[c]=e.extend(l,h,f)):f!==b&&(i[c]=f)}return i},e.extend({noConflict:function(b){a.$===e&&(a.$=g),b&&a.jQuery===e&&(a.jQuery=f);return e},isReady:!1,readyWait:1,holdReady:function(a){a?e.readyWait++:e.ready(!0)},ready:function(a){if(a===!0&&!--e.readyWait||a!==!0&&!e.isReady){if(!c.body)return setTimeout(e.ready,1);e.isReady=!0;if(a!==!0&&--e.readyWait>0)return;A.fireWith(c,[e]),e.fn.trigger&&e(c).trigger("ready").off("ready")}},bindReady:function(){if(!A){A=e.Callbacks("once memory");if(c.readyState==="complete")return setTimeout(e.ready,1);if(c.addEventListener)c.addEventListener("DOMContentLoaded",B,!1),a.addEventListener("load",e.ready,!1);else if(c.attachEvent){c.attachEvent("onreadystatechange",B),a.attachEvent("onload",e.ready);var b=!1;try{b=a.frameElement==null}catch(d){}c.documentElement.doScroll&&b&&J()}}},isFunction:function(a){return e.type(a)==="function"},isArray:Array.isArray||function(a){return e.type(a)==="array"},isWindow:function(a){return a!=null&&a==a.window},isNumeric:function(a){return!isNaN(parseFloat(a))&&isFinite(a)},type:function(a){return a==null?String(a):I[C.call(a)]||"object"},isPlainObject:function(a){if(!a||e.type(a)!=="object"||a.nodeType||e.isWindow(a))return!1;try{if(a.constructor&&!D.call(a,"constructor")&&!D.call(a.constructor.prototype,"isPrototypeOf"))return!1}catch(c){return!1}var d;for(d in a);return d===b||D.call(a,d)},isEmptyObject:function(a){for(var b in a)return!1;return!0},error:function(a){throw new Error(a)},parseJSON:function(b){if(typeof b!="string"||!b)return null;b=e.trim(b);if(a.JSON&&a.JSON.parse)return a.JSON.parse(b);if(n.test(b.replace(o,"@").replace(p,"]").replace(q,"")))return(new Function("return "+b))();e.error("Invalid JSON: "+b)},parseXML:function(c){if(typeof c!="string"||!c)return null;var d,f;try{a.DOMParser?(f=new DOMParser,d=f.parseFromString(c,"text/xml")):(d=new ActiveXObject("Microsoft.XMLDOM"),d.async="false",d.loadXML(c))}catch(g){d=b}(!d||!d.documentElement||d.getElementsByTagName("parsererror").length)&&e.error("Invalid XML: "+c);return d},noop:function(){},globalEval:function(b){b&&j.test(b)&&(a.execScript||function(b){a.eval.call(a,b)})(b)},camelCase:function(a){return a.replace(w,"ms-").replace(v,x)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toUpperCase()===b.toUpperCase()},each:function(a,c,d){var f,g=0,h=a.length,i=h===b||e.isFunction(a);if(d){if(i){for(f in a)if(c.apply(a[f],d)===!1)break}else for(;g<h;)if(c.apply(a[g++],d)===!1)break}else if(i){for(f in a)if(c.call(a[f],f,a[f])===!1)break}else for(;g<h;)if(c.call(a[g],g,a[g++])===!1)break;return a},trim:G?function(a){return a==null?"":G.call(a)}:function(a){return a==null?"":(a+"").replace(k,"").replace(l,"")},makeArray:function(a,b){var c=b||[];if(a!=null){var d=e.type(a);a.length==null||d==="string"||d==="function"||d==="regexp"||e.isWindow(a)?E.call(c,a):e.merge(c,a)}return c},inArray:function(a,b,c){var d;if(b){if(H)return H.call(b,a,c);d=b.length,c=c?c<0?Math.max(0,d+c):c:0;for(;c<d;c++)if(c in b&&b[c]===a)return c}return-1},merge:function(a,c){var d=a.length,e=0;if(typeof c.length=="number")for(var f=c.length;e<f;e++)a[d++]=c[e];else while(c[e]!==b)a[d++]=c[e++];a.length=d;return a},grep:function(a,b,c){var d=[],e;c=!!c;for(var f=0,g=a.length;f<g;f++)e=!!b(a[f],f),c!==e&&d.push(a[f]);return d},map:function(a,c,d){var f,g,h=[],i=0,j=a.length,k=a instanceof e||j!==b&&typeof j=="number"&&(j>0&&a[0]&&a[j-1]||j===0||e.isArray(a));if(k)for(;i<j;i++)f=c(a[i],i,d),f!=null&&(h[h.length]=f);else for(g in a)f=c(a[g],g,d),f!=null&&(h[h.length]=f);return h.concat.apply([],h)},guid:1,proxy:function(a,c){if(typeof c=="string"){var d=a[c];c=a,a=d}if(!e.isFunction(a))return b;var f=F.call(arguments,2),g=function(){return a.apply(c,f.concat(F.call(arguments)))};g.guid=a.guid=a.guid||g.guid||e.guid++;return g},access:function(a,c,d,f,g,h,i){var j,k=d==null,l=0,m=a.length;if(d&&typeof d=="object"){for(l in d)e.access(a,c,l,d[l],1,h,f);g=1}else if(f!==b){j=i===b&&e.isFunction(f),k&&(j?(j=c,c=function(a,b,c){return j.call(e(a),c)}):(c.call(a,f),c=null));if(c)for(;l<m;l++)c(a[l],d,j?f.call(a[l],l,c(a[l],d)):f,i);g=1}return g?a:k?c.call(a):m?c(a[0],d):h},now:function(){return(new Date).getTime()},uaMatch:function(a){a=a.toLowerCase();var b=r.exec(a)||s.exec(a)||t.exec(a)||a.indexOf("compatible")<0&&u.exec(a)||[];return{browser:b[1]||"",version:b[2]||"0"}},sub:function(){function a(b,c){return new a.fn.init(b,c)}e.extend(!0,a,this),a.superclass=this,a.fn=a.prototype=this(),a.fn.constructor=a,a.sub=this.sub,a.fn.init=function(d,f){f&&f instanceof e&&!(f instanceof a)&&(f=a(f));return e.fn.init.call(this,d,f,b)},a.fn.init.prototype=a.fn;var b=a(c);return a},browser:{}}),e.each("Boolean Number String Function Array Date RegExp Object".split(" "),function(a,b){I["[object "+b+"]"]=b.toLowerCase()}),z=e.uaMatch(y),z.browser&&(e.browser[z.browser]=!0,e.browser.version=z.version),e.browser.webkit&&(e.browser.safari=!0),j.test(" ")&&(k=/^[\s\xA0]+/,l=/[\s\xA0]+$/),h=e(c),c.addEventListener?B=function(){c.removeEventListener("DOMContentLoaded",B,!1),e.ready()}:c.attachEvent&&(B=function(){c.readyState==="complete"&&(c.detachEvent("onreadystatechange",B),e.ready())});return e}(),g={};f.Callbacks=function(a){a=a?g[a]||h(a):{};var c=[],d=[],e,i,j,k,l,m,n=function(b){var d,e,g,h,i;for(d=0,e=b.length;d<e;d++)g=b[d],h=f.type(g),h==="array"?n(g):h==="function"&&(!a.unique||!p.has(g))&&c.push(g)},o=function(b,f){f=f||[],e=!a.memory||[b,f],i=!0,j=!0,m=k||0,k=0,l=c.length;for(;c&&m<l;m++)if(c[m].apply(b,f)===!1&&a.stopOnFalse){e=!0;break}j=!1,c&&(a.once?e===!0?p.disable():c=[]:d&&d.length&&(e=d.shift(),p.fireWith(e[0],e[1])))},p={add:function(){if(c){var a=c.length;n(arguments),j?l=c.length:e&&e!==!0&&(k=a,o(e[0],e[1]))}return this},remove:function(){if(c){var b=arguments,d=0,e=b.length;for(;d<e;d++)for(var f=0;f<c.length;f++)if(b[d]===c[f]){j&&f<=l&&(l--,f<=m&&m--),c.splice(f--,1);if(a.unique)break}}return this},has:function(a){if(c){var b=0,d=c.length;for(;b<d;b++)if(a===c[b])return!0}return!1},empty:function(){c=[];return this},disable:function(){c=d=e=b;return this},disabled:function(){return!c},lock:function(){d=b,(!e||e===!0)&&p.disable();return this},locked:function(){return!d},fireWith:function(b,c){d&&(j?a.once||d.push([b,c]):(!a.once||!e)&&o(b,c));return this},fire:function(){p.fireWith(this,arguments);return this},fired:function(){return!!i}};return p};var i=[].slice;f.extend({Deferred:function(a){var b=f.Callbacks("once memory"),c=f.Callbacks("once memory"),d=f.Callbacks("memory"),e="pending",g={resolve:b,reject:c,notify:d},h={done:b.add,fail:c.add,progress:d.add,state:function(){return e},isResolved:b.fired,isRejected:c.fired,then:function(a,b,c){i.done(a).fail(b).progress(c);return this},always:function(){i.done.apply(i,arguments).fail.apply(i,arguments);return this},pipe:function(a,b,c){return f.Deferred(function(d){f.each({done:[a,"resolve"],fail:[b,"reject"],progress:[c,"notify"]},function(a,b){var c=b[0],e=b[1],g;f.isFunction(c)?i[a](function(){g=c.apply(this,arguments),g&&f.isFunction(g.promise)?g.promise().then(d.resolve,d.reject,d.notify):d[e+"With"](this===i?d:this,[g])}):i[a](d[e])})}).promise()},promise:function(a){if(a==null)a=h;else for(var b in h)a[b]=h[b];return a}},i=h.promise({}),j;for(j in g)i[j]=g[j].fire,i[j+"With"]=g[j].fireWith;i.done(function(){e="resolved"},c.disable,d.lock).fail(function(){e="rejected"},b.disable,d.lock),a&&a.call(i,i);return i},when:function(a){function m(a){return function(b){e[a]=arguments.length>1?i.call(arguments,0):b,j.notifyWith(k,e)}}function l(a){return function(c){b[a]=arguments.length>1?i.call(arguments,0):c,--g||j.resolveWith(j,b)}}var b=i.call(arguments,0),c=0,d=b.length,e=Array(d),g=d,h=d,j=d<=1&&a&&f.isFunction(a.promise)?a:f.Deferred(),k=j.promise();if(d>1){for(;c<d;c++)b[c]&&b[c].promise&&f.isFunction(b[c].promise)?b[c].promise().then(l(c),j.reject,m(c)):--g;g||j.resolveWith(j,b)}else j!==a&&j.resolveWith(j,d?[a]:[]);return k}}),f.support=function(){var b,d,e,g,h,i,j,k,l,m,n,o,p=c.createElement("div"),q=c.documentElement;p.setAttribute("className","t"),p.innerHTML="   <link/><table></table><a href='/a' style='top:1px;float:left;opacity:.55;'>a</a><input type='checkbox'/>",d=p.getElementsByTagName("*"),e=p.getElementsByTagName("a")[0];if(!d||!d.length||!e)return{};g=c.createElement("select"),h=g.appendChild(c.createElement("option")),i=p.getElementsByTagName("input")[0],b={leadingWhitespace:p.firstChild.nodeType===3,tbody:!p.getElementsByTagName("tbody").length,htmlSerialize:!!p.getElementsByTagName("link").length,style:/top/.test(e.getAttribute("style")),hrefNormalized:e.getAttribute("href")==="/a",opacity:/^0.55/.test(e.style.opacity),cssFloat:!!e.style.cssFloat,checkOn:i.value==="on",optSelected:h.selected,getSetAttribute:p.className!=="t",enctype:!!c.createElement("form").enctype,html5Clone:c.createElement("nav").cloneNode(!0).outerHTML!=="<:nav></:nav>",submitBubbles:!0,changeBubbles:!0,focusinBubbles:!1,deleteExpando:!0,noCloneEvent:!0,inlineBlockNeedsLayout:!1,shrinkWrapBlocks:!1,reliableMarginRight:!0,pixelMargin:!0},f.boxModel=b.boxModel=c.compatMode==="CSS1Compat",i.checked=!0,b.noCloneChecked=i.cloneNode(!0).checked,g.disabled=!0,b.optDisabled=!h.disabled;try{delete p.test}catch(r){b.deleteExpando=!1}!p.addEventListener&&p.attachEvent&&p.fireEvent&&(p.attachEvent("onclick",function(){b.noCloneEvent=!1}),p.cloneNode(!0).fireEvent("onclick")),i=c.createElement("input"),i.value="t",i.setAttribute("type","radio"),b.radioValue=i.value==="t",i.setAttribute("checked","checked"),i.setAttribute("name","t"),p.appendChild(i),j=c.createDocumentFragment(),j.appendChild(p.lastChild),b.checkClone=j.cloneNode(!0).cloneNode(!0).lastChild.checked,b.appendChecked=i.checked,j.removeChild(i),j.appendChild(p);if(p.attachEvent)for(n in{submit:1,change:1,focusin:1})m="on"+n,o=m in p,o||(p.setAttribute(m,"return;"),o=typeof p[m]=="function"),b[n+"Bubbles"]=o;j.removeChild(p),j=g=h=p=i=null,f(function(){var d,e,g,h,i,j,l,m,n,q,r,s,t,u=c.getElementsByTagName("body")[0];!u||(m=1,t="padding:0;margin:0;border:",r="position:absolute;top:0;left:0;width:1px;height:1px;",s=t+"0;visibility:hidden;",n="style='"+r+t+"5px solid #000;",q="<div "+n+"display:block;'><div style='"+t+"0;display:block;overflow:hidden;'></div></div>"+"<table "+n+"' cellpadding='0' cellspacing='0'>"+"<tr><td></td></tr></table>",d=c.createElement("div"),d.style.cssText=s+"width:0;height:0;position:static;top:0;margin-top:"+m+"px",u.insertBefore(d,u.firstChild),p=c.createElement("div"),d.appendChild(p),p.innerHTML="<table><tr><td style='"+t+"0;display:none'></td><td>t</td></tr></table>",k=p.getElementsByTagName("td"),o=k[0].offsetHeight===0,k[0].style.display="",k[1].style.display="none",b.reliableHiddenOffsets=o&&k[0].offsetHeight===0,a.getComputedStyle&&(p.innerHTML="",l=c.createElement("div"),l.style.width="0",l.style.marginRight="0",p.style.width="2px",p.appendChild(l),b.reliableMarginRight=(parseInt((a.getComputedStyle(l,null)||{marginRight:0}).marginRight,10)||0)===0),typeof p.style.zoom!="undefined"&&(p.innerHTML="",p.style.width=p.style.padding="1px",p.style.border=0,p.style.overflow="hidden",p.style.display="inline",p.style.zoom=1,b.inlineBlockNeedsLayout=p.offsetWidth===3,p.style.display="block",p.style.overflow="visible",p.innerHTML="<div style='width:5px;'></div>",b.shrinkWrapBlocks=p.offsetWidth!==3),p.style.cssText=r+s,p.innerHTML=q,e=p.firstChild,g=e.firstChild,i=e.nextSibling.firstChild.firstChild,j={doesNotAddBorder:g.offsetTop!==5,doesAddBorderForTableAndCells:i.offsetTop===5},g.style.position="fixed",g.style.top="20px",j.fixedPosition=g.offsetTop===20||g.offsetTop===15,g.style.position=g.style.top="",e.style.overflow="hidden",e.style.position="relative",j.subtractsBorderForOverflowNotVisible=g.offsetTop===-5,j.doesNotIncludeMarginInBodyOffset=u.offsetTop!==m,a.getComputedStyle&&(p.style.marginTop="1%",b.pixelMargin=(a.getComputedStyle(p,null)||{marginTop:0}).marginTop!=="1%"),typeof d.style.zoom!="undefined"&&(d.style.zoom=1),u.removeChild(d),l=p=d=null,f.extend(b,j))});return b}();var j=/^(?:\{.*\}|\[.*\])$/,k=/([A-Z])/g;f.extend({cache:{},uuid:0,expando:"jQuery"+(f.fn.jquery+Math.random()).replace(/\D/g,""),noData:{embed:!0,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",applet:!0},hasData:function(a){a=a.nodeType?f.cache[a[f.expando]]:a[f.expando];return!!a&&!m(a)},data:function(a,c,d,e){if(!!f.acceptData(a)){var g,h,i,j=f.expando,k=typeof c=="string",l=a.nodeType,m=l?f.cache:a,n=l?a[j]:a[j]&&j,o=c==="events";if((!n||!m[n]||!o&&!e&&!m[n].data)&&k&&d===b)return;n||(l?a[j]=n=++f.uuid:n=j),m[n]||(m[n]={},l||(m[n].toJSON=f.noop));if(typeof c=="object"||typeof c=="function")e?m[n]=f.extend(m[n],c):m[n].data=f.extend(m[n].data,c);g=h=m[n],e||(h.data||(h.data={}),h=h.data),d!==b&&(h[f.camelCase(c)]=d);if(o&&!h[c])return g.events;k?(i=h[c],i==null&&(i=h[f.camelCase(c)])):i=h;return i}},removeData:function(a,b,c){if(!!f.acceptData(a)){var d,e,g,h=f.expando,i=a.nodeType,j=i?f.cache:a,k=i?a[h]:h;if(!j[k])return;if(b){d=c?j[k]:j[k].data;if(d){f.isArray(b)||(b in d?b=[b]:(b=f.camelCase(b),b in d?b=[b]:b=b.split(" ")));for(e=0,g=b.length;e<g;e++)delete d[b[e]];if(!(c?m:f.isEmptyObject)(d))return}}if(!c){delete j[k].data;if(!m(j[k]))return}f.support.deleteExpando||!j.setInterval?delete j[k]:j[k]=null,i&&(f.support.deleteExpando?delete a[h]:a.removeAttribute?a.removeAttribute(h):a[h]=null)}},_data:function(a,b,c){return f.data(a,b,c,!0)},acceptData:function(a){if(a.nodeName){var b=f.noData[a.nodeName.toLowerCase()];if(b)return b!==!0&&a.getAttribute("classid")===b}return!0}}),f.fn.extend({data:function(a,c){var d,e,g,h,i,j=this[0],k=0,m=null;if(a===b){if(this.length){m=f.data(j);if(j.nodeType===1&&!f._data(j,"parsedAttrs")){g=j.attributes;for(i=g.length;k<i;k++)h=g[k].name,h.indexOf("data-")===0&&(h=f.camelCase(h.substring(5)),l(j,h,m[h]));f._data(j,"parsedAttrs",!0)}}return m}if(typeof a=="object")return this.each(function(){f.data(this,a)});d=a.split(".",2),d[1]=d[1]?"."+d[1]:"",e=d[1]+"!";return f.access(this,function(c){if(c===b){m=this.triggerHandler("getData"+e,[d[0]]),m===b&&j&&(m=f.data(j,a),m=l(j,a,m));return m===b&&d[1]?this.data(d[0]):m}d[1]=c,this.each(function(){var b=f(this);b.triggerHandler("setData"+e,d),f.data(this,a,c),b.triggerHandler("changeData"+e,d)})},null,c,arguments.length>1,null,!1)},removeData:function(a){return this.each(function(){f.removeData(this,a)})}}),f.extend({_mark:function(a,b){a&&(b=(b||"fx")+"mark",f._data(a,b,(f._data(a,b)||0)+1))},_unmark:function(a,b,c){a!==!0&&(c=b,b=a,a=!1);if(b){c=c||"fx";var d=c+"mark",e=a?0:(f._data(b,d)||1)-1;e?f._data(b,d,e):(f.removeData(b,d,!0),n(b,c,"mark"))}},queue:function(a,b,c){var d;if(a){b=(b||"fx")+"queue",d=f._data(a,b),c&&(!d||f.isArray(c)?d=f._data(a,b,f.makeArray(c)):d.push(c));return d||[]}},dequeue:function(a,b){b=b||"fx";var c=f.queue(a,b),d=c.shift(),e={};d==="inprogress"&&(d=c.shift()),d&&(b==="fx"&&c.unshift("inprogress"),f._data(a,b+".run",e),d.call(a,function(){f.dequeue(a,b)},e)),c.length||(f.removeData(a,b+"queue "+b+".run",!0),n(a,b,"queue"))}}),f.fn.extend({queue:function(a,c){var d=2;typeof a!="string"&&(c=a,a="fx",d--);if(arguments.length<d)return f.queue(this[0],a);return c===b?this:this.each(function(){var b=f.queue(this,a,c);a==="fx"&&b[0]!=="inprogress"&&f.dequeue(this,a)})},dequeue:function(a){return this.each(function(){f.dequeue(this,a)})},delay:function(a,b){a=f.fx?f.fx.speeds[a]||a:a,b=b||"fx";return this.queue(b,function(b,c){var d=setTimeout(b,a);c.stop=function(){clearTimeout(d)}})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,c){function m(){--h||d.resolveWith(e,[e])}typeof a!="string"&&(c=a,a=b),a=a||"fx";var d=f.Deferred(),e=this,g=e.length,h=1,i=a+"defer",j=a+"queue",k=a+"mark",l;while(g--)if(l=f.data(e[g],i,b,!0)||(f.data(e[g],j,b,!0)||f.data(e[g],k,b,!0))&&f.data(e[g],i,f.Callbacks("once memory"),!0))h++,l.add(m);m();return d.promise(c)}});var o=/[\n\t\r]/g,p=/\s+/,q=/\r/g,r=/^(?:button|input)$/i,s=/^(?:button|input|object|select|textarea)$/i,t=/^a(?:rea)?$/i,u=/^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,v=f.support.getSetAttribute,w,x,y;f.fn.extend({attr:function(a,b){return f.access(this,f.attr,a,b,arguments.length>1)},removeAttr:function(a){return this.each(function(){f.removeAttr(this,a)})},prop:function(a,b){return f.access(this,f.prop,a,b,arguments.length>1)},removeProp:function(a){a=f.propFix[a]||a;return this.each(function(){try{this[a]=b,delete this[a]}catch(c){}})},addClass:function(a){var b,c,d,e,g,h,i;if(f.isFunction(a))return this.each(function(b){f(this).addClass(a.call(this,b,this.className))});if(a&&typeof a=="string"){b=a.split(p);for(c=0,d=this.length;c<d;c++){e=this[c];if(e.nodeType===1)if(!e.className&&b.length===1)e.className=a;else{g=" "+e.className+" ";for(h=0,i=b.length;h<i;h++)~g.indexOf(" "+b[h]+" ")||(g+=b[h]+" ");e.className=f.trim(g)}}}return this},removeClass:function(a){var c,d,e,g,h,i,j;if(f.isFunction(a))return this.each(function(b){f(this).removeClass(a.call(this,b,this.className))});if(a&&typeof a=="string"||a===b){c=(a||"").split(p);for(d=0,e=this.length;d<e;d++){g=this[d];if(g.nodeType===1&&g.className)if(a){h=(" "+g.className+" ").replace(o," ");for(i=0,j=c.length;i<j;i++)h=h.replace(" "+c[i]+" "," ");g.className=f.trim(h)}else g.className=""}}return this},toggleClass:function(a,b){var c=typeof a,d=typeof b=="boolean";if(f.isFunction(a))return this.each(function(c){f(this).toggleClass(a.call(this,c,this.className,b),b)});return this.each(function(){if(c==="string"){var e,g=0,h=f(this),i=b,j=a.split(p);while(e=j[g++])i=d?i:!h.hasClass(e),h[i?"addClass":"removeClass"](e)}else if(c==="undefined"||c==="boolean")this.className&&f._data(this,"__className__",this.className),this.className=this.className||a===!1?"":f._data(this,"__className__")||""})},hasClass:function(a){var b=" "+a+" ",c=0,d=this.length;for(;c<d;c++)if(this[c].nodeType===1&&(" "+this[c].className+" ").replace(o," ").indexOf(b)>-1)return!0;return!1},val:function(a){var c,d,e,g=this[0];{if(!!arguments.length){e=f.isFunction(a);return this.each(function(d){var g=f(this),h;if(this.nodeType===1){e?h=a.call(this,d,g.val()):h=a,h==null?h="":typeof h=="number"?h+="":f.isArray(h)&&(h=f.map(h,function(a){return a==null?"":a+""})),c=f.valHooks[this.type]||f.valHooks[this.nodeName.toLowerCase()];if(!c||!("set"in c)||c.set(this,h,"value")===b)this.value=h}})}if(g){c=f.valHooks[g.type]||f.valHooks[g.nodeName.toLowerCase()];if(c&&"get"in c&&(d=c.get(g,"value"))!==b)return d;d=g.value;return typeof d=="string"?d.replace(q,""):d==null?"":d}}}}),f.extend({valHooks:{option:{get:function(a){var b=a.attributes.value;return!b||b.specified?a.value:a.text}},select:{get:function(a){var b,c,d,e,g=a.selectedIndex,h=[],i=a.options,j=a.type==="select-one";if(g<0)return null;c=j?g:0,d=j?g+1:i.length;for(;c<d;c++){e=i[c];if(e.selected&&(f.support.optDisabled?!e.disabled:e.getAttribute("disabled")===null)&&(!e.parentNode.disabled||!f.nodeName(e.parentNode,"optgroup"))){b=f(e).val();if(j)return b;h.push(b)}}if(j&&!h.length&&i.length)return f(i[g]).val();return h},set:function(a,b){var c=f.makeArray(b);f(a).find("option").each(function(){this.selected=f.inArray(f(this).val(),c)>=0}),c.length||(a.selectedIndex=-1);return c}}},attrFn:{val:!0,css:!0,html:!0,text:!0,data:!0,width:!0,height:!0,offset:!0},attr:function(a,c,d,e){var g,h,i,j=a.nodeType;if(!!a&&j!==3&&j!==8&&j!==2){if(e&&c in f.attrFn)return f(a)[c](d);if(typeof a.getAttribute=="undefined")return f.prop(a,c,d);i=j!==1||!f.isXMLDoc(a),i&&(c=c.toLowerCase(),h=f.attrHooks[c]||(u.test(c)?x:w));if(d!==b){if(d===null){f.removeAttr(a,c);return}if(h&&"set"in h&&i&&(g=h.set(a,d,c))!==b)return g;a.setAttribute(c,""+d);return d}if(h&&"get"in h&&i&&(g=h.get(a,c))!==null)return g;g=a.getAttribute(c);return g===null?b:g}},removeAttr:function(a,b){var c,d,e,g,h,i=0;if(b&&a.nodeType===1){d=b.toLowerCase().split(p),g=d.length;for(;i<g;i++)e=d[i],e&&(c=f.propFix[e]||e,h=u.test(e),h||f.attr(a,e,""),a.removeAttribute(v?e:c),h&&c in a&&(a[c]=!1))}},attrHooks:{type:{set:function(a,b){if(r.test(a.nodeName)&&a.parentNode)f.error("type property can't be changed");else if(!f.support.radioValue&&b==="radio"&&f.nodeName(a,"input")){var c=a.value;a.setAttribute("type",b),c&&(a.value=c);return b}}},value:{get:function(a,b){if(w&&f.nodeName(a,"button"))return w.get(a,b);return b in a?a.value:null},set:function(a,b,c){if(w&&f.nodeName(a,"button"))return w.set(a,b,c);a.value=b}}},propFix:{tabindex:"tabIndex",readonly:"readOnly","for":"htmlFor","class":"className",maxlength:"maxLength",cellspacing:"cellSpacing",cellpadding:"cellPadding",rowspan:"rowSpan",colspan:"colSpan",usemap:"useMap",frameborder:"frameBorder",contenteditable:"contentEditable"},prop:function(a,c,d){var e,g,h,i=a.nodeType;if(!!a&&i!==3&&i!==8&&i!==2){h=i!==1||!f.isXMLDoc(a),h&&(c=f.propFix[c]||c,g=f.propHooks[c]);return d!==b?g&&"set"in g&&(e=g.set(a,d,c))!==b?e:a[c]=d:g&&"get"in g&&(e=g.get(a,c))!==null?e:a[c]}},propHooks:{tabIndex:{get:function(a){var c=a.getAttributeNode("tabindex");return c&&c.specified?parseInt(c.value,10):s.test(a.nodeName)||t.test(a.nodeName)&&a.href?0:b}}}}),f.attrHooks.tabindex=f.propHooks.tabIndex,x={get:function(a,c){var d,e=f.prop(a,c);return e===!0||typeof e!="boolean"&&(d=a.getAttributeNode(c))&&d.nodeValue!==!1?c.toLowerCase():b},set:function(a,b,c){var d;b===!1?f.removeAttr(a,c):(d=f.propFix[c]||c,d in a&&(a[d]=!0),a.setAttribute(c,c.toLowerCase()));return c}},v||(y={name:!0,id:!0,coords:!0},w=f.valHooks.button={get:function(a,c){var d;d=a.getAttributeNode(c);return d&&(y[c]?d.nodeValue!=="":d.specified)?d.nodeValue:b},set:function(a,b,d){var e=a.getAttributeNode(d);e||(e=c.createAttribute(d),a.setAttributeNode(e));return e.nodeValue=b+""}},f.attrHooks.tabindex.set=w.set,f.each(["width","height"],function(a,b){f.attrHooks[b]=f.extend(f.attrHooks[b],{set:function(a,c){if(c===""){a.setAttribute(b,"auto");return c}}})}),f.attrHooks.contenteditable={get:w.get,set:function(a,b,c){b===""&&(b="false"),w.set(a,b,c)}}),f.support.hrefNormalized||f.each(["href","src","width","height"],function(a,c){f.attrHooks[c]=f.extend(f.attrHooks[c],{get:function(a){var d=a.getAttribute(c,2);return d===null?b:d}})}),f.support.style||(f.attrHooks.style={get:function(a){return a.style.cssText.toLowerCase()||b},set:function(a,b){return a.style.cssText=""+b}}),f.support.optSelected||(f.propHooks.selected=f.extend(f.propHooks.selected,{get:function(a){var b=a.parentNode;b&&(b.selectedIndex,b.parentNode&&b.parentNode.selectedIndex);return null}})),f.support.enctype||(f.propFix.enctype="encoding"),f.support.checkOn||f.each(["radio","checkbox"],function(){f.valHooks[this]={get:function(a){return a.getAttribute("value")===null?"on":a.value}}}),f.each(["radio","checkbox"],function(){f.valHooks[this]=f.extend(f.valHooks[this],{set:function(a,b){if(f.isArray(b))return a.checked=f.inArray(f(a).val(),b)>=0}})});var z=/^(?:textarea|input|select)$/i,A=/^([^\.]*)?(?:\.(.+))?$/,B=/(?:^|\s)hover(\.\S+)?\b/,C=/^key/,D=/^(?:mouse|contextmenu)|click/,E=/^(?:focusinfocus|focusoutblur)$/,F=/^(\w*)(?:#([\w\-]+))?(?:\.([\w\-]+))?$/,G=function(
a){var b=F.exec(a);b&&(b[1]=(b[1]||"").toLowerCase(),b[3]=b[3]&&new RegExp("(?:^|\\s)"+b[3]+"(?:\\s|$)"));return b},H=function(a,b){var c=a.attributes||{};return(!b[1]||a.nodeName.toLowerCase()===b[1])&&(!b[2]||(c.id||{}).value===b[2])&&(!b[3]||b[3].test((c["class"]||{}).value))},I=function(a){return f.event.special.hover?a:a.replace(B,"mouseenter$1 mouseleave$1")};f.event={add:function(a,c,d,e,g){var h,i,j,k,l,m,n,o,p,q,r,s;if(!(a.nodeType===3||a.nodeType===8||!c||!d||!(h=f._data(a)))){d.handler&&(p=d,d=p.handler,g=p.selector),d.guid||(d.guid=f.guid++),j=h.events,j||(h.events=j={}),i=h.handle,i||(h.handle=i=function(a){return typeof f!="undefined"&&(!a||f.event.triggered!==a.type)?f.event.dispatch.apply(i.elem,arguments):b},i.elem=a),c=f.trim(I(c)).split(" ");for(k=0;k<c.length;k++){l=A.exec(c[k])||[],m=l[1],n=(l[2]||"").split(".").sort(),s=f.event.special[m]||{},m=(g?s.delegateType:s.bindType)||m,s=f.event.special[m]||{},o=f.extend({type:m,origType:l[1],data:e,handler:d,guid:d.guid,selector:g,quick:g&&G(g),namespace:n.join(".")},p),r=j[m];if(!r){r=j[m]=[],r.delegateCount=0;if(!s.setup||s.setup.call(a,e,n,i)===!1)a.addEventListener?a.addEventListener(m,i,!1):a.attachEvent&&a.attachEvent("on"+m,i)}s.add&&(s.add.call(a,o),o.handler.guid||(o.handler.guid=d.guid)),g?r.splice(r.delegateCount++,0,o):r.push(o),f.event.global[m]=!0}a=null}},global:{},remove:function(a,b,c,d,e){var g=f.hasData(a)&&f._data(a),h,i,j,k,l,m,n,o,p,q,r,s;if(!!g&&!!(o=g.events)){b=f.trim(I(b||"")).split(" ");for(h=0;h<b.length;h++){i=A.exec(b[h])||[],j=k=i[1],l=i[2];if(!j){for(j in o)f.event.remove(a,j+b[h],c,d,!0);continue}p=f.event.special[j]||{},j=(d?p.delegateType:p.bindType)||j,r=o[j]||[],m=r.length,l=l?new RegExp("(^|\\.)"+l.split(".").sort().join("\\.(?:.*\\.)?")+"(\\.|$)"):null;for(n=0;n<r.length;n++)s=r[n],(e||k===s.origType)&&(!c||c.guid===s.guid)&&(!l||l.test(s.namespace))&&(!d||d===s.selector||d==="**"&&s.selector)&&(r.splice(n--,1),s.selector&&r.delegateCount--,p.remove&&p.remove.call(a,s));r.length===0&&m!==r.length&&((!p.teardown||p.teardown.call(a,l)===!1)&&f.removeEvent(a,j,g.handle),delete o[j])}f.isEmptyObject(o)&&(q=g.handle,q&&(q.elem=null),f.removeData(a,["events","handle"],!0))}},customEvent:{getData:!0,setData:!0,changeData:!0},trigger:function(c,d,e,g){if(!e||e.nodeType!==3&&e.nodeType!==8){var h=c.type||c,i=[],j,k,l,m,n,o,p,q,r,s;if(E.test(h+f.event.triggered))return;h.indexOf("!")>=0&&(h=h.slice(0,-1),k=!0),h.indexOf(".")>=0&&(i=h.split("."),h=i.shift(),i.sort());if((!e||f.event.customEvent[h])&&!f.event.global[h])return;c=typeof c=="object"?c[f.expando]?c:new f.Event(h,c):new f.Event(h),c.type=h,c.isTrigger=!0,c.exclusive=k,c.namespace=i.join("."),c.namespace_re=c.namespace?new RegExp("(^|\\.)"+i.join("\\.(?:.*\\.)?")+"(\\.|$)"):null,o=h.indexOf(":")<0?"on"+h:"";if(!e){j=f.cache;for(l in j)j[l].events&&j[l].events[h]&&f.event.trigger(c,d,j[l].handle.elem,!0);return}c.result=b,c.target||(c.target=e),d=d!=null?f.makeArray(d):[],d.unshift(c),p=f.event.special[h]||{};if(p.trigger&&p.trigger.apply(e,d)===!1)return;r=[[e,p.bindType||h]];if(!g&&!p.noBubble&&!f.isWindow(e)){s=p.delegateType||h,m=E.test(s+h)?e:e.parentNode,n=null;for(;m;m=m.parentNode)r.push([m,s]),n=m;n&&n===e.ownerDocument&&r.push([n.defaultView||n.parentWindow||a,s])}for(l=0;l<r.length&&!c.isPropagationStopped();l++)m=r[l][0],c.type=r[l][1],q=(f._data(m,"events")||{})[c.type]&&f._data(m,"handle"),q&&q.apply(m,d),q=o&&m[o],q&&f.acceptData(m)&&q.apply(m,d)===!1&&c.preventDefault();c.type=h,!g&&!c.isDefaultPrevented()&&(!p._default||p._default.apply(e.ownerDocument,d)===!1)&&(h!=="click"||!f.nodeName(e,"a"))&&f.acceptData(e)&&o&&e[h]&&(h!=="focus"&&h!=="blur"||c.target.offsetWidth!==0)&&!f.isWindow(e)&&(n=e[o],n&&(e[o]=null),f.event.triggered=h,e[h](),f.event.triggered=b,n&&(e[o]=n));return c.result}},dispatch:function(c){c=f.event.fix(c||a.event);var d=(f._data(this,"events")||{})[c.type]||[],e=d.delegateCount,g=[].slice.call(arguments,0),h=!c.exclusive&&!c.namespace,i=f.event.special[c.type]||{},j=[],k,l,m,n,o,p,q,r,s,t,u;g[0]=c,c.delegateTarget=this;if(!i.preDispatch||i.preDispatch.call(this,c)!==!1){if(e&&(!c.button||c.type!=="click")){n=f(this),n.context=this.ownerDocument||this;for(m=c.target;m!=this;m=m.parentNode||this)if(m.disabled!==!0){p={},r=[],n[0]=m;for(k=0;k<e;k++)s=d[k],t=s.selector,p[t]===b&&(p[t]=s.quick?H(m,s.quick):n.is(t)),p[t]&&r.push(s);r.length&&j.push({elem:m,matches:r})}}d.length>e&&j.push({elem:this,matches:d.slice(e)});for(k=0;k<j.length&&!c.isPropagationStopped();k++){q=j[k],c.currentTarget=q.elem;for(l=0;l<q.matches.length&&!c.isImmediatePropagationStopped();l++){s=q.matches[l];if(h||!c.namespace&&!s.namespace||c.namespace_re&&c.namespace_re.test(s.namespace))c.data=s.data,c.handleObj=s,o=((f.event.special[s.origType]||{}).handle||s.handler).apply(q.elem,g),o!==b&&(c.result=o,o===!1&&(c.preventDefault(),c.stopPropagation()))}}i.postDispatch&&i.postDispatch.call(this,c);return c.result}},props:"attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(a,b){a.which==null&&(a.which=b.charCode!=null?b.charCode:b.keyCode);return a}},mouseHooks:{props:"button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(a,d){var e,f,g,h=d.button,i=d.fromElement;a.pageX==null&&d.clientX!=null&&(e=a.target.ownerDocument||c,f=e.documentElement,g=e.body,a.pageX=d.clientX+(f&&f.scrollLeft||g&&g.scrollLeft||0)-(f&&f.clientLeft||g&&g.clientLeft||0),a.pageY=d.clientY+(f&&f.scrollTop||g&&g.scrollTop||0)-(f&&f.clientTop||g&&g.clientTop||0)),!a.relatedTarget&&i&&(a.relatedTarget=i===a.target?d.toElement:i),!a.which&&h!==b&&(a.which=h&1?1:h&2?3:h&4?2:0);return a}},fix:function(a){if(a[f.expando])return a;var d,e,g=a,h=f.event.fixHooks[a.type]||{},i=h.props?this.props.concat(h.props):this.props;a=f.Event(g);for(d=i.length;d;)e=i[--d],a[e]=g[e];a.target||(a.target=g.srcElement||c),a.target.nodeType===3&&(a.target=a.target.parentNode),a.metaKey===b&&(a.metaKey=a.ctrlKey);return h.filter?h.filter(a,g):a},special:{ready:{setup:f.bindReady},load:{noBubble:!0},focus:{delegateType:"focusin"},blur:{delegateType:"focusout"},beforeunload:{setup:function(a,b,c){f.isWindow(this)&&(this.onbeforeunload=c)},teardown:function(a,b){this.onbeforeunload===b&&(this.onbeforeunload=null)}}},simulate:function(a,b,c,d){var e=f.extend(new f.Event,c,{type:a,isSimulated:!0,originalEvent:{}});d?f.event.trigger(e,null,b):f.event.dispatch.call(b,e),e.isDefaultPrevented()&&c.preventDefault()}},f.event.handle=f.event.dispatch,f.removeEvent=c.removeEventListener?function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c,!1)}:function(a,b,c){a.detachEvent&&a.detachEvent("on"+b,c)},f.Event=function(a,b){if(!(this instanceof f.Event))return new f.Event(a,b);a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||a.returnValue===!1||a.getPreventDefault&&a.getPreventDefault()?K:J):this.type=a,b&&f.extend(this,b),this.timeStamp=a&&a.timeStamp||f.now(),this[f.expando]=!0},f.Event.prototype={preventDefault:function(){this.isDefaultPrevented=K;var a=this.originalEvent;!a||(a.preventDefault?a.preventDefault():a.returnValue=!1)},stopPropagation:function(){this.isPropagationStopped=K;var a=this.originalEvent;!a||(a.stopPropagation&&a.stopPropagation(),a.cancelBubble=!0)},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=K,this.stopPropagation()},isDefaultPrevented:J,isPropagationStopped:J,isImmediatePropagationStopped:J},f.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(a,b){f.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c=this,d=a.relatedTarget,e=a.handleObj,g=e.selector,h;if(!d||d!==c&&!f.contains(c,d))a.type=e.origType,h=e.handler.apply(this,arguments),a.type=b;return h}}}),f.support.submitBubbles||(f.event.special.submit={setup:function(){if(f.nodeName(this,"form"))return!1;f.event.add(this,"click._submit keypress._submit",function(a){var c=a.target,d=f.nodeName(c,"input")||f.nodeName(c,"button")?c.form:b;d&&!d._submit_attached&&(f.event.add(d,"submit._submit",function(a){a._submit_bubble=!0}),d._submit_attached=!0)})},postDispatch:function(a){a._submit_bubble&&(delete a._submit_bubble,this.parentNode&&!a.isTrigger&&f.event.simulate("submit",this.parentNode,a,!0))},teardown:function(){if(f.nodeName(this,"form"))return!1;f.event.remove(this,"._submit")}}),f.support.changeBubbles||(f.event.special.change={setup:function(){if(z.test(this.nodeName)){if(this.type==="checkbox"||this.type==="radio")f.event.add(this,"propertychange._change",function(a){a.originalEvent.propertyName==="checked"&&(this._just_changed=!0)}),f.event.add(this,"click._change",function(a){this._just_changed&&!a.isTrigger&&(this._just_changed=!1,f.event.simulate("change",this,a,!0))});return!1}f.event.add(this,"beforeactivate._change",function(a){var b=a.target;z.test(b.nodeName)&&!b._change_attached&&(f.event.add(b,"change._change",function(a){this.parentNode&&!a.isSimulated&&!a.isTrigger&&f.event.simulate("change",this.parentNode,a,!0)}),b._change_attached=!0)})},handle:function(a){var b=a.target;if(this!==b||a.isSimulated||a.isTrigger||b.type!=="radio"&&b.type!=="checkbox")return a.handleObj.handler.apply(this,arguments)},teardown:function(){f.event.remove(this,"._change");return z.test(this.nodeName)}}),f.support.focusinBubbles||f.each({focus:"focusin",blur:"focusout"},function(a,b){var d=0,e=function(a){f.event.simulate(b,a.target,f.event.fix(a),!0)};f.event.special[b]={setup:function(){d++===0&&c.addEventListener(a,e,!0)},teardown:function(){--d===0&&c.removeEventListener(a,e,!0)}}}),f.fn.extend({on:function(a,c,d,e,g){var h,i;if(typeof a=="object"){typeof c!="string"&&(d=d||c,c=b);for(i in a)this.on(i,c,d,a[i],g);return this}d==null&&e==null?(e=c,d=c=b):e==null&&(typeof c=="string"?(e=d,d=b):(e=d,d=c,c=b));if(e===!1)e=J;else if(!e)return this;g===1&&(h=e,e=function(a){f().off(a);return h.apply(this,arguments)},e.guid=h.guid||(h.guid=f.guid++));return this.each(function(){f.event.add(this,a,e,d,c)})},one:function(a,b,c,d){return this.on(a,b,c,d,1)},off:function(a,c,d){if(a&&a.preventDefault&&a.handleObj){var e=a.handleObj;f(a.delegateTarget).off(e.namespace?e.origType+"."+e.namespace:e.origType,e.selector,e.handler);return this}if(typeof a=="object"){for(var g in a)this.off(g,c,a[g]);return this}if(c===!1||typeof c=="function")d=c,c=b;d===!1&&(d=J);return this.each(function(){f.event.remove(this,a,d,c)})},bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},live:function(a,b,c){f(this.context).on(a,this.selector,b,c);return this},die:function(a,b){f(this.context).off(a,this.selector||"**",b);return this},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return arguments.length==1?this.off(a,"**"):this.off(b,a,c)},trigger:function(a,b){return this.each(function(){f.event.trigger(a,b,this)})},triggerHandler:function(a,b){if(this[0])return f.event.trigger(a,b,this[0],!0)},toggle:function(a){var b=arguments,c=a.guid||f.guid++,d=0,e=function(c){var e=(f._data(this,"lastToggle"+a.guid)||0)%d;f._data(this,"lastToggle"+a.guid,e+1),c.preventDefault();return b[e].apply(this,arguments)||!1};e.guid=c;while(d<b.length)b[d++].guid=c;return this.click(e)},hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}}),f.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(a,b){f.fn[b]=function(a,c){c==null&&(c=a,a=null);return arguments.length>0?this.on(b,null,a,c):this.trigger(b)},f.attrFn&&(f.attrFn[b]=!0),C.test(b)&&(f.event.fixHooks[b]=f.event.keyHooks),D.test(b)&&(f.event.fixHooks[b]=f.event.mouseHooks)}),function(){function x(a,b,c,e,f,g){for(var h=0,i=e.length;h<i;h++){var j=e[h];if(j){var k=!1;j=j[a];while(j){if(j[d]===c){k=e[j.sizset];break}if(j.nodeType===1){g||(j[d]=c,j.sizset=h);if(typeof b!="string"){if(j===b){k=!0;break}}else if(m.filter(b,[j]).length>0){k=j;break}}j=j[a]}e[h]=k}}}function w(a,b,c,e,f,g){for(var h=0,i=e.length;h<i;h++){var j=e[h];if(j){var k=!1;j=j[a];while(j){if(j[d]===c){k=e[j.sizset];break}j.nodeType===1&&!g&&(j[d]=c,j.sizset=h);if(j.nodeName.toLowerCase()===b){k=j;break}j=j[a]}e[h]=k}}}var a=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,d="sizcache"+(Math.random()+"").replace(".",""),e=0,g=Object.prototype.toString,h=!1,i=!0,j=/\\/g,k=/\r\n/g,l=/\W/;[0,0].sort(function(){i=!1;return 0});var m=function(b,d,e,f){e=e||[],d=d||c;var h=d;if(d.nodeType!==1&&d.nodeType!==9)return[];if(!b||typeof b!="string")return e;var i,j,k,l,n,q,r,t,u=!0,v=m.isXML(d),w=[],x=b;do{a.exec(""),i=a.exec(x);if(i){x=i[3],w.push(i[1]);if(i[2]){l=i[3];break}}}while(i);if(w.length>1&&p.exec(b))if(w.length===2&&o.relative[w[0]])j=y(w[0]+w[1],d,f);else{j=o.relative[w[0]]?[d]:m(w.shift(),d);while(w.length)b=w.shift(),o.relative[b]&&(b+=w.shift()),j=y(b,j,f)}else{!f&&w.length>1&&d.nodeType===9&&!v&&o.match.ID.test(w[0])&&!o.match.ID.test(w[w.length-1])&&(n=m.find(w.shift(),d,v),d=n.expr?m.filter(n.expr,n.set)[0]:n.set[0]);if(d){n=f?{expr:w.pop(),set:s(f)}:m.find(w.pop(),w.length===1&&(w[0]==="~"||w[0]==="+")&&d.parentNode?d.parentNode:d,v),j=n.expr?m.filter(n.expr,n.set):n.set,w.length>0?k=s(j):u=!1;while(w.length)q=w.pop(),r=q,o.relative[q]?r=w.pop():q="",r==null&&(r=d),o.relative[q](k,r,v)}else k=w=[]}k||(k=j),k||m.error(q||b);if(g.call(k)==="[object Array]")if(!u)e.push.apply(e,k);else if(d&&d.nodeType===1)for(t=0;k[t]!=null;t++)k[t]&&(k[t]===!0||k[t].nodeType===1&&m.contains(d,k[t]))&&e.push(j[t]);else for(t=0;k[t]!=null;t++)k[t]&&k[t].nodeType===1&&e.push(j[t]);else s(k,e);l&&(m(l,h,e,f),m.uniqueSort(e));return e};m.uniqueSort=function(a){if(u){h=i,a.sort(u);if(h)for(var b=1;b<a.length;b++)a[b]===a[b-1]&&a.splice(b--,1)}return a},m.matches=function(a,b){return m(a,null,null,b)},m.matchesSelector=function(a,b){return m(b,null,null,[a]).length>0},m.find=function(a,b,c){var d,e,f,g,h,i;if(!a)return[];for(e=0,f=o.order.length;e<f;e++){h=o.order[e];if(g=o.leftMatch[h].exec(a)){i=g[1],g.splice(1,1);if(i.substr(i.length-1)!=="\\"){g[1]=(g[1]||"").replace(j,""),d=o.find[h](g,b,c);if(d!=null){a=a.replace(o.match[h],"");break}}}}d||(d=typeof b.getElementsByTagName!="undefined"?b.getElementsByTagName("*"):[]);return{set:d,expr:a}},m.filter=function(a,c,d,e){var f,g,h,i,j,k,l,n,p,q=a,r=[],s=c,t=c&&c[0]&&m.isXML(c[0]);while(a&&c.length){for(h in o.filter)if((f=o.leftMatch[h].exec(a))!=null&&f[2]){k=o.filter[h],l=f[1],g=!1,f.splice(1,1);if(l.substr(l.length-1)==="\\")continue;s===r&&(r=[]);if(o.preFilter[h]){f=o.preFilter[h](f,s,d,r,e,t);if(!f)g=i=!0;else if(f===!0)continue}if(f)for(n=0;(j=s[n])!=null;n++)j&&(i=k(j,f,n,s),p=e^i,d&&i!=null?p?g=!0:s[n]=!1:p&&(r.push(j),g=!0));if(i!==b){d||(s=r),a=a.replace(o.match[h],"");if(!g)return[];break}}if(a===q)if(g==null)m.error(a);else break;q=a}return s},m.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)};var n=m.getText=function(a){var b,c,d=a.nodeType,e="";if(d){if(d===1||d===9||d===11){if(typeof a.textContent=="string")return a.textContent;if(typeof a.innerText=="string")return a.innerText.replace(k,"");for(a=a.firstChild;a;a=a.nextSibling)e+=n(a)}else if(d===3||d===4)return a.nodeValue}else for(b=0;c=a[b];b++)c.nodeType!==8&&(e+=n(c));return e},o=m.selectors={order:["ID","NAME","TAG"],match:{ID:/#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,CLASS:/\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,NAME:/\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,ATTR:/\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,TAG:/^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,CHILD:/:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,POS:/:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,PSEUDO:/:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/},leftMatch:{},attrMap:{"class":"className","for":"htmlFor"},attrHandle:{href:function(a){return a.getAttribute("href")},type:function(a){return a.getAttribute("type")}},relative:{"+":function(a,b){var c=typeof b=="string",d=c&&!l.test(b),e=c&&!d;d&&(b=b.toLowerCase());for(var f=0,g=a.length,h;f<g;f++)if(h=a[f]){while((h=h.previousSibling)&&h.nodeType!==1);a[f]=e||h&&h.nodeName.toLowerCase()===b?h||!1:h===b}e&&m.filter(b,a,!0)},">":function(a,b){var c,d=typeof b=="string",e=0,f=a.length;if(d&&!l.test(b)){b=b.toLowerCase();for(;e<f;e++){c=a[e];if(c){var g=c.parentNode;a[e]=g.nodeName.toLowerCase()===b?g:!1}}}else{for(;e<f;e++)c=a[e],c&&(a[e]=d?c.parentNode:c.parentNode===b);d&&m.filter(b,a,!0)}},"":function(a,b,c){var d,f=e++,g=x;typeof b=="string"&&!l.test(b)&&(b=b.toLowerCase(),d=b,g=w),g("parentNode",b,f,a,d,c)},"~":function(a,b,c){var d,f=e++,g=x;typeof b=="string"&&!l.test(b)&&(b=b.toLowerCase(),d=b,g=w),g("previousSibling",b,f,a,d,c)}},find:{ID:function(a,b,c){if(typeof b.getElementById!="undefined"&&!c){var d=b.getElementById(a[1]);return d&&d.parentNode?[d]:[]}},NAME:function(a,b){if(typeof b.getElementsByName!="undefined"){var c=[],d=b.getElementsByName(a[1]);for(var e=0,f=d.length;e<f;e++)d[e].getAttribute("name")===a[1]&&c.push(d[e]);return c.length===0?null:c}},TAG:function(a,b){if(typeof b.getElementsByTagName!="undefined")return b.getElementsByTagName(a[1])}},preFilter:{CLASS:function(a,b,c,d,e,f){a=" "+a[1].replace(j,"")+" ";if(f)return a;for(var g=0,h;(h=b[g])!=null;g++)h&&(e^(h.className&&(" "+h.className+" ").replace(/[\t\n\r]/g," ").indexOf(a)>=0)?c||d.push(h):c&&(b[g]=!1));return!1},ID:function(a){return a[1].replace(j,"")},TAG:function(a,b){return a[1].replace(j,"").toLowerCase()},CHILD:function(a){if(a[1]==="nth"){a[2]||m.error(a[0]),a[2]=a[2].replace(/^\+|\s*/g,"");var b=/(-?)(\d*)(?:n([+\-]?\d*))?/.exec(a[2]==="even"&&"2n"||a[2]==="odd"&&"2n+1"||!/\D/.test(a[2])&&"0n+"+a[2]||a[2]);a[2]=b[1]+(b[2]||1)-0,a[3]=b[3]-0}else a[2]&&m.error(a[0]);a[0]=e++;return a},ATTR:function(a,b,c,d,e,f){var g=a[1]=a[1].replace(j,"");!f&&o.attrMap[g]&&(a[1]=o.attrMap[g]),a[4]=(a[4]||a[5]||"").replace(j,""),a[2]==="~="&&(a[4]=" "+a[4]+" ");return a},PSEUDO:function(b,c,d,e,f){if(b[1]==="not")if((a.exec(b[3])||"").length>1||/^\w/.test(b[3]))b[3]=m(b[3],null,null,c);else{var g=m.filter(b[3],c,d,!0^f);d||e.push.apply(e,g);return!1}else if(o.match.POS.test(b[0])||o.match.CHILD.test(b[0]))return!0;return b},POS:function(a){a.unshift(!0);return a}},filters:{enabled:function(a){return a.disabled===!1&&a.type!=="hidden"},disabled:function(a){return a.disabled===!0},checked:function(a){return a.checked===!0},selected:function(a){a.parentNode&&a.parentNode.selectedIndex;return a.selected===!0},parent:function(a){return!!a.firstChild},empty:function(a){return!a.firstChild},has:function(a,b,c){return!!m(c[3],a).length},header:function(a){return/h\d/i.test(a.nodeName)},text:function(a){var b=a.getAttribute("type"),c=a.type;return a.nodeName.toLowerCase()==="input"&&"text"===c&&(b===c||b===null)},radio:function(a){return a.nodeName.toLowerCase()==="input"&&"radio"===a.type},checkbox:function(a){return a.nodeName.toLowerCase()==="input"&&"checkbox"===a.type},file:function(a){return a.nodeName.toLowerCase()==="input"&&"file"===a.type},password:function(a){return a.nodeName.toLowerCase()==="input"&&"password"===a.type},submit:function(a){var b=a.nodeName.toLowerCase();return(b==="input"||b==="button")&&"submit"===a.type},image:function(a){return a.nodeName.toLowerCase()==="input"&&"image"===a.type},reset:function(a){var b=a.nodeName.toLowerCase();return(b==="input"||b==="button")&&"reset"===a.type},button:function(a){var b=a.nodeName.toLowerCase();return b==="input"&&"button"===a.type||b==="button"},input:function(a){return/input|select|textarea|button/i.test(a.nodeName)},focus:function(a){return a===a.ownerDocument.activeElement}},setFilters:{first:function(a,b){return b===0},last:function(a,b,c,d){return b===d.length-1},even:function(a,b){return b%2===0},odd:function(a,b){return b%2===1},lt:function(a,b,c){return b<c[3]-0},gt:function(a,b,c){return b>c[3]-0},nth:function(a,b,c){return c[3]-0===b},eq:function(a,b,c){return c[3]-0===b}},filter:{PSEUDO:function(a,b,c,d){var e=b[1],f=o.filters[e];if(f)return f(a,c,b,d);if(e==="contains")return(a.textContent||a.innerText||n([a])||"").indexOf(b[3])>=0;if(e==="not"){var g=b[3];for(var h=0,i=g.length;h<i;h++)if(g[h]===a)return!1;return!0}m.error(e)},CHILD:function(a,b){var c,e,f,g,h,i,j,k=b[1],l=a;switch(k){case"only":case"first":while(l=l.previousSibling)if(l.nodeType===1)return!1;if(k==="first")return!0;l=a;case"last":while(l=l.nextSibling)if(l.nodeType===1)return!1;return!0;case"nth":c=b[2],e=b[3];if(c===1&&e===0)return!0;f=b[0],g=a.parentNode;if(g&&(g[d]!==f||!a.nodeIndex)){i=0;for(l=g.firstChild;l;l=l.nextSibling)l.nodeType===1&&(l.nodeIndex=++i);g[d]=f}j=a.nodeIndex-e;return c===0?j===0:j%c===0&&j/c>=0}},ID:function(a,b){return a.nodeType===1&&a.getAttribute("id")===b},TAG:function(a,b){return b==="*"&&a.nodeType===1||!!a.nodeName&&a.nodeName.toLowerCase()===b},CLASS:function(a,b){return(" "+(a.className||a.getAttribute("class"))+" ").indexOf(b)>-1},ATTR:function(a,b){var c=b[1],d=m.attr?m.attr(a,c):o.attrHandle[c]?o.attrHandle[c](a):a[c]!=null?a[c]:a.getAttribute(c),e=d+"",f=b[2],g=b[4];return d==null?f==="!=":!f&&m.attr?d!=null:f==="="?e===g:f==="*="?e.indexOf(g)>=0:f==="~="?(" "+e+" ").indexOf(g)>=0:g?f==="!="?e!==g:f==="^="?e.indexOf(g)===0:f==="$="?e.substr(e.length-g.length)===g:f==="|="?e===g||e.substr(0,g.length+1)===g+"-":!1:e&&d!==!1},POS:function(a,b,c,d){var e=b[2],f=o.setFilters[e];if(f)return f(a,c,b,d)}}},p=o.match.POS,q=function(a,b){return"\\"+(b-0+1)};for(var r in o.match)o.match[r]=new RegExp(o.match[r].source+/(?![^\[]*\])(?![^\(]*\))/.source),o.leftMatch[r]=new RegExp(/(^(?:.|\r|\n)*?)/.source+o.match[r].source.replace(/\\(\d+)/g,q));o.match.globalPOS=p;var s=function(a,b){a=Array.prototype.slice.call(a,0);if(b){b.push.apply(b,a);return b}return a};try{Array.prototype.slice.call(c.documentElement.childNodes,0)[0].nodeType}catch(t){s=function(a,b){var c=0,d=b||[];if(g.call(a)==="[object Array]")Array.prototype.push.apply(d,a);else if(typeof a.length=="number")for(var e=a.length;c<e;c++)d.push(a[c]);else for(;a[c];c++)d.push(a[c]);return d}}var u,v;c.documentElement.compareDocumentPosition?u=function(a,b){if(a===b){h=!0;return 0}if(!a.compareDocumentPosition||!b.compareDocumentPosition)return a.compareDocumentPosition?-1:1;return a.compareDocumentPosition(b)&4?-1:1}:(u=function(a,b){if(a===b){h=!0;return 0}if(a.sourceIndex&&b.sourceIndex)return a.sourceIndex-b.sourceIndex;var c,d,e=[],f=[],g=a.parentNode,i=b.parentNode,j=g;if(g===i)return v(a,b);if(!g)return-1;if(!i)return 1;while(j)e.unshift(j),j=j.parentNode;j=i;while(j)f.unshift(j),j=j.parentNode;c=e.length,d=f.length;for(var k=0;k<c&&k<d;k++)if(e[k]!==f[k])return v(e[k],f[k]);return k===c?v(a,f[k],-1):v(e[k],b,1)},v=function(a,b,c){if(a===b)return c;var d=a.nextSibling;while(d){if(d===b)return-1;d=d.nextSibling}return 1}),function(){var a=c.createElement("div"),d="script"+(new Date).getTime(),e=c.documentElement;a.innerHTML="<a name='"+d+"'/>",e.insertBefore(a,e.firstChild),c.getElementById(d)&&(o.find.ID=function(a,c,d){if(typeof c.getElementById!="undefined"&&!d){var e=c.getElementById(a[1]);return e?e.id===a[1]||typeof e.getAttributeNode!="undefined"&&e.getAttributeNode("id").nodeValue===a[1]?[e]:b:[]}},o.filter.ID=function(a,b){var c=typeof a.getAttributeNode!="undefined"&&a.getAttributeNode("id");return a.nodeType===1&&c&&c.nodeValue===b}),e.removeChild(a),e=a=null}(),function(){var a=c.createElement("div");a.appendChild(c.createComment("")),a.getElementsByTagName("*").length>0&&(o.find.TAG=function(a,b){var c=b.getElementsByTagName(a[1]);if(a[1]==="*"){var d=[];for(var e=0;c[e];e++)c[e].nodeType===1&&d.push(c[e]);c=d}return c}),a.innerHTML="<a href='#'></a>",a.firstChild&&typeof a.firstChild.getAttribute!="undefined"&&a.firstChild.getAttribute("href")!=="#"&&(o.attrHandle.href=function(a){return a.getAttribute("href",2)}),a=null}(),c.querySelectorAll&&function(){var a=m,b=c.createElement("div"),d="__sizzle__";b.innerHTML="<p class='TEST'></p>";if(!b.querySelectorAll||b.querySelectorAll(".TEST").length!==0){m=function(b,e,f,g){e=e||c;if(!g&&!m.isXML(e)){var h=/^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec(b);if(h&&(e.nodeType===1||e.nodeType===9)){if(h[1])return s(e.getElementsByTagName(b),f);if(h[2]&&o.find.CLASS&&e.getElementsByClassName)return s(e.getElementsByClassName(h[2]),f)}if(e.nodeType===9){if(b==="body"&&e.body)return s([e.body],f);if(h&&h[3]){var i=e.getElementById(h[3]);if(!i||!i.parentNode)return s([],f);if(i.id===h[3])return s([i],f)}try{return s(e.querySelectorAll(b),f)}catch(j){}}else if(e.nodeType===1&&e.nodeName.toLowerCase()!=="object"){var k=e,l=e.getAttribute("id"),n=l||d,p=e.parentNode,q=/^\s*[+~]/.test(b);l?n=n.replace(/'/g,"\\$&"):e.setAttribute("id",n),q&&p&&(e=e.parentNode);try{if(!q||p)return s(e.querySelectorAll("[id='"+n+"'] "+b),f)}catch(r){}finally{l||k.removeAttribute("id")}}}return a(b,e,f,g)};for(var e in a)m[e]=a[e];b=null}}(),function(){var a=c.documentElement,b=a.matchesSelector||a.mozMatchesSelector||a.webkitMatchesSelector||a.msMatchesSelector;if(b){var d=!b.call(c.createElement("div"),"div"),e=!1;try{b.call(c.documentElement,"[test!='']:sizzle")}catch(f){e=!0}m.matchesSelector=function(a,c){c=c.replace(/\=\s*([^'"\]]*)\s*\]/g,"='$1']");if(!m.isXML(a))try{if(e||!o.match.PSEUDO.test(c)&&!/!=/.test(c)){var f=b.call(a,c);if(f||!d||a.document&&a.document.nodeType!==11)return f}}catch(g){}return m(c,null,null,[a]).length>0}}}(),function(){var a=c.createElement("div");a.innerHTML="<div class='test e'></div><div class='test'></div>";if(!!a.getElementsByClassName&&a.getElementsByClassName("e").length!==0){a.lastChild.className="e";if(a.getElementsByClassName("e").length===1)return;o.order.splice(1,0,"CLASS"),o.find.CLASS=function(a,b,c){if(typeof b.getElementsByClassName!="undefined"&&!c)return b.getElementsByClassName(a[1])},a=null}}(),c.documentElement.contains?m.contains=function(a,b){return a!==b&&(a.contains?a.contains(b):!0)}:c.documentElement.compareDocumentPosition?m.contains=function(a,b){return!!(a.compareDocumentPosition(b)&16)}:m.contains=function(){return!1},m.isXML=function(a){var b=(a?a.ownerDocument||a:0).documentElement;return b?b.nodeName!=="HTML":!1};var y=function(a,b,c){var d,e=[],f="",g=b.nodeType?[b]:b;while(d=o.match.PSEUDO.exec(a))f+=d[0],a=a.replace(o.match.PSEUDO,"");a=o.relative[a]?a+"*":a;for(var h=0,i=g.length;h<i;h++)m(a,g[h],e,c);return m.filter(f,e)};m.attr=f.attr,m.selectors.attrMap={},f.find=m,f.expr=m.selectors,f.expr[":"]=f.expr.filters,f.unique=m.uniqueSort,f.text=m.getText,f.isXMLDoc=m.isXML,f.contains=m.contains}();var L=/Until$/,M=/^(?:parents|prevUntil|prevAll)/,N=/,/,O=/^.[^:#\[\.,]*$/,P=Array.prototype.slice,Q=f.expr.match.globalPOS,R={children:!0,contents:!0,next:!0,prev:!0};f.fn.extend({find:function(a){var b=this,c,d;if(typeof a!="string")return f(a).filter(function(){for(c=0,d=b.length;c<d;c++)if(f.contains(b[c],this))return!0});var e=this.pushStack("","find",a),g,h,i;for(c=0,d=this.length;c<d;c++){g=e.length,f.find(a,this[c],e);if(c>0)for(h=g;h<e.length;h++)for(i=0;i<g;i++)if(e[i]===e[h]){e.splice(h--,1);break}}return e},has:function(a){var b=f(a);return this.filter(function(){for(var a=0,c=b.length;a<c;a++)if(f.contains(this,b[a]))return!0})},not:function(a){return this.pushStack(T(this,a,!1),"not",a)},filter:function(a){return this.pushStack(T(this,a,!0),"filter",a)},is:function(a){return!!a&&(typeof a=="string"?Q.test(a)?f(a,this.context).index(this[0])>=0:f.filter(a,this).length>0:this.filter(a).length>0)},closest:function(a,b){var c=[],d,e,g=this[0];if(f.isArray(a)){var h=1;while(g&&g.ownerDocument&&g!==b){for(d=0;d<a.length;d++)f(g).is(a[d])&&c.push({selector:a[d],elem:g,level:h});g=g.parentNode,h++}return c}var i=Q.test(a)||typeof a!="string"?f(a,b||this.context):0;for(d=0,e=this.length;d<e;d++){g=this[d];while(g){if(i?i.index(g)>-1:f.find.matchesSelector(g,a)){c.push(g);break}g=g.parentNode;if(!g||!g.ownerDocument||g===b||g.nodeType===11)break}}c=c.length>1?f.unique(c):c;return this.pushStack(c,"closest",a)},index:function(a){if(!a)return this[0]&&this[0].parentNode?this.prevAll().length:-1;if(typeof a=="string")return f.inArray(this[0],f(a));return f.inArray(a.jquery?a[0]:a,this)},add:function(a,b){var c=typeof a=="string"?f(a,b):f.makeArray(a&&a.nodeType?[a]:a),d=f.merge(this.get(),c);return this.pushStack(S(c[0])||S(d[0])?d:f.unique(d))},andSelf:function(){return this.add(this.prevObject)}}),f.each({parent:function(a){var b=a.parentNode;return b&&b.nodeType!==11?b:null},parents:function(a){return f.dir(a,"parentNode")},parentsUntil:function(a,b,c){return f.dir(a,"parentNode",c)},next:function(a){return f.nth(a,2,"nextSibling")},prev:function(a){return f.nth(a,2,"previousSibling")},nextAll:function(a){return f.dir(a,"nextSibling")},prevAll:function(a){return f.dir(a,"previousSibling")},nextUntil:function(a,b,c){return f.dir(a,"nextSibling",c)},prevUntil:function(a,b,c){return f.dir(a,"previousSibling",c)},siblings:function(a){return f.sibling((a.parentNode||{}).firstChild,a)},children:function(a){return f.sibling(a.firstChild)},contents:function(a){return f.nodeName(a,"iframe")?a.contentDocument||a.contentWindow.document:f.makeArray(a.childNodes)}},function(a,b){f.fn[a]=function(c,d){var e=f.map(this,b,c);L.test(a)||(d=c),d&&typeof d=="string"&&(e=f.filter(d,e)),e=this.length>1&&!R[a]?f.unique(e):e,(this.length>1||N.test(d))&&M.test(a)&&(e=e.reverse());return this.pushStack(e,a,P.call(arguments).join(","))}}),f.extend({filter:function(a,b,c){c&&(a=":not("+a+")");return b.length===1?f.find.matchesSelector(b[0],a)?[b[0]]:[]:f.find.matches(a,b)},dir:function(a,c,d){var e=[],g=a[c];while(g&&g.nodeType!==9&&(d===b||g.nodeType!==1||!f(g).is(d)))g.nodeType===1&&e.push(g),g=g[c];return e},nth:function(a,b,c,d){b=b||1;var e=0;for(;a;a=a[c])if(a.nodeType===1&&++e===b)break;return a},sibling:function(a,b){var c=[];for(;a;a=a.nextSibling)a.nodeType===1&&a!==b&&c.push(a);return c}});var V="abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",W=/ jQuery\d+="(?:\d+|null)"/g,X=/^\s+/,Y=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,Z=/<([\w:]+)/,$=/<tbody/i,_=/<|&#?\w+;/,ba=/<(?:script|style)/i,bb=/<(?:script|object|embed|option|style)/i,bc=new RegExp("<(?:"+V+")[\\s/>]","i"),bd=/checked\s*(?:[^=]|=\s*.checked.)/i,be=/\/(java|ecma)script/i,bf=/^\s*<!(?:\[CDATA\[|\-\-)/,bg={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],area:[1,"<map>","</map>"],_default:[0,"",""]},bh=U(c);bg.optgroup=bg.option,bg.tbody=bg.tfoot=bg.colgroup=bg.caption=bg.thead,bg.th=bg.td,f.support.htmlSerialize||(bg._default=[1,"div<div>","</div>"]),f.fn.extend({text:function(a){return f.access(this,function(a){return a===b?f.text(this):this.empty().append((this[0]&&this[0].ownerDocument||c).createTextNode(a))},null,a,arguments.length)},wrapAll:function(a){if(f.isFunction(a))return this.each(function(b){f(this).wrapAll(a.call(this,b))});if(this[0]){var b=f(a,this[0].ownerDocument).eq(0).clone(!0);this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstChild&&a.firstChild.nodeType===1)a=a.firstChild;return a}).append(this)}return this},wrapInner:function(a){if(f.isFunction(a))return this.each(function(b){f(this).wrapInner(a.call(this,b))});return this.each(function(){var b=f(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=f.isFunction(a);return this.each(function(c){f(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(){return this.parent().each(function(){f.nodeName(this,"body")||f(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,!0,function(a){this.nodeType===1&&this.appendChild(a)})},prepend:function(){return this.domManip(arguments,!0,function(a){this.nodeType===1&&this.insertBefore(a,this.firstChild)})},before:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this)});if(arguments.length){var a=f
.clean(arguments);a.push.apply(a,this.toArray());return this.pushStack(a,"before",arguments)}},after:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this.nextSibling)});if(arguments.length){var a=this.pushStack(this,"after",arguments);a.push.apply(a,f.clean(arguments));return a}},remove:function(a,b){for(var c=0,d;(d=this[c])!=null;c++)if(!a||f.filter(a,[d]).length)!b&&d.nodeType===1&&(f.cleanData(d.getElementsByTagName("*")),f.cleanData([d])),d.parentNode&&d.parentNode.removeChild(d);return this},empty:function(){for(var a=0,b;(b=this[a])!=null;a++){b.nodeType===1&&f.cleanData(b.getElementsByTagName("*"));while(b.firstChild)b.removeChild(b.firstChild)}return this},clone:function(a,b){a=a==null?!1:a,b=b==null?a:b;return this.map(function(){return f.clone(this,a,b)})},html:function(a){return f.access(this,function(a){var c=this[0]||{},d=0,e=this.length;if(a===b)return c.nodeType===1?c.innerHTML.replace(W,""):null;if(typeof a=="string"&&!ba.test(a)&&(f.support.leadingWhitespace||!X.test(a))&&!bg[(Z.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(Y,"<$1></$2>");try{for(;d<e;d++)c=this[d]||{},c.nodeType===1&&(f.cleanData(c.getElementsByTagName("*")),c.innerHTML=a);c=0}catch(g){}}c&&this.empty().append(a)},null,a,arguments.length)},replaceWith:function(a){if(this[0]&&this[0].parentNode){if(f.isFunction(a))return this.each(function(b){var c=f(this),d=c.html();c.replaceWith(a.call(this,b,d))});typeof a!="string"&&(a=f(a).detach());return this.each(function(){var b=this.nextSibling,c=this.parentNode;f(this).remove(),b?f(b).before(a):f(c).append(a)})}return this.length?this.pushStack(f(f.isFunction(a)?a():a),"replaceWith",a):this},detach:function(a){return this.remove(a,!0)},domManip:function(a,c,d){var e,g,h,i,j=a[0],k=[];if(!f.support.checkClone&&arguments.length===3&&typeof j=="string"&&bd.test(j))return this.each(function(){f(this).domManip(a,c,d,!0)});if(f.isFunction(j))return this.each(function(e){var g=f(this);a[0]=j.call(this,e,c?g.html():b),g.domManip(a,c,d)});if(this[0]){i=j&&j.parentNode,f.support.parentNode&&i&&i.nodeType===11&&i.childNodes.length===this.length?e={fragment:i}:e=f.buildFragment(a,this,k),h=e.fragment,h.childNodes.length===1?g=h=h.firstChild:g=h.firstChild;if(g){c=c&&f.nodeName(g,"tr");for(var l=0,m=this.length,n=m-1;l<m;l++)d.call(c?bi(this[l],g):this[l],e.cacheable||m>1&&l<n?f.clone(h,!0,!0):h)}k.length&&f.each(k,function(a,b){b.src?f.ajax({type:"GET",global:!1,url:b.src,async:!1,dataType:"script"}):f.globalEval((b.text||b.textContent||b.innerHTML||"").replace(bf,"/*$0*/")),b.parentNode&&b.parentNode.removeChild(b)})}return this}}),f.buildFragment=function(a,b,d){var e,g,h,i,j=a[0];b&&b[0]&&(i=b[0].ownerDocument||b[0]),i.createDocumentFragment||(i=c),a.length===1&&typeof j=="string"&&j.length<512&&i===c&&j.charAt(0)==="<"&&!bb.test(j)&&(f.support.checkClone||!bd.test(j))&&(f.support.html5Clone||!bc.test(j))&&(g=!0,h=f.fragments[j],h&&h!==1&&(e=h)),e||(e=i.createDocumentFragment(),f.clean(a,i,e,d)),g&&(f.fragments[j]=h?e:1);return{fragment:e,cacheable:g}},f.fragments={},f.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){f.fn[a]=function(c){var d=[],e=f(c),g=this.length===1&&this[0].parentNode;if(g&&g.nodeType===11&&g.childNodes.length===1&&e.length===1){e[b](this[0]);return this}for(var h=0,i=e.length;h<i;h++){var j=(h>0?this.clone(!0):this).get();f(e[h])[b](j),d=d.concat(j)}return this.pushStack(d,a,e.selector)}}),f.extend({clone:function(a,b,c){var d,e,g,h=f.support.html5Clone||f.isXMLDoc(a)||!bc.test("<"+a.nodeName+">")?a.cloneNode(!0):bo(a);if((!f.support.noCloneEvent||!f.support.noCloneChecked)&&(a.nodeType===1||a.nodeType===11)&&!f.isXMLDoc(a)){bk(a,h),d=bl(a),e=bl(h);for(g=0;d[g];++g)e[g]&&bk(d[g],e[g])}if(b){bj(a,h);if(c){d=bl(a),e=bl(h);for(g=0;d[g];++g)bj(d[g],e[g])}}d=e=null;return h},clean:function(a,b,d,e){var g,h,i,j=[];b=b||c,typeof b.createElement=="undefined"&&(b=b.ownerDocument||b[0]&&b[0].ownerDocument||c);for(var k=0,l;(l=a[k])!=null;k++){typeof l=="number"&&(l+="");if(!l)continue;if(typeof l=="string")if(!_.test(l))l=b.createTextNode(l);else{l=l.replace(Y,"<$1></$2>");var m=(Z.exec(l)||["",""])[1].toLowerCase(),n=bg[m]||bg._default,o=n[0],p=b.createElement("div"),q=bh.childNodes,r;b===c?bh.appendChild(p):U(b).appendChild(p),p.innerHTML=n[1]+l+n[2];while(o--)p=p.lastChild;if(!f.support.tbody){var s=$.test(l),t=m==="table"&&!s?p.firstChild&&p.firstChild.childNodes:n[1]==="<table>"&&!s?p.childNodes:[];for(i=t.length-1;i>=0;--i)f.nodeName(t[i],"tbody")&&!t[i].childNodes.length&&t[i].parentNode.removeChild(t[i])}!f.support.leadingWhitespace&&X.test(l)&&p.insertBefore(b.createTextNode(X.exec(l)[0]),p.firstChild),l=p.childNodes,p&&(p.parentNode.removeChild(p),q.length>0&&(r=q[q.length-1],r&&r.parentNode&&r.parentNode.removeChild(r)))}var u;if(!f.support.appendChecked)if(l[0]&&typeof (u=l.length)=="number")for(i=0;i<u;i++)bn(l[i]);else bn(l);l.nodeType?j.push(l):j=f.merge(j,l)}if(d){g=function(a){return!a.type||be.test(a.type)};for(k=0;j[k];k++){h=j[k];if(e&&f.nodeName(h,"script")&&(!h.type||be.test(h.type)))e.push(h.parentNode?h.parentNode.removeChild(h):h);else{if(h.nodeType===1){var v=f.grep(h.getElementsByTagName("script"),g);j.splice.apply(j,[k+1,0].concat(v))}d.appendChild(h)}}}return j},cleanData:function(a){var b,c,d=f.cache,e=f.event.special,g=f.support.deleteExpando;for(var h=0,i;(i=a[h])!=null;h++){if(i.nodeName&&f.noData[i.nodeName.toLowerCase()])continue;c=i[f.expando];if(c){b=d[c];if(b&&b.events){for(var j in b.events)e[j]?f.event.remove(i,j):f.removeEvent(i,j,b.handle);b.handle&&(b.handle.elem=null)}g?delete i[f.expando]:i.removeAttribute&&i.removeAttribute(f.expando),delete d[c]}}}});var bp=/alpha\([^)]*\)/i,bq=/opacity=([^)]*)/,br=/([A-Z]|^ms)/g,bs=/^[\-+]?(?:\d*\.)?\d+$/i,bt=/^-?(?:\d*\.)?\d+(?!px)[^\d\s]+$/i,bu=/^([\-+])=([\-+.\de]+)/,bv=/^margin/,bw={position:"absolute",visibility:"hidden",display:"block"},bx=["Top","Right","Bottom","Left"],by,bz,bA;f.fn.css=function(a,c){return f.access(this,function(a,c,d){return d!==b?f.style(a,c,d):f.css(a,c)},a,c,arguments.length>1)},f.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=by(a,"opacity");return c===""?"1":c}return a.style.opacity}}},cssNumber:{fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":f.support.cssFloat?"cssFloat":"styleFloat"},style:function(a,c,d,e){if(!!a&&a.nodeType!==3&&a.nodeType!==8&&!!a.style){var g,h,i=f.camelCase(c),j=a.style,k=f.cssHooks[i];c=f.cssProps[i]||i;if(d===b){if(k&&"get"in k&&(g=k.get(a,!1,e))!==b)return g;return j[c]}h=typeof d,h==="string"&&(g=bu.exec(d))&&(d=+(g[1]+1)*+g[2]+parseFloat(f.css(a,c)),h="number");if(d==null||h==="number"&&isNaN(d))return;h==="number"&&!f.cssNumber[i]&&(d+="px");if(!k||!("set"in k)||(d=k.set(a,d))!==b)try{j[c]=d}catch(l){}}},css:function(a,c,d){var e,g;c=f.camelCase(c),g=f.cssHooks[c],c=f.cssProps[c]||c,c==="cssFloat"&&(c="float");if(g&&"get"in g&&(e=g.get(a,!0,d))!==b)return e;if(by)return by(a,c)},swap:function(a,b,c){var d={},e,f;for(f in b)d[f]=a.style[f],a.style[f]=b[f];e=c.call(a);for(f in b)a.style[f]=d[f];return e}}),f.curCSS=f.css,c.defaultView&&c.defaultView.getComputedStyle&&(bz=function(a,b){var c,d,e,g,h=a.style;b=b.replace(br,"-$1").toLowerCase(),(d=a.ownerDocument.defaultView)&&(e=d.getComputedStyle(a,null))&&(c=e.getPropertyValue(b),c===""&&!f.contains(a.ownerDocument.documentElement,a)&&(c=f.style(a,b))),!f.support.pixelMargin&&e&&bv.test(b)&&bt.test(c)&&(g=h.width,h.width=c,c=e.width,h.width=g);return c}),c.documentElement.currentStyle&&(bA=function(a,b){var c,d,e,f=a.currentStyle&&a.currentStyle[b],g=a.style;f==null&&g&&(e=g[b])&&(f=e),bt.test(f)&&(c=g.left,d=a.runtimeStyle&&a.runtimeStyle.left,d&&(a.runtimeStyle.left=a.currentStyle.left),g.left=b==="fontSize"?"1em":f,f=g.pixelLeft+"px",g.left=c,d&&(a.runtimeStyle.left=d));return f===""?"auto":f}),by=bz||bA,f.each(["height","width"],function(a,b){f.cssHooks[b]={get:function(a,c,d){if(c)return a.offsetWidth!==0?bB(a,b,d):f.swap(a,bw,function(){return bB(a,b,d)})},set:function(a,b){return bs.test(b)?b+"px":b}}}),f.support.opacity||(f.cssHooks.opacity={get:function(a,b){return bq.test((b&&a.currentStyle?a.currentStyle.filter:a.style.filter)||"")?parseFloat(RegExp.$1)/100+"":b?"1":""},set:function(a,b){var c=a.style,d=a.currentStyle,e=f.isNumeric(b)?"alpha(opacity="+b*100+")":"",g=d&&d.filter||c.filter||"";c.zoom=1;if(b>=1&&f.trim(g.replace(bp,""))===""){c.removeAttribute("filter");if(d&&!d.filter)return}c.filter=bp.test(g)?g.replace(bp,e):g+" "+e}}),f(function(){f.support.reliableMarginRight||(f.cssHooks.marginRight={get:function(a,b){return f.swap(a,{display:"inline-block"},function(){return b?by(a,"margin-right"):a.style.marginRight})}})}),f.expr&&f.expr.filters&&(f.expr.filters.hidden=function(a){var b=a.offsetWidth,c=a.offsetHeight;return b===0&&c===0||!f.support.reliableHiddenOffsets&&(a.style&&a.style.display||f.css(a,"display"))==="none"},f.expr.filters.visible=function(a){return!f.expr.filters.hidden(a)}),f.each({margin:"",padding:"",border:"Width"},function(a,b){f.cssHooks[a+b]={expand:function(c){var d,e=typeof c=="string"?c.split(" "):[c],f={};for(d=0;d<4;d++)f[a+bx[d]+b]=e[d]||e[d-2]||e[0];return f}}});var bC=/%20/g,bD=/\[\]$/,bE=/\r?\n/g,bF=/#.*$/,bG=/^(.*?):[ \t]*([^\r\n]*)\r?$/mg,bH=/^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,bI=/^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,bJ=/^(?:GET|HEAD)$/,bK=/^\/\//,bL=/\?/,bM=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,bN=/^(?:select|textarea)/i,bO=/\s+/,bP=/([?&])_=[^&]*/,bQ=/^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/,bR=f.fn.load,bS={},bT={},bU,bV,bW=["*/"]+["*"];try{bU=e.href}catch(bX){bU=c.createElement("a"),bU.href="",bU=bU.href}bV=bQ.exec(bU.toLowerCase())||[],f.fn.extend({load:function(a,c,d){if(typeof a!="string"&&bR)return bR.apply(this,arguments);if(!this.length)return this;var e=a.indexOf(" ");if(e>=0){var g=a.slice(e,a.length);a=a.slice(0,e)}var h="GET";c&&(f.isFunction(c)?(d=c,c=b):typeof c=="object"&&(c=f.param(c,f.ajaxSettings.traditional),h="POST"));var i=this;f.ajax({url:a,type:h,dataType:"html",data:c,complete:function(a,b,c){c=a.responseText,a.isResolved()&&(a.done(function(a){c=a}),i.html(g?f("<div>").append(c.replace(bM,"")).find(g):c)),d&&i.each(d,[c,b,a])}});return this},serialize:function(){return f.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?f.makeArray(this.elements):this}).filter(function(){return this.name&&!this.disabled&&(this.checked||bN.test(this.nodeName)||bH.test(this.type))}).map(function(a,b){var c=f(this).val();return c==null?null:f.isArray(c)?f.map(c,function(a,c){return{name:b.name,value:a.replace(bE,"\r\n")}}):{name:b.name,value:c.replace(bE,"\r\n")}}).get()}}),f.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),function(a,b){f.fn[b]=function(a){return this.on(b,a)}}),f.each(["get","post"],function(a,c){f[c]=function(a,d,e,g){f.isFunction(d)&&(g=g||e,e=d,d=b);return f.ajax({type:c,url:a,data:d,success:e,dataType:g})}}),f.extend({getScript:function(a,c){return f.get(a,b,c,"script")},getJSON:function(a,b,c){return f.get(a,b,c,"json")},ajaxSetup:function(a,b){b?b$(a,f.ajaxSettings):(b=a,a=f.ajaxSettings),b$(a,b);return a},ajaxSettings:{url:bU,isLocal:bI.test(bV[1]),global:!0,type:"GET",contentType:"application/x-www-form-urlencoded; charset=UTF-8",processData:!0,async:!0,accepts:{xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript","*":bW},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText"},converters:{"* text":a.String,"text html":!0,"text json":f.parseJSON,"text xml":f.parseXML},flatOptions:{context:!0,url:!0}},ajaxPrefilter:bY(bS),ajaxTransport:bY(bT),ajax:function(a,c){function w(a,c,l,m){if(s!==2){s=2,q&&clearTimeout(q),p=b,n=m||"",v.readyState=a>0?4:0;var o,r,u,w=c,x=l?ca(d,v,l):b,y,z;if(a>=200&&a<300||a===304){if(d.ifModified){if(y=v.getResponseHeader("Last-Modified"))f.lastModified[k]=y;if(z=v.getResponseHeader("Etag"))f.etag[k]=z}if(a===304)w="notmodified",o=!0;else try{r=cb(d,x),w="success",o=!0}catch(A){w="parsererror",u=A}}else{u=w;if(!w||a)w="error",a<0&&(a=0)}v.status=a,v.statusText=""+(c||w),o?h.resolveWith(e,[r,w,v]):h.rejectWith(e,[v,w,u]),v.statusCode(j),j=b,t&&g.trigger("ajax"+(o?"Success":"Error"),[v,d,o?r:u]),i.fireWith(e,[v,w]),t&&(g.trigger("ajaxComplete",[v,d]),--f.active||f.event.trigger("ajaxStop"))}}typeof a=="object"&&(c=a,a=b),c=c||{};var d=f.ajaxSetup({},c),e=d.context||d,g=e!==d&&(e.nodeType||e instanceof f)?f(e):f.event,h=f.Deferred(),i=f.Callbacks("once memory"),j=d.statusCode||{},k,l={},m={},n,o,p,q,r,s=0,t,u,v={readyState:0,setRequestHeader:function(a,b){if(!s){var c=a.toLowerCase();a=m[c]=m[c]||a,l[a]=b}return this},getAllResponseHeaders:function(){return s===2?n:null},getResponseHeader:function(a){var c;if(s===2){if(!o){o={};while(c=bG.exec(n))o[c[1].toLowerCase()]=c[2]}c=o[a.toLowerCase()]}return c===b?null:c},overrideMimeType:function(a){s||(d.mimeType=a);return this},abort:function(a){a=a||"abort",p&&p.abort(a),w(0,a);return this}};h.promise(v),v.success=v.done,v.error=v.fail,v.complete=i.add,v.statusCode=function(a){if(a){var b;if(s<2)for(b in a)j[b]=[j[b],a[b]];else b=a[v.status],v.then(b,b)}return this},d.url=((a||d.url)+"").replace(bF,"").replace(bK,bV[1]+"//"),d.dataTypes=f.trim(d.dataType||"*").toLowerCase().split(bO),d.crossDomain==null&&(r=bQ.exec(d.url.toLowerCase()),d.crossDomain=!(!r||r[1]==bV[1]&&r[2]==bV[2]&&(r[3]||(r[1]==="http:"?80:443))==(bV[3]||(bV[1]==="http:"?80:443)))),d.data&&d.processData&&typeof d.data!="string"&&(d.data=f.param(d.data,d.traditional)),bZ(bS,d,c,v);if(s===2)return!1;t=d.global,d.type=d.type.toUpperCase(),d.hasContent=!bJ.test(d.type),t&&f.active++===0&&f.event.trigger("ajaxStart");if(!d.hasContent){d.data&&(d.url+=(bL.test(d.url)?"&":"?")+d.data,delete d.data),k=d.url;if(d.cache===!1){var x=f.now(),y=d.url.replace(bP,"$1_="+x);d.url=y+(y===d.url?(bL.test(d.url)?"&":"?")+"_="+x:"")}}(d.data&&d.hasContent&&d.contentType!==!1||c.contentType)&&v.setRequestHeader("Content-Type",d.contentType),d.ifModified&&(k=k||d.url,f.lastModified[k]&&v.setRequestHeader("If-Modified-Since",f.lastModified[k]),f.etag[k]&&v.setRequestHeader("If-None-Match",f.etag[k])),v.setRequestHeader("Accept",d.dataTypes[0]&&d.accepts[d.dataTypes[0]]?d.accepts[d.dataTypes[0]]+(d.dataTypes[0]!=="*"?", "+bW+"; q=0.01":""):d.accepts["*"]);for(u in d.headers)v.setRequestHeader(u,d.headers[u]);if(d.beforeSend&&(d.beforeSend.call(e,v,d)===!1||s===2)){v.abort();return!1}for(u in{success:1,error:1,complete:1})v[u](d[u]);p=bZ(bT,d,c,v);if(!p)w(-1,"No Transport");else{v.readyState=1,t&&g.trigger("ajaxSend",[v,d]),d.async&&d.timeout>0&&(q=setTimeout(function(){v.abort("timeout")},d.timeout));try{s=1,p.send(l,w)}catch(z){if(s<2)w(-1,z);else throw z}}return v},param:function(a,c){var d=[],e=function(a,b){b=f.isFunction(b)?b():b,d[d.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)};c===b&&(c=f.ajaxSettings.traditional);if(f.isArray(a)||a.jquery&&!f.isPlainObject(a))f.each(a,function(){e(this.name,this.value)});else for(var g in a)b_(g,a[g],c,e);return d.join("&").replace(bC,"+")}}),f.extend({active:0,lastModified:{},etag:{}});var cc=f.now(),cd=/(\=)\?(&|$)|\?\?/i;f.ajaxSetup({jsonp:"callback",jsonpCallback:function(){return f.expando+"_"+cc++}}),f.ajaxPrefilter("json jsonp",function(b,c,d){var e=typeof b.data=="string"&&/^application\/x\-www\-form\-urlencoded/.test(b.contentType);if(b.dataTypes[0]==="jsonp"||b.jsonp!==!1&&(cd.test(b.url)||e&&cd.test(b.data))){var g,h=b.jsonpCallback=f.isFunction(b.jsonpCallback)?b.jsonpCallback():b.jsonpCallback,i=a[h],j=b.url,k=b.data,l="$1"+h+"$2";b.jsonp!==!1&&(j=j.replace(cd,l),b.url===j&&(e&&(k=k.replace(cd,l)),b.data===k&&(j+=(/\?/.test(j)?"&":"?")+b.jsonp+"="+h))),b.url=j,b.data=k,a[h]=function(a){g=[a]},d.always(function(){a[h]=i,g&&f.isFunction(i)&&a[h](g[0])}),b.converters["script json"]=function(){g||f.error(h+" was not called");return g[0]},b.dataTypes[0]="json";return"script"}}),f.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/javascript|ecmascript/},converters:{"text script":function(a){f.globalEval(a);return a}}}),f.ajaxPrefilter("script",function(a){a.cache===b&&(a.cache=!1),a.crossDomain&&(a.type="GET",a.global=!1)}),f.ajaxTransport("script",function(a){if(a.crossDomain){var d,e=c.head||c.getElementsByTagName("head")[0]||c.documentElement;return{send:function(f,g){d=c.createElement("script"),d.async="async",a.scriptCharset&&(d.charset=a.scriptCharset),d.src=a.url,d.onload=d.onreadystatechange=function(a,c){if(c||!d.readyState||/loaded|complete/.test(d.readyState))d.onload=d.onreadystatechange=null,e&&d.parentNode&&e.removeChild(d),d=b,c||g(200,"success")},e.insertBefore(d,e.firstChild)},abort:function(){d&&d.onload(0,1)}}}});var ce=a.ActiveXObject?function(){for(var a in cg)cg[a](0,1)}:!1,cf=0,cg;f.ajaxSettings.xhr=a.ActiveXObject?function(){return!this.isLocal&&ch()||ci()}:ch,function(a){f.extend(f.support,{ajax:!!a,cors:!!a&&"withCredentials"in a})}(f.ajaxSettings.xhr()),f.support.ajax&&f.ajaxTransport(function(c){if(!c.crossDomain||f.support.cors){var d;return{send:function(e,g){var h=c.xhr(),i,j;c.username?h.open(c.type,c.url,c.async,c.username,c.password):h.open(c.type,c.url,c.async);if(c.xhrFields)for(j in c.xhrFields)h[j]=c.xhrFields[j];c.mimeType&&h.overrideMimeType&&h.overrideMimeType(c.mimeType),!c.crossDomain&&!e["X-Requested-With"]&&(e["X-Requested-With"]="XMLHttpRequest");try{for(j in e)h.setRequestHeader(j,e[j])}catch(k){}h.send(c.hasContent&&c.data||null),d=function(a,e){var j,k,l,m,n;try{if(d&&(e||h.readyState===4)){d=b,i&&(h.onreadystatechange=f.noop,ce&&delete cg[i]);if(e)h.readyState!==4&&h.abort();else{j=h.status,l=h.getAllResponseHeaders(),m={},n=h.responseXML,n&&n.documentElement&&(m.xml=n);try{m.text=h.responseText}catch(a){}try{k=h.statusText}catch(o){k=""}!j&&c.isLocal&&!c.crossDomain?j=m.text?200:404:j===1223&&(j=204)}}}catch(p){e||g(-1,p)}m&&g(j,k,m,l)},!c.async||h.readyState===4?d():(i=++cf,ce&&(cg||(cg={},f(a).unload(ce)),cg[i]=d),h.onreadystatechange=d)},abort:function(){d&&d(0,1)}}}});var cj={},ck,cl,cm=/^(?:toggle|show|hide)$/,cn=/^([+\-]=)?([\d+.\-]+)([a-z%]*)$/i,co,cp=[["height","marginTop","marginBottom","paddingTop","paddingBottom"],["width","marginLeft","marginRight","paddingLeft","paddingRight"],["opacity"]],cq;f.fn.extend({show:function(a,b,c){var d,e;if(a||a===0)return this.animate(ct("show",3),a,b,c);for(var g=0,h=this.length;g<h;g++)d=this[g],d.style&&(e=d.style.display,!f._data(d,"olddisplay")&&e==="none"&&(e=d.style.display=""),(e===""&&f.css(d,"display")==="none"||!f.contains(d.ownerDocument.documentElement,d))&&f._data(d,"olddisplay",cu(d.nodeName)));for(g=0;g<h;g++){d=this[g];if(d.style){e=d.style.display;if(e===""||e==="none")d.style.display=f._data(d,"olddisplay")||""}}return this},hide:function(a,b,c){if(a||a===0)return this.animate(ct("hide",3),a,b,c);var d,e,g=0,h=this.length;for(;g<h;g++)d=this[g],d.style&&(e=f.css(d,"display"),e!=="none"&&!f._data(d,"olddisplay")&&f._data(d,"olddisplay",e));for(g=0;g<h;g++)this[g].style&&(this[g].style.display="none");return this},_toggle:f.fn.toggle,toggle:function(a,b,c){var d=typeof a=="boolean";f.isFunction(a)&&f.isFunction(b)?this._toggle.apply(this,arguments):a==null||d?this.each(function(){var b=d?a:f(this).is(":hidden");f(this)[b?"show":"hide"]()}):this.animate(ct("toggle",3),a,b,c);return this},fadeTo:function(a,b,c,d){return this.filter(":hidden").css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){function g(){e.queue===!1&&f._mark(this);var b=f.extend({},e),c=this.nodeType===1,d=c&&f(this).is(":hidden"),g,h,i,j,k,l,m,n,o,p,q;b.animatedProperties={};for(i in a){g=f.camelCase(i),i!==g&&(a[g]=a[i],delete a[i]);if((k=f.cssHooks[g])&&"expand"in k){l=k.expand(a[g]),delete a[g];for(i in l)i in a||(a[i]=l[i])}}for(g in a){h=a[g],f.isArray(h)?(b.animatedProperties[g]=h[1],h=a[g]=h[0]):b.animatedProperties[g]=b.specialEasing&&b.specialEasing[g]||b.easing||"swing";if(h==="hide"&&d||h==="show"&&!d)return b.complete.call(this);c&&(g==="height"||g==="width")&&(b.overflow=[this.style.overflow,this.style.overflowX,this.style.overflowY],f.css(this,"display")==="inline"&&f.css(this,"float")==="none"&&(!f.support.inlineBlockNeedsLayout||cu(this.nodeName)==="inline"?this.style.display="inline-block":this.style.zoom=1))}b.overflow!=null&&(this.style.overflow="hidden");for(i in a)j=new f.fx(this,b,i),h=a[i],cm.test(h)?(q=f._data(this,"toggle"+i)||(h==="toggle"?d?"show":"hide":0),q?(f._data(this,"toggle"+i,q==="show"?"hide":"show"),j[q]()):j[h]()):(m=cn.exec(h),n=j.cur(),m?(o=parseFloat(m[2]),p=m[3]||(f.cssNumber[i]?"":"px"),p!=="px"&&(f.style(this,i,(o||1)+p),n=(o||1)/j.cur()*n,f.style(this,i,n+p)),m[1]&&(o=(m[1]==="-="?-1:1)*o+n),j.custom(n,o,p)):j.custom(n,h,""));return!0}var e=f.speed(b,c,d);if(f.isEmptyObject(a))return this.each(e.complete,[!1]);a=f.extend({},a);return e.queue===!1?this.each(g):this.queue(e.queue,g)},stop:function(a,c,d){typeof a!="string"&&(d=c,c=a,a=b),c&&a!==!1&&this.queue(a||"fx",[]);return this.each(function(){function h(a,b,c){var e=b[c];f.removeData(a,c,!0),e.stop(d)}var b,c=!1,e=f.timers,g=f._data(this);d||f._unmark(!0,this);if(a==null)for(b in g)g[b]&&g[b].stop&&b.indexOf(".run")===b.length-4&&h(this,g,b);else g[b=a+".run"]&&g[b].stop&&h(this,g,b);for(b=e.length;b--;)e[b].elem===this&&(a==null||e[b].queue===a)&&(d?e[b](!0):e[b].saveState(),c=!0,e.splice(b,1));(!d||!c)&&f.dequeue(this,a)})}}),f.each({slideDown:ct("show",1),slideUp:ct("hide",1),slideToggle:ct("toggle",1),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){f.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),f.extend({speed:function(a,b,c){var d=a&&typeof a=="object"?f.extend({},a):{complete:c||!c&&b||f.isFunction(a)&&a,duration:a,easing:c&&b||b&&!f.isFunction(b)&&b};d.duration=f.fx.off?0:typeof d.duration=="number"?d.duration:d.duration in f.fx.speeds?f.fx.speeds[d.duration]:f.fx.speeds._default;if(d.queue==null||d.queue===!0)d.queue="fx";d.old=d.complete,d.complete=function(a){f.isFunction(d.old)&&d.old.call(this),d.queue?f.dequeue(this,d.queue):a!==!1&&f._unmark(this)};return d},easing:{linear:function(a){return a},swing:function(a){return-Math.cos(a*Math.PI)/2+.5}},timers:[],fx:function(a,b,c){this.options=b,this.elem=a,this.prop=c,b.orig=b.orig||{}}}),f.fx.prototype={update:function(){this.options.step&&this.options.step.call(this.elem,this.now,this),(f.fx.step[this.prop]||f.fx.step._default)(this)},cur:function(){if(this.elem[this.prop]!=null&&(!this.elem.style||this.elem.style[this.prop]==null))return this.elem[this.prop];var a,b=f.css(this.elem,this.prop);return isNaN(a=parseFloat(b))?!b||b==="auto"?0:b:a},custom:function(a,c,d){function h(a){return e.step(a)}var e=this,g=f.fx;this.startTime=cq||cr(),this.end=c,this.now=this.start=a,this.pos=this.state=0,this.unit=d||this.unit||(f.cssNumber[this.prop]?"":"px"),h.queue=this.options.queue,h.elem=this.elem,h.saveState=function(){f._data(e.elem,"fxshow"+e.prop)===b&&(e.options.hide?f._data(e.elem,"fxshow"+e.prop,e.start):e.options.show&&f._data(e.elem,"fxshow"+e.prop,e.end))},h()&&f.timers.push(h)&&!co&&(co=setInterval(g.tick,g.interval))},show:function(){var a=f._data(this.elem,"fxshow"+this.prop);this.options.orig[this.prop]=a||f.style(this.elem,this.prop),this.options.show=!0,a!==b?this.custom(this.cur(),a):this.custom(this.prop==="width"||this.prop==="height"?1:0,this.cur()),f(this.elem).show()},hide:function(){this.options.orig[this.prop]=f._data(this.elem,"fxshow"+this.prop)||f.style(this.elem,this.prop),this.options.hide=!0,this.custom(this.cur(),0)},step:function(a){var b,c,d,e=cq||cr(),g=!0,h=this.elem,i=this.options;if(a||e>=i.duration+this.startTime){this.now=this.end,this.pos=this.state=1,this.update(),i.animatedProperties[this.prop]=!0;for(b in i.animatedProperties)i.animatedProperties[b]!==!0&&(g=!1);if(g){i.overflow!=null&&!f.support.shrinkWrapBlocks&&f.each(["","X","Y"],function(a,b){h.style["overflow"+b]=i.overflow[a]}),i.hide&&f(h).hide();if(i.hide||i.show)for(b in i.animatedProperties)f.style(h,b,i.orig[b]),f.removeData(h,"fxshow"+b,!0),f.removeData(h,"toggle"+b,!0);d=i.complete,d&&(i.complete=!1,d.call(h))}return!1}i.duration==Infinity?this.now=e:(c=e-this.startTime,this.state=c/i.duration,this.pos=f.easing[i.animatedProperties[this.prop]](this.state,c,0,1,i.duration),this.now=this.start+(this.end-this.start)*this.pos),this.update();return!0}},f.extend(f.fx,{tick:function(){var a,b=f.timers,c=0;for(;c<b.length;c++)a=b[c],!a()&&b[c]===a&&b.splice(c--,1);b.length||f.fx.stop()},interval:13,stop:function(){clearInterval(co),co=null},speeds:{slow:600,fast:200,_default:400},step:{opacity:function(a){f.style(a.elem,"opacity",a.now)},_default:function(a){a.elem.style&&a.elem.style[a.prop]!=null?a.elem.style[a.prop]=a.now+a.unit:a.elem[a.prop]=a.now}}}),f.each(cp.concat.apply([],cp),function(a,b){b.indexOf("margin")&&(f.fx.step[b]=function(a){f.style(a.elem,b,Math.max(0,a.now)+a.unit)})}),f.expr&&f.expr.filters&&(f.expr.filters.animated=function(a){return f.grep(f.timers,function(b){return a===b.elem}).length});var cv,cw=/^t(?:able|d|h)$/i,cx=/^(?:body|html)$/i;"getBoundingClientRect"in c.documentElement?cv=function(a,b,c,d){try{d=a.getBoundingClientRect()}catch(e){}if(!d||!f.contains(c,a))return d?{top:d.top,left:d.left}:{top:0,left:0};var g=b.body,h=cy(b),i=c.clientTop||g.clientTop||0,j=c.clientLeft||g.clientLeft||0,k=h.pageYOffset||f.support.boxModel&&c.scrollTop||g.scrollTop,l=h.pageXOffset||f.support.boxModel&&c.scrollLeft||g.scrollLeft,m=d.top+k-i,n=d.left+l-j;return{top:m,left:n}}:cv=function(a,b,c){var d,e=a.offsetParent,g=a,h=b.body,i=b.defaultView,j=i?i.getComputedStyle(a,null):a.currentStyle,k=a.offsetTop,l=a.offsetLeft;while((a=a.parentNode)&&a!==h&&a!==c){if(f.support.fixedPosition&&j.position==="fixed")break;d=i?i.getComputedStyle(a,null):a.currentStyle,k-=a.scrollTop,l-=a.scrollLeft,a===e&&(k+=a.offsetTop,l+=a.offsetLeft,f.support.doesNotAddBorder&&(!f.support.doesAddBorderForTableAndCells||!cw.test(a.nodeName))&&(k+=parseFloat(d.borderTopWidth)||0,l+=parseFloat(d.borderLeftWidth)||0),g=e,e=a.offsetParent),f.support.subtractsBorderForOverflowNotVisible&&d.overflow!=="visible"&&(k+=parseFloat(d.borderTopWidth)||0,l+=parseFloat(d.borderLeftWidth)||0),j=d}if(j.position==="relative"||j.position==="static")k+=h.offsetTop,l+=h.offsetLeft;f.support.fixedPosition&&j.position==="fixed"&&(k+=Math.max(c.scrollTop,h.scrollTop),l+=Math.max(c.scrollLeft,h.scrollLeft));return{top:k,left:l}},f.fn.offset=function(a){if(arguments.length)return a===b?this:this.each(function(b){f.offset.setOffset(this,a,b)});var c=this[0],d=c&&c.ownerDocument;if(!d)return null;if(c===d.body)return f.offset.bodyOffset(c);return cv(c,d,d.documentElement)},f.offset={bodyOffset:function(a){var b=a.offsetTop,c=a.offsetLeft;f.support.doesNotIncludeMarginInBodyOffset&&(b+=parseFloat(f.css(a,"marginTop"))||0,c+=parseFloat(f.css(a,"marginLeft"))||0);return{top:b,left:c}},setOffset:function(a,b,c){var d=f.css(a,"position");d==="static"&&(a.style.position="relative");var e=f(a),g=e.offset(),h=f.css(a,"top"),i=f.css(a,"left"),j=(d==="absolute"||d==="fixed")&&f.inArray("auto",[h,i])>-1,k={},l={},m,n;j?(l=e.position(),m=l.top,n=l.left):(m=parseFloat(h)||0,n=parseFloat(i)||0),f.isFunction(b)&&(b=b.call(a,c,g)),b.top!=null&&(k.top=b.top-g.top+m),b.left!=null&&(k.left=b.left-g.left+n),"using"in b?b.using.call(a,k):e.css(k)}},f.fn.extend({position:function(){if(!this[0])return null;var a=this[0],b=this.offsetParent(),c=this.offset(),d=cx.test(b[0].nodeName)?{top:0,left:0}:b.offset();c.top-=parseFloat(f.css(a,"marginTop"))||0,c.left-=parseFloat(f.css(a,"marginLeft"))||0,d.top+=parseFloat(f.css(b[0],"borderTopWidth"))||0,d.left+=parseFloat(f.css(b[0],"borderLeftWidth"))||0;return{top:c.top-d.top,left:c.left-d.left}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||c.body;while(a&&!cx.test(a.nodeName)&&f.css(a,"position")==="static")a=a.offsetParent;return a})}}),f.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(a,c){var d=/Y/.test(c);f.fn[a]=function(e){return f.access(this,function(a,e,g){var h=cy(a);if(g===b)return h?c in h?h[c]:f.support.boxModel&&h.document.documentElement[e]||h.document.body[e]:a[e];h?h.scrollTo(d?f(h).scrollLeft():g,d?g:f(h).scrollTop()):a[e]=g},a,e,arguments.length,null)}}),f.each({Height:"height",Width:"width"},function(a,c){var d="client"+a,e="scroll"+a,g="offset"+a;f.fn["inner"+a]=function(){var a=this[0];return a?a.style?parseFloat(f.css(a,c,"padding")):this[c]():null},f.fn["outer"+a]=function(a){var b=this[0];return b?b.style?parseFloat(f.css(b,c,a?"margin":"border")):this[c]():null},f.fn[c]=function(a){return f.access(this,function(a,c,h){var i,j,k,l;if(f.isWindow(a)){i=a.document,j=i.documentElement[d];return f.support.boxModel&&j||i.body&&i.body[d]||j}if(a.nodeType===9){i=a.documentElement;if(i[d]>=i[e])return i[d];return Math.max(a.body[e],i[e],a.body[g],i[g])}if(h===b){k=f.css(a,c),l=parseFloat(k);return f.isNumeric(l)?l:k}f(a).css(c,h)},c,a,arguments.length,null)}}),a.jQuery=a.$=f,typeof define=="function"&&define.amd&&define.amd.jQuery&&define("jquery",[],function(){return f})})(window);
﻿/*!
* jQuery appendGrid v1.3.1
* https://appendgrid.apphb.com/
*
* Copyright 2014 Albert L.
* Dual licensed under the LGPL (http://www.gnu.org/licenses/lgpl.html)
* and MIT (http://www.opensource.org/licenses/mit-license.php) licenses.
*
* Depends:
* jQuery v1.9.1+
* jquery UI v1.10.2+
*/
(function ($) {
    // The default initial options.
    var _defaultInitOptions = {
        // The text as table caption, set null to disable caption generation.
        caption: null,
        // The total number of empty rows generated when init the grid. This will be ignored if `initData` is assigned.
        initRows: 3,
        // An array of data to be filled after initialized the grid.
        initData: null,
        // Array of column options.
        columns: null,
        // Labels or messages used in grid.
        i18n: null,
        // The ID prefix of controls generated inside the grid. Table ID will be used if not defined.
        idPrefix: null,
        // Enable row dragging by using jQuery UI sortable on grid rows.
        rowDragging: false,
        // Hide the buttons at the end of rows or bottom of grid.
        hideButtons: null,
        // Hide the row number column.
        hideRowNumColumn: false,
        // The extra class names for buttons.
        buttonClasses: null,
        // Adding extra button(s) at the end of rows.
        customRowButtons: null,
        // Adding extra button(s) at the bottom of grid.
        customFooterButtons: null,
        // The callback function to be triggered after data loaded to grid.
        dataLoaded: null,
        // The callback function to be triggered after new row appended.
        afterRowAppended: null,
        // The callback function to be triggered after new row inserted.
        afterRowInserted: null,
        // The callback function to be triggered after grid row swapped.
        afterRowSwapped: null,
        // The callback function to be triggered before grid row remove.
        beforeRowRemove: null,
        // The callback function to be triggered after grid row removed.
        afterRowRemoved: null
    };
    // Default column options.
    var _defaultColumnOptions = {
        // Type of column control.
        type: 'text',
        // Name of column.
        name: null,
        // Default value.
        value: null,
        // Display text on the header section.
        display: null,
        // Extra CSS setting to be added to display text.
        displayCss: null,
        // Extra CSS setting to be added to the control container table cell.
        cellCss: null,
        // Extra attributes to be added to the control.
        ctrlAttr: null,
        // Extra properties to be added to the control.
        ctrlProp: null,
        // Extra CSS to be added to the control.
        ctrlCss: null,
        // Extra name of class to be added to the control.
        ctrlClass: null,
        // The available option for building `select` type control.
        ctrlOptions: null,
        // Options for initalize jQuery UI widget.
        uiOption: null,
        // Options for initalize jQuery UI tooltip.
        uiTooltip: null,
        // Callback function to build custom type control.
        customBuilder: null,
        // Callback function to get control value.
        customGetter: null,
        // Callback function to set control value.
        customSetter: null,
        // The `OnClick` event callback of control.
        onClick: null,
        // The `OnChange` event callback of control.
        onChange: null
    };
    var _systemMessages = {
        noColumnInfo: 'Cannot initial grid without column information!',
        elemNotTable: 'Cannot initial grid on element other than TABLE!',
        notInit: '`appendGrid` does not initialized',
        getValueMultiGrid: 'Cannot get values on multiple grid',
        notSupportMethod: 'Method is not supported by `appendGrid`: '
    };
    var _defaultTextResources = {
        append: 'Append Row',
        removeLast: 'Remove Last Row',
        insert: 'Insert Row Above',
        remove: 'Remove Current Row',
        moveUp: 'Move Up',
        moveDown: 'Move Down',
        rowDrag: 'Sort Row',
        rowEmpty: 'This Grid Is Empty'
    };
    var _defaultButtonClasses = { append: null, removeLast: null, insert: null, remove: null, moveUp: null, moveDown: null, rowDrag: null };
    var _defaultHideButtons = { append: false, removeLast: false, insert: false, remove: false, moveUp: false, moveDown: false };
    var _methods = {
        init: function (options) {
            var target = this;
            var tbWhole, tbHead, tbBody, tbFoot, tbRow, tbCell;
            if (target.length > 0) {
                // Check mandatory paramters included
                if (!$.isArray(options.columns) || options.columns.length == 0) {
                    alert(_systemMessages.noColumnInfo);
                    return target;
                }
                // Check target element is table or not
                tbWhole = target[0];
                if (isEmpty(tbWhole.tagName) || tbWhole.tagName != 'TABLE') {
                    alert(_systemMessages.elemNotTable);
                    return target;
                }
                // Generate settings
                var settings = $.extend({}, _defaultInitOptions, options);
                // Add internal settings
                $.extend(settings, {
                    //The UniqueIndex accumulate counter.
                    _uniqueIndex: 0,
                    // The row order array.
                    _rowOrder: [],
                    // Indicate data is loaded or not.
                    _isDataLoaded: false,
                    // Visible column count for internal calculation.
                    _visibleCount: 0,
                    // Total colSpan count after excluding `hideRowNumColumn` and not generating last column.
                    _finalColSpan: 0,
                    // Indicate to hide last column or not
                    _hideLastColumn: false
                });
                // Labels or messages used in grid.
                if ($.isPlainObject(options.i18n))
                    settings._i18n = $.extend({}, _defaultTextResources, options.i18n);
                else
                    settings._i18n = $.extend({}, _defaultTextResources);
                // The extra class names for buttons.
                if ($.isPlainObject(options.buttonClasses))
                    settings._buttonClasses = $.extend({}, _defaultButtonClasses, options.buttonClasses);
                else
                    settings._buttonClasses = $.extend({}, _defaultButtonClasses);
                // Make sure the `hideButtons` setting defined
                if ($.isPlainObject(options.hideButtons))
                    settings.hideButtons = $.extend({}, _defaultHideButtons, options.hideButtons);
                else
                    settings.hideButtons = $.extend({}, _defaultHideButtons);
                // Check `idPrefix` is defined
                if (isEmpty(settings.idPrefix)) {
                    // Check table ID defined
                    if (isEmpty(tbWhole.id) || tbWhole.id == '') {
                        // Generate an ID using current time
                        settings.idPrefix = 'ag' + new Date().getTime();
                    }
                    else {
                        settings.idPrefix = tbWhole.id;
                    }
                }
                // Create thead and tbody
                tbHead = document.createElement('thead');
                tbHead.className = 'ui-widget-header';
                tbBody = document.createElement('tbody');
                tbBody.className = 'ui-widget-content';
                tbFoot = document.createElement('tfoot');
                tbFoot.className = 'ui-widget-header';
                // Remove existing content and append new thead and tbody
                $(tbWhole).empty().addClass('appendGrid ui-widget').append(tbHead, tbBody, tbFoot);
                // Handle header row
                tbRow = tbHead.insertRow(-1);
                if (!settings.hideRowNumColumn) {
                    tbCell = tbRow.insertCell(-1);
                    tbCell.className = 'ui-widget-header';
                }
                // Prepare column information and add column header
                for (var z = 0; z < settings.columns.length; z++) {
                    // Assign default setting
                    var columnOpt = $.extend({}, _defaultColumnOptions, settings.columns[z]);
                    settings.columns[z] = columnOpt;
                    // Skip hidden
                    if (settings.columns[z].type != 'hidden') {
                        settings._visibleCount++;
                        tbCell = tbRow.insertCell(-1);
                        tbCell.className = 'ui-widget-header';
                        $(tbCell).text(settings.columns[z].display);
                        if (settings.columns[z].displayCss) $(tbCell).css(settings.columns[z].displayCss);
                    }
                }
                // Check to hide last column or not
                if (settings.hideButtons.insert && settings.hideButtons.remove
                        && settings.hideButtons.moveUp && settings.hideButtons.moveDown
                        && (!$.isArray(settings.customRowButtons) || settings.customRowButtons.length == 0)) {
                    settings._hideLastColumn = true;
                }
                // Calculate the `_finalColSpan` value
                settings._finalColSpan = settings._visibleCount;
                if (!settings.hideRowNumColumn) settings._finalColSpan++;
                if (!settings._hideLastColumn) settings._finalColSpan++;
                // Generate last column header if needed
                if (!settings._hideLastColumn) {
                    tbCell = tbRow.insertCell(-1);
                    tbCell.className = 'ui-widget-header';
                }
                // Add caption when defined
                if (settings.caption) {
                    tbRow = tbHead.insertRow(0);
                    tbCell = tbRow.insertCell(-1);
                    tbCell.className = 'ui-state-active caption';
                    tbCell.colSpan = settings._finalColSpan;
                    $(tbCell).text(settings.caption);
                }
                // Handle footer row
                tbRow = tbFoot.insertRow(-1);
                tbCell = tbRow.insertCell(-1);
                tbCell.colSpan = settings._finalColSpan;
                $('<input/>').attr({
                    type: 'hidden',
                    id: settings.idPrefix + '_rowOrder',
                    name: settings.idPrefix + '_rowOrder'
                }).appendTo(tbCell);
                // Make row invisible if all buttons are hidden
                if (settings.hideButtons.append && settings.hideButtons.removeLast
                        && (!$.isArray(settings.customFooterButtons) || settings.customFooterButtons.length == 0)) {
                    tbRow.style.display = 'none';
                } else {
                    if (!settings.hideButtons.append) {
                        $('<button/>').addClass('append', settings._buttonClasses.append).attr({ type: 'button', title: settings._i18n.append })
                        .button({ icons: { primary: 'ui-icon-plusthick' }, text: false }).click(function () {
                            insertRow(tbWhole, 1, null, null);
                        }).appendTo(tbCell);
                    }
                    if (!settings.hideButtons.removeLast) {
                        $('<button/>').addClass('removeLast', settings._buttonClasses.removeLast).attr({ type: 'button', title: settings._i18n.removeLast })
                        .button({ icons: { primary: 'ui-icon-closethick' }, text: false }).click(function () {
                            removeRow(tbWhole, null, this.value, false);
                        }).appendTo(tbCell);
                    }
                    if (settings.customFooterButtons && settings.customFooterButtons.length) {
                        // Add front buttons
                        for (var y = settings.customFooterButtons.length - 1; y >= 0; y--) {
                            var buttonCfg = settings.customFooterButtons[y];
                            if (buttonCfg && buttonCfg.uiButton && buttonCfg.click && buttonCfg.atTheFront) {
                                $(tbCell).prepend(makeCustomBottomButton(tbWhole, buttonCfg));
                            }
                        }
                        // Add end buttons
                        for (var y = 0; y < settings.customFooterButtons.length; y++) {
                            var buttonCfg = settings.customFooterButtons[y];
                            if (buttonCfg && buttonCfg.uiButton && buttonCfg.click && !buttonCfg.atTheFront) {
                                $(tbCell).append(makeCustomBottomButton(tbWhole, buttonCfg));
                            }
                        }
                    }
                }
                // Enable dragging
                if (settings.rowDragging) {
                    $(tbBody).sortable({
                        axis: 'y',
                        containment: tbWhole,
                        handle: '.rowDrag',
                        helper: function (e, tr) {
                            var org = tr.children();
                            var helper = tr.clone();
                            helper.children().each(function (index) {
                                $(this).width(org.eq(index).width());
                            });
                            return helper;
                        },
                        update: function (event, ui) {
                            var uniqueIndex = ui.item[0].id.substring(ui.item[0].id.lastIndexOf('_') + 1);
                            var tbRowIndex = ui.item[0].rowIndex - $('tr', tbHead).length;
                            gridRowDragged(tbWhole, ui.originalPosition.top > ui.position.top, uniqueIndex, tbRowIndex);
                        }
                    });
                }
                // Save options
                $(tbWhole).data('appendGrid', settings);
                if ($.isArray(options.initData)) {
                    // Load data if initData is array
                    loadData(tbWhole, options.initData, true);
                } else {
                    // Add empty rows
                    $(tbWhole).appendGrid('appendRow', settings.initRows);
                }
                // Show no rows in grid
                if (settings._rowOrder.length == 0) {
                    var empty = $('<td></td>').text(settings._i18n.rowEmpty).attr('colspan', settings._finalColSpan);
                    $('tbody', tbWhole).append($('<tr></tr>').addClass('empty').append(empty));
                }
            }
            return target;
        },
        isReady: function () {
            // Check the appendGrid is initialized or not
            var target = this, result = false;
            if (target.length > 0) {
                var settings = target.first().data('appendGrid');
                if (settings) {
                    result = true;
                }
            }
            return result;
        },
        isDataLoaded: function () {
            // Check the grid data is loaded by `load` method or `initData` parameter or not
            var target = this, result = null;
            if (this.length == 1) {
                var settings = target.data('appendGrid');
                if (settings) {
                    return settings._isDataLoaded;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        },
        load: function (records) {
            var target = this;
            if (target.length > 0) {
                loadData(target[0], records, false);
            }
            return target;
        },
        appendRow: function (numOfRow) {
            return this.appendGrid('insertRow', numOfRow);
        },
        insertRow: function (numOfRow, rowIndex, callerUniqueIndex) {
            var target = this;
            if (target.length > 0) {
                var tbWhole = target[0], insertResult = null;
                var settings = $(tbWhole).data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else if (numOfRow > 0) {
                    // Define variables
                    insertResult = insertRow(tbWhole, numOfRow, rowIndex, callerUniqueIndex);
                    // Reorder sequence as needed
                    if ($.isNumeric(rowIndex) || $.isNumeric(callerUniqueIndex)) {
                        // Sort sequence
                        sortSequence(tbWhole, insertResult.rowIndex);
                        // Move focus
                        var insertUniqueIndex = settings._rowOrder[insertResult.addedRows[0]];
                        $('#' + settings.idPrefix + '_Insert_' + insertUniqueIndex, tbWhole).focus();
                    }
                }
            }
            return target;
        },
        removeRow: function (rowIndex, uniqueIndex) {
            var target = this, tbodyIndex = -1;
            if (target.length > 0) {
                var tbWhole = target[0], tbHead, tbBody, tbRow;
                var settings = $(tbWhole).data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else if (settings._rowOrder.length > 0) {
                    removeRow(tbWhole, rowIndex, uniqueIndex, true);
                }
            }
            return target;
        },
        moveUpRow: function (rowIndex, uniqueIndex) {
            var target = this, tbodyIndex = -1;
            if (target.length > 0) {
                var tbWhole = target[0], tbBody, trTarget, trSwap, swapSeq;
                var settings = $(tbWhole).data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    var oldIndex = null;
                    tbBody = tbWhole.getElementsByTagName('tbody')[0];
                    if ($.isNumeric(rowIndex) && rowIndex > 0 && rowIndex < settings._rowOrder.length) {
                        oldIndex = rowIndex;
                        uniqueIndex = settings._rowOrder[rowIndex];
                        trTarget = document.getElementById(settings.idPrefix + '_Row_' + uniqueIndex, tbWhole);
                    } else if ($.isNumeric(uniqueIndex)) {
                        oldIndex = findRowIndex(uniqueIndex, settings);
                        trTarget = document.getElementById(settings.idPrefix + '_Row_' + uniqueIndex, tbWhole);
                    }
                    if (oldIndex != null && oldIndex > 0) {
                        // Get row to swap
                        trSwap = document.getElementById(settings.idPrefix + '_Row_' + settings._rowOrder[oldIndex - 1], tbWhole);
                        // Remove current row
                        tbBody.removeChild(trTarget);
                        // Insert before the above row
                        tbBody.insertBefore(trTarget, trSwap);
                        // Update rowOrder
                        settings._rowOrder[oldIndex] = settings._rowOrder[oldIndex - 1];
                        settings._rowOrder[oldIndex - 1] = uniqueIndex;
                        // Update row label
                        swapSeq = $('td.first', trSwap).html();
                        $('td.first', trSwap).html($('td.first', trTarget).html());
                        $('td.first', trTarget).html(swapSeq)
                        // Save setting
                        saveSetting(tbWhole, settings);
                        // Change focus
                        $('td.last button.moveUp', trTarget).removeClass('ui-state-hover').blur();
                        $('td.last button.moveUp', trSwap).focus();
                        // Trigger event
                        if (settings.afterRowSwapped) {
                            settings.afterRowSwapped(tbWhole, oldIndex, oldIndex - 1);
                        }
                    }
                }
            }
            return target;
        },
        moveDownRow: function (rowIndex, uniqueIndex) {
            var target = this, tbodyIndex = -1;
            if (target.length > 0) {
                var tbWhole = target[0], tbBody, trTarget, trSwap, swapSeq;
                var settings = $(tbWhole).data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    var oldIndex = null;
                    tbBody = tbWhole.getElementsByTagName('tbody')[0];
                    if ($.isNumeric(rowIndex) && rowIndex >= 0 && rowIndex < settings._rowOrder.length - 1) {
                        oldIndex = rowIndex;
                        uniqueIndex = settings._rowOrder[rowIndex];
                        trTarget = document.getElementById(settings.idPrefix + '_Row_' + uniqueIndex, tbWhole);
                    } else if ($.isNumeric(uniqueIndex)) {
                        oldIndex = findRowIndex(uniqueIndex, settings);
                        trTarget = document.getElementById(settings.idPrefix + '_Row_' + uniqueIndex, tbWhole);
                    }
                    if (oldIndex != null && oldIndex != settings._rowOrder.length - 1) {
                        // Get row to swap
                        trSwap = document.getElementById(settings.idPrefix + '_Row_' + settings._rowOrder[oldIndex + 1], tbWhole);
                        // Remove current row
                        tbBody.removeChild(trSwap);
                        // Insert before the above row
                        tbBody.insertBefore(trSwap, trTarget);
                        // Update rowOrder
                        settings._rowOrder[oldIndex] = settings._rowOrder[oldIndex + 1];
                        settings._rowOrder[oldIndex + 1] = uniqueIndex;
                        // Update row label
                        swapSeq = $('td.first', trSwap).html();
                        $('td.first', trSwap).html($('td.first', trTarget).html());
                        $('td.first', trTarget).html(swapSeq)
                        // Save setting
                        saveSetting(tbWhole, settings);
                        // Change focus
                        $('td.last button.moveDown', trTarget).removeClass('ui-state-hover').blur();
                        $('td.last button.moveDown', trSwap).focus();
                        // Trigger event
                        if (settings.afterRowSwapped) {
                            settings.afterRowSwapped(tbWhole, oldIndex, oldIndex + 1);
                        }
                    }
                }
            }
            return target;
        },
        getRowCount: function () {
            var target = this;
            if (target.length > 0) {
                var settings = target.data('appendGrid');
                if (settings) {
                    return settings._rowOrder.length;
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            else {
                alert(_systemMessages.getValueMultiGrid);
            }
            return null;
        },
        getUniqueIndex: function (rowIndex) {
            var target = this;
            if (target.length > 0 && rowIndex >= 0) {
                var settings = target.data('appendGrid');
                if (settings) {
                    if (rowIndex < settings._rowOrder.length) {
                        return settings._rowOrder[rowIndex];
                    }
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            return null;
        },
        getRowIndex: function (uniqueIndex) {
            var target = this;
            if (target.length > 0) {
                var settings = target.data('appendGrid');
                if (settings) {
                    for (var z = 0; z < settings._rowOrder.length; z++) {
                        if (settings._rowOrder[z] == uniqueIndex) {
                            return z;
                        }
                    }
                    return null;
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            return null;
        },
        getRowValue: function (rowIndex, uniqueIndex, loopIndex) {
            var target = this, result = null;
            if (target.length > 0) {
                var settings = target.data('appendGrid');
                if (settings) {
                    if ($.isNumeric(rowIndex) && rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                        uniqueIndex = settings._rowOrder[rowIndex];
                    }
                    if (!isEmpty(uniqueIndex)) {
                        result = getRowValue(settings, uniqueIndex, loopIndex);
                    }
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            return result;
        },
        getAllValue: function (objectMode) {
            var target = this, result = null, rowValue;
            if (target.length > 0) {
                var settings = $(target).data('appendGrid');
                if (settings) {
                    // Prepare result based on objectMode setting
                    result = objectMode ? {} : [];
                    // Process on each rows
                    for (var z = 0; z < settings._rowOrder.length; z++) {
                        if (objectMode) {
                            rowValue = getRowValue(settings, settings._rowOrder[z], z);
                            $.extend(result, rowValue)
                        } else {
                            rowValue = getRowValue(settings, settings._rowOrder[z]);
                            result.push(rowValue);
                        }
                    }
                    if (objectMode) {
                        result['_RowCount'] = settings._rowOrder.length;
                    }
                }
            }
            return result;
        },
        getCtrlValue: function (name, rowIndex) {
            var target = this;
            if (target.length > 0) {
                settings = target.data('appendGrid');
                if (settings && rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                    for (var z = 0; z < settings.columns.length; z++) {
                        if (settings.columns[z].name === name) {
                            return getCtrlValue(settings, z, settings._rowOrder[rowIndex]);
                        }
                    }
                }
            }
            return null;
        },
        setCtrlValue: function (name, rowIndex, value) {
            var target = this;
            if (target.length > 0) {
                var tbWhole = this, settings = $(this).data('appendGrid');
                if (settings && rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                    for (var z = 0; z < settings.columns.length; z++) {
                        if (settings.columns[z].name == name) {
                            setCtrlValue(settings, z, settings._rowOrder[rowIndex], value);
                            break;
                        }
                    }
                }
            }
            return target;
        },
        getCellCtrl: function (name, uniqueIndex) {
            var target = this, result = null;
            if (target.length == 1) {
                settings = target.data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    for (var z = 0; z < settings.columns.length; z++) {
                        if (settings.columns[z].name === name) {
                            return getCellCtrl(settings.columns[z].type, settings.idPrefix, name, uniqueIndex);
                            break;
                        }
                    }
                }
            }
            return null;
        },
        getCellCtrlByRowIndex: function (name, rowIndex) {
            var target = this, result = null;
            if (target.length == 1) {
                settings = target.data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    if (rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                        var uniqueIndex = settings._rowOrder[rowIndex];
                        for (var z = 0; z < settings.columns.length; z++) {
                            if (settings.columns[z].name === name) {
                                return getCellCtrl(settings.columns[z].type, settings.idPrefix, name, uniqueIndex);
                            }
                        }
                    }
                }
            }
            return null;
        },
        setCellCtrlByRowIndex: function (name, rowIndex, value) {
            var target = this, result = null;
            if (target.length == 1) {
                settings = target.data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    if (rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                        var uniqueIndex = settings._rowOrder[rowIndex];
                        for (var z = 0; z < settings.columns.length; z++) {
                            if (settings.columns[z].name === name) {
                                return setCellCtrl(settings.columns[z].type, settings.idPrefix, name, uniqueIndex, value);
                            }
                        }
                    }
                }
            }
            return null;
        },
        getRowOrder: function () {
            var target = this, result = null;
            if (this.length == 1) {
                var settings = target.data('appendGrid');
                if (settings) {
                    result = settings._rowOrder.slice();
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            else {
                alert(_systemMessages.getValueMultiGrid);
            }
            return result;
        }
    };
    function insertRow(tbWhole, numOfRow, rowIndex, callerUniqueIndex) {
        // Define variables
        var settings = $(tbWhole).data('appendGrid');
        var addedRows = [], parentIndex = null, uniqueIndex, ctrl, hidden = [];
        var tbHead = tbWhole.getElementsByTagName('thead')[0];
        var tbBody = tbWhole.getElementsByTagName('tbody')[0];
        // Check parent row
        if ($.isNumeric(callerUniqueIndex)) {
            for (var z = 0; z < settings._rowOrder.length; z++) {
                if (settings._rowOrder[z] == callerUniqueIndex) {
                    rowIndex = z;
                    if (z != 0) parentIndex = z - 1;
                    break;
                }
            }
        }
        else if ($.isNumeric(rowIndex)) {
            if (rowIndex >= settings._rowOrder.length) {
                rowIndex = null;
            } else {
                parentIndex = rowIndex - 1;
            }
        }
        else if (settings._rowOrder.length != 0) {
            rowIndex = null;
            parentIndex = settings._rowOrder.length - 1;
        }
        // Remove empty row
        if (settings._rowOrder.length == 0) {
            $('tr.empty', tbWhole).remove();
        }
        // Add total number of row
        for (var z = 0; z < numOfRow; z++) {
            // Update variables
            settings._uniqueIndex++;
            uniqueIndex = settings._uniqueIndex;
            hidden.length = 0;
            // Check row insert index
            if ($.isNumeric(rowIndex)) {
                settings._rowOrder.splice(rowIndex, 0, uniqueIndex);
                tbRow = tbBody.insertRow(rowIndex);
                addedRows.push(rowIndex);
            }
            else {
                settings._rowOrder.push(uniqueIndex);
                tbRow = tbBody.insertRow(-1);
                addedRows.push(settings._rowOrder.length - 1);
            }
            tbRow.id = settings.idPrefix + '_Row_' + uniqueIndex;
            $(tbRow).data('appendGrid', uniqueIndex);
            // Add row number
            if (!settings.hideRowNumColumn) {
                tbCell = tbRow.insertCell(-1);
                $(tbCell).addClass('ui-widget-content first').text(settings._rowOrder.length);
            }
            // Process on each columns
            for (var y = 0; y < settings.columns.length; y++) {
                // Skip hidden
                if (settings.columns[y].type == 'hidden') {
                    hidden.push(y);
                    continue;
                }
                // Insert cell
                tbCell = tbRow.insertCell(-1);
                tbCell.className = 'ui-widget-content';
                if (settings.columns[y].cellCss != null) $(tbCell).css(settings.columns[y].cellCss);
                // Check control type
                ctrl = null;
                if (settings.columns[y].type == 'custom') {
                    if (typeof (settings.columns[y].customBuilder) == 'function') {
                        ctrl = settings.columns[y].customBuilder(tbCell, settings.idPrefix, settings.columns[y].name, uniqueIndex);
                    }
                }
                else if (settings.columns[y].type == 'select') {
                    ctrl = document.createElement('select');
                    ctrl.id = settings.idPrefix + '_' + settings.columns[y].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    // Build option list
                    if ($.isArray(settings.columns[y].ctrlOptions)) {
                        // For array type option list
                        if (settings.columns[y].ctrlOptions.length > 0) {
                            if ($.isPlainObject(settings.columns[y].ctrlOptions[0])) {
                                for (var x = 0; x < settings.columns[y].ctrlOptions.length; x++) {
                                    ctrl.options[ctrl.options.length] = new Option(settings.columns[y].ctrlOptions[x].label, settings.columns[y].ctrlOptions[x].value);
                                }
                            }
                            else {
                                for (var x = 0; x < settings.columns[y].ctrlOptions.length; x++) {
                                    ctrl.options[ctrl.options.length] = new Option(settings.columns[y].ctrlOptions[x], settings.columns[y].ctrlOptions[x]);
                                }
                            }
                        }
                    }
                    else if ($.isPlainObject(settings.columns[y].ctrlOptions)) {
                        // For plain object type option list
                        for (var x in settings.columns[y].ctrlOptions) {
                            ctrl.options[ctrl.options.length] = new Option(settings.columns[y].ctrlOptions[x], x);
                        }
                    }
                    else if (typeof (settings.columns[y].ctrlOptions) == 'string') {
                        // For string type option list
                        var arrayOpt = settings.columns[y].ctrlOptions.split(';');
                        for (var x = 0; x < arrayOpt.length; x++) {
                            var eqIndex = arrayOpt[x].indexOf(':');
                            if (-1 == eqIndex) {
                                ctrl.options[ctrl.options.length] = new Option(arrayOpt[x], arrayOpt[x]);
                            } else {
                                ctrl.options[ctrl.options.length] = new Option(arrayOpt[x].substring(eqIndex + 1, arrayOpt[x].length), arrayOpt[x].substring(0, eqIndex));
                            }
                        }
                    }
                    tbCell.appendChild(ctrl);
                }
                else if (settings.columns[y].type == 'checkbox') {
                    ctrl = document.createElement('input');
                    ctrl.type = 'checkbox';
                    ctrl.id = settings.idPrefix + '_' + settings.columns[y].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    ctrl.value = 1;
                    tbCell.appendChild(ctrl);
                    tbCell.style.textAlign = 'center';
                }
                else if (-1 != settings.columns[y].type.search(/^(color|date|datetime|datetime\-local|email|month|number|range|search|tel|time|url|week)$/)) {
                    ctrl = document.createElement('input');
                    try {
                        ctrl.type = settings.columns[y].type;
                    }
                    catch (err) { /* Not supported type */ }
                    ctrl.id = settings.idPrefix + '_' + settings.columns[y].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    tbCell.appendChild(ctrl);
                }
                else {
                    // Generate text input
                    ctrl = document.createElement('input');
                    ctrl.type = 'text';
                    ctrl.id = settings.idPrefix + '_' + settings.columns[y].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    tbCell.appendChild(ctrl);
                    // Handle UI widget
                    if (settings.columns[y].type == 'ui-datepicker') {
                        $(ctrl).datepicker(settings.columns[y].uiOption);
                    } else if (settings.columns[y].type == 'ui-spinner') {
                        $(ctrl).spinner(settings.columns[y].uiOption);
                    } else if (settings.columns[y].type == 'ui-autocomplete') {
                        $(ctrl).autocomplete(settings.columns[y].uiOption);
                    }
                }
                // Add extra control properties
                if (settings.columns[y].type != 'custom') {
                    // Add control attributes as needed
                    if (settings.columns[y].ctrlAttr != null) $(ctrl).attr(settings.columns[y].ctrlAttr);
                    // Add control properties as needed
                    if (settings.columns[y].ctrlProp != null) $(ctrl).prop(settings.columns[y].ctrlProp);
                    // Add control CSS as needed
                    if (settings.columns[y].ctrlCss != null) $(ctrl).css(settings.columns[y].ctrlCss);
                    // Add control class as needed
                    if (settings.columns[y].ctrlClass != null) $(ctrl).addClass(settings.columns[y].ctrlClass);
                    // Add jQuery UI tooltip as needed
                    if (settings.columns[y].uiTooltip) $(ctrl).tooltip(settings.columns[y].uiTooltip);
                    // Add control events as needed
                    if (typeof (settings.columns[y].onClick) == 'function') {
                        $(ctrl).click({ caller: tbWhole, callback: settings.columns[y].onClick, uniqueIndex: uniqueIndex }, function (evt) {
                            evt.data.callback(evt, $(evt.data.caller).appendGrid('getRowIndex', evt.data.uniqueIndex));
                        });
                    }
                    if (typeof (settings.columns[y].onChange) == 'function') {
                        $(ctrl).change({ caller: tbWhole, callback: settings.columns[y].onChange, uniqueIndex: uniqueIndex }, function (evt) {
                            evt.data.callback(evt, $(evt.data.caller).appendGrid('getRowIndex', evt.data.uniqueIndex));
                        });
                    }
                }
                // Set default value
                if (!isEmpty(settings.columns[y].value)) {
                    setCtrlValue(settings, y, uniqueIndex, settings.columns[y].value);
                }
            }
            // Add button cell if needed
            if (!settings._hideLastColumn || settings.columns.length > settings._visibleCount) {
                tbCell = tbRow.insertCell(-1);
                tbCell.className = 'ui-widget-content last';
                if (settings._hideLastColumn) tbCell.style.display = 'none';
                // Add standard buttons
                if (!settings.hideButtons.insert) {
                    $(tbCell).append($('<button/>').addClass('insert', settings._buttonClasses.insert).val(uniqueIndex)
                        .attr({ id: settings.idPrefix + '_Insert_' + uniqueIndex, type: 'button', title: settings._i18n.insert, tabindex: -1 })
                        .button({ icons: { primary: 'ui-icon-arrowreturnthick-1-w' }, text: false }).click(function () {
                            $(tbWhole).appendGrid('insertRow', 1, null, this.value);
                        }));
                }
                if (!settings.hideButtons.remove) {
                    $(tbCell).append($('<button/>').addClass('remove', settings._buttonClasses.remove).val(uniqueIndex)
                        .attr({ id: settings.idPrefix + '_Delete_' + uniqueIndex, type: 'button', title: settings._i18n.remove, tabindex: -1 })
                        .button({ icons: { primary: 'ui-icon-trash' }, text: false }).click(function () {
                            removeRow(tbWhole, null, this.value, false);
                        }));
                }
                if (!settings.hideButtons.moveUp) {
                    $(tbCell).append($('<button/>').addClass('moveUp', settings._buttonClasses.moveUp).val(uniqueIndex)
                        .attr({ id: settings.idPrefix + '_MoveUp_' + uniqueIndex, type: 'button', title: settings._i18n.moveUp, tabindex: -1 })
                        .button({ icons: { primary: 'ui-icon-arrowthick-1-n' }, text: false }).click(function () {
                            $(tbWhole).appendGrid('moveUpRow', null, this.value);
                        }));
                }
                if (!settings.hideButtons.moveDown) {
                    $(tbCell).append($('<button/>').addClass('moveDown', settings._buttonClasses.moveDown).val(uniqueIndex)
                        .attr({ id: settings.idPrefix + '_MoveDown_' + uniqueIndex, type: 'button', title: settings._i18n.moveDown, tabindex: -1 })
                        .button({ icons: { primary: 'ui-icon-arrowthick-1-s' }, text: false }).click(function () {
                            $(tbWhole).appendGrid('moveDownRow', null, this.value);
                        }));
                }
                // Handle row dragging
                if (settings.rowDragging) {
                    $('<div/>').addClass('rowDrag ui-state-default ui-corner-all', settings._buttonClasses.rowDrag)
                        .attr('title', settings._i18n.rowDrag).append($('<div/>').addClass('ui-icon ui-icon-carat-2-n-s'))
                        .appendTo(tbCell);
                }
                // Add hidden
                for (var y = 0; y < hidden.length; y++) {
                    ctrl = document.createElement('input');
                    ctrl.id = settings.idPrefix + '_' + settings.columns[hidden[y]].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    ctrl.type = 'hidden';
                    if (!isEmpty(settings.columns[hidden[y]].value)) {
                        ctrl.value = settings.columns[hidden[y]].value;
                    }
                    tbCell.appendChild(ctrl);
                }
                // Add extra buttons
                if (settings.customRowButtons && settings.customRowButtons.length) {
                    // Add front buttons
                    for (var y = settings.customRowButtons.length - 1; y >= 0; y--) {
                        var buttonCfg = settings.customRowButtons[y];
                        if (buttonCfg && buttonCfg.uiButton && buttonCfg.click && buttonCfg.atTheFront) {
                            $(tbCell).prepend(makeCustomRowButton(tbWhole, buttonCfg, uniqueIndex));
                        }
                    }
                    // Add end buttons
                    for (var y = 0; y < settings.customRowButtons.length; y++) {
                        var buttonCfg = settings.customRowButtons[y];
                        if (buttonCfg && buttonCfg.uiButton && buttonCfg.click && !buttonCfg.atTheFront) {
                            $(tbCell).append(makeCustomRowButton(tbWhole, buttonCfg, uniqueIndex));
                        }
                    }
                }
            }
        }
        // Save setting
        saveSetting(tbWhole, settings);
        // Trigger events
        if ($.isNumeric(rowIndex)) {
            if (typeof (settings.afterRowInserted) == 'function') {
                settings.afterRowInserted(tbWhole, parentIndex, addedRows);
            }
        }
        else {
            if (typeof (settings.afterRowAppended) == 'function') {
                settings.afterRowAppended(tbWhole, parentIndex, addedRows);
            }
        }
        // Return added rows' uniqueIndex
        return { addedRows: addedRows, parentIndex: parentIndex, rowIndex: rowIndex };
    }
    function makeCustomBottomButton(tbWhole, buttonCfg) {
        var exButton = $('<button/>').attr({ type: 'button', tabindex: -1 })
        .button(buttonCfg.uiButton).click({ tbWhole: tbWhole }, buttonCfg.click);
        if (buttonCfg.btnClass) exButton.addClass(buttonCfg.btnClass);
        if (buttonCfg.btnCss) exButton.css(buttonCfg.btnCss);
        if (buttonCfg.btnAttr) exButton.attr(buttonCfg.btnAttr);
        return exButton;
    }
    function makeCustomRowButton(tbWhole, buttonCfg, uniqueIndex) {
        var exButton = $('<button/>').val(uniqueIndex).attr({ type: 'button', tabindex: -1 })
        .button(buttonCfg.uiButton).click({ tbWhole: tbWhole, uniqueIndex: uniqueIndex }, function (evt) {
            var rowData = $(evt.data.tbWhole).appendGrid('getRowValue', null, evt.data.uniqueIndex);
            buttonCfg.click(evt, evt.data.uniqueIndex, rowData);
        });
        if (buttonCfg.btnClass) exButton.addClass(buttonCfg.btnClass);
        if (buttonCfg.btnCss) exButton.css(buttonCfg.btnCss);
        if (buttonCfg.btnAttr) exButton.attr(buttonCfg.btnAttr);
        return exButton;
    }
    function removeRow(tbWhole, rowIndex, uniqueIndex, force) {
        var settings = $(tbWhole).data('appendGrid');
        var tbBody = tbWhole.getElementsByTagName('tbody')[0];
        if ($.isNumeric(uniqueIndex)) {
            for (var z = 0; z < settings._rowOrder.length; z++) {
                if (settings._rowOrder[z] == uniqueIndex) {
                    rowIndex = z;
                    break;
                }
            }
        }
        if ($.isNumeric(rowIndex)) {
            // Remove middle row
            if (force || typeof (settings.beforeRowRemove) != 'function' || settings.beforeRowRemove(tbWhole, rowIndex)) {
                settings._rowOrder.splice(rowIndex, 1);
                tbBody.deleteRow(rowIndex);
                // Save setting
                saveSetting(tbWhole, settings);
                // Sort sequence
                sortSequence(tbWhole, rowIndex);
                // Trigger event
                if (typeof (settings.afterRowRemoved) == 'function') {
                    settings.afterRowRemoved(tbWhole, rowIndex);
                }
            }
        }
        else {
            // Remove last row
            if (force || typeof (settings.beforeRowRemove) != 'function' || settings.beforeRowRemove(tbWhole, settings._rowOrder.length - 1)) {
                uniqueIndex = settings._rowOrder.pop();
                tbBody.deleteRow(-1);
                // Save setting
                saveSetting(tbWhole, settings);
                // Trigger event
                if (typeof (settings.afterRowRemoved) == 'function') {
                    settings.afterRowRemoved(tbWhole, null);
                }
            }
        }
        // Add empty row
        if (settings._rowOrder.length == 0) {
            var empty = $('<td></td>').text(settings._i18n.rowEmpty).attr('colspan', settings._finalColSpan);
            $('tbody', tbWhole).append($('<tr></tr>').addClass('empty').append(empty));
        }
    }
    function sortSequence(tbWhole, startIndex) {
        var settings = $(tbWhole).data('appendGrid');
        if (!settings.hideRowNumColumn) {
            for (var z = startIndex; z < settings._rowOrder.length; z++) {
                $('#' + settings.idPrefix + '_Row_' + settings._rowOrder[z] + ' td.first', tbWhole).text(z + 1);
            }
        }
    }
    function loadData(tbWhole, records, isInit) {
        var tbBody, tbRow, tbCell, uniqueIndex, insertResult;
        var settings = $(tbWhole).data('appendGrid');
        if (settings) {
            // Clear existing content
            tbBody = tbWhole.getElementsByTagName('tbody')[0];
            $(tbBody).empty();
            settings._rowOrder.length = 0;
            settings._uniqueIndex = 0;
            // Check any records
            if (records != null && records.length) {
                // Add rows
                insertResult = insertRow(tbWhole, records.length, null, null);
                // Set data
                for (var r = 0; r < insertResult.addedRows.length; r++) {
                    for (var c = 0; c < settings.columns.length; c++) {
                        setCtrlValue(settings, c, settings._rowOrder[r], records[r][settings.columns[c].name]);
                    }
                }
            }
            // Save setting
            settings._isDataLoaded = true;
            if (isInit) settings.initData = null;
            $(tbWhole).data('appendGrid', settings);
            // Trigger data loaded event
            if (typeof (settings.dataLoaded) == 'function') {
                settings.dataLoaded(tbWhole);
            }
        }
    }
    function findRowIndex(uniqueIndex, settings) {
        for (var z = 0; z < settings._rowOrder.length; z++) {
            if (settings._rowOrder[z] == uniqueIndex) {
                return z;
            }
        }
        return null;
    }
    function isEmpty(value) {
        return typeof (value) == 'undefined' || value == null;
    }
    function getObjValue(obj, key) {
        if (!isEmpty(obj) && $.isPlainObject(obj) && !isEmpty(obj[key])) {
            return obj[key];
        }
        return null;
    }
    function saveSetting(tbWhole, settings) {
        $(tbWhole).data('appendGrid', settings);
        $('#' + settings.idPrefix + '_rowOrder', tbWhole).val(settings._rowOrder.join());
    }
    function getRowIndex(settings, uniqueIndex) {
        var rowIndex = null;
        for (var z = 0; z < settings._rowOrder.length; z++) {
            if (settings._rowOrder[z] == uniqueIndex) {
                return z;
            }
        }
        return rowIndex;
    }
    function getRowValue(settings, uniqueIndex, loopIndex) {
        var result = {}, keyName = null;
        for (var z = 0; z < settings.columns.length; z++) {
            keyName = settings.columns[z].name + (isEmpty(loopIndex) ? '' : '_' + loopIndex);
            result[keyName] = getCtrlValue(settings, z, uniqueIndex);
        }
        return result;
    }
    function getCtrlValue(settings, colIndex, uniqueIndex) { // type, idPrefix, columnName, uniqueIndex
        var ctrl = null, type = settings.columns[colIndex].type, columnName = settings.columns[colIndex].name;
        if (type == 'checkbox') {
            ctrl = getCellCtrl(type, settings.idPrefix, columnName, uniqueIndex);
            if (ctrl == null)
                return null;
            else
                return ctrl.checked ? 1 : 0;
        }
        else if (type == 'custom') {
            if (typeof (settings.columns[colIndex].customGetter) == 'function')
                return settings.columns[colIndex].customGetter(settings.idPrefix, columnName, uniqueIndex);
            else
                return null;
        }
        else {
            ctrl = getCellCtrl(type, settings.idPrefix, columnName, uniqueIndex);
            if (ctrl == null)
                return null;
            else
                return ctrl.value;
        }
    }
    function getCellCtrl(type, idPrefix, columnName, uniqueIndex) {
        return document.getElementById(idPrefix + '_' + columnName + '_' + uniqueIndex);
    }
    function setCtrlValue(settings, colIndex, uniqueIndex, data) {
        var type = settings.columns[colIndex].type;
        var columnName = settings.columns[colIndex].name;
        if (type == 'checkbox') {
            getCellCtrl(type, settings.idPrefix, columnName, uniqueIndex).checked = (data != null && data != 0);
        }
        else if (type == 'custom') {
            if (typeof (settings.columns[colIndex].customSetter) == 'function') {
                settings.columns[colIndex].customSetter(settings.idPrefix, columnName, uniqueIndex, data);
            }
        }
        else {
            getCellCtrl(type, settings.idPrefix, columnName, uniqueIndex).value = (data == null ? '' : data);
        }
    }
    function gridRowDragged(tbWhole, isMoveUp, uniqueIndex, tbRowIndex) {
        // Get setting
        var settings = $(tbWhole).data('appendGrid');
        // Find the start sorting index
        var startIndex = -1;
        for (var z = 0; z < settings._rowOrder.length; z++) {
            if (settings._rowOrder[z] == uniqueIndex) {
                if (isMoveUp) {
                    startIndex = tbRowIndex;
                    settings._rowOrder.splice(z, 1);
                    settings._rowOrder.splice(tbRowIndex, 0, uniqueIndex);
                } else {
                    startIndex = z;
                    settings._rowOrder.splice(tbRowIndex + 1, 0, uniqueIndex);
                    settings._rowOrder.splice(z, 1);
                }
                break;
            }
        }
        // Do re-order
        sortSequence(tbWhole, startIndex);
        // Save setting
        saveSetting(tbWhole, settings);
    }
    /// <summary>
    /// Initialize append grid or calling its methods.
    /// </summary>
    $.fn.appendGrid = function (params) {
        if (_methods[params]) {
            return _methods[params].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof (params) === 'object' || !params) {
            return _methods.init.apply(this, arguments);
        } else {
            $.error(_systemMessages.notSupportMethod + params);
        }
    };
})(jQuery);
/*!
* jQuery appendGrid v1.3.1
* https://appendgrid.apphb.com/
*
* Copyright 2014 Albert L.
* Dual licensed under the LGPL (http://www.gnu.org/licenses/lgpl.html)
* and MIT (http://www.opensource.org/licenses/mit-license.php) licenses.
*
* Depends:
* jQuery v1.9.1+
* jquery UI v1.10.2+
*/
(function(f){var p={caption:null,initRows:3,initData:null,columns:null,i18n:null,idPrefix:null,rowDragging:false,hideButtons:null,hideRowNumColumn:false,buttonClasses:null,customRowButtons:null,customFooterButtons:null,dataLoaded:null,afterRowAppended:null,afterRowInserted:null,afterRowSwapped:null,beforeRowRemove:null,afterRowRemoved:null};var u={type:"text",name:null,value:null,display:null,displayCss:null,cellCss:null,ctrlAttr:null,ctrlProp:null,ctrlCss:null,ctrlClass:null,ctrlOptions:null,uiOption:null,uiTooltip:null,customBuilder:null,customGetter:null,customSetter:null,onClick:null,onChange:null};var q={noColumnInfo:"Cannot initial grid without column information!",elemNotTable:"Cannot initial grid on element other than TABLE!",notInit:"`appendGrid` does not initialized",getValueMultiGrid:"Cannot get values on multiple grid",notSupportMethod:"Method is not supported by `appendGrid`: "};var s={append:"Append Row",removeLast:"Remove Last Row",insert:"Insert Row Above",remove:"Remove Current Row",moveUp:"Move Up",moveDown:"Move Down",rowDrag:"Sort Row",rowEmpty:"This Grid Is Empty"};var k={append:null,removeLast:null,insert:null,remove:null,moveUp:null,moveDown:null,rowDrag:null};var e={append:false,removeLast:false,insert:false,remove:false,moveUp:false,moveDown:false};var j={init:function(N){var J=this;var I,A,M,C,F,B;if(J.length>0){if(!f.isArray(N.columns)||N.columns.length==0){alert(q.noColumnInfo);return J}I=J[0];if(l(I.tagName)||I.tagName!="TABLE"){alert(q.elemNotTable);return J}var E=f.extend({},p,N);f.extend(E,{_uniqueIndex:0,_rowOrder:[],_isDataLoaded:false,_visibleCount:0,_finalColSpan:0,_hideLastColumn:false});if(f.isPlainObject(N.i18n)){E._i18n=f.extend({},s,N.i18n)}else{E._i18n=f.extend({},s)}if(f.isPlainObject(N.buttonClasses)){E._buttonClasses=f.extend({},k,N.buttonClasses)}else{E._buttonClasses=f.extend({},k)}if(f.isPlainObject(N.hideButtons)){E.hideButtons=f.extend({},e,N.hideButtons)}else{E.hideButtons=f.extend({},e)}if(l(E.idPrefix)){if(l(I.id)||I.id==""){E.idPrefix="ag"+new Date().getTime()}else{E.idPrefix=I.id}}A=document.createElement("thead");A.className="ui-widget-header";M=document.createElement("tbody");M.className="ui-widget-content";C=document.createElement("tfoot");C.className="ui-widget-header";f(I).empty().addClass("appendGrid ui-widget").append(A,M,C);F=A.insertRow(-1);if(!E.hideRowNumColumn){B=F.insertCell(-1);B.className="ui-widget-header"}for(var K=0;K<E.columns.length;K++){var H=f.extend({},u,E.columns[K]);E.columns[K]=H;if(E.columns[K].type!="hidden"){E._visibleCount++;B=F.insertCell(-1);B.className="ui-widget-header";f(B).text(E.columns[K].display);if(E.columns[K].displayCss){f(B).css(E.columns[K].displayCss)}}}if(E.hideButtons.insert&&E.hideButtons.remove&&E.hideButtons.moveUp&&E.hideButtons.moveDown&&(!f.isArray(E.customRowButtons)||E.customRowButtons.length==0)){E._hideLastColumn=true}E._finalColSpan=E._visibleCount;if(!E.hideRowNumColumn){E._finalColSpan++}if(!E._hideLastColumn){E._finalColSpan++}if(!E._hideLastColumn){B=F.insertCell(-1);B.className="ui-widget-header"}if(E.caption){F=A.insertRow(0);B=F.insertCell(-1);B.className="ui-state-active caption";B.colSpan=E._finalColSpan;f(B).text(E.caption)}F=C.insertRow(-1);B=F.insertCell(-1);B.colSpan=E._finalColSpan;f("<input/>").attr({type:"hidden",id:E.idPrefix+"_rowOrder",name:E.idPrefix+"_rowOrder"}).appendTo(B);if(E.hideButtons.append&&E.hideButtons.removeLast&&(!f.isArray(E.customFooterButtons)||E.customFooterButtons.length==0)){F.style.display="none"}else{if(!E.hideButtons.append){f("<button/>").addClass("append",E._buttonClasses.append).attr({type:"button",title:E._i18n.append}).button({icons:{primary:"ui-icon-plusthick"},text:false}).click(function(){d(I,1,null,null)}).appendTo(B)}if(!E.hideButtons.removeLast){f("<button/>").addClass("removeLast",E._buttonClasses.removeLast).attr({type:"button",title:E._i18n.removeLast}).button({icons:{primary:"ui-icon-closethick"},text:false}).click(function(){i(I,null,this.value,false)}).appendTo(B)}if(E.customFooterButtons&&E.customFooterButtons.length){for(var L=E.customFooterButtons.length-1;L>=0;L--){var D=E.customFooterButtons[L];if(D&&D.uiButton&&D.click&&D.atTheFront){f(B).prepend(o(I,D))}}for(var L=0;L<E.customFooterButtons.length;L++){var D=E.customFooterButtons[L];if(D&&D.uiButton&&D.click&&!D.atTheFront){f(B).append(o(I,D))}}}}if(E.rowDragging){f(M).sortable({axis:"y",containment:I,handle:".rowDrag",helper:function(O,z){var P=z.children();var y=z.clone();y.children().each(function(Q){f(this).width(P.eq(Q).width())});return y},update:function(O,P){var y=P.item[0].id.substring(P.item[0].id.lastIndexOf("_")+1);var z=P.item[0].rowIndex-f("tr",A).length;n(I,P.originalPosition.top>P.position.top,y,z)}})}f(I).data("appendGrid",E);if(f.isArray(N.initData)){a(I,N.initData,true)}else{f(I).appendGrid("appendRow",E.initRows)}if(E._rowOrder.length==0){var G=f("<td></td>").text(E._i18n.rowEmpty).attr("colspan",E._finalColSpan);f("tbody",I).append(f("<tr></tr>").addClass("empty").append(G))}}return J},isReady:function(){var A=this,y=false;if(A.length>0){var z=A.first().data("appendGrid");if(z){y=true}}return y},isDataLoaded:function(){var A=this,y=null;if(this.length==1){var z=A.data("appendGrid");if(z){return z._isDataLoaded}else{return false}}else{return false}},load:function(y){var z=this;if(z.length>0){a(z[0],y,false)}return z},appendRow:function(y){return this.appendGrid("insertRow",y)},insertRow:function(B,F,z){var E=this;if(E.length>0){var y=E[0],D=null;var C=f(y).data("appendGrid");if(!C){alert(q.notInit)}else{if(B>0){D=d(y,B,F,z);if(f.isNumeric(F)||f.isNumeric(z)){r(y,D.rowIndex);var A=C._rowOrder[D.addedRows[0]];f("#"+C.idPrefix+"_Insert_"+A,y).focus()}}}}return E},removeRow:function(E,D){var C=this,F=-1;if(C.length>0){var B=C[0],y,G,A;var z=f(B).data("appendGrid");if(!z){alert(q.notInit)}else{if(z._rowOrder.length>0){i(B,E,D,true)}}}return C},moveUpRow:function(E,D){var C=this,F=-1;if(C.length>0){var B=C[0],I,H,y,A;var z=f(B).data("appendGrid");if(!z){alert(q.notInit)}else{var G=null;I=B.getElementsByTagName("tbody")[0];if(f.isNumeric(E)&&E>0&&E<z._rowOrder.length){G=E;D=z._rowOrder[E];H=document.getElementById(z.idPrefix+"_Row_"+D,B)}else{if(f.isNumeric(D)){G=g(D,z);H=document.getElementById(z.idPrefix+"_Row_"+D,B)}}if(G!=null&&G>0){y=document.getElementById(z.idPrefix+"_Row_"+z._rowOrder[G-1],B);I.removeChild(H);I.insertBefore(H,y);z._rowOrder[G]=z._rowOrder[G-1];z._rowOrder[G-1]=D;A=f("td.first",y).html();f("td.first",y).html(f("td.first",H).html());f("td.first",H).html(A);b(B,z);f("td.last button.moveUp",H).removeClass("ui-state-hover").blur();f("td.last button.moveUp",y).focus();if(z.afterRowSwapped){z.afterRowSwapped(B,G,G-1)}}}}return C},moveDownRow:function(E,D){var C=this,F=-1;if(C.length>0){var B=C[0],I,H,y,A;var z=f(B).data("appendGrid");if(!z){alert(q.notInit)}else{var G=null;I=B.getElementsByTagName("tbody")[0];if(f.isNumeric(E)&&E>=0&&E<z._rowOrder.length-1){G=E;D=z._rowOrder[E];H=document.getElementById(z.idPrefix+"_Row_"+D,B)}else{if(f.isNumeric(D)){G=g(D,z);H=document.getElementById(z.idPrefix+"_Row_"+D,B)}}if(G!=null&&G!=z._rowOrder.length-1){y=document.getElementById(z.idPrefix+"_Row_"+z._rowOrder[G+1],B);I.removeChild(y);I.insertBefore(y,H);z._rowOrder[G]=z._rowOrder[G+1];z._rowOrder[G+1]=D;A=f("td.first",y).html();f("td.first",y).html(f("td.first",H).html());f("td.first",H).html(A);b(B,z);f("td.last button.moveDown",H).removeClass("ui-state-hover").blur();f("td.last button.moveDown",y).focus();if(z.afterRowSwapped){z.afterRowSwapped(B,G,G+1)}}}}return C},getRowCount:function(){var z=this;if(z.length>0){var y=z.data("appendGrid");if(y){return y._rowOrder.length}else{alert(q.notInit)}}else{alert(q.getValueMultiGrid)}return null},getUniqueIndex:function(A){var z=this;if(z.length>0&&A>=0){var y=z.data("appendGrid");if(y){if(A<y._rowOrder.length){return y._rowOrder[A]}}else{alert(q.notInit)}}return null},getRowIndex:function(y){var B=this;if(B.length>0){var A=B.data("appendGrid");if(A){for(var C=0;C<A._rowOrder.length;C++){if(A._rowOrder[C]==y){return C}}return null}else{alert(q.notInit)}}return null},getRowValue:function(D,z,C){var B=this,y=null;if(B.length>0){var A=B.data("appendGrid");if(A){if(f.isNumeric(D)&&D>=0&&D<A._rowOrder.length){z=A._rowOrder[D]}if(!l(z)){y=h(A,z,C)}}else{alert(q.notInit)}}return y},getAllValue:function(C){var D=this,y=null,A;if(D.length>0){var B=f(D).data("appendGrid");if(B){y=C?{}:[];for(var E=0;E<B._rowOrder.length;E++){if(C){A=h(B,B._rowOrder[E],E);f.extend(y,A)}else{A=h(B,B._rowOrder[E]);y.push(A)}}if(C){y._RowCount=B._rowOrder.length}}}return y},getCtrlValue:function(y,C){var A=this;if(A.length>0){settings=A.data("appendGrid");if(settings&&C>=0&&C<settings._rowOrder.length){for(var B=0;B<settings.columns.length;B++){if(settings.columns[B].name===y){return c(settings,B,settings._rowOrder[C])}}}}return null},setCtrlValue:function(A,F,C){var D=this;if(D.length>0){var y=this,B=f(this).data("appendGrid");if(B&&F>=0&&F<B._rowOrder.length){for(var E=0;E<B.columns.length;E++){if(B.columns[E].name==A){m(B,E,B._rowOrder[F],C);break}}}}return D},getCellCtrl:function(B,A){var C=this,y=null;if(C.length==1){settings=C.data("appendGrid");if(!settings){alert(q.notInit)}else{for(var D=0;D<settings.columns.length;D++){if(settings.columns[D].name===B){return t(settings.columns[D].type,settings.idPrefix,B,A);break}}}}return null},getCellCtrlByRowIndex:function(B,E){var C=this,y=null;if(C.length==1){settings=C.data("appendGrid");if(!settings){alert(q.notInit)}else{if(E>=0&&E<settings._rowOrder.length){var A=settings._rowOrder[E];for(var D=0;D<settings.columns.length;D++){if(settings.columns[D].name===B){return t(settings.columns[D].type,settings.idPrefix,B,A)}}}}}return null},setCellCtrlByRowIndex:function(B,F,C){var D=this,y=null;if(D.length==1){settings=D.data("appendGrid");if(!settings){alert(q.notInit)}else{if(F>=0&&F<settings._rowOrder.length){var A=settings._rowOrder[F];for(var E=0;E<settings.columns.length;E++){if(settings.columns[E].name===B){return setCellCtrl(settings.columns[E].type,settings.idPrefix,B,A,C)}}}}}return null},getRowOrder:function(){var A=this,y=null;if(this.length==1){var z=A.data("appendGrid");if(z){y=z._rowOrder.slice()}else{alert(q.notInit)}}else{alert(q.getValueMultiGrid)}return y}};function d(M,E,L,I){var R=f(M).data("appendGrid");var Q=[],A=null,B,J,O=[];var C=M.getElementsByTagName("thead")[0];var G=M.getElementsByTagName("tbody")[0];if(f.isNumeric(I)){for(var F=0;F<R._rowOrder.length;F++){if(R._rowOrder[F]==I){L=F;if(F!=0){A=F-1}break}}}else{if(f.isNumeric(L)){if(L>=R._rowOrder.length){L=null}else{A=L-1}}else{if(R._rowOrder.length!=0){L=null;A=R._rowOrder.length-1}}}if(R._rowOrder.length==0){f("tr.empty",M).remove()}for(var F=0;F<E;F++){R._uniqueIndex++;B=R._uniqueIndex;O.length=0;if(f.isNumeric(L)){R._rowOrder.splice(L,0,B);tbRow=G.insertRow(L);Q.push(L)}else{R._rowOrder.push(B);tbRow=G.insertRow(-1);Q.push(R._rowOrder.length-1)}tbRow.id=R.idPrefix+"_Row_"+B;f(tbRow).data("appendGrid",B);if(!R.hideRowNumColumn){tbCell=tbRow.insertCell(-1);f(tbCell).addClass("ui-widget-content first").text(R._rowOrder.length)}for(var H=0;H<R.columns.length;H++){if(R.columns[H].type=="hidden"){O.push(H);continue}tbCell=tbRow.insertCell(-1);tbCell.className="ui-widget-content";if(R.columns[H].cellCss!=null){f(tbCell).css(R.columns[H].cellCss)}J=null;if(R.columns[H].type=="custom"){if(typeof(R.columns[H].customBuilder)=="function"){J=R.columns[H].customBuilder(tbCell,R.idPrefix,R.columns[H].name,B)}}else{if(R.columns[H].type=="select"){J=document.createElement("select");J.id=R.idPrefix+"_"+R.columns[H].name+"_"+B;J.name=J.id;if(f.isArray(R.columns[H].ctrlOptions)){if(R.columns[H].ctrlOptions.length>0){if(f.isPlainObject(R.columns[H].ctrlOptions[0])){for(var K=0;K<R.columns[H].ctrlOptions.length;K++){J.options[J.options.length]=new Option(R.columns[H].ctrlOptions[K].label,R.columns[H].ctrlOptions[K].value)}}else{for(var K=0;K<R.columns[H].ctrlOptions.length;K++){J.options[J.options.length]=new Option(R.columns[H].ctrlOptions[K],R.columns[H].ctrlOptions[K])}}}}else{if(f.isPlainObject(R.columns[H].ctrlOptions)){for(var K in R.columns[H].ctrlOptions){J.options[J.options.length]=new Option(R.columns[H].ctrlOptions[K],K)}}else{if(typeof(R.columns[H].ctrlOptions)=="string"){var P=R.columns[H].ctrlOptions.split(";");for(var K=0;K<P.length;K++){var S=P[K].indexOf(":");if(-1==S){J.options[J.options.length]=new Option(P[K],P[K])}else{J.options[J.options.length]=new Option(P[K].substring(S+1,P[K].length),P[K].substring(0,S))}}}}}tbCell.appendChild(J)}else{if(R.columns[H].type=="checkbox"){J=document.createElement("input");J.type="checkbox";J.id=R.idPrefix+"_"+R.columns[H].name+"_"+B;J.name=J.id;J.value=1;tbCell.appendChild(J);tbCell.style.textAlign="center"}else{if(-1!=R.columns[H].type.search(/^(color|date|datetime|datetime\-local|email|month|number|range|search|tel|time|url|week)$/)){J=document.createElement("input");try{J.type=R.columns[H].type}catch(D){}J.id=R.idPrefix+"_"+R.columns[H].name+"_"+B;J.name=J.id;tbCell.appendChild(J)}else{J=document.createElement("input");J.type="text";J.id=R.idPrefix+"_"+R.columns[H].name+"_"+B;J.name=J.id;tbCell.appendChild(J);if(R.columns[H].type=="ui-datepicker"){f(J).datepicker(R.columns[H].uiOption)}else{if(R.columns[H].type=="ui-spinner"){f(J).spinner(R.columns[H].uiOption)}else{if(R.columns[H].type=="ui-autocomplete"){f(J).autocomplete(R.columns[H].uiOption)}}}}}}}if(R.columns[H].type!="custom"){if(R.columns[H].ctrlAttr!=null){f(J).attr(R.columns[H].ctrlAttr)}if(R.columns[H].ctrlProp!=null){f(J).prop(R.columns[H].ctrlProp)}if(R.columns[H].ctrlCss!=null){f(J).css(R.columns[H].ctrlCss)}if(R.columns[H].ctrlClass!=null){f(J).addClass(R.columns[H].ctrlClass)}if(R.columns[H].uiTooltip){f(J).tooltip(R.columns[H].uiTooltip)}if(typeof(R.columns[H].onClick)=="function"){f(J).click({caller:M,callback:R.columns[H].onClick,uniqueIndex:B},function(y){y.data.callback(y,f(y.data.caller).appendGrid("getRowIndex",y.data.uniqueIndex))})}if(typeof(R.columns[H].onChange)=="function"){f(J).change({caller:M,callback:R.columns[H].onChange,uniqueIndex:B},function(y){y.data.callback(y,f(y.data.caller).appendGrid("getRowIndex",y.data.uniqueIndex))})}}if(!l(R.columns[H].value)){m(R,H,B,R.columns[H].value)}}if(!R._hideLastColumn||R.columns.length>R._visibleCount){tbCell=tbRow.insertCell(-1);tbCell.className="ui-widget-content last";if(R._hideLastColumn){tbCell.style.display="none"}if(!R.hideButtons.insert){f(tbCell).append(f("<button/>").addClass("insert",R._buttonClasses.insert).val(B).attr({id:R.idPrefix+"_Insert_"+B,type:"button",title:R._i18n.insert,tabindex:-1}).button({icons:{primary:"ui-icon-arrowreturnthick-1-w"},text:false}).click(function(){f(M).appendGrid("insertRow",1,null,this.value)}))}if(!R.hideButtons.remove){f(tbCell).append(f("<button/>").addClass("remove",R._buttonClasses.remove).val(B).attr({id:R.idPrefix+"_Delete_"+B,type:"button",title:R._i18n.remove,tabindex:-1}).button({icons:{primary:"ui-icon-trash"},text:false}).click(function(){i(M,null,this.value,false)}))}if(!R.hideButtons.moveUp){f(tbCell).append(f("<button/>").addClass("moveUp",R._buttonClasses.moveUp).val(B).attr({id:R.idPrefix+"_MoveUp_"+B,type:"button",title:R._i18n.moveUp,tabindex:-1}).button({icons:{primary:"ui-icon-arrowthick-1-n"},text:false}).click(function(){f(M).appendGrid("moveUpRow",null,this.value)}))}if(!R.hideButtons.moveDown){f(tbCell).append(f("<button/>").addClass("moveDown",R._buttonClasses.moveDown).val(B).attr({id:R.idPrefix+"_MoveDown_"+B,type:"button",title:R._i18n.moveDown,tabindex:-1}).button({icons:{primary:"ui-icon-arrowthick-1-s"},text:false}).click(function(){f(M).appendGrid("moveDownRow",null,this.value)}))}if(R.rowDragging){f("<div/>").addClass("rowDrag ui-state-default ui-corner-all",R._buttonClasses.rowDrag).attr("title",R._i18n.rowDrag).append(f("<div/>").addClass("ui-icon ui-icon-carat-2-n-s")).appendTo(tbCell)}for(var H=0;H<O.length;H++){J=document.createElement("input");J.id=R.idPrefix+"_"+R.columns[O[H]].name+"_"+B;J.name=J.id;J.type="hidden";if(!l(R.columns[O[H]].value)){J.value=R.columns[O[H]].value}tbCell.appendChild(J)}if(R.customRowButtons&&R.customRowButtons.length){for(var H=R.customRowButtons.length-1;H>=0;H--){var N=R.customRowButtons[H];if(N&&N.uiButton&&N.click&&N.atTheFront){f(tbCell).prepend(v(M,N,B))}}for(var H=0;H<R.customRowButtons.length;H++){var N=R.customRowButtons[H];if(N&&N.uiButton&&N.click&&!N.atTheFront){f(tbCell).append(v(M,N,B))}}}}}b(M,R);if(f.isNumeric(L)){if(typeof(R.afterRowInserted)=="function"){R.afterRowInserted(M,A,Q)}}else{if(typeof(R.afterRowAppended)=="function"){R.afterRowAppended(M,A,Q)}}return{addedRows:Q,parentIndex:A,rowIndex:L}}function o(y,A){var z=f("<button/>").attr({type:"button",tabindex:-1}).button(A.uiButton).click({tbWhole:y},A.click);if(A.btnClass){z.addClass(A.btnClass)}if(A.btnCss){z.css(A.btnCss)}if(A.btnAttr){z.attr(A.btnAttr)}return z}function v(z,B,y){var A=f("<button/>").val(y).attr({type:"button",tabindex:-1}).button(B.uiButton).click({tbWhole:z,uniqueIndex:y},function(C){var D=f(C.data.tbWhole).appendGrid("getRowValue",null,C.data.uniqueIndex);B.click(C,C.data.uniqueIndex,D)});if(B.btnClass){A.addClass(B.btnClass)}if(B.btnCss){A.css(B.btnCss)}if(B.btnAttr){A.attr(B.btnAttr)}return A}function i(A,G,y,D){var B=f(A).data("appendGrid");var F=A.getElementsByTagName("tbody")[0];if(f.isNumeric(y)){for(var E=0;E<B._rowOrder.length;E++){if(B._rowOrder[E]==y){G=E;break}}}if(f.isNumeric(G)){if(D||typeof(B.beforeRowRemove)!="function"||B.beforeRowRemove(A,G)){B._rowOrder.splice(G,1);F.deleteRow(G);b(A,B);r(A,G);if(typeof(B.afterRowRemoved)=="function"){B.afterRowRemoved(A,G)}}}else{if(D||typeof(B.beforeRowRemove)!="function"||B.beforeRowRemove(A,B._rowOrder.length-1)){y=B._rowOrder.pop();F.deleteRow(-1);b(A,B);if(typeof(B.afterRowRemoved)=="function"){B.afterRowRemoved(A,null)}}}if(B._rowOrder.length==0){var C=f("<td></td>").text(B._i18n.rowEmpty).attr("colspan",B._finalColSpan);f("tbody",A).append(f("<tr></tr>").addClass("empty").append(C))}}function r(y,C){var A=f(y).data("appendGrid");if(!A.hideRowNumColumn){for(var B=C;B<A._rowOrder.length;B++){f("#"+A.idPrefix+"_Row_"+A._rowOrder[B]+" td.first",y).text(B+1)}}}function a(E,A,D){var I,C,z,F,H;var B=f(E).data("appendGrid");if(B){I=E.getElementsByTagName("tbody")[0];f(I).empty();B._rowOrder.length=0;B._uniqueIndex=0;if(A!=null&&A.length){H=d(E,A.length,null,null);for(var y=0;y<H.addedRows.length;y++){for(var G=0;G<B.columns.length;G++){m(B,G,B._rowOrder[y],A[y][B.columns[G].name])}}}B._isDataLoaded=true;if(D){B.initData=null}f(E).data("appendGrid",B);if(typeof(B.dataLoaded)=="function"){B.dataLoaded(E)}}}function g(y,A){for(var B=0;B<A._rowOrder.length;B++){if(A._rowOrder[B]==y){return B}}return null}function l(y){return typeof(y)=="undefined"||y==null}function x(z,y){if(!l(z)&&f.isPlainObject(z)&&!l(z[y])){return z[y]}return null}function b(y,z){f(y).data("appendGrid",z);f("#"+z.idPrefix+"_rowOrder",y).val(z._rowOrder.join())}function w(A,y){var C=null;for(var B=0;B<A._rowOrder.length;B++){if(A._rowOrder[B]==y){return B}}return C}function h(C,A,E){var y={},B=null;for(var D=0;D<C.columns.length;D++){B=C.columns[D].name+(l(E)?"":"_"+E);y[B]=c(C,D,A)}return y}function c(C,A,y){var D=null,B=C.columns[A].type,z=C.columns[A].name;if(B=="checkbox"){D=t(B,C.idPrefix,z,y);if(D==null){return null}else{return D.checked?1:0}}else{if(B=="custom"){if(typeof(C.columns[A].customGetter)=="function"){return C.columns[A].customGetter(C.idPrefix,z,y)}else{return null}}else{D=t(B,C.idPrefix,z,y);if(D==null){return null}else{return D.value}}}}function t(A,B,z,y){return document.getElementById(B+"_"+z+"_"+y)}function m(C,A,y,D){var B=C.columns[A].type;var z=C.columns[A].name;if(B=="checkbox"){t(B,C.idPrefix,z,y).checked=(D!=null&&D!=0)}else{if(B=="custom"){if(typeof(C.columns[A].customSetter)=="function"){C.columns[A].customSetter(C.idPrefix,z,y,D)}}else{t(B,C.idPrefix,z,y).value=(D==null?"":D)}}}function n(A,F,y,B){var C=f(A).data("appendGrid");var E=-1;for(var D=0;D<C._rowOrder.length;D++){if(C._rowOrder[D]==y){if(F){E=B;C._rowOrder.splice(D,1);C._rowOrder.splice(B,0,y)}else{E=D;C._rowOrder.splice(B+1,0,y);C._rowOrder.splice(D,1)}break}}r(A,E);b(A,C)}f.fn.appendGrid=function(y){if(j[y]){return j[y].apply(this,Array.prototype.slice.call(arguments,1))}else{if(typeof(y)==="object"||!y){return j.init.apply(this,arguments)}else{f.error(q.notSupportMethod+y)}}}})(jQuery);
﻿/*!
* jQuery appendGrid v1.3.1
* https://appendgrid.apphb.com/
*
* Copyright 2014 Albert L.
* Dual licensed under the LGPL (http://www.gnu.org/licenses/lgpl.html)
* and MIT (http://www.opensource.org/licenses/mit-license.php) licenses.
*
* Depends:
* jQuery v1.9.1+
* jquery UI v1.10.2+
*/
(function ($) {
    // The default initial options.
    var _defaultInitOptions = {
        // The text as table caption, set null to disable caption generation.
        caption: null,
        // The total number of empty rows generated when init the grid. This will be ignored if `initData` is assigned.
        initRows: 3,
        // An array of data to be filled after initialized the grid.
        initData: null,
        // Array of column options.
        columns: null,
        // Labels or messages used in grid.
        i18n: null,
        // The ID prefix of controls generated inside the grid. Table ID will be used if not defined.
        idPrefix: null,
        // Enable row dragging by using jQuery UI sortable on grid rows.
        rowDragging: false,
        // Hide the buttons at the end of rows or bottom of grid.
        hideButtons: null,
        // Hide the row number column.
        hideRowNumColumn: false,
        // The extra class names for buttons.
        buttonClasses: null,
        // Adding extra button(s) at the end of rows.
        customRowButtons: null,
        // Adding extra button(s) at the bottom of grid.
        customFooterButtons: null,
        // The callback function to be triggered after data loaded to grid.
        dataLoaded: null,
        // The callback function to be triggered after new row appended.
        afterRowAppended: null,
        // The callback function to be triggered after new row inserted.
        afterRowInserted: null,
        // The callback function to be triggered after grid row swapped.
        afterRowSwapped: null,
        // The callback function to be triggered before grid row remove.
        beforeRowRemove: null,
        // The callback function to be triggered after grid row removed.
        afterRowRemoved: null
    };
    // Default column options.
    var _defaultColumnOptions = {
        // Type of column control.
        type: 'text',
        // Name of column.
        name: null,
        // Default value.
        value: null,
        // Display text on the header section.
        display: null,
        // Extra CSS setting to be added to display text.
        displayCss: null,
        // Extra CSS setting to be added to the control container table cell.
        cellCss: null,
        // Extra attributes to be added to the control.
        ctrlAttr: null,
        // Extra properties to be added to the control.
        ctrlProp: null,
        // Extra CSS to be added to the control.
        ctrlCss: null,
        // Extra name of class to be added to the control.
        ctrlClass: null,
        // The available option for building `select` type control.
        ctrlOptions: null,
        // Options for initalize jQuery UI widget.
        uiOption: null,
        // Options for initalize jQuery UI tooltip.
        uiTooltip: null,
        // Callback function to build custom type control.
        customBuilder: null,
        // Callback function to get control value.
        customGetter: null,
        // Callback function to set control value.
        customSetter: null,
        // The `OnClick` event callback of control.
        onClick: null,
        // The `OnChange` event callback of control.
        onChange: null
    };
    var _systemMessages = {
        noColumnInfo: 'Cannot initial grid without column information!',
        elemNotTable: 'Cannot initial grid on element other than TABLE!',
        notInit: '`appendGrid` does not initialized',
        getValueMultiGrid: 'Cannot get values on multiple grid',
        notSupportMethod: 'Method is not supported by `appendGrid`: '
    };
    var _defaultTextResources = {
        append: 'Append Row',
        removeLast: 'Remove Last Row',
        insert: 'Insert Row Above',
        remove: 'Remove Current Row',
        moveUp: 'Move Up',
        moveDown: 'Move Down',
        rowDrag: 'Sort Row',
        rowEmpty: 'This Grid Is Empty'
    };
    var _defaultButtonClasses = { append: null, removeLast: null, insert: null, remove: null, moveUp: null, moveDown: null, rowDrag: null };
    var _defaultHideButtons = { append: false, removeLast: false, insert: false, remove: false, moveUp: false, moveDown: false };
    var _methods = {
        init: function (options) {
            var target = this;
            var tbWhole, tbHead, tbBody, tbFoot, tbRow, tbCell;
            if (target.length > 0) {
                // Check mandatory paramters included
                if (!$.isArray(options.columns) || options.columns.length == 0) {
                    alert(_systemMessages.noColumnInfo);
                    return target;
                }
                // Check target element is table or not
                tbWhole = target[0];
                if (isEmpty(tbWhole.tagName) || tbWhole.tagName != 'TABLE') {
                    alert(_systemMessages.elemNotTable);
                    return target;
                }
                // Generate settings
                var settings = $.extend({}, _defaultInitOptions, options);
                // Add internal settings
                $.extend(settings, {
                    //The UniqueIndex accumulate counter.
                    _uniqueIndex: 0,
                    // The row order array.
                    _rowOrder: [],
                    // Indicate data is loaded or not.
                    _isDataLoaded: false,
                    // Visible column count for internal calculation.
                    _visibleCount: 0,
                    // Total colSpan count after excluding `hideRowNumColumn` and not generating last column.
                    _finalColSpan: 0,
                    // Indicate to hide last column or not
                    _hideLastColumn: false
                });
                // Labels or messages used in grid.
                if ($.isPlainObject(options.i18n))
                    settings._i18n = $.extend({}, _defaultTextResources, options.i18n);
                else
                    settings._i18n = $.extend({}, _defaultTextResources);
                // The extra class names for buttons.
                if ($.isPlainObject(options.buttonClasses))
                    settings._buttonClasses = $.extend({}, _defaultButtonClasses, options.buttonClasses);
                else
                    settings._buttonClasses = $.extend({}, _defaultButtonClasses);
                // Make sure the `hideButtons` setting defined
                if ($.isPlainObject(options.hideButtons))
                    settings.hideButtons = $.extend({}, _defaultHideButtons, options.hideButtons);
                else
                    settings.hideButtons = $.extend({}, _defaultHideButtons);
                // Check `idPrefix` is defined
                if (isEmpty(settings.idPrefix)) {
                    // Check table ID defined
                    if (isEmpty(tbWhole.id) || tbWhole.id == '') {
                        // Generate an ID using current time
                        settings.idPrefix = 'ag' + new Date().getTime();
                    }
                    else {
                        settings.idPrefix = tbWhole.id;
                    }
                }
                // Create thead and tbody
                tbHead = document.createElement('thead');
                tbHead.className = 'ui-widget-header';
                tbBody = document.createElement('tbody');
                tbBody.className = 'ui-widget-content';
                tbFoot = document.createElement('tfoot');
                tbFoot.className = 'ui-widget-header';
                // Remove existing content and append new thead and tbody
                $(tbWhole).empty().addClass('appendGrid ui-widget').append(tbHead, tbBody, tbFoot);
                // Handle header row
                tbRow = tbHead.insertRow(-1);
                if (!settings.hideRowNumColumn) {
                    tbCell = tbRow.insertCell(-1);
                    tbCell.className = 'ui-widget-header';
                }
                // Prepare column information and add column header
                for (var z = 0; z < settings.columns.length; z++) {
                    // Assign default setting
                    var columnOpt = $.extend({}, _defaultColumnOptions, settings.columns[z]);
                    settings.columns[z] = columnOpt;
                    // Skip hidden
                    if (settings.columns[z].type != 'hidden') {
                        settings._visibleCount++;
                        tbCell = tbRow.insertCell(-1);
                        tbCell.className = 'ui-widget-header';
                        $(tbCell).text(settings.columns[z].display);
                        if (settings.columns[z].displayCss) $(tbCell).css(settings.columns[z].displayCss);
                    }
                }
                // Check to hide last column or not
                if (settings.hideButtons.insert && settings.hideButtons.remove
                        && settings.hideButtons.moveUp && settings.hideButtons.moveDown
                        && (!$.isArray(settings.customRowButtons) || settings.customRowButtons.length == 0)) {
                    settings._hideLastColumn = true;
                }
                // Calculate the `_finalColSpan` value
                settings._finalColSpan = settings._visibleCount;
                if (!settings.hideRowNumColumn) settings._finalColSpan++;
                if (!settings._hideLastColumn) settings._finalColSpan++;
                // Generate last column header if needed
                if (!settings._hideLastColumn) {
                    tbCell = tbRow.insertCell(-1);
                    tbCell.className = 'ui-widget-header';
                }
                // Add caption when defined
                if (settings.caption) {
                    tbRow = tbHead.insertRow(0);
                    tbCell = tbRow.insertCell(-1);
                    tbCell.className = 'ui-state-active caption';
                    tbCell.colSpan = settings._finalColSpan;
                    $(tbCell).text(settings.caption);
                }
                // Handle footer row
                tbRow = tbFoot.insertRow(-1);
                tbCell = tbRow.insertCell(-1);
                tbCell.colSpan = settings._finalColSpan;
                $('<input/>').attr({
                    type: 'hidden',
                    id: settings.idPrefix + '_rowOrder',
                    name: settings.idPrefix + '_rowOrder'
                }).appendTo(tbCell);
                // Make row invisible if all buttons are hidden
                if (settings.hideButtons.append && settings.hideButtons.removeLast
                        && (!$.isArray(settings.customFooterButtons) || settings.customFooterButtons.length == 0)) {
                    tbRow.style.display = 'none';
                } else {
                    if (!settings.hideButtons.append) {
                        $('<button/>').addClass('append', settings._buttonClasses.append).attr({ type: 'button', title: settings._i18n.append })
                        .button({ icons: { primary: 'ui-icon-plusthick' }, text: false }).click(function () {
                            insertRow(tbWhole, 1, null, null);
                        }).appendTo(tbCell);
                    }
                    if (!settings.hideButtons.removeLast) {
                        $('<button/>').addClass('removeLast', settings._buttonClasses.removeLast).attr({ type: 'button', title: settings._i18n.removeLast })
                        .button({ icons: { primary: 'ui-icon-closethick' }, text: false }).click(function () {
                            removeRow(tbWhole, null, this.value, false);
                        }).appendTo(tbCell);
                    }
                    if (settings.customFooterButtons && settings.customFooterButtons.length) {
                        // Add front buttons
                        for (var y = settings.customFooterButtons.length - 1; y >= 0; y--) {
                            var buttonCfg = settings.customFooterButtons[y];
                            if (buttonCfg && buttonCfg.uiButton && buttonCfg.click && buttonCfg.atTheFront) {
                                $(tbCell).prepend(makeCustomBottomButton(tbWhole, buttonCfg));
                            }
                        }
                        // Add end buttons
                        for (var y = 0; y < settings.customFooterButtons.length; y++) {
                            var buttonCfg = settings.customFooterButtons[y];
                            if (buttonCfg && buttonCfg.uiButton && buttonCfg.click && !buttonCfg.atTheFront) {
                                $(tbCell).append(makeCustomBottomButton(tbWhole, buttonCfg));
                            }
                        }
                    }
                }
                // Enable dragging
                if (settings.rowDragging) {
                    $(tbBody).sortable({
                        axis: 'y',
                        containment: tbWhole,
                        handle: '.rowDrag',
                        helper: function (e, tr) {
                            var org = tr.children();
                            var helper = tr.clone();
                            helper.children().each(function (index) {
                                $(this).width(org.eq(index).width());
                            });
                            return helper;
                        },
                        update: function (event, ui) {
                            var uniqueIndex = ui.item[0].id.substring(ui.item[0].id.lastIndexOf('_') + 1);
                            var tbRowIndex = ui.item[0].rowIndex - $('tr', tbHead).length;
                            gridRowDragged(tbWhole, ui.originalPosition.top > ui.position.top, uniqueIndex, tbRowIndex);
                        }
                    });
                }
                // Save options
                $(tbWhole).data('appendGrid', settings);
                if ($.isArray(options.initData)) {
                    // Load data if initData is array
                    loadData(tbWhole, options.initData, true);
                } else {
                    // Add empty rows
                    $(tbWhole).appendGrid('appendRow', settings.initRows);
                }
                // Show no rows in grid
                if (settings._rowOrder.length == 0) {
                    var empty = $('<td></td>').text(settings._i18n.rowEmpty).attr('colspan', settings._finalColSpan);
                    $('tbody', tbWhole).append($('<tr></tr>').addClass('empty').append(empty));
                }
            }
            return target;
        },
        isReady: function () {
            // Check the appendGrid is initialized or not
            var target = this, result = false;
            if (target.length > 0) {
                var settings = target.first().data('appendGrid');
                if (settings) {
                    result = true;
                }
            }
            return result;
        },
        isDataLoaded: function () {
            // Check the grid data is loaded by `load` method or `initData` parameter or not
            var target = this, result = null;
            if (this.length == 1) {
                var settings = target.data('appendGrid');
                if (settings) {
                    return settings._isDataLoaded;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        },
        load: function (records) {
            var target = this;
            if (target.length > 0) {
                loadData(target[0], records, false);
            }
            return target;
        },
        appendRow: function (numOfRow) {
            return this.appendGrid('insertRow', numOfRow);
        },
        insertRow: function (numOfRow, rowIndex, callerUniqueIndex) {
            var target = this;
            if (target.length > 0) {
                var tbWhole = target[0], insertResult = null;
                var settings = $(tbWhole).data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else if (numOfRow > 0) {
                    // Define variables
                    insertResult = insertRow(tbWhole, numOfRow, rowIndex, callerUniqueIndex);
                    // Reorder sequence as needed
                    if ($.isNumeric(rowIndex) || $.isNumeric(callerUniqueIndex)) {
                        // Sort sequence
                        sortSequence(tbWhole, insertResult.rowIndex);
                        // Move focus
                        var insertUniqueIndex = settings._rowOrder[insertResult.addedRows[0]];
                        $('#' + settings.idPrefix + '_Insert_' + insertUniqueIndex, tbWhole).focus();
                    }
                }
            }
            return target;
        },
        removeRow: function (rowIndex, uniqueIndex) {
            var target = this, tbodyIndex = -1;
            if (target.length > 0) {
                var tbWhole = target[0], tbHead, tbBody, tbRow;
                var settings = $(tbWhole).data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else if (settings._rowOrder.length > 0) {
                    removeRow(tbWhole, rowIndex, uniqueIndex, true);
                }
            }
            return target;
        },
        moveUpRow: function (rowIndex, uniqueIndex) {
            var target = this, tbodyIndex = -1;
            if (target.length > 0) {
                var tbWhole = target[0], tbBody, trTarget, trSwap, swapSeq;
                var settings = $(tbWhole).data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    var oldIndex = null;
                    tbBody = tbWhole.getElementsByTagName('tbody')[0];
                    if ($.isNumeric(rowIndex) && rowIndex > 0 && rowIndex < settings._rowOrder.length) {
                        oldIndex = rowIndex;
                        uniqueIndex = settings._rowOrder[rowIndex];
                        trTarget = document.getElementById(settings.idPrefix + '_Row_' + uniqueIndex, tbWhole);
                    } else if ($.isNumeric(uniqueIndex)) {
                        oldIndex = findRowIndex(uniqueIndex, settings);
                        trTarget = document.getElementById(settings.idPrefix + '_Row_' + uniqueIndex, tbWhole);
                    }
                    if (oldIndex != null && oldIndex > 0) {
                        // Get row to swap
                        trSwap = document.getElementById(settings.idPrefix + '_Row_' + settings._rowOrder[oldIndex - 1], tbWhole);
                        // Remove current row
                        tbBody.removeChild(trTarget);
                        // Insert before the above row
                        tbBody.insertBefore(trTarget, trSwap);
                        // Update rowOrder
                        settings._rowOrder[oldIndex] = settings._rowOrder[oldIndex - 1];
                        settings._rowOrder[oldIndex - 1] = uniqueIndex;
                        // Update row label
                        swapSeq = $('td.first', trSwap).html();
                        $('td.first', trSwap).html($('td.first', trTarget).html());
                        $('td.first', trTarget).html(swapSeq)
                        // Save setting
                        saveSetting(tbWhole, settings);
                        // Change focus
                        $('td.last button.moveUp', trTarget).removeClass('ui-state-hover').blur();
                        $('td.last button.moveUp', trSwap).focus();
                        // Trigger event
                        if (settings.afterRowSwapped) {
                            settings.afterRowSwapped(tbWhole, oldIndex, oldIndex - 1);
                        }
                    }
                }
            }
            return target;
        },
        moveDownRow: function (rowIndex, uniqueIndex) {
            var target = this, tbodyIndex = -1;
            if (target.length > 0) {
                var tbWhole = target[0], tbBody, trTarget, trSwap, swapSeq;
                var settings = $(tbWhole).data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    var oldIndex = null;
                    tbBody = tbWhole.getElementsByTagName('tbody')[0];
                    if ($.isNumeric(rowIndex) && rowIndex >= 0 && rowIndex < settings._rowOrder.length - 1) {
                        oldIndex = rowIndex;
                        uniqueIndex = settings._rowOrder[rowIndex];
                        trTarget = document.getElementById(settings.idPrefix + '_Row_' + uniqueIndex, tbWhole);
                    } else if ($.isNumeric(uniqueIndex)) {
                        oldIndex = findRowIndex(uniqueIndex, settings);
                        trTarget = document.getElementById(settings.idPrefix + '_Row_' + uniqueIndex, tbWhole);
                    }
                    if (oldIndex != null && oldIndex != settings._rowOrder.length - 1) {
                        // Get row to swap
                        trSwap = document.getElementById(settings.idPrefix + '_Row_' + settings._rowOrder[oldIndex + 1], tbWhole);
                        // Remove current row
                        tbBody.removeChild(trSwap);
                        // Insert before the above row
                        tbBody.insertBefore(trSwap, trTarget);
                        // Update rowOrder
                        settings._rowOrder[oldIndex] = settings._rowOrder[oldIndex + 1];
                        settings._rowOrder[oldIndex + 1] = uniqueIndex;
                        // Update row label
                        swapSeq = $('td.first', trSwap).html();
                        $('td.first', trSwap).html($('td.first', trTarget).html());
                        $('td.first', trTarget).html(swapSeq)
                        // Save setting
                        saveSetting(tbWhole, settings);
                        // Change focus
                        $('td.last button.moveDown', trTarget).removeClass('ui-state-hover').blur();
                        $('td.last button.moveDown', trSwap).focus();
                        // Trigger event
                        if (settings.afterRowSwapped) {
                            settings.afterRowSwapped(tbWhole, oldIndex, oldIndex + 1);
                        }
                    }
                }
            }
            return target;
        },
        getRowCount: function () {
            var target = this;
            if (target.length > 0) {
                var settings = target.data('appendGrid');
                if (settings) {
                    return settings._rowOrder.length;
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            else {
                alert(_systemMessages.getValueMultiGrid);
            }
            return null;
        },
        getUniqueIndex: function (rowIndex) {
            var target = this;
            if (target.length > 0 && rowIndex >= 0) {
                var settings = target.data('appendGrid');
                if (settings) {
                    if (rowIndex < settings._rowOrder.length) {
                        return settings._rowOrder[rowIndex];
                    }
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            return null;
        },
        getRowIndex: function (uniqueIndex) {
            var target = this;
            if (target.length > 0) {
                var settings = target.data('appendGrid');
                if (settings) {
                    for (var z = 0; z < settings._rowOrder.length; z++) {
                        if (settings._rowOrder[z] == uniqueIndex) {
                            return z;
                        }
                    }
                    return null;
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            return null;
        },
        getRowValue: function (rowIndex, uniqueIndex, loopIndex) {
            var target = this, result = null;
            if (target.length > 0) {
                var settings = target.data('appendGrid');
                if (settings) {
                    if ($.isNumeric(rowIndex) && rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                        uniqueIndex = settings._rowOrder[rowIndex];
                    }
                    if (!isEmpty(uniqueIndex)) {
                        result = getRowValue(settings, uniqueIndex, loopIndex);
                    }
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            return result;
        },
        getAllValue: function (objectMode) {
            var target = this, result = null, rowValue;
            if (target.length > 0) {
                var settings = $(target).data('appendGrid');
                if (settings) {
                    // Prepare result based on objectMode setting
                    result = objectMode ? {} : [];
                    // Process on each rows
                    for (var z = 0; z < settings._rowOrder.length; z++) {
                        if (objectMode) {
                            rowValue = getRowValue(settings, settings._rowOrder[z], z);
                            $.extend(result, rowValue)
                        } else {
                            rowValue = getRowValue(settings, settings._rowOrder[z]);
                            result.push(rowValue);
                        }
                    }
                    if (objectMode) {
                        result['_RowCount'] = settings._rowOrder.length;
                    }
                }
            }
            return result;
        },
        getCtrlValue: function (name, rowIndex) {
            var target = this;
            if (target.length > 0) {
                settings = target.data('appendGrid');
                if (settings && rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                    for (var z = 0; z < settings.columns.length; z++) {
                        if (settings.columns[z].name === name) {
                            return getCtrlValue(settings, z, settings._rowOrder[rowIndex]);
                        }
                    }
                }
            }
            return null;
        },
        setCtrlValue: function (name, rowIndex, value) {
            var target = this;
            if (target.length > 0) {
                var tbWhole = this, settings = $(this).data('appendGrid');
                if (settings && rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                    for (var z = 0; z < settings.columns.length; z++) {
                        if (settings.columns[z].name == name) {
                            setCtrlValue(settings, z, settings._rowOrder[rowIndex], value);
                            break;
                        }
                    }
                }
            }
            return target;
        },
        getCellCtrl: function (name, uniqueIndex) {
            var target = this, result = null;
            if (target.length == 1) {
                settings = target.data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    for (var z = 0; z < settings.columns.length; z++) {
                        if (settings.columns[z].name === name) {
                            return getCellCtrl(settings.columns[z].type, settings.idPrefix, name, uniqueIndex);
                            break;
                        }
                    }
                }
            }
            return null;
        },
        getCellCtrlByRowIndex: function (name, rowIndex) {
            var target = this, result = null;
            if (target.length == 1) {
                settings = target.data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    if (rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                        var uniqueIndex = settings._rowOrder[rowIndex];
                        for (var z = 0; z < settings.columns.length; z++) {
                            if (settings.columns[z].name === name) {
                                return getCellCtrl(settings.columns[z].type, settings.idPrefix, name, uniqueIndex);
                            }
                        }
                    }
                }
            }
            return null;
        },
        setCellCtrlByRowIndex: function (name, rowIndex, value) {
            var target = this, result = null;
            if (target.length == 1) {
                settings = target.data('appendGrid');
                if (!settings) {
                    alert(_systemMessages.notInit);
                }
                else {
                    if (rowIndex >= 0 && rowIndex < settings._rowOrder.length) {
                        var uniqueIndex = settings._rowOrder[rowIndex];
                        for (var z = 0; z < settings.columns.length; z++) {
                            if (settings.columns[z].name === name) {
                                return setCellCtrl(settings.columns[z].type, settings.idPrefix, name, uniqueIndex, value);
                            }
                        }
                    }
                }
            }
            return null;
        },
        getRowOrder: function () {
            var target = this, result = null;
            if (this.length == 1) {
                var settings = target.data('appendGrid');
                if (settings) {
                    result = settings._rowOrder.slice();
                }
                else {
                    alert(_systemMessages.notInit);
                }
            }
            else {
                alert(_systemMessages.getValueMultiGrid);
            }
            return result;
        }
    };
    function insertRow(tbWhole, numOfRow, rowIndex, callerUniqueIndex) {
        // Define variables
        var settings = $(tbWhole).data('appendGrid');
        var addedRows = [], parentIndex = null, uniqueIndex, ctrl, hidden = [];
        var tbHead = tbWhole.getElementsByTagName('thead')[0];
        var tbBody = tbWhole.getElementsByTagName('tbody')[0];
        // Check parent row
        if ($.isNumeric(callerUniqueIndex)) {
            for (var z = 0; z < settings._rowOrder.length; z++) {
                if (settings._rowOrder[z] == callerUniqueIndex) {
                    rowIndex = z;
                    if (z != 0) parentIndex = z - 1;
                    break;
                }
            }
        }
        else if ($.isNumeric(rowIndex)) {
            if (rowIndex >= settings._rowOrder.length) {
                rowIndex = null;
            } else {
                parentIndex = rowIndex - 1;
            }
        }
        else if (settings._rowOrder.length != 0) {
            rowIndex = null;
            parentIndex = settings._rowOrder.length - 1;
        }
        // Remove empty row
        if (settings._rowOrder.length == 0) {
            $('tr.empty', tbWhole).remove();
        }
        // Add total number of row
        for (var z = 0; z < numOfRow; z++) {
            // Update variables
            settings._uniqueIndex++;
            uniqueIndex = settings._uniqueIndex;
            hidden.length = 0;
            // Check row insert index
            if ($.isNumeric(rowIndex)) {
                settings._rowOrder.splice(rowIndex, 0, uniqueIndex);
                tbRow = tbBody.insertRow(rowIndex);
                addedRows.push(rowIndex);
            }
            else {
                settings._rowOrder.push(uniqueIndex);
                tbRow = tbBody.insertRow(-1);
                addedRows.push(settings._rowOrder.length - 1);
            }
            tbRow.id = settings.idPrefix + '_Row_' + uniqueIndex;
            $(tbRow).data('appendGrid', uniqueIndex);
            // Add row number
            if (!settings.hideRowNumColumn) {
                tbCell = tbRow.insertCell(-1);
                $(tbCell).addClass('ui-widget-content first').text(settings._rowOrder.length);
            }
            // Process on each columns
            for (var y = 0; y < settings.columns.length; y++) {
                // Skip hidden
                if (settings.columns[y].type == 'hidden') {
                    hidden.push(y);
                    continue;
                }
                // Insert cell
                tbCell = tbRow.insertCell(-1);
                tbCell.className = 'ui-widget-content';
                if (settings.columns[y].cellCss != null) $(tbCell).css(settings.columns[y].cellCss);
                // Check control type
                ctrl = null;
                if (settings.columns[y].type == 'custom') {
                    if (typeof (settings.columns[y].customBuilder) == 'function') {
                        ctrl = settings.columns[y].customBuilder(tbCell, settings.idPrefix, settings.columns[y].name, uniqueIndex);
                    }
                }
                else if (settings.columns[y].type == 'select') {
                    ctrl = document.createElement('select');
                    ctrl.id = settings.idPrefix + '_' + settings.columns[y].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    // Build option list
                    if ($.isArray(settings.columns[y].ctrlOptions)) {
                        // For array type option list
                        if (settings.columns[y].ctrlOptions.length > 0) {
                            if ($.isPlainObject(settings.columns[y].ctrlOptions[0])) {
                                for (var x = 0; x < settings.columns[y].ctrlOptions.length; x++) {
                                    ctrl.options[ctrl.options.length] = new Option(settings.columns[y].ctrlOptions[x].label, settings.columns[y].ctrlOptions[x].value);
                                }
                            }
                            else {
                                for (var x = 0; x < settings.columns[y].ctrlOptions.length; x++) {
                                    ctrl.options[ctrl.options.length] = new Option(settings.columns[y].ctrlOptions[x], settings.columns[y].ctrlOptions[x]);
                                }
                            }
                        }
                    }
                    else if ($.isPlainObject(settings.columns[y].ctrlOptions)) {
                        // For plain object type option list
                        for (var x in settings.columns[y].ctrlOptions) {
                            ctrl.options[ctrl.options.length] = new Option(settings.columns[y].ctrlOptions[x], x);
                        }
                    }
                    else if (typeof (settings.columns[y].ctrlOptions) == 'string') {
                        // For string type option list
                        var arrayOpt = settings.columns[y].ctrlOptions.split(';');
                        for (var x = 0; x < arrayOpt.length; x++) {
                            var eqIndex = arrayOpt[x].indexOf(':');
                            if (-1 == eqIndex) {
                                ctrl.options[ctrl.options.length] = new Option(arrayOpt[x], arrayOpt[x]);
                            } else {
                                ctrl.options[ctrl.options.length] = new Option(arrayOpt[x].substring(eqIndex + 1, arrayOpt[x].length), arrayOpt[x].substring(0, eqIndex));
                            }
                        }
                    }
                    tbCell.appendChild(ctrl);
                }
                else if (settings.columns[y].type == 'checkbox') {
                    ctrl = document.createElement('input');
                    ctrl.type = 'checkbox';
                    ctrl.id = settings.idPrefix + '_' + settings.columns[y].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    ctrl.value = 1;
                    tbCell.appendChild(ctrl);
                    tbCell.style.textAlign = 'center';
                }
                else if (-1 != settings.columns[y].type.search(/^(color|date|datetime|datetime\-local|email|month|number|range|search|tel|time|url|week)$/)) {
                    ctrl = document.createElement('input');
                    try {
                        ctrl.type = settings.columns[y].type;
                    }
                    catch (err) { /* Not supported type */ }
                    ctrl.id = settings.idPrefix + '_' + settings.columns[y].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    tbCell.appendChild(ctrl);
                }
                else {
                    // Generate text input
                    ctrl = document.createElement('input');
                    ctrl.type = 'text';
                    ctrl.id = settings.idPrefix + '_' + settings.columns[y].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    tbCell.appendChild(ctrl);
                    // Handle UI widget
                    if (settings.columns[y].type == 'ui-datepicker') {
                        $(ctrl).datepicker(settings.columns[y].uiOption);
                    } else if (settings.columns[y].type == 'ui-spinner') {
                        $(ctrl).spinner(settings.columns[y].uiOption);
                    } else if (settings.columns[y].type == 'ui-autocomplete') {
                        $(ctrl).autocomplete(settings.columns[y].uiOption);
                    }
                }
                // Add extra control properties
                if (settings.columns[y].type != 'custom') {
                    // Add control attributes as needed
                    if (settings.columns[y].ctrlAttr != null) $(ctrl).attr(settings.columns[y].ctrlAttr);
                    // Add control properties as needed
                    if (settings.columns[y].ctrlProp != null) $(ctrl).prop(settings.columns[y].ctrlProp);
                    // Add control CSS as needed
                    if (settings.columns[y].ctrlCss != null) $(ctrl).css(settings.columns[y].ctrlCss);
                    // Add control class as needed
                    if (settings.columns[y].ctrlClass != null) $(ctrl).addClass(settings.columns[y].ctrlClass);
                    // Add jQuery UI tooltip as needed
                    if (settings.columns[y].uiTooltip) $(ctrl).tooltip(settings.columns[y].uiTooltip);
                    // Add control events as needed
                    if (typeof (settings.columns[y].onClick) == 'function') {
                        $(ctrl).click({ caller: tbWhole, callback: settings.columns[y].onClick, uniqueIndex: uniqueIndex }, function (evt) {
                            evt.data.callback(evt, $(evt.data.caller).appendGrid('getRowIndex', evt.data.uniqueIndex));
                        });
                    }
                    if (typeof (settings.columns[y].onChange) == 'function') {
                        $(ctrl).change({ caller: tbWhole, callback: settings.columns[y].onChange, uniqueIndex: uniqueIndex }, function (evt) {
                            evt.data.callback(evt, $(evt.data.caller).appendGrid('getRowIndex', evt.data.uniqueIndex));
                        });
                    }
                }
                // Set default value
                if (!isEmpty(settings.columns[y].value)) {
                    setCtrlValue(settings, y, uniqueIndex, settings.columns[y].value);
                }
            }
            // Add button cell if needed
            if (!settings._hideLastColumn || settings.columns.length > settings._visibleCount) {
                tbCell = tbRow.insertCell(-1);
                tbCell.className = 'ui-widget-content last';
                if (settings._hideLastColumn) tbCell.style.display = 'none';
                // Add standard buttons
                if (!settings.hideButtons.insert) {
                    $(tbCell).append($('<button/>').addClass('insert', settings._buttonClasses.insert).val(uniqueIndex)
                        .attr({ id: settings.idPrefix + '_Insert_' + uniqueIndex, type: 'button', title: settings._i18n.insert, tabindex: -1 })
                        .button({ icons: { primary: 'ui-icon-arrowreturnthick-1-w' }, text: false }).click(function () {
                            $(tbWhole).appendGrid('insertRow', 1, null, this.value);
                        }));
                }
                if (!settings.hideButtons.remove) {
                    $(tbCell).append($('<button/>').addClass('remove', settings._buttonClasses.remove).val(uniqueIndex)
                        .attr({ id: settings.idPrefix + '_Delete_' + uniqueIndex, type: 'button', title: settings._i18n.remove, tabindex: -1 })
                        .button({ icons: { primary: 'ui-icon-trash' }, text: false }).click(function () {
                            removeRow(tbWhole, null, this.value, false);
                        }));
                }
                if (!settings.hideButtons.moveUp) {
                    $(tbCell).append($('<button/>').addClass('moveUp', settings._buttonClasses.moveUp).val(uniqueIndex)
                        .attr({ id: settings.idPrefix + '_MoveUp_' + uniqueIndex, type: 'button', title: settings._i18n.moveUp, tabindex: -1 })
                        .button({ icons: { primary: 'ui-icon-arrowthick-1-n' }, text: false }).click(function () {
                            $(tbWhole).appendGrid('moveUpRow', null, this.value);
                        }));
                }
                if (!settings.hideButtons.moveDown) {
                    $(tbCell).append($('<button/>').addClass('moveDown', settings._buttonClasses.moveDown).val(uniqueIndex)
                        .attr({ id: settings.idPrefix + '_MoveDown_' + uniqueIndex, type: 'button', title: settings._i18n.moveDown, tabindex: -1 })
                        .button({ icons: { primary: 'ui-icon-arrowthick-1-s' }, text: false }).click(function () {
                            $(tbWhole).appendGrid('moveDownRow', null, this.value);
                        }));
                }
                // Handle row dragging
                if (settings.rowDragging) {
                    $('<div/>').addClass('rowDrag ui-state-default ui-corner-all', settings._buttonClasses.rowDrag)
                        .attr('title', settings._i18n.rowDrag).append($('<div/>').addClass('ui-icon ui-icon-carat-2-n-s'))
                        .appendTo(tbCell);
                }
                // Add hidden
                for (var y = 0; y < hidden.length; y++) {
                    ctrl = document.createElement('input');
                    ctrl.id = settings.idPrefix + '_' + settings.columns[hidden[y]].name + '_' + uniqueIndex;
                    ctrl.name = ctrl.id;
                    ctrl.type = 'hidden';
                    if (!isEmpty(settings.columns[hidden[y]].value)) {
                        ctrl.value = settings.columns[hidden[y]].value;
                    }
                    tbCell.appendChild(ctrl);
                }
                // Add extra buttons
                if (settings.customRowButtons && settings.customRowButtons.length) {
                    // Add front buttons
                    for (var y = settings.customRowButtons.length - 1; y >= 0; y--) {
                        var buttonCfg = settings.customRowButtons[y];
                        if (buttonCfg && buttonCfg.uiButton && buttonCfg.click && buttonCfg.atTheFront) {
                            $(tbCell).prepend(makeCustomRowButton(tbWhole, buttonCfg, uniqueIndex));
                        }
                    }
                    // Add end buttons
                    for (var y = 0; y < settings.customRowButtons.length; y++) {
                        var buttonCfg = settings.customRowButtons[y];
                        if (buttonCfg && buttonCfg.uiButton && buttonCfg.click && !buttonCfg.atTheFront) {
                            $(tbCell).append(makeCustomRowButton(tbWhole, buttonCfg, uniqueIndex));
                        }
                    }
                }
            }
        }
        // Save setting
        saveSetting(tbWhole, settings);
        // Trigger events
        if ($.isNumeric(rowIndex)) {
            if (typeof (settings.afterRowInserted) == 'function') {
                settings.afterRowInserted(tbWhole, parentIndex, addedRows);
            }
        }
        else {
            if (typeof (settings.afterRowAppended) == 'function') {
                settings.afterRowAppended(tbWhole, parentIndex, addedRows);
            }
        }
        // Return added rows' uniqueIndex
        return { addedRows: addedRows, parentIndex: parentIndex, rowIndex: rowIndex };
    }
    function makeCustomBottomButton(tbWhole, buttonCfg) {
        var exButton = $('<button/>').attr({ type: 'button', tabindex: -1 })
        .button(buttonCfg.uiButton).click({ tbWhole: tbWhole }, buttonCfg.click);
        if (buttonCfg.btnClass) exButton.addClass(buttonCfg.btnClass);
        if (buttonCfg.btnCss) exButton.css(buttonCfg.btnCss);
        if (buttonCfg.btnAttr) exButton.attr(buttonCfg.btnAttr);
        return exButton;
    }
    function makeCustomRowButton(tbWhole, buttonCfg, uniqueIndex) {
        var exButton = $('<button/>').val(uniqueIndex).attr({ type: 'button', tabindex: -1 })
        .button(buttonCfg.uiButton).click({ tbWhole: tbWhole, uniqueIndex: uniqueIndex }, function (evt) {
            var rowData = $(evt.data.tbWhole).appendGrid('getRowValue', null, evt.data.uniqueIndex);
            buttonCfg.click(evt, evt.data.uniqueIndex, rowData);
        });
        if (buttonCfg.btnClass) exButton.addClass(buttonCfg.btnClass);
        if (buttonCfg.btnCss) exButton.css(buttonCfg.btnCss);
        if (buttonCfg.btnAttr) exButton.attr(buttonCfg.btnAttr);
        return exButton;
    }
    function removeRow(tbWhole, rowIndex, uniqueIndex, force) {
        var settings = $(tbWhole).data('appendGrid');
        var tbBody = tbWhole.getElementsByTagName('tbody')[0];
        if ($.isNumeric(uniqueIndex)) {
            for (var z = 0; z < settings._rowOrder.length; z++) {
                if (settings._rowOrder[z] == uniqueIndex) {
                    rowIndex = z;
                    break;
                }
            }
        }
        if ($.isNumeric(rowIndex)) {
            // Remove middle row
            if (force || typeof (settings.beforeRowRemove) != 'function' || settings.beforeRowRemove(tbWhole, rowIndex)) {
                settings._rowOrder.splice(rowIndex, 1);
                tbBody.deleteRow(rowIndex);
                // Save setting
                saveSetting(tbWhole, settings);
                // Sort sequence
                sortSequence(tbWhole, rowIndex);
                // Trigger event
                if (typeof (settings.afterRowRemoved) == 'function') {
                    settings.afterRowRemoved(tbWhole, rowIndex);
                }
            }
        }
        else {
            // Remove last row
            if (force || typeof (settings.beforeRowRemove) != 'function' || settings.beforeRowRemove(tbWhole, settings._rowOrder.length - 1)) {
                uniqueIndex = settings._rowOrder.pop();
                tbBody.deleteRow(-1);
                // Save setting
                saveSetting(tbWhole, settings);
                // Trigger event
                if (typeof (settings.afterRowRemoved) == 'function') {
                    settings.afterRowRemoved(tbWhole, null);
                }
            }
        }
        // Add empty row
        if (settings._rowOrder.length == 0) {
            var empty = $('<td></td>').text(settings._i18n.rowEmpty).attr('colspan', settings._finalColSpan);
            $('tbody', tbWhole).append($('<tr></tr>').addClass('empty').append(empty));
        }
    }
    function sortSequence(tbWhole, startIndex) {
        var settings = $(tbWhole).data('appendGrid');
        if (!settings.hideRowNumColumn) {
            for (var z = startIndex; z < settings._rowOrder.length; z++) {
                $('#' + settings.idPrefix + '_Row_' + settings._rowOrder[z] + ' td.first', tbWhole).text(z + 1);
            }
        }
    }
    function loadData(tbWhole, records, isInit) {
        var tbBody, tbRow, tbCell, uniqueIndex, insertResult;
        var settings = $(tbWhole).data('appendGrid');
        if (settings) {
            // Clear existing content
            tbBody = tbWhole.getElementsByTagName('tbody')[0];
            $(tbBody).empty();
            settings._rowOrder.length = 0;
            settings._uniqueIndex = 0;
            // Check any records
            if (records != null && records.length) {
                // Add rows
                insertResult = insertRow(tbWhole, records.length, null, null);
                // Set data
                for (var r = 0; r < insertResult.addedRows.length; r++) {
                    for (var c = 0; c < settings.columns.length; c++) {
                        setCtrlValue(settings, c, settings._rowOrder[r], records[r][settings.columns[c].name]);
                    }
                }
            }
            // Save setting
            settings._isDataLoaded = true;
            if (isInit) settings.initData = null;
            $(tbWhole).data('appendGrid', settings);
            // Trigger data loaded event
            if (typeof (settings.dataLoaded) == 'function') {
                settings.dataLoaded(tbWhole);
            }
        }
    }
    function findRowIndex(uniqueIndex, settings) {
        for (var z = 0; z < settings._rowOrder.length; z++) {
            if (settings._rowOrder[z] == uniqueIndex) {
                return z;
            }
        }
        return null;
    }
    function isEmpty(value) {
        return typeof (value) == 'undefined' || value == null;
    }
    function getObjValue(obj, key) {
        if (!isEmpty(obj) && $.isPlainObject(obj) && !isEmpty(obj[key])) {
            return obj[key];
        }
        return null;
    }
    function saveSetting(tbWhole, settings) {
        $(tbWhole).data('appendGrid', settings);
        $('#' + settings.idPrefix + '_rowOrder', tbWhole).val(settings._rowOrder.join());
    }
    function getRowIndex(settings, uniqueIndex) {
        var rowIndex = null;
        for (var z = 0; z < settings._rowOrder.length; z++) {
            if (settings._rowOrder[z] == uniqueIndex) {
                return z;
            }
        }
        return rowIndex;
    }
    function getRowValue(settings, uniqueIndex, loopIndex) {
        var result = {}, keyName = null;
        for (var z = 0; z < settings.columns.length; z++) {
            keyName = settings.columns[z].name + (isEmpty(loopIndex) ? '' : '_' + loopIndex);
            result[keyName] = getCtrlValue(settings, z, uniqueIndex);
        }
        return result;
    }
    function getCtrlValue(settings, colIndex, uniqueIndex) { // type, idPrefix, columnName, uniqueIndex
        var ctrl = null, type = settings.columns[colIndex].type, columnName = settings.columns[colIndex].name;
        if (type == 'checkbox') {
            ctrl = getCellCtrl(type, settings.idPrefix, columnName, uniqueIndex);
            if (ctrl == null)
                return null;
            else
                return ctrl.checked ? 1 : 0;
        }
        else if (type == 'custom') {
            if (typeof (settings.columns[colIndex].customGetter) == 'function')
                return settings.columns[colIndex].customGetter(settings.idPrefix, columnName, uniqueIndex);
            else
                return null;
        }
        else {
            ctrl = getCellCtrl(type, settings.idPrefix, columnName, uniqueIndex);
            if (ctrl == null)
                return null;
            else
                return ctrl.value;
        }
    }
    function getCellCtrl(type, idPrefix, columnName, uniqueIndex) {
        return document.getElementById(idPrefix + '_' + columnName + '_' + uniqueIndex);
    }
    function setCtrlValue(settings, colIndex, uniqueIndex, data) {
        var type = settings.columns[colIndex].type;
        var columnName = settings.columns[colIndex].name;
        if (type == 'checkbox') {
            getCellCtrl(type, settings.idPrefix, columnName, uniqueIndex).checked = (data != null && data != 0);
        }
        else if (type == 'custom') {
            if (typeof (settings.columns[colIndex].customSetter) == 'function') {
                settings.columns[colIndex].customSetter(settings.idPrefix, columnName, uniqueIndex, data);
            }
        }
        else {
            getCellCtrl(type, settings.idPrefix, columnName, uniqueIndex).value = (data == null ? '' : data);
        }
    }
    function gridRowDragged(tbWhole, isMoveUp, uniqueIndex, tbRowIndex) {
        // Get setting
        var settings = $(tbWhole).data('appendGrid');
        // Find the start sorting index
        var startIndex = -1;
        for (var z = 0; z < settings._rowOrder.length; z++) {
            if (settings._rowOrder[z] == uniqueIndex) {
                if (isMoveUp) {
                    startIndex = tbRowIndex;
                    settings._rowOrder.splice(z, 1);
                    settings._rowOrder.splice(tbRowIndex, 0, uniqueIndex);
                } else {
                    startIndex = z;
                    settings._rowOrder.splice(tbRowIndex + 1, 0, uniqueIndex);
                    settings._rowOrder.splice(z, 1);
                }
                break;
            }
        }
        // Do re-order
        sortSequence(tbWhole, startIndex);
        // Save setting
        saveSetting(tbWhole, settings);
    }
    /// <summary>
    /// Initialize append grid or calling its methods.
    /// </summary>
    $.fn.appendGrid = function (params) {
        if (_methods[params]) {
            return _methods[params].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof (params) === 'object' || !params) {
            return _methods.init.apply(this, arguments);
        } else {
            $.error(_systemMessages.notSupportMethod + params);
        }
    };
})(jQuery);
/*
 * jQuery Dynatable plugin 0.3.1
 *
 * Copyright (c) 2014 Steve Schwartz (JangoSteve)
 *
 * Dual licensed under the AGPL and Proprietary licenses:
 *   http://www.dynatable.com/license/
 *
 * Date: Tue Jan 02 2014
 */
//

(function($) {
  var defaults,
      mergeSettings,
      dt,
      Model,
      modelPrototypes = {
        dom: Dom,
        domColumns: DomColumns,
        records: Records,
        recordsCount: RecordsCount,
        processingIndicator: ProcessingIndicator,
        state: State,
        sorts: Sorts,
        sortsHeaders: SortsHeaders,
        queries: Queries,
        inputsSearch: InputsSearch,
        paginationPage: PaginationPage,
        paginationPerPage: PaginationPerPage,
        paginationLinks: PaginationLinks
      },
      utility,
      build,
      processAll,
      initModel,
      defaultRowWriter,
      defaultCellWriter,
      defaultAttributeWriter,
      defaultAttributeReader;

  //-----------------------------------------------------------------
  // Cached plugin global defaults
  //-----------------------------------------------------------------

  defaults = {
    features: {
      paginate: true,
      sort: true,
      pushState: true,
      search: true,
      recordCount: true,
      perPageSelect: true
    },
    table: {
      defaultColumnIdStyle: 'camelCase',
      columns: null,
      headRowSelector: 'thead tr', // or e.g. tr:first-child
      bodyRowSelector: 'tbody tr',
      headRowClass: null
    },
    inputs: {
      queries: null,
      sorts: null,
      multisort: ['ctrlKey', 'shiftKey', 'metaKey'],
      page: null,
      queryEvent: 'blur change',
      recordCountTarget: null,
      recordCountPlacement: 'after',
      paginationLinkTarget: null,
      paginationLinkPlacement: 'after',
      paginationClass: 'dynatable-pagination-links',
      paginationLinkClass: 'dynatable-page-link',
      paginationPrevClass: 'dynatable-page-prev',
      paginationNextClass: 'dynatable-page-next',
      paginationActiveClass: 'dynatable-active-page',
      paginationDisabledClass: 'dynatable-disabled-page',
      paginationPrev: 'Previous',
      paginationNext: 'Next',
      paginationGap: [1,2,2,1],
      searchTarget: null,
      searchPlacement: 'before',
      perPageTarget: null,
      perPagePlacement: 'before',
      perPageText: 'Show: ',
      recordCountText: 'Showing ',
      processingText: 'Processing...'
    },
    dataset: {
      ajax: false,
      ajaxUrl: null,
      ajaxCache: null,
      ajaxOnLoad: false,
      ajaxMethod: 'GET',
      ajaxDataType: 'json',
      totalRecordCount: null,
      queries: {},
      queryRecordCount: null,
      page: null,
      perPageDefault: 10,
      perPageOptions: [10,20,50,100],
      sorts: {},
      sortsKeys: null,
      sortTypes: {},
      records: null
    },
    writers: {
      _rowWriter: defaultRowWriter,
      _cellWriter: defaultCellWriter,
      _attributeWriter: defaultAttributeWriter
    },
    readers: {
      _rowReader: null,
      _attributeReader: defaultAttributeReader
    },
    params: {
      dynatable: 'dynatable',
      queries: 'queries',
      sorts: 'sorts',
      page: 'page',
      perPage: 'perPage',
      offset: 'offset',
      records: 'records',
      record: null,
      queryRecordCount: 'queryRecordCount',
      totalRecordCount: 'totalRecordCount'
    }
  };

  //-----------------------------------------------------------------
  // Each dynatable instance inherits from this,
  // set properties specific to instance
  //-----------------------------------------------------------------

  dt = {
    init: function(element, options) {
      this.settings = mergeSettings(options);
      this.element = element;
      this.$element = $(element);

      // All the setup that doesn't require element or options
      build.call(this);

      return this;
    },

    process: function(skipPushState) {
      processAll.call(this, skipPushState);
    }
  };

  //-----------------------------------------------------------------
  // Cached plugin global functions
  //-----------------------------------------------------------------

  mergeSettings = function(options) {
    var newOptions = $.extend(true, {}, defaults, options);

    // TODO: figure out a better way to do this.
    // Doing `extend(true)` causes any elements that are arrays
    // to merge the default and options arrays instead of overriding the defaults.
    if (options) {
      if (options.inputs) {
        if (options.inputs.multisort) {
          newOptions.inputs.multisort = options.inputs.multisort;
        }
        if (options.inputs.paginationGap) {
          newOptions.inputs.paginationGap = options.inputs.paginationGap;
        }
      }
      if (options.dataset && options.dataset.perPageOptions) {
        newOptions.dataset.perPageOptions = options.dataset.perPageOptions;
      }
    }

    return newOptions;
  };

  build = function() {
    this.$element.trigger('dynatable:preinit', this);

    for (model in modelPrototypes) {
      if (modelPrototypes.hasOwnProperty(model)) {
        var modelInstance = this[model] = new modelPrototypes[model](this, this.settings);
        if (modelInstance.initOnLoad()) {
          modelInstance.init();
        }
      }
    }

    this.$element.trigger('dynatable:init', this);

    if (!this.settings.dataset.ajax || (this.settings.dataset.ajax && this.settings.dataset.ajaxOnLoad) || this.settings.features.paginate) {
      this.process();
    }
  };

  processAll = function(skipPushState) {
    var data = {};

    this.$element.trigger('dynatable:beforeProcess', data);

    if (!$.isEmptyObject(this.settings.dataset.queries)) { data[this.settings.params.queries] = this.settings.dataset.queries; }
    // TODO: Wrap this in a try/rescue block to hide the processing indicator and indicate something went wrong if error
    this.processingIndicator.show();

    if (this.settings.features.sort && !$.isEmptyObject(this.settings.dataset.sorts)) { data[this.settings.params.sorts] = this.settings.dataset.sorts; }
    if (this.settings.features.paginate && this.settings.dataset.page) {
      var page = this.settings.dataset.page,
          perPage = this.settings.dataset.perPage;
      data[this.settings.params.page] = page;
      data[this.settings.params.perPage] = perPage;
      data[this.settings.params.offset] = (page - 1) * perPage;
    }
    if (this.settings.dataset.ajaxData) { $.extend(data, this.settings.dataset.ajaxData); }

    // If ajax, sends query to ajaxUrl with queries and sorts serialized and appended in ajax data
    // otherwise, executes queries and sorts on in-page data
    if (this.settings.dataset.ajax) {
      var _this = this;
      var options = {
        type: _this.settings.dataset.ajaxMethod,
        dataType: _this.settings.dataset.ajaxDataType,
        data: data,
        error: function(xhr, error) {
        },
        success: function(response) {
          _this.$element.trigger('dynatable:ajax:success', response);
          // Merge ajax results and meta-data into dynatables cached data
          _this.records.updateFromJson(response);
          // update table with new records
          _this.dom.update();

          if (!skipPushState && _this.state.initOnLoad()) {
            _this.state.push(data);
          }
        },
        complete: function() {
          _this.processingIndicator.hide();
        }
      };
      // Do not pass url to `ajax` options if blank
      if (this.settings.dataset.ajaxUrl) {
        options.url = this.settings.dataset.ajaxUrl;

      // If ajaxUrl is blank, then we're using the current page URL,
      // we need to strip out any query, sort, or page data controlled by dynatable
      // that may have been in URL when page loaded, so that it doesn't conflict with
      // what's passed in with the data ajax parameter
      } else {
        options.url = utility.refreshQueryString(window.location.href, {}, this.settings);
      }
      if (this.settings.dataset.ajaxCache !== null) { options.cache = this.settings.dataset.ajaxCache; }

      $.ajax(options);
    } else {
      this.records.resetOriginal();
      this.queries.run();
      if (this.settings.features.sort) {
        this.records.sort();
      }
      if (this.settings.features.paginate) {
        this.records.paginate();
      }
      this.dom.update();
      this.processingIndicator.hide();

      if (!skipPushState && this.state.initOnLoad()) {
        this.state.push(data);
      }
    }
    this.$element.trigger('dynatable:afterProcess', data);
  };

  function defaultRowWriter(rowIndex, record, columns, cellWriter) {
    var tr = '';

    // grab the record's attribute for each column
    for (var i = 0, len = columns.length; i < len; i++) {
      tr += cellWriter(columns[i], record);
    }

    return '<tr>' + tr + '</tr>';
  };

  function defaultCellWriter(column, record) {
    var html = column.attributeWriter(record),
        td = '<td';

    if (column.hidden || column.textAlign) {
      td += ' style="';

      // keep cells for hidden column headers hidden
      if (column.hidden) {
        td += 'display: none;';
      }

      // keep cells aligned as their column headers are aligned
      if (column.textAlign) {
        td += 'text-align: ' + column.textAlign + ';';
      }

      td += '"';
    }

    return td + '>' + html + '</td>';
  };

  function defaultAttributeWriter(record) {
    // `this` is the column object in settings.columns
    // TODO: automatically convert common types, such as arrays and objects, to string
    return record[this.id];
  };

  function defaultAttributeReader(cell, record) {
    return $(cell).html();
  };

  //-----------------------------------------------------------------
  // Dynatable object model prototype
  // (all object models get these default functions)
  //-----------------------------------------------------------------

  Model = {
    initOnLoad: function() {
      return true;
    },

    init: function() {}
  };

  for (model in modelPrototypes) {
    if (modelPrototypes.hasOwnProperty(model)) {
      var modelPrototype = modelPrototypes[model];
      modelPrototype.prototype = Model;
    }
  }

  //-----------------------------------------------------------------
  // Dynatable object models
  //-----------------------------------------------------------------

  function Dom(obj, settings) {
    var _this = this;

    // update table contents with new records array
    // from query (whether ajax or not)
    this.update = function() {
      var rows = '',
          columns = settings.table.columns,
          rowWriter = settings.writers._rowWriter,
          cellWriter = settings.writers._cellWriter;

      obj.$element.trigger('dynatable:beforeUpdate', rows);

      // loop through records
      for (var i = 0, len = settings.dataset.records.length; i < len; i++) {
        var record = settings.dataset.records[i],
            tr = rowWriter(i, record, columns, cellWriter);
        rows += tr;
      }

      // Appended dynatable interactive elements
      if (settings.features.recordCount) {
        $('#dynatable-record-count-' + obj.element.id).replaceWith(obj.recordsCount.create());
      }
      if (settings.features.paginate) {
        $('#dynatable-pagination-links-' + obj.element.id).replaceWith(obj.paginationLinks.create());
        if (settings.features.perPageSelect) {
          $('#dynatable-per-page-' + obj.element.id).val(parseInt(settings.dataset.perPage));
        }
      }

      // Sort headers functionality
      if (settings.features.sort && columns) {
        obj.sortsHeaders.removeAllArrows();
        for (var i = 0, len = columns.length; i < len; i++) {
          var column = columns[i],
              sortedByColumn = utility.allMatch(settings.dataset.sorts, column.sorts, function(sorts, sort) { return sort in sorts; }),
              value = settings.dataset.sorts[column.sorts[0]];

          if (sortedByColumn) {
            obj.$element.find('[data-dynatable-column="' + column.id + '"]').find('.dynatable-sort-header').each(function(){
              if (value == 1) {
                obj.sortsHeaders.appendArrowUp($(this));
              } else {
                obj.sortsHeaders.appendArrowDown($(this));
              }
            });
          }
        }
      }

      // Query search functionality
      if (settings.inputs.queries || settings.features.search) {
        var allQueries = settings.inputs.queries || $();
        if (settings.features.search) {
          allQueries = allQueries.add('#dynatable-query-search-' + obj.element.id);
        }

        allQueries.each(function() {
          var $this = $(this),
              q = settings.dataset.queries[$this.data('dynatable-query')];
          $this.val(q || '');
        });
      }

      obj.$element.find(settings.table.bodyRowSelector).remove();
      obj.$element.append(rows);

      obj.$element.trigger('dynatable:afterUpdate', rows);
    };
  };

  function DomColumns(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return obj.$element.is('table');
    };

    this.init = function() {
      settings.table.columns = [];
      this.getFromTable();
    };

    // initialize table[columns] array
    this.getFromTable = function() {
      var $columns = obj.$element.find(settings.table.headRowSelector).children('th,td');
      if ($columns.length) {
        $columns.each(function(index){
          _this.add($(this), index, true);
        });
      } else {
        return $.error("Couldn't find any columns headers in '" + settings.table.headRowSelector + " th,td'. If your header row is different, specify the selector in the table: headRowSelector option.");
      }
    };

    this.add = function($column, position, skipAppend, skipUpdate) {
      var columns = settings.table.columns,
          label = $column.text(),
          id = $column.data('dynatable-column') || utility.normalizeText(label, settings.table.defaultColumnIdStyle),
          dataSorts = $column.data('dynatable-sorts'),
          sorts = dataSorts ? $.map(dataSorts.split(','), function(text) { return $.trim(text); }) : [id];

      // If the column id is blank, generate an id for it
      if ( !id ) {
        this.generate($column);
        id = $column.data('dynatable-column');
      }
      // Add column data to plugin instance
      columns.splice(position, 0, {
        index: position,
        label: label,
        id: id,
        attributeWriter: settings.writers[id] || settings.writers._attributeWriter,
        attributeReader: settings.readers[id] || settings.readers._attributeReader,
        sorts: sorts,
        hidden: $column.css('display') === 'none',
        textAlign: $column.css('text-align')
      });

      // Modify header cell
      $column
        .attr('data-dynatable-column', id)
        .addClass('dynatable-head');
      if (settings.table.headRowClass) { $column.addClass(settings.table.headRowClass); }

      // Append column header to table
      if (!skipAppend) {
        var domPosition = position + 1,
            $sibling = obj.$element.find(settings.table.headRowSelector)
              .children('th:nth-child(' + domPosition + '),td:nth-child(' + domPosition + ')').first(),
            columnsAfter = columns.slice(position + 1, columns.length);

        if ($sibling.length) {
          $sibling.before($column);
        // sibling column doesn't yet exist (maybe this is the last column in the header row)
        } else {
          obj.$element.find(settings.table.headRowSelector).append($column);
        }

        obj.sortsHeaders.attachOne($column.get());

        // increment the index of all columns after this one that was just inserted
        if (columnsAfter.length) {
          for (var i = 0, len = columnsAfter.length; i < len; i++) {
            columnsAfter[i].index += 1;
          }
        }

        if (!skipUpdate) {
          obj.dom.update();
        }
      }

      return dt;
    };

    this.remove = function(columnIndexOrId) {
      var columns = settings.table.columns,
          length = columns.length;

      if (typeof(columnIndexOrId) === "number") {
        var column = columns[columnIndexOrId];
        this.removeFromTable(column.id);
        this.removeFromArray(columnIndexOrId);
      } else {
        // Traverse columns array in reverse order so that subsequent indices
        // don't get messed up when we delete an item from the array in an iteration
        for (var i = columns.length - 1; i >= 0; i--) {
          var column = columns[i];

          if (column.id === columnIndexOrId) {
            this.removeFromTable(columnIndexOrId);
            this.removeFromArray(i);
          }
        }
      }

      obj.dom.update();
    };

    this.removeFromTable = function(columnId) {
      obj.$element.find(settings.table.headRowSelector).children('[data-dynatable-column="' + columnId + '"]').first()
        .remove();
    };

    this.removeFromArray = function(index) {
      var columns = settings.table.columns,
          adjustColumns;
      columns.splice(index, 1);
      adjustColumns = columns.slice(index, columns.length);
      for (var i = 0, len = adjustColumns.length; i < len; i++) {
        adjustColumns[i].index -= 1;
      }
    };

    this.generate = function($cell) {
      var cell = $cell === undefined ? $('<th></th>') : $cell;
      return this.attachGeneratedAttributes(cell);
    };

    this.attachGeneratedAttributes = function($cell) {
      // Use increment to create unique column name that is the same each time the page is reloaded,
      // in order to avoid errors with mismatched attribute names when loading cached `dataset.records` array
      var increment = obj.$element.find(settings.table.headRowSelector).children('th[data-dynatable-generated]').length;
      return $cell
        .attr('data-dynatable-column', 'dynatable-generated-' + increment) //+ utility.randomHash(),
        .attr('data-dynatable-no-sort', 'true')
        .attr('data-dynatable-generated', increment);
    };
  };

  function Records(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return !settings.dataset.ajax;
    };

    this.init = function() {
      if (settings.dataset.records === null) {
        settings.dataset.records = this.getFromTable();

        if (!settings.dataset.queryRecordCount) {
          settings.dataset.queryRecordCount = this.count();
        }

        if (!settings.dataset.totalRecordCount){
          settings.dataset.totalRecordCount = settings.dataset.queryRecordCount;
        }
      }

      // Create cache of original full recordset (unpaginated and unqueried)
      settings.dataset.originalRecords = $.extend(true, [], settings.dataset.records);
    };

    // merge ajax response json with cached data including
    // meta-data and records
    this.updateFromJson = function(data) {
      var records;
      if (settings.params.records === "_root") {
        records = data;
      } else if (settings.params.records in data) {
        records = data[settings.params.records];
      }
      if (settings.params.record) {
        var len = records.length - 1;
        for (var i = 0; i < len; i++) {
          records[i] = records[i][settings.params.record];
        }
      }
      if (settings.params.queryRecordCount in data) {
        settings.dataset.queryRecordCount = data[settings.params.queryRecordCount];
      }
      if (settings.params.totalRecordCount in data) {
        settings.dataset.totalRecordCount = data[settings.params.totalRecordCount];
      }
      settings.dataset.records = records;
    };

    // For really advanced sorting,
    // see http://james.padolsey.com/javascript/sorting-elements-with-jquery/
    this.sort = function() {
      var sort = [].sort,
          sorts = settings.dataset.sorts,
          sortsKeys = settings.dataset.sortsKeys,
          sortTypes = settings.dataset.sortTypes;

      var sortFunction = function(a, b) {
        var comparison;
        if ($.isEmptyObject(sorts)) {
          comparison = obj.sorts.functions['originalPlacement'](a, b);
        } else {
          for (var i = 0, len = sortsKeys.length; i < len; i++) {
            var attr = sortsKeys[i],
                direction = sorts[attr],
                sortType = sortTypes[attr] || obj.sorts.guessType(a, b, attr);
            comparison = obj.sorts.functions[sortType](a, b, attr, direction);
            // Don't need to sort any further unless this sort is a tie between a and b,
            // so break the for loop unless tied
            if (comparison !== 0) { break; }
          }
        }
        return comparison;
      }

      return sort.call(settings.dataset.records, sortFunction);
    };

    this.paginate = function() {
      var bounds = this.pageBounds(),
          first = bounds[0], last = bounds[1];
      settings.dataset.records = settings.dataset.records.slice(first, last);
    };

    this.resetOriginal = function() {
      settings.dataset.records = settings.dataset.originalRecords || [];
    };

    this.pageBounds = function() {
      var page = settings.dataset.page || 1,
          first = (page - 1) * settings.dataset.perPage,
          last = Math.min(first + settings.dataset.perPage, settings.dataset.queryRecordCount);
      return [first,last];
    };

    // get initial recordset to populate table
    // if ajax, call ajaxUrl
    // otherwise, initialize from in-table records
    this.getFromTable = function() {
      var records = [],
          columns = settings.table.columns,
          tableRecords = obj.$element.find(settings.table.bodyRowSelector);

      tableRecords.each(function(index){
        var record = {};
        record['dynatable-original-index'] = index;
        $(this).find('th,td').each(function(index) {
          if (columns[index] === undefined) {
            // Header cell didn't exist for this column, so let's generate and append
            // a new header cell with a randomly generated name (so we can store and
            // retrieve the contents of this column for each record)
            obj.domColumns.add(obj.domColumns.generate(), columns.length, false, true); // don't skipAppend, do skipUpdate
          }
          var value = columns[index].attributeReader(this, record),
              attr = columns[index].id;

          // If value from table is HTML, let's get and cache the text equivalent for
          // the default string sorting, since it rarely makes sense for sort headers
          // to sort based on HTML tags.
          if (typeof(value) === "string" && value.match(/\s*\<.+\>/)) {
            if (! record['dynatable-sortable-text']) {
              record['dynatable-sortable-text'] = {};
            }
            record['dynatable-sortable-text'][attr] = $.trim($('<div></div>').html(value).text());
          }

          record[attr] = value;
        });
        // Allow configuration function which alters record based on attributes of
        // table row (e.g. from html5 data- attributes)
        if (typeof(settings.readers._rowReader) === "function") {
          settings.readers._rowReader(index, this, record);
        }
        records.push(record);
      });
      return records; // 1st row is header
    };

    // count records from table
    this.count = function() {
      return settings.dataset.records.length;
    };
  };

  function RecordsCount(obj, settings) {
    this.initOnLoad = function() {
      return settings.features.recordCount;
    };

    this.init = function() {
      this.attach();
    };

    this.create = function() {
      var recordsShown = obj.records.count(),
          recordsQueryCount = settings.dataset.queryRecordCount,
          recordsTotal = settings.dataset.totalRecordCount,
          text = settings.inputs.recordCountText,
          collection_name = settings.params.records;

      if (recordsShown < recordsQueryCount && settings.features.paginate) {
        var bounds = obj.records.pageBounds();
        text += "<span class='dynatable-record-bounds'>" + (bounds[0] + 1) + " to " + bounds[1] + "</span> of ";
      } else if (recordsShown === recordsQueryCount && settings.features.paginate) {
        text += recordsShown + " of ";
      }
      text += recordsQueryCount + " " + collection_name;
      if (recordsQueryCount < recordsTotal) {
        text += " (filtered from " + recordsTotal + " total records)";
      }

      return $('<span></span>', {
                id: 'dynatable-record-count-' + obj.element.id,
                'class': 'dynatable-record-count',
                html: text
              });
    };

    this.attach = function() {
      var $target = settings.inputs.recordCountTarget ? $(settings.inputs.recordCountTarget) : obj.$element;
      $target[settings.inputs.recordCountPlacement](this.create());
    };
  };

  function ProcessingIndicator(obj, settings) {
    this.init = function() {
      this.attach();
    };

    this.create = function() {
      var $processing = $('<div></div>', {
            html: '<span>' + settings.inputs.processingText + '</span>',
            id: 'dynatable-processing-' + obj.element.id,
            'class': 'dynatable-processing',
            style: 'position: absolute; display: none;'
          });

      return $processing;
    };

    this.position = function() {
      var $processing = $('#dynatable-processing-' + obj.element.id),
          $span = $processing.children('span'),
          spanHeight = $span.outerHeight(),
          spanWidth = $span.outerWidth(),
          $covered = obj.$element,
          offset = $covered.offset(),
          height = $covered.outerHeight(), width = $covered.outerWidth();

      $processing
        .offset({left: offset.left, top: offset.top})
        .width(width)
        .height(height)
      $span
        .offset({left: offset.left + ( (width - spanWidth) / 2 ), top: offset.top + ( (height - spanHeight) / 2 )});

      return $processing;
    };

    this.attach = function() {
      obj.$element.before(this.create());
    };

    this.show = function() {
      $('#dynatable-processing-' + obj.element.id).show();
      this.position();
    };

    this.hide = function() {
      $('#dynatable-processing-' + obj.element.id).hide();
    };
  };

  function State(obj, settings) {
    this.initOnLoad = function() {
      // Check if pushState option is true, and if browser supports it
      return settings.features.pushState && history.pushState;
    };

    this.init = function() {
      window.onpopstate = function(event) {
        if (event.state && event.state.dynatable) {
          obj.state.pop(event);
        }
      }
    };

    this.push = function(data) {
      var urlString = window.location.search,
          urlOptions,
          path,
          params,
          hash,
          newParams,
          cacheStr,
          cache,
          // replaceState on initial load, then pushState after that
          firstPush = !(window.history.state && window.history.state.dynatable),
          pushFunction = firstPush ? 'replaceState' : 'pushState';

      if (urlString && /^\?/.test(urlString)) { urlString = urlString.substring(1); }
      $.extend(urlOptions, data);

      params = utility.refreshQueryString(urlString, data, settings);
      if (params) { params = '?' + params; }
      hash = window.location.hash;
      path = window.location.pathname;

      obj.$element.trigger('dynatable:push', data);

      cache = { dynatable: { dataset: settings.dataset } };
      if (!firstPush) { cache.dynatable.scrollTop = $(window).scrollTop(); }
      cacheStr = JSON.stringify(cache);

      // Mozilla has a 640k char limit on what can be stored in pushState.
      // See "limit" in https://developer.mozilla.org/en/DOM/Manipulating_the_browser_history#The_pushState().C2.A0method
      // and "dataStr.length" in http://wine.git.sourceforge.net/git/gitweb.cgi?p=wine/wine-gecko;a=patch;h=43a11bdddc5fc1ff102278a120be66a7b90afe28
      //
      // Likewise, other browsers may have varying (undocumented) limits.
      // Also, Firefox's limit can be changed in about:config as browser.history.maxStateObjectSize
      // Since we don't know what the actual limit will be in any given situation, we'll just try caching and rescue
      // any exceptions by retrying pushState without caching the records.
      //
      // I have absolutely no idea why perPageOptions suddenly becomes an array-like object instead of an array,
      // but just recently, this started throwing an error if I don't convert it:
      // 'Uncaught Error: DATA_CLONE_ERR: DOM Exception 25'
      cache.dynatable.dataset.perPageOptions = $.makeArray(cache.dynatable.dataset.perPageOptions);

      try {
        window.history[pushFunction](cache, "Dynatable state", path + params + hash);
      } catch(error) {
        // Make cached records = null, so that `pop` will rerun process to retrieve records
        cache.dynatable.dataset.records = null;
        window.history[pushFunction](cache, "Dynatable state", path + params + hash);
      }
    };

    this.pop = function(event) {
      var data = event.state.dynatable;
      settings.dataset = data.dataset;

      if (data.scrollTop) { $(window).scrollTop(data.scrollTop); }

      // If dataset.records is cached from pushState
      if ( data.dataset.records ) {
        obj.dom.update();
      } else {
        obj.process(true);
      }
    };
  };

  function Sorts(obj, settings) {
    this.initOnLoad = function() {
      return settings.features.sort;
    };

    this.init = function() {
      var sortsUrl = window.location.search.match(new RegExp(settings.params.sorts + '[^&=]*=[^&]*', 'g'));
      settings.dataset.sorts = sortsUrl ? utility.deserialize(sortsUrl)[settings.params.sorts] : {};
      settings.dataset.sortsKeys = sortsUrl ? utility.keysFromObject(settings.dataset.sorts) : [];
    };

    this.add = function(attr, direction) {
      var sortsKeys = settings.dataset.sortsKeys,
          index = $.inArray(attr, sortsKeys);
      settings.dataset.sorts[attr] = direction;
      if (index === -1) { sortsKeys.push(attr); }
      return dt;
    };

    this.remove = function(attr) {
      var sortsKeys = settings.dataset.sortsKeys,
          index = $.inArray(attr, sortsKeys);
      delete settings.dataset.sorts[attr];
      if (index !== -1) { sortsKeys.splice(index, 1); }
      return dt;
    };

    this.clear = function() {
      settings.dataset.sorts = {};
      settings.dataset.sortsKeys.length = 0;
    };

    // Try to intelligently guess which sort function to use
    // based on the type of attribute values.
    // Consider using something more robust than `typeof` (http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/)
    this.guessType = function(a, b, attr) {
      var types = {
            string: 'string',
            number: 'number',
            'boolean': 'number',
            object: 'number' // dates and null values are also objects, this works...
          },
          attrType = a[attr] ? typeof(a[attr]) : typeof(b[attr]),
          type = types[attrType] || 'number';
      return type;
    };

    // Built-in sort functions
    // (the most common use-cases I could think of)
    this.functions = {
      number: function(a, b, attr, direction) {
        return a[attr] === b[attr] ? 0 : (direction > 0 ? a[attr] - b[attr] : b[attr] - a[attr]);
      },
      string: function(a, b, attr, direction) {
        var aAttr = (a['dynatable-sortable-text'] && a['dynatable-sortable-text'][attr]) ? a['dynatable-sortable-text'][attr] : a[attr],
            bAttr = (b['dynatable-sortable-text'] && b['dynatable-sortable-text'][attr]) ? b['dynatable-sortable-text'][attr] : b[attr],
            comparison;
        aAttr = aAttr.toLowerCase();
        bAttr = bAttr.toLowerCase();
        comparison = aAttr === bAttr ? 0 : (direction > 0 ? aAttr > bAttr : bAttr > aAttr);
        // force false boolean value to -1, true to 1, and tie to 0
        return comparison === false ? -1 : (comparison - 0);
      },
      originalPlacement: function(a, b) {
        return a['dynatable-original-index'] - b['dynatable-original-index'];
      }
    };
  };

  // turn table headers into links which add sort to sorts array
  function SortsHeaders(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.features.sort;
    };

    this.init = function() {
      this.attach();
    };

    this.create = function(cell) {
      var $cell = $(cell),
          $link = $('<a></a>', {
            'class': 'dynatable-sort-header',
            href: '#',
            html: $cell.html()
          }),
          id = $cell.data('dynatable-column'),
          column = utility.findObjectInArray(settings.table.columns, {id: id});

      $link.bind('click', function(e) {
        _this.toggleSort(e, $link, column);
        obj.process();

        e.preventDefault();
      });

      if (this.sortedByColumn($link, column)) {
        if (this.sortedByColumnValue(column) == 1) {
          this.appendArrowUp($link);
        } else {
          this.appendArrowDown($link);
        }
      }

      return $link;
    };

    this.removeAll = function() {
      obj.$element.find(settings.table.headRowSelector).children('th,td').each(function(){
        _this.removeAllArrows();
        _this.removeOne(this);
      });
    };

    this.removeOne = function(cell) {
      var $cell = $(cell),
          $link = $cell.find('.dynatable-sort-header');
      if ($link.length) {
        var html = $link.html();
        $link.remove();
        $cell.html($cell.html() + html);
      }
    };

    this.attach = function() {
      obj.$element.find(settings.table.headRowSelector).children('th,td').each(function(){
        _this.attachOne(this);
      });
    };

    this.attachOne = function(cell) {
      var $cell = $(cell);
      if (!$cell.data('dynatable-no-sort')) {
        $cell.html(this.create(cell));
      }
    };

    this.appendArrowUp = function($link) {
      this.removeArrow($link);
      $link.append("<span class='dynatable-arrow'> &#9650;</span>");
    };

    this.appendArrowDown = function($link) {
      this.removeArrow($link);
      $link.append("<span class='dynatable-arrow'> &#9660;</span>");
    };

    this.removeArrow = function($link) {
      // Not sure why `parent()` is needed, the arrow should be inside the link from `append()` above
      $link.find('.dynatable-arrow').remove();
    };

    this.removeAllArrows = function() {
      obj.$element.find('.dynatable-arrow').remove();
    };

    this.toggleSort = function(e, $link, column) {
      var sortedByColumn = this.sortedByColumn($link, column),
          value = this.sortedByColumnValue(column);
      // Clear existing sorts unless this is a multisort event
      if (!settings.inputs.multisort || !utility.anyMatch(e, settings.inputs.multisort, function(evt, key) { return e[key]; })) {
        this.removeAllArrows();
        obj.sorts.clear();
      }

      // If sorts for this column are already set
      if (sortedByColumn) {
        // If ascending, then make descending
        if (value == 1) {
          for (var i = 0, len = column.sorts.length; i < len; i++) {
            obj.sorts.add(column.sorts[i], -1);
          }
          this.appendArrowDown($link);
        // If descending, remove sort
        } else {
          for (var i = 0, len = column.sorts.length; i < len; i++) {
            obj.sorts.remove(column.sorts[i]);
          }
          this.removeArrow($link);
        }
      // Otherwise, if not already set, set to ascending
      } else {
        for (var i = 0, len = column.sorts.length; i < len; i++) {
          obj.sorts.add(column.sorts[i], 1);
        }
        this.appendArrowUp($link);
      }
    };

    this.sortedByColumn = function($link, column) {
      return utility.allMatch(settings.dataset.sorts, column.sorts, function(sorts, sort) { return sort in sorts; });
    };

    this.sortedByColumnValue = function(column) {
      return settings.dataset.sorts[column.sorts[0]];
    };
  };

  function Queries(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.inputs.queries || settings.features.search;
    };

    this.init = function() {
      var queriesUrl = window.location.search.match(new RegExp(settings.params.queries + '[^&=]*=[^&]*', 'g'));

      settings.dataset.queries = queriesUrl ? utility.deserialize(queriesUrl)[settings.params.queries] : {};
      if (settings.dataset.queries === "") { settings.dataset.queries = {}; }

      if (settings.inputs.queries) {
        this.setupInputs();
      }
    };

    this.add = function(name, value) {
      // reset to first page since query will change records
      if (settings.features.paginate) {
        settings.dataset.page = 1;
      }
      settings.dataset.queries[name] = value;
      return dt;
    };

    this.remove = function(name) {
      delete settings.dataset.queries[name];
      return dt;
    };

    this.run = function() {
      for (query in settings.dataset.queries) {
        if (settings.dataset.queries.hasOwnProperty(query)) {
          var value = settings.dataset.queries[query];
          if (_this.functions[query] === undefined) {
            // Try to lazily evaluate query from column names if not explicitly defined
            var queryColumn = utility.findObjectInArray(settings.table.columns, {id: query});
            if (queryColumn) {
              _this.functions[query] = function(record, queryValue) {
                return record[query] == queryValue;
              };
            } else {
              $.error("Query named '" + query + "' called, but not defined in queries.functions");
              continue; // to skip to next query
            }
          }
          // collect all records that return true for query
          settings.dataset.records = $.map(settings.dataset.records, function(record) {
            return _this.functions[query](record, value) ? record : null;
          });
        }
      }
      settings.dataset.queryRecordCount = obj.records.count();
    };

    // Shortcut for performing simple query from built-in search
    this.runSearch = function(q) {
      var origQueries = $.extend({}, settings.dataset.queries);
      if (q) {
        this.add('search', q);
      } else {
        this.remove('search');
      }
      if (!utility.objectsEqual(settings.dataset.queries, origQueries)) {
        obj.process();
      }
    };

    this.setupInputs = function() {
      settings.inputs.queries.each(function() {
        var $this = $(this),
            event = $this.data('dynatable-query-event') || settings.inputs.queryEvent,
            query = $this.data('dynatable-query') || $this.attr('name') || this.id,
            queryFunction = function(e) {
              var q = $(this).val();
              if (q === "") { q = undefined; }
              if (q === settings.dataset.queries[query]) { return false; }
              if (q) {
                _this.add(query, q);
              } else {
                _this.remove(query);
              }
              obj.process();
              e.preventDefault();
            };

        $this
          .attr('data-dynatable-query', query)
          .bind(event, queryFunction)
          .bind('keypress', function(e) {
            if (e.which == 13) {
              queryFunction.call(this, e);
            }
          });

        if (settings.dataset.queries[query]) { $this.val(decodeURIComponent(settings.dataset.queries[query])); }
      });
    };

    // Query functions for in-page querying
    // each function should take a record and a value as input
    // and output true of false as to whether the record is a match or not
    this.functions = {
      search: function(record, queryValue) {
        var contains = false;
        // Loop through each attribute of record
        for (attr in record) {
          if (record.hasOwnProperty(attr)) {
            var attrValue = record[attr];
            if (typeof(attrValue) === "string" && attrValue.toLowerCase().indexOf(queryValue.toLowerCase()) !== -1) {
              contains = true;
              // Don't need to keep searching attributes once found
              break;
            } else {
              continue;
            }
          }
        }
        return contains;
      }
    };
  };

  function InputsSearch(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.features.search;
    };

    this.init = function() {
      this.attach();
    };

    this.create = function() {
      var $search = $('<input />', {
            type: 'search',
            class: 'form-control',
            placeholder: 'Search',
            id: 'dynatable-query-search-' + obj.element.id,
            'data-dynatable-query': 'search',
            value: settings.dataset.queries.search
          }),
          $searchSpan = $('<span></span>', {
            id: 'dynatable-search-' + obj.element.id,
            'class': 'dynatable-search'/*,
            text: 'Search: '*/
          }).append($search);

      $search
        .bind(settings.inputs.queryEvent, function() {
          obj.queries.runSearch($(this).val());
        })
        .bind('keypress', function(e) {
          if (e.which == 13) {
            obj.queries.runSearch($(this).val());
            e.preventDefault();
          }
        });
      return $searchSpan;
    };

    this.attach = function() {
      var $target = settings.inputs.searchTarget ? $(settings.inputs.searchTarget) : obj.$element;
      $target[settings.inputs.searchPlacement](this.create());
    };
  };

  // provide a public function for selecting page
  function PaginationPage(obj, settings) {
    this.initOnLoad = function() {
      return settings.features.paginate;
    };

    this.init = function() {
      var pageUrl = window.location.search.match(new RegExp(settings.params.page + '=([^&]*)'));
      // If page is present in URL parameters and pushState is enabled
      // (meaning that it'd be possible for dynatable to have put the
      // page parameter in the URL)
      if (pageUrl && settings.features.pushState) {
        this.set(pageUrl[1]);
      } else {
        this.set(1);
      }
    };

    this.set = function(page) {
      settings.dataset.page = parseInt(page, 10);
    }
  };

  function PaginationPerPage(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.features.paginate;
    };

    this.init = function() {
      var perPageUrl = window.location.search.match(new RegExp(settings.params.perPage + '=([^&]*)'));

      // If perPage is present in URL parameters and pushState is enabled
      // (meaning that it'd be possible for dynatable to have put the
      // perPage parameter in the URL)
      if (perPageUrl && settings.features.pushState) {
        // Don't reset page to 1 on init, since it might override page
        // set on init from URL
        this.set(perPageUrl[1], true);
      } else {
        this.set(settings.dataset.perPageDefault, true);
      }

      if (settings.features.perPageSelect) {
        this.attach();
      }
    };

    this.create = function() {
      var $select = $('<select>', {
            id: 'dynatable-per-page-' + obj.element.id,
            'class': 'dynatable-per-page-select form-control show-dropdown'
          });

      for (var i = 0, len = settings.dataset.perPageOptions.length; i < len; i++) {
        var number = settings.dataset.perPageOptions[i],
            selected = settings.dataset.perPage == number ? 'selected="selected"' : '';
        $select.append('<option value="' + number + '" ' + selected + '>' + number + '</option>');
      }

      $select.bind('change', function(e) {
        _this.set($(this).val());
        obj.process();
      });

      return $('<span />', {
        'class': 'dynatable-per-page'
      }).append("<span class='dynatable-per-page-label'>" + settings.inputs.perPageText + "</span>").append($select);
    };

    this.attach = function() {
      var $target = settings.inputs.perPageTarget ? $(settings.inputs.perPageTarget) : obj.$element;
      $target[settings.inputs.perPagePlacement](this.create());
    };

    this.set = function(number, skipResetPage) {
      if (!skipResetPage) { obj.paginationPage.set(1); }
      settings.dataset.perPage = parseInt(number);
    };
  };

  // pagination links which update dataset.page attribute
  function PaginationLinks(obj, settings) {
    var _this = this;

    this.initOnLoad = function() {
      return settings.features.paginate;
    };

    this.init = function() {
      this.attach();
    };

    this.create = function() {
      var pageLinks = '<ul id="' + 'dynatable-pagination-links-' + obj.element.id + '" class="' + settings.inputs.paginationClass + '">',
          pageLinkClass = settings.inputs.paginationLinkClass,
          activePageClass = settings.inputs.paginationActiveClass,
          disabledPageClass = settings.inputs.paginationDisabledClass,
          pages = Math.ceil(settings.dataset.queryRecordCount / settings.dataset.perPage),
          page = settings.dataset.page,
          breaks = [
            settings.inputs.paginationGap[0],
            settings.dataset.page - settings.inputs.paginationGap[1],
            settings.dataset.page + settings.inputs.paginationGap[2],
            (pages + 1) - settings.inputs.paginationGap[3]
          ];

      pageLinks += '<li><span>Pages: </span></li>';

      for (var i = 1; i <= pages; i++) {
        if ( (i > breaks[0] && i < breaks[1]) || (i > breaks[2] && i < breaks[3])) {
          // skip to next iteration in loop
          continue;
        } else {
          var li = obj.paginationLinks.buildLink(i, i, pageLinkClass, page == i, activePageClass),
              breakIndex,
              nextBreak;

          // If i is not between one of the following
          // (1 + (settings.paginationGap[0]))
          // (page - settings.paginationGap[1])
          // (page + settings.paginationGap[2])
          // (pages - settings.paginationGap[3])
          breakIndex = $.inArray(i, breaks);
          nextBreak = breaks[breakIndex + 1];
          if (breakIndex > 0 && i !== 1 && nextBreak && nextBreak > (i + 1)) {
            var ellip = '<li><span class="dynatable-page-break">&hellip;</span></li>';
            li = breakIndex < 2 ? ellip + li : li + ellip;
          }

          if (settings.inputs.paginationPrev && i === 1) {
            var prevLi = obj.paginationLinks.buildLink(page - 1, settings.inputs.paginationPrev, pageLinkClass + ' ' + settings.inputs.paginationPrevClass, page === 1, disabledPageClass);
            li = prevLi + li;
          }
          if (settings.inputs.paginationNext && i === pages) {
            var nextLi = obj.paginationLinks.buildLink(page + 1, settings.inputs.paginationNext, pageLinkClass + ' ' + settings.inputs.paginationNextClass, page === pages, disabledPageClass);
            li += nextLi;
          }

          pageLinks += li;
        }
      }

      pageLinks += '</ul>';

      // only bind page handler to non-active and non-disabled page links
      var selector = '#dynatable-pagination-links-' + obj.element.id + ' a.' + pageLinkClass + ':not(.' + activePageClass + ',.' + disabledPageClass + ')';
      // kill any existing delegated-bindings so they don't stack up
      $(document).undelegate(selector, 'click.dynatable');
      $(document).delegate(selector, 'click.dynatable', function(e) {
        $this = $(this);
        $this.closest(settings.inputs.paginationClass).find('.' + activePageClass).removeClass(activePageClass);
        $this.addClass(activePageClass);

        obj.paginationPage.set($this.data('dynatable-page'));
        obj.process();
        e.preventDefault();
      });

      return pageLinks;
    };

    this.buildLink = function(page, label, linkClass, conditional, conditionalClass) {
      var link = '<a data-dynatable-page=' + page + ' class="' + linkClass,
          li = '<li';

      if (conditional) {
        link += ' ' + conditionalClass;
        li += ' class="' + conditionalClass + '"';
      }

      link += '">' + label + '</a>';
      li += '>' + link + '</li>';

      return li;
    };

    this.attach = function() {
      // append page links *after* delegate-event-binding so it doesn't need to
      // find and select all page links to bind event
      var $target = settings.inputs.paginationLinkTarget ? $(settings.inputs.paginationLinkTarget) : obj.$element;
      $target[settings.inputs.paginationLinkPlacement](obj.paginationLinks.create());
    };
  };

  utility = dt.utility = {
    normalizeText: function(text, style) {
      text = this.textTransform[style](text);
      return text;
    },
    textTransform: {
      trimDash: function(text) {
        return text.replace(/^\s+|\s+$/g, "").replace(/\s+/g, "-");
      },
      camelCase: function(text) {
        text = this.trimDash(text);
        return text
          .replace(/(\-[a-zA-Z])/g, function($1){return $1.toUpperCase().replace('-','');})
          .replace(/([A-Z])([A-Z]+)/g, function($1,$2,$3){return $2 + $3.toLowerCase();})
          .replace(/^[A-Z]/, function($1){return $1.toLowerCase();});
      },
      dashed: function(text) {
        text = this.trimDash(text);
        return this.lowercase(text);
      },
      underscore: function(text) {
        text = this.trimDash(text);
        return this.lowercase(text.replace(/(-)/g, '_'));
      },
      lowercase: function(text) {
        return text.replace(/([A-Z])/g, function($1){return $1.toLowerCase();});
      },
      uppercase: function (text) {
          text = this.trimDash(text);
          return text
            .replace(/(\-[a-zA-Z])/g, function ($1) { return $1.toUpperCase().replace('-', ''); })
            .replace(/([A-Z])([A-Z]+)/g, function ($1, $2, $3) { return $2 + $3.toLowerCase(); })
            
      },
      asis: function(text) {
          return text;
      },
      stripSpaces: function (text) {
          text = this.trimDash(text);
          return text.replace(/(-)/g, '');
      }
    },
    // Deserialize params in URL to object
    // see http://stackoverflow.com/questions/1131630/javascript-jquery-param-inverse-function/3401265#3401265
    deserialize: function(query) {
      if (!query) return {};
      // modified to accept an array of partial URL strings
      if (typeof(query) === "object") { query = query.join('&'); }

      var hash = {},
          vars = query.split("&");

      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("="),
            k = decodeURIComponent(pair[0]),
            v, m;

        if (!pair[1]) { continue };
        v = decodeURIComponent(pair[1].replace(/\+/g, ' '));

        // modified to parse multi-level parameters (e.g. "hi[there][dude]=whatsup" => hi: {there: {dude: "whatsup"}})
        while (m = k.match(/([^&=]+)\[([^&=]+)\]$/)) {
          var origV = v;
          k = m[1];
          v = {};

          // If nested param ends in '][', then the regex above erroneously included half of a trailing '[]',
          // which indicates the end-value is part of an array
          if (m[2].substr(m[2].length-2) == '][') { // must use substr for IE to understand it
            v[m[2].substr(0,m[2].length-2)] = [origV];
          } else {
            v[m[2]] = origV;
          }
        }

        // If it is the first entry with this name
        if (typeof hash[k] === "undefined") {
          if (k.substr(k.length-2) != '[]') { // not end with []. cannot use negative index as IE doesn't understand it
            hash[k] = v;
          } else {
            hash[k] = [v];
          }
        // If subsequent entry with this name and not array
        } else if (typeof hash[k] === "string") {
          hash[k] = v;  // replace it
        // modified to add support for objects
        } else if (typeof hash[k] === "object") {
          hash[k] = $.extend({}, hash[k], v);
        // If subsequent entry with this name and is array
        } else {
          hash[k].push(v);
        }
      }
      return hash;
    },
    refreshQueryString: function(urlString, data, settings) {
      var _this = this,
          queryString = urlString.split('?'),
          path = queryString.shift(),
          urlOptions;

      urlOptions = this.deserialize(urlString);

      // Loop through each dynatable param and update the URL with it
      for (attr in settings.params) {
        if (settings.params.hasOwnProperty(attr)) {
          var label = settings.params[attr];
          // Skip over parameters matching attributes for disabled features (i.e. leave them untouched),
          // because if the feature is turned off, then parameter name is a coincidence and it's unrelated to dynatable.
          if (
            (!settings.features.sort && attr == "sorts") ||
              (!settings.features.paginate && _this.anyMatch(attr, ["page", "perPage", "offset"], function(attr, param) { return attr == param; }))
          ) {
            continue;
          }

          // Delete page and offset from url params if on page 1 (default)
          if ((attr === "page" || attr === "offset") && data["page"] === 1) {
            if (urlOptions[label]) {
              delete urlOptions[label];
            }
            continue;
          }

          // Delete perPage from url params if default perPage value
          if (attr === "perPage" && data[label] == settings.dataset.perPageDefault) {
            if (urlOptions[label]) {
              delete urlOptions[label];
            }
            continue;
          }

          // For queries, we're going to handle each possible query parameter individually here instead of
          // handling the entire queries object below, since we need to make sure that this is a query controlled by dynatable.
          if (attr == "queries" && data[label]) {
            var queries = settings.inputs.queries || [],
                inputQueries = $.makeArray(queries.map(function() { return $(this).attr('name') }));

            if (settings.features.search) { inputQueries.push('search'); }

            for (var i = 0, len = inputQueries.length; i < len; i++) {
              var attr = inputQueries[i];
              if (data[label][attr]) {
                if (typeof urlOptions[label] === 'undefined') { urlOptions[label] = {}; }
                urlOptions[label][attr] = data[label][attr];
              } else {
                delete urlOptions[label][attr];
              }
            }
            continue;
          }

          // If we haven't returned true by now, then we actually want to update the parameter in the URL
          if (data[label]) {
            urlOptions[label] = data[label];
          } else {
            delete urlOptions[label];
          }
        }
      }
      return decodeURI($.param(urlOptions));
    },
    // Get array of keys from object
    // see http://stackoverflow.com/questions/208016/how-to-list-the-properties-of-a-javascript-object/208020#208020
    keysFromObject: function(obj){
      var keys = [];
      for (var key in obj){
        keys.push(key);
      }
      return keys;
    },
    // Find an object in an array of objects by attributes.
    // E.g. find object with {id: 'hi', name: 'there'} in an array of objects
    findObjectInArray: function(array, objectAttr) {
      var _this = this,
          foundObject;
      for (var i = 0, len = array.length; i < len; i++) {
        var item = array[i];
        // For each object in array, test to make sure all attributes in objectAttr match
        if (_this.allMatch(item, objectAttr, function(item, key, value) { return item[key] == value; })) {
          foundObject = item;
          break;
        }
      }
      return foundObject;
    },
    // Return true if supplied test function passes for ALL items in an array
    allMatch: function(item, arrayOrObject, test) {
      // start off with true result by default
      var match = true,
          isArray = $.isArray(arrayOrObject);
      // Loop through all items in array
      $.each(arrayOrObject, function(key, value) {
        var result = isArray ? test(item, value) : test(item, key, value);
        // If a single item tests false, go ahead and break the array by returning false
        // and return false as result,
        // otherwise, continue with next iteration in loop
        // (if we make it through all iterations without overriding match with false,
        // then we can return the true result we started with by default)
        if (!result) { return match = false; }
      });
      return match;
    },
    // Return true if supplied test function passes for ANY items in an array
    anyMatch: function(item, arrayOrObject, test) {
      var match = false,
          isArray = $.isArray(arrayOrObject);

      $.each(arrayOrObject, function(key, value) {
        var result = isArray ? test(item, value) : test(item, key, value);
        if (result) {
          // As soon as a match is found, set match to true, and return false to stop the `$.each` loop
          match = true;
          return false;
        }
      });
      return match;
    },
    // Return true if two objects are equal
    // (i.e. have the same attributes and attribute values)
    objectsEqual: function(a, b) {
      for (attr in a) {
        if (a.hasOwnProperty(attr)) {
          if (!b.hasOwnProperty(attr) || a[attr] !== b[attr]) {
            return false;
          }
        }
      }
      for (attr in b) {
        if (b.hasOwnProperty(attr) && !a.hasOwnProperty(attr)) {
          return false;
        }
      }
      return true;
    },
    // Taken from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/105074#105074
    randomHash: function() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
  };

  //-----------------------------------------------------------------
  // Build the dynatable plugin
  //-----------------------------------------------------------------

  // Object.create support test, and fallback for browsers without it
  if ( typeof Object.create !== "function" ) {
    Object.create = function (o) {
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

  //-----------------------------------------------------------------
  // Global dynatable plugin setting defaults
  //-----------------------------------------------------------------

  $.dynatableSetup = function(options) {
    defaults = mergeSettings(options);
  };

  // Create dynatable plugin based on a defined object
  $.dynatable = function( object ) {
    $.fn['dynatable'] = function( options ) {
      return this.each(function() {
        if ( ! $.data( this, 'dynatable' ) ) {
          $.data( this, 'dynatable', Object.create(object).init(this, options) );
        }
      });
    };
  };

  $.dynatable(dt);

})(jQuery);

﻿function createAnimalTable(data) {
    $('#tblAnimal').dynatable({
        dataset: {
            records: decode(data)
        },
        table: {
            defaultColumnIdStyle: 'stripSpaces'
        },
        inputs: {
            processingText: 'Fetching new Animals'
        }
    });
}


function deselectAnimal() {
    $(".pop-animal").slideFadeToggle(function () {
        $("#addanimal").removeClass("selected");
    });
}

$(function () {
    $("#addAnimal").live('click', function () {
        if ($(this).hasClass("selected")) {
            deselectAnimal();
        } else {
            $(this).addClass("selected");
            $(".pop-animal").slideFadeToggle(function () {
                $("#racingName").focus();
            });
        }
        return false;
    });

    $("#close-animal").live('click', function () {
        deselectAnimal();
        return false;
    });
});

$(function () {
    $('#submit-add-animal').live('click', function () {
        var dynatable = $('#tblAnimal').data('dynatable');

        dynatable.processingIndicator.hide();
        dynatable.processingIndicator.show();
        $.ajax({
            type: "POST",
            url: '../../../../../Wizard/SaveAnimal',
            data: {
                racingName: $('#racingName').val(),
                stableName: $('#stableName').val(),
                sire: $('#sire').val(),
                dam: $('#dam').val(),
                gender: $('#gender').val(),
                dateOfBirth: $('#dateOfBirth').val(),
                colour: $('#colour').val(),
                markings: $('#markings').val(),
                email: $('#email').val()
            },
            success: function (data) {
                dynatable.records.updateFromJson(data);
                dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records
                dynatable.process();
                dynatable.processingIndicator.hide();
            },
            error: function (data) {
                var test = '';
            }
        });
    });
});
﻿function createOwnerTable(data, tableID) {
    $('#tbl-'+tableID).dynatable({
        dataset: {
            records: decode(data)
        },
        table: {
            defaultColumnIdStyle: 'stripSpaces'
        },
        inputs: {
            processingText: 'Fetching new Owners'
        }
    });
}

function deselectOwner(tableID) {
    $(".pop-owner-"+ tableID).slideFadeToggle(function () {
        $("#addOwner-"+tableID).removeClass("selected");
    });
}

function setupAddOwnerClickEvent(tableID) {
    $("#addOwner-"+tableID).live('click', function () {
        if ($(this).hasClass("selected")) {
            deselectOwner(tableID);
        } else {
            $(this).addClass("selected");
            $(".pop-owner-"+tableID).slideFadeToggle(function () {
                $("#animalName-"+tableID).focus();
            });
        }
        return false;
    });

    $(".close-owner-"+tableID).live('click', function () {
        deselectOwner(tableID);
        return false;
    });
}

function setupClickEvents(tableID) {
    setupAddOwnerClickEvent(tableID);
    setupSubmitAddOwnerClickEvent(tableID);
}

function setupSubmitAddOwnerClickEvent(tableID) {
    $('#submit-add-owner-' + tableID).live('click', function () {
        var dynatable = $('#tbl-' + tableID).data('dynatable');

        dynatable.processingIndicator.hide();
        dynatable.processingIndicator.show();
        $.ajax({
            type: "POST",
            url: '../../../../../Wizard/SaveOwner',
            data: {
                animalName: $('#animal-name-'+ tableID).val(),
                owner: $('#ownerName-' + tableID).val(),
                percentOwned: $('#percentOwned-' + tableID).val(),
                invoiced: $('#invoiced-' + tableID).val(),
                ownerEmail: $('#ownerEmail-' + tableID).val(),
                syndicate: $('#syndicate-' + tableID).val(),
                syndicateName: $('#syndicateName-' + tableID).val(),
                dayPhone: $('#dayPhone-' + tableID).val(),
                nightPhone: $('#nightPhone-' + tableID).val(),
                mobilePhone: $('#mobilePhone-' + tableID).val(),
                address: $('#address-' + tableID).val(),
                stableEmail: $('#email').val()

            },
            success: function (data) {
                dynatable.records.updateFromJson(data);
                dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records;
                dynatable.process();
                dynatable.processingIndicator.hide();
            },
            error: function (data) {
                var test = '';
            }
        });
    });
}
﻿$(function() {

    var stableCharges = {
        
        createStableChargesTable : function(data) {
            $('#tblStableCharges').dynatable({
                dataset: {
                    records: data
                },
                table: {
                    defaultColumnIdStyle: 'asis'
                },
                inputs: {
                    processingText: 'Fetching new Charges'
                }
            }); 
        },
        
        deselectStableCharge: function() {
            $(".pop-stable-charge").slideFadeToggle(function () {
                $("#addStableCharge").removeClass("selected");
            });    
        }
        
    };

    function htmlEncode(value) {
        if (value) {
            return jQuery('<div />').text(value).html();
        } else {
            return '';
        }
    }

    function htmlDecode(value) {
        if (value) {
            return $('<div />').html(value).text();
        } else {
            return '';
        }
    }

    function setupEventListeners() {
        $("#addStableCharge").live('click', function () {
            if ($(this).hasClass("selected")) {
                stableCharges.deselectStableCharge();
            } else {
                $(this).addClass("selected");
                $(".pop-stable-charge").slideFadeToggle(function () {
                    $("#stbl-unit").focus();
                });
            }
            return false;
        });
        
        $("#close-stable-charge").live('click', function () {
            stableCharges.deselectStableCharge();
            return false;
        });

        $('#submit-add-stable-charge').live('click', function () {
            var dynatable = $('#tblStableCharges').data('dynatable');

            dynatable.processingIndicator.hide();
            dynatable.processingIndicator.show();
            $.ajax({
                type: "POST",
                url: '../../../../../Wizard/SaveStableCharge',
                data: {
                    unit: $('#stbl-unit').val(),
                    instable: $('#instable').val(),
                    description: $('#stbl-description').val(),
                    rate: $('#stbl-rate').val(),
                    email: $('#email').val()
                },
                success: function (data) {
                    dynatable.records.updateFromJson(data);
                    dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records
                    dynatable.process();
                    dynatable.processingIndicator.hide();
                },
                error: function (data) {
                }
            });
        });
    }
    
    if (!$('#stableChargeData').length) {
        console.warn('You need to define your data Ryan!');
        return;
    }

    setupEventListeners();
    var stableChargeData = htmlDecode($('#stableChargeData').html());
    stableCharges.createStableChargesTable(JSON.parse(stableChargeData));
});
﻿$(function() {

    var standardCharges = {
        createStandardChargesTable: function(data) {
            $('#tblStandardCharges').dynatable({
                dataset: {
                    records: data
                },
                table: {
                    defaultColumnIdStyle: 'asis'
                },
                inputs: {
                    processingText: 'Fetching new Charges'
                }
            });
        },

        deselectStandardCharge: function() {
            $(".pop-standard-charge").slideFadeToggle(function() {
                $("#addStandardCharge").removeClass("selected");
            });
        }
    };
    
    function setupEventListeners() {
        $('#submit-add-standard-charge').live('click', function() {
            var dynatable = $('#tblStandardCharges').data('dynatable');

            dynatable.processingIndicator.hide();
            dynatable.processingIndicator.show();
            $.ajax({
                type: "POST",
                url: '../../../../../Wizard/SaveStandardCharge',
                data: {
                    description: $('#std-description').val(),
                    rate: $('#std-rate').val(),
                    email: $('#email').val()
                },
                success: function(data) {
                    dynatable.records.updateFromJson(data);
                    dynatable.settings.dataset.originalRecords = dynatable.settings.dataset.records
                    dynatable.process();
                    dynatable.processingIndicator.hide();
                },
                error: function(data) {
                    var test = '';
                }
            });
        });
        
        $("#addStandardCharge").live('click', function () {
            if ($(this).hasClass("selected")) {
                deselectStandardCharge();
            } else {
                $(this).addClass("selected");
                $(".pop-standard-charge").slideFadeToggle(function () {
                    $("#std-description").focus();
                });
            }
            return false;
        });

        $("#close-standard-charge").live('click', function () {
            deselectStandardCharge();
            return false;
        });
    }

    if (!$('#standardChargeData').length) {
        console.warn('You need to define your data Ryan!');
        return;
    }
    
    function htmlEncode(value) {
        if (value) {
            return jQuery('<div />').text(value).html();
        } else {
            return '';
        }
    }

    function htmlDecode(value) {
        if (value) {
            return $('<div />').html(value).text();
        } else {
            return '';
        }
    }
    
    setupEventListeners();
    var standardChargeData = htmlDecode($('#standardChargeData').html());
    standardCharges.createStandardChargesTable(JSON.parse(standardChargeData));
});
