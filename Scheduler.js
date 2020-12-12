const schedule = require("node-schedule");

const schedulers = {}

// TODO more sanity checks for scheduler
function Scheduler(server_id) {
	let timeRule, timeJob, midnightRule, midnightJob;
	function init(time, timezone, timeCommand, midnightCommand) {
		timeRule = new schedule.RecurrenceRule();
		midnightRule = new schedule.RecurrenceRule();
		if (timezone) {
			timeRule.tz = timezone;
			midnightRule.tz = timezone;
		}
		if (time) {
			[timeRule.hour, timeRule.minute] = time.split(":").map(part => part * 1);
			timeJob = schedule.scheduleJob(timeRule, () => timeCommand(server_id));
		}
		[midnightRule.hour, midnightRule.minute] = [0, 0];
		midnightJob = schedule.scheduleJob(midnightRule, () => midnightCommand(server_id));
	}
	function setTimezone(timezone) {
		timeRule.tz = timezone;
		timeJob.reschedule(timeRule);
		midnightRule.tz = timezone;
		midnightJob.reschedule(midnightRule);
	}
	function setTime(time) {
		if (time) {
			[timeRule.hour, timeRule.minute] = time.split(":").map(part => part * 1);
			timeJob.reschedule(timeRule);
		} else {
			[timeRule.hour, timeRule.minute] = [];
			if (timeJob) {
				timeJob.cancel();
				timeJob = undefined;
			}
		}
	}
	function destroy() {
		timeJob.cancel();
		midnightJob.cancel();
		delete schedulers[server_id];
	}
	return {
		init,
		setTimezone,
		setTime,
		destroy
	}
}

function getScheduler(server_id) {
	if (!schedulers[server_id]) {
		schedulers[server_id] = Scheduler(server_id);
	}
	return schedulers[server_id];
}
getScheduler.schedulers = schedulers;

module.exports = getScheduler;
