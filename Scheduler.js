const schedule = require("node-schedule");

function Scheduler(server_id) {
	function setTimezone(timezone) {
		// TODO implement setTimezone
	}
	function setTime(time) {
		// TODO implement setTime
	}
	function start() {
		// TODO implement start
	}
	return {
		setTimezone,
		setTime,
		start
	}
}

const schedulers = {}
function getScheduler(server_id) {
	if (!schedulers[server_id]) {
		schedulers[server_id] = Scheduler(server_id);
	}
	return schedulers[server_id];
}

module.exports = getScheduler;
