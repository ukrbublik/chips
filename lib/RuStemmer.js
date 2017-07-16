/*
использование: 
RuStemmer.stemWord("Новинки") // == "новинк"
RuStemmer.stem("Новинки мехи") // == "новинк мех"
*/

(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['Snowball'], factory);
    } else {
        Stemmer = factory(Snowball);
    }
}(function(Snowball) {

    if(typeof Object.extend === 'undefined') {
        Object.extend = function(destination, source) {
            for (var property in source) {
                if (source.hasOwnProperty(property)) {
                    destination[property] = source[property];
                }
            }
            return destination;
        };
    }

    function Stemmer(lang) {
        this.lang = null;
        this.exceptions = {};
        this.snowball = null;
        
        this.ctor = function(_lang) {
            this.lang = _lang ? _lang : Stemmer.defaultLang;
            this.snowball = new Snowball(this.lang);
            return this;
        };
        return this.ctor(lang);
    };

    Stemmer.prototype.addExceptions = function(_exceptions) {
        this.exceptions = Object.extend(this.exceptions, _exceptions);
    };

    Stemmer.prototype.stemWord = function(word) {
        word = word.toLowerCase();
        for(var baseForm in this.exceptions) if(this.exceptions.hasOwnProperty(baseForm)) {
            var forms = this.exceptions[baseForm];
            if(!forms.length && word == baseForm || forms.indexOf(word) !== -1)
                return baseForm;
        }
        this.snowball.setCurrent(word);
        this.snowball.stem();
        return this.snowball.getCurrent();
    };

    Stemmer.defaultLang = 'Russian';
    Stemmer._instances = {};
    Stemmer.getInstance = function(lang) {
        var inst = Stemmer._instances[lang];
        if(inst === undefined)
            inst = new Stemmer(lang);
        return inst;
    };

    return Stemmer;
    
}));