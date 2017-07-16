

// -------------------------------------------------------- Some missing functions

if (typeof Array.isArray === 'undefined') {
    Array.isArray = function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }
};

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

if (!Array.prototype.forEach) {

  Array.prototype.forEach = function (callback, thisArg) {

    var T, k;

    if (this == null) {
      throw new TypeError(' this is null or not defined');
    }

    // 1. Положим O равным результату вызова ToObject passing the |this| value as the argument.
    var O = Object(this);

    // 2. Положим lenValue равным результату вызова внутреннего метода Get объекта O с аргументом "length".
    // 3. Положим len равным ToUint32(lenValue).
    var len = O.length >>> 0;

    // 4. Если IsCallable(callback) равен false, выкинем исключение TypeError.
    // Смотрите: http://es5.github.com/#x9.11
    if (typeof callback !== 'function') {
        throw new TypeError(callback + ' is not a function');
    }

    // 5. Если thisArg присутствует, положим T равным thisArg; иначе положим T равным undefined.
    if (arguments.length > 1) {
      T = thisArg;
    }

    // 6. Положим k равным 0
    k = 0;

    // 7. Пока k < len, будем повторять
    while (k < len) {

      var kValue;

      // a. Положим Pk равным ToString(k).
      //   Это неявное преобразование для левостороннего операнда в операторе in
      // b. Положим kPresent равным результату вызова внутреннего метода HasProperty объекта O с аргументом Pk.
      //   Этот шаг может быть объединён с шагом c
      // c. Если kPresent равен true, то
      if (k in O) {

        // i. Положим kValue равным результату вызова внутреннего метода Get объекта O с аргументом Pk.
        kValue = O[k];

        // ii. Вызовем внутренний метод Call функции callback с объектом T в качестве значения this и
        // списком аргументов, содержащим kValue, k и O.
        callback.call(T, kValue, k, O);
      }
      // d. Увеличим k на 1.
      k++;
    }
    // 8. Вернём undefined.
  };
}


/**
 * Merge the contents of two arrays together into 2nd array
 */
function extend(from, to) {
    if (from == null || typeof from != "object") return from;
    if (from.constructor != Object && from.constructor != Array) return from;
    if (from.constructor == Date || from.constructor == RegExp || from.constructor == Function ||
        from.constructor == String || from.constructor == Number || from.constructor == Boolean)
        return new from.constructor(from);

    to = to || new from.constructor();

    for (var name in from)
    {
        to[name] = typeof to[name] == "undefined" ? extend(from[name], null) : from[name];
    }

    return to;
}

/**
 * Deep compare 2+ objects
 * http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
 */
function deepCompare () {
  var i, l, leftChain, rightChain;

  function compare2Objects (x, y) {
    var p;

    // remember that NaN === NaN returns false
    // and isNaN(undefined) returns true
    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
         return true;
    }

    // Compare primitives and functions.     
    // Check if both arguments link to the same object.
    // Especially useful on step when comparing prototypes
    if (x === y) {
        return true;
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if ((typeof x === 'function' && typeof y === 'function') ||
       (x instanceof Date && y instanceof Date) ||
       (x instanceof RegExp && y instanceof RegExp) ||
       (x instanceof String && y instanceof String) ||
       (x instanceof Number && y instanceof Number)) {
        return x.toString() === y.toString();
    }

    // At last checking prototypes as good a we can
    if (!(x instanceof Object && y instanceof Object)) {
        return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
        return false;
    }

    if (x.constructor !== y.constructor) {
        return false;
    }

    if (x.prototype !== y.prototype) {
        return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
         return false;
    }

    // Quick checking of one object beeing a subset of another.
    // todo: cache the structure of arguments[0] for performance
    for (p in y) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }
    }

    for (p in x) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }

        switch (typeof (x[p])) {
            case 'object':
            case 'function':

                leftChain.push(x);
                rightChain.push(y);

                if (!compare2Objects (x[p], y[p])) {
                    return false;
                }

                leftChain.pop();
                rightChain.pop();
                break;

            default:
                if (x[p] !== y[p]) {
                    return false;
                }
                break;
        }
    }

    return true;
  }

  if (arguments.length < 1) {
    return true; //Die silently? Don't know how to handle such case, please help...
    // throw "Need two or more arguments to compare";
  }

  for (i = 1, l = arguments.length; i < l; i++) {

      leftChain = []; //Todo: this can be cached
      rightChain = [];

      if (!compare2Objects(arguments[0], arguments[i])) {
          return false;
      }
  }

  return true;
}



function ucfirst( str ) {
    var f = str.charAt(0).toUpperCase();
    return f + str.substr(1, str.length-1);
}

function lcfirst( str ) {
    var f = str.charAt(0).toLowerCase();
    return f + str.substr(1, str.length-1);
}


// -------------------------------------------------------- Work with URLs

//http://stackoverflow.com/questions/1634748/how-can-i-delete-a-query-string-parameter-in-javascript
function removeURLParameter(url, parameter) {
    //prefer to use l.search if you have a location/link object
    var urlparts= url.split('?');   
    if (urlparts.length>=2) {

        var prefix= encodeURIComponent(parameter)+'=';
        var pars= urlparts[1].split(/[&;]/g);

        //reverse iteration as may be destructive
        for (var i= pars.length; i-- > 0;) {    
            //idiom for string.startsWith
            if (pars[i].lastIndexOf(prefix, 0) !== -1) {  
                pars.splice(i, 1);
            }
        }

        url= urlparts[0] + (pars.length > 0 ? '?' + pars.join('&') : "");
        return url;
    } else {
        return url;
    }
}

function getHashFromURL(url) {
    var hashValue = null;
    var pos = url.indexOf('#');
    if(pos != -1) {
        hashValue = url.substring(pos + 1);
    }
    return hashValue;
}

function removeHashFromURL(url) {
    var hashValue = null;
    var pos = url.indexOf('#');
    if(pos != -1) {
        hashValue = url.substring(pos + 1);
        url = url.substring(0, pos);
    }
    return url;
}

function parseUrl(url) {
    if(window._AToParseUrls === undefined)
        window._AToParseUrls = document.createElement('a');
    var a = window._AToParseUrls;

    a.href = url;

    // IE8 (and 9?) Fix
    // ie8 doesn't parse the URL correctly until the anchor is actually
    // added to the body, and an innerHTML is needed to trigger the parsing
    var addToBody = (a.host === '' && a.protocol !== 'file:');
    if (addToBody) {
        if (window._DivToParseUrls === undefined) {
            window._DivToParseUrls = document.createElement('div');
            var div = window._DivToParseUrls;
            div.setAttribute('style', 'display:none; position:absolute;');
            div.className = '_DivToParseUrls';
            document.body.appendChild(div);
        }
        var div = window._DivToParseUrls;
        div.innerHTML = '<a href="'+url+'"></a>';
        a = div.firstChild;
    }

    var details = {};
    var props = ['protocol', 'hostname', 'port', 'pathname', 'search', 'hash', 'host'];
    // Copy the specific URL properties to a new object
    // This is also needed for IE8 because the anchor loses its
    // properties when it's removed from the dom
    for (var i = 0; i < props.length; i++) {
        details[props[i]] = a[props[i]];
    }

    // IE9 adds the port to the host property unlike everyone else. If
    // a port identifier is added for standard ports, strip it.
    if (details.protocol === 'http:') {
        details.host = details.host.replace(/:80$/, '');
    }
    if (details.protocol === 'https:') {
        details.host = details.host.replace(/:443$/, '');
    }

    if (addToBody && 0) {
        document.body.removeChild(div);
        delete window._DivToParseUrls;
    }

    return details;
}

/**
 * @return array массив GET параметров из url
 */
function getLocationQueryVars(loc) {
    if (loc === undefined)
        loc = window.location;
    var query = loc.search.substring(1);
    var queryVars = {};
    var queryArr = query.split('&');
    for (var i = 0; i < queryArr.length; i++) {
        if(queryArr[i] !== '') {
            var kv = queryArr[i].split('=');
            var k = kv[0], v = kv.length > 1 ? decodeURIComponent(kv[1]) : null;
            queryVars[k] = v;
        }
    }
    return queryVars;
};

function getDomainFromHostname(hostName) {
    var parts = hostName.split('.').reverse();
    var domain = hostName;
    if (parts != null && parts.length > 1) {
        domain = parts[1] + '.' + parts[0];
        if (parts.length > 2 && ['co.uk', 'com.ua'].indexOf(domain) != -1) {
            domain = parts[2] + '.' + domain;
        }
    }
    return domain;
}

// -------------------------------------------------------- Other

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

/**
 * Кол-во цифр после запятой
 */
function decimalPlaces(num) {
  var match = (''+num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) { return 0; }
  return Math.max(
       0,
       // Number of digits right of decimal point.
       (match[1] ? match[1].length : 0)
       // Adjust for scientific notation.
       - (match[2] ? +match[2] : 0));
}

function scrollToTop() {
    window.scrollTo(0, 0);
}

function scrollToListStart(id) {
    var $list = $('#' + id);
    $('html, body').animate({
        scrollTop: $list.offset().top - 20
    }, 100);
    initMaterialize($list);
}

function scrollToEl($el, animTime) {
    if($el === '#!' || $el === '#')
        return;
    if(animTime === undefined)
        animTime = 0;
    if(!($el instanceof jQuery))
        $el = $($el);
    else if($el.length > 1)
        $el = $($el.get(0));
    var offset = $el.offset();
    $('html, body').animate({
        scrollTop: (offset ? offset.top : 0)
    }, animTime);
}

//http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
function isElementVisible (el, fully, checkOverflows) {
    if (typeof jQuery === "function" && el instanceof jQuery) {
        if(!el.length)
            return false;
        el = el[0];
    }
    if(!el)
        return false;
    
    var rect = el.getBoundingClientRect();
    var maxY = (window.innerHeight || document.documentElement.clientHeight),
        maxX = (window.innerWidth || document.documentElement.clientWidth),
        minY = 0,
        minX = 0;
    
    var isVis = false;
    var efp = function (x, y) {
        return document.elementFromPoint(x, y)
    };
    if(fully) {
        isVis = (
            rect.top >= minY &&
            rect.left >= minX &&
            rect.bottom <= maxY &&
            rect.right <= maxX
        );
        if(checkOverflows && isVis) {
            isVis = (
                el.contains(efp(rect.left + 0.5,  rect.top + 0.5)) &&
                el.contains(efp(rect.right - 0.5, rect.top + 0.5)) && 
                el.contains(efp(rect.right - 0.5, rect.bottom - 0.5)) && 
                el.contains(efp(rect.left + 0.5,  rect.bottom - 0.5))
            );
        }
    } else {
        isVis = (
            rect.left <= maxX &&
            rect.right >= minX &&
            rect.top <= maxY &&
            rect.bottom >= minY
        );
        if(checkOverflows && isVis) {
            isVis = (
                el.contains(efp(rect.left + 0.5,  rect.top + 0.5)) || 
                el.contains(efp(rect.right - 0.5, rect.top + 0.5)) || 
                el.contains(efp(rect.right - 0.5, rect.bottom - 0.5)) || 
                el.contains(efp(rect.left + 0.5,  rect.bottom - 0.5))
            );
        }
    }
    return isVis;
}


// -------------------------------------------------------- Materialize

function initMaterialize($container) {
    $container.find('.button-collapse').sideNav();
    $container.find('select').material_select();
    $container.find('textarea').trigger('autoresize');
    $container.find('.dropdown-button').dropdown();
    $container.find('.tooltipped').tooltip();
    Materialize.updateTextFields();
}

//custom tab content changing
function mtzSelectTab($tab, active_id) {
    var $tabs_wrapper = $tab.closest('.tabs-wrapper');
    var $tabs_contents_wrapper = $tabs_wrapper.find('.tabs-contents-wrapper');
    var $tabs_contents = $tabs_contents_wrapper.find('.tabs-content');
    var $tabs_header = $tabs_wrapper.find('.tabs-header');
    var $target_div = $('#' + 'custom-' + active_id);
    var $prev_div = $tabs_contents.filter(':visible');

    //simplest (and materializecss' default) way is..
    //$target_div.show();
    //$prev_div.hide();

    //but with proper animations of content & height..
    if (!$target_div.is(':visible')) {
        var target_h = $target_div.actual('height');
        var prev_h = $prev_div.actual('height');
        if ($prev_div.length) {
            var d_h = target_h - prev_h;
            var d_h = d_h > 0 ? "+=" + d_h : "-=" + (-1 * d_h);
            $tabs_contents_wrapper.animate({height: d_h}, 350);
            $target_div.css({
                opacity: 0,
                display: 'block',
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                padding: $tabs_contents_wrapper.css('padding'),
            }).animate({
                opacity: 1
            }, 350, 'swing', function () {
                $(this).css({
                    position: 'static',
                    padding: 0
                });
            });
            $prev_div.css({}).animate({
                opacity: 0
            }, 350, 'swing', function () {
                $(this).css({
                    opacity: 1,
                    display: 'none'
                });
            });
        } else {
            $target_div.show();
        }
    }
}

//trigger opening active tabs
function mtzSetActiveTab($tabs, type) {
    $tabs.each(function (i, el) {
        var $tab = $(el);
        var $active_a = $tab.find('li a.active');
        if ($active_a.length) {
            var active_id = $active_a.attr('href').substring(1);
            if ($tab.is(':visible')) {
                if (type == 'before' && $tab.data('selected_once_before')) {
                } else {
                    $tab.tabs('select_tab', active_id);
                }
                if (type == 'before')
                    $tab.data('selected_once_before', 1);
            } else {
                if (type == 'initial')
                    mtzSelectTab($tab, active_id);
            }
        }
    });
}

function initMaterializeAdditions($container) {
    //open active tab on opening collapse
    $container.find('.collapsible').on('click.collapse', '> li > .collapsible-header', function (e) {
        var $header = $(this),
            $element = $(e.target);
        var $body = $header.parent().children('.collapsible-body');
        var $tabs = $body.find('.tabs');
        var is_opening = ($body.height() == 0);
        if ($tabs.length) {
            if ($body.is(':visible') && is_opening) {
                mtzSetActiveTab($tabs, 'before'); //before collapse animation
                setTimeout(function () {
                    mtzSetActiveTab($tabs, 'after');
                }, 350); //after collapse animation
            }
        }
    });

    //custom tab content changing
    $container.find('.tabs').on('click', 'a', function (e) {
        var $active_a = $(this);
        var active_id = $active_a.attr('href').substring(1);
        var $tab = $(this).closest('ul.tabs');

        mtzSelectTab($tab, active_id);
    });

    //trigger opening all active tabs on page
    var $tabs = $container.find('ul.collapsible li .collapsible-body .tabs');
    mtzSetActiveTab($tabs, 'initial');

    //open active collapse
    $container.find('.collapsible li._active .collapsible-header').click();

    //fix error indication for materialized select
    $container.find('input.select-dropdown').each(function (ind, el) {
        var $inp = $(el);
        var $sel = $inp.nextAll('select');
        if ($sel.hasClass('invalid'))
            $inp.addClass('invalid');
    });
}


if (typeof define === 'function' && define.amd) {
    define([], function() {
    });
}
