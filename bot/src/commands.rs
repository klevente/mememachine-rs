use crate::{handler::EndEventHandler, util::check_msg, util::get_sounds, ConfigStore};
use rand::Rng;
use serenity::{client::Context, model::channel::Message};
use songbird::{input::File, Event, TrackEvent};

const MAX_MSG_LEN: usize = 2000;

#[tracing::instrument(skip(ctx, msg))]
pub async fn sound_command(ctx: Context, msg: Message) {
    tracing::info!("Sound command was called with message {:?}", msg);
    let (_, file_name) = msg.content.split_at(1);
    let file_name = file_name.to_owned();
    play_sound(ctx, msg, &file_name).await;
}

#[tracing::instrument(skip(ctx, msg))]
pub async fn random_command(ctx: Context, msg: Message) {
    let file_name = {
        let config = ctx.data.read().await.get::<ConfigStore>().cloned().unwrap();

        let files = get_sounds(&config.sounds_path).unwrap();
        if files.is_empty() {
            check_msg(
                msg.reply(ctx, "There are no sound files to choose from! Please add some to the sounds directory.")
                    .await,
            );
            return;
        }
        let mut rng = rand::thread_rng();
        let idx = rng.gen_range(0..files.len());
        files[idx].clone()
    };
    tracing::info!("Random command in guild #{}, chosen file: '{file_name}'", 0);
    play_sound(ctx, msg, &file_name).await;
}

#[tracing::instrument(skip(ctx, msg))]
pub async fn help_command(ctx: Context, msg: Message) {
    let config = ctx.data.read().await.get::<ConfigStore>().cloned().unwrap();

    let files = get_sounds(&config.sounds_path).unwrap();

    let mut messages = vec!["".to_string()];

    for file in files.iter() {
        if messages.last().unwrap().len() + file.len() > MAX_MSG_LEN {
            messages.push("".to_string());
        }
        let last = messages.last_mut().unwrap();
        last.push_str(file);
        last.push('\n');
    }

    for content in messages {
        check_msg(msg.channel_id.say(&ctx.http, content).await);
    }
}

#[tracing::instrument(skip(ctx, msg))]
async fn play_sound(ctx: Context, msg: Message, file_name: &String) {
    let config = ctx.data.read().await.get::<ConfigStore>().cloned().unwrap();

    let (guild_id, channel_id) = {
        let guild = msg.guild(&ctx.cache).unwrap();
        let channel_id = guild
            .voice_states
            .get(&msg.author.id)
            .and_then(|voice_state| voice_state.channel_id);

        (guild.id, channel_id)
    };

    let Some(connect_to) = channel_id else {
        check_msg(msg.reply(&ctx, "You're not in a voice channel!").await);
        return;
    };

    let file_path = config.sounds_path.join(format!("{file_name}.mp3"));

    if !file_path.exists() {
        tracing::info!("No sound was found with name '{file_name}'");
        check_msg(msg.reply(&ctx, format!("Unknown sound: {file_name}")).await);
        return;
    }

    let sound_file = File::new(file_path.clone());

    let manager = songbird::get(&ctx)
        .await
        .expect("Songbird Voice client placed in at initialisation.")
        .clone();

    let has_handler = manager.get(guild_id).is_some();
    if has_handler {
        tracing::info!("Bot is already in a voice channel for guild #{guild_id}, returning");
        return;
    }

    let handler_lock = match manager.join(guild_id, connect_to).await {
        Ok(handler_lock) => handler_lock,
        Err(e) => {
            check_msg(
                msg.channel_id
                    .say(&ctx.http, format!("Error joining the channel, error: {e}"))
                    .await,
            );
            return;
        }
    };

    let mut handler = handler_lock.lock().await;

    let sound = handler.play_input(sound_file.into());

    let _ = sound.set_volume(1.0);
    tracing::info!("Playing sound: '{}'", file_path.display());

    let _ = sound.add_event(
        Event::Track(TrackEvent::End),
        EndEventHandler::new(manager.clone(), guild_id, tracing::Span::current()),
    );
    tracing::info!("Added track end event listener");
}
