(function () {
    //require(['angular/angular', 'angular/material'], function() {
        'use strict';

        var app = angular
            .module('myApp', ['ngMaterial', 'ngMessages']);

        app.config(function ($mdThemingProvider) {
            $mdThemingProvider.definePalette('medium-green', $mdThemingProvider.extendPalette('light-green', {
                '500': '558B2F'
            }));

            var theme = $mdThemingProvider.theme('default').primaryPalette('medium-green').accentPalette('orange');
            theme.foregroundPalette[3] = 'rgb(158, 158, 158)';
            theme.foregroundPalette[4] = 'rgb(158, 158, 158)';
        });

        app.controller('CatalogChipsSearchCtrl', CatalogChipsSearchCtrl);

        
        /**
         * controller CatalogChipsSearchCtrl
         */
        function CatalogChipsSearchCtrl($timeout, $q, $log, $element, $scope, $mdConstant, $mdDialog, $mdMedia, $mdUtil) {
            var self = this;
            self._inited = false;
            self.coreReady = false;
            self.core = null; //inst of CatalogChipsSearch
            self.parsedChips = [];
            self.chipsSer = '';
            self.sugges = [];
            self.addedHints = [];
            //material ctrls
            self.ctrlAutocomplete = null;
            self.ctrlChips = null;
            self.input = null;
            self.searchText = '';
            self.genreOp = null;
            self.genreChipsCnt = 0;
            self.isMobile = $mdUtil.isMobile();
            self.showAddBtn = $mdUtil.isMobile();
            
            function fixAutocompletePositions() {
                var expCnt = self.core.chips.length;
                var vChips = self.ctrlChips.$element[0].querySelectorAll('md-chip');
                if(expCnt == vChips.length) {
                    self.ctrlAutocomplete.positionDropdown();
                    self.ctrlAutocomplete.adoptWinScroll();
                } else {
                    setTimeout(fixAutocompletePositions, 10);
                }
            }
            
            self.onCoreReady = function(core) {
                self.core = core;
                self.core.setDelegate(self);
                
                //sync
                self.searchText = self.core.unchippedStr;
                self.parsedChips = self.core.chips;
                self.sugges = self.core.sugges;
                self.ctrlAutocomplete.matches = self.suggest();
                self.genreOp = self.core.genreOp;
                
                self.onChipsChanged();
                
                self.coreReady = true;
            }
            
            self.init = function($iscope) {
                if(!self._inited) {
                    self.ctrlAutocomplete = $iscope.$$childTail.$mdAutocompleteCtrl;
                    self.ctrlChips = $iscope.$mdChipsCtrl;
                    _getInputEl(function() {
                        $(self.input).on('keypress', function(ev) {
                            if(ev.keyCode == $mdConstant.KEY_CODE.ENTER) {
                                self.submit();
                            }
                        });
                    });
                    
                    //wait for core load
                    $(document).on('notify_catChipsCore', function(ev) {
                        self.onCoreReady(site.catChipsCore);
                    });
                    
                    self._inited = true;
                }
            };
            
            self.onGenreOpChange = function() {
                self.core.setGenreOp(self.genreOp);
            };
            
            //delegate methods (sync)
            self.onChipsChanged = function() {
                self.chipsSer = self.core.chipsSer;
                self.parsedChips = self.core.chips;
                
                var cnt = 0;
                for(var i = 0 ; i < self.core.chips.length ; i++) {
                    var chip = self.core.chips[i];
                    if(chip.field == 'genre')
                        cnt++;
                }
                self.genreChipsCnt = cnt;
                
                fixAutocompletePositions();
                
                //... history state change
            };
            self.onHintsStackChanged = function() {
                //unsupported
            };
            self.onUnchippedStrChanged = function() {
                if(self.searchText !== self.core.unchippedStr) {
                    self.searchText = self.core.unchippedStr;
                }
            };
            self.onSetSugges = function() {
                self.sugges = self.core.sugges;
            };
            self.onAddedHintsChanged = function() {
                self.addedHints = self.core.addedHints;
            };
            
            self.searchTextChange = function(searchText) {
                //console.log('> text change', '"'+searchText+'"');
                var wasInvalidSuggApplied = self.core.setSearchStr(searchText, 0, 1);
                if(wasInvalidSuggApplied) {
                    //не должно быть, т.к. валидацией чипов занимается transformChip() в момент добавления
                }
            };
            
            self.transformChip = function(chip) {
                if(self.core.isSugg(chip)) {
                    //если в чипы пытается добавиться предположение (angular material делает это по умолчанию при выборе), 
                    // не разрешать, а вместо этого применить этот sugg к строке
                    var sugg = chip;
                    chip = null;
                    self._applySugg(sugg);
                } else if(!self.core.isValidChip(chip)) {
                    chip = null;
                }
                return chip;
            };
            
            self.onChipAdd = function(chip, index) {
            };
            
            self.onChipRemove = function(chip, index) {
                self.core.chipsModified();
                
                var expCnt = self.core.chips.length;
                var vChips = self.ctrlChips.$element[0].querySelectorAll('md-chip');
                if(expCnt != vChips.length) {
                    var remChip = vChips[index];
                    var repositionDropdownWhenChipRemovedFromDOM = function() {
                        if(!document.contains(remChip)) {
                            self.ctrlAutocomplete.positionDropdown();
                        } else {
                            setTimeout(repositionDropdownWhenChipRemovedFromDOM, 10);
                        }
                    };
                    repositionDropdownWhenChipRemovedFromDOM();
                }
            };
            
            self.suggest = function(searchText) {
                //console.log('> suggest', '"'+self.searchText+'"');
                return self.sugges;
            };
            
            /*
            self.addChip = function(chip) {
                self.parsedChips.push(chip);
            };
            */

            self._clearSearchStr = function() {
                self.core.setSearchStr('', 0);
            };
            
            self._applySugg = function(sugg) {
                self.core.applySuggestion(sugg);
            };
            
            self._cancelLastHint = function() {
                self.core.popHint();
            };

            self.openSuggesDlg = function(ev) {
                self._clearSearchStr();
                var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
                $mdDialog.show({
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    fullscreen: useFullScreen,
                    parent: angular.element(document.body),
                    template: 
                    '    <md-dialog>\
                            <md-toolbar>\
                              <div class="md-toolbar-tools">\
                                <h2 ng-if="ctrl.addedHints.length == 0">Добавьте фильтр</h2>\
                                <h2 ng-if="ctrl.addedHints.length > 0">{{ctrl.addedHints[0].name}}</h2>\
                                <span flex></span>\
                                <md-button class="md-icon-button" ng-click="closeDialog()">\
                                  <md-icon>\
                                  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fit="" preserveAspectRatio="xMidYMid meet" focusable="false"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>\
                                  </md-icon>\
                                </md-button>\
                              </div>\
                            </md-toolbar>\
                            <md-dialog-content>\
                                <md-list>\
                                    <md-list-item ng-repeat="item in ctrl.sugges"  ng-click="onClickSugg($event, item)">\
                                        {{item.name}}\
                                    </md-list-item>\
                                </md-list>\
                            </md-dialog-content>\
                            <md-dialog-actions>\
                                <md-button ng-show="ctrl.addedHints.length" ng-click="back()" class="md-primary">Назад</md-button>\
                                <span flex></span>\
                                <md-button ng-click="closeDialog()" class="md-primary">Закрыть</md-button>\
                            </md-dialog-actions>\
                        </md-dialog>\
                    ',
                    scope: $scope,
                    preserveScope: true,
                    controller: function($scope, $mdDialog) {
                        $scope.closeDialog = function() {
                            $mdDialog.hide();
                        };
                        $scope.back = function() {
                            self._cancelLastHint();
                        };
                        $scope.onClickSugg = function(ev, sugg) {
                            self._applySugg(sugg);
                        };
                    },
                })
                .then(function(ret) {
                    //вызывается при закрытии по .hide(ret)
                    self._clearSearchStr();
                }, function() {
                    //вызывается при закрытии по клике снаружи
                    self._clearSearchStr();
                });
            };
            
            
            self.submit = function() {
                self.core.parseChips(1);
                
                //... history state change
                window.location = '/catalog/filter/' + self.chipsSer;
            };
            
            function _getInputEl(onsuccess) {
                self.input = document.getElementById(self.ctrlAutocomplete.scope.inputId ? self.ctrlAutocomplete.scope.inputId : (self.ctrlAutocomplete.scope.floatingLabel ? "fl-input-" : "input-") + self.ctrlAutocomplete.id);
                
                if(self.input) {
                    if(onsuccess)
                        onsuccess();
                } else {
                    setTimeout(function() {
                        _getInputEl(onsuccess);
                    }, 100);
                }
            }
        }
        
        
    //});
    
})();