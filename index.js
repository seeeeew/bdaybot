const Discord = require("discord.js");
const client = new Discord.Client();
const {GuildConfig, Birthdays} = require("./DataManager.js");
const Scheduler = require("./Scheduler.js");
const config = require("./config.json");
const packageinfo = require("./package.json");

function help(message) {
	const guild_id = message.guild.id;
	const prefix = GuildConfig.get(guild_id, "prefix") || `@${client.user.username}#${client.user.discriminator} `;
	const commands = [
		["User Commands", [
			["bday set <MM-DD>", "set your birthday (without year)"],
			["bday set <YYYY-MM-DD>", "set your birthday (with year)"],
			["bday remove", "remove your birthday"],
			["bday list", "list all birthdays"],
			["help", "print help and general info"]
		]],
		["Admin Commands", [
			["config show", "shows current configuration with descriptions"],
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
		description: `A successfull command always gives a response.\nIn case of emergency poke <@!466033810929221632>.\nSource available on [GitHub](${packageinfo.homepage}).`,
		fields,
		footer: {
			text: `${packageinfo.name} v${packageinfo.version}`,
			icon_url: avatarURL
		}
	};
	message.channel.send({embed});
}
function bdayCmd(message, input) {
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
	}
}
function bdaySet(message, input) {
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
		message.channel.send(`:x: Your birthday was removed.`);
		checkBdayRole(message.guild.id);
	}
}
function bdayList(message) {
	const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	const guild_id = message.guild.id;
	const currentyear = new Date().getFullYear();
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
function configCmd(message, input) {
	const guild_id = message.guild.id;
	const admin_role = GuildConfig.get(guild_id, "admin_role");
	if (!message.member.roles.cache.has(admin_role)) return;
	const [, command, args] = input.match(/^([^\s]+)(?:\s+(.*))?/);
	switch (command) {
		case "set":
			configSet(message, args);
			break;
		case "reset":
			configReset(message, args);
			break;
		case "show":
			configShow(message);
			break;
	}
}
function configSet(message, input) {
	// TODO implement configSet
}
function configReset(message, input) {
	// TODO implement configReset
}
function configShow(message) {
	const guild_id = message.guild.id;
	const descriptions = {
		prefix: "command prefix this bot should react to",
		admin_role: "role required to use admin commands",
		command_channel: "channel in which the bot will react to commands",
		alert_channel: "channel in which the bot will post birthday alerts",
		alert_message: "template for the birthday alert message (`{user}` will be replaced with the user link)",
		alert_time: "time at which the bot posts the birthday alert (format: HH:MM)",
		timezone: "time zone to be used for this server",
		bday_role: "role that will be given to the birthday person for the duration of their birthday"
	};
	const keys = Object.keys(descriptions);
	const values = Object.fromEntries(Object.keys(descriptions).map(key => [key, GuildConfig.get(guild_id, key)]));
	const fieldvalues = {
		prefix: values.prefix ? "`" + values.prefix + "`" : "*(not set)*",
		admin_role: values.admin_role ? `<@&${values.admin_role}>` : "*(not set)*",
		command_channel: values.command_channel ? `<#${values.command_channel}>` : "*(not set)*",
		alert_channel: values.alert_channel ? `<#${values.alert_channel}>` : "*(not set)*",
		alert_message: values.alert_message ? "`" + values.alert_message + "`" : "*(not set)*",
		alert_time: values.alert_time ? "`" + values.alert_time + "`" : "*(not set)*",
		timezone: values.timezone ? "`" + values.timezone + "`" : "*(not set)*",
		bday_role: values.bday_role ? `<@&${values.bday_role}>` : "*(not set)*"
	};
	const fields = keys.map(key => {return {name: key, value: `${fieldvalues[key]}\n${descriptions[key]}`}});
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
		const channel = GuildConfig.get(guild_id, "command_channel");
		if (!channel || channel != message.channel.id) return;
		const guildprefix = GuildConfig.get(guild_id, "prefix");
		const defaultprefix = `<@!${client.user.id}> `;
		if (message.content.startsWith(guildprefix)) {
			parseCommand(message, message.content.slice(guildprefix.length));
		} else if (message.content.startsWith(defaultprefix)) {
			parseCommand(message, message.content.slice(defaultprefix.length));
		}
	} catch(e) {
		console.log(e);
	}
}
function bdayAlert(guild_id, user_id) {
	const channel_id = GuildConfig.get(guild_id, "alert_channel");
	if (!channel_id) return;
	const guild = client.guilds.cache.find(guild => guild.id == guild_id);
	if (!guild) return;
	const channel = guild.channels.cache.find(channel => channel.id == channel_id);
	if (!channel) return;
	const template = GuildConfig.get(guild_id, "alert_message") || "Happy birthday, {user}! :partying_face:";
	const message = template.replace("{user}", `<@!${user_id}>`);
	channel.send(message);
}
function checkBdayAlert(guild_id, time) {
	const alert_channel = GuildConfig.get(guild_id, "alert_channel");
	const alert_message = GuildConfig.get(guild_id, "alert_message");
	if (!alert_channel || !alert_message) return;
	Birthdays.getUsersByBirthday(guild_id, time.getDate(), time.getMonth() + 1).forEach((user_id) => bdayAlert(guild_id, user_id));
}
function checkBdayRole(guild_id, time) {
	if (!time) time = new Date(new Date().toLocaleString("en-US", {timeZone: GuildConfig.get(guild_id, "timezone")}));
	const day = time.getDate();
	const month = time.getMonth() + 1;
	const role_id = GuildConfig.get(guild_id, "bday_role");
	if (!role_id) return;
	const guild = client.guilds.cache.get(guild_id);
	const bdayusers = Birthdays.getUsersByBirthday(guild_id, day, month);
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
	Object.values(Scheduler.schedulers).forEach(guild_id => {
		if (!client.guilds.cache.has(guild_id)) {
			Scheduler(guild_id).destroy();
		}
	});
	[...client.guilds.cache.keys()].forEach(guild_id => {
		if (!Scheduler.schedulers.hasOwnProperty(guild_id)) {
			const time = GuildConfig.get(guild_id, "alert_time");
			const timezone = GuildConfig.get(guild_id, "timezone");
			Scheduler(guild_id).init(time, timezone, checkBdayAlert, checkBdayRole);
		}
	});
}
function init() {
	client.once("ready", () => {
		updateSchedulers();
		[...client.guilds.cache.keys()].forEach(guild_id => checkBdayRole(guild_id));
		client.on("message", messageHandler);
		console.log("Ready!");
	});
	client.login(config.token);
	process.on("exit", () => client.destroy());
}
init();

