const { join } = require("path");
const isDev = require("electron-is-dev");

let config = {
	appName: "Chat App",
	icon: join(__dirname, "..", "/favicon.ico"),
	tray: null,
	isQuiting: false,
	mainWindow: null,
	popupWindow: null,
	isDev,
};

module.exports = config;
