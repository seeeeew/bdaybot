# bdaybot
**bdaybot** is a birthday bot written for the discord server of the Guild Wars 2 guild The Arctic [Arc]. Running it for different use cases is not officially supported. Running it on different servers (even multiple at once) should still be possible without problems.

## Features

* Post a message if it's someone's birthday. (Optionally as an embed to prevent pinging the user.)
* Give a birthday role to the birthday person for the duration of their birthday.
* List all birthdays for the server or just the next few upcoming ones.
* Full configuration via commands.
* Supports different time zones (configurable per server).

## Installation

```bash
git clone https://github.com/seeeeew/bdaybot.git
cd bdaybot
npm install
```
Copy `config.json.template` to `config.json` and edit it to suit your use case. Run `node .` in the installation directory to start the bot. Optionally you can create a systemd service to run the bot permanently.

## Usage

Default prefix is `@<bot-account> `. Successfull commands always give a response.

### User Commands:

These commands allow users to view birthdays and manage their own.

* `<prefix>bday set <MM-DD>` – set your birthday (without year)
* `<prefix>bday set <YYYY-MM-DD>` – set your birthday (with year)
* `<prefix>bday remove` – remove your birthday
* `<prefix>bday list` – list all birthdays
* `<prefix>bday next` – show the next upcoming birthdays
* `<prefix>help` – print help and general info

### Admin Commands:

These commands allow admin users to manage the per-server bot configuration.

* `<prefix>config show` – shows current configuration
* `<prefix>config help` – shows current configuration with descriptions
* `<prefix>config set <option> <value>` – set `<option>` to `<value>`
* `<prefix>config reset <option>` – reset `<option>` to the default value

## Configuration

Available configuration options:

* **prefix**  
command prefix this bot should react to (e. g. `!` or `bb!`)  
`@<bot-account> ` always works, even if this is unset

* **admin_roles**  
roles allowed to use admin commands (links or ids)  
server owner is always allowed, even if this is unset

* **command_channels**  
channels in which the bot will react to commands (links or ids)  
leave unset to allow all channels

* **alert_channel**  
channel in which the bot will post birthday alerts (link the channel)  
leave unset to disable this feature

* **alert_message**  
template for the birthday alert message (`{user}` will be replaced with the user link)  
uses default message if unset

* **alert_message_age**  
template for the birthday alert message if the user's age is available (`{user}`, `{age}` and `{ageth}` will be replaced)  
uses default message without age if unset

* **alert_embed**  
post the birthday alert as an embed to prevent pinging the birthday person (true/false, default: false)  

* **alert_time**  
time at which the bot posts the birthday alert (format: `HH:MM`)  
defaults to midnight if unset

* **timezone**  
time zone to be used for this server (full name from the [IANA tz database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones), e. g. `Europe/Berlin`)  
defaults to time zone of the machine the bot is running on if unset

* **bday_role**  
role that will be given to the birthday person for the duration of their birthday (link the role)  
leave unset to disable this feature
