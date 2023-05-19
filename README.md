# mememachine-rs

![License](https://img.shields.io/github/license/klevente/mememachine-rs?style=flat-square)
[![CI Status](https://img.shields.io/github/actions/workflow/status/klevente/mememachine-rs/ci.yml?branch=main&style=flat-square)](https://github.com/klevente/mememachine-rs/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/klevente/mememachine-rs?style=flat-square)](https://github.com/klevente/mememachine-rs/releases/latest)

Discord bot for playing custom sounds in voice chat. It is similar to the new official [Soundboard feature](https://support.discord.com/hc/en-us/articles/12612888127767-Soundboard-FAQ), but allows for unlimited samples per instance. Supports `.mp3` files for now. Also supports "hot-reload", meaning that you can add and remove sound files on the fly without restarting the bot.

The bot is written in Rust, and uses [Songbird](https://github.com/serenity-rs/songbird) for voice communications.

## Setup

You can get `mememachine-rs` up and running in 3 ways:
- Running the executable locally
- Running it via Docker
- Hosting it on [Fly.io](https://fly.io/)

But first of all, a bot account for it has to be created.

### Creating a Discord Bot Account

Create a new bot account ([guide](https://discordpy.readthedocs.io/en/stable/discord.html)). Things to keep in mind:
  - Make sure to enable the *Message Content Intent* under the *Bot - Privileged Gateway Intents*
  - When creating the invite URL, tick the `bot` scope, then the following permissions:
    - *Send Messages*
    - *Connect*
    - *Speak*
  - Save your bot token as you'll need it when starting up the bot

### Running Locally

If you wish to run the bot locally, you're going to need to install [FFmpeg](https://ffmpeg.org/) on your computer, as that is what the bot uses for loading sounds.

Installation:
- Windows: Download the [executable](https://www.gyan.dev/ffmpeg/builds/) (Don't forget to add it to you `PATH`)
- MacOS: `brew install ffmpeg`
- Linux: `apt install ffmpeg`/`pacman -S ffmpeg`

Then follow the steps below:
- Download the latest release for your OS from the [Releases](https://github.com/klevente/mememachine-rs/releases/latest) page
- Extract the executable
- Prepare some `.mp3` files in a directory (by default, the bot looks for the `sounds` directory next to its executable, but this can be overridden with the `SOUNDS_PATH` environment variable)
- Start the bot (also define the `SOUNDS_PATH` environment variable to locate the sound files if necessary):
- Linux/MacOS: `DISCORD_TOKEN=<your-token> ./mememachine-rs`
- Windows: `set DISCORD_TOKEN=<your-token> && mememachine-rs.exe & set DISCORD_TOKEN=`

### Running via Docker

- Make sure you have Docker installed and that it's running
- Create a `.env` file using the `.env.example`, putting in your `DISCORD_TOKEN` (`SOUNDS_PATH` is not necessary as we'll use a volume mount for the sounds)
- Prepare some `.mp3` files in a directory, and note down the path, as we'll mount this into the container in the next step
- Run `docker run -d --env-file <path-to-env-file> -v <path-of-sounds-on-host>:/app/sounds --restart unless-stopped --name mememachine-rs ghcr.io/klevente/mememachine-rs:latest`
- Example workflow:
  - `echo "DISCORD_TOKEN=my-token" > .env`
  - `mkdir sounds`
  - `docker run -d --env-file .env -v ./sounds:/app/sounds --restart unless-stopped --name mememachine-rs ghcr.io/klevente/mememachine-rs:latest`

### Hosting on Fly

- Create a [Fly account](https://fly.io/app/sign-up)
- Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
- Clone the repository, then `cd` into the root of it
- Run `fly auth login`
- Make adjustments to `fly.toml` if needed (for example, if you want to change [regions](https://fly.io/docs/reference/regions/))
- Run `fly launch` and run through the wizard:
  - Make sure to answer `y` to the first prompt (this will use the settings from the `fly.toml` file in the repo)
  - Say `n` to creating a Postgres instance, Redis instance or to deploying right away
- Set up your Discord token as a secret: `fly secrets set DISCORD_TOKEN=<xxx>`
- Create a volume where you'll store your sounds: `fly volumes create mememachine_data --region <app-region> --size 1`
- Deploy the app: `fly deploy`

To add sounds to the created volume, you can use the [SFTP](https://fly.io/docs/flyctl/sftp/) functionality of `flyctl`:
- Start an interactive SFTP session: `fly sftp shell`
- Run `put <path-to-sound-file>` to upload a file

*Disclaimer*: As of now, there is no way to copy multiple files at once using this method, so it might be a bit of a hassle to do.

## Environment Variables

- `DISCORD_TOKEN`*: Your bot account's Discord token (required)
- `SOUNDS_PATH`: The directory where the sound files will be picked up from. Defaults to `<directory-of-bot>/sounds`

## Commands

The bot's prefix is `%`. The available commands are:
- `%list`/`%help`: Prints a list of all available sounds to play
- `%random`: Chooses a random sound from the sounds directory and plays it. The user who initiated this command has to be in a voice channel
- `%<sound-name>`: Plays the sounds file named `<sound-name>`. This must be supplied without the `.mp3` extension. The user who initiated this command has to be in a voice channel
  - Example: `%hello` will play the sound named `hello.mp3`

## Logs

The bot will log `INFO`-level logs to `stdout` by default. To change the log level, supply the `RUST_LOG` environment variable with one of the following: `trace`, `debug`, `info`, `warn`, `error`.
