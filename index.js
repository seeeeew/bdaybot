const Discord = require("discord.js");
const client = new Discord.Client();
const {GuildConfig, Birthdays} = require("./DataManager.js");
const Scheduler = require("./Scheduler.js");
const config = require("./config.json");
const packageinfo = require("./package.json");

function help(message) {
	const guild_id = message.guild.id;
	const prefix = GuildConfig.get(guild_id, "prefix") || `@${client.user.tag} `;
	const commands = [
		["User Commands", [
			["bday set <MM-DD>", "set your birthday (without year)"],
			["bday set <YYYY-MM-DD>", "set your birthday (with year)"],
			["bday remove", "remove your birthday"],
			["bday list", "list all birthdays"],
			["bday next", `show the next ${config.nextbdays || 3} upcoming birthdays`],
			["help", "print help and general info"]
		]],
		["Admin Commands", [
			["config show", "shows current configuration"],
			["config help", "shows current configuration with descriptions"],
			["config set <key> <value>", "set `<key>` to `<value>`"],
			["config reset <key>", "reset `<key>` to the default value"]
		]]
	];
	const fields = commands.map(([category, entries]) => {return {
		name: `__${category}:__`,
		value: entries.map(([command, description]) => `\`${prefix}${command}\` – ${description}`).join("\n")
	}});
	const avatarURL = client.user.avatarURL();
	const nickname = message.guild.member(client.user).displayName;
	const embed = {
		title: `${nickname} Command Help`,
		thumbnail: {
			url: avatarURL
		},
		description: config.helpmessage || `Successful commands always give a response.\nSource code available on [GitHub](${packageinfo.homepage}).`,
		fields,
		footer: {
			text: `${packageinfo.name} v${packageinfo.version}`,
			icon_url: avatarURL
		}
	};
	message.channel.send({embed});
}
function bdayCmd(message, input) {
	if (!input || !input.length) return;
	const [, command, args] = input.match(/^([^\s]+)(?:\s+(.*))?/);
	switch (command) {
		case "set":
			bdaySet(message, args);
			break;
		case "remove":
			bdayRemove(message);
			break;
		case "list":
			bdayList(message);
			break;
		case "next":
			bdayNext(message);
			break;
	}
}
function bdaySet(message, input) {
	if (!input || !input.length) return;
	const match = input.match(/^(?:(\d{4})-)?(\d{2})-(\d{2})$/);
	if (!match) return;
	const [, year, month, day] = match;
	const checkstring = `${year || "2000"}-${month}-${day}`;
	try {
		if (new Date(checkstring).toISOString().split("T")[0] !== checkstring) return;
	} catch(e) {
		return;
	}
	Birthdays.setUserBirthday(message.guild.id, message.author.id, day, month, year);
	const datestring = Intl.DateTimeFormat("en-GB", {day: "numeric", month: "long", year: year ? "numeric" : undefined}).format(new Date(checkstring));
	message.channel.send(`:white_check_mark: Your birthday was set to **${datestring}**.`);
	checkBdayRole(message.guild.id);
}
function bdayRemove(message) {
	const changes = Birthdays.removeUserBirthday(message.guild.id, message.author.id);
	if (changes) {
		message.channel.send(`:white_check_mark: Your birthday was removed.`);
		checkBdayRole(message.guild.id);
	}
}
function bdayList(message) {
	const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	const guild_id = message.guild.id;
	const currentyear = new Date(new Date().toLocaleString("en-US", {timeZone: GuildConfig.get(guild_id, "timezone")})).getFullYear();
	const rows = Birthdays.getBirthdays(guild_id);
	message.guild.members.fetch({user: rows.map(row => row.user_id)}).then(() => {
		const birthdays = rows.map(row => {
			const member = message.guild.member(row.user_id);
			if (member) {
				row.name = member.displayName;
			} else {
				Birthdays.removeUserBirthday(guild_id, row.user_id);
			}
			if (row.year) row.age = currentyear - row.year;
			return row;
		}).filter(row => !!row.name).sort((a, b) => {
			return a.month != b.month ? a.month - b.month : (a.day != b.day ? a.day - b.day : a.name.localeCompare(b.name));
		}).reduce((acc, cv) => {
			(acc[cv.month - 1] = acc[cv.month - 1] || []).push(cv);
			return acc;
		}, []).map(list => list.reduce((acc, cv) => {
			(acc[cv.day] = acc[cv.day] || []).push(cv);
			return acc;
		}, []));
		const fields = months.map((name, i) => {
			let value = "(none)";
			if (birthdays[i] && birthdays[i].length) {
				value = birthdays[i].map((day, i) => i + ": " + day.map(row => `<@!${row.user_id}>` + (row.age ? ` (${row.age})` : "")).join(", ")).filter(entry => !!entry).join("\n");
			}
			return {
				name,
				value,
				inline: true
			}
		});
		const avatarURL = client.user.avatarURL();
		const embed = {
			title: "Birthday List",
			description: `Birthdays for **${message.guild.name}** in **${currentyear}**:`,
			fields,
			footer: {
				text: `${packageinfo.name} v${packageinfo.version}`,
				icon_url: avatarURL
			}
		};
		message.channel.send({embed});
	});
}
function bdayNext(message) {
	const num = config.nextbdays || 3;
	const guild_id = message.guild.id;
	const currentdate = new Date(new Date().toLocaleString("en-US", {timeZone: GuildConfig.get(guild_id, "timezone")}));
	const [alert_hour, alert_minute] = (GuildConfig.get(guild_id, "alert_time") || "00:00").split(":").map(num => num * 1);
	const currenthour = currentdate.getHours();
	const currentminute = currentdate.getMinutes();
	const currentyear = currentdate.getFullYear();
	const currentmonth = currentdate.getMonth() + 1;
	const currentday = currentdate.getDate() + (currenthour > alert_hour || (currenthour == alert_hour && currentminute > alert_minute));
	const rows = Birthdays.getBirthdays(guild_id);
	message.guild.members.fetch({user: rows.map(row => row.user_id)}).then(() => {
		let birthdays = rows.map(row => {
			const member = message.guild.member(row.user_id);
			if (member) {
				row.name = member.displayName;
			} else {
				Birthdays.removeUserBirthday(guild_id, row.user_id);
			}
			if (row.year) row.age = currentyear - row.year;
			return row;
		}).filter(row => !!row.name).sort((a, b) => {
			return a.month != b.month ? a.month - b.month : (a.day != b.day ? a.day - b.day : a.name.localeCompare(b.name));
		});
		birthdays = [
			...birthdays.filter(row => row.month > currentmonth || (row.month == currentmonth && row.day >= currentday)),
			...birthdays.filter(row => row.month < currentmonth || (row.month == currentmonth && row.day < currentday)).map(row => {row = {...row}; row.age++; return row;})
		];
		if (birthdays.length > num) {
			birthdays = birthdays.filter((row, index) => index < num ? true : (row.day == birthdays[num - 1].day && row.month == birthdays[num - 1].month));
		}
		const description = !birthdays.length ? "(no birthdays)" : birthdays.map(row => {
			const datestring = Intl.DateTimeFormat("en-GB", {day: "numeric", month: "long"}).format(new Date(`2000-${row.month}-${row.day}`));
			return `<@!${row.user_id}>` + (row.age ? ` (${row.age})` : "") + ` – **${datestring}**`;
		}).join("\n");
		const avatarURL = client.user.avatarURL();
		const embed = {
			title: "Upcoming Birthdays",
			thumbnail: {
				url: avatarURL
			},
			description,
			footer: {
				text: `${packageinfo.name} v${packageinfo.version}`,
				icon_url: avatarURL
			}
		};
		message.channel.send({embed});
	});
}
function configCmd(message, input) {
	if (!input || !input.length) return;
	const guild_id = message.guild.id;
	const admin_roles = GuildConfig.get(guild_id, "admin_roles").split(",");
	if (!message.member.roles.cache.filter(role => admin_roles.includes(role.id)).size && message.guild.owner.user.id !== message.author.id) return;
	const [, command, args] = input.match(/^([^\s]+)(?:\s+(.*))?/);
	switch (command) {
		case "set":
			configSet(message, args);
			break;
		case "reset":
			configReset(message, args);
			break;
		case "show":
			configShow(message, false);
			break;
		case "help":
			configShow(message, true);
			break;
	}
}
function configSet(message, input) {
	if (!input || !input.length) return;
	const guild_id = message.guild.id;
	let [, key, value] = input.match(/^([^\s]+)(?:\s+(.*))?/);
	switch (key) {
		case "admin_roles":
			value = value.split(" ").map(value => value.replace(/^<@&(\d+)>$/, "$1")).join(",");
			// TODO check if roles exist
			break;
		case "bday_role":
			value = value.replace(/^<@&(\d+)>$/, "$1");
			// TODO check if role exists
			break;
		case "command_channels":
			value = value.split(" ").map(value => value.replace(/^<#(\d+)>$/, "$1")).join(",");
			// TODO check if channels exist
			break;
		case "alert_channel":
			value = value.replace(/^<#(\d+)>$/, "$1");
			// TODO check if channel exists
			break;
		case "alert_time":
			const [match, hour, minute] = value.match(/^(\d{1,2}):(\d{2})$/);
			if (!match || hour > 23 || minute > 59) return;
			break;
		case "timezone":
			if (!value.match(/^[a-z_]+\/[a-z_]+$/i)) return;
			// TODO check if time zone exists
			break;
		case "alert_embed":
			if (!value.match(/^(?:true|false)$/)) return;
			break;
		case "prefix":
		case "alert_message":
		case "alert_message_age":
		case "alert_embed":
			break;
		default:
			return;
	}
	const changes = GuildConfig.set(guild_id, key, value);
	if (changes) {
		switch (key) {
			case "alert_time":
				Scheduler.schedulers[guild_id].setTime(value);
				break;
			case "timezone":
				Scheduler.schedulers[guild_id].setTimezone(value);
				checkBdayRole(message.guild.id);
				break;
			case "bday_role":
				checkBdayRole(message.guild.id);
				break;
		}
		message.channel.send(`:white_check_mark: \`${key}\` has been set.`);
	}
}
function configReset(message, key) {
	const guild_id = message.guild.id;
	const changes = GuildConfig.set(guild_id, key, undefined);
	if (changes) {
		switch (key) {
			case "alert_time":
				Scheduler.schedulers[guild_id].setTime(undefined);
				break;
			case "timezone":
				Scheduler.schedulers[guild_id].setTimezone(undefined);
				checkBdayRole(message.guild.id);
				break;
		}
		message.channel.send(`:white_check_mark: \`${key}\` has been reset.`);
	}
}
function configShow(message, full = true) {
	const guild_id = message.guild.id;
	const descriptions = {
		prefix: "command prefix this bot should react to (e. g. `!` or `bb!`)\n`@" + client.user.tag + " ` always works, even if this is unset",
		admin_roles: "roles allowed to use admin commands (links or ids)\nserver owner is always allowed, even if this is unset",
		command_channels: "channels in which the bot will react to commands (links or ids)\nleave unset to allow all channels",
		alert_channel: "channel in which the bot will post birthday alerts (link the channel)\nleave unset to disable this feature",
		alert_message: "template for the birthday alert message (`{user}` will be replaced with the user link)\nuses default message if unset",
		alert_message_age: "template for the birthday alert message if the user's age is available (`{user}`, `{age}` and `{ageth}` will be replaced)\nuses default message without age if unset",
		alert_embed: "post the birthday alert as an embed to prevent pinging the birthday person (true/false, default: false)",
		alert_time: "time at which the bot posts the birthday alert (format: HH:MM)\ndefaults to midnight if unset",
		timezone: "time zone to be used for this server (full name from the [IANA tz database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones), e. g. `Europe/Berlin`)\ndefaults to bot server time zone if unset",
		bday_role: "role that will be given to the birthday person for the duration of their birthday (link the role)\nleave unset to disable this feature"
	};
	const keys = Object.keys(descriptions);
	const values = Object.fromEntries(Object.keys(descriptions).map(key => [key, GuildConfig.get(guild_id, key)]));
	const fieldvalues = {
		prefix: values.prefix ? "`" + values.prefix + "`" : "*(not set)*",
		admin_roles: values.admin_roles ? values.admin_roles.split(",").map(role_id => `<@&${role_id}>`).join(" ") : "*(not set)*",
		command_channels: values.command_channels ? values.command_channels.split(",").map(channel_id => `<#${channel_id}>`).join(" ") : "*(not set)*",
		alert_channel: values.alert_channel ? `<#${values.alert_channel}>` : "*(not set)*",
		alert_message: values.alert_message ? "`" + values.alert_message + "`" : "*(not set)*",
		alert_message_age: values.alert_message_age ? "`" + values.alert_message_age + "`" : "*(not set)*",
		alert_embed: values.alert_embed ? "`" + values.alert_embed + "`" : "*(not set)*",
		alert_time: values.alert_time ? "`" + values.alert_time + "`" : "*(not set)*",
		timezone: values.timezone ? "`" + values.timezone + "`" : "*(not set)*",
		bday_role: values.bday_role ? `<@&${values.bday_role}>` : "*(not set)*"
	};
	const fields = keys.map(key => {return {name: key, value: fieldvalues[key] + (full ? "\n" + descriptions[key] : "")}});
	const avatarURL = client.user.avatarURL();
	const nickname = message.guild.member(client.user).displayName;
	const embed = {
		title: `${nickname} Configuration`,
		thumbnail: {
			url: avatarURL
		},
		description: `Current configuration for **${message.guild.name}**:`,
		fields,
		footer: {
			text: `${packageinfo.name} v${packageinfo.version}`,
			icon_url: avatarURL
		}
	};
	message.channel.send({embed});
}
function parseCommand(message, input) {
	const [, command, args] = input.match(/^([^\s]+)(?:\s+(.*))?/);
	switch (command) {
		case "help":
			help(message);
			break;
		case "bday":
			bdayCmd(message, args);
			break;
		case "config":
			configCmd(message, args);
			break;
	}
}
function messageHandler(message) {
	try {
		if (message.author.bot) return;
		if (!message.guild) return;
		const guild_id = message.guild.id;
		if (!config.guilds.includes(guild_id)) return;
		const channels = GuildConfig.get(guild_id, "command_channels").split(",");
		if (!channels || !channels.includes(message.channel.id)) return;
		const guildprefix = GuildConfig.get(guild_id, "prefix");
		const defaultprefix = `<@${client.user.id}> `;
		if (message.content.startsWith(guildprefix)) {
			parseCommand(message, message.content.slice(guildprefix.length));
		} else if (message.content.startsWith(defaultprefix)) {
			parseCommand(message, message.content.slice(defaultprefix.length));
		}
	} catch(e) {
		console.error(message.content, e);
	}
}
function bdayAlert(guild_id, user_id, year) {
	const currentyear = new Date(new Date().toLocaleString("en-US", {timeZone: GuildConfig.get(guild_id, "timezone")})).getFullYear();
	const channel_id = GuildConfig.get(guild_id, "alert_channel");
	if (!channel_id) return;
	const guild = client.guilds.cache.find(guild => guild.id == guild_id);
	if (!guild) return;
	const channel = guild.channels.cache.find(channel => channel.id == channel_id);
	if (!channel) return;
	const tpl_noage = GuildConfig.get(guild_id, "alert_message") || "Happy birthday, {user}! :partying_face:";
	const tpl_age = GuildConfig.get(guild_id, "alert_message_age") || tpl_noage;
	let message;
	if (year) {
		const age = currentyear - year;
		const ageth = age + (["st", "nd", "rd"][((age + 90) % 100 - 10) % 10 - 1] || "th");
		message = tpl_age.replace("{user}", `<@!${user_id}>`).replace("{age}", age).replace("{ageth}", ageth);
	} else {
		message = tpl_noage.replace("{user}", `<@!${user_id}>`);
	}
	if (GuildConfig.get(guild_id, "alert_embed") === "true") {
		channel.send({embed: {description: message}});
	} else {
		channel.send(message);
	}
}
function checkBdayAlert(guild_id, time) {
	if (!time) time = new Date(new Date().toLocaleString("en-US", {timeZone: GuildConfig.get(guild_id, "timezone")}));
	const alert_channel = GuildConfig.get(guild_id, "alert_channel");
	if (!alert_channel) return;
	Birthdays.getUsersByBirthday(guild_id, time.getDate(), time.getMonth() + 1).forEach(row => bdayAlert(guild_id, row.user_id, row.year));
}
function checkBdayRole(guild_id, time) {
	if (!time) time = new Date(new Date().toLocaleString("en-US", {timeZone: GuildConfig.get(guild_id, "timezone")}));
	const day = time.getDate();
	const month = time.getMonth() + 1;
	const role_id = GuildConfig.get(guild_id, "bday_role");
	if (!role_id) return;
	const guild = client.guilds.cache.get(guild_id);
	if (!guild.roles.cache.has(role_id)) return;
	const bdayusers = Birthdays.getUsersByBirthday(guild_id, day, month).map(row => row.user_id);
	guild.members.fetch().then((members) => {
		members.forEach((member, id) => {
			if (member.roles.cache.has(role_id) && !bdayusers.includes(member.user.id)) {
				member.roles.remove(role_id, "Today is not their birthday.");
			} else if (bdayusers.includes(member.user.id) && !member.roles.cache.has(role_id)) {
				member.roles.add(role_id, "Today is their birthday.");
			}
		});
	});
}
function updateSchedulers() {
	Object.keys(Scheduler.schedulers).forEach(guild_id => {
		if (!client.guilds.cache.has(guild_id)) {
			Scheduler(guild_id).destroy();
		}
	});
	[...client.guilds.cache.keys()].forEach(guild_id => {
		if (!Scheduler.schedulers.hasOwnProperty(guild_id) && (!config.guilds || config.guilds.includes(guild_id))) {
			const time = GuildConfig.get(guild_id, "alert_time");
			const timezone = GuildConfig.get(guild_id, "timezone");
			Scheduler(guild_id).init(time, timezone, checkBdayAlert, checkBdayRole);
		}
	});
}
function init() {
	client.once("ready", () => {
		updateSchedulers();
		[...client.guilds.cache.values()].forEach(guild => {
			if (config.guilds && !config.guilds.includes(guild.id)) {
				guild.leave();
			}
		});
		[...client.guilds.cache.keys()].forEach(guild_id => checkBdayRole(guild_id));
		client.on("guildCreate", guild => {
			if (config.guilds && !config.guilds.includes(guild.id)) {
				guild.leave();
			}
			updateSchedulers();
		});
		client.on("guildDelete", updateSchedulers);
		client.on("message", messageHandler);
		console.log("Ready!");
	});
	client.login(config.token);
	process.on("exit", () => client.destroy());
}
init();

