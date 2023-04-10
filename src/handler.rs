use crate::commands::{help_command, random_command, sound_command};
use serenity::{
    async_trait,
    client::{Context, EventHandler},
    model::{channel::Message, gateway::Ready, id::GuildId},
};
use songbird::{Event, EventContext, EventHandler as VoiceEventHandler, Songbird};
use std::sync::Arc;
use uuid::Uuid;

const PREFIX: char = '%';

pub struct Handler;

#[async_trait]
impl EventHandler for Handler {
    #[tracing::instrument(skip(self, ctx, msg), fields(request_id = %Uuid::new_v4()))]
    async fn message(&self, ctx: Context, msg: Message) {
        if msg.content.len() < 2 || !msg.content.is_char_boundary(1) {
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
        tracing::info!("{} is connected", ready.user.name);
    }
}

pub struct EndEventHandler {
    manager: Arc<Songbird>,
    guild_id: GuildId,
    span: tracing::Span,
}

impl EndEventHandler {
    pub fn new(manager: Arc<Songbird>, guild_id: GuildId, span: tracing::Span) -> Self {
        Self {
            manager,
            guild_id,
            span,
        }
    }
}

#[async_trait]
impl VoiceEventHandler for EndEventHandler {
    #[tracing::instrument(name = "end_event_handler", parent = &self.span, skip(self))]
    async fn act(&self, _: &EventContext<'_>) -> Option<Event> {
        tracing::info!(
            "Finished playing sound in guild #{}, disconnecting",
            &self.guild_id
        );
        let has_handler = self.manager.get(self.guild_id).is_some();

        if has_handler {
            if let Err(e) = self.manager.remove(self.guild_id).await {
                tracing::error!(
                    "Unexpected error occurred while trying to leave voice channel: {e}"
                );
            }
        }

        None
    }
}
