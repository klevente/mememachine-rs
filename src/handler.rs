use crate::commands::{help_command, random_command, sound_command};
use serenity::{
    async_trait,
    client::{Context, EventHandler},
    model::{channel::Message, gateway::Ready, id::GuildId},
};
use songbird::{Event, EventContext, EventHandler as VoiceEventHandler, Songbird};
use std::sync::Arc;

const PREFIX: char = '%';

pub struct Handler;

#[async_trait]
impl EventHandler for Handler {
    async fn message(&self, ctx: Context, msg: Message) {
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
            if let Err(e) = self.manager.remove(self.guild_id).await {
                println!("Unexpected error occurred while trying to leave voice channel: {e}")
            }
        }

        None
    }
}
