# Notes and Calendar

## Notes

`Personal > Notes` is a lightweight note store backed by the Admin PostgreSQL database. A note
has a title, plain Markdown-friendly body, optional Workspace, comma-separated tags, and a pinned
flag. The list searches title, body, and tags and can be filtered by Workspace. Pinned notes sort
before recently updated notes.

Creating a note opens its detail editor. Save persists all fields. Delete permanently removes only
that note; it does not affect its Workspace or Tasks. Notes do not read or write File Browser files.

## Calendar

`Personal > Calendar` displays a monthly grid in the `Asia/Seoul` timezone. Create an event with
the `+` button inside its date cell; there is no separate page-level creation form. The modal stores
title, optional Workspace and description, start/end time, all-day state, display color, and repeat
mode. `Every year` repeats on the same month and day and is marked with `↻` in the calendar.

Click an event to edit its time, recurrence, color, and other fields or to delete it. The same view
also shows Task due dates; clicking a Task item opens its Task detail. Event deletion does not delete
linked Workspace data.

Task due dates are edited on the Task detail page. Completing a Task retains its due date for
history, while the Overview upcoming list omits completed Tasks.

### Google Calendar recurring-event synchronization

Google Calendar synchronization must import a recurring series as one Mano event instead of
materializing every occurrence as a separate row. Mano currently preserves yearly recurrence;
unsupported Google recurrence rules and detached exception instances are skipped rather than
creating misleading duplicates. Ordinary one-off events, all-day events, deletions, and yearly
series continue to synchronize in both directions.

This prevents a yearly event from expanding into many future database rows. Existing duplicated
occurrences can be removed only after confirming that the recurring series row remains. Verify the
behavior with normalization tests for yearly masters, detached recurring instances, ordinary
events, all-day boundaries, and cancellations, followed by the full test, type-check, and build.

## Overview

Overview includes the next events and incomplete Task deadlines plus the five most recently
updated notes. These cards are shortcuts, not a replacement for the full Notes or Calendar pages.

## Current boundaries

- Google Calendar synchronization supports ordinary events and yearly recurrence; Apple/CalDAV
  synchronization is not included
- Annual recurrence is supported; weekly/monthly/custom recurrence and reminders are not yet included
- No rich-text/block editor or collaborative editing
- No attachments; File Browser paths can continue to be stored as Task references
- All routes remain protected by the existing Cloudflare Access JWT validation
