webpackHotUpdate("static/development/pages/index.js",{

/***/ "./pages/index/components/Loading.js":
/*!*******************************************!*\
  !*** ./pages/index/components/Loading.js ***!
  \*******************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(module) {/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
var _jsxFileName = "/Users/kepler/labs/sospedra.me/pages/index/components/Loading.js";

var styles = {
  loading: {
    alignItems: 'center',
    background: 'linear-gradient(to bottom, #430840 0%,#690b63 50%)',
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  hourglass: {
    width: 60,
    animation: 'rotate 4s ease-in-out 0s infinite'
  }
};

var Loading = function Loading() {
  return react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("aside", {
    style: styles.loading,
    __source: {
      fileName: _jsxFileName,
      lineNumber: 22
    },
    __self: this
  }, react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("style", {
    __source: {
      fileName: _jsxFileName,
      lineNumber: 23
    },
    __self: this
  }, "\n      @keyframes rotate {\n        0% { transform: rotate(0); }\n        20% { transform: rotate(180deg); }\n        50% { transform: rotate(180deg); }\n        70% { transform: rotate(360deg); }\n        100% { transform: rotate(360deg); }\n      }\n    "), react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement("img", {
    src: "static/hourglass.svg",
    alt: "retro-loader",
    style: styles.hourglass,
    __source: {
      fileName: _jsxFileName,
      lineNumber: 32
    },
    __self: this
  }));
};

/* harmony default export */ __webpack_exports__["default"] = (Loading);
    (function (Component, route) {
      if(!Component) return
      if (false) {}
      module.hot.accept()
      Component.__route = route

      if (module.hot.status() === 'idle') return

      var components = next.router.components
      for (var r in components) {
        if (!components.hasOwnProperty(r)) continue

        if (components[r].Component.__route === route) {
          next.router.update(r, Component)
        }
      }
    })(typeof __webpack_exports__ !== 'undefined' ? __webpack_exports__.default : (module.exports.default || module.exports), "/index/components/Loading")
  
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../node_modules/webpack/buildin/harmony-module.js */ "./node_modules/webpack/buildin/harmony-module.js")(module)))

/***/ })

})
//# sourceMappingURL=index.js.4ee0469bf767c77472f2.hot-update.js.map