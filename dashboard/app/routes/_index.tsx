import { ActionFunctionArgs, json, MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

const FILE_PATH = "./public/sounds";

export async function loader() {
  const sounds = await fs.readdir(FILE_PATH, {
    withFileTypes: true,
    recursive: false,
  });
  const files = sounds
    .filter((sound) => sound.isFile() && sound.name.endsWith(".mp3"))
    .map(({ name }) => name);

  return json({ files });
}

export async function action(args: ActionFunctionArgs) {
  const data = await args.request.formData();
  const file = data.get("file") as string;
  await deleteSound(file);
  return null;
}

async function deleteSound(name: string) {
  const absolutePath = path.join(FILE_PATH, name);
  await fs.rm(absolutePath);
}

export default function Index() {
  const { files } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">Welcome to Remix</h1>
      <fetcher.Form action="upload" method="post" encType="multipart/form-data">
        <label htmlFor="sound">Sound to upload</label>
        <input id="sound" type="file" name="sound" accept=".mp3" />
        <button type="submit">Upload</button>
      </fetcher.Form>
      <ul className="list-disc mt-4 pl-6 space-y-2">
        {files.map((file) => (
          <li key={file}>
            {file}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={`/sounds/${file}`} controls></audio>
            <fetcher.Form method="post">
              <button name="file" value={file}>
                Delete
              </button>
            </fetcher.Form>
          </li>
        ))}
      </ul>
    </div>
  );
}
