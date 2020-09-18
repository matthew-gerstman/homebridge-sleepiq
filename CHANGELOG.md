# Change Log

All notable changes to this project will be documented in this file.

## v4.1.0 (2020-09-17)

### Changes

- Added initial foot warmer support for flexfit 3 foundations. I don't have a foundation, so if you find any bugs, or something isn't working right, please file a ticket.
- Set a step size for the sleep number slider so it is easier to hit the number you are aiming for.

## v4.0.1 (2020-09-17)

### Bug Fixes

- Fixed bug in API call for foundation outlets and light strips

## v4.0.0 (2020-09-17)

### Changes

- Added initial support for foundation outlets and light strips
  - This release introduces initial support for the outlets and light strips on the flex fit foundations that have them. I don't personally have one, so please report any issues when using them. If the light strips are capable of brightness control, I do not support that either. I need REST data to add that capability.

## v3.4.1 - v3.4.17 (2020-09-17)

### Bug Fixes

- Various

### Changes

- Add support for Homebridge UI

## v3.4.0 (2020-09-16)

### Changes

- Add support for having the foundations return to flat when the Homekit lightbulb is turned off
- Debounce the sleep number update request so it doesn't trigger while attempting to set the slider to the desired value

### Bug Fixes

- Fixes for the various promise errors that have been reported
- Set the minimum sleep number value to 5

## Older

- Refer to github commit details if you are interested. 