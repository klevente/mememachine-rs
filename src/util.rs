use serenity::{model::channel::Message, Result as SerenityResult};
use std::path::Path;

/// Checks that a message successfully sent; if not, then logs why to stdout.
pub fn check_msg(result: SerenityResult<Message>) {
    if let Err(e) = result {
        tracing::error!("Error sending message: {e}");
    }
}

pub fn get_sounds<P: AsRef<Path>>(path: P) -> Result<Vec<String>, std::io::Error> {
    let files = std::fs::read_dir(path)?
        .filter_map(|f| {
            tracing::info!("{:?}", &f);
            let entry = f.unwrap();
            let file_name_os = entry.file_name();
            let file_name = file_name_os.to_string_lossy();
            if file_name.ends_with(".mp3") {
                let (name, _) = file_name.rsplit_once('.').unwrap();
                Some(name.to_string())
            } else {
                None
            }
            /*if ext != "mp3" {
                None
            } else {
                Some(name.to_string())
            }*/
        })
        .collect();

    Ok(files)
}
