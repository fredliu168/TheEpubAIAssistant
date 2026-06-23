(function () {
  var cryptoObj = window.crypto || window.msCrypto;

  if (!cryptoObj) {
    cryptoObj = {};
    try {
      Object.defineProperty(window, 'crypto', {
        value: cryptoObj,
        writable: true,
        configurable: true
      });
    } catch (error) {
      window.crypto = cryptoObj;
    }
  }

  if (!cryptoObj.randomUUID) {
    var randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
        var random = Math.random() * 16 | 0;
        var value = char === 'x' ? random : (random & 0x3 | 0x8);
        return value.toString(16);
      });
    };

    try {
      cryptoObj.randomUUID = randomUUID;
    } catch (error) {
      try {
        Object.defineProperty(cryptoObj, 'randomUUID', {
          value: randomUUID,
          writable: true,
          configurable: true
        });
      } catch (defineError) {
        console.error('Failed to polyfill crypto.randomUUID', defineError);
      }
    }
  }
})();
