# Toggl to FreeAgent Timesheet Generator

This tool provides an interface that displays your Toggl export in a layout matching FreeAgent's weekly timesheet so you can quickly manually input your hours.

![image](https://github.com/user-attachments/assets/f5fc89c3-a384-4d58-9015-043bf891dcfe)

## How to use it

1. Log in to Toggl and open Reports > Detailed.
2. Select the date range and any filters you require.
3. Ensure that the following columns are enabled: Description, Duration, Member, Project, Start date, Weekday.
4. Click Export > CSV in the top-right corner.
5. Open the [Toggl to FreeAgent Timesheet](https://itsviney.github.io/toggl-to-freeagent/) tool
6. Upload the downloaded CSV using the field below.
7. Select the week, user, project and task to view the hours worked.
8. Log in to FreeAgent and open <strong>Work &gt; Time Tracking &gt; Add weekly timesheet</strong>.
9. Input the data as shown in the Toggl to FreeAgent Timesheet tool.

A sample CSV data is provided in `sample.csv`. The tool expects the following columns: `User`, `Project`, `Description`, `Start date`, `Weekday` and `Duration`.

All processing is done in your browser - no data ever gets sent anywhere!
