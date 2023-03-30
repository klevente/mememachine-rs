use crate::handler::Handler;
use serenity::{
    client::Client,
    prelude::{GatewayIntents, *},
};
use songbird::SerenityInit;
use std::{env, path::PathBuf, sync::Arc};

mod commands;
mod handler;
mod util;

pub struct ConfigStore;

impl TypeMapKey for ConfigStore {
    type Value = Arc<Config>;
}

pub struct Config {
    sounds_path: PathBuf,
}

async fn init_config(client: &Client, sounds_path: PathBuf) {
    let mut data = client.data.write().await;
    data.insert::<ConfigStore>(Arc::new(Config { sounds_path }));
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let token = env::var("DISCORD_TOKEN").expect("Expected a token in the environment");
    let sounds_path = env::var("SOUNDS_PATH").unwrap_or_else(|_| "sounds".to_string());

    let sounds_path = PathBuf::from(sounds_path);
    if !sounds_path.exists() || !sounds_path.is_dir() {
        println!(
            "Sound directory not found or not directory: {}",
            sounds_path.display()
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
