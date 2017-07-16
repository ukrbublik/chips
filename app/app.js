
function preloadRequires() {
    define('Snowball', 'vendor/Snowball');
    'requirejs_preload';
    if(typeof Snowball != 'undefined') { define('Snowball', function() { return Snowball }); }
    if(typeof Stemmer != 'undefined') { define('lib/RuStemmer', function() { return Stemmer }); }
    if(typeof RuUtils != 'undefined') { define('lib/RuUtils', function() { return RuUtils }); }
    define('isMobile', function() {  });
    define('lib/utils', function() {  });
    if(typeof CatalogChipsSearch != 'undefined') { define('lib/CatalogChipsSearchCore', function() { return CatalogChipsSearch }); }
    if(typeof jQuery != 'undefined') { define('jquery', function() { return jQuery }); }
    if(typeof $.throttle != 'undefined') { define('jquery.ba-throttle-debounce', function() { return $.throttle }); }
    if(typeof CatalogChipsSearchUI != 'undefined') { define('lib/CatalogChipsSearchUI', function() { return CatalogChipsSearchUI }); }
    //if(typeof Hammer != 'undefined') { define('hammerjs', function() { return Hammer }); }
    //if(typeof $.fn.hammer != 'undefined') { define('jquery.hammer', function() { return $.fn.hammer }); }
    if(typeof Materialize != 'undefined') { define('materialize', function() { return Materialize }); }
    
    define('app/ang', function() {  });
}

function initCcsData(callback) {
    fetch("data/ccsData.json")
        .then(res => res.json())
        .then(callback)
        .catch(err => console.error(err));
}

function initAngularApp() {
    angular.element(document).ready(function () {
        var el = $('.body-container').get(0);
        var aEl = angular.element(el);
        var scope = aEl.scope();
        if (scope && !scope.$$destroyed && !angular.isUndefined(scope)) {
            //already inited
        } else {
            site.app = angular.bootstrap(el, ['myApp']);
        }
    });
}

function destroyAngularApp() {
    if (typeof angular != 'undefined') {
        var el = $('.body-container').get(0);
        var aEl = angular.element(el);
        var scope = aEl.scope();
        if (scope)
            scope.$destroy();
    }
}

function onChangeChipsSer(chipsSer) {
    console.log(chipsSer);
}

function initCatalogChipsSearch(CatalogChipsSearch) {
    //init ccs core
    if (!site.ccsData)
        return;
    var catChipsCore = new CatalogChipsSearch();
    catChipsCore.setSettings({
        debug: 0, //3
        minCharsForSuggestion: 2
    });
    catChipsCore.setSynonyms(site.ccsData.synonyms);
    catChipsCore.setListValues('type', site.ccsData.types);
    catChipsCore.setListValues('genre', site.ccsData.genres);
    catChipsCore.setListValues('studio', site.ccsData.studios);
    catChipsCore.setListValues('status', site.ccsData.statuses);
    catChipsCore.setYearseasonInfo(site.ccsData.minYear, site.ccsData.currYear, site.ccsData.currSeason);
    catChipsCore.initMeta();

    //catChipsCore.tests();

    if (site.ccsData.chipsStr !== '')
        catChipsCore.unserializeChips(site.ccsData.chipsStr);
    else
        catChipsCore.setSearchStr('');
    site.catChipsCore = catChipsCore;

    //init ccs ui
    if (!site.useAngularVersion) {
        require(['lib/CatalogChipsSearchUI'], function (CatalogChipsSearchUI) {
            var catChipsUI = null;
            catChipsUI = new CatalogChipsSearchUI('ccs', $('#ccs'), site.catChipsCore, {
                onSubmit: function (chipsSer) {
                    alert(chipsSer);
                },
                onChipsChanged: function (chipsSer, isInit) {
                    if (!isInit) {
                        onChangeChipsSer(chipsSer);

                        $(window).off('scroll.ccsui').on('scroll.ccsui', $.throttle(200, function () {
                            var inViewport = isElementVisible($('#ccs'));
                            if (!inViewport) {
                                //user is digging into filter result list
                                $(window).off('scroll.ccsui');
                            }
                        }));
                    }
                },
                onDestroy: function () {
                    $(window).off('scroll.ccsui');
                },
            });
        });
    } else {
        require(['app/ang'], function () {
            initAngularApp();

            //notify CatalogChipsSearchCtrl about core load
            var $ev = $.Event('notify_catChipsCore');
            $(document).trigger($ev);
        });
    }
}
