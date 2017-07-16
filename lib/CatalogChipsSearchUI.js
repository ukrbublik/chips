(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./CatalogChipsSearchCore', 'jquery', 'jquery.ba-throttle-debounce'], factory);
    } else {
        CatalogChipsSearchUI = factory(CatalogChipsSearch, jQuery);
    }
}(function(CatalogChipsSearch, $) {
    
    /**
     * class CatalogChipsSearchUI
     *
     * todo:
     * ? в hint dlg добавить текстовое поле для списков
     */
    function CatalogChipsSearchUI(id_, $container_, core_, options_) {
        var self = this;
        
        self.id = id_;
        self.options = {};
        self.core = null;
        self.searchText = '';
        self.chips = [];
        self.chipsSer = '';
        self.sugges = [];
        
        self.hintsStack = [];
        self.genreOp = null;
        self.genreChipsCnt = 0;
        
        self.$container = null;
        self.$wrap = null;
        self.$input = null;
        self.$inputWr = null;
        self.input = null;
        self.$chips = null;
        self.$suggesWr = null;
        self.$genreOpSw = null;
        self.$genreOpC = null;
        self.$addBtn = null;
        self.$hintDlg = null;
        self.$hintDlgTitle = null;
        self.$hintDlgList = null;
        self.$hintDlgBack = null;
        self.$submitBtn = null;
        
        self.selectedSuggIndex = -1;
        self.selectedChipIndex = -1;
        self.isVisible = false;
        self.isFocused = false;
        var watchingKeyboardAnimations = false;
        var tmpSuggWasSelected = false;
        var tmpBlurOnKbHide = false;
        
        var defaultOptions = {
            orientation: 'auto', //auto, top, bottom
            mobileStickDropdownTo: 'top1', //top, bottom, top1 (для видимости 1 строки чипа)
            mobileForceStickDropdown: false,
            gutterX: 0, //spacing from left/right edge
            gutterY: 2,
            hideRightAfterBlur: false, //true is not recommended
            hideDelay: 50,
            keyThrottleInterval: 20,
            winResizeThrottleInterval: 100,
            winScrollThrottleInterval: 100,
            onSubmit: function(chipsSer) { },
            onChipsChanged: function(chipsSer, isInit) { },
            onDestroy: function() {},
            maxSuggesHeight: 450,
            showAddBtn: true,
            debug: 0
        };
        
        self.init = function() {
            if(!$container_.length)
                return;
            
            //options
            self.options = $.extend({}, defaultOptions, options_);
            if(self.options.showAddBtn == -1)
                self.options.showAddBtn = self.isMobile();
            
            $(document.body).toggleClass('mobile', self.isMobile());
            
            //dom
            self.$container = $container_;
            self.$wrap = self.$container.find('.ccs-wrap');
            self.$input = self.$wrap.find('.ccs-input');
            self.$back = self.$wrap.find('.ccs-back');
            self.input = self.$input.get(0);
            self.$inputWr = self.$wrap.find('.ccs-input-wrap');
            self.$chips = self.$wrap.find('.ccs-chips');
            self.$suggesWr = self.$wrap.find('.ccs-sugges');
            self.$suggesC = self.$suggesWr.find('.dropdown-content');
            self.$genreOpC = self.$container.find('.ccs-genre-op');
            self.$genreOpSw = self.$genreOpC.find('input');
            self.$addBtn = self.$container.find('.ccs-add');
            self.$hintDlg = self.$container.find('.ccs-hint-dlg');
            self.$hintDlgTitle = self.$hintDlg.find('.modal-header nav span.nav-title');
            self.$hintDlgList = self.$hintDlg.find('.modal-content .ccs-hints');
            self.$hintDlgBack = self.$hintDlg.find('.modal-footer .modal-back');
            self.$addBtn.toggle(self.options.showAddBtn);
            self.$submitBtn = self.$container.find('.ccs-submit');
            
            //initial sync
            self.core = core_;
            self.core.setDelegate(self);
            self.genreOp = self.core.genreOp;
            self.onChipsChanged(true);
            self.onUnchippedStrChanged();
            self.onSetSugges();
            self.$genreOpSw.prop('checked', self.genreOp == 'and');
            self.onGenreOpChange();
            
            //activate
            self.activate();
        };
        
        self.activate = function() {
            //dom
            self.$input.attr('autocomplete', 'off');
            self.$suggesC.css('opacity', 1).show();
            self.$suggesWr.appendTo(document.body).hide();
            
            //bind events
            self.$suggesWr.on('mouseover.ccs', '.ccs-sugg', self.onSuggMouseOver);
            self.$suggesWr.on('mouseout.ccs', self.onSuggesMouseOut);
            self.$suggesWr.on('click.ccs', '.ccs-sugg:not(.has-yesno)', self.onClickSugg);
            self.$suggesWr.on('click.ccsYesNo', '.ccs-sugg.has-yesno .btn', self.onClickSuggYesNo);
            
            self.$chips.on('focus.ccs', '.ccs-chip', self.onChipFocus);
            self.$chips.on('blur.ccs', '.ccs-chip', self.onChipBlur);
            self.$chips.on('click.ccs', '.ccs-chip .material-icons', self.onClickChipIcon);

            $(window).on('resize.ccsT', $.throttle(self.options.winResizeThrottleInterval, self.onWinResizeT));
            $(window).on('scroll.ccsT', $.throttle(self.options.winScrollThrottleInterval, self.onWinScrollT));
            $(window).on('mousewheel.ccs', self.onWinMouseWheel);

            self.$wrap.on('click.ccs', self.onWrapClick);
            
            self.$input.on('keydown.ccs', self.onKeyPress);
            self.$input.on('keyup.ccs', self.onKeyUp);
            self.$input.on('blur.ccs', self.onBlur);
            self.$input.on('focus.ccs', self.onFocus);
            self.$input.on('change.ccs', self.onKeyUp);
            self.$input.on('input.ccs', self.onKeyUp);
            
            self.$submitBtn.on('click.css', self.submit);
            self.$addBtn.on('click.css', self.openHintDlg);
            
            self.$back.on('click.ccs', self.onClickBack);
            self.$hintDlgList.on('click.ccs', '.ccs-sugg:not(.has-yesno)', self.onClickHint);
            self.$hintDlgList.on('click.ccsYesNo', '.ccs-sugg.has-yesno .btn', self.onClickHintYesNo);
            self.$hintDlgBack.on('click.ccs', self.hintDlgBack);
            self.$genreOpSw.on('change.css', self.onGenreOpChange);
            
            if(self.$input.is(':focus'))
                self.onFocus();
        };
        
        self.deactivate = function() {
            //dom
            self.$suggesWr.detach();
            
            //unbind events
            //self.$suggesWr.off('mouseover.ccs');
            //self.$suggesWr.off('mouseout.ccs');
            //self.$suggesWr.off('click.ccs');
            //self.$suggesWr.off('click.ccsYesNo');
            
            self.$chips.off('focus.ccs');
            self.$chips.off('blur.ccs');
            self.$chips.off('click.ccs');
            
            $(window).off('resize.ccsT');
            $(window).off('scroll.ccsT');
            $(window).off('mousewheel.ccs');
            
            self.$wrap.off('click.ccs');
            
            self.$input.off('keydown.ccs');
            self.$input.off('keyup.ccs');
            self.$input.off('blur.ccs');
            self.$input.off('focus.ccs');
            self.$input.off('change.ccs');
            self.$input.off('input.ccs');
            
            self.$submitBtn.off('click.css');
            self.$addBtn.off('click.css');
            
            self.$back.off('click.ccs');
            self.$hintDlgList.off('click.ccs');
            self.$hintDlgList.off('click.ccsYesNo');
            self.$hintDlgBack.off('click.ccs');
            self.$genreOpSw.off('change.css');
        };
        
        self.destroy = function() {
            self.hideAndBlur();
            $(document).off('click', hideFn);
            self.deactivate();

            self.$hintDlg.closeModal();

            self.options.onDestroy();
            delete CatalogChipsSearchUI._instances[self.id];
        };
        
        self.hide = function() {
            disableHideFn();
            self.hideSuggesWr();
        };
        
        self.hideAndBlur = function() {
            self.hide();
            self.$input.blur();
        };
        
        // Hide sugges list not right on blur, but on click elsewhere on page after blur
        var hideIntervalId = null;
        var hideFnEnabled = false;
        var hideFn = function(e) {
            var doHide = !( $(e.target).closest('.ccs-sugg').length || document.activeElement == self.input );
            if(self.options.debug) console.info("CCS.hideFn ", doHide);
            if (doHide) {
                delayedHide();
                disableHideFn();
            }
        };
        var enableHideFn = function () {
            if(!hideFnEnabled)
                $(document).on('click', hideFn);
            hideFnEnabled = true;
        };
        var disableHideFn = function () {
            if(hideFnEnabled)
                $(document).off('click', hideFn);
            hideFnEnabled = false;
        };
        var delayedHide = function () {
            stopDelayedHide();
            hideIntervalId = window.setInterval(function () {
                if (self.isVisible) {
                    self.hideSuggesWr();
                }
                
                stopDelayedHide();
            }, self.options.hideDelay);
        };
        var stopDelayedHide = function () {
            window.clearInterval(hideIntervalId);
        };
        
        //
        // Events
        //
        self.onWrapClick = function(e) {
            //click on empty space or chip => returrn focus
            var doFocus = (e.target == self.$chips.get(0) || e.target == self.$wrap.get(0) || self.isMobile() && $(e.target).closest('.ccs-chip').length);
            if(self.options.debug) console.info("CCS.onWrapClick  doFocus=", doFocus);
            if(doFocus) 
                self.input.focus();
        };
        
        self.onWinResizeT = function (e) {
            if (self.isVisible && !watchingKeyboardAnimations) {
                self.fixPosition();
            }
        };
        
        self.onWinMouseWheel = function (e) {
            var delta = e.originalEvent.deltaY || e.originalEvent.detail || e.originalEvent.wheelDelta;
            if (self.isVisible && !watchingKeyboardAnimations && !self.isMobile()) {
                var prevent = false;
                if ($(e.target).closest('.ccs-sugges').length) {
                    var isSrolledToBottom = (self.$suggesWr.height() + self.$suggesWr.scrollTop()) >= self.$suggesC.height();
                    var isSrolledToTop = self.$suggesWr.scrollTop() <= 0;
                    prevent = delta > 0 && isSrolledToBottom || delta < 0 && isSrolledToTop;
                } else {
                    prevent = true;
                }
                if(prevent) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };
        
        self.onWinScrollT = function (e) {
            if (self.isVisible && !watchingKeyboardAnimations && !self.isMobile()) {
                if (!isElementVisible(self.input))
                    self.hideAndBlur();
                //else
                //    self.fixPosition();
            }
        };
        
        self.onChipFocus = function(e) {
            var index = $(this).data('index');
            self.selectChip(index);
        };
        
        self.onChipBlur = function(e) {
            var index = $(this).data('index');
            self.selectChip(-1);
        };
        
        self.onClickChipIcon = function(e) {
            if($(e.target).text() == 'close') {
                e.stopImmediatePropagation();
                e.preventDefault();
                var $chip = $(e.target).closest('.ccs-chip');
                var index = $chip.data('index');
                self.removeChip(index);
                
                var doFocus = self.isVisible;
                if(self.options.debug) console.info("CCS.onClickChipIcon  doFocus=", doFocus);
                if(doFocus)
                    self.input.focus();
            }
        };
        
        self.onClickSugg = function(ev) {
            var index = $(this).data('index');
            self.selectSugg(index);
        };
        
        self.onClickSuggYesNo = function(ev) {
            var $trg = $(ev.target);
            var $li = $trg.closest('.ccs-sugg');
            var index = $li.data('index');
            var isYesBtn = $(this).is('.btn.green');
            var sugg = self.sugges[index];
            self.selectSugg(index, isYesBtn);
        };
        
        self.onSuggMouseOver = function() {
            var index = $(this).data('index');
            self.activateSugg(index);
        };
        
        self.onSuggesMouseOut = function() {
            self.activateSugg(-1);
        };
        
        self.onClickHint = function(ev) {
            var index = $(this).data('index');
            setTimeout(function() {
                self.selectHint(index);
            }, 150); //tip: 150ms to see hightlight
            return false;
        };
        
        self.onClickHintYesNo = function(ev) {
            var $trg = $(ev.target);
            var $li = $trg.closest('.ccs-sugg');
            var index = $li.data('index');
            var isYesBtn = $(this).is('.btn.green');
            var sugg = self.sugges[index];
            
            self.selectHint(index, isYesBtn);
            return false;
        };
        
        self.onClickBack = function(ev) {
            self.doBack();
            
        };
        
        
        //
        // Input - events
        //
        self.onFocus = function (e) {
            self.isFocused = true;
            self.$wrap.toggleClass('focused', self.isFocused || self.selectedChipIndex != -1);
            if(self.options.debug) console.info("CCS.onFocus");
            
            if(self.isMobile()) {
                //enableBlurFn();
                self.enableBodyScroll(false);
                self.showSuggesWr();
                
                self.watchKeyboardAnimations(function onOpening(kbHeight, winHeight) {
                    self.fixPosition();
                }, function onOpened(kbHeight, winHeight) {
                }, function onClosing(kbHeight, winHeight) {
                    self.fixPosition();
                    if(self.input == document.activeElement) {
                        //user could click system 'back' btn, so kb will hide, but input remain focused => unfocus it
                        if(self.options.debug) console.info("CCS clicked sys back btn => blur input");
                        if(self.isFocused)
                            tmpBlurOnKbHide = true;
                        self.input.blur();
                    } else if (self.isVisible) {
                        //strange, sometimes when clicked on empty space and i don't see click event caused it => anyway hide
                        if(self.options.debug) console.info("CCS kb did hide => hide sugges");
                        disableHideFn();
                        self.hideSuggesWr();
                    }
                }, function onClosed(kbHeight, winHeight) {
                });
            } else {
                self.showSuggesWr();
            }
        };

        self.onBlur = function (e) {
            self.isFocused = false;
            self.$wrap.toggleClass('focused', self.isFocused || self.selectedChipIndex != -1);
            if(self.options.debug) console.info("CCS.onBlur", tmpSuggWasSelected, tmpBlurOnKbHide);
            if(self.isMobile()) {
                //disableBlurFn();
                var _tmpSuggWasSelected = tmpSuggWasSelected,
                    _tmpBlurOnKbHide = tmpBlurOnKbHide;
                tmpBlurOnKbHide = tmpSuggWasSelected = false;
                if(_tmpSuggWasSelected) {
                    //(sometimes???) sugg was clicked, input just dropped focus => restore it
                    self.input.focus();
                } else {
                    if(_tmpBlurOnKbHide) {
                        self.hideSuggesWr();
                    } else if(self.options.hideRightAfterBlur) {
                        self.hideSuggesWr();
                    } else {
                        enableHideFn();
                    }
                }
            } else {
                if(self.options.hideRightAfterBlur)
                    self.hideSuggesWr();
                else
                    enableHideFn();
            }
        };

        self.onKeyPress = function(e) {
            // If sugges are hidden and user presses arrow down, display sugges:
            if (!self.isVisible && e.which === keys.DOWN) {
                self.showSuggesWr();
                return;
            }
            if (!self.isVisible)
                return;

            switch (e.which) {
                case keys.ESC:
                    self.hideSuggesWr();
                    self.$input.blur();
                    break;
                case keys.BACKSPACE:
                    if(self.searchText === '' && self.chips.length) {
                        if(self.selectedChipIndex != -1 && self.selectedChipIndex == (self.chips.length - 1)) {
                            self.removeChip(self.selectedChipIndex);
                            self.selectChip(self.chips.length - 1);
                        } else {
                            self.selectChip(self.chips.length - 1);
                        }
                    } else return;
                    break;
                case keys.RIGHT:
                    return;
                case keys.TAB:
                    /*if (self.selectedSuggIndex === -1) {
                        self.hideSuggesWr();
                        return;
                    }
                    self.selectSugg(self.selectedSuggIndex);
                    */
                    break;
                case keys.RETURN:
                    if (self.selectedSuggIndex === -1) {
                        //self.hideSuggesWr();
                        //self.$input.blur();
                        self.doSubmit();
                        return;
                    }
                    self.selectSugg(self.selectedSuggIndex);
                    break;
                case keys.UP:
                    self.moveUp();
                    break;
                case keys.DOWN:
                    self.moveDown();
                    break;
                default:
                    return;
            }

            // Cancel event if function did not return:
            e.stopImmediatePropagation();
            e.preventDefault();
        };
        
        var onValueChangeIntervalId = null;
        self.onKeyUp = function (e) {
            switch (e.which) {
                case keys.UP:
                case keys.DOWN:
                    return;
            }

            var value = self.$input.val();
            clearInterval(self.onValueChangeIntervalId);

            if (self.searchText !== value) {
                if(self.options.throttle)
                    $.throttle(self.options.keyThrottleInterval, self.onValueChange);
                else
                    self.onValueChange();
            }
        };

        self.onValueChange = function () {
            var value = self.$input.val();
            clearInterval(self.onValueChangeIntervalId);
            self.searchText = value;
            self.selectedSuggIndex = -1;
            self.core.setSearchStr(self.searchText, 0);
        };
        
        self.moveUp = function () {
            var newIndex = (self.selectedSuggIndex === -1 ? self.sugges.length - 1 : self.selectedSuggIndex - 1);
            if(newIndex >= 0 && newIndex < self.sugges.length) {
                self.activateSuggAndAdjustScroll(newIndex);
            }
        };

        self.moveDown = function () {
            var newIndex = (self.selectedSuggIndex === -1 ? 0 : self.selectedSuggIndex + 1);
            if(newIndex >= 0 && newIndex < self.sugges.length) {
                self.activateSuggAndAdjustScroll(newIndex);
            }
        };

        //
        // Chips list
        //
        self.buildChips = function() {
            var $container = self.$chips;
            $container.find('.ccs-chip').remove();
            var html = '';
            $.each(self.chips, function (i, chip) {
                html += "<div tabindex='0' data-index='"+i+"' class='ccs-chip chip'>";
                html += "<span class='ccs-chip-field ccs-chip-field-" + chip.field + "'>" + chip.fieldName + "</span>";
                html += "<span class='ccs-chip-name'>" + chip.name + "</span>";
                html += "<i class='material-icons'>close</i>";
                html += "</div>";
            });        
            $(html).prependTo($container);
        };
        
        self.selectChip = function (index) {
            var $container = self.$chips;
            $container.find('.selected').removeClass('selected');
            self.selectedChipIndex = index;
            self.$wrap.toggleClass('focused', self.isFocused || self.selectedChipIndex != -1);
            
            if (index >= 0 && index < self.chips.length) {
                var $activeItem = $container.find('.ccs-chip:visible:eq(' + self.selectedChipIndex + ')');
                $activeItem.addClass('selected');
                return $activeItem;
            }
        };
        
        self.removeChip = function(index) {
            if (index >= 0 && index < self.chips.length) {
                var $container = self.$chips;
                var $chip = $container.find('.ccs-chip:visible:eq(' + index + ')');
                if(self.selectedChipIndex == index)
                    self.selectedChipIndex = -1;
                $chip.remove();
                self.core.deleteChip(index);
            }
        };

        var oneChipHeight = null;
        var oneChipFullHeight = null;
        self.getChipHeight = function(full) {
            if(oneChipHeight === null) {
                var $chip = self.$chips.find('.ccs-chip:visible:eq(0)');
                if($chip.length) {
                    oneChipHeight = $chip.outerHeight();
                    oneChipFullHeight = $chip.outerHeight(true);
                }
            }
            return (full ? oneChipFullHeight : oneChipHeight);
        };
        
        self.getChipsLines = function(withEmptyInputLine /* = true */) {
            if(withEmptyInputLine === undefined)
                withEmptyInputLine = true;
            var h = self.getChipHeight(true);
            var l = 0;
            if(h) {
                if(withEmptyInputLine) {
                    l = Math.round(self.$chips.height() / h);
                } else {
                    var $firstChip = self.$chips.find('.ccs-chip:visible:first');
                    var $lastChip = self.$chips.find('.ccs-chip:visible:last');
                    if($firstChip.length)
                        l = Math.round(($lastChip.offset().top - $firstChip.offset().top) / h) + 1;
                }
            }
            return l;
        };
        self.isInputOnNewChipsLine = function() {
            var l1 = self.getChipsLines(false);
            var l2 = self.getChipsLines(true);
            return l1 > 0 && l2 > l1;
        };
        
        //
        // Suggestions list
        //
        var oneSuggHeight = null;
        self.getSuggHeight = function() {
            if(oneSuggHeight === null) {
                var $sugg = self.$suggesWr.find('.ccs-sugg:visible:eq(0)');
                if($sugg.length) {
                    oneSuggHeight = $sugg.outerHeight();
                }
            }
            return oneSuggHeight;
        };
        
        self.fixPosition = function() {
            if(!self.isVisible)
                return;
            var orientation = self.options.orientation;
            var $container = self.$suggesWr,
                container = $container.get(0),
                $ul = self.$suggesC,
                ul = self.$suggesC.get(0);
            
            var windowHeight = window.innerHeight,
                //bodyHeight = $(document.body).outerHeight(),
                bodyHeight = self.getDocumentHeight(),
                scrollTop = self.getRealScrollOffset(),
                inputOffset = self.$inputWr.offset(),
                inputHeight = self.$inputWr.outerHeight(),
                inputWidth = self.$inputWr.outerWidth(),
                currContainerHeight = $container.outerHeight(),
                containerFullHeight = ul.scrollHeight, //tip: 0 if not visible!
                containerWidth = $container.outerWidth();
            if(!isBodyScrollEnabled) {
                inputOffset.top += scrollTop;
            }
            var inputViewOffsetTop = inputOffset.top - scrollTop; //according to viewport
            var maxContainerHeight = 0;
            var styles = { 'top': inputOffset.top, 'left': inputOffset.left };
            
            //Fro mobile - Stick to top or bottom of screen
            if(self.isMobile()) {
                var lastChipLineHeight = (self.isInputOnNewChipsLine() ? self.getChipHeight() + 4 /*gutter*/ : 0);
                var shouldStickTo = self.options.mobileStickDropdownTo;
                if(!lastChipLineHeight && shouldStickTo == 'top1')
                    shouldStickTo = 'top';
                var isStickedToTop = (inputViewOffsetTop == (0 + self.options.gutterY));
                var isStickedToTop1 = (inputViewOffsetTop == (lastChipLineHeight + self.options.gutterY));
                var isStickedToBottom = ((inputViewOffsetTop + inputHeight) == (windowHeight - self.options.gutterY));
                var stickedTo = (isStickedToBottom ? 'bottom' : (isStickedToTop ? 'top' : (isStickedToTop1 ? 'top1' : null)));
                if(!stickedTo || stickedTo != shouldStickTo) {
                    var availTopSpace = inputOffset.top;
                    var availBottomSpace = bodyHeight - (inputOffset.top + inputHeight);
                    var canStickToBottom = (availTopSpace >= (windowHeight - inputHeight));
                    var canStickToTop = (availBottomSpace >= (windowHeight - inputHeight));
                    var canStickToTop1 = (availBottomSpace >= (windowHeight - inputHeight - lastChipLineHeight));
                    var stickTo = shouldStickTo;
                    if(shouldStickTo == 'bottom' && !canStickToBottom || shouldStickTo == 'top' && !canStickToTop || shouldStickTo == 'top1' && !canStickToTop1) {
                        if(self.options.mobileForceStickDropdown) {
                            //stick not fully
                        } else {
                            if(stickedTo)
                                stickTo = null; //just left stickedTo
                            else if(canStickToTop1)
                                stickTo = 'top1';
                            else if(canStickToTop)
                                stickTo = 'top';
                            else
                                stickTo = 'top'; //if can't fully stick to nothing, stick to top anyway
                        }
                    }
                    if(stickTo) {
                        var newScrollTop = null;
                        if(stickTo == 'top')
                            newScrollTop = inputOffset.top;
                        else if(stickTo == 'top1')
                            newScrollTop = inputOffset.top - lastChipLineHeight;
                        else if(stickTo == 'bottom')
                            newScrollTop = inputOffset.top + inputHeight - windowHeight;
                        var minScrollTop = 0, maxScrollTop = bodyHeight - windowHeight;
                        //not overflow body view boundaries, better clip sugges container height:
                        newScrollTop = Math.max(Math.min(newScrollTop, maxScrollTop), minScrollTop);
                        stickedTo = stickTo;
                        self.setRealScrollOffset(newScrollTop);
                        scrollTop = newScrollTop;
                        inputViewOffsetTop = inputOffset.top - scrollTop;
                    }
                }
                if(stickedTo) {
                    orientation = (stickedTo == 'bottom' ? 'top' : 'bottom');
                    maxContainerHeight = windowHeight - inputHeight - (stickedTo == 'top1' ? lastChipLineHeight : 0);
                }
            }
            
            if(orientation === 'auto') {
                var topOverflow = inputViewOffsetTop - containerFullHeight; //how much free space will left on top
                var bottomOverflow = windowHeight - (inputViewOffsetTop + inputHeight + containerFullHeight); //how much free space will left on bottom
                orientation = (Math.max(topOverflow, bottomOverflow) === topOverflow) ? 'top' : 'bottom';
            }
            
            maxContainerHeight = (orientation == 'top' ? (inputViewOffsetTop) : (windowHeight - (inputViewOffsetTop + inputHeight)))
            var containerHeight = Math.min(maxContainerHeight, self.options.maxSuggesHeight, containerFullHeight ? containerFullHeight : 9999);
            
            if(orientation === 'top') {
                styles.top -= containerHeight;
                if((styles.top - scrollTop) < self.options.gutterY) {
                    var d = (self.options.gutterY - (styles.top - scrollTop));
                    containerHeight -= d;
                    styles.top += d;
                }
            } else {
                styles.top += inputHeight;
                if(styles.top - scrollTop + containerHeight > windowHeight - self.options.gutterY) {
                    var d = styles.top - scrollTop + containerHeight - (windowHeight - self.options.gutterY);
                    containerHeight -= d;
                }
            }
            styles['max-height'] = containerHeight;
            
            var align = 'left';
            if (inputOffset.left + containerWidth > $(window).width()) {
                // Dropdown goes past screen on right, force right alignment
                align = 'right';
            } else if (inputOffset.left - containerWidth + inputWidth < 0) {
                // Dropdown goes past screen on left, force left alignment
                align = 'left';
            }
            if (align === 'left') {
                styles.left = inputOffset.left + self.options.gutterX;
            } else if (align === 'right') {
                var offsetRight = inputOffset.left + self.$inputWr.outerWidth() - $container.outerWidth();
                styles.left = offsetRight - self.options.gutterX;
            }

            $container.css(styles);
        };
        
        self.buildSuggesListHtml = function(forHintsDlg) {
           var html = '';
            $.each(self.sugges, function (i, sugg) {
                var cl = "collection-item ccs-sugg valign-wrapper ccs-sugg-type-"+sugg.what;
                var hasSecondaryContent = sugg.showYesNo || sugg.chip !== undefined;
                if(sugg.what != 'divider') {
                    if(sugg.disabled)
                        cl += " ccs-sugg-disabled";
                    if(sugg.showYesNo)
                        cl += " has-yesno";
                    if(hasSecondaryContent)
                        cl += " has-secondary-content";
                }
                html += "<li class='" + cl + "' data-index=" + i + ">";
                if(sugg.what != 'divider') {
                    html += "<div class='valign'>";
                    html += "<span class='primary-content'>";
                        html += sugg.name;
                    html += "</span>";
                    var isYes;
                    if(sugg.chip !== undefined) {
                        isYes = sugg.chip.isYes;
                        var isRev = (sugg.type == 'bool' && sugg.el.val == 0); //tip: есть чип "онгоинг: нет", ввел "заверше" - в подсказке должно стоять наоборот Yes
                        if(isRev)
                            isYes = !isYes;
                    } else if(sugg.fakeIsYes !== undefined) {
                        isYes = sugg.fakeIsYes;
                    }
                    if(sugg.showYesNo) {
                        html += "<span class='secondary-content'>";
                            html += "<a class='waves-effect waves-light btn green" + (isYes === true ? " checked" : "") + "'><i class='material-icons'>done</i></a>";
                            html += "<a class='waves-effect waves-light btn red" + (isYes === false ? " checked" : "") + "'><i class='material-icons'>clear</i></a>";
                        html += "</span>";
                    } else if(sugg.chip !== undefined) {
                        html += "<span class='secondary-content'>";
                            html += "<i class='material-icons'>" + (isYes ? "done" : "clear") + "</i>";
                        html += "</span>";
                    }
                    html += "</div>";
                }
                html += "</li>";
            });
            return html;
        };
        
        self.buildSuggesC = function() {
            var $container = self.$suggesC;
            var html = self.buildSuggesListHtml(false);
            $container.html(html);
            self.selectedSuggIndex = -1;
        };
        
        self.hideSuggesWr = function () {
            self.core.resetFakeField();
            
            var $container = self.$suggesWr;
            self.selectedSuggIndex = -1;
            clearInterval(self.onValueChangeIntervalId);
            $container.hide();
            self.isVisible = false;
            self.$wrap.addClass('ccs-sugges-hidden');
            
            if(self.isMobile())
                self.enableBodyScroll(true);
        };
        
        self.showSuggesWr = function() {
            var $container = self.$suggesWr;
            $container.show();
            self.isVisible = true;
            self.$wrap.removeClass('ccs-sugges-hidden');
            self.fixPosition();
        };
        
        self.activateSugg = function (index) {
            var $container = self.$suggesWr;
            $container.find('.selected').removeClass('selected');
            self.selectedSuggIndex = index;

            if (index >= 0 && index < self.sugges.length) {
                var $activeItem = $container.find('.ccs-sugg:eq(' + self.selectedSuggIndex + ')');
                $activeItem.addClass('selected');
                return $activeItem;
            }

            return null;
        };
        
        self.selectSugg = function (index, isYesBtn) {
            if(document.activeElement != self.input) {
                //if clicked sugg, input just dropped focus => restore it
                self.input.focus();
            } else if(self.isMobile()) {
                //(sometimes???) for mobiles - first selectSugg(), then onBlur()
                tmpSuggWasSelected = true;
            }
            
            if(index >= 0 && index < self.sugges.length) {
                setTimeout(function() {
                    self._selectSugg(index, isYesBtn);
                }, 10);
            }
        };
        
        self._selectSugg = function (index, isYesBtn) {
            var sugg = self.sugges[index];
            var oldScrollTop = self.$suggesWr.scrollTop();
            var backOnFirstLevel = self.core.selectSuggestion(sugg, isYesBtn);
            if(!backOnFirstLevel) {
                //вернуть позицию скролла
                self.$suggesWr.scrollTop(oldScrollTop);
            }
        };

        self.activateSuggAndAdjustScroll = function (index) {
            var $activeItem = self.activateSugg(index);
            if ($activeItem === null || $activeItem.length == 0)
                return;
            
            var activeItem = $activeItem.get(0);
            var $container = self.$suggesWr;
            var offsetTop = activeItem.offsetTop,
                upperBound = $container.scrollTop(),
                lowerBound = $container.scrollTop() + $container.innerHeight() - $activeItem.outerHeight();
            
            if (offsetTop < upperBound) {
                $container.scrollTop(offsetTop);
            } else if (offsetTop > lowerBound) {
                $container.scrollTop(offsetTop - $container.innerHeight() + $activeItem.outerHeight());
            }
        };
        
        //
        // Dialog
        //
        self.buildDlgList = function() {
            var $container = self.$hintDlgList;
            var html = self.buildSuggesListHtml(true);
            $container.html(html);
        };
        
        self.openHintDlg = function() {
            if (self.isMobile()) {
                self.core.clearSearchStr();
                self.updHintDlg();
                self.$hintDlg.openModal({
                    complete: self.onHintDlgClose,
                });
                self.$hintDlg.width(parseInt(self.$hintDlg.width()));
            }
            else {
                self.input.focus();
            }
        };
        
        self.updHintDlg = function() {
            self.$hintDlgTitle.text(self.hintsStack.length == 0 ? 'Добавьте фильтр' : self.hintsStack[0].name);
            self.$hintDlgBack.toggle(self.hintsStack.length > 0);
            self.buildDlgList();
        };
        
        self.onHintDlgClose = function() {
            self.core.clearSearchStr();
        };
        
        self.selectHint = function (index, isYesBtn) {
            if(index >= 0 && index < self.sugges.length) {
                self._selectSugg(index, isYesBtn);
                self.updHintDlg();
            }
        };
        
        self.hintDlgBack = function() {
            self.core.popHint();
            self.updHintDlg();
        };
        
        //
        // Switcher
        //
        self.onGenreOpChange = function() {
            self.genreOp = self.$genreOpSw.is(':checked') ? 'and' : 'or';
            self.$genreOpC.find('.switch_label_off').toggleClass('selected', !self.$genreOpSw.is(':checked'));
            self.$genreOpC.find('.switch_label_on').toggleClass('selected', self.$genreOpSw.is(':checked'));
            self.core.setGenreOp(self.genreOp);
        };
        
        //
        // Sync from core (delegate methods)
        //
        self.onChipsChanged = function(isInit) {
            self.chipsSer = self.core.chipsSer;
            self.chips = self.core.chips;
            
            var cnt = 0;
            for(var i = 0 ; i < self.core.chips.length ; i++) {
                var chip = self.core.chips[i];
                if(chip.field == 'genre' && chip.not == false)
                    cnt++;
            }
            self.genreChipsCnt = cnt;
            self.$genreOpC.toggle(self.genreChipsCnt >= 2);
            
            self.buildChips();
            
            self.fixPosition();
            
            self.options.onChipsChanged(self.chipsSer, isInit);
        };
        self.onUnchippedStrChanged = function() {
            if(self.searchText !== self.core.unchippedStr) {
                self.searchText = self.core.unchippedStr;
                self.$input.val(self.searchText);
            }
        };
        self.onSetSugges = function() {
            self.sugges = self.core.sugges;
            self.buildSuggesC();
            self.fixPosition();
        };
        self.onHintsStackChanged = function() {
            self.hintsStack = self.core.hintsStack;
            self.$back.toggle( self.canBack() );
            //todo canBack
        };
        
        //
        // Sync to core
        //
        self.doSubmit = function() {
            self.core.parseChips(1);
            self.core.clearSearchStr();
            self.options.onSubmit(self.chipsSer);
        };
        
        self.canBack = function() {
            return self.hintsStack.length > 0;
        };
        self.doBack = function() {
            self.core.popHint();
            self.$input.focus();
        };
        
        self.canClear = function() {
            return self.core.unchippedStr.length > 0;
        };
        self.doClear = function() {
            self.core.clearSearchStr();
        };
        
        //
        // Utils
        //
        var isMobile = null;
        self.isMobile = function() {
            if(isMobile === null)
                isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            return isMobile;
        };
        
        var keys = {
            ESC: 27,
            BACKSPACE: 8,
            TAB: 9,
            RETURN: 13,
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40
        };
        
        function applyStyles(el, styles) {
            for (var key in styles) {
                el.style[key] = styles[key];
            }
        }
        
        self.isCursorAtEnd = function() {
            var valLength = self.$input.val().length,
                selectionStart = self.input.selectionStart,
                range;

            if (typeof selectionStart === 'number') {
                return selectionStart === valLength;
            }
            if (document.selection) {
                range = document.selection.createRange();
                range.moveStart('character', -valLength);
                return valLength === range.text.length;
            }
            return true;
        };
        
        /*
         * Dirty keyboard animation watcher. 4 callbacks:
         *  onOpening - function(kbHeight, winHeight)
         *  onOpened - function(kbHeight, winHeight)
         *  onClosing - function(kbHeight, winHeight)
         *  onClosed - function(kbHeight, winHeight)
         */
        self.watchKeyboardAnimations = function(onOpening, onOpened, onClosing, onClosed, isOpening, swh, wh, time, lastChTime) {
            var delay = 50;
            var watchAniTime = 1000;
            if(isOpening === undefined) {
                //first call
                if(watchingKeyboardAnimations)
                    return;
                isOpening = 1;
                time = 0;
                swh = window.innerHeight;
            } else {
                time += delay;
            }
            watchingKeyboardAnimations = true;
            if(wh === undefined) {
                //start position
                wh = swh;
            } else if(wh != window.innerHeight) {
                var oldWh = wh;
                wh = window.innerHeight;
                if(isOpening ? wh < oldWh : wh > oldWh) {
                    //animation in progress
                    if(!isOpening && lastChTime === undefined) {
                        //hiding started now
                        time = 0;
                    }
                    lastChTime = time;
                    if(isOpening)
                        onOpening((swh - wh) * (isOpening ? 1 : -1), wh);
                    else
                        onClosing((swh - wh) * (isOpening ? 1 : -1), wh);
                } else {
                    //reverse direction detected (keyboard is quickly closing right after shown)
                    if(isOpening)
                        onOpened((swh - oldWh) * (isOpening ? 1 : -1), oldWh);
                    else
                        onClosed((swh - oldWh) * (isOpening ? 1 : -1), oldWh);
                    time = 0;
                    lastChTime = time;
                    isOpening = !isOpening;
                    swh = wh;
                }
            }
            if(isOpening ? time < watchAniTime : lastChTime === undefined || time < watchAniTime) {
                setTimeout(function() {
                    self.watchKeyboardAnimations(onOpening, onOpened, onClosing, onClosed, isOpening, swh, wh, time, lastChTime);
                }, delay);
            } else {
                if(isOpening)
                    onOpened((swh - wh) * (isOpening ? 1 : -1), wh);
                else
                    onClosed((swh - wh) * (isOpening ? 1 : -1), wh);
                if(isOpening) {
                    time = 0;
                    lastChTime = undefined; //means idle, kb is opened, waiting for closing
                    isOpening = 0;
                    swh = wh;
                    setTimeout(function() {
                        self.watchKeyboardAnimations(onOpening, onOpened, onClosing, onClosed, isOpening, swh, wh, time, lastChTime);
                    }, delay);
                } else {
                    //done! closed!
                    watchingKeyboardAnimations = false;
                }
            }
        }
        
        // Coordinates routines
        var ua = navigator.userAgent.toLowerCase();
        var isOpera = (ua.indexOf('opera')  > -1);
        var isIE = (!isOpera && ua.indexOf('msie') > -1);
        self.getDocumentHeight = function() {
            if(isBodyScrollEnabled)
                return self._getDocumentHeight();
            else {
                return restoreBodyHeight[0] + (self.$wrap.height() - restoreBodyHeight[1]);
            }
        };
        self._getDocumentHeight = function() {
            return Math.max(document.compatMode != 'CSS1Compat' ? document.body.scrollHeight : document.documentElement.scrollHeight, self.getViewportHeight());
        }
        self.getViewportHeight = function() {
            return ((document.compatMode || isIE) && !isOpera) ? (document.compatMode == 'CSS1Compat') ? document.documentElement.clientHeight : document.body.clientHeight : (document.parentWindow || document.defaultView).innerHeight;
        }

        self.getRealScrollOffset = function() {
            var body = document.body;
            if(isBodyScrollEnabled) {
                return self.scrollTop(body);
            } else {
                if(body.style.top)
                    return -1 * parseInt(body.style.top);
                else
                    return self.scrollTop(body);
            }
        };
        self.setRealScrollOffset = function(scrollOffset) {
            var body = document.body;
            if(isBodyScrollEnabled) {
                window.scrollTo(0, scrollOffset);
            } else {
                body.style.top = -scrollOffset + 'px';
            }
        };
        self.scrollTop = function(element) {
            var body = document.body;
            if(!element || element == body) {
                return body.scrollTop + body.parentElement.scrollTop;
            } else {
                return Math.abs(element.getBoundingClientRect().top);
            }
        };

        //Enable/disable body scroll, useful when dropdown is shown
        var restoreHtmlStyle = null;
        var restoreBodyStyle = null;
        var restoreScrollOffset = null;
        var isBodyScrollEnabled = true;
        var restoreBodyHeight = null;
        self.enableBodyScroll = function(doEnable) {
            if(isBodyScrollEnabled == doEnable)
                return;
            var body = document.body;
            var htmlNode = body.parentNode;
            if(!doEnable) {
                restoreBodyHeight = [self._getDocumentHeight(), self.$wrap.height()];
                restoreHtmlStyle = htmlNode.style.cssText || '';
                restoreBodyStyle = body.style.cssText || '';
                var scrollOffset = self.scrollTop(body);
                restoreScrollOffset = scrollOffset;
                var clientWidth = body.clientWidth;

                if (1 || body.scrollHeight > body.clientHeight + 1) {
                    applyStyles(body, {
                        position: 'fixed',
                        width: '100%',
                        top: -scrollOffset + 'px'
                    });
                    applyStyles(htmlNode, {
                        overflowY: 'scroll'
                    });
                }

                if (body.clientWidth < clientWidth) 
                    applyStyles(body, {overflow: 'hidden'});
            } else {
                //var scrollOffset = restoreScrollOffset;
                var scrollOffset = self.getRealScrollOffset();
                body.style.cssText = restoreBodyStyle;
                htmlNode.style.cssText = restoreHtmlStyle;
                body.scrollTop = scrollOffset;
                htmlNode.scrollTop = scrollOffset;
            }
            isBodyScrollEnabled = doEnable;
        };
        
        
        self.init();
        
        CatalogChipsSearchUI._instances[self.id] = self;
        
        return self;
    };
    
    CatalogChipsSearchUI._instances = {};
    
    CatalogChipsSearchUI.getInstance = function(id) {
        var inst = CatalogChipsSearchUI._instances[id];
        if(inst === undefined)
            inst = null;
        return inst;
    };
    
    CatalogChipsSearchUI.destroyAll = function() {
        for(var id in CatalogChipsSearchUI._instances) {
            CatalogChipsSearchUI._instances[id].destroy();
        }
    };
    
    window.CatalogChipsSearchUI = CatalogChipsSearchUI;
    
    return CatalogChipsSearchUI;
    
}));


