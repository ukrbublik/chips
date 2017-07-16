(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./RuUtils', './utils'], factory);
    } else {
        CatalogChipsSearch = factory(RuUtils, undefined);
    }
}(function(RuUtils, utils) {
    
    /**
     * class CatalogChipsSearch
     *
     * todo:
     * 1. студии - парсить "js staff" как "j.c. staff", т.е. игнорить знаки
     * 2. для модального окна в моб. версии - добавить автокомплит
     *
     * ?? myscore, аналог rating (синоним - моя оценка)
     */
    function CatalogChipsSearch() {
        //поисковая строка
        this.unchippedStr = '';
        //массив спарсенных чипов
        this.chips = [];
        //ассоц. массив для быстрого поиска чипа по значению (только для типов bool, list)
        this._chipsByVals = {};
        //чипы в виде строки для использования в url
        this.chipsSer = '';
        //массив предположений и подсказок
        this.sugges = [];
        //временная инфа для формирования нового чипа
        this.tmpInfo = {};
        //добавленные подсказки для нового чипа
        this.hintsStack = [];
        //если юзер изменил часть поисковой строки, которая создавалась через подсказки, то считаем подсказки "грязными" (просто новые не добавляем)
        this.isHintsStackDirty = false;
        //состояние поисковой строки после добавления последней подсказки
        this.hintsStackStr = '';
        //стек состояний поисковой строки при добавлении подсказок
        this.unchippedStrStack = [];
        //делегат, должен поддерживать методы: onChipsChanged, onUnchippedStrChanged, onSetSugges, onHintsStackChanged
        this.delegate = null;
        //obsolete. для автодобавления слова 'до' после 'от'
        this.__autoAddedToForValFrom = null;
        //поле последнего введенного или измененного чипа
        this._lastChipField = null;
        
        this.meta = {
            genre: {
                sortPos: 1,
                defOp: 'and',
                type: 'list',
                showYesNo: 1,
                name: 'Жанр',
                synonyms: ['genre'],
                vals: {
                    /** will be loaded by setListValues() **
                    '1': {
                        id: 1,
                        name: 'Меха',
                    },
                    ...
                    **/
                },
                replaces: {
                    'Сёнен Ай' : 'Сёнен-Ай',
                    'Сёдзе Ай' : 'Сёдзе-Ай',
                    'Shoujo Ai' : 'Shoujo-Ai',
                    'Shounen Ai' : 'Shounen-Ai',
                },
            },
            type: {
                sortPos: 2,
                showYesNo: 1,
                type: 'list',
                name: 'Тип',
                synonyms: ['type'],
                vals: {
                    /** will be loaded by setListValues() **
                    'ova': 'OVA', 
                    ...
                    **/
                },
            },
            rating: {
                sortPos: 4,
                type: 'range',
                name: 'Рейтинг',
                pluralName: 'Рейтинги',
                pluralSynonyms: ['рейтинги', 'ratings'],
                synonyms: ['rating'],
                specials: {
                    //tip: набор топов должен быть синхронным с php CatalogFilter::$chMeta
                    top20: {
                        suggestFor: [],
                        name: "Топ 20",
                        synonyms: ["top 20"],
                        sortPos: 1,
                    },
                    top50: {
                        suggestFor: [],
                        name: "Топ 50",
                        synonyms: ["top 50"],
                        sortPos: 1,
                    },
                    top100: {
                        suggestFor: ['rating', 'ratings'],
                        name: "Топ 100",
                        synonyms: ["top 100"],
                        sortPos: 1,
                    },
                    top200: {
                        suggestFor: [],
                        name: "Топ 200",
                        synonyms: ["top 200"],
                        sortPos: 1,
                    },
                    popular: {
                        suggestFor: ['rating', 'ratings'],
                        name: "Популярные",
                        synonyms: ["popular", "высокорейтинговые", "высокий"],
                        synonymsRequireFieldBefore: ["высокий"],
                        sortPos: 2,
                    },
                },
            },
            yearseason: {
                sortPos: 5,
                type: 'yearseason',
                name: 'Сезон',
                pluralName: 'Сезоны',
                pluralSynonyms: ['сезоны'],
                requireFieldBefore: 0,
                synonyms: ['season', 'year', 'выпуск', 'выход', 'вышел', 'вышли', 'дата', 'год', 'период'],
                dontSuggest: ['вышли', 'вышел'],
                current: {season: "spring", year: 2016}, //will be set by setYearseasonInfo()
                year: {  //will be set by setYearseasonInfo()
                    min: 1958,
                    max: 2016,
                },
                season: {
                    'winter': {
                        name: 'Зима',
                        synonyms: ['winter', 'зимой', 'зимний'],
                    },
                    'spring': {
                        name: 'Весна',
                        synonyms: ['spring', 'весной', 'весенний'],
                        //dontSuggest: ['весенний', 'весной'],
                    }, 
                    'summer': {
                        name: 'Лето',
                        synonyms: ['summer', 'летом', 'летний'],
                    }, 
                    'autumn': {
                        name: 'Осень',
                        synonyms: ['autumn', 'осенью', 'осенний'],
                    }, 
                },
                specials: {
                    new: {
                        suggestFor: ['season', 'seasons'],
                        name: "Новинки",
                        synonyms: ['new', 'новые', 'текущий'],
                        synonymsRequireFieldBefore: ["текущий"],
                        //year & season == current
                    },
                    classic: {
                        suggestFor: ['years'],
                        name: "Классика",
                        synonyms: ['classic', 'classic', 'классические'],
                        //year_range: [1980, 2005],
                        //rating: [8, 10]
                    },
                    decade: {
                        suggestFor: [],
                        //пример: 80-е; "80" - {{val}}
                        nameTpl: "{{val}}-е",
                    }
                }
            },
            isAiring: {
                sortPos: 6,
                type: 'bool',
                showYesNo: 1,
                name: 'Онгоинг',
                dontSuggest: ['Онгоинг'], //т.к. это значит не поле, а значение true
                vals: {
                    1: {
                        name: 'Онгоинг',
                        synonyms: ['в эфире', 'ongoing'],
                    },
                    0: {
                        synonyms: ['завершен'],
                    }
                }
            },
            studio: {
                sortPos: 3,
                defOp: 'or',
                dontStem: 1,
                type: 'list',
                name: 'Студия',
                synonyms: [],
                vals: {
                    /** will be loaded by setListValues() **
                    '1': {
                        id: 1,
                        name: 'Kyoto Animation',
                    },
                    ...
                    **/
                },
            },
            isActive: {
                sortPos: 7,
                type: 'bool',
                name: 'Доступен',
                dontSuggest: ['Доступен'], //т.к. это значит не поле, а значение true
                vals: {
                    1: {
                        name: 'Доступен',
                        dontSuggest: ['Доступен'], //т.к. есть 'доступен онлайн просмотр' (проблема жадности)
                        synonyms: ['доступен онлайн просмотр', 'загружен на сайт', 'есть переводы', 'вышла первая серия'],
                    },
                    0: {
                        hide: true,
                    },
                }
            },
            status: {
                sortPos: 8,
                defOp: 'or',
                type: 'list',
                showYesNo: 1,
                name: 'В моем списке',
                synonyms: ['Статус', 'Status', 'In my list'],
                complexBoolFields: {
                    '-1' : 'anyStatus',
                    '-2' : 'statusWatched',
                }, //показывать спец.булы среди значений
                vals: {
                    /** will be loaded by setListValues() **
                    '0': {
                        title: 'Запланировано',
                        slug: 'planned',
                        sortPos: 0,
                    },
                    ...
                    **/
                },
            },
            anyStatus: {
                forList: 'status', //показывать среди значений поля 'status'
                forListVal: -1,
                forListIncludeVals: [0, 1, 2, 3, 4],
                sortPos: -2,
                showYesNo: 1,
                type: 'bool',
                name: 'Есть в моем списке',
                dontSuggest: ['Есть в моем списке'], //т.к. это значит не поле, а значение true
                vals: {
                    1: {
                        name: 'Есть в моем списке',
                        synonyms: ['Любой статус', 'any status', 'present in my list'],
                    },
                    0: {
                        hide: true,
                        name: 'Нет в моем списке',
                        synonyms: ['Нет статуса', 'Без статуса'],
                    },
                }
            },
            statusWatched: {
                forList: 'status', //показывать среди значений поля 'status'
                forListVal: -2,
                forListIncludeVals: [1, 2, 3, 4],
                sortPos: -1,
                showYesNo: 1,
                type: 'bool',
                name: 'Смотрел',
                dontSuggest: ['Смотрел'], //т.к. это значит не поле, а значение true
                vals: {
                    1: {
                        name: 'Смотрел',
                    },
                    0: {
                        hide: true,
                    },
                }
            },
        };
        
        this.genreOp = this.meta['genre']['defOp']; //and/or

        this.settings = {
            debug: 2,
            minCharsForSuggestion: 2,
        };

        this._synonyms = {
            /** will be loaded by setSynonyms() **
            genre: {
                '1' : ['роботы'],
                ...
            },
            type: {
                'tv': ['тв', 'сериал'],
                ...
            },
            **/
        };
        this.valuesSynonims = null;
        this.fieldSynonims = null;
        
        this.ctor = function() {
            return this;
        };
        return this.ctor();
    };

    //-----------------------------------------------------------------------------

    //for _parseChips()
    CatalogChipsSearch.__chipGroupInd = 0;

    CatalogChipsSearch.seasonsSlugs = ['winter', 'spring', 'summer', 'autumn'];

    /**
     * Изменить связь жанров ИЛИ/И. Применяется ко всем текущим чипам.
     */
    CatalogChipsSearch.prototype.setGenreOp = function(newOp) {
        if(this.genreOp != newOp) {
            this.genreOp = newOp;
            for(var i = 0 ; i < this.chips.length ; i++) {
                if(this.chips[i].field == 'genre') {
                    this.chips[i].op = newOp;
                }
            }
            this.chipsModified();
        }
    };

    /**
     * Устанавливает settings
     */
    CatalogChipsSearch.prototype.setSettings = function(settings) {
        this.settings = settings;
    };

    /**
     * Устанавливает синонимы (для списков)
     */
    CatalogChipsSearch.prototype.setSynonyms = function(synonyms) {
        this._synonyms = synonyms;
    };

    CatalogChipsSearch.prototype.setDelegate = function(delegate) {
        this.delegate = delegate;
    };

    /**
     * Устанавливает значения списков.
     * Мета инфа должна быть уже установлена
     */
    CatalogChipsSearch.prototype.setListValues = function(_field, _values) {
        if(this.meta[_field] !== undefined) {
            var fieldMeta = this.meta[_field];
            fieldMeta.vals = _values;
        }
    };

    /**
     * 
     */
    CatalogChipsSearch.prototype.setYearseasonInfo = function(minYear, currYear, currSeason) {
        this.meta.yearseason.current.season = currSeason;
        this.meta.yearseason.current.year = currYear;
        this.meta.yearseason.year.min = minYear;
        this.meta.yearseason.year.max = currYear;
    };

    /**
     * Расширяет мета инфу. 
     * Также на основе этого заполняет valuesSynonims и fieldSynonims.
     * Должны быть уже установлены: мета, синонимы, значения списков.
     */
    CatalogChipsSearch.prototype.initMeta = function() {
        var self = this;
        this.valuesSynonims = [];
        this.fieldSynonims = [];
        for(var field in this.meta) if(this.meta.hasOwnProperty(field)) {
            var fieldMeta = this.meta[field];
            var type = fieldMeta.type;
            this._extendSynonims(fieldMeta, fieldMeta);
            for(var i = 0 ; i < fieldMeta.synonyms.length ; i++) {
                var p = {
                    name: fieldMeta.name,
                    syn: fieldMeta.synonyms[i], 
                    ocSyn: fieldMeta.ocSynonyms[i], 
                    stemSyn: fieldMeta.stemSynonyms[i], 
                    synWords: RuUtils.split(fieldMeta.synonyms[i], ' '), 
                    stemSynWords: RuUtils.split(fieldMeta.stemSynonyms[i], ' '), 
                    field: field,
                };
                if(fieldMeta.dontSuggest && fieldMeta.dontSuggest.indexOf(p.syn) != -1)
                    p.dontSuggest = 1;
                this.fieldSynonims.push(p);
            }
            
            if(type == 'list') {
                var vals = fieldMeta.vals;
                if(fieldMeta.complexBoolFields) {
                    for(var complVal in fieldMeta.complexBoolFields) {
                        var boolField = fieldMeta.complexBoolFields[complVal];
                        var boolFieldMeta = self.meta[boolField];
                        delete vals[ boolFieldMeta.forListVal ];
                    }
                }
                for(var slug in vals) if(vals.hasOwnProperty(slug)) {
                    var val = vals[slug];
                    if(typeof val == 'string') {
                        //для типов
                        val = { name: val };
                        vals[slug] = val;
                    }
                    this._extendSynonims(fieldMeta, val, field, slug);
                    if(val.synonyms !== undefined)
                        for(var j = 0 ; j < val.synonyms.length ; j++) {
                            var p = {
                                name: val.name,
                                syn: val.synonyms[j], 
                                ocSyn: val.ocSynonyms[j], 
                                stemSyn: val.stemSynonyms[j], 
                                synWords: RuUtils.split(val.synonyms[j], ' '), 
                                stemSynWords: RuUtils.split(val.stemSynonyms[j], ' '), 
                                field: field, 
                                val: slug,
                                type: 'item',
                            };
                            if(val.dontSuggest && val.dontSuggest.indexOf(p.syn) != -1)
                                p.dontSuggest = 1;
                            this.valuesSynonims.push(p);
                        }
                }
            }
            if(type == 'yearseason' || type == 'range') {
                var specials = fieldMeta.specials;
                if(specials !== undefined)
                    for(var sptype in specials) if(specials.hasOwnProperty(sptype)) {
                        var special = specials[sptype];
                        this._extendSynonims(fieldMeta, special);
                        if(special.synonyms !== undefined)
                            for(var j = 0 ; j < special.synonyms.length ; j++) {
                                var p = {
                                    syn: special.synonyms[j], 
                                    ocSyn: special.ocSynonyms[j], 
                                    stemSyn: special.stemSynonyms[j], 
                                    synWords: RuUtils.split(special.synonyms[j], ' '), 
                                    stemSynWords: RuUtils.split(special.stemSynonyms[j], ' '), 
                                    field: field, 
                                    val: sptype,
                                    type: 'special',
                                };
                                if(special.name)
                                    p.name = special.name;
                                if(special.nameTpl)
                                    p.name = special.nameTpl;
                                if(special.dontSuggest && special.dontSuggest.indexOf(p.syn) != -1)
                                    p.dontSuggest = 1;
                                this.valuesSynonims.push(p);
                            }
                    }
            }
            if(type == 'yearseason') {
                var seasons = fieldMeta.season;
                for(var seasonSlug in seasons) if(seasons.hasOwnProperty(seasonSlug)) {
                    var season = seasons[seasonSlug];
                    var seasonName = season.name;
                    this._extendSynonims(fieldMeta, season);
                    if(season.synonyms !== undefined)
                        for(var j = 0 ; j < season.synonyms.length ; j++) {
                            var p = {
                                name: season.name,
                                syn: season.synonyms[j], 
                                ocSyn: season.ocSynonyms[j], 
                                stemSyn: season.stemSynonyms[j], 
                                synWords: RuUtils.split(season.synonyms[j], ' '), 
                                stemSynWords: RuUtils.split(season.stemSynonyms[j], ' '), 
                                field: field, 
                                val: seasonSlug,
                                type: 'season',
                            };
                            if(season.dontSuggest && season.dontSuggest.indexOf(p.syn) != -1)
                                p.dontSuggest = 1;
                            this.valuesSynonims.push(p);
                        }
                }
            }
            if(type == 'bool') {
                var vals = fieldMeta.vals;
                for(var key in vals) if(vals.hasOwnProperty(key)) {
                    var val = vals[key];
                    this._extendSynonims(fieldMeta, val);
                    if(val.synonyms !== undefined)
                        for(var j = 0 ; j < val.synonyms.length ; j++) {
                            if(!val.name) {
                                val.name = (key == 1 ? fieldMeta.name : 'Не ' + lcfirst(fieldMeta.name));
                            }
                            var p = {
                                name: val.name,
                                syn: val.synonyms[j], 
                                ocSyn: val.ocSynonyms[j], 
                                stemSyn: val.stemSynonyms[j], 
                                synWords: RuUtils.split(val.synonyms[j], ' '), 
                                stemSynWords: RuUtils.split(val.stemSynonyms[j], ' '), 
                                field: field, 
                                val: key,
                                type: 'item'
                            };
                            if(val.dontSuggest && val.dontSuggest.indexOf(p.syn) != -1)
                                p.dontSuggest = 1;
                            this.valuesSynonims.push(p);
                        }
                }
            }
        }
        
        if(this.settings.debug)
            console.info("CatalogChipsSearch.setMeta()", "\n meta: ", this.meta, "\n fieldSynonims: ", this.fieldSynonims, "\n valuesSynonims: ", this.valuesSynonims);
    };

    /**
     * Вспомогательный метод для setMeta()
     */
    CatalogChipsSearch.prototype._extendSynonims = function(fieldMeta, val, field, slug) {
        if(typeof val.synonyms == 'undefined')
            val.synonyms = [];
        var doStem = !fieldMeta.dontStem;
        if(field && slug) {
            if(this._synonyms[field] !== undefined && this._synonyms[field][slug]) {
                var syns = this._synonyms[field][slug];
                for(var j = 0 ; j < syns.length ; j++) {
                    val.synonyms.push(syns[j]);
                }
            }
        }
        var nameKeys = ['name', 'title', 'titleRussian', 'titleEnglish'];
        for(var j = 0 ; j < nameKeys.length ; j++) {
            var k = nameKeys[j];
            if(val[k] !== undefined) {
                if(fieldMeta.replaces && fieldMeta.replaces[val[k]] !== undefined)
                    val[k] = fieldMeta.replaces[val[k]];
                if(val.name === undefined)
                    val.name = val[k];
                if(val.synonyms.indexOf(val[k]) == -1)
                    val.synonyms.push(val[k]);
            }
        }
        
        val.ocSynonyms = val.synonyms.slice();
        for(var j = 0 ; j < val.synonyms.length ; j++) {
            val.synonyms[j] = val.synonyms[j].toLowerCase();
        }
        if(val.dontSuggest) {
            for(var j = 0 ; j < val.dontSuggest.length ; j++) {
                val.dontSuggest[j] = val.dontSuggest[j].toLowerCase();
            }
        }
        if(typeof val.slug != 'undefined') {
            var lSlug = val.slug;
            if(val.synonyms.indexOf(lSlug.toLowerCase()) == -1) {
                val.synonyms.push(lSlug.toLowerCase());
                val.ocSynonyms.push(lSlug);
            }
        }
        if(typeof val.name != 'undefined') {
            var lName = val.name;
            var i = val.synonyms.indexOf(lName.toLowerCase());
            if(i != -1) {
                val.synonyms.splice(i, 1);
                val.ocSynonyms.splice(i, 1);
            }
            val.synonyms.unshift(lName.toLowerCase());
            val.ocSynonyms.unshift(lName);
        }
        val.stemSynonyms = val.synonyms.slice();
        if(doStem) {
            for(var j = 0 ; j < val.synonyms.length ; j++) {
                val.stemSynonyms[j] = RuUtils.stem(val.stemSynonyms[j]);
            }
        }
    }


    /**
     * Парсит строку на слова, которые знаем
     *
     * @param string str
     * @return {parsed: parsed, origWords: origWords}
     *        origWords - массив слов-строк в str
     *        parsed - массив, индекс - номер слова, значение - одно из см. ниже
     *        parsed = [
     *            {what: 'not'/'-'/'>'/'<'}, //предлоги, частицы
     *            'unknown word',
     *            {what: 'special', isStem: 1/0, wordsCnt: 2, field: 'rating', specialVal: 'Самые популярные'},
     *            -1, //если предыдущий элемент содержит несколько слов (см. wordsCnt), следующие будут -1
     *            {what: 'special', field: 'yearseason', specialVal: 'decade', val: '1980'},
     *            {what: 'field', isStem: 1/0, wordsCnt: 1, field: 'genre'},
     *            {what: 'item', isStem: 1/0, wordsCnt: 1, field: 'genre', val: 'meha'},
     *            {what: 'season', isStem: 1/0, field: 'yearseason', val: 'spring'},
     *            {what: 'season', range: ['spring', 'summer']},
     *            {what: 'year', val: 2005},
     *            {what: 'year', range: [2005, 2008]},
     *            {what: 'range', val: 5},
     *            {what: 'range', range: [5, 9]},
     *        ]
     */
    CatalogChipsSearch.prototype._parseWords = function(str) {
        //сначала подготовим строку
        var origStr = RuUtils.normalizeSpaces(str);
        str = origStr.toLowerCase();
        var stemStr = RuUtils.stem(str);
        var origWords = RuUtils.split(origStr, ' ');
        var words = RuUtils.split(str, ' ');
        var stemWords = RuUtils.split(stemStr, ' ');
        var parsed = [];
        for(var x = 0 ; x < 2 ; x++) {
            //итерация x=0 - ищем в строке значения из списков (жанр "комедия", тип "спешл", ..)
            //итерация x=1 - ищем в строке названия полей для поиска ("тип", "рейтинг", ..)
            var synonims = (x == 0 ? this.valuesSynonims : this.fieldSynonims);
            for(var i = 0 ; i < synonims.length ; i++) {
                var el = synonims[i];
                var foundWords = [];
                //ищем вхождения всех точных слов синонима
                for(var w = 0 ; w < words.length ; w++) {
                    var match = true;
                    for(var sw = 0 ; sw < el.synWords.length ; sw++) {
                        if(el.synWords[sw] != words[w+sw]) {
                            match = false; 
                            break;
                        }
                    }
                    if(match) {
                        //нашли точное слово
                        foundWords.push({no: w, isStem: 0});
                    }
                }
                //ищем вхождения всех стемов синонима (аналогично)
                for(var w = 0 ; w < stemWords.length ; w++) {
                    var match = true;
                    for(var sw = 0 ; sw < el.stemSynWords.length ; sw++) {
                        if(el.stemSynWords[sw] != stemWords[w+sw]) {
                            match = false; 
                            break;
                        }
                    }
                    if(match) {
                        //нашли точное слово
                        foundWords.push({no: w, isStem: 1});
                    }
                }
                //
                for(var j = 0 ; j < foundWords.length ; j++) {
                    var wordNo = foundWords[j].no;
                    var isStem = foundWords[j].isStem;
                    var wordsCnt = synonims[i].synWords.length;
                    var p = null;
                    if(x == 0) {
                        if(el.type !== undefined && el.type == 'season')
                            p = {what: 'season', isStem: isStem, field: 'yearseason', val: el.val};
                        else if(el.type !== undefined && el.type == 'special')
                            p = {what: 'special', isStem: isStem, wordsCnt: wordsCnt, field: el.field, specialVal: el.val, syn: synonims[i].syn};
                        else
                            p = {what: 'item', isStem: isStem, wordsCnt: wordsCnt, field: el.field, val: el.val, syn: synonims[i].syn};
                    } else {
                        p = {what: 'field', isStem: isStem, wordsCnt: wordsCnt, field: el.field};
                    }
                    if(typeof parsed[wordNo] === 'undefined')
                        parsed[wordNo] = p;
                    else {
                        if(!Array.isArray(parsed[wordNo]))
                            parsed[wordNo] = [ parsed[wordNo] ];
                        var sameWordInd = -1;
                        for(var k = 0 ; k < parsed[wordNo].length ; k++) {
                            var p2 = parsed[wordNo][k];
                            if(p2.what == p.what && p2.field == p.field && (p.what == 'special' ? p2.specialVal == p.specialVal : p2.val == p.val)) {
                                sameWordInd = k;
                                break;
                            }
                        }
                        if(sameWordInd == -1)
                            parsed[wordNo].push(p);
                        else if(p2.isStem && !p.isStem) //не-стем лучше
                            parsed[wordNo][sameWordInd] = p; //p > p2
                        else if(p.wordsCnt > p2.wordsCnt) //отключение "жадности", например "Доступен" и "Доступен онлайн просмотр" - второе полнее => лучше
                            parsed[wordNo][sameWordInd] = p; //p > p2
                    }
                }
            }
        }
        //ищем союзы (не), числа (рейтинг, год), предлоги (от .. до ..)
        for(var wordNo = 0 ; wordNo < words.length ; wordNo++) {
            var word = words[wordNo];
            var prevWord = wordNo > 0 ? words[wordNo-1] : null;
            var nextWord = wordNo < (words.length-1) ? words[wordNo+1] : null;
            if(word == 'не' || word == 'not' || word == 'no') {
                parsed[wordNo] = {what: 'not'};
            } else if(word == '-') {
                parsed[wordNo] = {what: '-'};
            } else if(word == 'с' || word == 'от' || word == 'выше' || word == 'больше' || word == 'from' || word == 'more') {
                parsed[wordNo] = {what: '>', word: word};
            } else if(word == 'по' || word == 'до' || word == 'ниже' || word == 'меньше' || word == 'to' || word == 'less') {
                parsed[wordNo] = {what: '<', word: word};
            } else if(matches = word.match(new RegExp('^((?:19|20)?\\d0)\\-?('+RuUtils.decadesSuffixes.join('|')+')$', 'i'))) {
                var dec = matches[1];
                if((''+dec).length == 2)
                    dec = (dec >= 50 ? '19' : '20') + dec;
                parsed[wordNo] = {what: 'special', field: 'yearseason', specialVal: 'decade', val: dec};
            } else if(matches = word.match(new RegExp('^((?:19|20)\\d{2})\\-?[^\\d]*$', 'i'))) {
                parsed[wordNo] = {what: 'year', val: matches[1]};
            } else if(matches = word.match(new RegExp('^((?:19|20)\\d{2})(?:[-_.]+)((?:19|20)?\\d{2})$', 'i'))) {
                var from = matches[1];
                var to = matches[2];
                if(to.length == 2)
                    to = from.substring(0, 2) + to;
                parsed[wordNo] = {what: 'year', range: [ from, to ]};
            } else if(matches = word.match(new RegExp('^((?:10|[1-9])(?:\\.\\d)?)(?:[-_]+)((?:10|[1-9])(?:\\.\\d)?)$', 'i'))) {
                var from = matches[1];
                var to = matches[2];
                parsed[wordNo] = {what: 'range', field: 'rating', range: [ from, to ]};
            } else if(matches = word.match(new RegExp('^((?:10|[1-9])(?:\\.\\d)?)$', 'i'))) {
                var from = matches[1];
                var to = matches[2];
                parsed[wordNo] = {what: 'range', field: 'rating', val: matches[1]};
            } else if(matches = word.match(new RegExp('^(\\d+(?:\\.\\d+)?)(?:[-_]+)(\\d+(?:\\.\\d+)?)$', 'i'))) {
                var from = matches[1];
                var to = matches[2];
                parsed[wordNo] = {what: 'range', range: [ from, to ]};
            } else if(matches = word.match(new RegExp('^(\\d+(?:\\.\\d+)?)$', 'i'))) {
                var from = matches[1];
                var to = matches[2];
                parsed[wordNo] = {what: 'range', val: matches[1]};
            } else if(word.indexOf('-') != -1) {
                var subwords = RuUtils.split(word, '-');
                var parsedSeasons = [];
                var seasons = this.meta.yearseason.season;
                for(var i = 0 ; i < subwords.length ; i++) {
                    var subwordStem = RuUtils.stem(subwords[i]);
                    for(var key in seasons) if(seasons.hasOwnProperty(key)) {
                        if(seasons[key].stemSynonyms.indexOf(subwordStem) != -1) {
                            parsedSeasons.push(key);
                            break;
                        }
                    }
                }
                if(parsedSeasons.length > 1) {
                    parsed[wordNo] = {what: 'season', range: parsedSeasons};
                }
            }
        }
        //если в каком-то слове нашли несколько значений.. (например, 'седзе' и 'седзе ай')
        for(var wordNo = 0 ; wordNo < words.length ; wordNo++) {
            if(parsed[wordNo] !== undefined) {
                if(Array.isArray(parsed[wordNo])) {
                    var fields = [];
                    for(var i = 0 ; i < parsed[wordNo].length ; i++) {
                        if(parsed[wordNo][i].field && fields.indexOf(parsed[wordNo][i].field) == -1)
                            fields.push(parsed[wordNo][i].field);
                    }
                    if(fields.length == 1) {
                        var maxWordsCnt = 0;
                        for(var i = 0 ; i < parsed[wordNo].length ; i++) {
                            if(!isNaN(parsed[wordNo][i].wordsCnt))
                                maxWordsCnt = Math.max(maxWordsCnt, parsed[wordNo][i].wordsCnt);
                        }
                        if(maxWordsCnt == 0)
                            parsed[wordNo] = parsed[wordNo][0];
                        else
                            for(var i = 0 ; i < parsed[wordNo].length ; i++) {
                                if(parsed[wordNo][i].wordsCnt == maxWordsCnt) {
                                    parsed[wordNo] = parsed[wordNo][i];
                                    break;
                                }
                            }
                    } else if(fields.length > 1) {
                        var prevField = null;
                        for(var wNo = wordNo - 1 ; wNo >= 0 ; wNo--) {
                            if(parsed[wNo] !== undefined) {
                                if(parsed[wNo].what == 'item' || parsed[wNo].what == 'field') {
                                    prevField = parsed[wNo].field;
                                    break;
                                } else if(parsed[wNo].what == 'not') {
                                } else break;
                            }
                        }
                        if(prevField) {
                            for(var i = 0 ; i < parsed[wordNo].length ; i++) {
                                if(parsed[wordNo][i].field == prevField) {
                                    parsed[wordNo] = parsed[wordNo][i];
                                    break;
                                }
                            }
                        } else {
                            console.warn("CatalogChipsSearch._parseWords()", "\n for word '" + words[wordNo] + "' found " + parsed[wordNo].length + " candidates - ", parsed[wordNo]);
                            parsed[wordNo] = parsed[wordNo][0];
                        }
                    } else {
                        console.warn("CatalogChipsSearch._parseWords()", "\n for word '" + words[wordNo] + "' found " + parsed[wordNo].length + " candidates - ", parsed[wordNo]);
                        parsed[wordNo] = parsed[wordNo][0];
                    }
                }
            }
        }
        //
        for(var wordNo = 0 ; wordNo < words.length ; wordNo++) {
            var word = words[wordNo];
            var origWord = origWords[wordNo];
            if(parsed[wordNo] === undefined) {
                parsed[wordNo] = origWord; //не распарсено
            } else if(parsed[wordNo].wordsCnt !== undefined && parsed[wordNo].wordsCnt > 1) {
                for(var i = 1 ; i < parsed[wordNo].wordsCnt ; i++)
                    parsed[wordNo+i] = -1; //N слов
            }
        }
        //сожмем диапазоны типа "2015 - 2016" в "2015-2016"
        for(var wordNo = 0 ; wordNo < parsed.length ; wordNo++) {
            var word = parsed[wordNo];
            var prevWord = wordNo > 0 ? parsed[wordNo-1] : null;
            var nextWord = wordNo < (parsed.length-1) ? parsed[wordNo+1] : null;
            if(typeof word == 'object' && word !== null && typeof prevWord == 'object' && prevWord !== null && typeof nextWord == 'object' && nextWord !== null 
                && word.what == '-' && prevWord.what == nextWord.what 
                && (prevWord.what == 'year' || prevWord.what == 'season' || prevWord.what == 'range')
            ) {
                parsed[wordNo-1] = {what: prevWord.what, range: [prevWord.val, nextWord.val], wordsCnt: 3};
                parsed[wordNo] = -1;
                parsed[wordNo+1] = -1;
            }
        }
        
        if(this.settings.debug == 1)
            console.info("CatalogChipsSearch._parseWords()", "\n [in] ", origWords, "\n [out] ", parsed);
        
        return {parsed: parsed, origWords: origWords};
    };


    /**
     * Сравнить сезон+год
     *
     * @param object ys1, ys2 - {season: 'winter'/null, year: 1999}
     * @return -1/0/+1 (+ если 1 > 2)
     */
    CatalogChipsSearch.prototype._compareYS = function(ys1, ys2) {
        if(ys1.year != ys2.year)
            return ys1.year > ys2.year ? 1 : -1;
        else if(ys1.season !== null && ys2.season !== null) {
            var si1 = CatalogChipsSearch.seasonsSlugs.indexOf(ys1.season);
            var si2 = CatalogChipsSearch.seasonsSlugs.indexOf(ys2.season);
            return si1 > si2 ? 1 : -1;
        } else
            return 0;
    };


    /**
     * Парсит строку на чипы.
     * Также определяет временные данные, найденные в строке поиска, для логики формирования нового чипа и выдачи предположений.
     * Не изменяет внутренних св-в объекта, в отличие от parseChips()
     *
     * @param array preChips - уже имеющиеся чипы, перед строкой поиска
     * @param string str - строка поиска
     * @param bool canFinalize - 1 при нажатии Enter или пробела
     * @return {chips: chips, unchippedStr: unchippedStr, tmpInfo: {field: '', ..}}
     *            unchippedStr - строка поиска
     *            tmpInfo - временные данные, найденные в строке поиска, для логики формирования нового чипа и выдачи предположений. ключи:
     *                field: 'rating'/..
     *                dash/not/from/to: 1/0
     *                seasonYear: { season: 'spring'/['spring','autumn']/null,  seasons: ['spring',..]/undefined }
     *                _lastWordNo: последнее слово в поисковой строке, распарсенное на временные данные (например, для "zzz жанр не zz" будет 2, для "тип ова" - 0, т.к. нет пробела в конце)
     *                expectingRange: 1/0
     *                expectingOnlyYear: 1/0
     *                autoAddTo: 1/0
     *            chips - массив чипов. ключи чипа: 
     *                field - 'genre', 'yearseason', 'rating', 'type', 'isAiring'
     *                not - bool
     *                op - 'and'/'or', для списков (жанров)
     *                val - например, 'meha' для field='genre'
     *                valFrom, valTo - для диапазонов
     *                specialVal - например, 'popular' для field='rating' (тогда val не будет) или 'decade' для field='yearseason' (тогда val=1980)
     *                 ( может быть одно из val, valFrom+valTo, specialVal[+val] )
     *                words - массив слов, из которых состоит чип
     *                fieldName, name - из метода _chipName()
     */
    CatalogChipsSearch.prototype._parseChips = function(preChips, str, canFinalizeStr) {
        var parsedRes = this._parseWords(str);
        var isTrimmingSpace = (str.length && str.match(/\s+$/) !== null);
        var isEndingDoubleSpace = str.length > 2 && str.substr(str.length - 2) == '  ';
        
        var preChipsCnt = preChips.length;
        var chips = extend(preChips);
        
        var tmpFieldWno = -1;
        var tmpInfo = {};
        var tmpChip = {};
        var lastTmpInfo = {};
        var tmpOrigWords = [];
        var prevLastWordNo = -1;
        var lastWordNo = -1;
        var _flushTmp = function() {
            tmpFieldWno = -1;
            tmpOrigWords = [];
            tmpChip = {};
            prevLastWordNo = lastWordNo;
            if(tmpInfo._lastWordNo !== undefined)
                lastWordNo = tmpInfo._lastWordNo;
            lastTmpInfo = tmpInfo;
            tmpInfo = {};
        };
        var _flushChip = function() {
            if(canFinalize) {
                chips.push(tmpChip);
                _flushTmp();
            }
        };
        var _pushChip = function() {
            if(canFinalize) {
                chips.push(tmpChip);
            }
        };
        _flushTmp();
        var lastChip = null;
        var lastWord = null;
        var parsedWords = parsedRes.parsed;
        var knownWordsCnt = 0;
        var origWords = parsedRes.origWords;
        for(var wordNo = 0 ; wordNo < parsedWords.length ; wordNo++) {
            var word = parsedWords[wordNo];
            if(typeof word == "object") {
                lastChip = chips.length ? chips[chips.length - 1] : null;
                var orWords = [];
                knownWordsCnt += (word.wordsCnt ? word.wordsCnt : 1);
                var lWordNo = wordNo + (word.wordsCnt ? word.wordsCnt : 1) - 1;
                for(var i = 0 ; i < (word.wordsCnt ? word.wordsCnt : 1) ; i++) {
                    orWords.push(origWords[wordNo + i]);
                    tmpOrigWords.push(origWords[wordNo + i]);
                }
                var orWordsSL = orWords.join(' ').toLowerCase();
                var isLastUnfinishedWord = (!isTrimmingSpace && lWordNo == (parsedWords.length - 1));
                var canFinalize = (canFinalizeStr || !isLastUnfinishedWord);
                
                //если ожидаем диапазон, а идет что-то другое, закрыть чип
                if(tmpInfo.expectingRange) {
                    var validWhats = [];
                    if(!tmpInfo.dash && !tmpInfo.from) {
                        validWhats.push('>');
                        validWhats.push('-');
                    }
                    if(tmpInfo.from)
                        validWhats.push('<');
                    var fieldMeta = this.meta[tmpInfo.field];
                    if(!fieldMeta || fieldMeta.type == 'yearseason') {
                        validWhats.push('season');
                        validWhats.push('year');
                    }
                    if(!fieldMeta || fieldMeta.type == 'range')
                        validWhats.push('range');
                    var isValid = (validWhats.indexOf(word.what) != -1);
                    if(!isValid) {
                        if(tmpChip.val !== undefined || tmpChip.valFrom !== undefined || tmpChip.valTo !== undefined) { //can flush
                            _flushChip();
                        }
                    }
                }
                
                if(!canFinalize)
                    continue; //не разбираем последнее слово до пробела
                
                lastWord = word;
                tmpInfo._lastWordNo = lWordNo;
                
                if(word.what == 'not') {
                    tmpInfo.not = (tmpInfo.not ? 0 : 1);
                } else if(word.what == '-') {
                    tmpInfo.dash = 1;
                    var fieldMeta = this.meta[tmpInfo.field];
                    if(!tmpInfo.from && !tmpInfo.to 
                        && fieldMeta && (fieldMeta.type == 'range' || fieldMeta.type == 'yearseason') 
                        && (tmpChip.val !== undefined && tmpChip.valTo === undefined)
                    ) {
                        tmpInfo.expectingRange = 1;
                        tmpChip.valFrom = tmpChip.val;
                        delete tmpChip.val;
                    }
                } else if(word.what == '<') {
                    tmpInfo.to = 1;
                } else if(word.what == '>') {
                    tmpInfo.from = 1;
                    tmpInfo.fromWord = orWordsSL;
                    if(!tmpInfo.to && orWordsSL == 'от' && (tmpChip.val === undefined && tmpChip.valFrom === undefined && tmpChip.valTo === undefined))
                        tmpInfo.expectingRange = 1;
                } else if(word.what == 'field') {
                    tmpFieldWno = wordNo;
                    tmpInfo.field = word.field;
                    var fieldMeta = this.meta[tmpInfo.field];
                    if(word.field = 'yearseason' && ["года", "годы", "год", "year"].indexOf(orWordsSL) != -1)
                        tmpInfo.expectingOnlyYear = 1;
                    if((fieldMeta.type == 'range' || fieldMeta.type == 'yearseason') && fieldMeta.pluralSynonyms.indexOf(orWordsSL) != -1 || ["года", "годы", "сезоны", "years", "seasons"].indexOf(orWordsSL) != -1)
                        tmpInfo.expectingRange = 1;
                } else if(word.what == 'special' && word.specialVal == 'decade') {
                    var isValid = true;
                    if(isValid) {
                        tmpChip.field = 'yearseason';
                        tmpChip.specialVal = 'decade';
                        tmpChip.val = word.val;
                        tmpChip.not = (tmpInfo.not == 1);
                        tmpChip.words = tmpOrigWords;
                        _flushChip();
                    }
                } else if(word.what == 'item' || word.what == 'special') {
                    var isValid = true;
                    var reqFieldBefore = 0;
                    if(word.what == 'item')
                        reqFieldBefore = this.meta[word.field].requireFieldBefore;
                    else if(word.what == 'special') {
                        var specialMeta = this.meta[word.field].specials[word.specialVal];
                        var synonymsRequireFieldBefore = specialMeta.synonymsRequireFieldBefore;
                        reqFieldBefore = specialMeta.requireFieldBefore 
                            || synonymsRequireFieldBefore && synonymsRequireFieldBefore.indexOf(word.syn) != -1;
                    }
                    if(reqFieldBefore != 0) {
                        tmpInfo.expectingField = word.field;
                        if(specialMeta !== undefined && specialMeta.suggestFor !== undefined)
                            tmpInfo.expectingSuggestFor = specialMeta.suggestFor;
                    }
                    if(reqFieldBefore != 0 && (!tmpInfo.field || tmpInfo.field !== word.field)) {
                        //look for field ahead (если ввел "высокий рейтинг")
                        var nextWord = (wordNo + 1 < parsedWords.length) ? parsedWords[wordNo+1] : null;
                        if(nextWord !== null && nextWord.what == 'field') {
                            tmpFieldWno = wordNo + 1;
                            lWordNo = tmpFieldWno + (nextWord.wordsCnt ? nextWord.wordsCnt : 1) - 1;
                            for(var i = 0 ; i < (nextWord.wordsCnt ? nextWord.wordsCnt : 1) ; i++) {
                                tmpOrigWords.push(origWords[tmpFieldWno + i]);
                            }
                            isLastUnfinishedWord = (!isTrimmingSpace && lWordNo == (parsedWords.length - 1));
                            canFinalize = (canFinalizeStr || !isLastUnfinishedWord);
                            
                            if(canFinalize) {
                                tmpInfo.field = nextWord.field;
                                lastWord = nextWord;
                                tmpInfo._lastWordNo = lWordNo;
                                wordNo++;
                            }
                        }
                    }
                    if(reqFieldBefore == 1 && tmpInfo.field !== word.field)
                        isValid = false; //бессмыслица типа "жанр ova", правильный field - тип, а не жанр
                    else if(reqFieldBefore == -1 && tmpInfo.field && tmpInfo.field !== word.field)
                        isValid = false; //не должно быть указано название другого поля перед
                    if(isValid) {
                        tmpChip.field = word.field;
                        tmpChip.not = (tmpInfo.not == 1);
                        if(word.what == 'item' && tmpChip.op === undefined) {
                            tmpChip.op = this.meta[word.field].defOp;
                            if(word.field == 'genre')
                                tmpChip.op = this.genreOp;
                        }
                        if(word.what == 'special')
                            tmpChip.specialVal = word.specialVal;
                        else
                            tmpChip.val = word.val;
                        if(word.what == 'special' && word.field == 'rating' && word.specialVal.match(/^top(\d+)$/)) {
                            tmpChip.not = 0;
                        }
                        if(this.meta[word.field].type == 'bool' && tmpChip.not) {
                            //pre normalize bool
                            tmpChip.val = ! (tmpChip.val == '1');
                            tmpChip.not = 0;
                        }
                        tmpChip.words = tmpOrigWords;
                        _flushChip();
                    }
                } else if(word.what == 'season') {
                    if(word.val && tmpInfo.seasonYear && typeof tmpInfo.seasonYear.season == 'string') {
                        //"лето осень 2015" -> "лето 2015, осень 2015"
                        tmpInfo.seasonYear.seasons = [tmpInfo.seasonYear.season, word.val];
                        delete tmpInfo.seasonYear.season;
                    } else if(word.val && tmpInfo.seasonYear && tmpInfo.seasonYear.seasons !== undefined) {
                        //"лето осень зима 2015" -> "лето 2015, осень 2015, зима 2015"
                        tmpInfo.seasonYear.seasons.push(word.val);
                    } else {
                        if(!tmpInfo.seasonYear)
                            tmpInfo.seasonYear = {season: null, year: null};
                        tmpInfo.seasonYear.season = word.range ? word.range : word.val;
                    }
                    tmpInfo.expectingOnlyYear = 0;
                } else if(word.what == 'year') {
                    var tmpSeason = tmpInfo.seasonYear && tmpInfo.seasonYear.season ? tmpInfo.seasonYear.season : null;
                    var tmpSeasons = tmpInfo.seasonYear && tmpInfo.seasonYear.seasons ? tmpInfo.seasonYear.seasons : null;
                    delete tmpInfo.seasonYear;
                    var isValid = true;
                    var reqFieldBefore = this.meta.yearseason.requireFieldBefore;
                    if(tmpSeason || tmpSeasons)
                        isValid = true; //времени года перед уже достаточно
                    else if(reqFieldBefore == 1 && tmpInfo.field !== 'yearseason')
                        isValid = false; //слово "сезон" (или синонимы) должно быть указано явно перед
                    else if(reqFieldBefore == -1 && tmpInfo.field && tmpInfo.field !== 'yearseason')
                        isValid = false; //не должно быть указано название другог поля перед
                    if(isValid && word.val && tmpSeasons) {
                        //"лето осень зима 2015" -> "лето 2015, осень 2015, зима 2015" (группа)
                        for(var i = 0 ; i < tmpSeasons.length ; i++) {
                            tmpChip = {field: 'yearseason', not: (tmpInfo.not == 1), words: tmpOrigWords};
                            tmpChip.val = {season: tmpSeasons[i], year: word.val};
                            tmpChip.groupInd = CatalogChipsSearch.__chipGroupInd;
                            tmpChip.isComplexYearSeason = true;
                            _pushChip();
                        }
                        CatalogChipsSearch.__chipGroupInd++;
                        _flushTmp();
                    } else {
                        tmpInfo.field = 'yearseason';
                        tmpChip.field = 'yearseason';
                        tmpChip.not = (tmpInfo.not == 1);
                        tmpChip.words = tmpOrigWords;
                        if(isValid && word.range) {
                            if(parseInt(word.range[0]) + 1 == word.range[1] && tmpSeason && typeof tmpSeason == 'string' && tmpSeason.toLowerCase() == 'winter') {
                                //"зима 2015-2016" => "зима 2016" (хитрая замена, т.к. зима пересекает границы года)
                                tmpChip.val = {season: tmpSeason, year: word.range[1]};
                                tmpChip.isComplexYearSeason = false;
                                _flushChip();
                            } else {
                                //"осень 2015-2016" => "от осени 2015 до 2016"
                                tmpChip.valFrom = {season: null, year: word.range[0]};
                                tmpChip.valTo = {season: null, year: word.range[1]};
                                if(tmpSeason && typeof tmpSeason == 'string')
                                    tmpChip.valFrom.season = tmpSeason;
                                tmpChip.isComplexYearSeason = true;
                                _flushChip();
                            }
                        } else {
                            if(isValid && tmpSeason && Array.isArray(tmpSeason)) {
                                //"весна-осень 2015" -> "от весны 2015 до осени 2015"
                                tmpChip.valFrom = {season: tmpSeason[0], year: word.val};
                                tmpChip.valTo = {season: tmpSeason[1], year: word.val};
                                tmpChip.isComplexYearSeason = true;
                                _flushChip();
                            } else {
                                var ysVal = {season: tmpSeason, year: word.val};
                                if(tmpInfo.dash && (tmpChip.val === undefined && tmpChip.valFrom === undefined) 
                                    && lastChip && lastChip.field == 'yearseason' && !lastChip.isComplexYearSeason && lastChip.valTo === undefined
                                    && this._compareYS(ysVal, (lastChip.valFrom !== undefined ? lastChip.valFrom : lastChip.val)) > 0
                                ) {
                                    //"осень 2015 - лето 2016": "-" значит интервал, изменяем прошлый чип
                                    if(lastChip.val !== undefined) {
                                        lastChip.valFrom = lastChip.val;
                                        delete lastChip.val;
                                    }
                                    lastChip.valTo = ysVal;
                                    for(var wNo in tmpOrigWords)
                                        lastChip.words.push(tmpOrigWords[wNo]);
                                    lastChip.isComplexYearSeason = false;
                                    delete lastChip.$$hashKey;
                                    _flushTmp();
                                } else if(tmpInfo.to && (tmpChip.val === undefined && tmpChip.valFrom === undefined) 
                                    && lastChip && lastChip.field == 'yearseason' && !lastChip.isComplexYearSeason && lastChip.valFrom !== undefined
                                    && this._compareYS(ysVal, lastChip.valFrom) > 0
                                ) {
                                    //"от 2011 до 2015" интервал, изменяем прошлый чип
                                    lastChip.valTo = ysVal;
                                    for(var wNo in tmpOrigWords)
                                        lastChip.words.push(tmpOrigWords[wNo]);
                                    lastChip.isComplexYearSeason = false;
                                    delete lastChip.$$hashKey;
                                    _flushTmp();
                                } else if(isValid) {
                                    //"весна 2015"
                                    var v = ysVal;
                                    if(tmpInfo.to || tmpInfo.dash)
                                        tmpChip.valTo = v;
                                    else if(tmpInfo.from)
                                        tmpChip.valFrom = v;
                                    else 
                                        tmpChip.val = v;
                                    tmpChip.isComplexYearSeason = false;
                                    if(!tmpSeason)
                                        tmpInfo.expectingOnlyYear = 1;
                                    if(tmpInfo.expectingRange && !(tmpChip.valFrom !== undefined && tmpChip.valTo !== undefined) && !canFinalizeStr) {
                                        //ждем "до X"
                                        tmpInfo.valFrom = v;
                                    } else {
                                        if(tmpChip.valFrom !== undefined && tmpChip.valTo !== undefined && deepCompare(tmpChip.valFrom, tmpChip.valTo)) {
                                            tmpChip.val = tmpChip.valFrom;
                                            delete tmpChip.valFrom;
                                            delete tmpChip.valTo;
                                        }
                                        _flushChip();
                                    }
                                }
                            }
                        }
                    }
                } else if(word.what == 'range') {
                    var isValid = false;
                    if(tmpInfo.seasonYear)
                        isValid = false; //"весна 2" - 2 это не рейтинг
                    else if(tmpInfo.field && this.meta[tmpInfo.field].type == 'range')
                        isValid = true; //поле явно указано перед числом
                    var range = word.range ? word.range : word.val;
                    if(isValid && Array.isArray(range)) {
                        //"рейтинг 5-6" -> "от 5 до 6"
                        tmpChip.field = tmpInfo.field;
                        tmpChip.valFrom = range[0];
                        tmpChip.valTo = range[1];
                        tmpChip.not = (tmpInfo.not == 1);
                        tmpChip.words = tmpOrigWords;
                        _flushChip();
                    } else {
                        if(tmpInfo.dash && (tmpChip.val === undefined && tmpChip.valFrom === undefined) 
                            && lastChip && (tmpInfo.field ? tmpInfo.field == lastChip.field : this.meta[lastChip.field].type == 'range') && lastChip.valTo === undefined
                            && word.val >= (lastChip.valFrom !== undefined ? lastChip.valFrom : lastChip.val)
                        ) {
                            //"6 - 9": "-" значит интервал, изменяем прошлый чип
                            if(lastChip.val !== undefined) {
                                lastChip.valFrom = lastChip.val;
                                delete lastChip.val;
                            }
                            lastChip.valTo = word.val;
                            for(var wNo in tmpOrigWords)
                                lastChip.words.push(tmpOrigWords[wNo]);
                            delete lastChip.$$hashKey;
                            _flushTmp();
                        } else if(tmpInfo.to && (tmpChip.val === undefined && tmpChip.valFrom === undefined) 
                            && lastChip && (tmpInfo.field ? tmpInfo.field == lastChip.field : this.meta[lastChip.field].type == 'range') && lastChip.valFrom !== undefined
                            && word.val >= lastChip.valFrom
                        ) {
                            //"от 6 до 9" интервал, изменяем прошлый чип
                            lastChip.valTo = word.val;
                            for(var wNo in tmpOrigWords)
                                lastChip.words.push(tmpOrigWords[wNo]);
                            delete lastChip.$$hashKey;
                            _flushTmp();
                        } else if(isValid) {
                            //"рейтинг 5"
                            tmpChip.field = tmpInfo.field;
                            tmpChip.not = (tmpInfo.not == 1);
                            if(tmpInfo.to || tmpInfo.dash)
                                tmpChip.valTo = range;
                            else if(tmpInfo.from)
                                tmpChip.valFrom = range;
                            else
                                tmpChip.val = range;
                            tmpChip.words = tmpOrigWords;
                            if(tmpInfo.expectingRange && !(tmpChip.valFrom !== undefined && tmpChip.valTo !== undefined) && !canFinalizeStr) {
                                //ждем "до X"
                                tmpInfo.valFrom = range;
                            } else {
                                if(tmpChip.valFrom !== undefined && tmpChip.valTo !== undefined && tmpChip.valFrom == tmpChip.valTo) {
                                    tmpChip.val = tmpChip.valFrom;
                                    delete tmpChip.valFrom;
                                    delete tmpChip.valTo;
                                }
                                _flushChip();
                            }
                        }
                    }
                }
                
                //если '-' или 'до' - продолжение предыдущего чипа, его нужно "расчипить" (для красоты, чтобы юзер видел, что продолжает ввод и чип еще не закрыт)
                if(1) { //можно отключить и парсинг будет тоже корректно работать, просто не будет "расчиповки" в UI
                    if(word && (word.what == '-' || word.what == '<') && (tmpChip.val === undefined && tmpChip.valFrom === undefined) && lastChip) {
                        var fieldMeta = this.meta[lastChip.field];
                        if(lastChip && (fieldMeta.type == 'range' || lastChip.field == 'yearseason' && !lastChip.isComplexYearSeason) 
                            && (word.what == '-' && lastChip.val !== undefined || word.what == '<' && lastChip.valFrom !== undefined) 
                            && lastChip.valTo === undefined
                            && (tmpInfo.field === undefined /* || tmpInfo.field == lastChip.field*/)
                        ) {
                            chips.pop();
                            extend(tmpInfo, lastTmpInfo);
                            tmpInfo = lastTmpInfo;
                            extend(lastChip, tmpChip);
                            var unchippedWords = lastChip.words;
                            for(var i = unchippedWords.length - 1 ; i >= 0 ; i--) {
                                tmpOrigWords.splice(0, 0, unchippedWords[i]);
                            }
                            lastWordNo = prevLastWordNo;
                            
                            var isNewChip = (chips.length + 1) > preChips.length;
                            if(!isNewChip) {
                                for(var i = unchippedWords.length - 1 ; i >= 0 ; i--) {
                                    parsedWords.splice(0, 0, unchippedWords[i]);
                                    origWords.splice(0, 0, unchippedWords[i]);
                                }
                                wordNo += unchippedWords.length;
                                tmpInfo._lastWordNo += unchippedWords.length;
                            }
                            
                            tmpInfo.expectingRange = 1;
                            tmpInfo.valFrom = (lastChip.valFrom !== undefined ? lastChip.valFrom : lastChip.val);
                            if(word.what == '-') {
                                tmpChip.valFrom = tmpChip.val;
                                delete tmpChip.val;
                            }
                        }
                    }
                }
            }
        }
        if (knownWordsCnt > 0)
            tmpInfo._knownWordsCnt = knownWordsCnt;
        
        //если ожидаем диапазон и в конце 2 пробела, закрыть чип (видимо, юзер ввел "рейтинг от 8", а "до X" не будет вводить)
        if(tmpInfo.expectingRange && isEndingDoubleSpace) {
            if(tmpChip.val !== undefined || tmpChip.valFrom !== undefined || tmpChip.valTo !== undefined) { //can flush
                _flushChip();
            }
        }
        
        
        var newChipsCnt = (chips.length - preChips.length);
        
        /*
        if(canFinalizeStr) {
            var lastChip = chips.length ? chips[chips.length - 1] : null;
            if(lastChip !== null && tmpInfo.field && lastChip.field == tmpInfo.field) {
                //что-то типа "аниме [эшкн] {жанра}" или "[2015] {года}" - поле идет после значения
                lastChip.words[tmpFieldWno] = origWords[tmpFieldWno];
                delete lastChip.$$hashKey;
            }
        }
        */
        
        //имена чипов
        for(var i = 0 ; i < chips.length ; i++) {
            var n = this._chipName(chips[i]);
            chips[i].fieldName = n.fieldName;
            chips[i].name = n.name;
        }
        
        //часть строки после последнего чипа - редактируемая
        unchippedStr = origWords.slice(lastWordNo + 1).join(' ');
        
        if(isTrimmingSpace && unchippedStr.length)
            unchippedStr += ' ';
        
        //для диапазоннов - автоматом дописывать 'до'
        /*
        if(tmpInfo.expectingRange && tmpInfo.from && tmpInfo.fromWord == 'от' && tmpInfo.valFrom !== undefined && !tmpInfo.to && isTrimmingSpace && !canFinalizeStr) {
            if(this.__autoAddedToForValFrom && deepCompare(this.__autoAddedToForValFrom, tmpInfo.valFrom)) {
                //уже дописывали "до ", а юзер стер
            } else {
                this.__autoAddedToForValFrom = tmpInfo.valFrom;
                unchippedStr += 'до ';
            }
        }
        if(newChipsCnt) {
            this.__autoAddedToForValFrom = null;
        }
        */
        
        if(this.settings.debug == 1)
            console.info("CatalogChipsSearch._parseChips()", "\n [in] preChips: ", preChips, " \n  str: ", '"'+str+'"', "\n  canFinalizeStr: ", canFinalizeStr, "\n [out] chips: ", chips, " \n  unchippedStr: ", '"'+str+'"', " \n  tmpInfo: ", JSON.stringify(tmpInfo));
        
        return {chips: chips, unchippedStr: unchippedStr, tmpInfo: tmpInfo};
    }


    /**
     * Парсит текущую строку на чипы
     *
     * @param bool canFinalize
     */
    CatalogChipsSearch.prototype.parseChips = function(canFinalize) {
        var res = this._parseChips(this.chips, this.unchippedStr, canFinalize);
        this.setUnchippedStr(res.unchippedStr);
        this.setChips(res.chips);
        this.tmpInfo = res.tmpInfo;
        
        if(this.settings.debug == 2)
            console.info("CatalogChipsSearch.parseChips(canFinalize = "+canFinalize+")", "\n [out] chips = ", this.chips, "\n unchippedStr = ", '"'+this.unchippedStr+'"', "\n tmpInfo = ", JSON.stringify(this.tmpInfo));
        if(this.settings.debug == 3)
            console.info("CatalogChipsSearch.parseChips(canFinalize = "+canFinalize+")", "\n [out] chips = ", this.chipsSer, "\n unchippedStr = ", '"'+this.unchippedStr+'"', "\n tmpInfo = ", this._tmpInfoAsString(this.tmpInfo));
    }

    /**
     */
    CatalogChipsSearch.prototype.setChips = function(newChips) {
        var oldChips = this.chips;
        this.chips = newChips;
        this._lastChipField = this.chips.length ? this.chips[this.chips.length-1].field : null;
        this.chipsModified();
    };

    /**
     */
    CatalogChipsSearch.prototype.pushHint = function(hint, newStr) {
        this.hintsStack.push(hint);
        this.unchippedStrStack.push( /*this.unchippedStr*/ this.hintsStackStr );
        this.hintsStackStr = newStr;
        if(this.delegate) this.delegate.onHintsStackChanged();
    };
    CatalogChipsSearch.prototype.popHint = function(hint) {
        this.resetFakeField();
        //this.checkHints();
        if(this.hintsStack.length) {
            var sugg = this.hintsStack.pop();
            var str = this.unchippedStrStack.pop();
            if (str === undefined)
                str = '';
            this.hintsStackStr = str;
            this.setUnchippedStr(str);
            this.parseChips();
            this.suggest();
            if(this.delegate) this.delegate.onHintsStackChanged();
        }
    };
    CatalogChipsSearch.prototype.clearHints = function() {
        this.hintsStack = [];
        this.isHintsStackDirty = false;
        this.hintsStackStr = '';
        this.unchippedStrStack = [];
        if(this.delegate) this.delegate.onHintsStackChanged();
    };
    CatalogChipsSearch.prototype.checkHints = function() {
        //obsolete
        /*if(this.hintsStack.length) {
            var s = this.unchippedStr.trim();
            var hs = [];
            for(var i = 0 ; i < this.hintsStack.length ; i++) {
                hs.push(this.hintsStack[i].replace);
            }
            var h = hs.join(' ');
            if(s !== h) {
                this.clearHints();
            }
        }*/
    };

    /**
     * Удалить повторяющиеся чипы и чипы с неправильными диапазонами
     */
    CatalogChipsSearch.prototype.normalizeChips = function(chips) {
        var tmp = {};
        var lastTopI = -1;
        for(var i = 0 ; i < chips.length ; i++) {
            var chip = chips[i];
            var isValid = true;
            var fieldMeta = this.meta[chip.field];
            var v = this._serializeChipVal(chip);
            var val = (fieldMeta.type == 'bool' ? 1 : v);
            var isYes = (fieldMeta.type == 'bool' ? (chip.val == 1) == (!chip.not) : !chip.not);
            if(v === '')
                isValid = false; //incorrect val?
            else if(tmp[chip.field] !== undefined && tmp[chip.field][val] !== undefined) {
                //del prev chip with same value
                var prevI = tmp[chip.field][val].ind;
                chips.splice(prevI, 1);
                for(var field_ in tmp) {
                    for(var val_ in tmp[field_]) {
                        if(tmp[field_][val_].ind > prevI)
                            tmp[field_][val_].ind--;
                    }
                }
                i--;
            }
            if(isValid && chip.field == 'rating' && chip.specialVal && chip.specialVal.match(/^top(\d+)$/)) {
                if(lastTopI == -1) {
                    lastTopI = i;
                } else {
                    //del prev top-X, keep new top-Y
                    chips.splice(lastTopI, 1);
                    for(var field_ in tmp) {
                        for(var val_ in tmp[field_]) {
                            if(tmp[field_][val_].ind > lastTopI)
                                tmp[field_][val_].ind--;
                        }
                    }
                    i--;
                    lastTopI = i;
                }
            }
            if(fieldMeta.type == 'range') {
                if(chip.valFrom !== undefined && chip.valTo !== undefined) {
                    if(parseFloat(chip.valFrom) > parseFloat(chip.valTo))
                        isValid = false; //incorrect range
                }
            } else if(fieldMeta.type == 'yearseason') {
                if(chip.valFrom !== undefined && chip.valTo !== undefined) {
                    if(this._compareYS(chip.valFrom, chip.valTo) > 0)
                        isValid = false; //incorrect range
                }
            }
            if(!isValid) {
                chips.splice(i, 1);
                i--;
            } else {
                if(tmp[chip.field] === undefined)
                    tmp[chip.field] = {};
                if(tmp[chip.field][val] === undefined)
                    tmp[chip.field][val] = {};
                tmp[chip.field][val] = {ind: i, isYes: isYes};
                
                //normalize bool
                if(fieldMeta.type == 'bool') {
                    chip.val = 1;
                    chip.not = !isYes;
                }
                //set isYes
                if(fieldMeta.type == 'bool' || fieldMeta.type == 'list')
                    chip.isYes = isYes;
            }
        }
    }
    
    /**
     * Проработать поля со спец. бул. значениями, как статус.
     * Если выбран сложный статус "Смотрел", отметить галочками при выводе предположений соотв. 4 простых статуса, 
     *  а уже имеющиеся чипы для других статусов удалить
     */
    CatalogChipsSearch.prototype.postProcessChips = function() {
        var self = this;
        
        var lastCLField = null;
        if(this._lastChipField) {
            var fieldMeta = this.meta[this._lastChipField];
            if(fieldMeta.complexBoolFields || fieldMeta.forList)
                lastCLField = this._lastChipField;
        }
        for(var field in this.meta) {
            if(this._chipsByVals[field] && (!lastCLField || lastCLField == field)) {
                var fieldMeta = this.meta[field];
                if(fieldMeta.complexBoolFields) {
                    //del chips for complex bools
                    for(var complVal in fieldMeta.complexBoolFields) {
                        var boolField = fieldMeta.complexBoolFields[complVal];
                        if(self._chipsByVals[boolField]) {
                            for(var val in self._chipsByVals[boolField]) {
                                var chip = self._chipsByVals[boolField][val];
                                var ind = self.chips.indexOf(chip);
                                if(ind != -1) {
                                    self.chips.splice(ind, 1);
                                }
                            }
                            delete self._chipsByVals[boolField];
                        }
                    }
                } else if(fieldMeta.forList) {
                    var complexVal = this._chipsByVals[field][0] !== undefined ? this._chipsByVals[field][0] : this._chipsByVals[field][1];
                    //del chips for simple vals
                    var listField = fieldMeta.forList;
                    var listMeta = this.meta[listField];
                    if(self._chipsByVals[listField])
                        for(var val in self._chipsByVals[listField]) {
                            var chip = self._chipsByVals[listField][val];
                            var ind = self.chips.indexOf(chip);
                            if(ind != -1) {
                                self.chips.splice(ind, 1);
                            }
                        }
                    //del chips for other complex bools
                    for(var complVal in listMeta.complexBoolFields) {
                        var boolField = listMeta.complexBoolFields[complVal];
                        if(boolField != field && self._chipsByVals[boolField]) {
                            for(var val in self._chipsByVals[boolField]) {
                                var chip = self._chipsByVals[boolField][val];
                                var ind = self.chips.indexOf(chip);
                                if(ind != -1) {
                                    self.chips.splice(ind, 1);
                                }
                            }
                            delete self._chipsByVals[boolField];
                        }
                    }
                    //set fake simple vals
                    self._chipsByVals[listField] = {};
                    fieldMeta.forListIncludeVals.forEach(function(val) {
                        self._chipsByVals[listField][val] = complexVal.isYes;
                    });
                }
            }
        }
    }
    
    /**
     */
    CatalogChipsSearch.prototype._getChipsByVals = function(chips) {
        var res = {};
        for(var i = 0 ; i < chips.length ; i++) {
            var chip = chips[i];
            var fieldMeta = this.meta[chip.field];
            var val = (fieldMeta.type == 'bool' ? 1 : chip.val);
            if(fieldMeta.type == 'bool' || fieldMeta.type == 'list') {
                if(res[chip.field] === undefined)
                    res[chip.field] = {};
                res[chip.field][val] = chip;
            } //other types are not supported yet (no need)
        }
        return res;
    };
    
    /**
     */
    CatalogChipsSearch.prototype.deleteChip = function(index) {
        if(index >= 0 && index < this.chips.length) {
            this.chips.splice(index, 1);
            this._lastChipField = null;
            this.chipsModified();
        }
    }
    
    /**
     */
    CatalogChipsSearch.prototype.chipsModified = function() {
        var oldChipsSer = this.chipsSer;
        var newDirtyChipsSer = this._serializeChips(this.chips);
        this.normalizeChips(this.chips);
        this._chipsByVals = this._getChipsByVals(this.chips);
        this.postProcessChips();
        this.chipsSer = this._serializeChips(this.chips);
        if(this.chipsSer != oldChipsSer) {
            this.onChipsChanged();
        }
        if(newDirtyChipsSer != oldChipsSer && this.unchippedStr === '') {
            this.clearHints();
        }
    }

    /**
     */
    CatalogChipsSearch.prototype.onChipsChanged = function() {
        this.suggest();
        if(this.delegate) this.delegate.onChipsChanged();
    }

    /**
     */
    CatalogChipsSearch.prototype.setUnchippedStr = function(unchippedStr) {
        var oldUnchippedStr = this.unchippedStr;
        this.unchippedStr = unchippedStr;
        if(oldUnchippedStr !== this.unchippedStr) {
            this.onUnchippedStrChanged();
        }
    };

    /**
     */
    CatalogChipsSearch.prototype.setSugges = function(sugges) {
        this.sugges = sugges;
        if(this.delegate) this.delegate.onSetSugges();
    }


    /**
     */
    CatalogChipsSearch.prototype.onUnchippedStrChanged = function() {
        if(this.delegate) this.delegate.onUnchippedStrChanged();
        //this.checkHints();
    }
    
    /**
     * Создает предположения для автокомплита на основе строки поиска, а также спарсенного последнего введенного поля.
     * Не изменяет внутренних св-в объекта, в отличие от suggest()
     *
     * @return array sugges - предположения
     *             ключи sugg:
     *                what - 'item', 'special', 'season', 'field'
     *                el - элемент из valuesSynonims (what = 'item','special','season') или fieldSynonims (what = 'field'); формат - см. метод setMeta()
     *                name - имя для отображения
     *                pr - рассчитанный приоритет
     *                m - [ {w: 0, pos/pos2: 0} / null, .. ], где индекс - номер слова в предположении, w - номер слова в str, pos - позиция вхождения поиск-слова #w в слове-предположении, pos2 - наоборот слова-предположения поиск-слове
     */
    CatalogChipsSearch.prototype._suggest = function(str, tmpInfo) {
        var sugges = [];
        var origStr = str;
        str = RuUtils.normalizeSpaces(str).toLowerCase();
        var searchWords = RuUtils.split(str, ' ');
        var suggFromWordNo = tmpInfo._lastWordNo !== undefined ? tmpInfo._lastWordNo + 1 : 0;
        var suggWordsCnt = searchWords.length - suggFromWordNo;
        
        if(suggWordsCnt == 0) {
            //предлагаем варианты перед вводом нового слова (т.е. если нет ни одной буквы, по которой можно искать совпадения)
            sugges = this._suggestNewWords(tmpInfo, origStr, searchWords);
        } else {
            //ищем слова по буквам - значения и поля из справочников
            sugges = this._suggestFromEnteredChars(tmpInfo, origStr, searchWords);
        }
        
        //для статуса - задизэйблить простые згначения, если выбрано сложное, или наоборот
        var disableFields = {};
        for(var field in this.meta) {
            var fieldMeta = this.meta[field];
            if(fieldMeta.complexBoolFields || fieldMeta.forList) {
                var hasChips = false;
                if(this._chipsByVals[field])
                    for(var v in this._chipsByVals[field]) {
                        if(typeof this._chipsByVals[field][v] == 'object') {
                            hasChips = true;
                            break;
                        }
                    }
                if(hasChips) {
                    if(fieldMeta.complexBoolFields) {
                        for(var complVal in fieldMeta.complexBoolFields) {
                            var boolField = fieldMeta.complexBoolFields[complVal];
                            disableFields[boolField] = 1;
                        }
                    } else if(fieldMeta.forList) {
                        var listField = fieldMeta.forList;
                        disableFields[listField] = 1;
                        var listMeta = this.meta[listField];
                        for(var complVal in listMeta.complexBoolFields) {
                            var boolField = listMeta.complexBoolFields[complVal];
                            if(boolField != field)
                                disableFields[boolField] = 1;
                        }
                    }
                }
            }
        }
        //отметить уже выбранные пользователем значения
        for(var i = 0 ; i < sugges.length ; i++) {
            var sugg = sugges[i];
            if(sugg.el.field) {
                var fieldMeta = this.meta[sugg.el.field];
                sugg.type = fieldMeta.type;
                if(sugg.what == 'item' && (fieldMeta.type == 'bool' || fieldMeta.type == 'list')) {
                    var v = fieldMeta.type == 'bool' ? 1 : sugg.el.val;
                    var f = sugg.el.field;
                    var chip = null;
                    if(this._chipsByVals[f] && typeof this._chipsByVals[f][v] == 'object') {
                        chip = this._chipsByVals[f][v];
                        if(!fieldMeta.showYesNo)
                            sugg.disabled = 1;
                        sugg.chip = chip;
                    } else if(this._chipsByVals[f] && typeof this._chipsByVals[f][v] == 'boolean') {
                        //tip: если юзер выбрал "Есть в моем списке", отметить все простые статусы, но не создавать чипы
                        sugg.fakeIsYes = this._chipsByVals[f][v];
                    }
                    if(disableFields[f] !== undefined)
                        sugg.disabled = 1;
                    if(fieldMeta.showYesNo && !tmpInfo.not) //tip: при вводе "не онго" в подсказке не выводить да-нет (т.к. юзер точно хочет поставить "нет")
                        sugg.showYesNo = 1;
                }
            }
        }
        
        if(this.settings.debug == 1)
            console.info("CatalogChipsSearch._suggest()", "\n [in] str: ", '"'+str+'"', " \n  tmpInfo: ", JSON.stringify(tmpInfo), "\n [out] ", sugges);
        
        return sugges;
    };
    
    /**
     * Создание предположений предположения для автокомплита, см. ф-ию _suggest()
     * Ищем слова по буквам - значения и поля из справочников
     *
     */
    CatalogChipsSearch.prototype._suggestFromEnteredChars = function(tmpInfo, origStr, searchWords) {
        var sugges = [];
        var suggFromWordNo = tmpInfo._lastWordNo !== undefined ? tmpInfo._lastWordNo + 1 : 0;
        var suggWordsCnt = searchWords.length - suggFromWordNo;
        var isTrimmingSpace = (origStr.length && origStr.match(/\s+$/) !== null);
        var lastSearchWord = searchWords.length ? searchWords[searchWords.length - 1] : '';
        
        var _getSameSugg = function(sugg) {
            var sameSugg = null;
            var sameSuggJ = null;
            for(var j = 0 ; j < sugges.length ; j++) {
                var sg = sugges[j];
                if (sg.what == sugg.what && sg.el.field == sugg.el.field 
                    && ((sugg.what == 'field' || sugg.what == 'item' && sugg.type == 'bool') ? true : sg.el.val == sugg.el.val)
                ) {
                    sameSugg = sg;
                    sameSuggJ = j;
                    break;
                }
            }
            return {sugg: sameSugg, j: sameSuggJ};
        };
        
        if(suggWordsCnt > 0) {
            //1. предлагаем года
            var r = this._suggestYears(tmpInfo, lastSearchWord);
            if(r.isEnteringYear && r.dr !== null) {
                var sortPos = 0;
                for(var y = r.from ; (r.dr > 0 ? y <= r.to : y >= r.to) ; y += r.dr) {
                    var sugg = {what: 'year', el: {field: 'yearseason', val: y}, name: r.prefix + y, replace: r.prefix + y, sortPos: sortPos};
                    sugg.m = [ {pos: 0, w: searchWords.length - 1} ];
                    sugges.push(sugg);
                    sortPos++;
                }
            }

            //2. ищем значения из списков и названия полей
            for(var x = 0 ; x < 2 ; x++) {
                //итерация x=0 - ищем в строке неполные значения из списков (жанр "коме", ..)
                //итерация x=1 - ищем в строке неполные названия полей для поиска ("жан", ..)
                if(Object.keys(tmpInfo).length && x == 1)
                    continue; //не подсказывать поля, если уже ввели имя поля
                if(!Object.keys(tmpInfo).length && suggWordsCnt == 0 && x == 0)
                    continue; //если еще ничего не ввел, подсказывать поля
                var synonims = (x == 0 ? this.valuesSynonims : this.fieldSynonims);
                for(var i = 0 ; i < synonims.length ; i++) {
                    var el = synonims[i];
                    var what = (x == 0 ? el.type /* 'item', 'special', 'season' */ : 'field');
                    if(el.dontSuggest)
                        continue;
                    if(tmpInfo.field && el.field != tmpInfo.field)
                        continue; //не релевантно
                    var fieldMeta = this.meta[el.field];
                    //строка для предположений пуста. ищем совпадения, сортируем.
                    var stemWords = el.stemSynWords;
                    var words = el.synWords;
                    
                    //пропустим нерелевантные синонимы (например "высокий" только для "рейтинг")
                    var reqFieldBefore = 0;
                    if(el.type == 'item')
                        reqFieldBefore = fieldMeta.requireFieldBefore;
                    else if(el.type == 'special') {
                        var synonymsRequireFieldBefore = fieldMeta.specials[el.val].synonymsRequireFieldBefore;
                        reqFieldBefore = fieldMeta.specials[el.val].requireFieldBefore 
                            || synonymsRequireFieldBefore && synonymsRequireFieldBefore.indexOf(el.syn) != -1;
                    }
                   if(reqFieldBefore == 1 && tmpInfo.field && tmpInfo.field !== el.field)
                        continue; //бессмыслица типа "жанр ova", правильный field - тип, а не жанр
                    else if(reqFieldBefore == -1 && tmpInfo.field && tmpInfo.field !== el.field)
                        continue; //не должно быть указано название другого поля перед
                    
                    //1. ищем вхождения слов (stemWords) в строке поиска
                    var mtch = [];
                    for(var stNo = 0 ; stNo < stemWords.length ; stNo++) {
                        var stemWord = stemWords[stNo];
                        for(var srNo = suggFromWordNo ; srNo < searchWords.length ; srNo++ ) {
                            var searchWord = searchWords[srNo];
                            //ищем "ле", стем "лет"
                            var pos = -1;
                            if(stemWord.length == 1) //предлог
                                pos = (stemWord == searchWord ? 0 : -1);
                            else
                                pos = stemWord.indexOf(searchWord);
                            if(pos != -1) {
                                if( mtch[srNo] === undefined || (pos == 0) >= (mtch[srNo].pos == 0) ) {
                                    if(searchWord.length <= 2 /* чтобы не выдавало короткие совпадения в середине/конце слова */ ? pos == 0 : true) {
                                        mtch[srNo] = {stNo: stNo, pos: pos};
                                    }
                                }
                            } else {
                                //ищем "летний", стем "лет"
                                var pos2 = -1;
                                pos2 = searchWord.indexOf(stemWord);
                                if(pos2 != -1) {
                                    if(pos2 == 0) { //чтобы, например, при поиске "пистолет" не выводило "лето"
                                        mtch[srNo] = {stNo: stNo, pos2: pos2};
                                    }
                                }
                            }
                        }
                    }
                    
                    var bestSeqs = [null, null]; //0 - ordered, 1 - non ordered
                    //2. ищем самое длинное последовательное вхождение слов (stemWords) в строке поиска
                    //пример:
                    //searchWords - два три пять раз [раз два]
                    //stemWords - раз два три
                    var seqs = [];
                    var seq = [];
                    for(var srNo = suggFromWordNo ; srNo < searchWords.length ; srNo++ ) {
                        if(mtch[srNo] !== undefined) {
                            if(!seq.length || mtch[srNo].stNo == seq[seq.length-1].stNo + 1)
                                seq.push({srNo: srNo, stNo: mtch[srNo].stNo, pos: mtch[srNo].pos});
                            if(seq.length && srNo == (searchWords.length - 1))
                                { seqs.push(seq); seq = []; }
                        } else if(seq.length > 1) 
                            { seqs.push(seq); seq = []; }
                    }
                    var m = [];
                    for(var j = 0 ; j < seqs.length ; j++) {
                        if(!bestSeqs[0])
                            bestSeqs[0] = seqs[j];
                        else if(seqs[j].length > bestSeqs[0].length || seqs[j][0].stNo < bestSeqs[0].stNo)
                            bestSeqs[0] = seqs[j];
                    }
                    //3. ищем не последовательные вхождения, но подряд
                    seqs = [];
                    seq = [];
                    for(var srNo = suggFromWordNo ; srNo < searchWords.length ; srNo++ ) {
                        if(mtch[srNo] !== undefined) {
                            var exists = false;
                            for(var j = 0 ; j < seq.length ; j++) {
                                if(seq[j].stNo == mtch[srNo].stNo) {
                                    exists = true; break;
                                }
                            }
                            if(!exists)
                                seq.push({srNo: srNo, stNo: mtch[srNo].stNo, pos: mtch[srNo].pos, pos2: mtch[srNo].pos2});
                            if(seq.length && srNo == (searchWords.length - 1)) 
                                { seqs.push(seq); seq = []; }
                        } else if(seq.length > 1) 
                            { seqs.push(seq); seq = []; }
                        for(var j = 0 ; j < seqs.length ; j++) {
                            if(!bestSeqs[1])
                                bestSeqs[1] = seqs[j];
                            else if(seqs[j].length > bestSeqs[1].length || seqs[j][0].stNo < bestSeqs[1].stNo)
                                bestSeqs[1] = seqs[j];
                        }
                    }
                    if(bestSeqs[0] || bestSeqs[1]) {
                        var suggs = [null, null];
                        for(var no = 0 ; no < 2 ; no++) {
                            m = [];
                            for(var j = 0 ; j < stemWords.length ; j++)
                                m[j] = null;
                            for(var j = 0 ; j < (bestSeqs[no] ? bestSeqs[no].length : 0) ; j++)
                                m[ bestSeqs[no][j].stNo ] = {w: bestSeqs[no][j].srNo, pos: bestSeqs[no][j].pos, pos2: bestSeqs[no][j].pos2};
                            //статистические данные для приоритета
                            var r = {
                                rel: ((tmpInfo && tmpInfo.field && tmpInfo.field == el.field && what != 'field') ? 1 : 0), //реленвантность
                                w : 0, //кол-во найденных слов
                                tw : stemWords.length, //общее кол-во слов в синониме
                                o: (no == 0 ? 1 : 0), //последовательное вх.
                                c: 0, //общее кол-во совпадающих символов (т.е. во всех найденных словах)
                                tc: 0, //общее кол-во символов найденных слов
                                pct: 0, //процент совпадения по символам (c / tc)
                                zc: 0, //кол-во несовпадающих символов (tc - c)
                                ms : 0, //кол-во стемов, найденных полностью (точное совпадение, кроме окончания)
                                me : 0, //кол-во слов, найденных полностью (точное совпадение)
                                bw : 0, //кол-во слов, найденных с начала (с первого символа)
                                bf : 0, //первое слово найдено с начала?
                                f : -1, //номер первого найденного слова в синониме
                                exc: 0, //кол-во слов, которые плохо подходят ( ищем "онгои", стем "он" (она) )
                            };
                            for(var j = 0 ; j < stemWords.length ; j++) {
                                if(m[j] !== null) {
                                    var isSearchWordLongerThanStem = (m[j].pos === undefined); //1 - ищем "летний", стем "лет", 0 - ищем "ле", стем "лет"
                                    var searchWordLen = searchWords[m[j].w].length;
                                    var stemWordLen = stemWords[j].length;
                                    var excessChars = 0;
                                    var isExcess = false;
                                    if(isSearchWordLongerThanStem) {
                                        //ищем "онгои", стем "он" (она) - "гои" тут лишнее => не подходит
                                        excessChars = Math.max(0, searchWordLen - stemWordLen);
                                        isExcess = excessChars >= stemWordLen;
                                    } else if(m[j].w < (searchWords.length - 1) || isTrimmingSpace) {
                                        //не трогать последнее полувведенное слово, оно не полное, а предыдущие проверить
                                        //ищем "в списке", стем "вышл" (вышла первая серия)
                                        excessChars = Math.max(0, stemWordLen - searchWordLen);
                                        isExcess = excessChars >= searchWordLen;
                                    }
                                    if(isExcess) {
                                        r.exc++;
                                        continue;
                                    }
                                    if(isSearchWordLongerThanStem) {
                                        r.c += stemWordLen;
                                        r.tc += searchWordLen;
                                    } else {
                                        r.c += searchWordLen;
                                        r.tc += stemWordLen;
                                    }
                                    r.w++;
                                    if(r.f == -1)
                                        r.f = j;
                                    if(m[j].pos == 0 || m[j].pos2 == 0)
                                        r.bw++;
                                    if((m[j].pos == 0 || m[j].pos2 == 0) && j == 0)
                                        r.bf = 1;
                                    if(searchWordLen >= stemWordLen && (m[j].pos == 0 || m[j].pos2 == 0))
                                        r.ms++;
                                    if(searchWordLen == words[j].length)
                                        r.me++;
                                }
                            }
                            r.pct = r.c / r.tc;
                            r.zc = r.tc - r.c;
                            //приоритет
                            var pr = 
                                r.rel * 1000000
                                + (r.w > 1 ? r.o * 100000 : 0)
                                + r.w * 10000
                                + r.c * 1000
                                + (r.me * 2 + r.ms) * 100
                                + (r.bf * 2 + r.bw) * 10
                                + (r.f < 9 ? 9 - r.f : 0)
                            ;
                            var sugg = {what: what, pr: pr, r: r, m: m, el: el, name: el.ocSyn, replace: el.ocSyn};
                            suggs[no] = sugg;
                        }
                        
                        //Из двух suggs выбираем лучший по приоритету
                        //Пример: поиск "фи по", синоним "полнометражный фильм" - suggs[0]:"полнометражный", suggs[1]:"фильм,полнометражный" - suggs[1] лучше, т.к. надено оба слова, хоть и не по порядку
                        var bestSugg = (suggs[1] === null ? suggs[0] : (suggs[0] === null ? suggs[1] : (
                            suggs[0].pr >= suggs[1].pr ? suggs[0] : suggs[1]
                        )));
                        //Не подходит, если слишком мало совпадающих символов (исключение - короткие слова типа "ай" в "седзе ай")
                        if(bestSugg.r.c < this.settings.minCharsForSuggestion && !bestSugg.r.me)
                            continue;
                        //Пример: ищем "в моем сп", отсеить подсказку "спешл" 
                        // (т.к. не релевантно, мало символов "сп", много лишних сслов "в моем") (немного грубое предположение)
                        //var knownWordsCnt = tmpInfo._knownWordsCnt ? tmpInfo._knownWordsCnt : 0;
                        var knownWordsCnt = (tmpInfo.genre ? 1 : 0) + (tmpInfo.not ? 1 : 0); //"жанр", "не"
                        if(bestSugg.r.c < 3 && (searchWords.length - knownWordsCnt - bestSugg.r.w) >= 2 && !bestSugg.r.rel)
                            continue;
                        delete bestSugg.r; //больше не нужно
                        bestSugg.type = fieldMeta.type;
                        //Если нашли несколько синонимов ("полнометражный фильм", "полнометражка"), оставим только один, самый подходящий
                        var sameRes = _getSameSugg(bestSugg);
                        if(sameRes.sugg) {
                            var replace = false;
                            if(bestSugg.what == 'item' && bestSugg.type == 'bool') {
                                replace = (bestSugg.pr > sameRes.sugg.pr || bestSugg.pr == sameRes.sugg.pr && bestSugg.el.val == 1);
                            } else if(sameRes.sugg.what == 'field') {
                                replace = true;
                            } else {
                                replace = (bestSugg.pr > sameRes.sugg.pr);
                            }
                            if(replace)
                                sugges[sameRes.j] = bestSugg;
                        } else {
                            sugges.push(bestSugg);
                        }
                    }
                }
            }
        }
        
        //сортировка по найденному
        sugges.sort(function(s1, s2) {
            if(s1.sortPos !== undefined && s2.sortPos !== undefined)
                return (s1.sortPos > s2.sortPos ? +1 : (s1.sortPos < s2.sortPos ? -1 : 0));
            return (s1.pr > s2.pr ? -1 : (s1.pr < s2.pr ? 1 : 0));
        });
        
        return sugges;
    }

    /**
     * Вспомогательная ф-ия для _suggestNewWords()
     */
    CatalogChipsSearch.prototype._suggestYears = function(tmpInfo, str) {
        var seasonsMeta = this.meta.yearseason.season;
        var seasonsSlugs = CatalogChipsSearch.seasonsSlugs; //Object.keys(this.meta.yearseason.season);
        var currSeasonInd = seasonsSlugs.indexOf(this.meta.yearseason.current.season);
        var currYear = this.meta.yearseason.current.year;
        var maxYear = parseInt(this.meta.yearseason.year.max);
        var minYear = parseInt(this.meta.yearseason.year.min);
        
        var isEnteringYear = false;
        if(str !== undefined) {
            str = str.trim();
            if(/^\d{2,4}$/.test(str)) {
                isEnteringYear = true;
                minYear = Math.max(minYear, parseInt( str + Array(1+4-str.length).join('0') ));
                maxYear = Math.min(maxYear, parseInt( str + Array(1+4-str.length).join('9') ));
            }
        }

        var r = { from : null, to : null, dr : null, prefix : '', isEnteringYear : isEnteringYear };
        if(tmpInfo.expectingOnlyYear) {
            if(tmpInfo.expectingRange && tmpInfo.valFrom === undefined) {
                if(!tmpInfo.from)
                    r.prefix = 'от ';
                r.from = maxYear - 1; r.to = minYear; r.dr = -1;
            } else if(tmpInfo.expectingRange && tmpInfo.valFrom !== undefined) {
                if(!(tmpInfo.to || tmpInfo.dash))
                    r.prefix = 'до ';
                r.from = maxYear; r.to = parseInt(tmpInfo.valFrom.year) + 1; r.dr = -1;
            } else {
                r.from = maxYear, r.to = minYear, r.dr = -1;
            }
        } else if(tmpInfo.seasonYear && (tmpInfo.seasonYear.season || tmpInfo.seasonYear.seasons)) {
            if(tmpInfo.expectingRange && tmpInfo.valFrom !== undefined) {
                if(!(tmpInfo.to || tmpInfo.dash))
                    r.prefix = 'до ';
                r.from = parseInt(tmpInfo.valFrom.year); r.to = maxYear; r.dr = +1;
                if(tmpInfo.seasonYear && tmpInfo.seasonYear.season) {
                    var tmpSeasonInd = seasonsSlugs.indexOf(tmpInfo.seasonYear.season);
                    var fromSeasonInd = tmpInfo.valFrom.season ? seasonsSlugs.indexOf(tmpInfo.valFrom.season) : -1;
                    //ввели "осень ", а сейчас весна => исключить текущий год
                    if(tmpSeasonInd != -1 && currSeasonInd != -1 && tmpSeasonInd > currSeasonInd)
                        r.to = currYear - 1;
                    //ввели "от лето 2015 до зимы " => 2015 не показывать
                    if(fromSeasonInd != -1 && tmpSeasonInd != -1 && tmpSeasonInd < fromSeasonInd)
                        r.from++;
                }
            } else {
                if(tmpInfo.expectingRange && tmpInfo.valFrom === undefined) {
                    if(!tmpInfo.from)
                        r.prefix = 'от ';
                }
                r.from = maxYear; r.to = minYear; r.dr = -1;
                if(tmpInfo.seasonYear && tmpInfo.seasonYear.season) {
                    var tmpSeasonInd = seasonsSlugs.indexOf(tmpInfo.seasonYear.season);
                    //ввели "осень ", а сейчас весна => исключить текущий год
                    if(tmpSeasonInd != -1 && currSeasonInd != -1 && tmpSeasonInd > currSeasonInd) {
                        r.from = currYear - 1;
                    }
                }
            }
        } else if(isEnteringYear) {
            r.from = maxYear; r.to = minYear; r.dr = -1;
        }
        return r;
    }
    
    /**
     * Создание предположений предположения для автокомплита, см. ф-ию _suggest()
     * Предлагаем варианты перед вводом нового слова (т.е. если нет ни одной буквы, по которой можно искать совпадения)
     *
     */
    CatalogChipsSearch.prototype._suggestNewWords = function(tmpInfo, origStr, searchWords) {
        var sugges = [];
        var suggFromWordNo = tmpInfo._lastWordNo !== undefined ? tmpInfo._lastWordNo + 1 : 0;
        var suggWordsCnt = searchWords.length - suggFromWordNo;
        var self = this;
        
        if(suggWordsCnt == 0) {
            var tmpField = tmpInfo.field;
            var isEnteredSomething = (tmpInfo.expectingRange || tmpInfo.from || tmpInfo.to || tmpInfo.dash || tmpInfo.seasonYear || tmpInfo.valFrom);
            if(!tmpField) {
                //fields
                if(!isEnteredSomething) {
                    for(var field in this.meta) if(this.meta.hasOwnProperty(field)) {
                        var fieldMeta = this.meta[field];
                        if(tmpInfo.expectingField && tmpInfo.expectingField != field)
                            continue;
                        if(fieldMeta.forList)
                            continue;
                        if(fieldMeta.type == 'bool') {
                            for(var b = 1 ; b >= 0 ; b--) {
                                if(b == 0 && (tmpInfo.not || fieldMeta.showYesNo))
                                    continue;
                                if(fieldMeta.vals[b].hide)
                                    continue;
                                var name = (b == 0 ? "Не " + fieldMeta.name.toLowerCase() : fieldMeta.name);
                                var sugg = {what: 'item', el: {val: b, field: field}, replace: name, name: name, sortPos: fieldMeta.sortPos+(b==0 ? 0.5 : 0)};
                                sugges.push(sugg);
                            }
                        } else {
                            var sugg = {what: 'field', el: {field: field}, name: fieldMeta.name, replace: fieldMeta.name, sortPos: fieldMeta.sortPos};
                            if(!( tmpInfo.expectingSuggestFor && fieldMeta.type == 'yearseason' && tmpInfo.expectingSuggestFor.indexOf('season') == -1 && tmpInfo.expectingSuggestFor.indexOf('seasons') == -1 ))
                                sugges.push(sugg);
                            if(fieldMeta.type == 'range' || fieldMeta.type == 'yearseason') {
                                //var repl = fieldMeta.name + ' от';
                                var repl = fieldMeta.pluralName;
                                var sugg = {what: 'field', el: {field: field}, expectingRange: 1, name: fieldMeta.pluralName + ' (от..до..)', replace: repl, sortPos: fieldMeta.sortPos+0.1};
                                if(!tmpInfo.expectingField)
                                    sugges.push(sugg);
                            }
                            //Добавить 'год' вручную вдобавок к 'сезон'
                            if(field == 'yearseason') {
                                var sugg = {what: 'field', el: {field: 'yearseason'}, expectingOnlyYear: 1, name: 'Год', replace: 'Год', sortPos: fieldMeta.sortPos+0.5};
                                if(!( tmpInfo.expectingSuggestFor && fieldMeta.type == 'yearseason' && tmpInfo.expectingSuggestFor.indexOf('year') == -1 && tmpInfo.expectingSuggestFor.indexOf('years') == -1 ))
                                    sugges.push(sugg);
                                //var repl = 'Год' + ' от';
                                var repl = 'Годы';
                                var sugg = {what: 'field', el: {field: 'yearseason'}, expectingOnlyYear: 1, expectingRange: 1, name: 'Годы' + ' (от..до..)', replace: repl, sortPos: fieldMeta.sortPos+0.6};
                                if(!tmpInfo.expectingField)
                                    sugges.push(sugg);
                            }
                        }
                    }
                }
            } else {
                var fieldMeta = this.meta[tmpField];
                if(tmpField == 'rating' || tmpField == 'myscore') {
                    //rating
                    var max = 10, min = 0;
                    var prefix = '';
                    var from = null, to = null, dr = null;
                    if(tmpInfo.expectingRange && tmpInfo.valFrom === undefined) {
                        if(!tmpInfo.from)
                            prefix = 'от ';
                        from = max - 1; to = min; dr = -1;
                    } else if(tmpInfo.expectingRange && tmpInfo.valFrom !== undefined) {
                        if(!(tmpInfo.to || tmpInfo.dash))
                            prefix = 'до ';
                        from = max; to = parseInt(tmpInfo.valFrom) + 1; dr = -1;
                    } else {
                        from = max, to = min, dr = -1;
                    }
                    if(dr !== null) {
                        var sortPos = 0;
                        for(var r = from ; (dr > 0 ? r <= to : r >= to) ; r += dr) {
                            var sugg = {what: 'val', el: {field: tmpField, val: r}, name: prefix + r, replace: prefix + r, sortPos: sortPos};
                            sugges.push(sugg);
                            sortPos++;
                        }
                    }
                } else if(tmpField == 'yearseason') {
                    var seasonsMeta = this.meta.yearseason.season;
                    var seasonsSlugs = CatalogChipsSearch.seasonsSlugs; //Object.keys(this.meta.yearseason.season);
                    var currSeasonInd = seasonsSlugs.indexOf(this.meta.yearseason.current.season);
                    var currYear = this.meta.yearseason.current.year;
                    var maxYear = parseInt(this.meta.yearseason.year.max);
                    var minYear = parseInt(this.meta.yearseason.year.min);
                    //yearseason - year
                    var r = this._suggestYears(tmpInfo);
                    if(r.dr !== null) {
                        var sortPos = 0;
                        for(var y = r.from ; (r.dr > 0 ? y <= r.to : y >= r.to) ; y += r.dr) {
                            var sugg = {what: 'year', el: {field: 'yearseason', val: y}, name: r.prefix + y, replace: r.prefix + y, sortPos: sortPos};
                            sugges.push(sugg);
                            sortPos++;
                        }
                    }
                    //yearseason - season
                    if(!tmpInfo.expectingOnlyYear && !(tmpInfo.seasonYear && (tmpInfo.seasonYear.season || tmpInfo.seasonYear.seasons))) {
                        var sortPos = 0;
                        var prefix = '';
                        for(var i = 0 ; i < seasonsSlugs.length /*4*/ ; i++) {
                            if(tmpInfo.expectingRange && tmpInfo.valFrom === undefined) {
                                if(!tmpInfo.from)
                                    prefix = 'от ';
                            } else if(tmpInfo.expectingRange && tmpInfo.valFrom !== undefined) {
                                if(!(tmpInfo.to || tmpInfo.dash))
                                    prefix = 'до ';
                                var fromSeasonInd = tmpInfo.valFrom.season ? seasonsSlugs.indexOf(tmpInfo.valFrom.season) : -1;
                                //сейчас "весна 2016", ввели "от зимы 2015" - оставить зиму, весну
                                if(parseInt(tmpInfo.valFrom.year) == currYear) {
                                    if(i < fromSeasonInd || i > currSeasonInd)
                                        continue;
                                }
                                //сейчас "весна 2016", ввели "от осени 2015" - лето пропустить
                                if(parseInt(tmpInfo.valFrom.year) == (currYear - 1)) {
                                    if(i < fromSeasonInd && i > currSeasonInd)
                                        continue;
                                }
                            }
                            
                            var sugg = {what: 'season', el: {val: seasonsSlugs[i], field: 'yearseason'}, name: prefix + seasonsMeta[seasonsSlugs[i]].name + '..', replace: prefix + seasonsMeta[seasonsSlugs[i]].name, sortPos: sortPos};
                            sugges.push(sugg);
                            sortPos++;
                        }
                    }
                } else if(fieldMeta.type == 'list') {
                    //list
                    var vals = fieldMeta.vals;
                    for(var slug in vals) if(vals.hasOwnProperty(slug)) {
                        var val = vals[slug];
                        var sugg = {what: 'item', el: {val: slug, field: tmpField}, name: val.name, replace: val.name};
                        if(val.sortPos !== undefined)
                            sugg.sortPos = val.sortPos;
                        sugges.push(sugg);
                    }
                    
                    //bools in list
                    if(fieldMeta.complexBoolFields) {
                        var hasSpecials = false;
                        for(var complVal in fieldMeta.complexBoolFields) {
                            var boolField = fieldMeta.complexBoolFields[complVal];
                            var boolFieldMeta = self.meta[boolField];
                            for(var b = 1 ; b >= 0 ; b--) {
                                if(b == 0 && (tmpInfo.not || boolFieldMeta.showYesNo))
                                    continue;
                                if(boolFieldMeta.vals[b].hide)
                                    continue;
                                var name = (b == 0 ? "Не " + boolFieldMeta.name.toLowerCase() : boolFieldMeta.name);
                                var sugg = {what: 'item', isSpecial: 1, el: {val: b, field: boolField}, replace: name, name: name, sortPos: boolFieldMeta.sortPos+(b==0 ? 0.5 : 0)};
                                sugges.push(sugg);
                                hasSpecials = true;
                            }
                        }
                        if(hasSpecials) {
                            //добавить разделитель между спец.булами и значениями
                            var sugg = {what: 'divider', disabled: 1, replace: '', name: '-', el: {}};
                            sugges.push(sugg);
                        }
                    }
                }
                
                
                //special
                var specials = fieldMeta.specials;
                if(specials !== undefined) {
                    var hasSpecials = false;
                    for(var sptype in specials) if(specials.hasOwnProperty(sptype)) {
                        var special = specials[sptype];
                        var chip = null;
                        for(var i = 0 ; i < this.chips.length ; i++)
                            if(this.chips[i].field == tmpField && this.chips[i].specialVal == sptype) {
                                chip = this.chips[i];
                                break;
                            }
                        var sf = (fieldMeta.type == 'yearseason' ? (tmpInfo.expectingOnlyYear ? 'year' : 'season') : tmpField) + (tmpInfo.expectingRange ? "s" : "");
                        if(tmpInfo.expectingRange && !(tmpInfo.valFrom === undefined))
                            continue; //только для от-значения
                        if(fieldMeta.type == 'yearseason' && !tmpInfo.expectingOnlyYear && tmpInfo.seasonYear && tmpInfo.seasonYear.season)
                            continue; //только для первого выбора времени года
                        if(special.suggestFor.indexOf(sf) == -1)
                            continue;
                        if(special.name !== undefined) {
                            var sugg = {what: 'special', el: {val: sptype, field: field}, name: special.name, replace: special.name};
                            if(special.sortPos !== undefined)
                                sugg.sortPos = special.sortPos;
                            if(chip) {
                                sugg.chip = chip;
                                sugg.disabled = 1;
                            }
                            sugges.push(sugg);
                            hasSpecials = true;
                        }
                    }
                    if(hasSpecials) {
                        //добавить разделитель между спец.значениями и значениями
                        var sugg = {what: 'divider', disabled: 1, replace: '', name: '-', el: {}};
                        sugges.push(sugg);
                    }
                }
            }
        }
        
        //сортировка по позиции/алфавиту
        sugges.sort(function(s1, s2) {
            if(s1.what != s2.what) {
                var whatOrder = ['field', 'special', 'divider', 'item', 'val', 'season', 'year'];
                var whatInd1 = s1.isSpecial ? whatOrder.indexOf('special') : whatOrder.indexOf(s1.what);
                var whatInd2 = s2.isSpecial ? whatOrder.indexOf('specia2') : whatOrder.indexOf(s2.what);
                return (whatInd1 < whatInd2 ? -1 : (whatInd1 > whatInd2 ? 1 : 0));
            }
            if(s1.sortPos !== undefined && s2.sortPos !== undefined)
                return (s1.sortPos < s2.sortPos ? -1 : (s1.sortPos > s2.sortPos ? 1 : 0));
            else
                return (s1.name < s2.name ? -1 : (s1.name > s2.name ? 1 : 0));
        });
        
        return sugges;
    }


    /**
     * Создает предположения для автокомплита на основе текущей строки
     */
    CatalogChipsSearch.prototype.suggest = function() {
        this.setSugges(this._suggest(this.unchippedStr, this.tmpInfo));
        
        if(this.settings.debug == 2)
            console.info("CatalogChipsSearch.suggest()", "\n [out] sugges = ", this.sugges);
        if(this.settings.debug == 3)
            console.info("CatalogChipsSearch.suggest()", "\n [out] sugges = ", this._suggesAsString(this.sugges));
    }


    /**
     *
     */
    CatalogChipsSearch.prototype.isSugg = function(obj) {
        return obj.replace !== undefined;
    }

    /**
     *
     */
    CatalogChipsSearch.prototype.isValidChip = function(chip) {
        return !(this.isSugg(chip));
    }


    /**
     * @return bool - true если в чипы добавился sugg и соответсвенно был извлечен и применен к строке
     */
    CatalogChipsSearch.prototype.validateChips = function() {
        //если в чипы добавился sugg, удалить из чипов и вместо этого применить этот sugg 
        //angular material по умолчанию при клике на sugg добавляет его в чипы, а также при выборе sugg через стрелки и enter
        var sugg = null;
        for(var i = 0 ; i < this.chips.length ; i++) {
            if(this.isSugg(this.chips[i])) {
                var sugg = this.chips[i];
                this.chips.splice(i, 1);
                i--;
            }
        }
        if(sugg) {
            this.applySuggestion(sugg, false);
            return true;
        }
        return false;
    };


    /**
     * Обновляет текущую строку. Парсит чипы и выдает предположения для автокомплита.
     */
    CatalogChipsSearch.prototype.setSearchStr = function(str, canFinalize, validateChips) {
        if(this.settings.debug == 2)
            console.info("CatalogChipsSearch.setSearchStr( '"+str+"', canFinalize = " + canFinalize + ")");
        
        var wasInvalidSuggApplied = false;
        var suggApplied = false;
        if(validateChips)
            suggApplied = this.validateChips();
        var oldUnchippedStr = this.unchippedStr;
        if(suggApplied && str == '') {
            wasInvalidSuggApplied = true;
            //это значит, что angular material добавил чип из sugg (так он делает по умолчанию) - нам это не подходит
        } else {
            if (this.hintsStack.length && str.indexOf(this.hintsStackStr.replace(/~+$/,'')) != 0) {
                //юзер изменил часть поисковой строки, которая создавалась через подсказки, => считаем подсказки "грязными" (просто новые не добавляем)
                this.isHintsStackDirty = true;
            }
            if (str.trim() === '')
                this.clearHints();
            this.setUnchippedStr(str);
        }
        if(suggApplied || oldUnchippedStr !== str) {
            this.parseChips(canFinalize);
            this.suggest();
        } else if(str === '' && !this.sugges.length) {
            //initial set ''
            this.suggest();
        }
        
        if(this.settings.debug == 3)
            console.info("CatalogChipsSearch.setSearchStr()", "\n [in] ", '"'+str+'"', "\n [out] chips: ", this.chipsSer, "\n sugges: ", this._suggesAsString(this.sugges), (wasInvalidSuggApplied ? "\n ! invalid sugg was applied" :""));
        
        return wasInvalidSuggApplied;
    };

    /**
     */
    CatalogChipsSearch.prototype.clearSearchStr = function() {
        this.setSearchStr('', 0);
        this.resetFakeField();
        this.clearHints();
    };

    /**
     * Применяет выбранное предположение к строке.
     * Не изменяет внутренних св-в объекта, в отличие от applySuggestion()
     */
    CatalogChipsSearch.prototype._applySuggestion = function(sugg, str) {
        var origStr = RuUtils.normalizeSpaces(str);
        var origWords = RuUtils.split(origStr, ' ');
        if(sugg.m) {
            var srNos = []; //номера слов в строке поиска
            for(var i = 0 ; i < sugg.m.length ; i++)
                if(sugg.m[i] !== null)
                    srNos.push(sugg.m[i].w);
            srNos.sort();
            for(var i = srNos.length - 1 ; i >= 0 ; i--) {
                if(i == 0)
                    origWords[srNos[i]] = sugg.replace;
                else
                    origWords.splice(srNos[i], 1);
            }
        } else {
            origWords.push(sugg.replace);
        }
        var newStr = origWords.join(' ');
        
        if(this.settings.debug == 1)
            console.info("CatalogChipsSearch._applySuggestion()", "\n [in] sugg: ", sugg, " \n  str: ", '"'+str+'"', "\n [out] ", '"'+newStr+'"');
        
        return newStr;
    };


    /**
     * Применяет выбранное предположение к текущей строке
     */
    CatalogChipsSearch.prototype.applySuggestion = function(sugg, andParseChips /* = true*/) {
        var oldTmpInfo = this.tmpInfo;
        if(andParseChips === undefined)
            andParseChips = true;
        var newStr = this._applySuggestion(sugg, this.unchippedStr);
        newStr += ' ';
        if (!this.isHintsStackDirty) {
            this.pushHint(sugg, newStr);
        }
        this.setUnchippedStr(newStr);
        if(this.settings.debug >= 2)
            console.info("CatalogChipsSearch.applySuggestion()", "\n [in] ", sugg, "\n [out] unchippedStr = ", '"'+this.unchippedStr+'"');
        
        if(andParseChips) {
            this.parseChips();
            this.suggest();
        }
    };

    /**
     * Обработка нажатия на предположение или кнопки [v][x]
     *
     * @param undefined/bool isYesBtn
     * @return bool - вернулись ли на 1й уровень подсказок? 
     *  true - обычное поведение
     *  false - была применена возможность ставить галочки [v][x] без сброса подсказок на 1й уровень, см. resetFakeField()
     */
    CatalogChipsSearch.prototype.selectSuggestion = function(sugg, isYesBtn) {
        var chipIsYes = sugg.chip !== undefined ? sugg.chip.isYes : undefined;
        var isRev = sugg.showYesNo && (sugg.type == 'bool' && sugg.el.val == 0); //tip: есть чип "онгоинг: нет", ввел "заверше" - в подсказке должно стоять наоборот Yes
        var isYes = !!isYesBtn;
        if(isRev)
            isYes = !isYes;
        
        var oldTmpInfo = this.tmpInfo;
        var oldHintsStack = this.hintsStack;
        var oldUnchippedStrStack = this.unchippedStrStack;
        var oldUnchippedStr = this.unchippedStr;
        var str = RuUtils.normalizeSpaces(this.unchippedStr).toLowerCase();
        var searchWords = RuUtils.split(str, ' ');
        var suggFromWordNo = oldTmpInfo._lastWordNo !== undefined ? oldTmpInfo._lastWordNo + 1 : 0;
        var suggWordsCnt = searchWords.length - suggFromWordNo;
        
        if(chipIsYes === undefined || isYesBtn === undefined) {
            //apply sugg (can add chip)
            if(isYesBtn !== undefined && isYesBtn === false)
                sugg.replace = 'не ' + sugg.replace;
            this.applySuggestion(sugg);
        } else if(isYes === chipIsYes) {
            //del chip
            var ind = this.chips.indexOf(sugg.chip);
            if(ind != -1) {
                this.chips.splice(ind, 1);
                this._lastChipField = null;
                this.setSearchStr('', 0);
                this.chipsModified();
            }
        } else {
            //upd chip
            sugg.chip.not = ! sugg.chip.not;
            this._updChipName(sugg.chip);
            this._lastChipField = sugg.chip.field;
            this.setSearchStr('', 0);
            this.chipsModified();
        }
        
        // Для возможности ставить галочки [v][x] без сброса подсказок на 1й уровень.
        // При закрытии окна подсказок нужно сбрасывать tmpInfo! см. resetFakeField()
        if(sugg.showYesNo && oldTmpInfo.field && suggWordsCnt == 0) {
            //obsolete?
            //no need if we have back button
            /*this.tmpInfo.field = oldTmpInfo.field;
            this.tmpInfo.isFakeField = 1;*/
            this.setSearchStr(oldUnchippedStr, 0);
            this.hintsStack = [ oldHintsStack[0] ];
            this.isHintsStackDirty = false;
            this.hintsStackStr = oldUnchippedStr;
            this.unchippedStrStack = [ oldUnchippedStrStack[0] ];
            if(this.delegate) this.delegate.onHintsStackChanged();
            this.suggest();
            return false;
        }
        return true;
    };
    
    /**
     * Сбросить подсказки на 1й уровень после установки tmpInfo.isFakeField=1 в selectSuggestion()
     * obsolete?
     */
    CatalogChipsSearch.prototype.resetFakeField = function() {
        if(this.tmpInfo.isFakeField) {
            this.tmpInfo = {};
            this.clearHints();
            this.suggest();
            return true;
        }
        return false;
    };

    /**
     * Сбросить поисковую строку и чипы
     */
    CatalogChipsSearch.prototype.reset = function() {
        this.setUnchippedStr('');
        this.chips = [];
        this._chipsByVals = {};
        this.chipsSer = '';
        this.onChipsChanged();
        this.clearHints();
        this.tmpInfo = {};
        this.setSugges([]);
    }


    /**
     *
     */
    CatalogChipsSearch.prototype.unserializeChips = function(str) {
        this.reset();
        this.chipsSer = str;
        this.chips = this._unserializeChips(this.chipsSer);
        this._chipsByVals = this._getChipsByVals(this.chips);
        this.onChipsChanged();
        this.clearHints();
        this.suggest();
    }


    /**
     * Имя чипа для отображения
     *
     * @param object chip
     * @return {fieldName: fieldStr, name: str}
     */
    CatalogChipsSearch.prototype._chipName = function(chip) {
        var str = null, fieldStr = null;
        var fieldMeta = this.meta[chip.field];
        fieldStr = fieldMeta.name;
        if(chip.specialVal !== undefined) {
            var valMeta = fieldMeta.specials[chip.specialVal];
            if(chip.field == 'yearseason' && chip.specialVal == 'decade') {
                str = valMeta.nameTpl.replace('{{val}}', chip.val);
                fieldStr = "Годы";
            } else if(chip.field == 'yearseason' && chip.specialVal == 'classic') {
                fieldStr = "Годы";
                str = valMeta.name;
            } else {
                str = valMeta.name;
            }
            str = (chip.not ? "Не " : "") + str;
        } else if(fieldMeta.type == 'list') {
            var valMeta = fieldMeta.vals[chip.val];
            str = (chip.not ? "Не " : "") + valMeta.name;
        } else if(fieldMeta.type == 'bool') {
            var valMeta = fieldMeta.vals[chip.val];
            str = ((chip.not == false) == (chip.val == '1') /*xnor*/ ? "да" : "нет");
        } else if(fieldMeta.type == 'range') {
            if(chip.val !== undefined) {
                str = (chip.not ? "Не " : "") + chip.val;
            } else {
                str = (chip.not ? "Не " : "")
                    + (chip.valFrom !== undefined ? "от " + chip.valFrom : "")
                    + (chip.valFrom !== undefined && chip.valTo !== undefined ? " " : "")
                    + (chip.valTo !== undefined ? "до " + chip.valTo : "");
            }
        } else if(fieldMeta.type == 'yearseason') {
            var seasonsMeta = this.meta.yearseason.season;
            if(chip.val !== undefined) {
                var valSeason = chip.val.season ? seasonsMeta[chip.val.season].name : null;
                str = (chip.not ? "Не " : "") + [valSeason, chip.val.year].filter(function(e) { return e !== null }).join(' ');
                if(valSeason === null)
                    fieldStr = "Год";
            } else {
                var valFromSeason = chip.valFrom !== undefined && chip.valFrom.season ? seasonsMeta[chip.valFrom.season].name : null;
                var valToSeason = chip.valTo !== undefined && chip.valTo.season ? seasonsMeta[chip.valTo.season].name : null;
                str = ''
                    + (chip.valFrom === undefined && chip.valTo !== undefined ? "до " : "")
                    + (chip.valFrom !== undefined && chip.valTo === undefined ? "от " : "")
                    + (chip.valFrom !== undefined ? "" + [valFromSeason, chip.valFrom.year].filter(function(e) { return e !== null }).join(' ') : "")
                    + (chip.valFrom !== undefined && chip.valTo !== undefined ? " - " : "")
                    + (chip.valTo !== undefined ? "" + [valToSeason, chip.valTo.year].filter(function(e) { return e !== null }).join(' ') : "")
                ;
                if(chip.valFrom !== undefined && chip.valFrom.season !== null || chip.valTo !== undefined && chip.valTo.season !== null)
                    fieldStr = "Сезоны";
                else
                    fieldStr = "Годы";
            }
        }
        
        return {fieldName: fieldStr, name: str};
    };


    /**
     * Из чипа сделать исходную строку (нужно для десериализации)
     *
     * @param object chip
     * @return array words
     */
    CatalogChipsSearch.prototype._chipWords = function(chip) {
        var words = [];
        var fieldMeta = this.meta[chip.field];
        var fieldStr = fieldMeta.name;
        if(chip.specialVal !== undefined) {
            var valMeta = fieldMeta.specials[chip.specialVal];
            var str;
            if(chip.field == 'yearseason' && chip.specialVal == 'decade') {
                str = valMeta.nameTpl.replace('{{val}}', chip.val);
                fieldStr = "Годы";
            } else if(chip.field == 'yearseason' && chip.specialVal == 'classic') {
                fieldStr = "Годы";
                str = valMeta.name;
            } else {
                str = valMeta.name;
            }
            words.push(fieldStr);
            if(chip.not)
                words.push('не');
            words.push(str);
        } else if(fieldMeta.type == 'list') {
            var valMeta = fieldMeta.vals[chip.val];
            words.push(fieldStr);
            if(chip.not)
                words.push('не');
            words.push(valMeta.name);
        } else if(fieldMeta.type == 'bool') {
            var valMeta = fieldMeta.vals[chip.val];
            //if(chip.not)
            //    words.push('не');
            //words.push(fieldMeta.name);
            words.push(valMeta.name);
        } else if(fieldMeta.type == 'range') {
            if(chip.not)
                words.push('не');
            if(chip.val !== undefined) {
                words.push(chip.val);
            } else {
                if(chip.valFrom !== undefined) {
                    words.push("от");
                    words.push(chip.valFrom);
                }
                if(chip.valTo !== undefined) {
                    words.push("до");
                    words.push(chip.valTo);
                }
            }
            words.unshift(fieldStr);
        } else if(fieldMeta.type == 'yearseason') {
            if(chip.not)
                words.push('не');
            var seasonsMeta = this.meta.yearseason.season;
            if(chip.val !== undefined) {
                var valSeason = chip.val.season ? seasonsMeta[chip.val.season].name : null;
                if(valSeason === null)
                    fieldStr = "Год";
                if(valSeason)
                    words.push(valSeason);
                words.push(chip.val.year);
            } else {
                var valFromSeason = chip.valFrom !== undefined && chip.valFrom.season ? seasonsMeta[chip.valFrom.season].name : null;
                var valToSeason = chip.valTo !== undefined && chip.valTo.season ? seasonsMeta[chip.valTo.season].name : null;
                if(chip.valFrom !== undefined && chip.valFrom.season !== null || chip.valTo !== undefined && chip.valTo.season !== null)
                    fieldStr = "Сезоны";
                else
                    fieldStr = "Годы";
                if(chip.valFrom !== undefined) {
                    words.push("от");
                    if(valFromSeason)
                        words.push(valFromSeason);
                    words.push(chip.valFrom.year);
                }
                if(chip.valTo !== undefined) {
                    words.push("до");
                    if(valToSeason)
                        words.push(valToSeason);
                    words.push(chip.valTo.year);
                }
            }
            words.unshift(fieldStr);
        }
        return words;
    }


    /**
     *
     */
    CatalogChipsSearch.prototype._serializeChipVal = function(chip) {
        var v = '';
        var fieldMeta = this.meta[chip.field];
        if(chip.specialVal !== undefined) {
            v += chip.specialVal;
            if(chip.val !== undefined) {
                v += '_' + chip.val;
            }
        } else if(fieldMeta.type == 'yearseason') {
            if(chip.val !== undefined) {
                v += (chip.val.season ? chip.val.season+'_' : '');
                v += chip.val.year;
            } else if(chip.valFrom !== undefined || chip.valTo !== undefined) {
                if(chip.valFrom !== undefined) {
                    v += (chip.valFrom.season ? chip.valFrom.season+'_' : '');
                    v += chip.valFrom.year;
                }
                v += '-';
                if(chip.valTo !== undefined) {
                    v += (chip.valTo.season ? chip.valTo.season+'_' : '');
                    v += chip.valTo.year;
                }
            }
        } else if(fieldMeta.type == 'range') {
            if(chip.val !== undefined) {
                v += chip.val;
            } else if(chip.valFrom !== undefined || chip.valTo !== undefined) {
                if(chip.valFrom !== undefined)
                    v += chip.valFrom;
                v += '-';
                if(chip.valTo !== undefined)
                    v += chip.valTo;
            }
        } else if(fieldMeta.type == 'list') {
            if(chip.val !== undefined)
                v += chip.val;
        } else if(fieldMeta.type == 'bool') {
            if(chip.val !== undefined)
                v += (chip.val == 1 ? 1 : 0);
        }
        return v;
    }
    
    /**
     *
     */
    CatalogChipsSearch.prototype._serializeChips = function(chips) {
        var tmp = {};
        for(var i = 0 ; i < chips.length ; i++) {
            var chip = chips[i];
            var f = chip.field;
            var v = this._serializeChipVal(chip);
            var not = chip.not;
            var meta = this.meta[f];
            if(meta.forList) {
                f = meta.forList;
                v = meta.forListVal;
            }
            if(meta.type == 'bool' && v == 1 && not) {
                not = false;
                v = 0;
            }
            var p = not ? 0 : (chip.op == 'and' ? 2 : 1);
            if(tmp[f] === undefined)
                tmp[f] = [];
            if(tmp[f][p] === undefined)
                tmp[f][p] = [];
            if(v !== '')
                tmp[f][p].push(v);
        }
        var parts = [];
        var fs = Object.keys(tmp);
        for(var i = 0 ; i < fs.length ; i++) {
            var f = fs[i];
            for(var p = 0 ; p <= 2 ; p++) {
                if(tmp[f][p] !== undefined) {
                    var k = '' + f + (p == 0 ? '!=' : (p == 2 ? '@=' : '='));
                    var v = tmp[f][p].join(',');
                    parts.push(k + v);
                }
            }
        }
        
        var genreChipsCnt = 0;
        for(var i = 0 ; i < this.chips.length ; i++) {
            var chip = this.chips[i];
            if(chip.field == 'genre' && chip.not == false)
                genreChipsCnt++;
        }
        if(genreChipsCnt >= 2)
            parts.push('genre_op'+'='+this.genreOp);
        
        var str = parts.join(';');
        return str;
    };


    /**
     *
     */
    CatalogChipsSearch.prototype._unserializeChips = function(str) {
        var seasonsSlugs = CatalogChipsSearch.seasonsSlugs; //Object.keys(this.meta.yearseason.season);
        var __parseChipYearSeason = function(str) {
            var val = null;
            var sy = str.split('_');
            if(sy.length == 1) {
                if(!isNaN(parseInt(sy[0])) && sy[0].length == 4)
                    val = {season: null, year: sy[0]};
            } else if(sy.length == 2) {
                if(!isNaN(parseInt(sy[1])) && sy[1].length == 4 && seasonsSlugs.indexOf(sy[0]) != -1)
                    val = {season: sy[0], year: sy[1]};
            }
            return val;
        };
        var chips = [];
        var parts = str.split(';');
        for(var i = 0 ; i < parts.length ; i++) {
            var not = false;
            var op = 'or';
            var kv = parts[i].split('=');
            if(kv.length == 2 && kv[0].length && kv[1].length) {
                var f = kv[0];
                if(f[f.length - 1] == '!') {
                    not = true;
                    f = f.substr(0, f.length-1);
                } else if(f[f.length - 1] == '@') {
                    op = 'and';
                    f = f.substr(0, f.length-1);
                }
                if(f == 'genre_op') {
                    this.genreOp = kv[1];
                } else {
                    var fieldMeta = this.meta[f];
                    if(fieldMeta) {
                        var vs = kv[1].split(',');
                        for(var j = 0 ; j < vs.length ; j++) {
                            var chip = {field: f, not: not};
                            if(fieldMeta.type == 'list')
                                chip.op = op;
                            var v = vs[j];
                            if(v !== '') {
                                var sv = v.split('_');
                                if((sv.length == 2 || sv.length == 1) && fieldMeta.specials !== undefined && fieldMeta.specials[sv[0]] !== undefined) {
                                    chip.specialVal = sv[0];
                                    if(sv.length == 2) {
                                        chip.val = sv[1];
                                        if(f == 'yearseason' && chip.specialVal == 'decade') {
                                            if(!(!isNaN(parseInt(chip.val)) && chip.val.length == 4)) {
                                                delete chip.specialVal; delete chip.val;
                                            }
                                        }
                                    }
                                } else if(fieldMeta.type == 'yearseason') {
                                    var rv = v.split('-');
                                    if(rv.length == 1) {
                                        chip.val = __parseChipYearSeason(rv[0]);
                                        if(chip.val === null)
                                            delete chip.val;
                                    } else if(rv.length == 2) {
                                        chip.valFrom = __parseChipYearSeason(rv[0]);
                                        chip.valTo = __parseChipYearSeason(rv[1]);
                                        if(chip.valFrom === null) delete chip.valFrom;
                                        if(chip.valTo === null) delete chip.valTo;
                                    }
                                } else if(fieldMeta.type == 'range') {
                                    var rv = v.split('-');
                                    if(rv.length == 1) {
                                        if(!isNaN(parseInt(rv[0])))
                                            chip.val = rv[0];
                                    } else if(rv.length == 2) {
                                        if(rv[0] !== '' && !isNaN(parseInt(rv[0])))
                                            chip.valFrom = rv[0];
                                        if(rv[1] !== '' && !isNaN(parseInt(rv[1])))
                                            chip.valTo = rv[1];
                                    }
                                } else if(fieldMeta.type == 'list' || fieldMeta.type == 'bool') {
                                    if(fieldMeta.vals[v] !== undefined) {
                                        chip.val = v;
                                        var isYes = (fieldMeta.type == 'bool' ? (chip.val == 1) == (!chip.not) : !chip.not);
                                        //normalize bool
                                        if(fieldMeta.type == 'bool') {
                                            chip.val = 1;
                                            chip.not = !isYes;
                                        }
                                        //set isYes
                                        chip.isYes = isYes;
                                    } else if(fieldMeta.complexBoolFields && fieldMeta.complexBoolFields[v] !== undefined) {
                                        chip.field = fieldMeta.complexBoolFields[v];
                                        chip.val = 1;
                                        //set isYes
                                        chip.isYes = (!chip.not);
                                    }
                                }
                                if(chip.specialVal !== undefined || chip.val !== undefined || chip.valFrom !== undefined || chip.valTo !== undefined)
                                    chips.push(chip);
                            }
                        }
                    }
                }
            }
        }
        
        for(var i = 0 ; i < chips.length ; i++) {
            this._updChipName(chips[i]);
        }
        
        return chips;
    };

    /**
     *
     */
    CatalogChipsSearch.prototype._updChipName = function(chip) {
        var n = this._chipName(chip);
        chip.fieldName = n.fieldName;
        chip.name = n.name;
        var w = this._chipWords(chip);
        chip.words = w;
    }

    /**
     *
     */
    CatalogChipsSearch.prototype._suggesAsString = function(sugges) {
        var _sugges = [];
        for(var i = 0 ; i < sugges.length ; i++) {
            var sugg = sugges[i];
            var _sugg = '' + sugg.replace;
            if(sugg.m !== undefined) {
                var tmp = '';
                for(var j = 0 ; j < sugg.m.length ; j++)
                    tmp += (tmp !== '' ? '_' : '') + sugg.m[j].w + '-' + (sugg.m[j].pos !== undefined ? sugg.m[j].pos : '') + '-' + (sugg.m[j].pos2 !== undefined ? sugg.m[j].pos2 : '');
                _sugg += ' (' + tmp + ')';
            }
            _sugges.push(_sugg);
        }
        return _sugges.join('; ');
    }


    /**
     *
     */
    CatalogChipsSearch.prototype._tmpInfoAsString = function(tmpInfo) {
        return JSON.stringify(tmpInfo);
    }


    /**
     * Тесты
     */
    CatalogChipsSearch.prototype.tests = function(tests) {
        if(0) {
            console.log('meta:');
            console.log(this.meta);
            console.log('---');
            console.log('fieldSynonims:');
            for(var i = 0 ; i < this.fieldSynonims.length ; i++)
                console.log(this.fieldSynonims[i]);
            console.log('---');
            console.log('valuesSynonims:');
            for(var i = 0 ; i < this.valuesSynonims.length ; i++)
                console.log(this.valuesSynonims[i]);
            console.log('===');
        }
        
        if(!tests)
        tests = [
            {in: ""},
            {in: "осень лето 2015 "},
            {in: "осень 2015 - лето 2017"},
            {in: "осень 2015 - лето 2017 "},
            {in: "2010 - лето 2016 "},
            {in: "зима 2015-2016 "},
            {in: "Сезон от Осень 2015 до "},
            {in: "Сезон от Осень 2015 до Весна "},        
            {in: "от 2015 до 2016"},
            {in: "от 2015 до 2016 "},
            {in: "жанр "},
            {in: "года 2015 - 2016 hhh"},
            {in: "жанр ов"},
            {in: "тип ов"},
            {in: "завершен"},
            {in: "summer 2015"},
            {in: "summer 2015 "},
            {in: "онгоинг"},
            {in: "жанр не меха  не в эфире  Популярные  с рейтингом не ниже 6  весной 2015-го года или  2015 - 2016 года от весны 2015 до 2016  ggg"},
            {in: "лето"},
            {in: "жан жан"},
            {in: "сре жизн"},
            {in: "жанр on"},
            {in: "2015 "},
            {in: "2015 -"},
            {in: "2015 - "},
            {in: "2015 - 2016"},
            {in: "2015 - 2016 "},
            {in: "2015 - 2016 1999"},
            {in: "весна-лето 2015 - осень 2016 "},
        ];
        var oldDebug = this.settings.debug;
        this.settings.debug = 0;
        this.reset();
        for(var i = 0 ; i < tests.length ; i++) {
            this.setSearchStr(tests[i].in);
            var out = {};
            out.chips = this.chipsSer;
            out.unchippedStr = this.unchippedStr;
            out.sugges = this._suggesAsString(this.sugges);
            out.tmpInfo = this._tmpInfoAsString(this.tmpInfo);
            this.reset();
            tests[i].out = out;
            console.info("CatalogChipsSearch.tests()", "\n [in] ", '"'+tests[i].in+'"', "\n [out] chips: ", out.chips, "\n unchippedStr: ", '"'+out.unchippedStr+'"', "\n sugges: ", out.sugges, "\n tmpInfo: ", out.tmpInfo);
        }
        this.reset();
        this.settings.debug = oldDebug;
    }
    
    return CatalogChipsSearch;

}));
