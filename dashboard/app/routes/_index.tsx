import {
  type ActionFunctionArgs,
  json,
  type MetaFunction,
} from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { SOUNDS_PATH } from "~/config/constants.server";
import { Button } from "~/components/ui/button";
import { Loader2, X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { type ChangeEvent, useCallback, useState } from "react";
import { Separator } from "~/components/ui/separator";

export const meta: MetaFunction = () => {
  return [
    { title: "Mememachine :: Admin Panel" },
    {
      name: "description",
      content: "Admin panel for Mememachine, the Discord soundboard bot",
    },
  ];
};

export async function loader() {
  const sounds = await fs.readdir(SOUNDS_PATH, {
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
  const absolutePath = path.join(SOUNDS_PATH, name);
  await fs.rm(absolutePath);
}

export default function Index() {
  const { files } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [fileSelected, setFileSelected] = useState(false);

  const onFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFileSelected(!!event.target.value);
    },
    [],
  );

  const isUploading = fetcher.formAction === "/upload";

  const filesToRender = files.filter(
    (file) => file !== fetcher.formData?.get("file"),
  );

  return (
    <div className="font-sans p-4 mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight mb-4">
        Mememachine Admin Panel
      </h1>
      <fetcher.Form
        action="upload"
        method="post"
        encType="multipart/form-data"
        className="flex flex-col md:flex-row items-stretch justify-between gap-1"
      >
        <Input
          onChange={onFileInputChange}
          id="sound"
          name="sound"
          type="file"
          accept=".mp3"
          className="md:max-w-64"
        />
        <Button type="submit" disabled={!fileSelected || isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload"
          )}
        </Button>
      </fetcher.Form>
      <div className="flex flex-col gap-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-[20%_70%_10%] items-center gap-4 mt-4">
          {filesToRender.map((file, i) => (
            <>
              {i > 0 && (
                <Separator key={`sep-${i}`} className="my-4 md:col-span-3" />
              )}
              <div
                key={`${file}-name`}
                className="text-sm font-medium font-mono leading-none"
              >
                {file}
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                key={`${file}-audio`}
                src={`/sounds/${file}`}
                controls
              ></audio>
              <fetcher.Form method="post" key={`${file}-form`}>
                <Button
                  className="hidden md:inline-flex"
                  name="file"
                  value={file}
                  variant="ghost"
                  size="icon"
                >
                  <X className="text-red-500" />
                </Button>
                <Button
                  className="md:hidden"
                  name="file"
                  value={file}
                  variant="destructive"
                >
                  Delete
                </Button>
              </fetcher.Form>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
