use std::sync::Arc;

use rand::Rng;
use serenity::{
    async_trait,
    client::{Context, EventHandler},
    model::{channel::Message, gateway::Ready, id::GuildId},
};
use songbird::{
    input::{self},
    Event, EventContext, EventHandler as VoiceEventHandler, Songbird, TrackEvent,
};

use crate::{util::check_msg, SoundStore};

const PREFIX: char = '%';

pub struct Handler;

#[async_trait]
impl EventHandler for Handler {
    async fn message(&self, ctx: Context, msg: Message) {
        if msg.content.is_empty() {
            return;
        }
        let (prefix, message) = msg.content.split_at(1);
        if !prefix.starts_with(PREFIX) {
            return;
        }

        println!("Received: {}", message);

        let mut file_name = message;

        let sound_store = ctx
            .data
            .read()
            .await
            .get::<SoundStore>()
            .cloned()
            .expect("Should be here");
        let files = sound_store.lock().await;

        if message == "random" {
            let mut rng = rand::thread_rng();
            let idx = rng.gen_range(0..files.len());
            file_name = files.iter().nth(idx).unwrap();
            println!("Random, chosen file is {file_name}");
        }

        if !files.contains(file_name) {
            check_msg(msg.reply(ctx, format!("Unknown sound: {message}")).await);
            return;
        }

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

        let formatted_file_name = format!("sounds/{file_name}.mp3");
        let sound_file = input::ffmpeg(&formatted_file_name).await.expect("Dead");
        let sound = handler.play_source(sound_file);
        let _ = sound.set_volume(1.0);

        let _ = sound.add_event(
            Event::Track(TrackEvent::End),
            EndEventHandler {
                manager: manager.clone(),
                guild_id,
            },
        );
    }

    async fn ready(&self, _: Context, ready: Ready) {
        println!("{} is connected!", ready.user.name);
    }
}

pub struct EndEventHandler {
    manager: Arc<Songbird>,
    guild_id: GuildId,
}

impl EndEventHandler {
    pub fn new(manager: Arc<Songbird>, guild_id: GuildId) -> Self {
        Self { manager, guild_id }
    }
}

#[async_trait]
impl VoiceEventHandler for EndEventHandler {
    async fn act(&self, _: &EventContext<'_>) -> Option<Event> {
        println!("Finished playing sound, disconnecting");
        let has_handler = self.manager.get(self.guild_id).is_some();

        if has_handler {
            if let Err(_e) = self.manager.remove(self.guild_id).await {
                /*check_msg(
                    msg.channel_id
                        .say(&ctx.http, format!("Failed: {:?}", e))
                        .await,
                );*/
            }

            // check_msg(msg.channel_id.say(&ctx.http, "Left voice channel").await);
        } else {
            // check_msg(msg.reply(ctx, "Not in a voice channel").await);
        }

        None
    }
}
