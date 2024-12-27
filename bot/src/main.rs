use crate::handler::Handler;
use anyhow::Context;
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

pub struct Db;

impl TypeMapKey for Db {
    type Value = async_sqlite::Pool;
}

async fn init_config(client: &Client, sounds_path: PathBuf) {
    let mut data = client.data.write().await;
    data.insert::<ConfigStore>(Arc::new(Config { sounds_path }));
}

async fn init_db(client: &Client, db_path: &str) -> Result<(), async_sqlite::Error> {
    let mut data = client.data.write().await;
    let pool = async_sqlite::PoolBuilder::new()
        .path(db_path)
        .open()
        .await?;

    data.insert::<Db>(pool);

    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let token = env::var("DISCORD_TOKEN").context("DISCORD_TOKEN env var not found")?;
    let sounds_path = env::var("SOUNDS_PATH").unwrap_or_else(|_| "sounds".to_string());

    let sounds_path = PathBuf::from(sounds_path);
    if !sounds_path.exists() || !sounds_path.is_dir() {
        anyhow::bail!(
            "{} is not a valid directory, aborting...",
            sounds_path.display()
        );
    }

    let db_path = env::var("DATABASE_PATH").context("DATABASE_PATH env var not found")?;

    let intents = GatewayIntents::non_privileged() | GatewayIntents::MESSAGE_CONTENT;

    tracing::info!("Starting client with path {}", sounds_path.display());

    let mut client = Client::builder(&token, intents)
        .event_handler(Handler)
        .register_songbird()
        .await
        .context("Error creating client")?;

    init_config(&client, sounds_path).await;
    init_db(&client, &db_path).await?;

    tracing::info!("Client successfully started!");

    client
        .start()
        .await
        .context("Client execution resulted in an error")?;

    Ok(())
}
