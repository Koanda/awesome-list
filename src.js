/**
 * Collection of utilities
 */

var utils = (function() {

  var utils = {};

  /**
   * Converts a NodeList to an Array
   * @param  {NodeList}
   * @return {Array}
   */

  utils.arrayFromNodeList = function(nodeList) {
    var arr = [];

    for (var i = 0, l = nodeList.length; i < l; i++) {
      arr.push(nodeList[i]);
    }

    return arr;
  };

  /**
   * Loads a resource via GET-Request
   * @param  {String}
   * @param  {Function}
   */

  utils.fetch = function(url, callback) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', url);
    xhr.onload = function() {
      callback(xhr.status, JSON.parse(xhr.response));
    };
    xhr.send();
  };

  /**
   * Basically ES6 String manipulation
   * @param  {String}
   * @param  {Object}
   * @return {String}
   */

  utils.template = function(str, variables) {
    var value;

    for (key in variables) {
      value = variables[key];
      str = str.replace('${' + key + '}', value);
    }

    return str;
  }

  /**
   * Extracts keys from an object
   * @param  {Object}
   * @param  {Array}
   * @return {Object}
   */

  utils.pick = function(obj, keys) {
    var newObj = {};

    keys.forEach(function(key) {
      newObj[key] = obj[key];
    });

    return newObj;
  }

  /**
   * Expose `utils`
   */

  return utils;

})();

/**
 * Cache
 */

var Cache = (function() {

  /**
   * LocalStorage Object Cache
   * @param {String}
   * @param {Object}
   */

  function Cache(prefix, options) {
    options = options || {};

    this._prefix      = prefix;
    this._expireAfter = options.expireAfter || 0;
  }

  var cache = Cache.prototype;

  /**
   * @param {String}
   * @param {Object}
   */

  cache.set = function(key, obj) {
    obj.__timestamp = Date.now();

    return localStorage[this._prefix + key] = JSON.stringify(obj);
  }

  /**
   * @param  {String}
   * @return {Object}
   */

  cache.get = function(key) {
    return JSON.parse(localStorage[this._prefix + key]);
  }

  /**
   * @param  {String}
   * @return {Boolean}
   */

  cache.exists = function(key) {
    return this.expired(key) ? false : !!localStorage[this._prefix + key];
  }

  /**
   * @param  {String}
   * @return {Boolean}
   */
  cache.expired = function(key) {
    var obj = this.get(key);

    return this._expireAfter <= 0 ? false : !obj.__timestamp || (obj && Date.now() > obj.__timestamp + this._expireAfter * 1000);
  }

  /**
   * Expose `Cache`
   */

  return Cache;

})();

/**
 * Repository
 */

var Repository = (function() {

  var API_URL   = 'https://api.github.com/repos';
  var TEMPLATE  = document.getElementById('repository-tpl').innerHTML;
  var HIGHLIGHT = 'html, css, js, javascript, go, golang, framework, lightweight, library, utility'.split(', ');

  var Repository = function(element) {
    this._element    = element;
    this._repository = element.getAttribute('data-repo');

    this.load(this.render.bind(this));
  };

  Repository._cache = new Cache('awesome.repositories.', { expireAfter: 24 * 60 * 60 });

  Repository.fetch = function(repository, callback) {
    var self = this;

    if (this._cache.exists(repository)) {
      return callback(false, this._cache.get(repository));
    }

    utils.fetch([API_URL, repository].join('/'), function(status, data) {
      if (status == 200) {
        self._cache.set(repository, data);
        return callback(false, data);
      }

      callback(true);
    });
  };

  var repository = Repository.prototype;

  repository.load = function(callback) {
    var self = this;

    Repository.fetch(this._repository, function(error, data) {
      if (error) {
        self._data = {
          name: self._element.innerHTML,
          html_url: ['http://github.com', self._repository].join('/'),
          description: ''
        };
      } else {
        self._data = data;
      }
      callback();
    });
  };

  repository.highlight = function(text, words) {
    words.forEach(function(word) {
      text = text.replace(new RegExp('\\b' + word + '\\b', 'gi'), '<mark>' + word + '</mark>');
    });

    return text;
  };

  repository.render = function() {
    var repo         = utils.pick(this, ['name', 'url']);
    repo.description = this.highlight(this.description, HIGHLIGHT);
    this._element.innerHTML = utils.template(TEMPLATE, repo);
  };

  Object.defineProperties(repository, {
    name: {
      get: function() { return this._data['name']; },
      writeable: false,
      configurable: true
    },
    url: {
      get: function() { return this._data['html_url']; },
      writeable: false,
      configurable: true
    },
    description: {
      get: function() { return this._data['description']; },
      writeable: false,
      configurable: true
    },
  });

  /**
   * Expose `Repository`
   */

  return Repository;

})();

/**
 * Main
 */

(function() {

  var repoNodes = utils.arrayFromNodeList(document.querySelectorAll('[data-repo]'));

  repoNodes.forEach(function(repoEl) {
    new Repository(repoEl);
  });

})();
