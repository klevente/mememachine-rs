# mememachine-rs

Discord bot for playing custom sounds in voice chat. It is similar to the new official [Soundboard feature](https://support.discord.com/hc/en-us/articles/12612888127767-Soundboard-FAQ), but allows for unlimited samples per instance. Supports `.mp3` files for now.

The bot is written in Rust, and uses [Songbird](https://github.com/serenity-rs/songbird) for voice communications.

## Installation

Below are the steps required for setting up `mememachine-rs` on your server.

### Dependencies

- [FFmpeg](https://ffmpeg.org/): Used for loading sound files. You have to install it for your OS:
  - Windows: Download the [executable](https://www.gyan.dev/ffmpeg/builds/) (Don't forget to add it to you `PATH`)
  - MacOS: `brew install ffmpeg`
  - Linux: `apt install ffmpeg`/`pacman -S ffmpeg`

### Steps

- Create a new bot account ([guide](https://discordpy.readthedocs.io/en/stable/discord.html))
  - Make sure to enable the "Message Content Intent" under the "Bot - Privileged Gateway Intents"
  - When creating the invite URL, tick the `bot` scope, then the following permissions:
    - Send Messages
    - Connect
    - Speak
  - Save your bot token as you'll need it
- Download the latest release from the [Releases](https://github.com/klevente/mememachine-rs/releases/tag/v0.1.4) page
- Extract it in a directory
- Prepare some `.mp3` files in a directory (by default, the bot looks for the directory `sounds` in its directory, but this can be overridden with the `SOUNDS_PATH` environment variable)
- Start the bot (optionally supply/define the `SOUNDS_PATH` environment variable to locate the sound files):
  - Linux/MacOS: `DISCORD_TOKEN=<your-token> ./mememachine-rs`
  - Windows: `set DISCORD_TOKEN=<your-token> && mememachine-rs.exe & set DISCORD_TOKEN=`

## Environment Variables

- `DISCORD_TOKEN`*: Your bot account's Discord token
- `SOUNDS_PATH`: The directory where the sound files will be picked up from. Defaults to `<directory-of-bot>/sounds`

## Commands

The bot's prefix is `%`. The available commands are:
- `%list`/`%help`: Prints a list of all available sounds to play
- `%random`: Chooses a random sound from the sounds directory and plays it. The user who initiated this command has to be in a voice channel
- `%<sound-name>`: Plays the sounds file named `<sound-name>`. This must be supplied without the `.mp3` extension. The user who initiated this command has to be in a voice channel
  - Example: `%hello` will play the sound named `hello.mp3`

## Logs

The bot will log `INFO`-level logs to `stdout` by default. To change the log level, supply the `RUST_LOG` environment variable with one of the following: `trace`, `debug`, `info`, `warn`, `error`.

# TODO:

- [ ] Add script for bulk uploading files to Fly volumes
- [ ] Add details on how to deploy to fly.io
- [ ] Publish in Docker registry
- [ ] Create GH Action for deploying automatically (have to click button to actually deploy)
