const config = require("./config.json");
const db = require('better-sqlite3')(config.dbpath, {verbose: console.log});
process.on("exit", () => db.close());

if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'config';").get()) {
	db.exec(require("fs").readFileSync("./init.sql", "utf8"));
}

const ServerConfig = (function() {
	const cache = {};
	db.prepare("SELECT server, key, value FROM config;").all().forEach((row) => {
		if (cache[row.server] === undefined) cache[row.server] = {};
		cache[row.server][row.key] = row.value;
	});

	function get(server, key) {
		if (cache[server] === undefined) cache[server] = {};
		return cache[server][key];
	}
	function set(server, key, value) {
		if (cache[server] === undefined) cache[server] = {};
		if (db.prepare("SELECT 1 FROM config WHERE (server, key) = (?, ?);").get([server, key])) {
			db.prepare("UPDATE config SET value = ? WHERE (server, key) = (?, ?);").run([value, server, key]);
		} else {
			db.prepare("INSERT INTO config (server, key, value) VALUES (?, ?, ?);").run([server, key, value]);
		}
		cache[server][key] = value;
	}
	return {
		get,
		set
	}
})();

const Birthdays = (function() {
	function getUsersByBirthday(server, day, month) {
		return db.prepare("SELECT user FROM birthdays WHERE (server, day, month) = (?, ?);").all([server, day, month]).map(row => row.user);
	}
	function setUserBirthday(server, user, day, month, year) {
		if (db.prepare("SELECT 1 FROM birthdays WHERE (server, user) = (?, ?);").get([server, user])) {
			db.prepare("UPDATE birthdays SET day = ?, month = ?, year = ? WHERE (server, user) = (?, ?);").run([day, month, year, server, user]);
		} else {
			db.prepare("INSERT INTO birthdays (server, user, day, month, year) VALUES (?, ?, ?);").run([server, user, day, month, year]);
		}
	}
	function removeUserBirthday(server, user) {
		const info = db.prepare("DELETE FROM birthdays WHERE (server, user) = (?, ?);").run([server, user]);
		return info.changes;
	}
	function getBirthdays(server) {
		return db.prepare("SELECT user, day, month, year FROM birthdays WHERE server = ?;").all([server]);
	}
	return {
		getUsersByBirthday,
		setUserBirthday,
		getBirthdays
	}
})();


module.exports = {
	ServerConfig,
	Birthdays
}

