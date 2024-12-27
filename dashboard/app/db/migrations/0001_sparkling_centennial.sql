CREATE TABLE `sound_plays` (
	`sound_name` text NOT NULL,
	`is_random` integer,
	`recorded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
