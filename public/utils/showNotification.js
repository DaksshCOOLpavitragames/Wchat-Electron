const { Notification } = require("electron");
const { app } = require("electron");
app.setAppUserModelId('Chat App')
exports.showNotification = (title, body) => {
	const notification = new Notification({
		title : title,
		body: body,
		icon: "public/favicon.ico",
		sound: true,	
		silent: false,
		timeoutType: "default",
	});
	notification.show();

	return notification;
};
