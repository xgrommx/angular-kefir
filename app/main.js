(function(ng, Kefir) {
    var kefirModule = ng.module('angular-kefir', []);

    kefirModule.factory('Kefir', ['$window', '$parse', function($window, $parse) {
        var kefir = $window.Kefir;

        kefir.Observable.prototype.$assignProperty = function(scope, property) {
            var setter = $parse(property).assign;

            var unSubscribe = this.onValue(function(value) {
                    return !scope.$$phase ? scope.$apply(function () {
                        setter(scope, value);
                    }) : setter(scope, value);
            });

            scope.$on('$destroy', unSubscribe);

            return this;
        };

        kefir.Observable.prototype.$assignProperties = function(scope, properties) {
            var self = this;

            properties.forEach(function(property) {
                self.$assignProperty(scope, property);
            });

            return self;
        };

        return kefir;
    }]);

    kefirModule.config(['$provide', function($provide) {
        $provide.decorator('$rootScope', ['$delegate', 'Kefir', function($delegate, Kefir) {

            Object.defineProperties($delegate.constructor.prototype, {
                '$fromBinder': {
                    value: function(functionName, listener) {
                        var scope = this;

                        return Kefir.fromBinder(function(emitter) {
                            scope[functionName] = function() {
                                emitter.emit([]);
                            };

                            return function() {
                                delete scope[functionName];
                            };
                        });
                    },
                    enumerable: false
                },
                '$fromEvent': {
                    value: function(eventName) {
                        var scope = this;

                        return Kefir.fromBinder(function(emitter) {
                            var unSubscribe = scope.$on(eventName, function(ev, data) {
                                emitter.emit(data);
                            });

                            scope.$on('$destroy', unSubscribe);

                            return unSubscribe;
                        });
                    },
                    enumerable: false
                },
                '$fromWatch': {
                    value: function(watchExpression, objectEquality) {
                        var scope = this;

                        return Kefir.fromBinder(function(emitter) {
                            function listener(newValue, oldValue) {
                                emitter.emit({ oldValue:oldValue, newValue:newValue });
                            }

                            var unSubscribe = scope.$watch(watchExpression, listener, objectEquality);

                            scope.$on('$destroy', unSubscribe);

                            return unSubscribe;
                        });
                    },
                    enumerable: false
                }
            });

            return $delegate;
        }]);
    }]);

    var app = ng.module('app', ['angular-kefir']);

    app.controller('MainController', ['$scope', 'Kefir', function($scope, Kefir) {

        Kefir.interval(1000, 1).scan(function(a, b) {
            return a + b;
        }, 0).$assignProperty($scope, 'intervalValue');

        var decStream = $scope.$fromBinder('dec').map(function() {
            return -1;
        });
        var incStream = $scope.$fromBinder('inc').map(function() {
            return 1;
        });

        var sum = function(a, b) {
            return a + b;
        };

        incStream.merge(decStream).scan(sum, 0).$assignProperty($scope, 'value');

        $scope.$fromEvent('value').$assignProperty($scope, 'letter');

        $scope.$fromWatch('message').map(function(ev) {
            return ev.newValue;
        }).filter(function(value) {
            return value != undefined;
        }).map(function(value) {
            return value.replace(/([aoe])/g, function(v) {
                return String.fromCharCode(v.charCodeAt(0) + 10);
            });
        }).tap(function(value){
            $scope.$broadcast('value', {
                value: value
            });
        }).$assignProperties($scope, ['text', 'text2']);
    }]);

} (angular, Kefir));