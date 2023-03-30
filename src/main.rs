use crate::handler::Handler;
use serenity::{
    client::Client,
    prelude::{GatewayIntents, Mutex, *},
};
use songbird::SerenityInit;
use sorted_vec::SortedSet;
use std::{env, path::PathBuf, sync::Arc};

mod commands;
mod handler;
mod util;

pub struct SoundStore;

impl TypeMapKey for SoundStore {
    type Value = Arc<Mutex<SortedSet<String>>>;
}

pub struct ConfigStore;

impl TypeMapKey for ConfigStore {
    type Value = Arc<Config>;
}

pub struct Config {
    sounds_path: String,
}

async fn init_config(client: &Client, sounds_path: String) {
    let mut data = client.data.write().await;
    data.insert::<ConfigStore>(Arc::new(Config { sounds_path }));
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let token = env::var("DISCORD_TOKEN").expect("Expected a token in the environment");
    let sounds_path = env::var("SOUNDS_PATH").unwrap_or_else(|_| "sounds".to_string());

    let path = PathBuf::from(sounds_path.clone());
    if !path.exists() || !path.is_dir() {
        println!(
            "Sound directory not found or not directory: {}",
            path.display()
        );
        return;
    }

    let intents = GatewayIntents::non_privileged() | GatewayIntents::MESSAGE_CONTENT;

    let mut client = Client::builder(&token, intents)
        .event_handler(Handler)
        .register_songbird()
        .await
        .expect("Error creating client");

    init_config(&client, sounds_path).await;

    let _ = client
        .start()
        .await
        .map_err(|why| println!("Client ended: {:?}", why));
}
