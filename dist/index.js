module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete installedModules[moduleId];
/******/ 		}
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(210);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 210:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const core = __webpack_require__(964);
const fetch = __webpack_require__(292);
const {readFile, writeFile} = __webpack_require__(747);
const { promisify } = __webpack_require__(669);

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

async function main() {
  const rawBasePath = core.getInput("rawBasePath", { required: true });
  const baseSvgPath = core.getInput("baseSvgPath", { required: true });
  const token = core.getInput("token", { required: true });
  const clientId = core.getInput("clientId", { required: true });
  const cliSecret = core.getInput("cliSecret", { required: true });

  // access token expired quickly so I have to use refresh token to get access token first
  console.log("Getting access token..");
  const secret = `${clientId}:${cliSecret}`;
  const secretBase64 = Buffer.from(secret).toString("base64");
  const tokenRequest = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${secretBase64}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token,
    }),
  });
  const tokenRequestData = await tokenRequest.json();
  console.log("Access token received");

  // songs
  console.log("Fetch song data");
  const resSong = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=1",
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenRequestData.access_token}`,
      },
    }
  );

  const dataSong = await resSong.json().items[0];
  console.log("Song data fetched");


  console.log("Draw an img");
  let image = (await readFileAsync(baseSvgPath)).toString("utf8");

  image = image.replace("{imgUrl}", await loadImgBase64(dataSong.album.images[0].url));
  image = image.replace("{songName}", dataSong.name);
  image = image.replace(
    "{artistName}",
    dataSong.artists.map((v) => v.name).join(", ")
  );

  let fileName = `top-song-${Date.now()}.svg`
  writeFileAsync(fileName, image)

  console.log("Write readme");
  let readme = (await readFileAsync("README.md")).toString("utf8");
  const imgTag = `<img src="${rawBasePath.replace(/\/$/, '')}/${fileName}" height="400"/>`
  readme = readme.replace(
    /<!-- *spotify-listening-svg-start *-->[^]*<!-- *spotify-listening-svg-end *-->/gi,
    '<!-- spotify-listening-svg-start -->\n' + imgTag + '<!-- spotify-listening-svg-end -->\n'
  );
}

function loadImgBase64(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        var reader = new FileReader();
        reader.onload = function () {
            resolve(this.result);
        };
        reader.readAsDataURL(blob);
      });
  });
}

main().catch((err) => core.setFailed(err.message));


/***/ }),

/***/ 292:
/***/ (function(module) {

module.exports = eval("require")("node-fetch");


/***/ }),

/***/ 669:
/***/ (function(module) {

module.exports = require("util");

/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 964:
/***/ (function(module) {

module.exports = eval("require")("@actions/core");


/***/ })

/******/ });