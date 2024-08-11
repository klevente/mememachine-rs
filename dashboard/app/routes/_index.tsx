import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
} from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { SOUNDS_PATH } from "~/config/constants.server";
import { Button } from "~/components/ui/button";
import { Loader2, LogOut, MenuIcon, Users, X } from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  type ChangeEvent,
  type FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Separator } from "~/components/ui/separator";
import { authenticator } from "~/services/auth.server";
import { action as uploadAction } from "./upload";
import { useToast } from "~/components/ui/use-toast";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
import { SimplePagination } from "~/components/ui/simple-pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const PAGE_SIZE = 50;

export const meta: MetaFunction = () => {
  return [{ title: "Mememachine :: Admin Panel" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const isAdmin = user.role === "admin";

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  const sounds = await fs.readdir(SOUNDS_PATH, {
    withFileTypes: true,
    recursive: false,
  });
  const files = sounds
    .slice(start, end)
    .filter((sound) => sound.isFile() && sound.name.endsWith(".mp3"))
    .map(({ name }) => name);

  const numOfSounds = sounds.length;

  const pageCount = Math.ceil(numOfSounds / PAGE_SIZE);
  const onFirstPage = page === 1;
  const onLastPage = page === pageCount;

  return json({
    user,
    isAdmin,
    files,
    page,
    numOfSounds,
    pageCount,
    onFirstPage,
    onLastPage,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const currentUser = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (currentUser.role !== "admin") {
    throw redirect("/login");
  }

  const data = await request.formData();
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

type Sound = {
  name: string;
};

type SoundActionsProps = {
  sound: Sound;
  isAdmin: boolean;
};

const SoundActions: FunctionComponent<SoundActionsProps> = ({
  sound: { name },
  isAdmin,
}) => {
  const fetcher = useFetcher<typeof action>();
  const { toast } = useToast();

  useEffect(() => {
    if (
      (fetcher.state === "idle" || fetcher.state === "loading") &&
      fetcher.data
    ) {
      if (fetcher.data.success) {
        toast({
          title: "Sound deleted!",
          description: `"${name}" has been successfully deleted!`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error while deleting!",
          description: `An error occurred while deleting "${name}"!`,
        });
      }
    }
  }, [toast, name, fetcher.state, fetcher.data]);

  const isDeleting = fetcher.state !== "idle";
  return (
    <fetcher.Form method="post">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              name="file"
              value={name}
              variant="ghost"
              size="icon"
              disabled={!isAdmin || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="animate-spin text-red-500" />
              ) : (
                <X className="text-red-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete sound</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </fetcher.Form>
  );
};

const tableColumns: ColumnDef<Sound>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const file = row.original.name;

      return <div className="font-mono">{file}</div>;
    },
  },
  {
    accessorKey: "audio",
    header: "Audio",
    cell: ({ row }) => {
      const file = row.original.name;

      // eslint-disable-next-line jsx-a11y/media-has-caption
      return <audio src={`/sounds/${file}`} controls></audio>;
    },
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row, table }) => {
      const meta = table.options.meta as { isAdmin: boolean };
      return <SoundActions sound={row.original} isAdmin={meta.isAdmin} />;
    },
  },
];

export default function Index() {
  const {
    user,
    isAdmin,
    files,
    page,
    pageCount,
    onFirstPage,
    onLastPage,
    numOfSounds,
  } = useLoaderData<typeof loader>();

  const uploadFetcher = useFetcher<typeof uploadAction>();

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

  const isUploading = uploadFetcher.state !== "idle";

  return (
    <>
      <header className="flex justify-between">
        <Link to="/">
          <h1 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <img src="/favicon.ico" alt="icon" className="w-8 img-pixelated" />{" "}
            Mememachine
          </h1>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="overflow-hidden">
              <MenuIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <span>{user.email}</span>
            </DropdownMenuLabel>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <Link to="/users">
                  <DropdownMenuItem>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Users</span>
                  </DropdownMenuItem>
                </Link>
              </>
            )}
            <DropdownMenuSeparator />
            <Link to="/logout">
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
        {/*<NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Item One</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink>Link</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>*/}
      </header>
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
      <div className="mx-auto mt-4">
        <DataTable
          columns={tableColumns}
          data={files.map((file) => ({ name: file }))}
          meta={{
            isAdmin,
          }}
        />
        <SimplePagination
          numOfItems={numOfSounds}
          page={page}
          pageCount={pageCount}
          onFirstPage={onFirstPage}
          onLastPage={onLastPage}
          url="/"
        />
      </div>
    </>
  );
}
