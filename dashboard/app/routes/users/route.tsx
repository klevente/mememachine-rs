import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import {
  ClipboardCheck,
  ClipboardCopy,
  Loader2,
  MenuIcon,
  X,
} from "lucide-react";
import {
  Form,
  Link,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { Separator } from "~/components/ui/separator";
import { authenticator } from "~/services/auth.server";
import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
} from "@remix-run/node";
import { db } from "~/db/config.server";
import { invitations, type Role, users } from "~/db/schema.server";
import { asc } from "drizzle-orm";
import { FormLabel, FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";
import { type FunctionComponent, useEffect, useState } from "react";
import { useToast } from "~/components/ui/use-toast";
import { type InviteSchema, inviteSchemaResolver } from "~/routes/users/types";
import { createInvitation } from "~/routes/users/service.server";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { action as deleteAction } from "../users.delete";

export const meta: MetaFunction = () => {
  return [{ title: "Mememachine :: Admin Panel :: Users" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const currentUser = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (currentUser.role !== "admin") {
    return redirect("/");
  }

  const [existingUsers, existingInvitations] = await Promise.all([
    db.query.users.findMany({
      orderBy: [asc(users.id)],
    }),
    db.query.invitations.findMany({
      orderBy: [asc(invitations.id)],
    }),
  ]);

  return json({
    currentUser,
    users: existingUsers,
    invitations: existingInvitations,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const currentUser = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (currentUser.role !== "admin") {
    return redirect("/");
  }

  const { errors, data, receivedValues } =
    await getValidatedFormData<InviteSchema>(request, inviteSchemaResolver);

  if (errors) {
    return json({ errors, defaultValues: receivedValues });
  }

  return json(await createInvitation(data, receivedValues));
}

type InvitationActionsProps = {
  invitation: InvitationRow;
};

const InvitationActions: FunctionComponent<InvitationActionsProps> = ({
  invitation,
}) => {
  const fetcher = useFetcher<typeof deleteAction>();
  const { toast } = useToast();

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (
      (fetcher.state === "idle" || fetcher.state === "loading") &&
      fetcher.data
    ) {
      if (fetcher.data.success) {
        toast({
          title: "Invitation deleted!",
          description: "Invitation has been deleted!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error while deleting invitation",
          description: "Error while deleting invitation.",
        });
      }
    }
  }, [toast, fetcher.state, fetcher.data]);

  const [copied, setCopied] = useState(false);

  const onCopyButtonClicked = async () => {
    const link = `${window.location.origin}/register?token=${invitation.id}`;
    await navigator.clipboard.writeText(link);
    toast({
      title: "Link copied to clipboard!",
      description: "Send it to the person you would like to register.",
    });

    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div className="flex justify-end gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCopyButtonClicked}
              disabled={copied}
            >
              {copied ? <ClipboardCheck /> : <ClipboardCopy />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy link to clipboard</TooltipContent>
        </Tooltip>
        <fetcher.Form method="post" action="delete">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                name="id"
                value={invitation.id}
                variant="ghost"
                size="icon"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin text-red-500" />
                ) : (
                  <X className="text-red-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Revoke invitation</TooltipContent>
          </Tooltip>
        </fetcher.Form>
      </TooltipProvider>
    </div>
  );
};

type InvitationRow = {
  id: string;
  email: string;
};

const invitationTableColumns: ColumnDef<InvitationRow>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.original.email;
      return <div>{email}</div>;
    },
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => {
      const id = row.original.id;
      return <div>{id}</div>;
    },
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const invitation = row.original;
      return <InvitationActions invitation={invitation} />;
    },
  },
];

type UserRow = {
  email: string;
  role: Role;
};

const userTableColumns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.original.email;
      return <div>{email}</div>;
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.role;
      return <div>{role}</div>;
    },
  },
];

export default function Route() {
  const { currentUser, users, invitations } = useLoaderData<typeof loader>();

  const {
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
    register,
    reset,
  } = useRemixForm<InviteSchema>({
    mode: "onBlur",
    resolver: inviteSchemaResolver,
  });

  const navigation = useNavigation();

  const isAdding = navigation.state !== "idle";

  const { toast } = useToast();

  useEffect(() => {
    reset();
  }, [toast, reset, isSubmitSuccessful]);

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
            <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Users</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Form action="/logout" method="post">
                <Button variant="link" type="submit">
                  Logout
                </Button>
              </Form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <Separator className="my-4" />
      <h3 className="font-bold">Invitations</h3>
      <Form
        method="post"
        onSubmit={handleSubmit}
        className="flex items-end gap-4 mb-4"
      >
        <div className="flex-grow">
          <FormLabel htmlFor="email" error={errors.email}>
            Email
          </FormLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            {...register("email")}
          />
          <FormMessage error={errors.email} />
        </div>
        <Button type="submit">
          {isAdding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inviting...
            </>
          ) : (
            "Invite"
          )}
        </Button>
      </Form>
      <DataTable columns={invitationTableColumns} data={invitations} />
      <Separator className="my-4" />
      <h3 className="font-bold">Users</h3>
      <DataTable columns={userTableColumns} data={users} />
    </>
  );
}
