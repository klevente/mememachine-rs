use rand::Rng;
use std::{
    collections::{BTreeSet, HashMap, HashSet},
    convert::TryInto,
    env,
    sync::{Arc, Weak},
};

use serenity::{
    async_trait,
    client::{Client, Context, EventHandler},
    model::{channel::Message, gateway::Ready, id::GuildId},
    prelude::{GatewayIntents, Mentionable, Mutex, *},
    Result as SerenityResult,
};

use songbird::{
    driver::Bitrate,
    input::{
        self,
        cached::{Compressed, Memory},
        Input,
    },
    Call, Event, EventContext, EventHandler as VoiceEventHandler, SerenityInit, Songbird,
    TrackEvent,
};

const PREFIX: char = '%';

struct Handler;

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
        /*check_msg(
            msg.channel_id
                .say(&ctx.http, &format!("Joined {}", connect_to.mention()))
                .await,
        );*/

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

struct EndEventHandler {
    manager: Arc<Songbird>,
    guild_id: GuildId,
}

#[async_trait]
impl VoiceEventHandler for EndEventHandler {
    async fn act(&self, _: &EventContext<'_>) -> Option<Event> {
        println!("Finished playing sound, disconnecting");
        let has_handler = self.manager.get(self.guild_id).is_some();

        if has_handler {
            if let Err(e) = self.manager.remove(self.guild_id).await {
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

struct SoundStore;

impl TypeMapKey for SoundStore {
    type Value = Arc<Mutex<BTreeSet<String>>>;
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Configure the client with your Discord bot token in the environment.
    let token = env::var("DISCORD_TOKEN").expect("Expected a token in the environment");

    let intents = GatewayIntents::non_privileged() | GatewayIntents::MESSAGE_CONTENT;

    let mut client = Client::builder(&token, intents)
        .event_handler(Handler)
        // .framework(framework)
        .register_songbird()
        .await
        .expect("Err creating client");

    // Obtain a lock to the data owned by the client, and insert the client's
    // voice manager into it. This allows the voice manager to be accessible by
    // event handlers and framework commands.
    {
        let mut data = client.data.write().await;

        let mut files = BTreeSet::new();

        let x = std::fs::read_dir("sounds").expect("Nope");
        for f in x {
            let f = f.expect("nope").file_name().to_string_lossy().to_string();
            let (name, ext) = f.split_once('.').unwrap();
            if ext != "mp3" {
                continue;
            }
            println!("{}", name);
            files.insert(name.to_string());
        }

        data.insert::<SoundStore>(Arc::new(Mutex::new(files)));
    }

    let _ = client
        .start()
        .await
        .map_err(|why| println!("Client ended: {:?}", why));
}

/// Checks that a message successfully sent; if not, then logs why to stdout.
fn check_msg(result: SerenityResult<Message>) {
    if let Err(why) = result {
        println!("Error sending message: {:?}", why);
    }
}
