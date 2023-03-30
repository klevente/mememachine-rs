use serenity::{model::channel::Message, Result as SerenityResult};
use std::path::Path;

/// Checks that a message successfully sent; if not, then logs why to stdout.
pub fn check_msg(result: SerenityResult<Message>) {
    if let Err(why) = result {
        println!("Error sending message: {:?}", why);
    }
}

pub fn get_sounds<P: AsRef<Path>>(path: P) -> Result<Vec<String>, std::io::Error> {
    let files = std::fs::read_dir(path)?
        .filter_map(|f| {
            let entry = f.unwrap();
            let file_name_os = entry.file_name();
            let file_name = file_name_os.to_string_lossy();
            let (name, ext) = file_name.rsplit_once('.').unwrap();
            if ext != "mp3" {
                None
            } else {
                Some(name.to_string())
            }
        })
        .collect();

    Ok(files)
}
