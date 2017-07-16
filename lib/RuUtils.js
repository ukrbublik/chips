
(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['./RuStemmer'], factory);
    } else {
        RuUtils = factory(Stemmer);
    }
}(function(Stemmer) {

    function RuUtils() {
        return this;
    };

    RuUtils.stemmers = {};
    RuUtils.stemmers['ru'] = Stemmer.getInstance('Russian');
    RuUtils.stemmers['en'] = Stemmer.getInstance('English');
    RuUtils.stemmers['ru'].addExceptions({
        'яо': ['яой', 'яоя', 'яоя', 'яою', 'яоем', 'яое',  'яои', 'яоев', 'яоям', 'яои', 'яоями', 'яоях'],
        'юри': [],
        'фэнтези': [],
        'фентези': [],
        'гарем': [],
    });

    RuUtils.detectLang = function(word) {
        var lang = null;
        if(word.match(/[а-я]+/ig) !== null)
            lang = 'ru';
        else if(word.match(/[a-z]+/ig) !== null)
            lang = 'en';
        return lang;
    };

    //80-е, 80-х, ..
    RuUtils.decadesSuffixes = ['е', 'х', 'м', 'ми'];

    RuUtils.stemWord = function(word) {
        word = word.toLowerCase();
        var lang = RuUtils.detectLang(word);
        var stemmer = lang !== null && RuUtils.stemmers[lang] !== undefined ? RuUtils.stemmers[lang] : null;
        if(stemmer) {
            word = stemmer.stemWord(word);
            // repl (фентези, фэнтези) ...
        }
        return word;
    };

    RuUtils.split = function(s, sep) {
        return s.split(sep).filter(function(e) { return e !== '' });
    };

    RuUtils.normalizeSpaces = function(str) {
        var a = str.trim().match(/\S+/g);
        return a && a.length ? a.join(' ') : '';
    };

    RuUtils.stemString = function(str) {
        str = RuUtils.normalizeSpaces(str).toLowerCase();
        var words = RuUtils.split(str, ' ');
        var stemWords = [];
        for(var i = 0 ; i < words.length ; i++) {
            var stemWord = RuUtils.stemWord(words[i]);
            stemWords.push(stemWord);
        }
        var stemStr = stemWords.join(' ');
        return stemStr;
    };
    RuUtils.stem = RuUtils.stemString;
    
    return RuUtils;
    
}));
