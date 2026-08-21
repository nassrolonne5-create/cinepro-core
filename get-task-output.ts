// Just look at the console log... or wait, we can just run the test-debug again synchronously since it doesn't take that long?
// No, the task is 281. We can view the background logs. But I can't read logs directly unless I use run_command with `cat log` or something. Wait, manage_task returns the log file location in status! I can just use run_command to `cat` the file or re-run synchronously.
