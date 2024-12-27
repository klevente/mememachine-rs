use crate::{
    handler::EndEventHandler,
    util::{check_msg, get_sounds},
    ConfigStore, Db,
};
use anyhow::Context as AnyhowContext;
use rand::Rng;
use serenity::{all::GuildId, client::Context, model::channel::Message};
use songbird::{input::File, Event, TrackEvent};

const MAX_MSG_LEN: usize = 2000;

#[tracing::instrument(skip(ctx, msg))]
pub async fn sound_command(ctx: Context, msg: Message) -> anyhow::Result<()> {
    tracing::info!("Sound command was called with message {msg:?}");
    let (_, file_name) = msg.content.split_at(1);
    let file_name = file_name.to_owned();
    let result = play_sound(ctx.clone(), msg, &file_name).await;

    match result {
        Err(PlaySoundError::NotFound(_)) => return Ok(()),
        Err(e) => return Err(e.into()),
        _ => (),
    };

    let db = ctx.data.read().await.get::<Db>().cloned().unwrap();
    tokio::spawn(async move {
        let res = record_statistic(db, file_name, false).await;
        if let Err(e) = res {
            tracing::error!("Error inserting sound play into database: {e}");
        }
    });

    Ok(())
}

#[tracing::instrument(skip(ctx, msg))]
pub async fn random_command(ctx: Context, msg: Message) -> anyhow::Result<()> {
    let file_name = {
        let config = ctx.data.read().await.get::<ConfigStore>().cloned().unwrap();

        let files = get_sounds(&config.sounds_path).context("Error reading sound files")?;
        if files.is_empty() {
            check_msg(
                msg.reply(ctx, "There are no sound files to choose from! Please add some to the sounds directory.")
                    .await,
            );
            return Ok(());
        }
        let mut rng = rand::thread_rng();
        let idx = rng.gen_range(0..files.len());
        files[idx].clone()
    };
    tracing::info!("Random command in guild #{}, chosen file: '{file_name}'", 0);
    play_sound(ctx.clone(), msg, &file_name).await?;

    let db = ctx.data.read().await.get::<Db>().cloned().unwrap();
    tokio::spawn(async move {
        let res = record_statistic(db, file_name, true).await;
        if let Err(e) = res {
            tracing::error!("Error inserting sound play into database: {e}");
        }
    });

    Ok(())
}

#[tracing::instrument(skip(ctx, msg))]
pub async fn help_command(ctx: Context, msg: Message) -> anyhow::Result<()> {
    let config = ctx.data.read().await.get::<ConfigStore>().cloned().unwrap();

    let files = get_sounds(&config.sounds_path).context("Error reading sound files")?;

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

    Ok(())
}

#[derive(thiserror::Error, Debug)]
enum PlaySoundError {
    #[error("No sound was found with name '{0}'")]
    NotFound(String),
    #[error("Bot is already in a voice channel for guild #{0}")]
    InVoiceChannelAlready(GuildId),
    #[error("You're not in a voice channel!")]
    NoVoiceChannel,
    #[error("Unexpected error while joining channel: {0}")]
    JoinError(#[from] songbird::error::JoinError),
}

#[tracing::instrument(skip(ctx, msg))]
async fn play_sound(ctx: Context, msg: Message, file_name: &String) -> Result<(), PlaySoundError> {
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
        return Err(PlaySoundError::NoVoiceChannel);
    };

    let file_path = config.sounds_path.join(format!("{file_name}.mp3"));

    if !file_path.exists() {
        tracing::info!("No sound was found with name '{file_name}'");
        check_msg(msg.reply(&ctx, format!("Unknown sound: {file_name}")).await);
        return Err(PlaySoundError::NotFound(file_name.clone()));
    }

    let sound_file = File::new(file_path.clone());

    let manager = songbird::get(&ctx)
        .await
        .expect("Songbird Voice client placed in at initialisation.")
        .clone();

    let has_handler = manager.get(guild_id).is_some();
    if has_handler {
        tracing::info!("Bot is already in a voice channel for guild #{guild_id}, returning");
        return Err(PlaySoundError::InVoiceChannelAlready(guild_id));
    }

    let handler_lock = match manager.join(guild_id, connect_to).await {
        Ok(handler_lock) => handler_lock,
        Err(e) => {
            check_msg(
                msg.channel_id
                    .say(&ctx.http, format!("Error joining the channel, error: {e}"))
                    .await,
            );
            return Err(e.into());
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
    Ok(())
}

#[tracing::instrument(skip(db))]
async fn record_statistic(
    db: async_sqlite::Pool,
    file_name: String,
    is_random: bool,
) -> Result<(), async_sqlite::Error> {
    db.conn(move |c| {
        c.execute(
            "INSERT INTO sound_plays (sound_name, is_random) VALUES (?1, ?2)",
            (file_name, is_random),
        )
    })
    .await
    .map(|_| ())
}
