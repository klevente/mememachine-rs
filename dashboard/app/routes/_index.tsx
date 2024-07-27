import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { SOUNDS_PATH } from "~/config/constants.server";
import { Button } from "~/components/ui/button";
import { Loader2, X } from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  type ChangeEvent,
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Separator } from "~/components/ui/separator";
import { authenticator } from "~/services/auth.server";
import { action as uploadAction } from "./upload";
import { useToast } from "~/components/ui/use-toast";

export const meta: MetaFunction = () => {
  return [
    { title: "Mememachine :: Admin Panel" },
    {
      name: "description",
      content: "Admin panel for Mememachine, the Discord soundboard bot",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

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
  try {
    await deleteSound(file);
    return {
      success: true,
    };
  } catch (e) {
    console.error(`An error occurred while deleting sound "${file}"`, e);
    return {
      success: false,
    };
  }
}

async function deleteSound(name: string) {
  const absolutePath = path.join(SOUNDS_PATH, name);
  await fs.rm(absolutePath);
}

export default function Index() {
  const { files } = useLoaderData<typeof loader>();
  const deleteFetcher = useFetcher<typeof action>({
    key: "sound-delete",
  });
  const uploadFetcher = useFetcher<typeof uploadAction>({
    key: "sound-upload",
  });

  const uploadFormRef = useRef<HTMLFormElement>(null);
  const [fileSelected, setFileSelected] = useState(false);

  const onFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFileSelected(!!event.target.value);
    },
    [],
  );

  const { toast } = useToast();

  useEffect(() => {
    if (uploadFetcher.state === "idle" && uploadFetcher.data) {
      if (uploadFetcher.data?.success) {
        uploadFormRef.current?.reset();
        toast({
          title: "Sound(s) uploaded!",
          description: "Your sound(s) have been successfully uploaded!",
        });
      } else {
        const description =
          uploadFetcher.data?.message ??
          "An error occurred while uploading your sound(s).";
        toast({
          variant: "destructive",
          title: "Error while uploading!",
          description,
        });
      }
    }
  }, [toast, uploadFetcher.state, uploadFetcher.data]);

  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data) {
      if (deleteFetcher.data.success) {
        toast({
          title: "Sound deleted!",
          description: "The sound has been successfully deleted!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error while deleting!",
          description: "An error occurred while deleting the sound!",
        });
      }
    }
  }, [toast, deleteFetcher.state, deleteFetcher.data]);

  const isUploading = uploadFetcher.state !== "idle";

  const filesToRender = files.filter(
    (file) => file !== deleteFetcher.formData?.get("file"),
  );

  return (
    <>
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold tracking-tight mb-4">
          Mememachine Admin Panel
        </h1>
        <Form action="/logout" method="post">
          <Button variant="secondary" type="submit">
            Logout
          </Button>
        </Form>
      </div>
      <Separator className="my-4" />
      <uploadFetcher.Form
        ref={uploadFormRef}
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
          multiple
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
      </uploadFetcher.Form>
      <div className="flex flex-col gap-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-[20%_70%_10%] items-center gap-4 mt-4">
          {filesToRender.map((file, i) => (
            <Fragment key={file}>
              {i > 0 && <Separator className="my-4 md:col-span-3" />}
              <div className="text-sm font-medium font-mono leading-none">
                {file}
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={`/sounds/${file}`} controls></audio>
              <deleteFetcher.Form method="post">
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
              </deleteFetcher.Form>
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
