# Notes and Calendar

## Notes

`Personal > Notes` is a lightweight note store backed by the Admin PostgreSQL database. A note
has a title, plain Markdown-friendly body, optional Workspace, comma-separated tags, and a pinned
flag. The list searches title, body, and tags and can be filtered by Workspace. Pinned notes sort
before recently updated notes.

Creating a note opens its detail editor. Save persists all fields. Delete permanently removes only
that note; it does not affect its Workspace or Tasks. Notes do not read or write File Browser files.

## Calendar

`Personal > Calendar` displays a monthly grid in the `Asia/Seoul` timezone. Events have a title,
optional Workspace and description, start/end time, and an all-day flag. The same view also shows
Task due dates; clicking a Task item opens its Task detail. Event deletion does not delete linked
Workspace data.

Task due dates are edited on the Task detail page. Completing a Task retains its due date for
history, while the Overview upcoming list omits completed Tasks.

## Overview

Overview includes the next events and incomplete Task deadlines plus the five most recently
updated notes. These cards are shortcuts, not a replacement for the full Notes or Calendar pages.

## Current boundaries

- No Google/Apple/CalDAV synchronization
- No recurring events or reminders
- No rich-text/block editor or collaborative editing
- No attachments; File Browser paths can continue to be stored as Task references
- All routes remain protected by the existing Cloudflare Access JWT validation
