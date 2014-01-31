/**
 * Amazon Alexa Web Information Service module
 *
 * Copyright 2012 Egor M. <egor@ixvar.com>
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

var _ = require('underscore'); // God I wish all this was in JS!
var util = require('util');
var crypto = require('crypto');
var URLrequest = require('request');
var XMLParser = require('libxml-to-js');
var Sequence = require('sequence').Sequence;
var AlexaError = require('./error');

var AlexaAPI = function(accessKey, secretKey, opts) {
    var self = this;

    self.accessKey = accessKey;
    self.secretKey = secretKey;
    self.apiDomain = 'awis.amazonaws.com';
    if(opts) self.URLrequest = URLrequest.defaults(opts);
    else self.URLrequest = URLrequest;
};

module.exports = AlexaAPI;

AlexaAPI.prototype.signRequest = function(request) {
    /**
     * Sign request to Amazon
     *
     * @param {Object} request Amazon request object
     * @returns {String} Request signature
     *
     */

    var self = this;
    var tmpl = 'GET\n%s\n/\n%s';
    var keys = Object.keys(request);
    var requestString = [];

    keys.sort();
    keys.forEach(function(k) {
        if (request[k] !== null && request[k] !== undefined) {
            requestString.push(util.format('%s=%s', encodeURIComponent(k),
                encodeURIComponent(request[k])));
        }
    });

    var stringToSign = util.format(tmpl, self.apiDomain,
        requestString.join('&'));

    var signature = crypto.createHmac('SHA256', self.secretKey);
    signature.update(stringToSign);

    return signature.digest('base64');
};

AlexaAPI.prototype.makeRequest = function(action, urls, responseGroup, auxParams) {
    /**
     * Compose a request based on required action and list or URLs
     *
     * @param {String} action Action name according to Alexa API documentation
     * @param {Array|String} urls One URL or list of URLs
     * @param {Array|String} responseGroup Response Group(s) as per Alexa API
     * @param {Object} auxParams Auxiliary parameters to pass with request
     * @returns {Object} Signed request object
     */

    var self = this;

    if (_.isString(urls)) {
        urls = urls.split(',');
    }

    if (_.isArray(responseGroup)) {
        responseGroup = responseGroup.join(',');
    }

    var request = {
        Signature: undefined,
        SignatureMethod: 'HmacSHA256',
        SignatureVersion: 2,

        AWSAccessKeyId: self.accessKey,
        Action: action,
        Timestamp: new Date().toISOString()
    };

    if (urls.length === 1) {
        request.Url = urls[0];
        request.ResponseGroup = responseGroup;
    } else {
        request[util.format('%s.Shared.ResponseGroup', action)] = responseGroup;
        urls.forEach(function(url, idx) {
            request[util.format('%s.%s.Url', action, idx + 1)] = url;
        });
    }

    if (_.isObject(auxParams)) {
        _.extend(request, auxParams);
    }

    request.Signature = self.signRequest(request);

    return request;

};

AlexaAPI.prototype.get = function(request, cb) {
    /**
     * Retreive URL with request
     *
     * @param {Object} request Request object
     * @param {Function} cb Callback function(err, results)
     */

    var self = this;

    return self.URLrequest.get(util.format('http://%s', self.apiDomain),
        { qs: request }, cb);
};

AlexaAPI.prototype.getURLInfo = function(urls, responseGroup, cb) {
    /**
     * Get Alexa ranking(s) for URL(s)
     *
     * @param {Array|String} urls One URL or list of URLs
     * @param {Array|String} responseGroup Response Group(s) as per Alexa API
     * @param {Function} cb Callback function(err, results)
     */

    var self = this,
        sequence = Sequence.create();

    sequence.then(function(next) {
        self.get(self.makeRequest('UrlInfo', urls, responseGroup), next);
    }).then(function(next, err, response, body) {
        if (err) { return cb(new AlexaError('URLGetError', err)); }
        XMLParser(body, next);
    }).then(function(next, err, result) {
        if (err) { return cb(new AlexaError('XMLParserError', err)); }
        if (result.Errors !== undefined) {
            return cb(new AlexaError(result.Errors.Error.Code,
                result.Errors.Error.Message));
        }
        return cb(null, result);
    });
};


AlexaAPI.prototype.getTrafficHistory = function(urls, range, start, cb) {
    /**
     * Get Alexa trafficHistory for URL(s)
     *
     * @param {Array|String} urls One URL or list of URLs
     * @param {Number|Function=} range Number of days to return; default: 31
     * @param {Number|Function=} start Start date for results; format: 20070801
     * @param {Function=} cb Callback function(err, results)
     */

    var args = Array.prototype.slice.call(arguments),
        self = this,
        sequence = Sequence.create(),
        params = {};

    if(args.length === 2) {
        cb = args[1];
    }
    else if(args.length === 3) {
        params.range = args[1];
        cb = args[2];
    }
    else {
        params.Range = range;
        params.Start = start;
    }

    sequence.then(function(next) {
        self.get(self.makeRequest('TrafficHistory', urls, "History", params), next);
    }).then(function(next, err, response, body) {
        if (err) { return cb(new AlexaError('URLGetError', err)); }
        XMLParser(body, next);
    }).then(function(next, err, result) {
        if (err) { return cb(new AlexaError('XMLParserError', err)); }
        if (result.Errors !== undefined) {
            return cb(new AlexaError(result.Errors.Error.Code,
                result.Errors.Error.Message));
        }
        return cb(null, result);
    });
};


