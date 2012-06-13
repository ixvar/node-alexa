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
var assert = require('assert');
var util = require('util');
var self = {};
var AlexaError = require('../lib/error');

describe('AlexaAPI', function() {
    before(function() {
        self.accessKey = process.env.AMAZON_ACCESS_KEY || '';
        self.secretKey = process.env.AMAZON_SECRET_KEY || '';
        var AlexaAPI = require('..');
        // Init AlexaAPI with predefined keys. We will use real keys later.
        self.api = new AlexaAPI('AccessKey', 'SecretKey');
    });

    describe('#signRequest', function() {
        it('produce correct signature for request', function() {
            var req = {
                c: 'd',
                'é': "c'est drôle",
                a: 'b',
                42: 'Yes it is The Answer alright'
            };
            var expected = 'Ou4p+FC+ztPZi3wY2p4J6RwiPOBKi9fK6CSvOA7CR9o=';
            var result = self.api.signRequest(req);
            assert.strictEqual(result, expected);
        });
    });

    describe('#makeRequest', function() {
        it('makes UrlInfo request for one URL', function() {
            var expected = {
                SignatureMethod: 'HmacSHA256',
                SignatureVersion: 2,
                AWSAccessKeyId: 'AccessKey',
                Action: 'TestAction',
                Url: 'ixvar.com',
                ResponseGroup: 'Rank,UsageStats'
            };
            var result = self.api.makeRequest('TestAction', 'ixvar.com',
                'Rank,UsageStats');
            delete result.Signature;
            delete result.Timestamp;
            assert.ok(_.isEqual(result, expected),
                util.format('Expected «%s», got «%s»', util.inspect(expected),
                    util.inspect(result)));
        });
        it('makes UrlInfo request for list of  URLs', function() {
            var expected = {
                SignatureMethod: 'HmacSHA256',
                SignatureVersion: 2,
                AWSAccessKeyId: 'AccessKey',
                Action: 'TestAction',
                'TestAction.Shared.ResponseGroup': 'Rank,UsageStats',
                'TestAction.1.Url': 'ixvar.com',
                'TestAction.2.Url': 'neatbee.com'
            };
            var result = self.api.makeRequest('TestAction',
                ['ixvar.com', 'neatbee.com'],
                'Rank,UsageStats');
            delete result.Signature;
            delete result.Timestamp;
            assert.ok(_.isEqual(result, expected),
                util.format('Expected «%s», got «%s»', util.inspect(expected),
                    util.inspect(result)));
        });
    });

    describe('#getURLInfo failure', function() {
        it('return AlexaError object when request is bad', function(done) {
            self.api.getURLInfo('ixvar.com', 'TrafficData',
                function(err, result) {
                    assert.ok(err instanceof AlexaError,
                        util.format('Expected AlexaError instance, got «%s»',
                            util.inspect(err)));
                    assert.strictEqual(result, undefined,
                        util.format('Expected nothing, got «%s»',
                            util.inspect(result)));
                    done();
                });
        });
    });

    describe('#getURLInfo', function() {
        before(function() {
            // Now, let's set our keys to real values and make some real requests.
            self.api.accessKey = self.accessKey;
            self.api.secretKey = self.secretKey;
        });
        it('get URL info for one URL', function(done) {
            self.api.getURLInfo('ixvar.com', 'TrafficData',
                function(err, result) {
                    assert.ok(_.isNull(err) || _.isUndefined(err),
                        util.format('Expected no error, got «%s»',
                            util.inspect(err)));
                    assert.ok(_.isObject(result),
                        util.format('Expected object, got «%s»',
                            util.inspect(result)));
                    done();
                });
        });
        it('get URL info for list of URLs', function(done) {
            self.api.getURLInfo('ixvar.com,neatbee.com', 'TrafficData',
                function(err, result) {
                    assert.ok(_.isNull(err) || _.isUndefined(err),
                        util.format('Expected no error, got «%s»',
                            util.inspect(err)));
                    assert.ok(_.isObject(result),
                        util.format('Expected object, got «%s»',
                            util.inspect(result)));
                    done();
                });
        });
    });
});
