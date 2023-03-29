use crate::{
    handler::EndEventHandler, util::check_msg, util::sync_sound_files_with_fs, ConfigStore,
    SoundStore,
};
use rand::Rng;
use serenity::{client::Context, model::channel::Message};
use songbird::{
    input::{self},
    Event, TrackEvent,
};
use std::path::PathBuf;

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
        files[idx].clone()
    };
    println!("Random, chosen file is {file_name}");
    play_sound(ctx, msg, &file_name).await;
}

pub async fn help_command(_ctx: Context, _msg: Message) {}

async fn play_sound(ctx: Context, msg: Message, file_name: &String) {
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

    let mut files = sound_store.lock().await;
    if files.binary_search(&file_name).is_err() {
        sync_sound_files_with_fs(sounds_path, &mut files);
        if files.binary_search(&file_name).is_err() {
            check_msg(msg.reply(ctx, format!("Unknown sound: {file_name}")).await);
            return;
        }
    }

    let file_path = PathBuf::from(sounds_path).join(format!("{file_name}.mp3"));

    if !file_path.exists() {
        check_msg(msg.reply(ctx, format!("Unknown sound: {file_name}")).await);
        sync_sound_files_with_fs(sounds_path, &mut files);
        return;
    }

    let sound_file = match input::ffmpeg(&file_path).await {
        Ok(sound_file) => sound_file,
        Err(e) => {
            println!("Unexpected error occurred: {e}");
            check_msg(
                msg.reply(ctx, format!("Unexpected error occurred: {e}"))
                    .await,
            );
            return;
        }
    };

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

    let sound = handler.play_source(sound_file);
    let _ = sound.set_volume(1.0);

    let _ = sound.add_event(
        Event::Track(TrackEvent::End),
        EndEventHandler::new(manager.clone(), guild_id),
    );
}
