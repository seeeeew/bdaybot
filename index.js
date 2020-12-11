const Discord = require("discord.js");
const client = new Discord.Client();
const {ServerConfig, Birthdays} = require("./DataManager.js");
//const Scheduler = require("./Scheduler.js");
const config = require("./config.json");
const bdaybot = require("./package.json");

function help(message) {
	const server = message.guild.id;
	const prefix = ServerConfig.get(server, "prefix") || `@${client.user.username}#${client.user.discriminator} `;
	const commands = [
		["User Commands", [
			["bday set <MM-DD>", "set your birthday (without year)"],
			["bday set <YYYY-MM-DD>", "set your birthday (with year)"],
			["bday remove", "remove your birthday"],
			["bday list", "list all birthdays"],
			["help", "print this message"]
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
		thumbnail: {
			url: avatarURL
		},
		description: `Source available on [GitHub](${bdaybot.homepage})`,
		author: {
			name: `${nickname} Command Help`,
			icon_url: avatarURL
		},
		fields,
		footer: {
			text: `${bdaybot.name} v${bdaybot.version}`
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
	// TODO check if birthday is today, add role if necessary
}
function bdayRemove(message) {
	const changes = Birthdays.removeUserBirthday(message.guild.id, message.author.id);
	if (changes) {
		// TODO remove birthday role if necessary
		message.channel.send(`:x: Your birthday was removed.`);
	}
}
function bdayList(message) {
	// TODO implement bdayList
}
function configCmd(message, input) {
	// TODO check for admin_role
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
	const server = message.guild.id;
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
	const values = Object.fromEntries(Object.keys(descriptions).map(key => [key, ServerConfig.get(server, key)]));
	const fieldvalues = {
		prefix: values.prefix ? "`" + values.prefix + "`" : "*(not set)*",
		admin_role: values.admin_role ? `<@&${values.admin_role}>` : "*(not set)*",
		command_channel: values.command_channel ? `<#${values.command_channel}>` : "*(not set)*",
		alert_channel: values.alert_channel ? `<#${values.alert_channel}>` : "*(not set)*",
		alert_message: values.alert_message ? "`" + values.alert_message + "`" : "*(not set)*",
		alert_time: values.alert_time ? values.alert_time : "*(not set)*",
		timezone: values.timezone ? values.timezone : "*(not set)*",
		bday_role: values.bday_role ? `<@&${values.bday_role}>` : "*(not set)*"
	};
	const fields = keys.map(key => {return {name: key, value: `${fieldvalues[key]}\n${descriptions[key]}`}});
	const avatarURL = client.user.avatarURL();
	const nickname = message.guild.member(client.user).displayName;
	const embed = {
		thumbnail: {
			url: avatarURL
		},
		description: `Current configuration on **${message.guild.name}**`,
		author: {
			name: `${nickname} Configuration`,
			icon_url: avatarURL
		},
		fields,
		footer: {
			text: `${bdaybot.name} v${bdaybot.version}`
		}
	};
	message.channel.send({embed});
}
function bdayAlert(server_id, user_id) {
	const channel_id = ServerConfig.get(server_id, "alert_channel");
	if (!channel_id) return;
	const server = client.guilds.cache.find(server => server.id == server_id);
	if (!server) return;
	const channel = server.channels.cache.find(channel => channel.id == channel_id);
	if (!channel) return;
	const template = ServerConfig.get(server_id, "alert_message") || "Happy birthday, {user}! :partying_face:";
	const message = template.replace("{user}", `<@!${user_id}>`);
	channel.send(message);
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
		const server = message.guild.id;
		if (!config.servers.includes(server)) return;
		const channel = ServerConfig.get(server, "command_channel");
		if (!channel || channel != message.channel.id) return;
		const serverprefix = ServerConfig.get(server, "prefix");
		const defaultprefix = `<@!${client.user.id}> `;
		if (message.content.startsWith(serverprefix)) {
			parseCommand(message, message.content.slice(serverprefix.length));
		} else if (message.content.startsWith(defaultprefix)) {
			parseCommand(message, message.content.slice(defaultprefix.length));
		}
	} catch(e) {
		console.log(e);
	}
}
function init() {
	client.once("ready", () => {
		console.log("Ready!");
	});
	client.on("message", messageHandler);
	client.login(config.token);
	process.on("exit", () => client.destroy());
	// TODO implement scheduler
}
init();

