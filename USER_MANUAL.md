# PickPal User Manual

## 1. Introduction

PickPal is a student election and survey system for Dominican College of Tarlac. It is used by students to register, view candidates, vote, answer surveys, and view published results. It is used by department administrators to manage elections, candidates, voters, surveys, results, and audit logs.

This manual is divided into two parts:

- Voter User Manual
- Administrator User Manual

## 2. Accessing PickPal

PickPal can be accessed through a browser using the official system link provided by the school or department. Since PickPal is a Progressive Web App, users may also install it as an app on supported mobile browsers.

For best results, use an updated browser such as Chrome, Edge, Safari, or another modern browser with camera support.

## 3. Voter User Manual

### 3.1 Registering as a Voter

1. Open PickPal.
2. On the login screen, choose the voter registration option.
3. Enter your student number.
4. Enter your email address.
5. Enter your first name, middle name if applicable, and last name.
6. Select your department.
7. Select your year level.
8. Select your section.
9. Create a password.
10. Confirm your password.
11. Proceed to the face scan step.
12. Allow camera permission when the browser asks.
13. Position your face inside the frame.
14. Complete the face scan.
15. Submit your registration.

After registration, your account will be pending until your department administrator approves it.

### 3.2 Logging In as a Voter

1. Open PickPal.
2. Select the Voter login option.
3. Enter your student number.
4. Enter your password.
5. Click Sign In.

If your registration is still pending or rejected, you may not be able to access the voter dashboard.

### 3.3 Home Module

The Home module shows the main voter actions. From here, you can:

- Cast a ballot if an election is available.
- Answer a student survey if there is an active survey.
- View live or upcoming election information.

If there is no available survey, the survey shortcut will not appear.

### 3.4 Candidates Module

The Candidates module lets you view candidates for available elections.

1. Open the Candidates module.
2. Select an available election.
3. Select or open a position.
4. View the candidates under that position.
5. Click a candidate card to view more details if available.

Candidates may include a photo, name, position, section, year level, and platform.

### 3.5 Vote Module

The Vote module is used to cast your official ballot.

1. Open the Vote module.
2. Select an available election.
3. Review the election details.
4. Choose one candidate for each required position.
5. Proceed to face verification.
6. Allow camera access if asked.
7. Position your face clearly inside the frame.
8. Wait for verification to complete.
9. Submit your ballot.

Important reminders:

- You can vote only once per election.
- Your face verification must match your registered face scan.
- Do not refresh or close the browser while submitting your vote.
- Voting requires an internet connection.

### 3.6 Survey Module

The Survey module contains optional surveys created by the administrator.

1. Open the Survey module.
2. Select an available survey.
3. Answer the questions.
4. If the survey has an anonymous option, choose whether to submit anonymously.
5. Submit the survey.

Survey responses are separate from election ballots and do not affect your ability to vote.

### 3.7 Results Module

The Results module shows election results after they are published by the administrator.

1. Open the Results module.
2. Select an election with published results.
3. View the vote count and winners.

If results are not yet published, they will not be visible to voters.

### 3.8 Profile Module

The Profile module shows your account information and voting status. You can also change your password or log out from this module.

To change your password:

1. Open Profile.
2. Enter your current password.
3. Enter your new password.
4. Confirm the new password.
5. Save the change.

### 3.9 Forgot Password

1. On the login screen, click Forgot Password.
2. Enter the email address connected to your account.
3. Request a reset code.
4. Open your email and copy the reset code.
5. Enter the reset code in PickPal.
6. Enter a new password.
7. Confirm the new password.
8. Submit the reset form.

If no email is received, check the spam folder or ask the administrator to verify that the email address is correct.

## 4. Administrator User Manual

### 4.1 Logging In as an Admin

1. Open PickPal.
2. Select the Admin login option.
3. Enter your admin email.
4. Enter your password.
5. Click Sign In.

Each department has its own admin account. Admins should only see and manage records that belong to their assigned department. SSC elections are handled separately as college-wide elections.

### 4.2 Dashboard Module

The Dashboard gives a summary of the department's current election activity. It may show:

- Active elections
- Registered voters
- Total candidates
- Turnout
- Current election status

Use the Dashboard for quick monitoring.

### 4.3 Elections Module

The Elections module is used to create and manage elections.

To create an election:

1. Open Elections.
2. Click New Election.
3. Enter the election title.
4. Select the start date and time.
5. Select the end date and time.
6. Choose default positions if needed.
7. Add custom positions if needed.
8. Confirm creation.

To edit an election:

1. Open Elections.
2. Find the election.
3. Click the edit icon.
4. Update the title, start date, or end date.
5. Save changes.

Available election actions may include:

- View Results
- Manage Positions
- Open Election
- Close Election
- Edit
- Archive
- Delete

### 4.4 Manage Positions

Positions define the offices that candidates can run for.

To manage positions:

1. Open Elections.
2. Find the election.
3. Click Manage Positions.
4. Add a new position if needed.
5. Edit position names directly if needed.
6. Remove positions that are not needed.

Default positions include President, Vice President, Secretary, Treasurer, Auditor, PIO, year representatives, and Sports Coordinator. Custom positions can still be added for department-specific elections.

### 4.5 Candidates Module

The Candidates module is used to add, edit, and manage candidates.

To add a candidate:

1. Open Candidates.
2. Select an election.
3. Select the position.
4. Search or select the student from the official student list if available.
5. Confirm the candidate information.
6. Add a candidate photo if available.
7. Enter the candidate platform.
8. Save the candidate.

To edit a candidate:

1. Open Candidates.
2. Select the election.
3. Click the candidate card.
4. Update the needed information.
5. Save changes.

Candidate photos are managed by the admin and are visible to voters.

### 4.6 Voters Module

The Voters module is used to manage voter registrations and the official student list.

To import the official student list:

1. Open Voters.
2. Click Import Official List.
3. Select the CSV or Excel file.
4. Review the import preview.
5. Confirm the import.

The official list is used to validate voter registrations. The required columns are:

```text
studentnumber,firstname,lastname,department,year,section,email
```

To approve or reject a voter:

1. Open Voters.
2. Find the pending registration.
3. Open the voter details.
4. Check the official-list match status.
5. Approve if the information matches.
6. Reject if the registration is invalid or does not match the official list.

Match statuses may include:

- Matched
- Mismatch
- Not found

If a field is marked as mismatch, verify the official list and the student's submitted information.

### 4.7 Results Module

The Results module allows admins to review and publish election results.

1. Open Results.
2. Select an election with votes.
3. Review vote counts and turnout.
4. Click Publish Results when ready.

Once published, voters can view the results from their Results module. Results can be unpublished if corrections or review are needed.

### 4.8 Survey Module

The Survey module is used to create optional surveys for feedback or data gathering.

To create a survey:

1. Open Survey.
2. Click Create Survey.
3. Enter the survey title.
4. Enter the survey description if needed.
5. Save the survey.
6. Add questions.
7. Choose question types and options.
8. Activate and publish the survey when ready.

To edit a survey:

1. Open Survey.
2. Select the survey.
3. Edit survey details or questions.
4. Save changes.

To view survey analytics:

1. Open Survey.
2. Open the analytics view.
3. Review the submitted responses and summaries.

Surveys are not connected to vote submission.

### 4.9 Audit Log Module

The Audit Log records important actions performed in the system.

Use it to review:

- Admin actions
- Election changes
- Voter approval actions
- Import activity
- Survey activity
- Other tracked system events

Search and filters automatically update the displayed logs. Audit logs are department-scoped for privacy.

### 4.10 Profile Module

The Profile module allows admins to manage their account.

Admins can:

- View account details.
- Change password.
- Transfer the admin account by email.
- Log out.

To transfer the admin account:

1. Open Profile.
2. Enter the new admin name if needed.
3. Enter the new admin email.
4. Enter the current admin password.
5. Submit the transfer.

Use this when a department admin changes, resigns, or graduates.

## 5. PWA Installation Guide

### Android

1. Open PickPal in Chrome.
2. Tap the browser menu.
3. Tap Add to Home Screen or Install App.
4. Confirm installation.
5. Open PickPal from the home screen.

### iOS

1. Open PickPal in Safari.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Confirm the name.
5. Tap Add.

Some browser features may depend on the device, browser version, and camera permissions.

## 6. Common Issues and Solutions

### Cannot log in

Check that the account is approved, the password is correct, and the correct login type is selected.

### Registration says mismatch

The submitted registration does not fully match the official student list. Ask the department admin to check the official list entry.

### Camera does not open

Allow camera permission in the browser. Use a modern browser and make sure no other app is using the camera.

### Face verification fails

Use good lighting, face the camera directly, remove heavy obstructions, and try again. If it still fails, ask the administrator to review the registered account.

### No election appears

There may be no active election for your department, or the election may not be open yet.

### No survey appears

There may be no active published survey.

### Results are not visible

Results must be published by the administrator before voters can view them.

### Forgot password email is not received

Check the spam folder and confirm that the account email is correct. The system email settings must also be configured correctly by the technical administrator.

## 7. Best Practices

### For Voters

- Register using your official student information.
- Use a valid email address.
- Keep your password private.
- Vote using a stable internet connection.
- Complete face verification in a well-lit place.

### For Admins

- Import the official student list before approving registrations.
- Review mismatch warnings carefully.
- Test elections before opening them.
- Add candidates and positions before the election starts.
- Publish results only after checking the totals.
- Keep admin account credentials private.
- Back up the database before major election activity.

