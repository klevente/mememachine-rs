use std::path::PathBuf;
use std::sync::Arc;

use crate::handler::EndEventHandler;
use crate::util::check_msg;
use crate::{ConfigStore, SoundStore};
use rand::Rng;
use serenity::{
    async_trait,
    client::{Context, EventHandler},
    model::{channel::Message, gateway::Ready, id::GuildId},
};
use songbird::typemap::TypeMapKey;
use songbird::{
    input::{self},
    Event, EventContext, EventHandler as VoiceEventHandler, Songbird, TrackEvent,
};

const PREFIX: char = '%';

pub async fn handle_message(ctx: Context, msg: Message) {
    if msg.content.len() < 2 {
        return;
    }
    let (prefix, message) = msg.content.split_at(1);
    if !prefix.starts_with(PREFIX) {
        return;
    }

    match message {
        "list" | "help" => help_command(ctx, msg).await,
        "random" => random_command(ctx, msg).await,
        _ => sound_command(ctx, msg).await,
    }
}

pub async fn sound_command(ctx: Context, msg: Message) {
    let (_, file_name) = msg.content.split_at(1);
    let file_name = file_name.to_owned();
    play_sound(ctx, msg, &file_name).await;
}

pub async fn random_command(ctx: Context, msg: Message) {
    let file_name = {
        let sound_store = ctx
            .data
            .read()
            .await
            .get::<SoundStore>()
            .cloned()
            .expect("Should be here");
        let files = sound_store.lock().await;
        let mut rng = rand::thread_rng();
        let idx = rng.gen_range(0..files.len());
        files.iter().nth(idx).unwrap().clone()
    };
    println!("Random, chosen file is {file_name}");
    play_sound(ctx, msg, &file_name).await;
}

pub async fn help_command(ctx: Context, msg: Message) {}

async fn play_sound(ctx: Context, msg: Message, file_name: &str) {
    let sound_store = ctx
        .data
        .read()
        .await
        .get::<SoundStore>()
        .cloned()
        .expect("Should be here");

    let config = ctx
        .data
        .read()
        .await
        .get::<ConfigStore>()
        .cloned()
        .expect("Should be here");
    let sounds_path = &config.sounds_path;

    let files = sound_store.lock().await;

    if !files.contains(file_name) {
        check_msg(msg.reply(ctx, format!("Unknown sound: {file_name}")).await);
        return;
    }

    let file_path = PathBuf::from(sounds_path).join(format!("{file_name}.mp3"));

    let guild = msg.guild(&ctx.cache).unwrap();
    let guild_id = guild.id;

    let channel_id = guild
        .voice_states
        .get(&msg.author.id)
        .and_then(|voice_state| voice_state.channel_id);

    let connect_to = match channel_id {
        Some(channel) => channel,
        None => {
            check_msg(msg.reply(ctx, "Not in a voice channel").await);
            return;
        }
    };

    let manager = songbird::get(&ctx)
        .await
        .expect("Songbird Voice client placed in at initialisation.")
        .clone();

    let has_handler = manager.get(guild_id).is_some();
    if has_handler {
        // TODO: this check does not work if a message comes in as the bot leaves: `Error joining the channel, error: Dropped`
        println!("Already in call, returning...");
        return;
    }

    let (handler_lock, success_reader) = manager.join(guild_id, connect_to).await;

    if let Err(e) = success_reader {
        check_msg(
            msg.channel_id
                .say(
                    &ctx.http,
                    format!("Error joining the channel, error: {:?}", e),
                )
                .await,
        );
        return;
    }

    let mut handler = handler_lock.lock().await;

    let sound_file = input::ffmpeg(&file_path)
        .await
        .expect("Could not load sound file");
    let sound = handler.play_source(sound_file);
    let _ = sound.set_volume(1.0);

    let _ = sound.add_event(
        Event::Track(TrackEvent::End),
        EndEventHandler::new(manager.clone(), guild_id),
    );
}
